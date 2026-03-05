import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// ── Theme ─────────────────────────────────────────────
const T = {
    bg: '#1a1a2e',
    cardBg: '#16213e',
    cardBorder: '#2a2d4e',
    primary: '#6C63FF',
    white: '#FFFFFF',
    muted: '#8892a4',
    label: '#a8b2c1',
    inputBg: '#0f1729',
    inputBorder: '#2a2d4e',
    success: '#4CAF50',
    error: '#FF5252',
};

export default function UpdateMeasurementsScreen() {
    const router = useRouter();
    const { user } = useAuth();

    // ── State ──────────────────────────────────────────
    const [weightG, setWeightG] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [measDate, setMeasDate] = useState(
        new Date().toISOString().split('T')[0],
    );
    const [notes, setNotes] = useState('');
    const [infant, setInfant] = useState<any>(null);
    const [lastMeasurement, setLastMeasurement] = useState<any>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // ── On mount ───────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            if (!user) {
                setPageLoading(false);
                return;
            }
            try {
                const { data: infantData, error: infantError } = await supabase
                    .from('infants')
                    .select('*')
                    .eq('parent_id', user.id)
                    .maybeSingle();

                if (infantError || !infantData) {
                    setPageLoading(false);
                    return;
                }
                setInfant(infantData);

                // Get last measurement to show as reference
                const { data: lastMeas } = await supabase
                    .from('measurements')
                    .select('*')
                    .eq('infant_id', infantData.id)
                    .order('measured_date', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                setLastMeasurement(lastMeas);
            } catch (err: any) {
                console.error('Init error:', err.message);
            } finally {
                setPageLoading(false);
            }
        };
        init();
    }, [user]);

    // ── Validation ─────────────────────────────────────
    const validate = (): string | null => {
        if (!weightG && !heightCm)
            return 'Please enter at least weight or height';
        if (weightG) {
            const w = parseFloat(weightG);
            if (isNaN(w) || w < 500 || w > 30000)
                return 'Weight must be between 500g and 30,000g';
        }
        if (heightCm) {
            const h = parseFloat(heightCm);
            if (isNaN(h) || h < 30 || h > 120)
                return 'Height must be between 30cm and 120cm';
        }
        return null;
    };

    // ── Weight change hint ─────────────────────────────
    const weightChange = useMemo(() => {
        if (!lastMeasurement?.weight_g || !weightG) return null;
        const w = parseFloat(weightG);
        if (isNaN(w) || w < 500 || w > 30000) return null;
        const diff = w - lastMeasurement.weight_g;
        if (diff === 0) return null;
        return diff;
    }, [weightG, lastMeasurement]);

    // ── Save ───────────────────────────────────────────
    const handleSave = async () => {
        const err = validate();
        if (err) {
            Alert.alert('Check input', err);
            return;
        }
        if (!infant) {
            Alert.alert('Error', 'No baby profile found.');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('measurements')
                .upsert(
                    {
                        infant_id: infant.id,
                        measured_date: measDate,
                        weight_g: weightG ? parseFloat(weightG) : null,
                        height_cm: heightCm ? parseFloat(heightCm) : null,
                        notes: notes || null,
                    },
                    { onConflict: 'infant_id,measured_date' },
                );

            if (error) throw error;

            Alert.alert('✅ Saved', 'Measurement recorded successfully.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            Alert.alert('Save Failed', err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Helpers ────────────────────────────────────────
    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const todayLabel = (() => {
        const today = new Date().toISOString().split('T')[0];
        if (measDate === today) {
            return `Today, ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
        }
        return new Date(measDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
        });
    })();

    // ── Loading ────────────────────────────────────────
    if (pageLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={T.primary} />
                <Text style={[styles.mutedText, { marginTop: 12 }]}>Loading…</Text>
            </View>
        );
    }

    // ── Render ─────────────────────────────────────────
    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── HEADER ────────────────────────────── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Update Measurements</Text>
                    <View style={{ width: 38 }} />
                </View>

                {infant && (
                    <Text style={styles.subHeader}>
                        for {infant.name || 'Baby'}
                    </Text>
                )}

                {/* ── LAST MEASUREMENT CARD ─────────────── */}
                <View style={styles.lastMeasCard}>
                    {lastMeasurement ? (
                        <>
                            <Text style={styles.lastMeasTitle}>📊 Last Recorded</Text>
                            <View style={styles.lastMeasRow}>
                                <View style={styles.lastMeasCol}>
                                    <Text style={styles.lastMeasLabel}>Date</Text>
                                    <Text style={styles.lastMeasValue}>
                                        {formatDate(lastMeasurement.measured_date)}
                                    </Text>
                                </View>
                                <View style={styles.lastMeasCol}>
                                    <Text style={styles.lastMeasLabel}>Weight</Text>
                                    <Text style={styles.lastMeasValue}>
                                        {lastMeasurement.weight_g
                                            ? `${lastMeasurement.weight_g.toLocaleString()} g`
                                            : '—'}
                                    </Text>
                                </View>
                                <View style={styles.lastMeasCol}>
                                    <Text style={styles.lastMeasLabel}>Height</Text>
                                    <Text style={styles.lastMeasValue}>
                                        {lastMeasurement.height_cm
                                            ? `${lastMeasurement.height_cm} cm`
                                            : '—'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.lastMeasHint}>
                                Enter new measurement below to update
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.lastMeasTitle}>📊 No measurements recorded yet</Text>
                            <Text style={styles.lastMeasHint}>
                                Add your first measurement below
                            </Text>
                        </>
                    )}
                </View>

                {/* ── MEASUREMENT DATE ──────────────────── */}
                <View style={styles.dateSection}>
                    <Text style={styles.inputLabel}>Measurement Date</Text>
                    <Text style={styles.dateDisplay}>{todayLabel}</Text>
                    <View style={styles.dateInputRow}>
                        <TextInput
                            style={styles.dateInput}
                            value={measDate}
                            onChangeText={(text) => {
                                // Allow typing, validate on blur-like behavior
                                setMeasDate(text);
                            }}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={T.muted}
                            keyboardType="default"
                            maxLength={10}
                        />
                        <TouchableOpacity
                            style={styles.todayBtn}
                            onPress={() => setMeasDate(new Date().toISOString().split('T')[0])}
                        >
                            <Text style={styles.todayBtnText}>Today</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── INPUT CARD ────────────────────────── */}
                <View style={[styles.card, { borderLeftColor: T.primary }]}>
                    <View style={styles.inputRow}>
                        {/* Weight */}
                        <View style={styles.inputCol}>
                            <Text style={styles.inputLabel}>Weight</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.measureInput}
                                    value={weightG}
                                    onChangeText={setWeightG}
                                    placeholder="e.g. 6200"
                                    placeholderTextColor={T.muted}
                                    keyboardType="decimal-pad"
                                />
                                <View style={styles.suffixBadge}>
                                    <Text style={styles.suffixText}>g</Text>
                                </View>
                            </View>
                            {weightG !== '' &&
                                (isNaN(parseFloat(weightG)) ||
                                    parseFloat(weightG) < 500 ||
                                    parseFloat(weightG) > 30000) && (
                                    <Text style={styles.validationError}>500–30,000g</Text>
                                )}
                        </View>

                        {/* Height */}
                        <View style={styles.inputCol}>
                            <Text style={styles.inputLabel}>Height</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.measureInput}
                                    value={heightCm}
                                    onChangeText={setHeightCm}
                                    placeholder="e.g. 65.5"
                                    placeholderTextColor={T.muted}
                                    keyboardType="decimal-pad"
                                />
                                <View style={styles.suffixBadge}>
                                    <Text style={styles.suffixText}>cm</Text>
                                </View>
                            </View>
                            {heightCm !== '' &&
                                (isNaN(parseFloat(heightCm)) ||
                                    parseFloat(heightCm) < 30 ||
                                    parseFloat(heightCm) > 120) && (
                                    <Text style={styles.validationError}>30–120cm</Text>
                                )}
                        </View>
                    </View>

                    {/* Weight change hint */}
                    {weightChange !== null && (
                        <View
                            style={[
                                styles.changeHint,
                                {
                                    backgroundColor:
                                        weightChange > 0
                                            ? 'rgba(76,175,80,0.1)'
                                            : 'rgba(255,82,82,0.1)',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.changeHintText,
                                    { color: weightChange > 0 ? T.success : T.error },
                                ]}
                            >
                                {weightChange > 0 ? '↑' : '↓'}{' '}
                                {weightChange > 0 ? '+' : ''}
                                {Math.round(weightChange)}g since last measurement
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── NOTES INPUT ───────────────────────── */}
                <View style={styles.notesSection}>
                    <Text style={styles.inputLabel}>Notes (optional)</Text>
                    <TextInput
                        style={styles.notesInput}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="e.g. After clinic visit, measured by nurse"
                        placeholderTextColor={T.muted}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>

                {/* ── TIPS CARD ─────────────────────────── */}
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>📌 Tips for accurate measurement</Text>
                    <Text style={styles.tipItem}>• Weigh baby without clothes if possible</Text>
                    <Text style={styles.tipItem}>• Measure at the same time each day</Text>
                    <Text style={styles.tipItem}>• Use the same scale each time</Text>
                    <Text style={styles.tipItem}>• Record immediately after clinic visits</Text>
                </View>

                {/* Bottom spacer for footer */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── FOOTER ──────────────────────────────── */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator color={T.white} />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Measurement</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: T.bg,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 56 : 40,
        paddingBottom: 24,
    },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    backBtn: {
        padding: 8,
    },
    backArrow: {
        fontSize: 22,
        color: T.white,
        fontWeight: '700',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: T.white,
    },
    subHeader: {
        textAlign: 'center',
        color: T.muted,
        fontSize: 14,
        marginBottom: 16,
    },

    /* Last measurement */
    lastMeasCard: {
        backgroundColor: 'rgba(108,99,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(108,99,255,0.2)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    lastMeasTitle: {
        color: T.white,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12,
    },
    lastMeasRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    lastMeasCol: {
        flex: 1,
        alignItems: 'center',
    },
    lastMeasLabel: {
        color: T.muted,
        fontSize: 11,
        marginBottom: 4,
    },
    lastMeasValue: {
        color: T.white,
        fontSize: 16,
        fontWeight: '700',
    },
    lastMeasHint: {
        color: T.muted,
        fontSize: 12,
        textAlign: 'center',
    },

    /* Date section */
    dateSection: {
        marginBottom: 16,
    },
    dateDisplay: {
        color: T.white,
        fontSize: 16,
        fontWeight: '600',
        marginTop: 6,
        marginBottom: 8,
    },
    dateInputRow: {
        flexDirection: 'row',
        gap: 10,
    },
    dateInput: {
        flex: 1,
        height: 44,
        backgroundColor: T.inputBg,
        borderWidth: 1,
        borderColor: T.inputBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        color: T.white,
        fontSize: 14,
    },
    todayBtn: {
        height: 44,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(108,99,255,0.15)',
        borderWidth: 1,
        borderColor: T.primary,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    todayBtnText: {
        color: T.primary,
        fontSize: 14,
        fontWeight: '700',
    },

    /* Card */
    card: {
        backgroundColor: T.cardBg,
        borderWidth: 1,
        borderColor: T.cardBorder,
        borderRadius: 14,
        borderLeftWidth: 4,
        padding: 18,
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
    inputCol: {
        flex: 1,
    },
    inputLabel: {
        color: T.label,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    measureInput: {
        flex: 1,
        height: 50,
        backgroundColor: T.inputBg,
        borderWidth: 1,
        borderColor: T.inputBorder,
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        paddingHorizontal: 14,
        color: T.white,
        fontSize: 18,
        fontWeight: '700',
    },
    suffixBadge: {
        height: 50,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(108,99,255,0.15)',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderColor: T.inputBorder,
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    suffixText: {
        color: T.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    validationError: {
        color: T.error,
        fontSize: 11,
        marginTop: 4,
        fontWeight: '600',
    },
    changeHint: {
        marginTop: 12,
        borderRadius: 8,
        padding: 10,
        alignItems: 'center',
    },
    changeHintText: {
        fontSize: 13,
        fontWeight: '700',
    },

    /* Notes */
    notesSection: {
        marginBottom: 16,
    },
    notesInput: {
        backgroundColor: T.inputBg,
        borderWidth: 1,
        borderColor: T.inputBorder,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: T.white,
        fontSize: 14,
        minHeight: 80,
    },

    /* Tips */
    tipsCard: {
        backgroundColor: 'rgba(108,99,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(108,99,255,0.15)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    tipsTitle: {
        color: T.white,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 10,
    },
    tipItem: {
        color: T.muted,
        fontSize: 13,
        lineHeight: 22,
    },

    /* Muted text */
    mutedText: {
        color: T.muted,
        fontSize: 12,
    },

    /* Footer */
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(26,26,46,0.97)',
        padding: 16,
        paddingBottom: 32,
    },
    saveBtn: {
        backgroundColor: T.primary,
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: T.primary,
        shadowOpacity: 0.5,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 8,
    },
    saveBtnDisabled: {
        opacity: 0.7,
    },
    saveBtnText: {
        color: T.white,
        fontSize: 16,
        fontWeight: '800',
    },
});

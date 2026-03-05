import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    Animated,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography, Spacing, Shadows, Radius } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function UpdateMeasurementsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const colorScheme = useColorScheme() ?? 'light';
    const C = Colors[colorScheme];

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
    const [tipsExpanded, setTipsExpanded] = useState(false);

    // Animation for weight change
    const fadeAnim = useRef(new Animated.Value(0)).current;

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

    useEffect(() => {
        if (weightChange !== null) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [weightChange, fadeAnim]);

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

    const toggleTips = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setTipsExpanded(!tipsExpanded);
    };

    // ── Loading ────────────────────────────────────────
    if (pageLoading) {
        return (
            <View style={[styles.container, { backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={[{ color: C.labelTertiary, marginTop: 12 }, Typography.subheadline]}>Loading…</Text>
            </View>
        );
    }

    // ── Render ─────────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: C.background }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── HEADER ────────────────────────────── */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBtnLeft}>
                        <Text style={{ color: C.primary, fontSize: 32, lineHeight: 34 }}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={[Typography.headline, { color: C.label }]}>Update Measurements</Text>
                        {infant && (
                            <Text style={[Typography.caption1, { color: C.labelTertiary }]}>
                                for {infant.name || 'Baby'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.headerBtnRight} />
                </View>

                {/* ── LAST RECORDED CARD ────────────────── */}
                <View style={[styles.card, Shadows.sm, { backgroundColor: C.card, paddingVertical: 16, marginBottom: 16 }]}>
                    <Text style={[Typography.headline, { color: C.label, marginBottom: 16, textAlign: 'center' }]}>
                        📊 Last Recorded
                    </Text>

                    {lastMeasurement ? (
                        <>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={[Typography.caption1, { color: C.labelTertiary, marginBottom: 4 }]}>Date</Text>
                                    <Text style={[Typography.headline, { color: C.label, fontWeight: '700' }]}>
                                        {formatDate(lastMeasurement.measured_date)}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={[Typography.caption1, { color: C.labelTertiary, marginBottom: 4 }]}>Weight</Text>
                                    <Text style={[Typography.headline, { color: C.label, fontWeight: '700' }]}>
                                        {lastMeasurement.weight_g
                                            ? `${lastMeasurement.weight_g.toLocaleString()} g`
                                            : '—'}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={[Typography.caption1, { color: C.labelTertiary, marginBottom: 4 }]}>Height</Text>
                                    <Text style={[Typography.headline, { color: C.label, fontWeight: '700' }]}>
                                        {lastMeasurement.height_cm
                                            ? `${lastMeasurement.height_cm} cm`
                                            : '—'}
                                    </Text>
                                </View>
                            </View>
                            <Text style={[Typography.caption1, { color: C.labelTertiary, textAlign: 'center' }]}>
                                Enter new values below to update
                            </Text>
                        </>
                    ) : (
                        <Text style={[Typography.subheadline, { color: C.labelTertiary, textAlign: 'center' }]}>
                            No measurements recorded yet
                        </Text>
                    )}
                </View>

                {/* ── DATE ROW ──────────────────────────── */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={[Typography.footnote, { color: C.labelTertiary, marginBottom: 4 }]}>Measurement Date</Text>
                    <Text style={[Typography.title3, { color: C.label, fontWeight: '700', marginBottom: 12 }]}>{todayLabel}</Text>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TextInput
                            style={[
                                styles.inputBox,
                                Typography.body,
                                {
                                    backgroundColor: C.cardSecondary,
                                    borderColor: C.primary,
                                    color: C.label,
                                    flex: 1
                                }
                            ]}
                            value={measDate}
                            onChangeText={setMeasDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={C.labelPlaceholder}
                            keyboardType="default"
                            maxLength={10}
                        />
                        <TouchableOpacity
                            style={[
                                styles.todayBtn,
                                { backgroundColor: C.primarySoft, borderColor: C.primary }
                            ]}
                            onPress={() => setMeasDate(new Date().toISOString().split('T')[0])}
                        >
                            <Text style={[Typography.callout, { color: C.primary, fontWeight: '700' }]}>Today</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── MEASUREMENT INPUTS ────────────────── */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {/* Weight Card */}
                    <View style={[styles.measurementCard, Shadows.sm, { backgroundColor: C.card }]}>
                        <View style={[styles.cardAccentBar, { backgroundColor: C.primary }]} />
                        <View style={{ padding: 16 }}>
                            <Text style={[Typography.footnote, { color: C.labelTertiary, marginBottom: 8 }]}>⚖️ Weight</Text>
                            <TextInput
                                style={[{ fontSize: 28, fontWeight: '700', color: C.label, padding: 0 }]}
                                value={weightG}
                                onChangeText={setWeightG}
                                placeholder="6200"
                                placeholderTextColor={C.labelPlaceholder}
                                keyboardType="decimal-pad"
                            />
                            <Text style={[Typography.footnote, { color: C.labelTertiary, textAlign: 'right', marginTop: 4 }]}>grams</Text>
                        </View>
                    </View>

                    {/* Height Card */}
                    <View style={[styles.measurementCard, Shadows.sm, { backgroundColor: C.card }]}>
                        <View style={[styles.cardAccentBar, { backgroundColor: C.secondary }]} />
                        <View style={{ padding: 16 }}>
                            <Text style={[Typography.footnote, { color: C.labelTertiary, marginBottom: 8 }]}>📏 Height</Text>
                            <TextInput
                                style={[{ fontSize: 28, fontWeight: '700', color: C.label, padding: 0 }]}
                                value={heightCm}
                                onChangeText={setHeightCm}
                                placeholder="65.5"
                                placeholderTextColor={C.labelPlaceholder}
                                keyboardType="decimal-pad"
                            />
                            <Text style={[Typography.footnote, { color: C.labelTertiary, textAlign: 'right', marginTop: 4 }]}>cm</Text>
                        </View>
                    </View>
                </View>

                {/* ── WEIGHT CHANGE INDICATOR ───────────── */}
                {weightChange !== null && (
                    <Animated.View style={{ opacity: fadeAnim, marginBottom: 16 }}>
                        <Text style={[
                            Typography.subheadline,
                            { color: weightChange > 0 ? C.success : C.danger, textAlign: 'center' }
                        ]}>
                            {weightChange > 0 ? '↑' : '↓'} {weightChange > 0 ? '+' : ''}
                            {Math.round(weightChange)}g since last measurement
                        </Text>
                    </Animated.View>
                )}

                {/* ── NOTES INPUT ───────────────────────── */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={[Typography.footnote, { color: C.labelTertiary, marginBottom: 8 }]}>Notes (optional)</Text>
                    <TextInput
                        style={[
                            styles.notesBox,
                            Typography.body,
                            {
                                backgroundColor: C.cardSecondary,
                                borderColor: C.border,
                                color: C.label
                            }
                        ]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="e.g. After clinic visit"
                        placeholderTextColor={C.labelPlaceholder}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                {/* ── TIPS ROW (accordion) ─────────────── */}
                <TouchableOpacity
                    style={[styles.tipsAccordion, Shadows.sm, { backgroundColor: C.card }]}
                    onPress={toggleTips}
                    activeOpacity={0.7}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[Typography.subheadline, { color: C.label }]}>📌 Tips for accurate measurement</Text>
                        <Text style={{ color: C.labelTertiary, fontSize: 14 }}>{tipsExpanded ? '▲' : '▼'}</Text>
                    </View>

                    {tipsExpanded && (
                        <View style={{ marginTop: 12, gap: 6 }}>
                            <Text style={[Typography.subheadline, { color: C.labelSecondary }]}>• Weigh baby without clothes if possible</Text>
                            <Text style={[Typography.subheadline, { color: C.labelSecondary }]}>• Measure at the same time each day</Text>
                            <Text style={[Typography.subheadline, { color: C.labelSecondary }]}>• Use the same scale each time</Text>
                            <Text style={[Typography.subheadline, { color: C.labelSecondary }]}>• Record immediately after clinic visits</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Bottom spacer equivalent */}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── SAVE BUTTON ───────────────────────── */}
            <View style={styles.footerContainer}>
                <TouchableOpacity
                    style={[
                        styles.saveBtn,
                        { backgroundColor: C.primary, shadowColor: C.primary },
                        saving && { opacity: 0.7 }
                    ]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={[Typography.callout, { color: '#FFF', fontWeight: '700' }]}>Save Measurement</Text>
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
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerBtnLeft: {
        width: 44,
        alignItems: 'flex-start',
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerBtnRight: {
        width: 44,
    },
    card: {
        borderRadius: Radius.lg,
    },
    inputBox: {
        height: 44,
        borderWidth: 1,
        borderRadius: Radius.md,
        paddingHorizontal: 14,
    },
    todayBtn: {
        height: 44,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    measurementCard: {
        flex: 1,
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    cardAccentBar: {
        height: 3,
        width: '100%',
    },
    notesBox: {
        borderWidth: 1,
        borderRadius: Radius.md,
        padding: 14,
        minHeight: 80,
    },
    tipsAccordion: {
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        marginBottom: 16,
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 32,
        paddingTop: 16,
        backgroundColor: 'transparent', // The user requested floating or similar
    },
    saveBtn: {
        height: 56,
        width: '100%',
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    }
});

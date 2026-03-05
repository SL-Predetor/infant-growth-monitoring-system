import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Animated,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// ── Theme ─────────────────────────────────────────────
const T = {
    bg: '#1a1a2e',
    cardBg: '#16213e',
    cardBorder: '#2a2d4e',
    primary: '#6C63FF',
    primaryOp: 'rgba(108, 99, 255, 0.12)',
    white: '#FFFFFF',
    muted: '#8892a4',
    label: '#a8b2c1',
    inputBg: '#0f1729',
    inputBorder: '#2a2d4e',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#FF5252',
};

type FeedType = 'breastfed' | 'formula' | 'mixed';
type IllnessType = 'Diarrhoea' | 'Respiratory' | 'Fever' | 'Other';

export default function DailyLogScreen() {
    const router = useRouter();
    const { user } = useAuth();

    // ── State ──────────────────────────────────────────
    const [sleepHours, setSleepHours] = useState(12);
    const [feedType, setFeedType] = useState<FeedType>('breastfed');
    const [milkFeeds, setMilkFeeds] = useState(6);       // f_breast_formula
    const [solidMeals, setSolidMeals] = useState(0);     // f_solid_meal
    const [snacks, setSnacks] = useState(0);              // f_nutritious_snacks
    const [isSick, setIsSick] = useState(false);
    const [illnessType, setIllnessType] = useState<IllnessType | null>(null);

    const [infant, setInfant] = useState<any>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isUpdate, setIsUpdate] = useState(false);
    const [existingLogId, setExistingLogId] = useState<string | null>(null);
    const [logCount, setLogCount] = useState(0);
    const [logDate, setLogDate] = useState(
        new Date().toISOString().split('T')[0],
    );

    // Animation for illness section
    const [illnessAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.timing(illnessAnim, {
            toValue: isSick ? 1 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isSick]);

    // ── Calorie estimate ─────────────────────────────
    const estimatedCalories = useMemo(() => {
        const milkCal = feedType === 'mixed'
            ? milkFeeds * 150
            : milkFeeds * 130;
        const solidCal = solidMeals * 200;
        const snackCal = snacks * 80;
        return Math.round(milkCal + solidCal + snackCal);
    }, [feedType, milkFeeds, solidMeals, snacks]);

    // ── On mount ───────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            if (!user) {
                setPageLoading(false);
                return;
            }
            try {
                const { data: infantData } = await supabase
                    .from('infants')
                    .select('*')
                    .eq('parent_id', user.id)
                    .maybeSingle();

                if (!infantData) {
                    setPageLoading(false);
                    return;
                }
                setInfant(infantData);

                // Check if today's log already exists
                const today = logDate;
                const { data: existing } = await supabase
                    .from('daily_logs')
                    .select('*')
                    .eq('infant_id', infantData.id)
                    .eq('log_date', today)
                    .maybeSingle();

                if (existing) {
                    setIsUpdate(true);
                    setExistingLogId(existing.id);
                    setSleepHours(existing.sleep_hours || 12);
                    setFeedType(existing.feed_type || 'breastfed');
                    setMilkFeeds(existing.f_breast_formula || 6);
                    setSolidMeals(existing.f_solid_meal || 0);
                    setSnacks(existing.f_nutritious_snacks || 0);
                    setIsSick(existing.has_illness || false);
                    setIllnessType(existing.illness_type || null);
                }

                // Total log count for AI readiness
                const { count } = await supabase
                    .from('daily_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('infant_id', infantData.id);
                setLogCount(count || 0);
            } catch (err) {
                console.error('Init error:', err);
            } finally {
                setPageLoading(false);
            }
        };
        init();
    }, [user]);

    // ── Save ───────────────────────────────────────────
    const handleSave = async () => {
        console.log('handleSave called');
        console.log('user:', user?.id);
        console.log('infant:', infant?.id);

        if (!infant) {
            Alert.alert('Error', 'No baby profile found.');
            return;
        }
        if (isSick && !illnessType) {
            Alert.alert('Missing info', 'Please select the illness type.');
            return;
        }

        setSaving(true);
        try {
            const today = logDate;

            // Auto-calculate recovery_day from yesterday's log
            const yesterday = new Date(logDate);
            yesterday.setDate(yesterday.getDate() - 1);
            const yDate = yesterday.toISOString().split('T')[0];
            const { data: yLog } = await supabase
                .from('daily_logs')
                .select('has_illness, recovery_day')
                .eq('infant_id', infant.id)
                .eq('log_date', yDate)
                .maybeSingle();

            let recoveryDay = 0;
            if (!isSick && yLog?.has_illness) {
                recoveryDay = 1;
            } else if (
                !isSick &&
                yLog &&
                !yLog.has_illness &&
                (yLog.recovery_day || 0) > 0
            ) {
                recoveryDay = Math.min((yLog.recovery_day || 0) + 1, 21);
            }

            const feedingFrequency = milkFeeds + solidMeals + snacks;

            const payload = {
                infant_id: infant.id,
                log_date: today,
                sleep_hours: sleepHours,
                feed_type: feedType,
                f_breast_formula: milkFeeds,
                f_solid_meal: solidMeals,
                f_nutritious_snacks: snacks,
                f_iron_rich: 0,
                f_animal_protein: 0,
                f_plant_based: 0,
                f_junk_food: 0,
                feeding_frequency: feedingFrequency,
                daily_calorie_intake: estimatedCalories,
                has_illness: isSick,
                illness_type: isSick ? illnessType : null,
                recovery_day: recoveryDay,
            };

            if (isUpdate && existingLogId) {
                const { error } = await supabase
                    .from('daily_logs')
                    .update(payload)
                    .eq('id', existingLogId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('daily_logs').insert(payload);
                if (error) throw error;
            }

            const daysLeft = Math.max(0, 7 - (logCount + (isUpdate ? 0 : 1)));
            Alert.alert(
                isUpdate ? '✅ Updated' : '✅ Logged',
                isUpdate
                    ? "Today's entry updated."
                    : daysLeft > 0
                        ? `Day ${logCount + 1} done! ${daysLeft} more day${daysLeft > 1 ? 's' : ''} until AI activates.`
                        : 'All caught up! AI model is now active.',
                [{ text: 'OK', onPress: () => router.back() }],
            );
        } catch (err: any) {
            Alert.alert('Save Failed', err.message || 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ── Helpers ────────────────────────────────────────
    const todayStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });

    const milkFeedLabel =
        feedType === 'breastfed'
            ? 'How many times did baby breastfeed?'
            : feedType === 'formula'
                ? 'How many formula feeds today?'
                : 'Total milk feeds today (breast + formula)';

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
                    <Text style={styles.headerTitle}>Daily Log</Text>
                    <Text style={styles.headerDate}>{todayStr}</Text>
                </View>

                {infant && (
                    <Text style={styles.subHeader}>
                        Logging for {infant.name || 'Baby'}
                    </Text>
                )}

                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 8,
                    marginBottom: 4,
                }}>
                    <Text style={{ color: '#8892a4', fontSize: 13 }}>
                        Log date:
                    </Text>
                    <TextInput
                        value={logDate}
                        onChangeText={(text) => setLogDate(text)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#4a5568"
                        style={{
                            color: '#FFFFFF',
                            fontSize: 13,
                            fontWeight: '600',
                            backgroundColor: '#0f1729',
                            borderWidth: 1,
                            borderColor: '#6C63FF',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            minWidth: 110,
                            textAlign: 'center',
                        }}
                    />
                </View>

                {/* Update banner */}
                {isUpdate && (
                    <View style={styles.updateBanner}>
                        <Text style={styles.updateBannerText}>
                            ✏️ Updating today's entry
                        </Text>
                    </View>
                )}

                {/* ── AI PROGRESS BANNER ────────────────── */}
                <View style={styles.aiBanner}>
                    {logCount < 7 ? (
                        <>
                            <View style={styles.aiRow}>
                                <Text style={styles.aiIcon}>🤖</Text>
                                <Text style={styles.aiText}>
                                    Day {Math.min(logCount + (isUpdate ? 0 : 1), 7)}/7 — Keep
                                    logging daily
                                </Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${(logCount / 7) * 100}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.aiSub}>
                                {Math.max(0, 7 - logCount)} more day
                                {7 - logCount !== 1 ? 's' : ''} to activate AI predictions
                            </Text>
                        </>
                    ) : (
                        <View style={styles.aiRow}>
                            <Text style={styles.aiIcon}>🤖</Text>
                            <View style={styles.aiBadge}>
                                <Text style={styles.aiBadgeText}>AI Active</Text>
                            </View>
                            <Text style={[styles.aiText, { marginLeft: 8 }]}>
                                Growth predictions are running
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── CARD 1 — SLEEP ────────────────────── */}
                <View style={[styles.card, { borderLeftColor: T.primary }]}>
                    <Text style={styles.cardTitle}>😴 Sleep</Text>

                    <View style={styles.sleepDisplay}>
                        <Text style={styles.sleepNumber}>{sleepHours.toFixed(1)}</Text>
                        <Text style={styles.sleepUnit}>hrs</Text>
                    </View>

                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={24}
                        step={0.5}
                        value={sleepHours}
                        onValueChange={setSleepHours}
                        minimumTrackTintColor={T.primary}
                        maximumTrackTintColor={T.cardBorder}
                        thumbTintColor={T.primary}
                    />

                    <View style={styles.sliderLabels}>
                        <Text style={styles.mutedText}>0h</Text>
                        <Text style={styles.mutedText}>24h</Text>
                    </View>
                </View>

                {/* ── CARD 2 — FEEDING ──────────────────── */}
                <View style={[styles.card, { borderLeftColor: T.primary }]}>
                    <Text style={styles.cardTitle}>🍼 Feeding</Text>

                    {/* Feed type buttons */}
                    <View style={styles.feedTypeRow}>
                        {(['breastfed', 'formula', 'mixed'] as FeedType[]).map((type) => (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    styles.feedTypeBtn,
                                    feedType === type && styles.feedTypeBtnActive,
                                ]}
                                onPress={() => setFeedType(type)}
                            >
                                <Text
                                    style={[
                                        styles.feedTypeBtnText,
                                        feedType === type && styles.feedTypeBtnTextActive,
                                    ]}
                                >
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Milk feeds counter */}
                    <Text style={styles.feedLabel}>{milkFeedLabel}</Text>
                    <View style={styles.counterRow}>
                        <TouchableOpacity
                            style={styles.counterBtn}
                            onPress={() => setMilkFeeds(Math.max(0, milkFeeds - 1))}
                        >
                            <Text style={styles.counterBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={styles.counterNumber}>{milkFeeds}</Text>
                        <TouchableOpacity
                            style={styles.counterBtn}
                            onPress={() => setMilkFeeds(Math.min(15, milkFeeds + 1))}
                        >
                            <Text style={styles.counterBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View style={styles.feedDivider} />

                    {/* Solid meals counter */}
                    <View style={styles.miniCounterSection}>
                        <View style={styles.miniCounterLabelRow}>
                            <Text style={styles.feedLabel}>Solid meals</Text>
                            <Text style={styles.miniHint}>0 = baby not on solids yet</Text>
                        </View>
                        <View style={styles.miniCounterRow}>
                            <TouchableOpacity
                                style={styles.miniCounterBtn}
                                onPress={() => setSolidMeals(Math.max(0, solidMeals - 1))}
                            >
                                <Text style={styles.miniCounterBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.miniCounterNumber}>{solidMeals}</Text>
                            <TouchableOpacity
                                style={styles.miniCounterBtn}
                                onPress={() => setSolidMeals(Math.min(3, solidMeals + 1))}
                            >
                                <Text style={styles.miniCounterBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Snacks counter */}
                    <View style={styles.miniCounterSection}>
                        <View style={styles.miniCounterLabelRow}>
                            <Text style={styles.feedLabel}>Nutritious snacks</Text>
                            <Text style={styles.miniHint}>Fruits, yogurt, healthy finger foods</Text>
                        </View>
                        <View style={styles.miniCounterRow}>
                            <TouchableOpacity
                                style={styles.miniCounterBtn}
                                onPress={() => setSnacks(Math.max(0, snacks - 1))}
                            >
                                <Text style={styles.miniCounterBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.miniCounterNumber}>{snacks}</Text>
                            <TouchableOpacity
                                style={styles.miniCounterBtn}
                                onPress={() => setSnacks(Math.min(3, snacks + 1))}
                            >
                                <Text style={styles.miniCounterBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Estimated calories */}
                    <View style={styles.calorieBadge}>
                        <Text style={styles.calorieText}>
                            ≈ {estimatedCalories} kcal estimated today
                        </Text>
                    </View>
                </View>

                {/* ── CARD 3 — HEALTH ───────────────────── */}
                <View
                    style={[
                        styles.card,
                        { borderLeftColor: isSick ? T.error : T.success },
                    ]}
                >
                    <Text style={styles.cardTitle}>🌡️ Health</Text>

                    {/* Health toggle */}
                    <View style={styles.healthRow}>
                        <TouchableOpacity
                            style={[
                                styles.healthBtn,
                                !isSick && styles.healthBtnHealthy,
                            ]}
                            onPress={() => {
                                setIsSick(false);
                                setIllnessType(null);
                            }}
                        >
                            <Text
                                style={[
                                    styles.healthBtnText,
                                    !isSick && styles.healthBtnTextActive,
                                ]}
                            >
                                ✓ Healthy today
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.healthBtn,
                                isSick && styles.healthBtnSick,
                            ]}
                            onPress={() => setIsSick(true)}
                        >
                            <Text
                                style={[
                                    styles.healthBtnText,
                                    isSick && styles.healthBtnTextActive,
                                ]}
                            >
                                Baby is sick
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Illness type — animated */}
                    <Animated.View
                        style={{
                            maxHeight: illnessAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 200],
                            }),
                            opacity: illnessAnim,
                            overflow: 'hidden',
                        }}
                    >
                        <Text style={styles.illnessLabel}>Type of illness:</Text>
                        <View style={styles.chipGrid}>
                            {(['Diarrhoea', 'Respiratory', 'Fever', 'Other'] as IllnessType[]).map(
                                (type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.chip,
                                            illnessType === type && styles.chipActive,
                                        ]}
                                        onPress={() => setIllnessType(type)}
                                    >
                                        <Text
                                            style={[
                                                styles.chipText,
                                                illnessType === type && styles.chipTextActive,
                                            ]}
                                        >
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                ),
                            )}
                        </View>
                    </Animated.View>

                    <Text style={styles.autoTrackNote}>
                        Recovery tracking happens automatically
                    </Text>
                </View>

                {/* Bottom spacer for footer */}
                <View style={{ height: 140 }} />
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
                        <Text style={styles.saveBtnText}>
                            {isUpdate ? "Update Today's Log" : "Save Today's Log"}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.outlineBtn}
                    onPress={() => router.push('/(tabs)/update-measurements' as any)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.outlineBtnText}>📏 Update Weight & Height</Text>
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
        fontSize: 20,
        fontWeight: '800',
        color: T.white,
    },
    headerDate: {
        fontSize: 14,
        color: T.muted,
    },
    subHeader: {
        textAlign: 'center',
        color: T.muted,
        fontSize: 14,
        marginBottom: 12,
    },

    /* Update banner */
    updateBanner: {
        backgroundColor: 'rgba(255,152,0,0.12)',
        borderWidth: 1,
        borderColor: T.warning,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 12,
        alignItems: 'center',
    },
    updateBannerText: {
        color: T.warning,
        fontWeight: '700',
        fontSize: 14,
    },

    /* AI Banner */
    aiBanner: {
        backgroundColor: 'rgba(108,99,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(108,99,255,0.2)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    aiRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    aiIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    aiText: {
        color: T.white,
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: T.cardBorder,
        borderRadius: 3,
        marginTop: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: 6,
        backgroundColor: T.primary,
        borderRadius: 3,
    },
    aiSub: {
        color: T.muted,
        fontSize: 12,
        marginTop: 6,
    },
    aiBadge: {
        backgroundColor: T.success,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    aiBadgeText: {
        color: T.white,
        fontSize: 12,
        fontWeight: '700',
    },

    /* Card base */
    card: {
        backgroundColor: T.cardBg,
        borderWidth: 1,
        borderColor: T.cardBorder,
        borderRadius: 14,
        borderLeftWidth: 4,
        padding: 18,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: T.white,
        marginBottom: 14,
    },

    /* Sleep */
    sleepDisplay: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginBottom: 8,
    },
    sleepNumber: {
        fontSize: 48,
        fontWeight: '800',
        color: T.white,
    },
    sleepUnit: {
        fontSize: 18,
        color: T.primary,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -4,
    },
    mutedText: {
        color: T.muted,
        fontSize: 12,
    },

    /* Feeding type */
    feedTypeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    feedTypeBtn: {
        flex: 1,
        height: 44,
        backgroundColor: T.inputBg,
        borderWidth: 1,
        borderColor: T.inputBorder,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    feedTypeBtnActive: {
        backgroundColor: T.primary,
        borderColor: T.primary,
    },
    feedTypeBtnText: {
        color: T.muted,
        fontSize: 14,
        fontWeight: '600',
    },
    feedTypeBtnTextActive: {
        color: T.white,
        fontWeight: '800',
    },

    /* Feed count */
    feedLabel: {
        color: T.label,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 10,
    },
    counterRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        marginBottom: 14,
    },
    counterBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(108,99,255,0.15)',
        borderWidth: 1,
        borderColor: T.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterBtnText: {
        color: T.primary,
        fontSize: 24,
        fontWeight: '700',
        marginTop: -2,
    },
    counterNumber: {
        fontSize: 56,
        fontWeight: '900',
        color: T.white,
        minWidth: 60,
        textAlign: 'center',
    },

    /* Feed divider */
    feedDivider: {
        height: 1,
        backgroundColor: T.cardBorder,
        marginVertical: 14,
    },

    /* Mini counter (solid meals, snacks) */
    miniCounterSection: {
        marginBottom: 14,
    },
    miniCounterLabelRow: {
        marginBottom: 8,
    },
    miniHint: {
        color: T.muted,
        fontSize: 11,
        marginTop: 2,
    },
    miniCounterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    miniCounterBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(108,99,255,0.15)',
        borderWidth: 1,
        borderColor: T.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniCounterBtnText: {
        color: T.primary,
        fontSize: 20,
        fontWeight: '700',
        marginTop: -2,
    },
    miniCounterNumber: {
        fontSize: 32,
        fontWeight: '800',
        color: T.white,
        minWidth: 40,
        textAlign: 'center',
    },

    /* Calories */
    calorieBadge: {
        backgroundColor: 'rgba(108,99,255,0.06)',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
    },
    calorieText: {
        color: T.muted,
        fontSize: 13,
    },

    /* Health */
    healthRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 14,
    },
    healthBtn: {
        flex: 1,
        height: 52,
        backgroundColor: T.inputBg,
        borderWidth: 1,
        borderColor: T.inputBorder,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    healthBtnHealthy: {
        backgroundColor: T.success,
        borderColor: T.success,
    },
    healthBtnSick: {
        backgroundColor: T.error,
        borderColor: T.error,
    },
    healthBtnText: {
        color: T.muted,
        fontSize: 15,
        fontWeight: '600',
    },
    healthBtnTextActive: {
        color: T.white,
        fontWeight: '700',
    },

    /* Illness */
    illnessLabel: {
        color: T.label,
        fontSize: 14,
        marginBottom: 10,
        fontWeight: '600',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        width: '47%',
        height: 48,
        backgroundColor: T.cardBg,
        borderWidth: 1,
        borderColor: T.cardBorder,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipActive: {
        backgroundColor: T.error,
        borderColor: T.error,
    },
    chipText: {
        color: T.muted,
        fontSize: 14,
        fontWeight: '600',
    },
    chipTextActive: {
        color: T.white,
        fontWeight: '700',
    },
    autoTrackNote: {
        color: T.muted,
        fontSize: 11,
        textAlign: 'center',
        marginTop: 14,
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
    outlineBtn: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: T.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    outlineBtnText: {
        color: T.primary,
        fontSize: 14,
        fontWeight: '700',
    },
});

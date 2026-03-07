import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Animated,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography, Shadows } from '@/constants/theme';

type FeedType = 'breastfed' | 'formula' | 'mixed';
type IllnessType = 'Diarrhoea' | 'Respiratory' | 'Fever' | 'Other';

export default function DailyLogScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const colorScheme = useColorScheme() ?? 'light';
    const C = Colors[colorScheme];

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
    }, [isSick, illnessAnim]);

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
                const { data: infantData, error: infantError } = await supabase
                    .from('infants')
                    .select('*')
                    .eq('parent_id', user.id)
                    .limit(1)
                    .maybeSingle();

                if (infantError) {
                    throw infantError;
                }

                if (!infantData) {
                    setPageLoading(false);
                    return;
                }
                setInfant(infantData);

                // Check if today's log already exists
                const today = new Date().toISOString().split('T')[0];
                setLogDate(today);

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
        feedType === 'breastfed' ? 'Breastfeeds' :
            feedType === 'formula' ? 'Formula feeds' : 'Milk feeds';

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
        <View style={[styles.container, { backgroundColor: '#F8F9FF' }]}>
            {/* ── PURPLE HEADER ──────────────────────────── */}
            <LinearGradient
                colors={['#5E5CE6', '#7B79FF']}
                style={[styles.headerGradient, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                        <Text style={{ color: '#FFF', fontSize: 28, lineHeight: 32 }}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={[Typography.headline, { color: '#FFF', fontWeight: '700' }]}>Today's Log</Text>
                        <Text style={[Typography.caption1, { color: 'rgba(255,255,255,0.75)' }]}>
                            {infant?.name || 'Baby'} · {todayStr}
                        </Text>
                    </View>
                    <View style={styles.headerBtn} />
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: 32 }]}
                showsVerticalScrollIndicator={false}
            >

                {/* ── AI BANNER ─────────────────────────── */}
                <View style={[styles.aiBanner, {
                    backgroundColor: logCount < 7 ? C.primarySoft : C.successSoft,
                    borderColor: logCount < 7 ? C.primary : C.success,
                    marginBottom: 12
                }]}>
                    {logCount < 7 ? (
                        <>
                            <Text style={{ fontSize: 16 }}>🤖</Text>
                            <Text style={[Typography.subheadline, { color: C.primary, flex: 1, marginHorizontal: 8 }]}>
                                Day {Math.min(logCount + (isUpdate ? 0 : 1), 7)}/7
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <View
                                        key={i}
                                        style={{
                                            width: i < logCount ? 8 : 6,
                                            height: i < logCount ? 8 : 6,
                                            borderRadius: 4,
                                            backgroundColor: i < logCount ? C.primary : C.cardTertiary
                                        }}
                                    />
                                ))}
                            </View>
                        </>
                    ) : (
                        <Text style={[Typography.subheadline, { color: C.success, textAlign: 'center', flex: 1 }]}>
                            🤖 AI Active · Growth predictions running
                        </Text>
                    )}
                </View>

                {/* ── SLEEP CARD ────────────────────────── */}
                <View style={[styles.card, Shadows.sm, { backgroundColor: C.card, marginBottom: 12 }]}>
                    <View style={styles.cardHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 20 }}>😴</Text>
                            <Text style={[Typography.headline, { color: C.label }]}>Sleep</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={[{ fontSize: 36, fontWeight: '700', color: C.primary }]}>
                                {sleepHours.toFixed(1)}
                            </Text>
                            <Text style={[Typography.headline, { color: C.labelTertiary, marginLeft: 2 }]}>hrs</Text>
                        </View>
                    </View>

                    <Slider
                        style={{ width: '100%', height: 40, marginTop: 8 }}
                        minimumValue={0}
                        maximumValue={24}
                        step={0.5}
                        value={sleepHours}
                        onValueChange={setSleepHours}
                        minimumTrackTintColor={C.primary}
                        maximumTrackTintColor={C.cardTertiary}
                        thumbTintColor={C.primary}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                        <Text style={[Typography.caption2, { color: C.labelTertiary }]}>0h</Text>
                        <Text style={[Typography.caption2, { color: C.labelTertiary }]}>24h</Text>
                    </View>
                </View>

                {/* ── FEEDING CARD ──────────────────────── */}
                <View style={[styles.card, Shadows.sm, { backgroundColor: C.card, marginBottom: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                        <Text style={{ fontSize: 20 }}>🍼</Text>
                        <Text style={[Typography.headline, { color: C.label }]}>Feeding</Text>
                    </View>

                    {/* Feed type pills */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                        {(['breastfed', 'formula', 'mixed'] as FeedType[]).map((type) => {
                            const active = feedType === type;
                            return (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.feedPill,
                                        {
                                            backgroundColor: active ? C.primary : C.cardSecondary,
                                            borderColor: active ? C.primary : C.border,
                                            borderWidth: active ? 0 : 1
                                        }
                                    ]}
                                    onPress={() => setFeedType(type)}
                                >
                                    <Text style={[
                                        { fontSize: 13, color: active ? '#FFF' : C.labelTertiary },
                                        active && { fontWeight: '600' }
                                    ]}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* 3 Counters Row */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                        {/* 1. Milk */}
                        <View style={styles.counterCol}>
                            <Text style={[Typography.caption2, { color: C.labelTertiary, textAlign: 'center', marginBottom: 8 }]}>
                                {milkFeedLabel}
                            </Text>
                            <View style={styles.stepperRow}>
                                <TouchableOpacity
                                    style={[styles.stepperBtn, { backgroundColor: C.cardSecondary, borderColor: C.border }]}
                                    onPress={() => setMilkFeeds(Math.max(0, milkFeeds - 1))}
                                >
                                    <Text style={[Typography.headline, { color: C.primary, marginTop: -2 }]}>−</Text>
                                </TouchableOpacity>
                                <Text style={[{ fontSize: 28, fontWeight: '700', color: C.label, minWidth: 40, textAlign: 'center' }]}>
                                    {milkFeeds}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.stepperBtn, { backgroundColor: C.cardSecondary, borderColor: C.border }]}
                                    onPress={() => setMilkFeeds(Math.min(15, milkFeeds + 1))}
                                >
                                    <Text style={[Typography.headline, { color: C.primary, marginTop: -2 }]}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* 2. Meals */}
                        <View style={styles.counterCol}>
                            <Text style={[Typography.caption2, { color: C.labelTertiary, textAlign: 'center', marginBottom: 8 }]}>
                                Meals
                            </Text>
                            <View style={styles.stepperRow}>
                                <TouchableOpacity
                                    style={[styles.stepperBtn, { backgroundColor: C.cardSecondary, borderColor: C.border }]}
                                    onPress={() => setSolidMeals(Math.max(0, solidMeals - 1))}
                                >
                                    <Text style={[Typography.headline, { color: C.primary, marginTop: -2 }]}>−</Text>
                                </TouchableOpacity>
                                <Text style={[{ fontSize: 28, fontWeight: '700', color: C.label, minWidth: 40, textAlign: 'center' }]}>
                                    {solidMeals}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.stepperBtn, { backgroundColor: C.cardSecondary, borderColor: C.border }]}
                                    onPress={() => setSolidMeals(Math.min(3, solidMeals + 1))}
                                >
                                    <Text style={[Typography.headline, { color: C.primary, marginTop: -2 }]}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* 3. Snacks */}
                        <View style={styles.counterCol}>
                            <Text style={[Typography.caption2, { color: C.labelTertiary, textAlign: 'center', marginBottom: 8 }]}>
                                Snacks
                            </Text>
                            <View style={styles.stepperRow}>
                                <TouchableOpacity
                                    style={[styles.stepperBtn, { backgroundColor: C.cardSecondary, borderColor: C.border }]}
                                    onPress={() => setSnacks(Math.max(0, snacks - 1))}
                                >
                                    <Text style={[Typography.headline, { color: C.primary, marginTop: -2 }]}>−</Text>
                                </TouchableOpacity>
                                <Text style={[{ fontSize: 28, fontWeight: '700', color: C.label, minWidth: 40, textAlign: 'center' }]}>
                                    {snacks}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.stepperBtn, { backgroundColor: C.cardSecondary, borderColor: C.border }]}
                                    onPress={() => setSnacks(Math.min(3, snacks + 1))}
                                >
                                    <Text style={[Typography.headline, { color: C.primary, marginTop: -2 }]}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Calorie Pill */}
                    <View style={{ alignSelf: 'center', backgroundColor: C.cardSecondary, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 16 }}>
                        <Text style={[Typography.footnote, { color: C.labelTertiary }]}>
                            ≈ {estimatedCalories} kcal today
                        </Text>
                    </View>
                </View>

                {/* ── HEALTH ROW ────────────────────────── */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                    <TouchableOpacity
                        style={[
                            styles.healthBtn,
                            !isSick ? { backgroundColor: C.success, borderWidth: 0 } : { backgroundColor: C.cardSecondary, borderColor: C.border, borderWidth: 1 }
                        ]}
                        onPress={() => { setIsSick(false); setIllnessType(null); }}
                    >
                        <Text style={[
                            { fontSize: 15 },
                            !isSick ? { color: '#FFF', fontWeight: '700' } : { color: C.labelTertiary }
                        ]}>
                            ✓ Healthy today
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.healthBtn,
                            isSick ? { backgroundColor: C.danger, borderWidth: 0 } : { backgroundColor: C.cardSecondary, borderColor: C.border, borderWidth: 1 }
                        ]}
                        onPress={() => setIsSick(true)}
                    >
                        <Text style={[
                            { fontSize: 15 },
                            isSick ? { color: '#FFF', fontWeight: '700' } : { color: C.labelTertiary }
                        ]}>
                            🤒 Baby is sick
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Animated sick expanse */}
                <Animated.View style={{
                    maxHeight: illnessAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] }),
                    opacity: illnessAnim,
                    overflow: 'hidden',
                    marginBottom: 24,
                }}>
                    <Text style={[Typography.subheadline, { color: C.labelSecondary, marginBottom: 12 }]}>Type of illness:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {(['Diarrhoea', 'Respiratory', 'Fever', 'Other'] as IllnessType[]).map((type) => {
                            const active = illnessType === type;
                            return (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.illnessChip,
                                        {
                                            backgroundColor: active ? C.danger : C.card,
                                            borderColor: active ? C.danger : C.border,
                                            borderWidth: active ? 0 : 1
                                        }
                                    ]}
                                    onPress={() => setIllnessType(type)}
                                >
                                    <Text style={[
                                        { fontSize: 14 },
                                        active ? { color: '#FFF', fontWeight: '600' } : { color: C.labelTertiary }
                                    ]}>{type}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <Text style={[Typography.caption1, { color: C.labelTertiary, textAlign: 'center', marginTop: 12 }]}>
                        Recovery tracking happens automatically
                    </Text>
                </Animated.View>


                {/* ── SAVE BUTTON ───────────────────────── */}
                <TouchableOpacity
                    style={[
                        styles.saveBtn,
                        {
                            backgroundColor: C.primary,
                            shadowColor: C.primary,
                            marginBottom: 24
                        },
                        saving && { opacity: 0.7 }
                    ]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={[Typography.callout, { color: '#FFF', fontWeight: '700' }]}>
                            {isUpdate ? "Update Today's Log" : "Save Today's Log"}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* ── SECONDARY LINK ────────────────────── */}
                <TouchableOpacity onPress={() => router.push('/(tabs)/update-measurements' as any)}>
                    <Text style={[Typography.callout, { color: C.primary, textAlign: 'center', fontWeight: '500' }]}>
                        📏 Update Weight & Height →
                    </Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

// ── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    },
    headerCenter: {
        alignItems: 'center',
    },
    aiBanner: {
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    card: {
        padding: 16,
        borderRadius: 16,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    feedPill: {
        flex: 1,
        height: 36,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterCol: {
        flex: 1,
    },
    stepperRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stepperBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    healthBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    illnessChip: {
        width: '48%',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
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

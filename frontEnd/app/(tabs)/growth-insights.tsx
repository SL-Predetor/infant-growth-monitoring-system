import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography, wazColor, Shadows } from '@/constants/theme';

const API_URL = Platform.OS === 'web'
    ? 'http://localhost:8000/api'
    : 'http://192.168.8.119:8000/api';

export default function GrowthInsightsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const colorScheme = useColorScheme() ?? 'light';
    const C = Colors[colorScheme];

    // ── State ──────────────────────────────────────────
    const [infant, setInfant] = useState<any>(null);
    const [ageDays, setAgeDays] = useState(0);
    const [riskScore, setRiskScore] = useState<number | null>(null);
    const [riskLevel, setRiskLevel] = useState<string | null>(null);
    const [currentWaz, setCurrentWaz] = useState<number | null>(null);
    const [latestWeightG, setLatestWeightG] = useState<number | null>(null);
    const [latestHeightCm, setLatestHeightCm] = useState<number | null>(null);
    const [measurements, setMeasurements] = useState<any[]>([]);

    const [anomalyData, setAnomalyData] = useState<any>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [anomalyLoading, setAnomalyLoading] = useState(false);

    // ── Data Fetching ──────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            if (!user) { setPageLoading(false); return; }
            try {
                // 1. Fetch infant profile
                const { data: infantData } = await supabase.from('infants')
                    .select('*')
                    .eq('parent_id', user.id)
                    .maybeSingle();

                if (!infantData) { setPageLoading(false); return; }
                setInfant(infantData);

                // 2. Fetch Growth Dashboard
                const dashRes = await fetch(`${API_URL}/growth/dashboard/${infantData.id}`);
                if (!dashRes.ok) throw new Error('Dashboard API failed');
                const dashData = await dashRes.json();

                setAgeDays(dashData.age_days ?? 0);
                setRiskScore(dashData.risk_score ?? null);
                setRiskLevel(dashData.risk_level ?? null);
                setCurrentWaz(dashData.current_waz ?? null);
                setLatestWeightG(dashData.latest_weight_g ?? null);
                setLatestHeightCm(dashData.latest_height_cm ?? null);
                setMeasurements(dashData.chart_data ?? []);

                // 3. Fetch Latest Log for Anomaly Scoring
                setAnomalyLoading(true);
                const { data: log } = await supabase.from('daily_logs')
                    .select('*')
                    .eq('infant_id', infantData.id)
                    .order('log_date', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (log) {
                    // Compute weight velocity (from last 2 measurements)
                    let weightVelocity = 0;
                    if (dashData.chart_data && dashData.chart_data.length >= 2) {
                        const m = dashData.chart_data;
                        const latest = m[m.length - 1];
                        const prev = m[m.length - 2];
                        const daysDiff = (new Date(latest.measured_date).getTime() - new Date(prev.measured_date).getTime()) / (1000 * 3600 * 24);
                        if (daysDiff > 0) {
                            weightVelocity = (latest.weight_g - prev.weight_g) / daysDiff;
                        }
                    }

                    // 4. Call Anomaly Endpoint
                    const anomalyRes = await fetch(`${API_URL}/growth/anomaly-score`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            age_in_days: dashData.age_days ?? 0,
                            weight_g: dashData.latest_weight_g ?? 3500,
                            height_cm: dashData.latest_height_cm ?? 50,
                            waz_score: dashData.current_waz ?? 0,
                            illness_day: log.has_illness ? 1 : 0,
                            recovery_day: log.recovery_day ?? 0,
                            has_illness_episode: log.has_illness ? 1 : 0,
                            sleep_hours: log.sleep_hours ?? 16,
                            feeding_frequency: log.feeding_frequency ?? 8,
                            daily_calorie_intake: log.daily_calorie_intake ?? 0,
                            appetite_factor: log.has_illness ? 0.6 : 1.0,
                            gestational_diabetes: infantData.gestational_diabetes ? 1 : 0,
                            maternal_bmi: infantData.maternal_bmi ?? 22,
                            weight_velocity: weightVelocity,
                            f_solid_meal: log.f_solid_meal ?? 0,
                            f_nutritious_snacks: log.f_nutritious_snacks ?? 0,
                            underweight_flag: (dashData.current_waz ?? 0) < -2 ? 1 : 0,
                            severe_underweight_flag: (dashData.current_waz ?? 0) < -3 ? 1 : 0,
                        })
                    });

                    if (anomalyRes.ok) {
                        const aData = await anomalyRes.json();
                        setAnomalyData(aData);
                    }
                }
            } catch (err) {
                console.error('Growth Insights fetch error:', err);
            } finally {
                setPageLoading(false);
                setAnomalyLoading(false);
            }
        };

        fetchData();
    }, [user]);

    // ── Logic ──────────────────────────────────────────
    const alertMatrix = useMemo(() => {
        const rs = riskScore ?? 0;
        const as = anomalyData?.ensemble_anomaly_score ?? 0;

        if (rs >= 0.5 && as >= 0.5) return { id: 'critical', text: '🔴 Critical', color: '#EF4444', soft: '#FEE2E2', desc: 'Both present and future signals are elevated. Please consult a healthcare provider.' };
        if (rs >= 0.5 && as < 0.5) return { id: 'early_warning', text: '🟡 Early Warning', color: '#F59E0B', soft: '#FEF3C7', desc: 'Risk is rising for the next 7 days, but no current-state anomaly detected yet. Watch feeding and sleep closely.' };
        if (rs < 0.5 && as >= 0.5) return { id: 'acute_episode', text: '🟠 Acute Episode', color: '#F97316', soft: '#FFEDD5', desc: 'Something abnormal is happening today — could be illness or a temporary dip. Future risk is still low.' };
        return { id: 'all_clear', text: '🟢 All Clear', color: '#22C55E', soft: '#DCFCE7', desc: 'Both models show no concerns. Baby\'s growth is on track.' };
    }, [riskScore, anomalyData]);

    const anomalyLabelColor = useMemo(() => {
        const label = anomalyData?.anomaly_label;
        if (label === 'critical') return '#EF4444';
        if (label === 'anomaly') return '#F97316';
        if (label === 'monitoring') return '#F59E0B';
        return '#22C55E';
    }, [anomalyData]);

    const riskColor = useMemo(() => {
        if (riskLevel === 'High') return '#EF4444';
        if (riskLevel === 'Medium') return '#F59E0B';
        return '#22C55E';
    }, [riskLevel]);

    if (pageLoading) return <View style={styles.centeredPage}><ActivityIndicator size="large" color={C.primary} /></View>;

    if (!infant) {
        return (
            <View style={styles.centeredPage}>
                <Text style={[Typography.callout, { color: C.labelSecondary }]}>Register a baby to see insights</Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: '#F0F0FA' }]} showsVerticalScrollIndicator={false}>

            {/* ── HEADER ────────────────────────────────────── */}
            <LinearGradient colors={['#5E5CE6', '#7B79FF']} style={styles.header}>
                <SafeAreaView>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Text style={{ color: '#FFF', fontSize: 28 }}>←</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center', marginRight: 44 }}>
                            <Text style={[Typography.title3, { color: '#FFF', fontWeight: '700' }]}>Growth Insights</Text>
                            <Text style={[Typography.caption1, { color: 'rgba(255,255,255,0.8)' }]}>
                                {infant?.name} · AI Analysis
                            </Text>
                        </View>
                    </View>

                    <View style={styles.matrixStatusWrapper}>
                        <View style={[styles.matrixStatusPill, { backgroundColor: '#FFF' }]}>
                            <Text style={[Typography.headline, { color: alertMatrix.color, fontWeight: '700' }]}>
                                {alertMatrix.text}
                            </Text>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <View style={styles.content}>

                {/* ── SECTION: Today's Signal ───────────────────── */}
                <Text style={[Typography.subheadline, styles.sectionTitle, { color: C.label }]}>Today's Signal</Text>
                <View style={styles.row}>
                    {/* Card 1: Future Risk */}
                    <View style={[styles.scoreCard, { backgroundColor: C.card, borderLeftColor: riskColor }, Shadows.md]}>
                        <Text style={styles.cardEmoji}>🔮</Text>
                        <Text style={[Typography.caption2, { color: C.labelTertiary }]}>7-Day Risk</Text>
                        <Text style={[Typography.title2, { color: riskColor }]}>
                            {riskScore !== null ? `${Math.round(riskScore * 100)}%` : '--'}
                        </Text>
                        <Text style={[Typography.caption1, { color: riskColor, fontWeight: '600' }]}>{riskLevel || 'Checking...'}</Text>
                        <Text style={[Typography.caption2, { color: C.labelTertiary, marginTop: 4 }]}>Next 7 days outlook</Text>
                    </View>

                    {/* Card 2: Current State */}
                    <View style={[styles.scoreCard, { backgroundColor: C.card, borderLeftColor: anomalyLabelColor }, Shadows.md]}>
                        <Text style={styles.cardEmoji}>🎯</Text>
                        <Text style={[Typography.caption2, { color: C.labelTertiary }]}>Today's State</Text>
                        <Text style={[Typography.title2, { color: anomalyLabelColor }]}>
                            {anomalyData?.ensemble_anomaly_score !== undefined ? `${Math.round(anomalyData.ensemble_anomaly_score * 100)}%` : '--'}
                        </Text>
                        <Text style={[Typography.caption1, { color: anomalyLabelColor, fontWeight: '600' }]}>
                            {anomalyData?.anomaly_label ? anomalyData.anomaly_label.toUpperCase() : (anomalyLoading ? 'Analyzing...' : 'Unavailable')}
                        </Text>
                        <Text style={[Typography.caption2, { color: C.labelTertiary, marginTop: 4 }]}>
                            {anomalyData ? 'Present-state signal' : 'Anomaly engine offline'}
                        </Text>
                    </View>
                </View>

                {/* ── SECTION: What this means ──────────────────── */}
                <View style={[styles.explanationCard, { backgroundColor: alertMatrix.soft }]}>
                    <Text style={[Typography.headline, { color: alertMatrix.color, fontWeight: '700', marginBottom: 4 }]}>
                        {alertMatrix.text}
                    </Text>
                    <Text style={[Typography.subheadline, { color: alertMatrix.color, lineHeight: 20 }]}>
                        {alertMatrix.desc}
                    </Text>
                </View>

                {/* ── SECTION: Model Confidence ─────────────────── */}
                <Text style={[Typography.subheadline, styles.sectionTitle, { color: C.label }]}>Model Confidence</Text>
                <View style={[styles.confidenceCard, { backgroundColor: C.card }, Shadows.sm]}>
                    <View style={styles.confidenceHeader}>
                        <Text style={[Typography.headline, { color: C.label }]}>Anomaly Engines</Text>
                        <View style={[styles.confidenceBadge, { backgroundColor: anomalyData?.confidence === 'high' ? '#DCFCE7' : (anomalyData ? '#FEF3C7' : C.border) }]}>
                            <Text style={[Typography.caption1, { color: anomalyData?.confidence === 'high' ? '#22C55E' : (anomalyData ? '#F59E0B' : C.labelTertiary), fontWeight: '700' }]}>
                                {anomalyData?.confidence ? anomalyData.confidence.toUpperCase() : (anomalyLoading ? 'PENDING' : 'OFFLINE')}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.barItem}>
                        <View style={styles.rowBetween}>
                            <Text style={[Typography.caption1, { color: C.labelSecondary }]}>Random Forest</Text>
                            <Text style={[Typography.caption1, { color: C.labelTertiary }]}>{anomalyData ? Math.round(anomalyData.rf_anomaly_score * 100) : 0}%</Text>
                        </View>
                        <View style={[styles.barBg, { backgroundColor: C.border }]}>
                            <View style={[styles.barFill, { width: `${(anomalyData?.rf_anomaly_score || 0) * 100}%`, backgroundColor: '#5E5CE6' }]} />
                        </View>
                    </View>

                    <View style={styles.barItem}>
                        <View style={styles.rowBetween}>
                            <Text style={[Typography.caption1, { color: C.labelSecondary }]}>XGBoost</Text>
                            <Text style={[Typography.caption1, { color: C.labelTertiary }]}>{anomalyData ? Math.round(anomalyData.xgb_anomaly_score * 100) : 0}%</Text>
                        </View>
                        <View style={[styles.barBg, { backgroundColor: C.border }]}>
                            <View style={[styles.barFill, { width: `${(anomalyData?.xgb_anomaly_score || 0) * 100}%`, backgroundColor: '#7B79FF' }]} />
                        </View>
                    </View>
                </View>

                {/* ── BANNERS ───────────────────────────────────── */}
                {anomalyData?.recovery_signal && (
                    <View style={[styles.conditionalBanner, { backgroundColor: Colors[colorScheme].successSoft, borderColor: Colors[colorScheme].success }]}>
                        <Text style={{ fontSize: 16, marginRight: 8 }}>📈</Text>
                        <Text style={[Typography.subheadline, { color: Colors[colorScheme].success, flex: 1 }]}>
                            Recovery pattern detected — baby appears to be recovering well
                        </Text>
                    </View>
                )}

                {anomalyData?.gdm_sensitive && (
                    <View style={[styles.conditionalBanner, { backgroundColor: Colors[colorScheme].warningSoft, borderColor: Colors[colorScheme].warning }]}>
                        <Text style={{ fontSize: 16, marginRight: 8 }}>⚠️</Text>
                        <Text style={[Typography.subheadline, { color: Colors[colorScheme].warning, flex: 1 }]}>
                            Higher sensitivity active — maternal gestational diabetes history increases baseline anomaly sensitivity
                        </Text>
                    </View>
                )}

                {/* ── SECTION: About these models ───────────────── */}
                <View style={styles.infoBox}>
                    <Text style={[Typography.caption1, { color: C.labelTertiary, marginBottom: 8 }]}>
                        🔮 7-Day Risk — trained on 33,000 infant records. Predicts underweight risk in the next 7 days.
                    </Text>
                    <Text style={[Typography.caption1, { color: C.labelTertiary }]}>
                        🎯 Today's State — detects if baby is currently below their personal growth baseline.
                    </Text>
                    <Text style={[Typography.caption2, { color: C.labelTertiary, marginTop: 12, textAlign: 'center' }]}>
                        Scores update each time you log daily data.
                    </Text>
                </View>

                {/* ── ACTION BUTTONS ────────────────────────────── */}
                <View style={[styles.row, { marginTop: 24 }]}>
                    <TouchableOpacity style={[styles.actionBtnSolid, { backgroundColor: C.primary }]} onPress={() => router.push('/(tabs)/daily-log')}>
                        <Text style={[Typography.callout, { color: '#FFF', fontWeight: '700' }]}>📋 Log Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: C.primary }]} onPress={() => router.push('/(tabs)/update-measurements')}>
                        <Text style={[Typography.callout, { color: C.primary, fontWeight: '700' }]}>⚖️ Update Weight</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 60 }} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centeredPage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        marginBottom: 20,
    },
    backBtn: { width: 44, height: 44, justifyContent: 'center' },
    matrixStatusWrapper: { alignItems: 'center' },
    matrixStatusPill: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        ...Shadows.md,
    },
    content: { paddingHorizontal: 20 },
    sectionTitle: { marginTop: 24, marginBottom: 12, fontWeight: '700' },
    row: { flexDirection: 'row', gap: 12 },
    scoreCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        borderLeftWidth: 4,
        gap: 4,
    },
    cardEmoji: { fontSize: 24, marginBottom: 4 },
    explanationCard: {
        marginTop: 16,
        padding: 20,
        borderRadius: 20,
    },
    confidenceCard: {
        padding: 20,
        borderRadius: 20,
    },
    confidenceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    confidenceBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    barItem: { marginBottom: 16 },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    barBg: { height: 4, borderRadius: 2, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 2 },
    conditionalBanner: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 16,
    },
    infoBox: {
        marginTop: 24,
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    actionBtnSolid: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    actionBtnOutline: { flex: 1, height: 50, borderRadius: 25, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
});

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

const API_URL = 'http://localhost:8000/api';

type Log = {
    log_date: string;
    sleep_hours: number;
    feed_type: string;
    f_breast_formula: number;
    f_solid_meal: number;
    f_nutritious_snacks: number;
    feeding_frequency: number;
    daily_calorie_intake: number;
    has_illness: boolean;
    illness_type: string | null;
    recovery_day: boolean;
};

const formatDate = (dateStr: string) => {
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
        return dateStr;
    }
};

export default function GrowthHistoryScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const colorScheme = useColorScheme() ?? 'light';
    const C = Colors[colorScheme];

    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState<'All' | 'Healthy' | 'Sick'>('All');

    const fetchHistory = async () => {
        if (!user) return;
        setLoading(true);
        setError(false);
        try {
            const { data: infantData } = await supabase
                .from('infants')
                .select('id')
                .eq('parent_id', user.id)
                .maybeSingle();

            if (!infantData) {
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_URL}/growth/history/${infantData.id}?days=60`);
            if (!response.ok) throw new Error('Failed to fetch history');
            const data = await response.json();

            console.log("Raw API Response:", data);
            console.log("data.logs length:", data.logs?.length);

            // Ensure logs are reverse chronological
            const sortedLogs = Array.isArray(data.logs)
                ? data.logs.sort((a: any, b: any) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
                : [];
            setLogs(sortedLogs);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [user]);

    const filteredLogs = logs.filter((log) => {
        if (filter === 'All') return true;
        if (filter === 'Healthy') return !log.has_illness && !log.recovery_day;
        if (filter === 'Sick') return log.has_illness || log.recovery_day;
        return true;
    });

    const avgSleep = logs.length > 0
        ? (logs.reduce((sum, l) => sum + (l.sleep_hours || 0), 0) / logs.length).toFixed(1)
        : '0';

    const avgFeeds = logs.length > 0
        ? (logs.reduce((sum, l) => sum + (l.feeding_frequency || 0), 0) / logs.length).toFixed(1)
        : '0';

    return (
        <View style={[styles.container, { backgroundColor: '#F8F9FF' }]}>
            {/* ── PURPLE HEADER ────────────────────────────── */}
            <LinearGradient
                colors={['#5E5CE6', '#7B79FF']}
                style={[styles.headerGradient, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={{ color: '#FFF', fontSize: 24 }}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[Typography.title1, { color: '#FFF', fontWeight: '700' }]}>Growth History</Text>
                        <Text style={[Typography.caption1, { color: 'rgba(255,255,255,0.75)' }]}>Last 60 days</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={[Typography.footnote, { color: C.labelTertiary, marginTop: Spacing.sm }]}>Loading history...</Text>
                </View>
            ) : error ? (
                <View style={styles.centerContent}>
                    <Text style={[Typography.subheadline, { color: C.labelTertiary, marginBottom: Spacing.lg }]}>Could not load history</Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { borderColor: C.primary }]}
                        onPress={fetchHistory}
                    >
                        <Text style={[Typography.callout, { color: C.primary }]}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : logs.length === 0 ? (
                <View style={styles.centerContent}>
                    <Text style={{ fontSize: 64, marginBottom: Spacing.md }}>📋</Text>
                    <Text style={[Typography.title3, { color: C.labelTertiary, marginBottom: Spacing.xs }]}>No logs yet</Text>
                    <Text style={[Typography.subheadline, { color: C.labelTertiary, textAlign: 'center', marginBottom: Spacing.xl, paddingHorizontal: 32 }]}>
                        Start logging daily to see your history
                    </Text>
                    <TouchableOpacity
                        style={[styles.logTodayBtn, { backgroundColor: C.primary }]}
                        onPress={() => router.push('/(tabs)/daily-log' as any)}
                    >
                        <Text style={[Typography.callout, { color: '#FFF', fontWeight: '600' }]}>Log Today</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* ── SUMMARY ROW ───────────────────────────────── */}
                    <View style={styles.summaryRow}>
                        <View style={[styles.statCard, Shadows.sm, { backgroundColor: C.card }]}>
                            <Text style={[Typography.display3, { color: C.primary }]}>{logs.length}</Text>
                            <Text style={[Typography.caption1, { color: C.labelTertiary }]}>days logged</Text>
                        </View>
                        <View style={[styles.statCard, Shadows.sm, { backgroundColor: C.card }]}>
                            <Text style={[Typography.display3, { color: C.primary }]}>{avgSleep}</Text>
                            <Text style={[Typography.caption1, { color: C.labelTertiary }]}>hrs per night</Text>
                        </View>
                        <View style={[styles.statCard, Shadows.sm, { backgroundColor: C.card }]}>
                            <Text style={[Typography.display3, { color: C.primary }]}>{avgFeeds}</Text>
                            <Text style={[Typography.caption1, { color: C.labelTertiary }]}>feeds per day</Text>
                        </View>
                    </View>

                    {/* ── FILTER ROW ────────────────────────────────── */}
                    <View style={styles.filterRow}>
                        {(['All', 'Healthy', 'Sick'] as const).map(f => {
                            const isActive = filter === f;
                            return (
                                <TouchableOpacity
                                    key={f}
                                    style={[
                                        styles.filterPill,
                                        isActive
                                            ? { backgroundColor: C.primary, borderColor: C.primary }
                                            : { backgroundColor: C.cardSecondary, borderColor: C.border }
                                    ]}
                                    onPress={() => setFilter(f)}
                                >
                                    <Text
                                        style={[
                                            Typography.subheadline,
                                            { color: isActive ? '#FFF' : C.labelTertiary, fontWeight: isActive ? '600' : '400' }
                                        ]}
                                    >
                                        {f}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* ── TIMELINE LIST ─────────────────────────────── */}
                    {filteredLogs.map(log => {
                        let badgeBg: string = C.successSoft;
                        let badgeText: string = C.success;
                        let badgeLabel = '✓ Healthy';

                        if (log.recovery_day) {
                            badgeBg = C.warningSoft;
                            badgeText = C.warning;
                            badgeLabel = '↗ Recovery';
                        } else if (log.has_illness) {
                            badgeBg = C.dangerSoft;
                            badgeText = C.danger;
                            badgeLabel = '🤒 Sick';
                        }

                        const hasBottomRow = log.f_solid_meal > 0 || log.f_nutritious_snacks > 0 || log.illness_type;

                        const logDay = new Date(log.log_date + 'T00:00:00');

                        return (
                            <View key={log.log_date} style={[styles.timelineRow, { marginBottom: 10 }]}>
                                {/* DATE COLUMN */}
                                <View style={[styles.dateCol, { backgroundColor: C.primarySoft }]}>
                                    <Text style={[Typography.caption2, { color: C.primary, fontWeight: '700' }]}>
                                        {logDay.toLocaleDateString('en-US', { month: 'short' })}
                                    </Text>
                                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#5E5CE6', lineHeight: 26 }}>
                                        {logDay.getDate()}
                                    </Text>
                                    <Text style={[Typography.caption2, { color: C.labelTertiary }]}>
                                        {logDay.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </Text>
                                </View>

                                {/* CONTENT */}
                                <View style={[styles.logContent, Shadows.sm, { backgroundColor: C.card }]}>
                                    {/* BADGE ROW */}
                                    <View style={[styles.logTopRow, { marginBottom: Spacing.md }]}>
                                        <View style={[styles.healthBadge, { backgroundColor: badgeBg }]}>
                                            <Text style={[Typography.caption1, { color: badgeText, fontWeight: '600' }]}>{badgeLabel}</Text>
                                        </View>
                                    </View>

                                    {/* STATS ROW */}
                                    <View style={styles.logStatsRow}>
                                        <View style={styles.logStatItem}>
                                            <Text style={{ fontSize: 18, marginBottom: 2 }}>😴</Text>
                                            <Text style={[Typography.subheadline, { color: C.primary, fontWeight: '600' }]}>{log.sleep_hours} hrs</Text>
                                        </View>
                                        <View style={styles.logStatItem}>
                                            <Text style={{ fontSize: 18, marginBottom: 2 }}>🍼</Text>
                                            <Text style={[Typography.subheadline, { color: C.label, fontWeight: '600' }]}>{log.f_breast_formula} feeds</Text>
                                            <Text style={[Typography.caption2, { color: C.labelTertiary, marginTop: 2, textTransform: 'capitalize' }]}>{log.feed_type || 'milk'}</Text>
                                        </View>
                                        <View style={styles.logStatItem}>
                                            <Text style={{ fontSize: 18, marginBottom: 2 }}>🔥</Text>
                                            <Text style={[Typography.subheadline, { color: C.label, fontWeight: '600' }]}>{log.daily_calorie_intake} kcal</Text>
                                        </View>
                                    </View>

                                    {/* BOTTOM PILLS */}
                                    {hasBottomRow && (
                                        <View style={[styles.logBottomRow, { borderTopColor: C.border }]}>
                                            {log.f_solid_meal > 0 && (
                                                <View style={[styles.bottomPill, { backgroundColor: C.cardTertiary }]}>
                                                    <Text style={[Typography.footnote, { color: C.labelSecondary }]}>🥣 {log.f_solid_meal} meals</Text>
                                                </View>
                                            )}
                                            {log.f_nutritious_snacks > 0 && (
                                                <View style={[styles.bottomPill, { backgroundColor: C.cardTertiary }]}>
                                                    <Text style={[Typography.footnote, { color: C.labelSecondary }]}>🍎 {log.f_nutritious_snacks} snacks</Text>
                                                </View>
                                            )}
                                            {log.illness_type && (
                                                <View style={[styles.bottomPill, { backgroundColor: C.dangerSoft }]}>
                                                    <Text style={[Typography.footnote, { color: C.danger, fontWeight: '500' }]}>{log.illness_type}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}

                    {filteredLogs.length === 0 && (
                        <Text style={[Typography.subheadline, { color: C.labelTertiary, textAlign: 'center', marginTop: 32 }]}>
                            No logs match this filter.
                        </Text>
                    )}

                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        paddingHorizontal: Spacing.screenPadding,
        paddingBottom: 16,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.screenPadding,
        marginBottom: Spacing.lg,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    retryBtn: {
        borderWidth: 1,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
    },
    logTodayBtn: {
        paddingHorizontal: Spacing.xxxl,
        paddingVertical: Spacing.md,
        borderRadius: Radius.full,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: Spacing.screenPadding,
        paddingBottom: Spacing.xxxl,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xl,
        gap: Spacing.sm,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
    },
    filterRow: {
        flexDirection: 'row',
        marginBottom: Spacing.lg,
        gap: Spacing.sm,
    },
    filterPill: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.full,
        borderWidth: 1,
    },
    logCard: {
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: 10,
    },
    timelineRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 10,
    },
    dateCol: {
        width: 54,
        borderRadius: Radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    logContent: {
        flex: 1,
        borderRadius: Radius.lg,
        padding: Spacing.md,
    },
    logTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    healthBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.full,
    },
    logStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    logStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    logBottomRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: Spacing.sm,
    },
    bottomPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 4,
        borderRadius: Radius.full,
    },
});

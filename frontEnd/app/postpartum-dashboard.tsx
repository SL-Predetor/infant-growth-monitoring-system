import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getPostpartumHistory, PostpartumHistoryItem } from '@/services/postpartumService';

type PainKey = 'perineal' | 'csection' | 'back_pelvic';

const PAIN_META: Record<PainKey, { label: string; icon: string; color: string }> = {
  perineal: { label: 'Perineal Discomfort', icon: '🌸', color: '#F06292' },
  csection: { label: 'C-Section Recovery', icon: '💕', color: '#9575CD' },
  back_pelvic: { label: 'Back & Pelvic Support', icon: '🌿', color: '#64B5F6' },
};

export default function PostpartumDashboard() {
  const [history, setHistory] = useState<PostpartumHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPostpartumHistory(100);
      const sorted = [...response].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aTime - bTime;
      });
      setHistory(sorted);
    } catch (e) {
      setError('Unable to load dashboard. Check backend and API URL.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const latest = useMemo(() => history[history.length - 1], [history]);

  const activePains = useMemo(() => {
    if (!latest?.predictions) return [] as Array<{ key: PainKey; score: number; risk: string }>;

    const keys: PainKey[] = ['perineal', 'csection', 'back_pelvic'];
    return keys
      .map((key) => {
        const entry = latest.predictions?.[key];
        const score = Number(entry?.score ?? 0);
        const risk = String(entry?.risk ?? 'LOW');
        return { key, score, risk };
      })
      .filter((item) => item.score > 0);
  }, [latest]);

  const overallPainTrend = useMemo(() => {
    const points = history
      .map((entry) => ({
        date: formatDate(entry.created_at),
        score: getOverallPainScore(entry),
      }))
      .filter((point) => point.score >= 0);

    if (points.length < 2) {
      return { points, status: 'Stable', delta: 0 };
    }

    const first = points[0].score;
    const last = points[points.length - 1].score;
    const delta = first === 0 ? 0 : ((last - first) / first) * 100;

    let status = 'Stable';
    if (delta <= -8) status = 'Improving';
    if (delta >= 8) status = 'Needs Attention';

    return { points, status, delta };
  }, [history]);

  const sleepFatiguePoints = useMemo(() => {
    return history
      .map((entry) => {
        const sleep = parseSleepHours(entry.input?.sleep_hours);
        const fatigue = Number(entry.input?.daytime_fatigue_score ?? 0);
        return {
          date: formatDate(entry.created_at),
          sleep,
          fatigue,
          backPelvicPain: Number(entry.predictions?.back_pelvic?.score ?? 0),
        };
      })
      .filter((point) => point.sleep !== null);
  }, [history]);

  const sleepInsight = useMemo(() => {
    if (sleepFatiguePoints.length < 3) {
      return 'Add a few more assessments to unlock personalized sleep-fatigue insight.';
    }

    const lowSleep = sleepFatiguePoints.filter((point) => (point.sleep ?? 0) < 5);
    const okSleep = sleepFatiguePoints.filter((point) => (point.sleep ?? 0) >= 5);

    if (lowSleep.length >= 2 && okSleep.length >= 2) {
      const lowAvgFatigue = average(lowSleep.map((point) => point.fatigue));
      const okAvgFatigue = average(okSleep.map((point) => point.fatigue));
      const fatigueRise = okAvgFatigue === 0 ? 0 : ((lowAvgFatigue - okAvgFatigue) / okAvgFatigue) * 100;

      return `On lower-sleep days (<5h), fatigue is ${Math.max(0, fatigueRise).toFixed(0)}% higher.`;
    }

    return 'Sleep and fatigue are being tracked. Keep logging to reveal stronger patterns.';
  }, [sleepFatiguePoints]);

  const recoverySupportScore = useMemo(() => {
    if (!latest?.input) return 0;
    return calculateRecoverySupportScore(latest.input);
  }, [latest]);

  const nutritionInsight = useMemo(() => {
    const points = history.map((entry) => ({
      adequateProtein: (entry.input?.protein_intake || '').toLowerCase() === 'daily',
      pain: getOverallPainScore(entry),
    }));

    const adequate = points.filter((p) => p.adequateProtein && p.pain >= 0).map((p) => p.pain);
    const low = points.filter((p) => !p.adequateProtein && p.pain >= 0).map((p) => p.pain);

    if (adequate.length >= 2 && low.length >= 2) {
      return {
        enoughData: true,
        adequateAvg: average(adequate),
        lowAvg: average(low),
      };
    }

    return { enoughData: false, adequateAvg: 0, lowAvg: 0 };
  }, [history]);

  const encouragement = useMemo(() => {
    if (!latest) return '🌸 Start your first assessment to view your personalized recovery dashboard.';

    const hasHighRisk = activePains.some((pain) => pain.risk.toUpperCase() === 'HIGH');
    const avgSleep = average(sleepFatiguePoints.map((point) => point.sleep ?? 0));

    if (hasHighRisk) {
      return '❤️ Your body needs extra care right now. Consider consulting your doctor if pain persists.';
    }
    if (avgSleep > 0 && avgSleep < 5) {
      return '😴 Improving sleep could significantly reduce fatigue and support pain recovery.';
    }
    if (overallPainTrend.status === 'Improving') {
      return '🌸 Your recovery is progressing well. Keep going, one day at a time.';
    }

    return '💜 You are doing important recovery work. Continue tracking to unlock stronger insights.';
  }, [latest, activePains, sleepFatiguePoints, overallPainTrend.status]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2B6CB0" />
        <Text style={styles.infoText}>Loading your recovery dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboard}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!latest) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>No assessments yet. Complete one postpartum assessment to begin.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboard}>
          <Text style={styles.retryText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#49289e" />
      </TouchableOpacity>
      <Text style={styles.title}>Your Recovery Journey 🌷</Text>
      <Text style={styles.subtitle}>{history.length} {history.length === 1 ? 'assessment' : 'assessments'} on record</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💜 Recovery Overview</Text>
        <Text style={styles.summaryText}>You're {latest.input?.weeks_since_delivery ?? '-'} weeks into your healing journey</Text>
        <Text style={styles.sectionLabel}>Areas We're Monitoring</Text>
        {activePains.length === 0 ? (
          <Text style={styles.infoText}>✨ Great news! No active discomfort right now. Keep caring for yourself.</Text>
        ) : (
          activePains.map((pain) => (
            <Text key={pain.key} style={styles.listText}>
              {PAIN_META[pain.key].icon} {PAIN_META[pain.key].label} — {pain.risk === 'HIGH' ? 'Needs attention' : pain.risk === 'MODERATE' ? 'Manageable' : 'Mild'}
            </Text>
          ))
        )}
        <View style={styles.trendBadge}>
          <Text style={styles.trendSummary}>
            {overallPainTrend.status === 'Improving' ? '📈 Recovery is progressing' : overallPainTrend.status === 'Needs Attention' ? '💗 Extra care needed' : '✨ Staying steady'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Current Comfort Levels</Text>
        {activePains.length === 0 ? (
          <Text style={styles.infoText}>🌸 You're feeling well today—wonderful progress!</Text>
        ) : (
          activePains.map((pain) => (
            <ScoreRow
              key={pain.key}
              label={`${PAIN_META[pain.key].icon} ${PAIN_META[pain.key].label}`}
              value={pain.score}
              color={PAIN_META[pain.key].color}
            />
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📈 Your Progress Timeline</Text>
        {activePains.length > 0 ? (
          activePains.map((pain) => {
            const firstScore = getPainScore(history[0], pain.key);
            const latestScore = getPainScore(latest, pain.key);
            const reduction = firstScore > 0 ? ((firstScore - latestScore) / firstScore) * 100 : 0;
            const improvedText = reduction > 0 ? `improved by ${reduction.toFixed(0)}% 💪` : 'being tracked carefully';
            return (
              <Text key={`trend-${pain.key}`} style={styles.progressText}>
                {PAIN_META[pain.key].icon} {PAIN_META[pain.key].label} has {improvedText}
              </Text>
            );
          })
        ) : (
          <Text style={styles.infoText}>Keep logging assessments to see your healing trends.</Text>
        )}

        {overallPainTrend.points.slice(-8).map((point, index) => (
          <TrendRow
            key={`${point.date}-${index}`}
            date={point.date}
            value={point.score}
            label="Overall"
            color="#9575CD"
          />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>😴 Sleep & Energy Insights</Text>
        {sleepFatiguePoints.slice(-8).map((point, index) => (
          <View key={`${point.date}-sf-${index}`} style={styles.sleepRow}>
            <Text style={styles.trendDate}>{point.date}</Text>
            <Text style={styles.sleepText}>💤 {point.sleep?.toFixed(1)}h</Text>
            <Text style={styles.fatigueText}>⚡ {point.fatigue.toFixed(0)}/10</Text>
          </View>
        ))}
        <View style={styles.insightBox}>
          <Text style={styles.insightText}>{sleepInsight}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌿 Lifestyle Support Score</Text>
        <Text style={styles.bigNumber}>{recoverySupportScore}</Text>
        <Text style={styles.scoreLabel}>out of 100</Text>
        <Text style={styles.infoText}>
          {(recoverySupportScore >= 75
            ? '💚 Excellent! You are giving your body what it needs to heal.'
            : recoverySupportScore >= 50
            ? '💛 Good foundation. Small improvements in nutrition and rest can boost recovery.'
            : '💙 Your body needs more support. Focus on sleep, hydration, and nourishing meals.')}
        </Text>
      </View>
{/*}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🍎 Nutrition Impact</Text>
        {nutritionInsight.enoughData ? (
          <View style={styles.nutritionBox}>
            <Text style={styles.nutritionText}>✅ With good protein: avg discomfort {nutritionInsight.adequateAvg.toFixed(1)}</Text>
            <Text style={styles.nutritionText}>⚠️ With low protein: avg discomfort {nutritionInsight.lowAvg.toFixed(1)}</Text>
            <Text style={styles.nutritionInsight}>Protein supports tissue healing and recovery.</Text>
          </View>
        ) : (
          <Text style={styles.infoText}>📝 Log a few more assessments to reveal your nutrition patterns.</Text>
        )}
      </View>
*/}
      <View style={[styles.card, styles.encouragementCard]}>
        <Text style={styles.encouragementTitle}>💬 A Message for You</Text>
        <Text style={styles.encouragement}>{encouragement}</Text>
      </View>
    </ScrollView>
  );
}

function ScoreRow({ label, value, color }: { label: string; value: number; color: string }) {
  const width = Math.max(4, Math.min(100, (value / 10) * 100));
  return (
    <View style={styles.rowBlock}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value.toFixed(2)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function TrendRow({
  date,
  value,
  label,
  color,
}: {
  date: string;
  value: number;
  label: string;
  color: string;
}) {
  const width = Math.max(4, Math.min(100, (value / 10) * 100));
  return (
    <View style={styles.trendGroup}>
      <View style={styles.rowHeader}>
        <Text style={styles.trendDate}>{date}</Text>
        <Text style={styles.rowValue}>{label}: {value.toFixed(2)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function getPainScore(entry: PostpartumHistoryItem, key: PainKey): number {
  return Number(entry.predictions?.[key]?.score ?? 0);
}

function getOverallPainScore(entry: PostpartumHistoryItem): number {
  const values = [
    Number(entry.predictions?.perineal?.score ?? 0),
    Number(entry.predictions?.csection?.score ?? 0),
    Number(entry.predictions?.back_pelvic?.score ?? 0),
  ];
  return Number((values.reduce((sum, v) => sum + v, 0) / 3).toFixed(2));
}

function parseSleepHours(value?: string): number | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();

  if (normalized.includes('<3')) return 2.5;
  if (normalized.includes('3-5')) return 4;
  if (normalized.includes('6-8')) return 7;
  if (normalized.includes('>8')) return 9;
  if (normalized.includes('1-2')) return 1.5;

  const numbers = normalized.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;
  if (numbers.length === 1) return Number(numbers[0]);

  return (Number(numbers[0]) + Number(numbers[1])) / 2;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateRecoverySupportScore(input?: PostpartumHistoryItem['input']): number {
  if (!input) return 0;

  const proteinMap: Record<string, number> = { daily: 25, sometimes: 15, rare: 5 };
  const ironMap: Record<string, number> = { daily: 25, occasionally: 15, never: 5 };
  const fluidMap: Record<string, number> = { '2-3l': 25, '1-2l': 15, '<1l': 5 };
  const activityMap: Record<string, number> = { '>30mins': 25, '15-30mins': 18, '<15mins': 10, none: 4 };

  const protein = proteinMap[(input.protein_intake || '').toLowerCase()] ?? 10;
  const iron = ironMap[(input.iron_intake || '').toLowerCase()] ?? 10;
  const fluid = fluidMap[(input.fluid_intake || '').toLowerCase()] ?? 10;
  const activity = activityMap[(input.physical_activity || '').toLowerCase()] ?? 10;

  return Math.max(0, Math.min(100, protein + iron + fluid + activity));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5FF',
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  backButton: {
    marginBottom: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    color: '#5E35B1',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#7E57C2',
    fontSize: 14,
    marginBottom: 18,
    fontWeight: '500',
  },
  summaryText: {
    color: '#512DA8',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
    lineHeight: 22,
  },
  sectionLabel: {
    color: '#7E57C2',
    fontWeight: '700',
    marginBottom: 10,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#5E35B1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#512DA8',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  bigNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#7E57C2',
    textAlign: 'center',
    marginVertical: 8,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#9575CD',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  rowBlock: {
    marginBottom: 14,
  },
  trendGroup: {
    marginBottom: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rowLabel: {
    color: '#512DA8',
    fontWeight: '600',
    fontSize: 14,
  },
  rowValue: {
    color: '#7E57C2',
    fontWeight: '700',
    fontSize: 14,
  },
  listText: {
    color: '#512DA8',
    marginBottom: 10,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 22,
  },
  progressText: {
    color: '#512DA8',
    marginBottom: 10,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 22,
  },
  trendBadge: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  trendSummary: {
    color: '#7E57C2',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  track: {
    width: '100%',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#F3E5F5',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 8,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E5F5',
  },
  trendDate: {
    color: '#512DA8',
    fontSize: 13,
    fontWeight: '500',
  },
  sleepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3E5F5',
    paddingVertical: 10,
  },
  sleepText: {
    color: '#64B5F6',
    fontWeight: '700',
    fontSize: 14,
  },
  fatigueText: {
    color: '#F06292',
    fontWeight: '700',
    fontSize: 14,
  },
  insightBox: {
    backgroundColor: '#E8EAF6',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  insightText: {
    color: '#512DA8',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 20,
  },
  nutritionBox: {
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
    padding: 14,
  },
  nutritionText: {
    color: '#558B2F',
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  nutritionInsight: {
    color: '#689F38',
    fontWeight: '500',
    fontSize: 13,
    marginTop: 6,
    fontStyle: 'italic',
  },
  encouragementCard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFB74D',
    borderWidth: 2,
  },
  encouragementTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 10,
  },
  encouragement: {
    color: '#E65100',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  trendCount: {
    fontWeight: '700',
    color: '#7E57C2',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F5FF',
    padding: 20,
  },
  infoText: {
    color: '#7E57C2',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#7E57C2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#5E35B1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

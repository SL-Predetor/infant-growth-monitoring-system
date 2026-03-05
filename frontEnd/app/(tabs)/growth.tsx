import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, {
  Polyline,
  Line,
  Text as SvgText,
  Circle,
} from 'react-native-svg';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// ── Theme ─────────────────────────────────────────────
const T = {
  bg: '#1a1a2e',
  cardBg: '#16213e',
  cardBorder: '#2a2d4e',
  primary: '#6C63FF',
  primaryOp: 'rgba(108, 99, 255, 0.12)',
  secondary: '#FF8FB1',
  white: '#FFFFFF',
  muted: '#8892a4',
  label: '#a8b2c1',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#FF5252',
};

const screenWidth = Dimensions.get('window').width;

// ── WAZ Calculation ──────────────────────────────────
const calculateWAZ = (
  weightKg: number,
  ageDays: number,
  gender: string,
): number => {
  const maleRef: Record<number, number> = {
    0: 3.346, 30: 4.4, 60: 5.6, 90: 6.4, 120: 7.0,
    150: 7.5, 180: 7.9, 210: 8.3, 240: 8.6, 270: 9.2,
    300: 9.5, 330: 9.8, 365: 10.2,
  };
  const femaleRef: Record<number, number> = {
    0: 3.232, 30: 4.2, 60: 5.1, 90: 5.8, 120: 6.4,
    150: 6.9, 180: 7.3, 210: 7.7, 240: 8.1, 270: 8.6,
    300: 8.9, 330: 9.2, 365: 9.5,
  };
  const ref = gender.toLowerCase() === 'male' ? maleRef : femaleRef;
  const keys = Object.keys(ref).map(Number).sort((a, b) => a - b);
  let closestKey = keys[0];
  for (const k of keys) {
    if (k <= ageDays) closestKey = k;
  }
  const median = ref[closestKey];
  const sd = median * 0.13;
  return parseFloat(((weightKg - median) / sd).toFixed(2));
};

// ── Helpers ──────────────────────────────────────────
const wazColor = (waz: number | null) => {
  if (waz === null) return T.cardBorder;
  if (waz > -1) return T.success;
  if (waz > -2) return T.warning;
  return T.error;
};

const wazLabel = (waz: number | null) => {
  if (waz === null) return '';
  if (waz > -1) return 'Healthy Growth ✓';
  if (waz > -2) return 'Monitor Closely';
  return 'At Risk — See Doctor';
};

const formatAge = (days: number) => {
  if (days < 30) return `${days} days old`;
  if (days < 365) return `${Math.round(days / 30)} months old`;
  return `${(days / 365).toFixed(1)} years old`;
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function GrowthScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────
  const [infant, setInfant] = useState<any>(null);
  const [ageDays, setAgeDays] = useState(0);
  const [logCount, setLogCount] = useState(0);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);
  const [wazScore, setWazScore] = useState<number | null>(null);
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [personalBaseline, setPersonalBaseline] = useState<number | null>(null);
  const [baselineAlert, setBaselineAlert] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // ── Data fetch ─────────────────────────────────────
  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user) {
        setPageLoading(false);
        return;
      }
      try {
        // 1. Get infant
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

        // 2. Age in days
        const dob = new Date(infantData.date_of_birth);
        const today = new Date();
        const ageInDays = Math.floor(
          (today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24),
        );
        setAgeDays(ageInDays);

        // 3. Log count
        const { count } = await supabase
          .from('daily_logs')
          .select('*', { count: 'exact', head: true })
          .eq('infant_id', infantData.id);
        setLogCount(count || 0);

        // 4. Last 30 measurements for chart
        const { data: measData } = await supabase
          .from('measurements')
          .select('measured_date, weight_g, height_cm')
          .eq('infant_id', infantData.id)
          .order('measured_date', { ascending: true })
          .limit(30);
        setMeasurements(measData || []);

        // 5. Latest measurement for WAZ display
        const latest =
          measData && measData.length > 0
            ? measData[measData.length - 1]
            : null;
        setLatestMeasurement(latest);

        // 6. Calculate WAZ from latest weight
        let currentWaz: number | null = null;
        if (latest?.weight_g) {
          currentWaz = calculateWAZ(
            parseFloat(latest.weight_g) / 1000,
            ageInDays,
            infantData.gender || 'male',
          );
          setWazScore(currentWaz);
        }

        // 7. Today's log
        const todayStr = today.toISOString().split('T')[0];
        const { data: todayLog } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('infant_id', infantData.id)
          .eq('log_date', todayStr)
          .maybeSingle();
        setHasLoggedToday(!!todayLog);

        // 8. Personal WAZ baseline
        if (measData && measData.length >= 2) {
          const baselineMeas = measData.slice(0, 7);

          const baselineWAZs = baselineMeas
            .filter((m: any) => m.weight_g)
            .map((m: any) => {
              const mDate = new Date(m.measured_date);
              const mAgeDays = Math.floor(
                (mDate.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24),
              );
              return calculateWAZ(
                parseFloat(m.weight_g) / 1000,
                mAgeDays,
                infantData.gender || 'male',
              );
            });

          if (baselineWAZs.length > 0) {
            const pBaseline =
              baselineWAZs.reduce((a: number, b: number) => a + b, 0) /
              baselineWAZs.length;
            setPersonalBaseline(pBaseline);

            if (currentWaz !== null) {
              setBaselineAlert(currentWaz < pBaseline - 0.5);
            }
          }
        }
      } catch (err: any) {
        console.error('Dashboard error:', err.message);
      } finally {
        setPageLoading(false);
      }
    };
    fetchDashboard();
  }, [user]);

  // ── Loading ────────────────────────────────────────
  if (pageLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={T.primary} />
        <Text style={[styles.mutedSmall, { marginTop: 12 }]}>Loading…</Text>
      </View>
    );
  }

  // ── Chart helpers ──────────────────────────────────
  const chartW = screenWidth - 64;
  const chartH = 160;
  const pad = { top: 10, bottom: 30, left: 45, right: 10 };

  const validMeas = measurements.filter((m) => m.weight_g);
  const weights = validMeas.map((m) => parseFloat(m.weight_g));
  const minW = weights.length > 0 ? Math.min(...weights) * 0.95 : 0;
  const maxW = weights.length > 0 ? Math.max(...weights) * 1.05 : 1;

  const xScale = (i: number) =>
    pad.left +
    (i / Math.max(validMeas.length - 1, 1)) *
    (chartW - pad.left - pad.right);

  const yScale = (w: number) =>
    chartH -
    pad.bottom -
    ((w - minW) / (maxW - minW || 1)) * (chartH - pad.top - pad.bottom);

  const points = validMeas
    .map((m, i) => `${xScale(i)},${yScale(parseFloat(m.weight_g))}`)
    .join(' ');

  // WHO median reference line
  const gender = infant?.gender || 'male';
  const ref = gender.toLowerCase() === 'male'
    ? { 0: 3346, 30: 4400, 60: 5600, 90: 6400, 120: 7000, 150: 7500, 180: 7900, 210: 8300, 240: 8600, 270: 9200, 300: 9500, 330: 9800, 365: 10200 }
    : { 0: 3232, 30: 4200, 60: 5100, 90: 5800, 120: 6400, 150: 6900, 180: 7300, 210: 7700, 240: 8100, 270: 8600, 300: 8900, 330: 9200, 365: 9500 };

  // Get WHO median points that fall within our chart weight range
  const dob = infant ? new Date(infant.date_of_birth) : new Date();
  const refPoints: string[] = [];
  if (validMeas.length >= 2) {
    validMeas.forEach((m, i) => {
      const mDate = new Date(m.measured_date);
      const mAge = Math.floor(
        (mDate.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24),
      );
      const refKeys = Object.keys(ref).map(Number).sort((a, b) => a - b);
      let closest = refKeys[0];
      for (const k of refKeys) {
        if (k <= mAge) closest = k;
      }
      const medianG = (ref as Record<number, number>)[closest];
      if (medianG >= minW && medianG <= maxW) {
        refPoints.push(`${xScale(i)},${yScale(medianG)}`);
      }
    });
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
          <View>
            <Text style={styles.headerName}>
              {infant?.name || 'Baby'}
            </Text>
            <Text style={styles.headerAge}>{formatAge(ageDays)}</Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              router.push('/(tabs)/edit-profile' as any)
            }
            style={styles.settingsBtn}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* ── TODAY'S LOG STATUS ─────────────────── */}
        {!hasLoggedToday ? (
          <View style={styles.logBannerWarn}>
            <View style={styles.logBannerRow}>
              <Text style={styles.logBannerText}>
                📋 Log today's feeding and sleep
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push('/(tabs)/daily-log' as any)
                }
              >
                <Text style={styles.logBannerLink}>Log Now →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.logBannerOk}>
            <Text style={styles.logBannerOkText}>
              ✅ Today's log complete
            </Text>
            <Text style={styles.mutedSmall}>
              Come back tomorrow to log again
            </Text>
          </View>
        )}

        {/* ── AI READINESS ──────────────────────── */}
        <View style={styles.card}>
          {logCount < 7 ? (
            <>
              <View style={styles.aiRow}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>🤖</Text>
                <Text style={styles.cardText}>
                  AI needs {7 - logCount} more day
                  {7 - logCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(logCount / 7) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.mutedSmall}>
                Log daily to activate growth predictions
              </Text>
            </>
          ) : (
            <View style={styles.aiRow}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>🤖</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI Active ✓</Text>
              </View>
              <Text style={[styles.cardText, { marginLeft: 8 }]}>
                Growth predictions running
              </Text>
            </View>
          )}
        </View>

        {/* ── WAZ SCORE ─────────────────────────── */}
        <View
          style={[
            styles.card,
            styles.accentCard,
            { borderLeftColor: wazColor(wazScore) },
          ]}
        >
          <Text style={styles.cardTitle}>⚖️ Growth Status</Text>

          {wazScore !== null ? (
            <>
              <Text
                style={[styles.wazNumber, { color: wazColor(wazScore) }]}
              >
                {wazScore.toFixed(2)}
              </Text>
              <Text style={styles.wazLabel}>Weight-for-Age Z-Score</Text>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: wazColor(wazScore) },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {wazLabel(wazScore)}
                </Text>
              </View>

              {latestMeasurement && (
                <Text style={styles.mutedSmall}>
                  Last recorded:{' '}
                  {latestMeasurement.weight_g
                    ? `${parseFloat(latestMeasurement.weight_g).toLocaleString()}g`
                    : '—'}{' '}
                  on {formatDate(latestMeasurement.measured_date)}
                </Text>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📏</Text>
              <Text style={styles.emptyText}>No measurements yet</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() =>
                  router.push('/(tabs)/update-measurements' as any)
                }
              >
                <Text style={styles.emptyBtnText}>
                  Add First Measurement →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── PERSONAL BASELINE ─────────────────── */}
        {personalBaseline !== null && wazScore !== null && (
          <View
            style={[
              styles.card,
              styles.accentCard,
              {
                borderLeftColor: baselineAlert ? T.error : T.success,
              },
            ]}
          >
            <Text style={styles.cardTitle}>👤 Personal Baseline</Text>
            <Text style={styles.cardText}>
              Your baby's baseline WAZ:{' '}
              <Text style={{ fontWeight: '800', color: T.white }}>
                {personalBaseline.toFixed(2)}
              </Text>
            </Text>
            <Text style={[styles.cardText, { marginTop: 4 }]}>
              Current WAZ:{' '}
              <Text
                style={{
                  fontWeight: '800',
                  color: wazColor(wazScore),
                }}
              >
                {wazScore.toFixed(2)}
              </Text>
            </Text>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: baselineAlert ? T.error : T.success,
                  marginTop: 10,
                },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {baselineAlert ? '⚠️ Below Personal Baseline' : '✓ On Track'}
              </Text>
            </View>
            <Text style={[styles.mutedSmall, { marginTop: 6 }]}>
              {baselineAlert
                ? "WAZ has dropped more than 0.5 below your baby's personal growth baseline"
                : "Growth is consistent with your baby's personal pattern"}
            </Text>
          </View>
        )}

        {/* ── WEIGHT CHART ──────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 Weight Progress</Text>
          <Text style={styles.mutedSmall}>Last 30 measurements</Text>

          {validMeas.length >= 2 ? (
            <View style={styles.chartContainer}>
              <Svg width={chartW} height={chartH}>
                {/* Y-axis labels */}
                <SvgText
                  x={4}
                  y={pad.top + 10}
                  fontSize={10}
                  fill={T.muted}
                >
                  {Math.round(maxW)}g
                </SvgText>
                <SvgText
                  x={4}
                  y={chartH - pad.bottom + 4}
                  fontSize={10}
                  fill={T.muted}
                >
                  {Math.round(minW)}g
                </SvgText>

                {/* Grid lines */}
                <Line
                  x1={pad.left}
                  y1={pad.top}
                  x2={chartW - pad.right}
                  y2={pad.top}
                  stroke={T.cardBorder}
                  strokeWidth={0.5}
                />
                <Line
                  x1={pad.left}
                  y1={chartH - pad.bottom}
                  x2={chartW - pad.right}
                  y2={chartH - pad.bottom}
                  stroke={T.cardBorder}
                  strokeWidth={0.5}
                />
                <Line
                  x1={pad.left}
                  y1={(pad.top + (chartH - pad.bottom)) / 2}
                  x2={chartW - pad.right}
                  y2={(pad.top + (chartH - pad.bottom)) / 2}
                  stroke={T.cardBorder}
                  strokeWidth={0.5}
                  strokeDasharray="4,4"
                />

                {/* WHO median reference line */}
                {refPoints.length >= 2 && (
                  <Polyline
                    points={refPoints.join(' ')}
                    fill="none"
                    stroke={T.primary}
                    strokeWidth={1.5}
                    strokeDasharray="6,4"
                    opacity={0.5}
                  />
                )}

                {/* Actual weight line */}
                <Polyline
                  points={points}
                  fill="none"
                  stroke={T.secondary}
                  strokeWidth={2.5}
                />

                {/* Last data point */}
                <Circle
                  cx={xScale(validMeas.length - 1)}
                  cy={yScale(
                    parseFloat(validMeas[validMeas.length - 1].weight_g),
                  )}
                  r={4}
                  fill={T.secondary}
                />
                <SvgText
                  x={xScale(validMeas.length - 1)}
                  y={
                    yScale(
                      parseFloat(
                        validMeas[validMeas.length - 1].weight_g,
                      ),
                    ) - 10
                  }
                  fontSize={10}
                  fill={T.white}
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {parseFloat(
                    validMeas[validMeas.length - 1].weight_g,
                  ).toLocaleString()}
                  g
                </SvgText>

                {/* X-axis date labels — first and last */}
                <SvgText
                  x={pad.left}
                  y={chartH - 6}
                  fontSize={9}
                  fill={T.muted}
                >
                  {formatDate(validMeas[0].measured_date)}
                </SvgText>
                <SvgText
                  x={chartW - pad.right}
                  y={chartH - 6}
                  fontSize={9}
                  fill={T.muted}
                  textAnchor="end"
                >
                  {formatDate(
                    validMeas[validMeas.length - 1].measured_date,
                  )}
                </SvgText>
              </Svg>

              {/* Legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendLine, { backgroundColor: T.secondary }]}
                  />
                  <Text style={styles.mutedSmall}>Actual</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendLine,
                      {
                        backgroundColor: T.primary,
                        opacity: 0.5,
                      },
                    ]}
                  />
                  <Text style={styles.mutedSmall}>WHO Median</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Add at least 2 measurements to see chart
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() =>
                  router.push('/(tabs)/update-measurements' as any)
                }
              >
                <Text style={styles.emptyBtnText}>📏 Add Measurement</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── QUICK STATS ───────────────────────── */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Latest Weight</Text>
            <Text style={styles.statValue}>
              {latestMeasurement?.weight_g
                ? `${parseFloat(latestMeasurement.weight_g).toLocaleString()} g`
                : '—'}
            </Text>
            <Text style={styles.mutedSmall}>
              {latestMeasurement
                ? formatDate(latestMeasurement.measured_date)
                : 'No data'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Latest Height</Text>
            <Text style={styles.statValue}>
              {latestMeasurement?.height_cm
                ? `${latestMeasurement.height_cm} cm`
                : '—'}
            </Text>
            <Text style={styles.mutedSmall}>
              {latestMeasurement
                ? formatDate(latestMeasurement.measured_date)
                : 'No data'}
            </Text>
          </View>
        </View>

        {/* ── QUICK ACTIONS ─────────────────────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() =>
              router.push('/(tabs)/daily-log' as any)
            }
          >
            <Text style={styles.actionBtnPrimaryText}>📋 Log Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={() =>
              router.push('/(tabs)/update-measurements' as any)
            }
          >
            <Text style={styles.actionBtnOutlineText}>
              📏 Update Weight
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerName: {
    fontSize: 24,
    fontWeight: '800',
    color: T.white,
  },
  headerAge: {
    fontSize: 14,
    color: T.muted,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 22,
  },

  /* Log banners */
  logBannerWarn: {
    backgroundColor: 'rgba(255,152,0,0.12)',
    borderWidth: 1,
    borderColor: T.warning,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  logBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logBannerText: {
    color: T.warning,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  logBannerLink: {
    color: T.warning,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  logBannerOk: {
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderWidth: 1,
    borderColor: T.success,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  logBannerOkText: {
    color: T.success,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Cards */
  card: {
    backgroundColor: T.cardBg,
    borderWidth: 1,
    borderColor: T.cardBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  accentCard: {
    borderLeftWidth: 4,
  },
  cardTitle: {
    color: T.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardText: {
    color: T.label,
    fontSize: 14,
  },

  /* AI readiness */
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBg: {
    height: 6,
    backgroundColor: T.cardBorder,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: T.primary,
    borderRadius: 3,
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

  /* WAZ */
  wazNumber: {
    fontSize: 52,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  wazLabel: {
    color: T.muted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: T.white,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    color: T.muted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyBtn: {
    backgroundColor: T.primaryOp,
    borderWidth: 1,
    borderColor: T.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnText: {
    color: T.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Chart */
  chartContainer: {
    marginTop: 14,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 16,
    height: 3,
    borderRadius: 2,
  },

  /* Stats */
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: T.cardBg,
    borderWidth: 1,
    borderColor: T.cardBorder,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statLabel: {
    color: T.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    color: T.white,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },

  /* Quick actions */
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  actionBtnPrimary: {
    flex: 1,
    height: 50,
    backgroundColor: T.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    color: T.white,
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtnOutline: {
    flex: 1,
    height: 50,
    backgroundColor: T.cardBg,
    borderWidth: 1.5,
    borderColor: T.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnOutlineText: {
    color: T.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Shared */
  mutedSmall: {
    color: T.muted,
    fontSize: 12,
  },
});

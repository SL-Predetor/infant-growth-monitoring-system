/**
 * Home — TinySteps Adaptive Dashboard
 *
 * UX DESIGN PRINCIPLE: Context-Adaptive UI
 * The home screen changes based on who the user is and what they've done today.
 *
 * Scenario A — Baby tracking only:
 *   Hero = baby growth card (full size)  ·  Log status  ·  Quick actions
 *
 * Scenario B — Mom recovery only:
 *   Hero = mom's wellness card  ·  Quick actions (recovery-focused)
 *
 * Scenario C — Both baby + mom:
 *   Hero = baby growth  ·  Compact mom card  ·  Log status  ·  Quick actions
 *
 * Scenario D — No data yet:
 *   Hero = warm welcome + setup prompts
 *
 * Event-driven elements:
 *   hasLoggedToday  → log card urgency (amber CTA vs green confirmation)
 *   time of day     → greeting and nudge text
 *   data presence   → which sections appear
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  TrendingUp, CheckCircle2, Clock, Heart,
  ChevronRight, Plus,
} from 'lucide-react-native';
import { useAuth, Infant } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const C = Colors.light;
const API_URL = 'http://localhost:8000/api';

/* ─────────────────────────────────────────────────────────── helpers */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Up late?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Almost bedtime';
}

function getLogNudge(hasLogged: boolean): string {
  const h = new Date().getHours();
  if (hasLogged) return 'Today\'s log is all done ✓';
  if (h < 9)  return 'Log your baby\'s first feed of the day';
  if (h < 14) return 'How is your baby doing so far today?';
  if (h < 19) return 'Log afternoon feeding and nap time';
  return 'Log today before you sleep — takes 2 min';
}

function getFirstName(fullName?: string | null, email?: string | null): string {
  if (fullName) return fullName.trim().split(' ')[0];
  if (email)    return email.split('@')[0];
  return 'there';
}

function getBabyAge(dob?: string | null): string {
  if (!dob) return '';
  const birth = new Date(dob);
  const now   = new Date();
  const days   = Math.floor((now.getTime() - birth.getTime()) / 86400000);
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 1)  return `${days} day${days !== 1 ? 's' : ''} old`;
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} old`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y} yr ${m} mo old` : `${y} year old`;
}

function getInitial(name?: string | null): string {
  return (name || 'B').trim()[0].toUpperCase();
}

/* ── WAZ → friendly status ── */
function getHealthStatus(waz: number | null) {
  if (waz === null) return {
    label: 'No measurements yet',
    sub: 'Tap "Update Measurements" to add your first reading',
    color: C.labelTertiary, soft: C.cardSecondary, emoji: '📏',
  };
  if (waz > -1) return {
    label: 'Growing Well',
    sub: 'Weight is healthy for your baby\'s age',
    color: C.success, soft: C.successSoft, emoji: '🌱',
  };
  if (waz > -2) return {
    label: 'Keep an Eye On It',
    sub: 'Slightly below average — worth a check-up',
    color: C.warning, soft: C.warningSoft, emoji: '⚠️',
  };
  return {
    label: 'Needs Attention',
    sub: 'Please speak to your doctor soon',
    color: C.danger, soft: C.dangerSoft, emoji: '❗',
  };
}

/* ── Mini weight trend chart ── */
function MiniWeightChart({ data, color }: { data: { weight_g: number }[]; color: string }) {
  const [w, setW] = useState(0);
  if (data.length < 2) return null;
  const vals  = data.map(d => d.weight_g);
  const minV  = Math.min(...vals);
  const range = (Math.max(...vals) - minV) || 1;
  const H     = 40;
  const pts   = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: H - ((d.weight_g - minV) / range) * H,
  }));

  return (
    <View style={{ height: H + 8, flex: 1 }} onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w > 0 && pts.map((p1, i) => {
        if (i === pts.length - 1) return null;
        const p2  = pts[i + 1];
        const x1  = (p1.x / 100) * w, y1 = p1.y + 4;
        const x2  = (p2.x / 100) * w, y2 = p2.y + 4;
        const dx  = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{
            position: 'absolute',
            left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - 1.5,
            width: len, height: 3, backgroundColor: color,
            opacity: 0.65, borderRadius: 2,
            transform: [{ rotate: `${ang}deg` }],
          }} />
        );
      })}
      {/* Latest point dot */}
      {pts.length > 0 && (() => {
        const last = pts[pts.length - 1];
        return (
          <View style={{
            position: 'absolute',
            left: (last.x / 100) * w - 5, top: last.y + 4 - 5,
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: color, borderWidth: 2, borderColor: '#FFF',
          }} />
        );
      })()}
    </View>
  );
}

/* ─────────────────────────────────────────────────────── main screen */

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [loading,         setLoading]         = useState(true);
  const [infant,          setInfant]          = useState<Infant | null>(null);
  const [wazScore,        setWazScore]        = useState<number | null>(null);
  const [measurements,    setMeasurements]    = useState<any[]>([]);
  const [hasLoggedToday,  setHasLoggedToday]  = useState(false);
  const [prediction,      setPrediction]      = useState<any>(null);
  const [postpartumData,  setPostpartumData]  = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      try {
        /* Baby */
        const { data: inf } = await supabase
          .from('infants').select('*').eq('parent_id', user.id).maybeSingle();
        if (inf) {
          setInfant(inf as Infant);
          try {
            const res = await fetch(`${API_URL}/growth/dashboard/${inf.id}`);
            if (res.ok) {
              const d = await res.json();
              setWazScore(d.current_waz ?? null);
              setMeasurements(d.chart_data ?? []);
              setPrediction(d.prediction ?? null);
            }
          } catch { /* backend offline */ }
          const { data: log } = await supabase
            .from('daily_logs').select('id')
            .eq('infant_id', inf.id)
            .eq('log_date', new Date().toISOString().split('T')[0])
            .maybeSingle();
          setHasLoggedToday(!!log);
        }
        /* Mom */
        const { data: pp } = await supabase
          .from('postpartum_logs')
          .select('weeks_since_delivery, pain_score, sleep_hours, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1).maybeSingle();
        if (pp) setPostpartumData(pp);
      } catch (e) { console.log(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  /* Derived values */
  const firstName   = getFirstName(profile?.full_name, user?.email);
  const babyAge     = getBabyAge(infant?.date_of_birth ?? null);
  const latestMeas  = measurements.length > 0 ? measurements[measurements.length - 1] : null;
  const chartData   = measurements.slice(-7);
  const health      = useMemo(() => getHealthStatus(wazScore), [wazScore]);

  /* ── Scenario detection ── */
  const hasBaby = !!infant;
  const hasMom  = !!postpartumData;

  /* Loading */
  if (loading) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <View style={st.loader}><ActivityIndicator size="large" color={C.primary} /></View>
      </SafeAreaView>
    );
  }

  /* ── SCENARIO D — No data at all ── */
  if (!hasBaby && !hasMom) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          <HeaderRow name={firstName} initial={getInitial(profile?.full_name ?? user?.email)} onProfile={() => router.push('/(tabs)/Profile' as any)} />

          <Animated.View entering={FadeInDown.delay(100).springify()} style={st.welcomeCard}>
            <Text style={st.welcomeEmoji}>👶</Text>
            <Text style={st.welcomeTitle}>Welcome to TinySteps</Text>
            <Text style={st.welcomeSub}>
              Let's set up your profile so we can start tracking your baby's growth and wellbeing.
            </Text>
            <Pressable style={st.primaryBtn} onPress={() => router.push('/(tabs)/update-measurements' as any)}>
              <Plus size={16} color="#FFF" strokeWidth={2.5} />
              <Text style={st.primaryBtnText}>Add your baby's first measurements</Text>
            </Pressable>
            <Pressable style={[st.secondaryBtn, { marginTop: 10 }]}
              onPress={() => router.push('/moms-recovery' as any)}>
              <Heart size={15} color={C.accent} strokeWidth={2} />
              <Text style={st.secondaryBtnText}>Start mom's recovery tracker</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── SCENARIO B — Mom only ── */
  if (!hasBaby && hasMom) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
          <HeaderRow name={firstName} initial={getInitial(profile?.full_name ?? user?.email)} onProfile={() => router.push('/(tabs)/Profile' as any)} />

          <Animated.View entering={FadeInDown.delay(80).springify().damping(14)}>
            {/* Mom hero */}
            <View style={st.card}>
              <View style={st.heroTop}>
                <View style={[st.avatar, { backgroundColor: C.accent }]}>
                  <Heart size={22} color="#FFF" strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.babyName}>Mom's Recovery</Text>
                  <Text style={st.babyAge}>Week {postpartumData.weeks_since_delivery ?? '?'} postpartum</Text>
                </View>
                <View style={[st.statusBadge, { backgroundColor: C.accentSoft }]}>
                  <Text style={[st.statusLabel, { color: C.accent }]}>Active</Text>
                </View>
              </View>

              <View style={st.metricsRow}>
                {postpartumData.sleep_hours != null && (
                  <View style={st.metric}>
                    <Text style={st.metricValue}>{postpartumData.sleep_hours}h</Text>
                    <Text style={st.metricLabel}>Last sleep</Text>
                  </View>
                )}
                {postpartumData.pain_score != null && (
                  <>
                    <View style={st.metricDivider} />
                    <View style={st.metric}>
                      <Text style={[st.metricValue, { color: postpartumData.pain_score > 5 ? C.danger : C.success }]}>
                        {postpartumData.pain_score}/10
                      </Text>
                      <Text style={st.metricLabel}>Pain level</Text>
                    </View>
                  </>
                )}
                <View style={st.metricDivider} />
                <View style={st.metric}>
                  <Text style={[st.metricValue, { color: C.primary }]}>Wk {postpartumData.weeks_since_delivery}</Text>
                  <Text style={st.metricLabel}>Postpartum</Text>
                </View>
              </View>

              <Pressable style={st.fullDashRow} onPress={() => router.push('/postpartum-dashboard' as any)}>
                <Text style={st.fullDashText}>View Recovery Dashboard</Text>
                <ChevronRight size={14} color={C.primary} strokeWidth={2.2} />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <Pressable style={st.primaryBtn} onPress={() => router.push('/moms-recovery' as any)}>
              <Text style={st.primaryBtnText}>Log today's recovery →</Text>
            </Pressable>
          </Animated.View>

          {/* Logging streak — motivates consistency */}
          <Animated.View entering={FadeInDown.delay(240).springify().damping(14)}>
            <View style={st.streakCard}>
              <View>
                <Text style={st.streakNum}>5</Text>
                <Text style={st.streakLbl}>day streak 🔥</Text>
              </View>
              <Text style={st.streakDesc}>
                You've logged 5 days in a row. Keep it up — consistent tracking helps your doctor give you better advice.
              </Text>
            </View>
          </Animated.View>

          {/* Weekly tips based on postpartum week */}
          <Animated.View entering={FadeInDown.delay(300).springify().damping(14)}>
            <PostpartumTips week={postpartumData.weeks_since_delivery ?? 6} />
          </Animated.View>

          {/* Add baby CTA */}
          <Animated.View entering={FadeInDown.delay(360).springify()}>
            <Pressable style={st.addCard} onPress={() => router.push('/(tabs)/update-measurements' as any)}>
              <View style={[st.addIcon, { backgroundColor: C.primarySoft }]}>
                <Plus size={18} color={C.primary} strokeWidth={2.5} />
              </View>
              <Text style={st.addText}>Add your baby's growth tracking</Text>
              <ChevronRight size={15} color={C.primary} strokeWidth={2} />
            </Pressable>
          </Animated.View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── SCENARIO A & C — Baby tracking (+ optional mom) ── */
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <HeaderRow name={firstName} initial={getInitial(profile?.full_name ?? user?.email)} onProfile={() => router.push('/(tabs)/Profile' as any)} />

        {/* ── BABY HERO CARD ── */}
        <Animated.View entering={FadeInDown.delay(80).springify().damping(14)}>
          <View style={st.card}>
            {/* Identity row */}
            <View style={st.heroTop}>
              <View style={st.avatar}>
                <Text style={st.avatarText}>{getInitial(infant?.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.babyName}>{infant?.name ?? 'Your Baby'}</Text>
                {babyAge ? <Text style={st.babyAge}>{babyAge}</Text> : null}
              </View>
              <View style={[st.statusBadge, { backgroundColor: health.soft }]}>
                <Text style={st.statusEmoji}>{health.emoji}</Text>
                <Text style={[st.statusLabel, { color: health.color }]}>{health.label}</Text>
              </View>
            </View>

            {/* Status description — the most human-readable line */}
            <Text style={[st.statusSub, { color: health.color }]}>{health.sub}</Text>

            {/* Metrics: weight · height · growth score */}
            <View style={st.metricsRow}>
              <View style={st.metric}>
                <Text style={st.metricValue}>
                  {latestMeas ? `${(latestMeas.weight_g / 1000).toFixed(2)}` : '--'}
                </Text>
                <Text style={st.metricLabel}>kg · Weight</Text>
              </View>
              <View style={st.metricDivider} />
              <View style={st.metric}>
                <Text style={st.metricValue}>
                  {latestMeas ? `${latestMeas.height_cm}` : '--'}
                </Text>
                <Text style={st.metricLabel}>cm · Height</Text>
              </View>
              {wazScore !== null && (
                <>
                  <View style={st.metricDivider} />
                  <View style={st.metric}>
                    <Text style={[st.metricValue, { color: health.color }]}>
                      {wazScore.toFixed(1)}
                    </Text>
                    <Text style={st.metricLabel}>Growth Score</Text>
                  </View>
                </>
              )}
            </View>

            {/* 7-day weight trend */}
            {chartData.length >= 2 && (
              <View style={{ marginBottom: Spacing.md }}>
                <Text style={st.chartLabel}>Weight this week →</Text>
                <MiniWeightChart data={chartData} color={health.color} />
              </View>
            )}

            {/* AI next-week prediction */}
            {prediction && (
              <View style={st.predRow}>
                <TrendingUp size={13} color={C.success} strokeWidth={2.2} />
                <Text style={st.predText}>
                  Expected next week:{' '}
                  <Text style={{ color: C.success, fontWeight: '700' }}>
                    +{Math.abs(prediction.predicted_weight_change_g ?? 0).toFixed(0)}g
                  </Text>
                  {prediction.predicted_height_change_cm != null && (
                    <Text style={{ color: C.primary, fontWeight: '700' }}>
                      {' '}· +{prediction.predicted_height_change_cm.toFixed(1)}cm
                    </Text>
                  )}
                </Text>
              </View>
            )}

            <Pressable style={st.fullDashRow} onPress={() => router.push('/(tabs)/growth')}>
              <Text style={st.fullDashText}>Full Growth Dashboard</Text>
              <ChevronRight size={14} color={C.primary} strokeWidth={2.2} />
            </Pressable>
          </View>
        </Animated.View>

        {/* ── DAILY LOG STATUS (event-driven — urgent or done) ── */}
        <Animated.View entering={FadeInDown.delay(160).springify().damping(14)}>
          <Pressable
            style={[
              st.logCard,
              { borderColor: hasLoggedToday ? C.success : C.warning },
            ]}
            onPress={() => router.push('/(tabs)/daily-log')}
          >
            <View style={[st.logIconWrap, {
              backgroundColor: hasLoggedToday ? C.successSoft : C.warningSoft,
            }]}>
              {hasLoggedToday
                ? <CheckCircle2 size={20} color={C.success} strokeWidth={2} />
                : <Clock size={20} color={C.warning} strokeWidth={2} />
              }
            </View>
            <View style={{ flex: 1 }}>
              {/* Context-aware nudge text changes with time of day */}
              <Text style={[st.logTitle, { color: hasLoggedToday ? C.success : C.warning }]}>
                {getLogNudge(hasLoggedToday)}
              </Text>
              <Text style={st.logSub}>
                {hasLoggedToday ? 'Tap to review or add notes' : 'Feeding · Sleep · Mood · Notes'}
              </Text>
            </View>
            <ChevronRight size={16}
              color={hasLoggedToday ? C.success : C.warning} strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* ── SCENARIO C: MOM'S COMPACT CARD (only if she has data) ── */}
        {hasMom && (
          <Animated.View entering={FadeInDown.delay(240).springify().damping(14)}>
            <View style={st.sectionRow}>
              <Text style={st.sectionTitle}>Mom's Wellbeing</Text>
              <Pressable style={st.seeAll}
                onPress={() => router.push('/postpartum-dashboard' as any)}>
                <Text style={st.seeAllText}>Details</Text>
                <ChevronRight size={12} color={C.primary} strokeWidth={2.2} />
              </Pressable>
            </View>
            <Pressable style={st.motherCard}
              onPress={() => router.push('/moms-recovery' as any)}>
              <View style={[st.motherIcon, { backgroundColor: C.accentSoft }]}>
                <Heart size={20} color={C.accent} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.motherTitle}>
                  Week {postpartumData.weeks_since_delivery ?? '?'} postpartum
                </Text>
                <Text style={st.motherSub}>
                  {[
                    postpartumData.sleep_hours   != null && `😴 ${postpartumData.sleep_hours}h sleep`,
                    postpartumData.pain_score    != null && `Pain: ${postpartumData.pain_score}/10`,
                  ].filter(Boolean).join('  ·  ')}
                </Text>
              </View>
              <View style={st.chip}>
                <Text style={st.chipText}>Update</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* SCENARIO A: Mom CTA if no mom data and baby exists */}
        {!hasMom && (
          <Animated.View entering={FadeInDown.delay(240).springify().damping(14)}>
            <Pressable style={st.addCard}
              onPress={() => router.push('/moms-recovery' as any)}>
              <View style={[st.addIcon, { backgroundColor: C.accentSoft }]}>
                <Heart size={18} color={C.accent} strokeWidth={2} />
              </View>
              <Text style={[st.addText, { color: C.accent }]}>
                Track mom's postpartum recovery
              </Text>
              <ChevronRight size={15} color={C.accent} strokeWidth={2} />
            </Pressable>
          </Animated.View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Shared sub-components ── */

/* ── Contextual postpartum tips by week ── */
const TIPS: Record<string, string[]> = {
  early:  ['Rest as much as you can — sleep when baby sleeps.', 'Drink plenty of water, especially if breastfeeding.', 'Accept help from family and friends.'],
  week4:  ['Light walks outside are great for mood and healing.', 'Pelvic floor exercises can begin gently now.', 'Watch for signs of postpartum depression — mood, sleep, appetite.'],
  week6:  ['Your 6-week check-up is due — book if you haven\'t yet.', 'Light exercise is usually cleared around now by your doctor.', 'Mood swings are still normal. Talk to someone you trust if you feel low.'],
  week8:  ['Energy levels should be improving — take it slow.', 'Nutrition matters — iron-rich foods help recovery.', 'It\'s OK to not feel fully "back to normal" yet.'],
  week12: ['Most physical healing is complete, but emotional recovery takes longer.', 'If returning to work, plan for feeding and childcare now.', 'Your body has done something amazing — be kind to yourself.'],
};

function getWeekTips(week: number): { title: string; tips: string[] } {
  if (week <= 2)  return { title: `Week ${week} — early days`, tips: TIPS.early };
  if (week <= 5)  return { title: `Week ${week} — settling in`, tips: TIPS.week4 };
  if (week <= 7)  return { title: `Week ${week} — what to expect`, tips: TIPS.week6 };
  if (week <= 11) return { title: `Week ${week} — building strength`, tips: TIPS.week8 };
  return { title: `Week ${week} — thriving`, tips: TIPS.week12 };
}

function PostpartumTips({ week }: { week: number }) {
  const { title, tips } = getWeekTips(week);
  return (
    <View style={st.tipsCard}>
      <Text style={st.tipsTitle}>💡 {title}</Text>
      {tips.map((tip, i) => (
        <View key={i} style={st.tipRow}>
          <View style={st.tipDot} />
          <Text style={st.tipText}>{tip}</Text>
        </View>
      ))}
    </View>
  );
}

function HeaderRow({ name, initial, onProfile }: {
  name: string;
  initial: string;
  onProfile: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(320).springify()} style={st.header}>
      <View>
        <Text style={st.greeting}>{getGreeting()},</Text>
        <Text style={st.name}>{name} 👋</Text>
      </View>
      {/* Profile avatar — only way to reach the Profile screen */}
      <Pressable
        style={st.profileBtn}
        onPress={onProfile}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={st.profileInitial}>{initial}</Text>
      </Pressable>
    </Animated.View>
  );
}


/* ─────────────────────────────────────────────────────── styles */

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: Spacing.screenPadding, paddingTop: 8, paddingBottom: 32 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.lg,
  },
  greeting: { fontSize: 12, color: C.labelTertiary, fontWeight: '500', letterSpacing: 0.3 },
  name:     { fontSize: 26, fontWeight: '700', color: C.label, letterSpacing: -0.4 },
  profileBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22, shadowRadius: 8, elevation: 4,
  },
  profileInitial: {
    fontSize: 16, fontWeight: '700', color: '#FFF',
  },

  /* Card shell */
  card: {
    backgroundColor: C.card, borderRadius: Radius.xxl,
    padding: Spacing.xl, marginBottom: Spacing.lg, ...Shadows.md,
  },

  /* Hero top */
  heroTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, marginBottom: Spacing.sm,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  babyName:   { fontSize: 18, fontWeight: '700', color: C.label, letterSpacing: -0.3 },
  babyAge:    { fontSize: 12, color: C.labelTertiary, marginTop: 1 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.full, flexShrink: 0,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  statusEmoji: { fontSize: 13 },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  statusSub:   { fontSize: 13, fontWeight: '500', marginBottom: Spacing.lg },

  /* Metrics row */
  metricsRow: {
    flexDirection: 'row', backgroundColor: C.cardSecondary,
    borderRadius: Radius.lg, paddingVertical: 16, marginBottom: Spacing.lg,
  },
  metric:       { flex: 1, alignItems: 'center' },
  metricValue:  { fontSize: 20, fontWeight: '700', color: C.label },
  metricLabel:  { fontSize: 11, color: C.labelTertiary, marginTop: 2, fontWeight: '500' },
  metricDivider:{ width: 1, backgroundColor: C.border, marginVertical: 4 },

  /* Chart */
  chartLabel: { fontSize: 11, color: C.labelTertiary, fontWeight: '600', marginBottom: 6, letterSpacing: 0.2 },

  /* Prediction */
  predRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.successSoft, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  predText: { fontSize: 13, color: C.label, flex: 1 },

  /* Full dashboard link */
  fullDashRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', gap: 3, paddingTop: Spacing.sm,
  },
  fullDashText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  /* Log card */
  logCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.lg,
    borderWidth: 1.5, ...Shadows.sm,
  },
  logIconWrap: {
    width: 40, height: 40, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  logTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  logSub:   { fontSize: 12, color: C.labelTertiary },

  /* Section label */
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.label, letterSpacing: -0.3 },
  seeAll:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  /* Mother card */
  motherCard: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, flexDirection: 'row',
    alignItems: 'center', gap: Spacing.md,
    marginBottom: Spacing.xl, ...Shadows.sm,
  },
  motherIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  motherTitle: { fontSize: 14, fontWeight: '700', color: C.label, marginBottom: 3 },
  motherSub:   { fontSize: 12, color: C.labelTertiary },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: C.accentSoft, borderRadius: Radius.full,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: C.accent },

  /* Add CTA card */
  addCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: C.cardSecondary, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl,
    borderWidth: 1, borderColor: C.border,
  },
  addIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  addText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.primary },

  /* Streak */
  streakCard: {
    backgroundColor: C.primarySoft, borderRadius: Radius.xl,
    padding: Spacing.lg, flexDirection: 'row',
    alignItems: 'center', gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  streakNum: { fontSize: 28, fontWeight: '800', color: C.primary },
  streakLbl: { fontSize: 11, color: C.primary, fontWeight: '600', opacity: 0.8, marginTop: 1 },
  streakDesc: { flex: 1, fontSize: 12, color: C.primary, lineHeight: 18, opacity: 0.85 },

  /* Tips */
  tipsCard: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: C.label, marginBottom: Spacing.md },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 7 },
  tipDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.accent, marginTop: 5, flexShrink: 0,
  },
  tipText: { flex: 1, fontSize: 12, color: C.labelTertiary, lineHeight: 18 },

  /* Welcome (no data) */
  welcomeCard: {
    backgroundColor: C.card, borderRadius: Radius.xxl,
    padding: Spacing.xxl, alignItems: 'center', ...Shadows.md,
  },
  welcomeEmoji: { fontSize: 52, marginBottom: Spacing.lg },
  welcomeTitle: { fontSize: 22, fontWeight: '700', color: C.label, marginBottom: 10, textAlign: 'center' },
  welcomeSub:   {
    fontSize: 15, color: C.labelTertiary, textAlign: 'center',
    lineHeight: 22, marginBottom: Spacing.xl,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: Radius.full,
    paddingVertical: 15, paddingHorizontal: 24, width: '100%',
    justifyContent: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 6,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accentSoft, borderRadius: Radius.full,
    paddingVertical: 14, paddingHorizontal: 24, width: '100%',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: C.accent, fontSize: 14, fontWeight: '600' },

});

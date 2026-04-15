import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Heart, BarChart2, ChevronRight,
  Sun, Moon, Salad, Activity,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const C = Colors.light;

const WELLNESS_TIPS = [
  { icon: Sun,      text: 'Rest whenever your baby sleeps — sleep is recovery medicine' },
  { icon: Salad,    text: 'Eat nourishing meals: protein, iron, and plenty of fluids' },
  { icon: Activity, text: 'Gentle movement, even short walks, support healing' },
  { icon: Moon,     text: 'Your emotional health matters just as much as physical healing' },
];

export default function WellnessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <Animated.View entering={FadeInUp.duration(350).springify()}>
          <LinearGradient
            colors={[C.accent, '#C55A5A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.heroIcon}>
              <Heart size={28} color="#FFFFFF" strokeWidth={1.8} fill="#FFFFFF" />
            </View>
            <Text style={s.heroTitle}>Mom's Recovery</Text>
            <Text style={s.heroSub}>
              You just brought life into the world.{'\n'}Your healing matters too. 💛
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ── Main Actions ── */}
        <Animated.View entering={FadeInDown.delay(80).springify().damping(14)}>
          <Text style={s.sectionLabel}>What would you like to do?</Text>

          <Pressable
            style={({ pressed }) => [s.primaryCard, pressed && { opacity: 0.9 }]}
            onPress={() => router.push('/moms-recovery' as any)}
          >
            <LinearGradient
              colors={[C.primary, '#4A8F98']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.primaryCardInner}
            >
              <View style={s.primaryCardText}>
                <Text style={s.primaryCardTitle}>Start a Check-in</Text>
                <Text style={s.primaryCardSub}>
                  Answer a few quick questions about your pain, sleep, and nutrition
                </Text>
              </View>
              <View style={s.primaryCardArrow}>
                <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify().damping(14)}>
          <Pressable
            style={({ pressed }) => [s.secondaryCard, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/postpartum-dashboard' as any)}
          >
            <View style={[s.secondaryCardIcon, { backgroundColor: C.primarySoft }]}>
              <BarChart2 size={22} color={C.primary} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.secondaryCardTitle}>View My Progress</Text>
              <Text style={s.secondaryCardSub}>Pain trends, sleep insights & lifestyle score</Text>
            </View>
            <ChevronRight size={16} color={C.labelTertiary} strokeWidth={1.8} />
          </Pressable>
        </Animated.View>

        {/* ── Wellness Tips ── */}
        <Animated.View entering={FadeInDown.delay(200).springify().damping(14)}>
          <Text style={s.sectionLabel}>Care Reminders</Text>
          <View style={s.tipsCard}>
            {WELLNESS_TIPS.map(({ icon: Icon, text }, i) => (
              <React.Fragment key={i}>
                <View style={s.tipRow}>
                  <View style={s.tipIconWrap}>
                    <Icon size={15} color={C.accent} strokeWidth={1.8} />
                  </View>
                  <Text style={s.tipText}>{text}</Text>
                </View>
                {i < WELLNESS_TIPS.length - 1 && <View style={s.tipDivider} />}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        {/* ── Disclaimer ── */}
        <Animated.View entering={FadeInDown.delay(260).springify().damping(14)}>
          <Text style={s.disclaimer}>
            TinySteps provides supportive guidance, not medical advice. Always consult your healthcare provider with any concerns about your recovery.
          </Text>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.background },
  content: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.lg, paddingBottom: 32 },

  /* Hero */
  hero: {
    borderRadius: Radius.xxl, padding: Spacing.xl,
    alignItems: 'center', marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  heroIcon: {
    width: 56, height: 56, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 8 },
  heroSub:   { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 21 },

  /* Section label */
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: C.labelTertiary,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: Spacing.md, marginLeft: 2,
  },

  /* Primary card */
  primaryCard: { marginBottom: Spacing.md, borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.md },
  primaryCardInner: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.xl, gap: Spacing.md,
  },
  primaryCardText: { flex: 1 },
  primaryCardTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3, marginBottom: 4 },
  primaryCardSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 19 },
  primaryCardArrow: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Secondary card */
  secondaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  secondaryCardIcon: {
    width: 48, height: 48, borderRadius: Radius.md,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  secondaryCardTitle: { fontSize: 15, fontWeight: '700', color: C.label, marginBottom: 2 },
  secondaryCardSub:   { fontSize: 12, color: C.labelTertiary },

  /* Tips */
  tipsCard: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    overflow: 'hidden', marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  tipRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, padding: Spacing.lg,
  },
  tipIconWrap: {
    width: 32, height: 32, borderRadius: Radius.md,
    backgroundColor: C.accentSoft,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  tipText:    { flex: 1, fontSize: 13, color: C.labelSecondary, lineHeight: 19 },
  tipDivider: { height: 1, backgroundColor: C.border, marginHorizontal: Spacing.lg },

  /* Disclaimer */
  disclaimer: {
    fontSize: 11, color: C.labelTertiary,
    textAlign: 'center', lineHeight: 17,
    paddingHorizontal: Spacing.sm,
  },
});

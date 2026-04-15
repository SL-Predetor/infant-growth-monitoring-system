import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView,
  StyleSheet, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { ChevronLeft, BarChart2 } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { submitPostpartum, PostpartumPayload } from '@/services/postpartumService';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const C = Colors.light;

/* ── Pill toggle helper ── */
function PillGroup({
  options, value, onChange, color = C.accent,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  color?: string;
}) {
  return (
    <View style={pg.row}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[pg.pill, active && { backgroundColor: color, borderColor: color }]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[pg.pillText, active && pg.pillTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const pg = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.cardSecondary,
  },
  pillText: { fontSize: 13, fontWeight: '600', color: C.labelSecondary },
  pillTextActive: { color: '#FFFFFF' },
});

/* ── Section card ── */
function Section({ title, emoji, delay = 0, children }: {
  title: string; emoji: string; delay?: number; children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(14)}>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardEmoji}>{emoji}</Text>
          <Text style={s.cardTitle}>{title}</Text>
        </View>
        {children}
      </View>
    </Animated.View>
  );
}

/* ── Field label ── */
function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

export default function RecoveryScreen() {
  const router = useRouter();

  const [age, setAge]                         = useState('28');
  const [weeks, setWeeks]                     = useState('');
  const [deliveryType, setDeliveryType]       = useState('vaginal_no_tear');
  const [painPattern, setPainPattern]         = useState('movement');
  const [healingProgress, setHealingProgress] = useState('same');
  const [sleepHours, setSleepHours]           = useState('6-7hrs');
  const [fatigueScore, setFatigueScore]       = useState(5);
  const [babySleep, setBabySleep]             = useState('3-4hrs');
  const [mealsPerDay, setMealsPerDay]         = useState('3');
  const [protein, setProtein]                 = useState('adequate');
  const [fluid, setFluid]                     = useState('2-3L');
  const [fruitVeg, setFruitVeg]               = useState('3+');
  const [activity, setActivity]               = useState('15-30mins');
  const [feedingPosture, setFeedingPosture]   = useState('upright');
  const [liftingPosture, setLiftingPosture]   = useState('neutral');
  const [iron, setIron]                       = useState('daily');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const submit = async () => {
    try {
      setLoading(true); setError(null);
      const payload: PostpartumPayload = {
        age: Number(age),
        weeks_since_delivery: Number(weeks),
        delivery_type: deliveryType,
        parenting_type: 'partner',
        pain_pattern: painPattern,
        healing_progress: healingProgress,
        sleep_hours: sleepHours,
        daytime_fatigue_score: fatigueScore,
        baby_sleep_pattern: babySleep,
        meals_per_day: mealsPerDay,
        protein_intake: protein,
        iron_intake: iron,
        fluid_intake: fluid,
        fruit_veg_intake: fruitVeg,
        physical_activity: activity,
        feeding_posture: feedingPosture,
        lifting_posture: liftingPosture,
      } as any;
      const data = await submitPostpartum(payload);
      router.push({ pathname: '/mom-prediction-result', params: { result: JSON.stringify(data) } });
    } catch {
      setError('Could not reach the server — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>

      {/* ── HEADER ── */}
      <LinearGradient
        colors={[C.accent, '#C55A5A']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <SafeAreaView edges={['top']}>
          <View style={s.heroTop}>
            <Pressable
              onPress={() => router.replace('/(tabs)/wellness' as any)}
              style={({ pressed }) => [s.heroBtn, pressed && { opacity: 0.7 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ChevronLeft size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
              <Text style={s.heroBtnText}>Back</Text>
            </Pressable>
            <Text style={s.heroTitle}>Recovery Check-in</Text>
            <Pressable
              onPress={() => router.push('/postpartum-dashboard' as any)}
              style={({ pressed }) => [s.heroDashBtn, pressed && { opacity: 0.7 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <BarChart2 size={18} color="rgba(255,255,255,0.9)" strokeWidth={1.8} />
            </Pressable>
          </View>
          <Text style={s.heroSub}>
            A few quick questions to understand how you're feeling today 💛
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── ABOUT YOU ── */}
        <Section title="About You" emoji="👩" delay={0}>
          <View style={s.twoCol}>
            <View style={s.colItem}>
              <Label>Your age</Label>
              <TextInput
                style={s.numInput}
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                placeholder="28"
                placeholderTextColor={C.labelPlaceholder}
              />
            </View>
            <View style={s.colItem}>
              <Label>Weeks since delivery</Label>
              <TextInput
                style={s.numInput}
                keyboardType="numeric"
                value={weeks}
                onChangeText={setWeeks}
                placeholder="6"
                placeholderTextColor={C.labelPlaceholder}
              />
            </View>
          </View>

          <Label>Delivery type</Label>
          <PillGroup
            value={deliveryType}
            onChange={setDeliveryType}
            color={C.accent}
            options={[
              { label: 'Vaginal', value: 'vaginal_no_tear' },
              { label: 'Vaginal + Tear', value: 'vaginal_tear' },
              { label: 'C-Section', value: 'csection' },
            ]}
          />
        </Section>

        {/* ── PAIN & HEALING ── */}
        <Section title="Pain & Healing" emoji="🩹" delay={60}>
          <Label>Pain pattern</Label>
          <PillGroup
            value={painPattern}
            onChange={setPainPattern}
            color={C.danger}
            options={[
              { label: 'When moving', value: 'movement' },
              { label: 'Constant', value: 'continuous' },
              { label: 'Sharp', value: 'sharp' },
              { label: 'When feeding', value: 'feeding' },
            ]}
          />

          <Label>How is healing going?</Label>
          <PillGroup
            value={healingProgress}
            onChange={setHealingProgress}
            color={C.success}
            options={[
              { label: 'Getting better ↑', value: 'improving' },
              { label: 'About the same', value: 'same' },
              { label: 'Getting worse ↓', value: 'worsening' },
            ]}
          />
        </Section>

        {/* ── SLEEP & FATIGUE ── */}
        <Section title="Sleep & Fatigue" emoji="😴" delay={120}>
          <Label>How long do you sleep at night?</Label>
          <PillGroup
            value={sleepHours}
            onChange={setSleepHours}
            color={C.primary}
            options={[
              { label: '< 3 hrs', value: '<3hrs' },
              { label: '3–5 hrs', value: '3-5hrs' },
              { label: '6–7 hrs', value: '6-7hrs' },
              { label: '7+ hrs', value: '>7hrs' },
            ]}
          />

          <Label>Daytime tiredness — {fatigueScore} / 10</Label>
          <View style={s.sliderRow}>
            <Text style={s.sliderEnd}>😌</Text>
            <Slider
              style={s.slider}
              minimumValue={0} maximumValue={10} step={1}
              value={fatigueScore}
              onValueChange={setFatigueScore}
              minimumTrackTintColor={C.accent}
              maximumTrackTintColor={C.border}
              thumbTintColor={C.accent}
            />
            <Text style={s.sliderEnd}>😩</Text>
          </View>

          <Label>Baby's sleep pattern</Label>
          <PillGroup
            value={babySleep}
            onChange={setBabySleep}
            color={C.primary}
            options={[
              { label: 'Wakes often', value: 'frequent' },
              { label: '3–4 hr stretches', value: '3-4hrs' },
              { label: '5+ hr stretches', value: '5+hrs' },
            ]}
          />
        </Section>

        {/* ── NUTRITION ── */}
        <Section title="Nutrition" emoji="🥗" delay={180}>
          <Label>Meals per day</Label>
          <PillGroup
            value={mealsPerDay}
            onChange={setMealsPerDay}
            color={C.warning}
            options={[
              { label: '2 meals', value: '2' },
              { label: '3 meals', value: '3' },
              { label: '3+ meals', value: '>3' },
            ]}
          />

          <Label>Protein intake</Label>
          <PillGroup
            value={protein}
            onChange={setProtein}
            color={C.warning}
            options={[
              { label: 'Rarely', value: 'rare' },
              { label: 'Sometimes', value: 'sometimes' },
              { label: 'Adequate', value: 'adequate' },
              { label: 'High', value: 'high' },
            ]}
          />

          <Label>Daily fluid intake</Label>
          <PillGroup
            value={fluid}
            onChange={setFluid}
            color={C.primary}
            options={[
              { label: '< 1 L', value: '<1L' },
              { label: '1–2 L', value: '1-2L' },
              { label: '2–3 L', value: '2-3L' },
              { label: '3+ L', value: '>3L' },
            ]}
          />

          <Label>Fruits & vegetables</Label>
          <PillGroup
            value={fruitVeg}
            onChange={setFruitVeg}
            color={C.success}
            options={[
              { label: '< 1 serving', value: '<1' },
              { label: '1–2 servings', value: '1-2times' },
              { label: '3+ servings', value: '3+' },
            ]}
          />
        </Section>

        {/* ── ACTIVITY & POSTURE ── */}
        <Section title="Activity & Posture" emoji="🏃" delay={240}>
          <Label>Physical activity today</Label>
          <PillGroup
            value={activity}
            onChange={setActivity}
            color={C.primary}
            options={[
              { label: 'None', value: 'none' },
              { label: '< 15 min', value: '<15mins' },
              { label: '15–30 min', value: '15-30mins' },
              { label: '30+ min', value: '>30mins' },
            ]}
          />

          <Label>Feeding posture</Label>
          <PillGroup
            value={feedingPosture}
            onChange={setFeedingPosture}
            color={C.accent}
            options={[
              { label: 'Upright', value: 'upright' },
              { label: 'Leaning', value: 'leaning' },
              { label: 'Lying', value: 'lying' },
              { label: 'Mixed', value: 'mixed' },
            ]}
          />

          <Label>Lifting posture</Label>
          <PillGroup
            value={liftingPosture}
            onChange={setLiftingPosture}
            color={C.accent}
            options={[
              { label: 'Correct', value: 'neutral' },
              { label: 'Hunched', value: 'hunched' },
              { label: 'Not sure', value: 'unsure' },
            ]}
          />
        </Section>

        {/* ── ERROR ── */}
        {!!error && (
          <Animated.View entering={FadeInDown.springify()}>
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          </Animated.View>
        )}

        {/* ── SUBMIT ── */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Pressable
            style={({ pressed }) => [s.submitBtn, loading && { opacity: 0.65 }, pressed && { opacity: 0.87 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.submitBtnText}>Get My Recovery Insights →</Text>}
          </Pressable>
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  /* Hero header */
  hero: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 8 : 12, marginBottom: 10,
  },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6 },
  heroBtnText: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  heroTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  heroDashBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19, paddingBottom: 4 },

  /* Scroll */
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xl },

  /* Cards */
  card: {
    backgroundColor: C.card, borderRadius: Radius.xxl,
    padding: Spacing.lg, marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.lg },
  cardEmoji: { fontSize: 20 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: C.label },

  /* Label */
  label: {
    fontSize: 13, fontWeight: '600', color: C.labelSecondary,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },

  /* Number inputs */
  twoCol: { flexDirection: 'row', gap: 12 },
  colItem: { flex: 1 },
  numInput: {
    backgroundColor: C.cardSecondary, borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.md, padding: 14, fontSize: 18,
    fontWeight: '700', color: C.label,
  },

  /* Slider */
  sliderRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.cardSecondary, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 6 : 0,
    marginTop: 4,
  },
  slider: { flex: 1, height: 40 },
  sliderEnd: { fontSize: 20 },

  /* Error */
  errorBox: {
    backgroundColor: C.dangerSoft, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  errorText: { fontSize: 13, color: C.danger, textAlign: 'center', fontWeight: '500' },

  /* Submit */
  submitBtn: {
    height: 58, borderRadius: Radius.full,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    marginBottom: Spacing.sm,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

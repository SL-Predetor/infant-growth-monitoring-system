import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, Alert, ActivityIndicator,
  Animated, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const C = Colors.light;

type FeedType    = 'breastfed' | 'formula' | 'mixed';
/* ML model one-hot encodes to: diarrhoea | fever | none | persistent | respiratory
   'Other' was removed — 'Persistent' maps to IllType_persistent */
type IllnessType = 'Diarrhoea' | 'Respiratory' | 'Fever' | 'Persistent';

/* ── Feed type config ── */
const FEED_TYPES: { type: FeedType; emoji: string; short: string; tip: string }[] = [
  { type: 'breastfed', emoji: '🤱', short: 'Breast',  tip: 'Breastmilk covers everything your baby needs' },
  { type: 'formula',   emoji: '🍼', short: 'Formula', tip: 'Follow your formula tin\'s scooping guide' },
  { type: 'mixed',     emoji: '⚖️', short: 'Mixed',   tip: 'Great combination — you\'re doing brilliantly' },
];

/* ── Stepper ── */
function Stepper({ value, min, max, onChange, disabled }: {
  value: number; min: number; max: number;
  onChange: (n: number) => void; disabled?: boolean;
}) {
  return (
    <View style={[s.stepperRow, disabled && { opacity: 0.38 }]}>
      <Pressable
        style={({ pressed }) => [s.stepBtn, pressed && { opacity: 0.6 }]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={disabled}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={s.stepBtnText}>−</Text>
      </Pressable>
      <Text style={s.stepValue}>{value}</Text>
      <Pressable
        style={({ pressed }) => [s.stepBtn, pressed && { opacity: 0.6 }]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={disabled}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={s.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

/* ── Sleep quality label ── */
function sleepQuality(h: number): { text: string; color: string } {
  if (h < 10) return { text: 'A bit short', color: C.warning };
  if (h <= 16) return { text: 'Just right ✓', color: C.success };
  return { text: 'Normal for young babies', color: C.primary };
}

export default function DailyLogScreen() {
  const router   = useRouter();
  const { user } = useAuth();

  /* ── Form state ── */
  const [sleepHours,  setSleepHours]  = useState(12);
  const [feedType,    setFeedType]    = useState<FeedType>('breastfed');
  const [milkFeeds,   setMilkFeeds]   = useState(6);
  const [solidMeals,  setSolidMeals]  = useState(0);
  const [snacks,      setSnacks]      = useState(0);
  const [isSick,      setIsSick]      = useState(false);
  const [illnessType, setIllnessType] = useState<IllnessType | null>(null);
  const [ironRich,    setIronRich]    = useState(false);
  const [animalProt,  setAnimalProt]  = useState(false);
  const [plantBased,  setPlantBased]  = useState(false);
  const [junkFood,    setJunkFood]    = useState(false);

  /* ── Meta ── */
  const [infant,        setInfant]        = useState<any>(null);
  const [pageLoading,   setPageLoading]   = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [isUpdate,      setIsUpdate]      = useState(false);
  const [existingLogId, setExistingLogId] = useState<string | null>(null);
  const [logCount,      setLogCount]      = useState(0);
  const [selectedDate,  setSelectedDate]  = useState(new Date().toISOString().split('T')[0]);

  /* Illness expand animation */
  const [illnessAnim] = useState(new Animated.Value(0));
  useEffect(() => {
    Animated.timing(illnessAnim, {
      toValue: isSick ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [isSick]);

  /* Food quality inline expand — triggers when any solid food is logged
     (flags are meaningful for solid meals AND snacks, per ML model) */
  const [foodQualAnim] = useState(new Animated.Value(0));
  useEffect(() => {
    Animated.timing(foodQualAnim, {
      toValue: solidMeals + snacks > 0 ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [solidMeals, snacks]);

  /* ── Derived ── */
  const today     = new Date().toISOString().split('T')[0];
  const isToday   = selectedDate === today;
  const dateObj   = new Date(selectedDate + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });
  const dayName   = dateObj.toLocaleDateString('en', { weekday: 'long' });
  const sleep_    = sleepQuality(sleepHours);
  const aiProgress  = Math.min(logCount, 7);
  const logsNeeded  = Math.max(0, 7 - logCount);
  const aiReady     = logCount >= 7;
  const feedTypeCfg = FEED_TYPES.find(f => f.type === feedType)!;
  const milkLabel   = feedType === 'breastfed' ? 'Breastfeeds' : feedType === 'formula' ? 'Formula feeds' : 'Milk feeds';

  /* Baby age for contextual hints */
  const ageMonths = infant?.birth_date
    ? Math.floor((Date.now() - new Date(infant.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : null;
  const tooYoungForSolids = ageMonths !== null && ageMonths < 6;

  /* Calorie estimate — live as parent adjusts ── */
  const estimatedCalories = useMemo(() => {
    const milkCal  = feedType === 'mixed' ? milkFeeds * 150 : milkFeeds * 130;
    const solidCal = solidMeals * 200;
    const snackCal = snacks * 80;
    return Math.round(milkCal + solidCal + snackCal);
  }, [feedType, milkFeeds, solidMeals, snacks]);

  const handleSolidMeals = (n: number) => {
    setSolidMeals(n);
    if (n === 0 && snacks === 0) {
      setIronRich(false); setAnimalProt(false);
      setPlantBased(false); setJunkFood(false);
    }
  };

  const handleSnacks = (n: number) => {
    setSnacks(n);
    if (n === 0 && solidMeals === 0) {
      setIronRich(false); setAnimalProt(false);
      setPlantBased(false); setJunkFood(false);
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  /* ── Fetch infant + log count ── */
  useEffect(() => {
    const fetchInfant = async () => {
      if (!user) { setPageLoading(false); return; }
      try {
        const { data } = await supabase
          .from('infants').select('*').eq('parent_id', user.id).maybeSingle();
        setInfant(data);
        if (data) {
          const { count } = await supabase
            .from('daily_logs').select('*', { count: 'exact', head: true })
            .eq('infant_id', data.id);
          setLogCount(count || 0);
        }
      } catch (err) { console.error(err); }
      finally { setPageLoading(false); }
    };
    fetchInfant();
  }, [user]);

  /* ── Fetch log for selected date ── */
  useEffect(() => {
    const fetchLog = async () => {
      if (!infant || !selectedDate) return;
      try {
        const { data: existing } = await supabase
          .from('daily_logs').select('*')
          .eq('infant_id', infant.id)
          .eq('log_date', selectedDate)
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
          setIronRich(existing.f_iron_rich > 0);
          setAnimalProt(existing.f_animal_protein > 0);
          setPlantBased(existing.f_plant_based > 0);
          setJunkFood(existing.f_junk_food > 0);
        } else {
          setIsUpdate(false); setExistingLogId(null);
          setSleepHours(12); setFeedType('breastfed');
          setMilkFeeds(6); setSolidMeals(0); setSnacks(0);
          setIsSick(false); setIllnessType(null);
          setIronRich(false); setAnimalProt(false);
          setPlantBased(false); setJunkFood(false);
        }
      } catch (err) { console.error(err); }
    };
    fetchLog();
  }, [infant, selectedDate]);

  /* ── Save ── */
  const handleSave = async () => {
    if (!infant) { Alert.alert('No baby profile found', 'Add your baby first.'); return; }
    if (isSick && !illnessType) {
      Alert.alert('One more thing', 'What type of illness does your baby have?');
      return;
    }
    setSaving(true);
    try {
      const yesterday = new Date(selectedDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const { data: yLog } = await supabase
        .from('daily_logs').select('has_illness, recovery_day')
        .eq('infant_id', infant.id)
        .eq('log_date', yesterday.toISOString().split('T')[0])
        .maybeSingle();

      let recoveryDay = 0;
      if (!isSick && yLog?.has_illness) recoveryDay = 1;
      else if (!isSick && yLog && !yLog.has_illness && (yLog.recovery_day || 0) > 0)
        recoveryDay = Math.min((yLog.recovery_day || 0) + 1, 21);

      const payload = {
        infant_id: infant.id, log_date: selectedDate,
        sleep_hours: sleepHours, feed_type: feedType,
        f_breast_formula: milkFeeds, f_solid_meal: solidMeals,
        f_nutritious_snacks: snacks,
        /* Food quality is only meaningful when solids > 0 — ensured by handleSolidMeals */
        f_iron_rich:      ironRich    ? 1 : 0,
        f_animal_protein: animalProt  ? 1 : 0,
        f_plant_based:    plantBased  ? 1 : 0,
        f_junk_food:      junkFood    ? 1 : 0,
        feeding_frequency:    milkFeeds + solidMeals + snacks,
        daily_calorie_intake: estimatedCalories,
        has_illness:  isSick,
        illness_type: isSick ? illnessType : null,
        recovery_day: recoveryDay,
      };

      if (isUpdate && existingLogId) {
        const { error } = await supabase.from('daily_logs').update(payload).eq('id', existingLogId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('daily_logs').insert(payload);
        if (error) throw error;
      }

      const newCount = isUpdate ? logCount : logCount + 1;
      const daysLeft = Math.max(0, 7 - newCount);
      Alert.alert(
        isUpdate ? '✅ Updated' : '✅ Logged',
        isUpdate
          ? 'Entry updated.'
          : daysLeft > 0
            ? `Day ${newCount} done! ${daysLeft} more day${daysLeft !== 1 ? 's' : ''} to unlock AI.`
            : '🎉 All 7 days complete — AI predictions are now active!',
        [{ text: 'Done', onPress: () => router.replace('/(tabs)/' as any) }],
      );
    } catch (err: any) {
      Alert.alert('Save failed', err.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  if (pageLoading) {
    return (
      <View style={s.safe}>
        <View style={s.loader}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loaderText}>Loading…</Text>
        </View>
      </View>
    );
  }

  /* ── RENDER ── */
  return (
    <View style={s.safe}>

      {/* ── HEADER — date navigation lives here, not in the scroll ── */}
      <LinearGradient
        colors={['#5DA7B1', '#4A8F98']}
        style={[s.headerGrad, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}
      >
        <View style={s.headerRow}>
          <Pressable
            onPress={() => router.replace('/(tabs)/' as any)}
            style={s.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color="#FFF" strokeWidth={2} />
          </Pressable>
          <Text style={s.headerTitle}>
            {isToday ? "Today's Log" : `${dayName}'s Log`}
          </Text>
          <View style={s.headerBtn} />
        </View>

        {/* Date swiper */}
        <View style={s.dateNav}>
          <Pressable
            style={({ pressed }) => [s.dateNavBtn, pressed && { opacity: 0.6 }]}
            onPress={() => shiftDate(-1)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />
          </Pressable>

          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={s.dateNavLabel}>{infant?.name ?? 'Baby'} · {dateLabel}</Text>
            {isToday && <View style={s.todayPill}><Text style={s.todayPillText}>Today</Text></View>}
            {isUpdate && <View style={s.editingPill}><Text style={s.editingPillText}>✏️ Editing saved entry</Text></View>}
          </View>

          <Pressable
            style={({ pressed }) => [
              s.dateNavBtn, pressed && { opacity: 0.6 },
              selectedDate >= today && s.dateNavBtnDisabled,
            ]}
            onPress={() => shiftDate(1)}
            disabled={selectedDate >= today}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronRight size={18} color="rgba(255,255,255,0.9)" strokeWidth={2} />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── AI PROGRESS BANNER ── */}
        {!aiReady ? (
          <View style={s.aiBanner}>
            <View style={s.aiBannerTop}>
              <Text style={s.aiBannerEmoji}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.aiBannerTitle}>Building your baby's AI profile</Text>
                <Text style={s.aiBannerSub}>
                  {logsNeeded} more day{logsNeeded !== 1 ? 's' : ''} to unlock growth predictions
                </Text>
              </View>
              <Text style={s.aiBannerCount}>{aiProgress}/7</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${(aiProgress / 7) * 100}%` as any }]} />
            </View>
          </View>
        ) : (
          <View style={[s.aiBanner, s.aiBannerReady]}>
            <Text style={{ fontSize: 18 }}>🤖</Text>
            <Text style={[s.aiBannerTitle, { color: C.success, flex: 1 }]}>
              AI Active — growth predictions are running
            </Text>
          </View>
        )}

        {/* ══════════════════════════════════════════
            SLEEP
        ══════════════════════════════════════════ */}
        <View style={s.card}>
          <View style={s.cardTopRow}>
            <View style={s.cardTitleRow}>
              <Text style={{ fontSize: 20 }}>😴</Text>
              <Text style={s.cardTitle}>Sleep</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={s.sleepValueRow}>
                <Text style={[s.sleepNum, { color: C.primary }]}>{sleepHours.toFixed(1)}</Text>
                <Text style={s.sleepUnit}>hrs</Text>
              </View>
              <Text style={[s.sleepQualityLbl, { color: sleep_.color }]}>{sleep_.text}</Text>
            </View>
          </View>
          <Slider
            style={{ width: '100%', height: 40, marginTop: 4 }}
            minimumValue={0} maximumValue={24} step={0.5}
            value={sleepHours} onValueChange={setSleepHours}
            minimumTrackTintColor={C.primary}
            maximumTrackTintColor={C.cardTertiary}
            thumbTintColor={C.primary}
          />
          <View style={s.sliderLabels}>
            <Text style={s.sliderLbl}>0h</Text>
            <Text style={s.sliderLbl}>12h</Text>
            <Text style={s.sliderLbl}>24h</Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            FEEDING — event-driven card
            Feed type → changes milk label + calorie calc
            Solid meals / snacks → unlocks food quality
        ══════════════════════════════════════════ */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={{ fontSize: 20 }}>🍼</Text>
            <Text style={s.cardTitle}>Feeding</Text>
          </View>

          {/* Feed type — 3 pills, label below changes when you tap */}
          <View style={s.pillRow}>
            {FEED_TYPES.map(({ type, emoji, short }) => {
              const active = feedType === type;
              return (
                <Pressable
                  key={type}
                  style={[s.feedPill, active
                    ? { backgroundColor: C.primary }
                    : { backgroundColor: C.cardSecondary, borderWidth: 1, borderColor: C.border }
                  ]}
                  onPress={() => setFeedType(type)}
                >
                  <Text style={[s.feedPillText, { color: active ? '#FFF' : C.labelTertiary }]}>
                    {emoji} {short}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Vertical feed rows — label left, stepper right. No cramping. */}
          <View style={s.feedRows}>

            {/* Milk feeds — label reacts to feed type */}
            <View style={s.feedRow}>
              <Text style={s.feedRowLabel}>{milkLabel}</Text>
              <Stepper value={milkFeeds} min={0} max={15} onChange={setMilkFeeds} />
            </View>

            <View style={s.feedRowDivider} />

            {/* Solid meals — age hint if baby < 6 months */}
            <View style={s.feedRow}>
              <View>
                <Text style={s.feedRowLabel}>Solid Meals</Text>
                {tooYoungForSolids && (
                  <Text style={s.feedRowAgeHint}>not recommended yet</Text>
                )}
              </View>
              <Stepper value={solidMeals} min={0} max={3} onChange={handleSolidMeals} />
            </View>

            {/* ── Food quality — slides in inline when solidMeals > 0 ── */}
            <Animated.View style={{
              maxHeight: foodQualAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }),
              opacity:   foodQualAnim,
              overflow:  'hidden',
            }}>
              <View style={s.foodQualInline}>
                <Text style={s.foodQualInlineHint}>What did baby eat today? Tap all that apply.</Text>
                <View style={s.nutri2x2}>
                  {([
                    { key: 'iron',  label: '🫘 Iron-Rich',        val: ironRich,   set: setIronRich,   junk: false },
                    { key: 'prot',  label: '🥩 Animal Protein',   val: animalProt, set: setAnimalProt, junk: false },
                    { key: 'plant', label: '🥦 Plant Foods',      val: plantBased, set: setPlantBased, junk: false },
                    { key: 'junk',  label: '🍟 Junk / Processed', val: junkFood,   set: setJunkFood,   junk: true  },
                  ] as const).map(item => (
                    <Pressable
                      key={item.key}
                      style={[s.nutriChip,
                        item.val
                          ? { backgroundColor: item.junk ? C.dangerSoft  : C.successSoft,
                              borderColor:      item.junk ? C.danger      : C.success }
                          : { backgroundColor: C.cardSecondary, borderColor: C.border }
                      ]}
                      onPress={() => (item.set as any)(!item.val)}
                    >
                      <Text style={[s.nutriChipText,
                        { color: item.val ? (item.junk ? C.danger : C.success) : C.labelTertiary }
                      ]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </Animated.View>

            <View style={s.feedRowDivider} />

            {/* Snacks */}
            <View style={s.feedRow}>
              <Text style={s.feedRowLabel}>Snacks</Text>
              <Stepper value={snacks} min={0} max={3} onChange={handleSnacks} />
            </View>

          </View>

          {/* Calorie estimate — live feedback as parent adjusts numbers */}
          <View style={s.caloriePill}>
            <Text style={s.calorieText}>🔥 ≈ {estimatedCalories} kcal today</Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            HEALTH
        ══════════════════════════════════════════ */}
        <View style={s.healthRow}>
          <Pressable
            style={[s.healthBtn, !isSick
              ? { backgroundColor: C.success }
              : { backgroundColor: C.cardSecondary, borderWidth: 1, borderColor: C.border }
            ]}
            onPress={() => { setIsSick(false); setIllnessType(null); }}
          >
            <Text style={[s.healthBtnText, { color: !isSick ? '#FFF' : C.labelTertiary }]}>
              ✓  Healthy today
            </Text>
          </Pressable>
          <Pressable
            style={[s.healthBtn, isSick
              ? { backgroundColor: C.danger }
              : { backgroundColor: C.cardSecondary, borderWidth: 1, borderColor: C.border }
            ]}
            onPress={() => setIsSick(true)}
          >
            <Text style={[s.healthBtnText, { color: isSick ? '#FFF' : C.labelTertiary }]}>
              🤒  Baby is sick
            </Text>
          </Pressable>
        </View>

        {/* Illness type — slides in when sick. margin only when visible. */}
        <Animated.View style={{
          maxHeight:    illnessAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 280] }),
          opacity:      illnessAnim,
          overflow:     'hidden',
          marginBottom: illnessAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
        }}>
          <View style={s.card}>
            <Text style={[s.cardTitle, { marginBottom: 14 }]}>What kind of illness?</Text>
            <View style={s.illnessGrid}>
              {([
                { type: 'Diarrhoea',   emoji: '💧' },
                { type: 'Respiratory', emoji: '😮‍💨' },
                { type: 'Fever',       emoji: '🌡️' },
                { type: 'Persistent',  emoji: '🤕' },
              ] as { type: IllnessType; emoji: string }[]).map(({ type, emoji }) => {
                const active = illnessType === type;
                return (
                  <Pressable
                    key={type}
                    style={[s.illnessChip, active
                      ? { backgroundColor: C.danger }
                      : { backgroundColor: C.cardSecondary, borderWidth: 1, borderColor: C.border }
                    ]}
                    onPress={() => setIllnessType(type)}
                  >
                    <Text style={s.illnessChipEmoji}>{emoji}</Text>
                    <Text style={[s.illnessChipText, { color: active ? '#FFF' : C.labelTertiary }]}>
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.illnessNote}>Recovery tracking happens automatically</Text>
          </View>
        </Animated.View>

        {/* ── SAVE ── */}
        <Pressable
          style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.8 }, saving && { opacity: 0.65 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={s.saveBtnText}>
                {isUpdate
                  ? `Update ${isToday ? "Today's" : `${dayName}'s`} Log`
                  : `Save ${isToday ? "Today's" : `${dayName}'s`} Log`}
              </Text>
          }
        </Pressable>

        {/* Secondary action — proper outlined button, visible */}
        <Pressable
          style={({ pressed }) => [s.weightBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/(tabs)/update-measurements' as any)}
        >
          <Text style={s.weightBtnText}>📏  Update Weight & Height</Text>
        </Pressable>

        {/* Clear the tab bar on both platforms */}
        <View style={{ height: Platform.OS === 'ios' ? 16 : 12 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.background },
  loader:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { fontSize: 14, color: C.labelTertiary, marginTop: 10 },
  scroll:     {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    /* enough room below the last button to clear the tab bar */
    paddingBottom: Platform.OS === 'ios' ? 110 : 88,
  },

  /* ── Header ── */
  headerGrad:  { paddingHorizontal: 16, paddingBottom: 20 },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerBtn:   { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  /* Date swiper */
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateNavBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  dateNavBtnDisabled: { opacity: 0.25 },
  dateNavLabel: { fontSize: 13, fontWeight: '600', color: '#FFF', textAlign: 'center' },
  todayPill: {
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 3, marginTop: 5,
  },
  todayPillText: { fontSize: 11, color: '#FFF', fontWeight: '700' },
  editingPill: {
    backgroundColor: 'rgba(230,168,85,0.4)', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 3, marginTop: 5,
  },
  editingPillText: { fontSize: 11, color: '#FFF', fontWeight: '700' },

  /* ── AI Banner ── */
  aiBanner: {
    backgroundColor: C.primarySoft, borderWidth: 1, borderColor: C.primary,
    borderRadius: Radius.xl, padding: 14, marginBottom: 14,
  },
  aiBannerReady: {
    backgroundColor: C.successSoft, borderColor: C.success,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  aiBannerTop:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  aiBannerEmoji: { fontSize: 22 },
  aiBannerTitle: { fontSize: 13, fontWeight: '700', color: C.primary },
  aiBannerSub:   { fontSize: 12, color: C.primary, opacity: 0.75, marginTop: 2 },
  aiBannerCount: { fontSize: 22, fontWeight: '800', color: C.primary },
  progressTrack: { height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 5, backgroundColor: C.primary, borderRadius: 3 },

  /* ── Card ── */
  card: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: 12, ...Shadows.sm,
  },
  cardTopRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: C.label },

  /* ── Sleep ── */
  sleepValueRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  sleepNum:        { fontSize: 36, fontWeight: '700' },
  sleepUnit:       { fontSize: 15, color: C.labelTertiary },
  sleepQualityLbl: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sliderLabels:    { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: -4 },
  sliderLbl:       { fontSize: 11, color: C.labelTertiary, fontWeight: '500' },

  /* ── Feeding ── */
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  feedPill: {
    flex: 1, height: 40, borderRadius: Radius.full,
    justifyContent: 'center', alignItems: 'center',
  },
  feedPillText: { fontSize: 12, fontWeight: '700' },

  /* Vertical feed rows — label left, stepper right */
  feedRows:       { marginBottom: 16 },
  feedRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  feedRowDivider: { height: 1, backgroundColor: C.border },
  feedRowLabel:   { fontSize: 14, fontWeight: '600', color: C.label },
  feedRowAgeHint: { fontSize: 11, color: C.warning, fontWeight: '600', marginTop: 2 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.cardSecondary, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  stepBtnText: { fontSize: 22, color: C.primary, lineHeight: 26 },
  stepValue:   { fontSize: 26, fontWeight: '700', color: C.label, minWidth: 36, textAlign: 'center' },

  caloriePill: {
    alignSelf: 'center', backgroundColor: C.cardSecondary,
    borderRadius: Radius.full, paddingVertical: 8, paddingHorizontal: 20,
    borderWidth: 1, borderColor: C.border, marginBottom: 4,
  },
  calorieText: { fontSize: 14, color: C.labelSecondary, fontWeight: '700' },

  /* ── Food quality — inline expansion inside feeding card ── */
  foodQualInline: {
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 12, paddingBottom: 4, marginTop: 4,
  },
  foodQualInlineHint: {
    fontSize: 12, color: C.labelTertiary, fontWeight: '500',
    marginBottom: 10,
  },
  nutri2x2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nutriChip: {
    width: '48%', paddingVertical: 14, borderRadius: Radius.lg,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  nutriChipText: { fontSize: 13, fontWeight: '700' },

  /* ── Health ── */
  healthRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  healthBtn: {
    flex: 1, height: 54, borderRadius: Radius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  healthBtnText: { fontSize: 15, fontWeight: '700' },

  /* ── Illness ── */
  illnessGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  illnessChip: {
    width: '48%', height: 62, borderRadius: Radius.lg,
    justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  illnessChipEmoji: { fontSize: 22 },
  illnessChipText:  { fontSize: 13, fontWeight: '600' },
  illnessNote:      { fontSize: 12, color: C.labelTertiary, textAlign: 'center' },

  /* ── Save ── */
  saveBtn: {
    height: 56, backgroundColor: C.primary, borderRadius: Radius.full,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, marginTop: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 12, elevation: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  /* ── Weight update — real button, not a text link ── */
  weightBtn: {
    height: 50, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  weightBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },
});

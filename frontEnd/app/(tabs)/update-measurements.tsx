import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, TextInput, Alert,
  ActivityIndicator, Platform,
  Animated, LayoutAnimation, UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Scale, Ruler, StickyNote, Info, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Shadows, Radius } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const C = Colors.light;

export default function UpdateMeasurementsScreen() {
  const router  = useRouter();
  const { user } = useAuth();

  const [weightG, setWeightG]               = useState('');
  const [heightCm, setHeightCm]             = useState('');
  const [measDate, setMeasDate]             = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]                   = useState('');
  const [infant, setInfant]                 = useState<any>(null);
  const [lastMeasurement, setLastMeasurement] = useState<any>(null);
  const [pageLoading, setPageLoading]       = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [tipsExpanded, setTipsExpanded]     = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const init = async () => {
      if (!user) { setPageLoading(false); return; }
      try {
        const { data: infantData, error: infantError } = await supabase
          .from('infants').select('*').eq('parent_id', user.id).maybeSingle();
        if (infantError || !infantData) { setPageLoading(false); return; }
        setInfant(infantData);

        const { data: lastMeas } = await supabase
          .from('measurements').select('*')
          .eq('infant_id', infantData.id)
          .order('measured_date', { ascending: false })
          .limit(1).maybeSingle();
        setLastMeasurement(lastMeas);
      } catch (err: any) {
        console.error('Init error:', err.message);
      } finally {
        setPageLoading(false);
      }
    };
    init();
  }, [user]);

  const validate = (): string | null => {
    if (!weightG && !heightCm) return 'Please enter at least weight or height';
    if (weightG) {
      const w = parseFloat(weightG);
      if (isNaN(w) || w < 500 || w > 30000) return 'Weight must be between 500g and 30,000g';
    }
    if (heightCm) {
      const h = parseFloat(heightCm);
      if (isNaN(h) || h < 30 || h > 120) return 'Height must be between 30cm and 120cm';
    }
    return null;
  };

  const weightChange = useMemo(() => {
    if (!lastMeasurement?.weight_g || !weightG) return null;
    const w = parseFloat(weightG);
    if (isNaN(w) || w < 500 || w > 30000) return null;
    const diff = w - lastMeasurement.weight_g;
    return diff === 0 ? null : diff;
  }, [weightG, lastMeasurement]);

  useEffect(() => {
    if (weightChange !== null) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [weightChange, fadeAnim]);

  const handleSave = async () => {
    const err = validate();
    if (err) { Alert.alert('Check your input', err); return; }
    if (!infant) { Alert.alert('Error', 'No baby profile found.'); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from('measurements').upsert(
        {
          infant_id: infant.id,
          measured_date: measDate,
          weight_g:   weightG  ? parseFloat(weightG)  : null,
          height_cm:  heightCm ? parseFloat(heightCm) : null,
          notes: notes || null,
        },
        { onConflict: 'infant_id,measured_date' },
      );
      if (error) throw error;
      Alert.alert('Saved!', 'Measurement recorded successfully.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  const todayLabel = (() => {
    const today = new Date().toISOString().split('T')[0];
    if (measDate === today) {
      return `Today, ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
    }
    return new Date(measDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'long', day: 'numeric',
    });
  })();

  const toggleTips = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTipsExpanded(t => !t);
  };

  if (pageLoading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* ── TEAL HEADER ── */}
      <LinearGradient
        colors={[C.primary, '#4A8F98']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.headerGradient, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}
      >
        <View style={s.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [s.headerBtnLeft, pressed && { opacity: 0.7 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={20} color="rgba(255,255,255,0.9)" strokeWidth={2} />
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Update Measurements</Text>
            {infant && (
              <Text style={s.headerSub}>for {infant.name || 'Baby'}</Text>
            )}
          </View>
          <View style={s.headerBtnRight} />
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── LAST RECORDED ── */}
        {lastMeasurement ? (
          <View style={s.lastCard}>
            <Text style={s.lastCardTitle}>Last recorded</Text>
            <View style={s.lastRow}>
              <LastStat label="Date"   value={formatDate(lastMeasurement.measured_date)} />
              <View style={s.lastDivider} />
              <LastStat
                label="Weight"
                value={lastMeasurement.weight_g ? `${lastMeasurement.weight_g.toLocaleString()} g` : '—'}
              />
              <View style={s.lastDivider} />
              <LastStat
                label="Height"
                value={lastMeasurement.height_cm ? `${lastMeasurement.height_cm} cm` : '—'}
              />
            </View>
          </View>
        ) : (
          <View style={s.noDataCard}>
            <Text style={s.noDataText}>No measurements yet — this will be the first one!</Text>
          </View>
        )}

        {/* ── DATE ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Measurement Date</Text>
          <Text style={s.dateLabel}>{todayLabel}</Text>
          <View style={s.dateRow}>
            <TextInput
              style={s.dateInput}
              value={measDate}
              onChangeText={setMeasDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.labelPlaceholder}
              maxLength={10}
            />
            <Pressable
              style={({ pressed }) => [s.todayBtn, pressed && { opacity: 0.75 }]}
              onPress={() => setMeasDate(new Date().toISOString().split('T')[0])}
            >
              <Text style={s.todayBtnText}>Today</Text>
            </Pressable>
          </View>
        </View>

        {/* ── MEASUREMENT INPUTS ── */}
        <View style={s.measRow}>
          {/* Weight */}
          <View style={[s.measCard, { borderTopColor: C.primary }]}>
            <View style={s.measCardLabelRow}>
              <Scale size={14} color={C.primary} strokeWidth={1.8} />
              <Text style={s.measCardLabel}>Weight</Text>
            </View>
            <TextInput
              style={s.measInput}
              value={weightG}
              onChangeText={setWeightG}
              placeholder="6200"
              placeholderTextColor={C.labelPlaceholder}
              keyboardType="decimal-pad"
            />
            <Text style={s.measUnit}>grams</Text>
          </View>

          {/* Height */}
          <View style={[s.measCard, { borderTopColor: C.accent }]}>
            <View style={s.measCardLabelRow}>
              <Ruler size={14} color={C.accent} strokeWidth={1.8} />
              <Text style={s.measCardLabel}>Height</Text>
            </View>
            <TextInput
              style={s.measInput}
              value={heightCm}
              onChangeText={setHeightCm}
              placeholder="65.5"
              placeholderTextColor={C.labelPlaceholder}
              keyboardType="decimal-pad"
            />
            <Text style={s.measUnit}>cm</Text>
          </View>
        </View>

        {/* ── WEIGHT CHANGE HINT ── */}
        {weightChange !== null && (
          <Animated.View style={[s.weightHint, { opacity: fadeAnim }]}>
            <Text style={[s.weightHintText, { color: weightChange > 0 ? C.success : C.danger }]}>
              {weightChange > 0 ? '↑' : '↓'} {weightChange > 0 ? '+' : ''}
              {Math.round(weightChange)}g since last measurement
            </Text>
          </Animated.View>
        )}

        {/* ── NOTES ── */}
        <View style={s.section}>
          <View style={s.sectionLabelRow}>
            <StickyNote size={13} color={C.labelTertiary} strokeWidth={1.8} />
            <Text style={s.sectionLabel}>Notes (optional)</Text>
          </View>
          <TextInput
            style={s.notesBox}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. After clinic visit"
            placeholderTextColor={C.labelPlaceholder}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* ── TIPS ACCORDION ── */}
        <Pressable
          style={({ pressed }) => [s.tipsCard, pressed && { opacity: 0.85 }]}
          onPress={toggleTips}
        >
          <View style={s.tipsHeader}>
            <View style={s.tipsHeaderLeft}>
              <Info size={14} color={C.primary} strokeWidth={1.8} />
              <Text style={s.tipsTitle}>Tips for accurate measurement</Text>
            </View>
            {tipsExpanded
              ? <ChevronUp size={14} color={C.labelTertiary} strokeWidth={2} />
              : <ChevronDown size={14} color={C.labelTertiary} strokeWidth={2} />}
          </View>
          {tipsExpanded && (
            <View style={s.tipsList}>
              {[
                'Weigh baby without clothes if possible',
                'Measure at the same time each day',
                'Use the same scale each time',
                'Record immediately after clinic visits',
              ].map((tip, i) => (
                <View key={i} style={s.tipRow}>
                  <View style={s.tipDot} />
                  <Text style={s.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── FLOATING SAVE ── */}
      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.saveBtn, saving && { opacity: 0.7 }, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={s.saveBtnText}>Save Measurement</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function LastStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 10, color: C.labelTertiary, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: C.label }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },

  /* Header */
  headerGradient: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6 },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  headerBtnRight: { width: 60 },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xl },

  /* Last recorded */
  lastCard: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  lastCardTitle: {
    fontSize: 11, fontWeight: '700', color: C.labelTertiary,
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: Spacing.md,
  },
  lastRow: { flexDirection: 'row' },
  lastDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },
  noDataCard: {
    backgroundColor: C.primarySoft, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl, alignItems: 'center',
  },
  noDataText: { fontSize: 13, color: C.primary, fontWeight: '500', textAlign: 'center' },

  /* Section */
  section: { marginBottom: Spacing.xl },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: C.labelTertiary, letterSpacing: 0.5, textTransform: 'uppercase' },
  dateLabel: { fontSize: 17, fontWeight: '700', color: C.label, marginBottom: Spacing.md },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateInput: {
    flex: 1, height: 44, borderWidth: 1, borderColor: C.primary,
    borderRadius: Radius.md, paddingHorizontal: 14,
    backgroundColor: C.cardSecondary, color: C.label, fontSize: 15,
  },
  todayBtn: {
    height: 44, paddingHorizontal: 16,
    backgroundColor: C.primarySoft, borderWidth: 1, borderColor: C.primary,
    borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center',
  },
  todayBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },

  /* Measurement cards */
  measRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  measCard: {
    flex: 1, backgroundColor: C.card, borderRadius: Radius.xl,
    borderTopWidth: 3, padding: Spacing.lg,
    ...Shadows.sm,
  },
  measCardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing.sm },
  measCardLabel: { fontSize: 12, fontWeight: '700', color: C.labelTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  measInput: { fontSize: 28, fontWeight: '800', color: C.label, padding: 0 },
  measUnit: { fontSize: 11, color: C.labelTertiary, textAlign: 'right', marginTop: 4 },

  /* Weight hint */
  weightHint: { marginBottom: Spacing.md },
  weightHintText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },

  /* Notes */
  notesBox: {
    borderWidth: 1, borderColor: C.border, borderRadius: Radius.md,
    padding: 14, minHeight: 80,
    backgroundColor: C.cardSecondary, color: C.label, fontSize: 15,
  },

  /* Tips */
  tipsCard: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tipsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: C.label },
  tipsList: { marginTop: Spacing.md, gap: 8 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary, marginTop: 6 },
  tipText: { flex: 1, fontSize: 13, color: C.labelSecondary, lineHeight: 19 },

  /* Footer */
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 16,
  },
  saveBtn: {
    height: 56, width: '100%', borderRadius: Radius.full,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

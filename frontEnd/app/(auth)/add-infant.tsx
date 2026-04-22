import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const C = Colors.light;

const validateDate = (dateString: string): boolean => {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) return false;
  const [day, month, year] = dateString.split('/').map(Number);
  const dateObj = new Date(year, month - 1, day);
  if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) return false;
  const today = new Date();
  const age = today.getFullYear() - dateObj.getFullYear();
  const monthDiff = today.getMonth() - dateObj.getMonth();
  if (age > 3 || (age === 3 && monthDiff > 0)) return false;
  if (dateObj > today) return false;
  return true;
};

export default function AddInfantScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1
  const [babyName, setBabyName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [birthWeight, setBirthWeight] = useState('');
  const [birthHeight, setBirthHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [currentHeight, setCurrentHeight] = useState('');
  const [gestationalAge, setGestationalAge] = useState('40');

  // Step 2
  const [maternalAge, setMaternalAge] = useState('');
  const [maternalHeight, setMaternalHeight] = useState('');
  const [maternalWeight, setMaternalWeight] = useState('');
  const [sesLevel, setSesLevel] = useState<number | null>(null);
  const [nutritionQuality, setNutritionQuality] = useState<number | null>(null);
  const [isBreastfeeding, setIsBreastfeeding] = useState<boolean | null>(null);

  const router = useRouter();
  const { user } = useAuth();

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (babyName.trim().length === 0) newErrors.babyName = 'Baby name is required';
    if (!dateOfBirth.trim()) newErrors.dateOfBirth = 'Date of birth is required';
    else if (!validateDate(dateOfBirth)) newErrors.dateOfBirth = 'Enter a valid date (DD/MM/YYYY) within 3 years';
    if (!selectedGender) newErrors.gender = 'Please select a gender';
    if (birthWeight) { const bw = parseFloat(birthWeight); if (isNaN(bw) || bw < 0.5 || bw > 8.0) newErrors.birthWeight = 'Must be 0.5–8.0 kg'; }
    if (birthHeight) { const bh = parseFloat(birthHeight); if (isNaN(bh) || bh < 30 || bh > 65) newErrors.birthHeight = 'Must be 30–65 cm'; }
    if (currentWeight) { const cw = parseFloat(currentWeight); if (isNaN(cw) || cw < 0.5 || cw > 30.0) newErrors.currentWeight = 'Must be 0.5–30.0 kg'; }
    if (currentHeight) { const ch = parseFloat(currentHeight); if (isNaN(ch) || ch < 30 || ch > 110) newErrors.currentHeight = 'Must be 30–110 cm'; }
    if (!gestationalAge) newErrors.gestationalAge = 'Gestational age is required';
    else { const ga = parseInt(gestationalAge); if (isNaN(ga) || ga < 24 || ga > 44) newErrors.gestationalAge = 'Must be 24–44 weeks'; }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!maternalAge) newErrors.maternalAge = "Mother's age is required";
    else { const a = parseInt(maternalAge); if (isNaN(a) || a < 15 || a > 55) newErrors.maternalAge = 'Age must be 15–55'; }
    if (!maternalHeight) newErrors.maternalHeight = "Mother's height is required";
    else { const h = parseFloat(maternalHeight); if (isNaN(h) || h < 140 || h > 200) newErrors.maternalHeight = 'Height must be 140–200 cm'; }
    if (!maternalWeight) newErrors.maternalWeight = "Mother's weight is required";
    else { const w = parseFloat(maternalWeight); if (isNaN(w) || w < 35 || w > 150) newErrors.maternalWeight = 'Weight must be 35–150 kg'; }
    if (sesLevel === null) newErrors.sesLevel = 'Please select a socioeconomic level';
    if (nutritionQuality === null) newErrors.nutritionQuality = 'Please select nutrition quality';
    if (isBreastfeeding === null) newErrors.isBreastfeeding = 'Please select breastfeeding status';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateBMI = (): number | null => {
    if (maternalHeight && maternalWeight) {
      const h = parseFloat(maternalHeight) / 100;
      const w = parseFloat(maternalWeight);
      if (!isNaN(h) && !isNaN(w) && h > 0) return parseFloat((w / (h * h)).toFixed(2));
    }
    return null;
  };

  const handleNext = () => { if (validateStep1()) { setStep(2); setErrors({}); } };
  const handleBack = () => { setStep(1); setErrors({}); };

  const handleSave = async (isSkip: boolean = false) => {
    if (!isSkip && !validateStep2()) return;
    if (isSkip && !validateStep1()) return;
    if (!user) {
      setErrors({ form: 'Not signed in. Please sign up or sign in first.' });
      return;
    }
    setLoading(true);
    try {
      const [day, month, year] = dateOfBirth.split('/').map(Number);
      const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const payload = {
        parent_id: user.id,
        name: babyName.trim(),
        date_of_birth: formattedDate,
        gender: selectedGender,
        birth_weight_kg: birthWeight ? parseFloat(birthWeight) : null,
        birth_height_cm: birthHeight ? parseFloat(birthHeight) : null,
        current_weight_kg: currentWeight ? parseFloat(currentWeight) : null,
        current_height_cm: currentHeight ? parseFloat(currentHeight) : null,
        gestational_age_weeks: gestationalAge ? parseInt(gestationalAge) : null,
        maternal_age: isSkip || !maternalAge ? null : parseInt(maternalAge),
        maternal_height_cm: isSkip || !maternalHeight ? null : parseFloat(maternalHeight),
        maternal_bmi: isSkip ? null : calculateBMI(),
        ses_level: isSkip || sesLevel === null ? null : String(sesLevel),
        maternal_nutrition_quality: isSkip || nutritionQuality === null ? null : String(nutritionQuality),
        breastfeeding_status: isSkip ? null : isBreastfeeding,
        last_measurement_date: (currentWeight || currentHeight) ? new Date().toISOString().split('T')[0] : null,
      };
      console.log('[add-infant] inserting', payload);
      const { error } = await supabase.from('infants').insert(payload);
      if (error) {
        console.error('[add-infant] insert error', error);
        setErrors({ form: `${error.message}${error.hint ? ' — ' + error.hint : ''}` });
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      console.error('[add-infant] exception', e);
      setErrors({ form: e?.message ?? 'Failed to add baby. Please try again.' });
    }
    setLoading(false);
  };

  const genderOptions = [
    { value: 'male' as const, label: '👦 Boy' },
    { value: 'female' as const, label: '👧 Girl' },
    { value: 'other' as const, label: '👶 Other' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.stepLabel}>STEP {step} OF 2</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {step === 1 ? "Baby's Profile" : "Mother's Information"}
          </Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? "Let's set up your baby's profile to get started"
              : 'Help us provide better insights with some details about you'}
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {errors.form && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errors.form}</Text>
            </View>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <Field label="Baby's Name *" error={errors.babyName}>
                <TextInput
                  style={[styles.input, errors.babyName && styles.inputError]}
                  placeholder="e.g., Emma"
                  placeholderTextColor={C.labelTertiary}
                  autoCapitalize="words"
                  editable={!loading}
                  value={babyName}
                  onChangeText={setBabyName}
                />
              </Field>

              <Field label="Date of Birth (DD/MM/YYYY) *" error={errors.dateOfBirth}>
                <TextInput
                  style={[styles.input, errors.dateOfBirth && styles.inputError]}
                  placeholder="15/06/2023"
                  placeholderTextColor={C.labelTertiary}
                  keyboardType="numbers-and-punctuation"
                  editable={!loading}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />
              </Field>

              <Field label="Gender *" error={errors.gender}>
                <View style={styles.toggleGroup}>
                  {genderOptions.map(({ value, label }) => (
                    <TouchableOpacity
                      key={value}
                      style={[styles.toggleBtn, selectedGender === value && styles.toggleBtnActive]}
                      onPress={() => setSelectedGender(value)}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.toggleBtnText, selectedGender === value && styles.toggleBtnTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <View style={styles.sectionDivider} />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Growth Measurements</Text>
                <Text style={styles.sectionSubtitle}>Optional — add now or fill in later</Text>
              </View>

              <Field label="Gestational Age at Birth (weeks) *" error={errors.gestationalAge} hint="How many weeks was the pregnancy?">
                <TextInput
                  style={[styles.input, errors.gestationalAge && styles.inputError]}
                  placeholder="e.g. 40"
                  placeholderTextColor={C.labelTertiary}
                  keyboardType="number-pad"
                  editable={!loading}
                  value={gestationalAge}
                  onChangeText={setGestationalAge}
                />
              </Field>

              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <Field label="Birth Wt (kg)" error={errors.birthWeight}>
                    <TextInput style={[styles.input, errors.birthWeight && styles.inputError]} placeholder="3.2" placeholderTextColor={C.labelTertiary} keyboardType="decimal-pad" editable={!loading} value={birthWeight} onChangeText={setBirthWeight} />
                  </Field>
                </View>
                <View style={styles.gridItem}>
                  <Field label="Birth Ht (cm)" error={errors.birthHeight}>
                    <TextInput style={[styles.input, errors.birthHeight && styles.inputError]} placeholder="50.0" placeholderTextColor={C.labelTertiary} keyboardType="decimal-pad" editable={!loading} value={birthHeight} onChangeText={setBirthHeight} />
                  </Field>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <Field label="Current Wt (kg)" error={errors.currentWeight}>
                    <TextInput style={[styles.input, errors.currentWeight && styles.inputError]} placeholder="5.8" placeholderTextColor={C.labelTertiary} keyboardType="decimal-pad" editable={!loading} value={currentWeight} onChangeText={setCurrentWeight} />
                  </Field>
                </View>
                <View style={styles.gridItem}>
                  <Field label="Current Ht (cm)" error={errors.currentHeight}>
                    <TextInput style={[styles.input, errors.currentHeight && styles.inputError]} placeholder="60.0" placeholderTextColor={C.labelTertiary} keyboardType="decimal-pad" editable={!loading} value={currentHeight} onChangeText={setCurrentHeight} />
                  </Field>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <>
              <Field label="Mother's Age (years) *" error={errors.maternalAge}>
                <TextInput style={[styles.input, errors.maternalAge && styles.inputError]} placeholder="e.g. 28" placeholderTextColor={C.labelTertiary} keyboardType="number-pad" editable={!loading} value={maternalAge} onChangeText={setMaternalAge} />
              </Field>

              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <Field label="Height (cm) *" error={errors.maternalHeight}>
                    <TextInput style={[styles.input, errors.maternalHeight && styles.inputError]} placeholder="165" placeholderTextColor={C.labelTertiary} keyboardType="decimal-pad" editable={!loading} value={maternalHeight} onChangeText={setMaternalHeight} />
                  </Field>
                </View>
                <View style={styles.gridItem}>
                  <Field label="Weight (kg) *" error={errors.maternalWeight}>
                    <TextInput style={[styles.input, errors.maternalWeight && styles.inputError]} placeholder="65" placeholderTextColor={C.labelTertiary} keyboardType="decimal-pad" editable={!loading} value={maternalWeight} onChangeText={setMaternalWeight} />
                  </Field>
                </View>
              </View>

              <Field label="Socioeconomic Level *" error={errors.sesLevel}>
                <View style={styles.toggleGroup}>
                  {['Low', 'Medium', 'High'].map((status, index) => (
                    <TouchableOpacity key={status} style={[styles.toggleBtn, sesLevel === index && styles.toggleBtnActive]} onPress={() => setSesLevel(index)} disabled={loading} activeOpacity={0.8}>
                      <Text style={[styles.toggleBtnText, sesLevel === index && styles.toggleBtnTextActive]}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label="Maternal Nutrition Quality *" error={errors.nutritionQuality}>
                <View style={styles.toggleGroup}>
                  {['Poor', 'Adequate', 'Good'].map((status, index) => (
                    <TouchableOpacity key={status} style={[styles.toggleBtn, nutritionQuality === index && styles.toggleBtnActive]} onPress={() => setNutritionQuality(index)} disabled={loading} activeOpacity={0.8}>
                      <Text style={[styles.toggleBtnText, nutritionQuality === index && styles.toggleBtnTextActive]}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label="Breastfeeding *" error={errors.isBreastfeeding}>
                <View style={styles.toggleGroup}>
                  {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(({ label, value }) => (
                    <TouchableOpacity key={label} style={[styles.toggleBtn, isBreastfeeding === value && (value ? styles.toggleBtnActive : styles.toggleBtnDanger)]} onPress={() => setIsBreastfeeding(value)} disabled={loading} activeOpacity={0.8}>
                      <Text style={[styles.toggleBtnText, isBreastfeeding === value && (value ? styles.toggleBtnTextActive : styles.toggleBtnTextDanger)]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.secondaryButton, loading && styles.disabledButton]} onPress={handleBack} disabled={loading} activeOpacity={0.8}>
                  <ChevronLeft size={18} color={C.primary} strokeWidth={2} />
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, styles.flexButton, loading && styles.disabledButton]} onPress={() => handleSave(false)} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Let's Go!</Text>}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.skipButton} onPress={() => handleSave(true)} disabled={loading}>
                <Text style={styles.skipButtonText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* Small helper component to keep JSX clean */
function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
      {hint && !error && <Text style={fieldStyles.hint}>{hint}</Text>}
      {error && <Text style={fieldStyles.error}>{error}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.bodySmall.fontSize, fontWeight: '600', color: C.label, marginBottom: Spacing.sm },
  hint: { fontSize: Typography.caption.fontSize, color: C.labelTertiary, marginTop: 4 },
  error: { fontSize: Typography.caption.fontSize, color: C.danger, marginTop: 4 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 56,
    paddingBottom: 40,
  },

  // Progress
  progressContainer: { marginBottom: Spacing.xl },
  stepLabel: { fontSize: 11, fontWeight: '700', color: C.primary, letterSpacing: 1.2, marginBottom: Spacing.sm },
  progressTrack: { height: 4, backgroundColor: C.border, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: Radius.full },

  // Header
  header: { marginBottom: 28 },
  title: { fontSize: Typography.h1.fontSize, fontWeight: Typography.h1.fontWeight, color: C.label, marginBottom: 6, letterSpacing: Typography.h1.letterSpacing },
  subtitle: { fontSize: Typography.bodySmall.fontSize, color: C.labelTertiary, lineHeight: 20 },

  // Form Card
  formCard: { backgroundColor: C.card, borderRadius: Radius.xxl, padding: Spacing.xl, ...Shadows.md },
  errorBanner: { backgroundColor: Colors.light.dangerSoft, borderLeftWidth: 3, borderLeftColor: C.danger, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  errorText: { color: C.danger, fontSize: Typography.bodySmall.fontSize },

  // Fields
  input: { backgroundColor: C.cardSecondary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 14, fontSize: Typography.body.fontSize, color: C.label, borderWidth: 1.5, borderColor: 'transparent' },
  inputError: { borderColor: C.danger },

  // Section
  sectionDivider: { height: 1, backgroundColor: C.border, marginVertical: Spacing.xl },
  sectionHeader: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.h2.fontSize, fontWeight: Typography.h2.fontWeight, color: C.label, marginBottom: 2 },
  sectionSubtitle: { fontSize: Typography.caption.fontSize, color: C.labelTertiary },

  // Toggle Buttons
  toggleGroup: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.cardSecondary, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center' },
  toggleBtnActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
  toggleBtnDanger: { borderColor: C.danger, backgroundColor: C.dangerSoft },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: C.labelTertiary },
  toggleBtnTextActive: { color: C.primary },
  toggleBtnTextDanger: { color: C.danger },

  // Grid
  gridRow: { flexDirection: 'row', gap: 12 },
  gridItem: { flex: 1 },

  // Buttons
  primaryButton: { backgroundColor: C.primary, borderRadius: Radius.full, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm, ...Shadows.sm },
  primaryButtonText: { color: '#FFFFFF', fontSize: Typography.button.fontSize, fontWeight: Typography.button.fontWeight },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.border, paddingVertical: 14, paddingHorizontal: Spacing.lg, borderRadius: Radius.md, gap: 2 },
  secondaryButtonText: { color: C.primary, fontSize: Typography.body.fontSize, fontWeight: '600' },
  disabledButton: { opacity: 0.55 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: Spacing.sm },
  flexButton: { flex: 1, marginTop: 0 },
  skipButton: { paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm },
  skipButtonText: { color: C.labelTertiary, fontSize: Typography.bodySmall.fontSize, fontWeight: '500' },
});

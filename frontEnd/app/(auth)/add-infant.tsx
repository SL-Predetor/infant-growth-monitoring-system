import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// Theme Colors specified
const PROGRESS_THEME = {
  bg: '#1a1a2e',
  primary: '#6C63FF',
  cardBg: '#16213e',
  border: '#2a2d4e',
  muted: '#8892a4',
  label: '#a8b2c1',
  placeholder: '#4a5568',
  inputBg: '#0f1729',
};

export default function AddInfantScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 fields
  const [babyName, setBabyName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [birthWeight, setBirthWeight] = useState('');
  const [birthHeight, setBirthHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [currentHeight, setCurrentHeight] = useState('');
  const [gestationalAge, setGestationalAge] = useState('40');

  // Step 2 fields
  const [maternalAge, setMaternalAge] = useState('');
  const [maternalHeight, setMaternalHeight] = useState('');
  const [maternalWeight, setMaternalWeight] = useState('');
  const [sesLevel, setSesLevel] = useState<number | null>(null);
  const [nutritionQuality, setNutritionQuality] = useState<number | null>(null);
  const [isBreastfeeding, setIsBreastfeeding] = useState<boolean | null>(null);

  const router = useRouter();
  const { user } = useAuth();

  const validateDate = (dateString: string): boolean => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) return false;

    const [day, month, year] = dateString.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);

    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
      return false;
    }

    const today = new Date();
    const age = today.getFullYear() - dateObj.getFullYear();
    const monthDiff = today.getMonth() - dateObj.getMonth();

    if (age > 3 || (age === 3 && monthDiff > 0)) {
      return false;
    }

    if (dateObj > today) {
      return false;
    }

    return true;
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (babyName.trim().length === 0) {
      newErrors.babyName = 'Baby name is required';
    }

    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else if (!validateDate(dateOfBirth)) {
      newErrors.dateOfBirth = 'Please enter a valid past Date of Birth (DD/MM/YYYY) within 3 years';
    }

    if (!selectedGender) {
      newErrors.gender = 'Please select a gender';
    }

    if (birthWeight) {
      const bw = parseFloat(birthWeight);
      if (isNaN(bw) || bw < 0.5 || bw > 8.0) {
        newErrors.birthWeight = 'Birth weight must be between 0.5 and 8.0 kg';
      }
    }
    if (birthHeight) {
      const bh = parseFloat(birthHeight);
      if (isNaN(bh) || bh < 30 || bh > 65) {
        newErrors.birthHeight = 'Birth height must be between 30 and 65 cm';
      }
    }
    if (currentWeight) {
      const cw = parseFloat(currentWeight);
      if (isNaN(cw) || cw < 0.5 || cw > 30.0) {
        newErrors.currentWeight = 'Current weight must be between 0.5 and 30.0 kg';
      }
    }
    if (currentHeight) {
      const ch = parseFloat(currentHeight);
      if (isNaN(ch) || ch < 30 || ch > 110) {
        newErrors.currentHeight = 'Current height must be between 30 and 110 cm';
      }
    }
    if (gestationalAge) {
      const ga = parseInt(gestationalAge);
      if (isNaN(ga) || ga < 24 || ga > 44) {
        newErrors.gestationalAge = 'Gestational age must be between 24 and 44 weeks';
      }
    } else {
      newErrors.gestationalAge = 'Gestational age is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!maternalAge) {
      newErrors.maternalAge = "Mother's age is required";
    } else {
      const age = parseInt(maternalAge);
      if (isNaN(age) || age < 15 || age > 55) {
        newErrors.maternalAge = 'Age must be between 15 and 55';
      }
    }

    if (!maternalHeight) {
      newErrors.maternalHeight = "Mother's height is required";
    } else {
      const height = parseFloat(maternalHeight);
      if (isNaN(height) || height < 140 || height > 200) {
        newErrors.maternalHeight = 'Height must be between 140 and 200 cm';
      }
    }

    if (!maternalWeight) {
      newErrors.maternalWeight = "Mother's weight is required";
    } else {
      const weight = parseFloat(maternalWeight);
      if (isNaN(weight) || weight < 35 || weight > 150) {
        newErrors.maternalWeight = 'Weight must be between 35 and 150 kg';
      }
    }

    if (sesLevel === null) {
      newErrors.sesLevel = 'Please select a socioeconomic level';
    }

    if (nutritionQuality === null) {
      newErrors.nutritionQuality = 'Please select maternal nutrition quality';
    }

    if (isBreastfeeding === null) {
      newErrors.isBreastfeeding = 'Please select breastfeeding status';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateBMI = (): number | null => {
    if (maternalHeight && maternalWeight) {
      const hStr = parseFloat(maternalHeight) / 100;
      const wStr = parseFloat(maternalWeight);
      if (!isNaN(hStr) && !isNaN(wStr) && hStr > 0) {
        return parseFloat((wStr / (hStr * hStr)).toFixed(2));
      }
    }
    return null;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
      setErrors({});
    }
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
  };

  const handleSave = async (isSkip: boolean = false) => {
    if (!isSkip && !validateStep2()) return;
    if (isSkip && !validateStep1()) return;
    if (!user) return;

    setLoading(true);
    try {
      const [day, month, year] = dateOfBirth.split('/').map(Number);
      const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const calculatedBMI = isSkip ? null : calculateBMI();

      const { error } = await supabase.from('infants').insert({
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
        maternal_bmi: calculatedBMI,
        ses_level: isSkip ? null : sesLevel,
        maternal_nutrition_quality: isSkip ? null : nutritionQuality,
        breastfeeding_status: isSkip ? null : isBreastfeeding,
        last_measurement_date: (currentWeight || currentHeight)
          ? new Date().toISOString().split('T')[0]
          : null,
      });

      if (error) {
        setErrors({ form: error.message });
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      setErrors({ form: 'Failed to add baby. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: PROGRESS_THEME.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <ThemedText style={styles.stepLabel}>STEP {step} OF 2</ThemedText>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: step === 1 ? '50%' : '100%' }]} />
          </View>
        </View>

        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.title}>
            {step === 1 ? "Baby's Profile" : "Mother's Information"}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {step === 1
              ? "Let's set up your baby's profile to get started"
              : "Help us provide better insights with some details about you"}
          </ThemedText>
        </View>

        <View style={styles.formSection}>
          {errors.form && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{errors.form}</ThemedText>
            </View>
          )}

          {step === 1 && (
            <>
              <View style={styles.fieldContainer}>
                <ThemedText style={styles.label}>Baby's Name *</ThemedText>
                <TextInput
                  style={[styles.input, errors.babyName && styles.inputError]}
                  placeholder="e.g., Emma"
                  placeholderTextColor={PROGRESS_THEME.placeholder}
                  autoCapitalize="words"
                  editable={!loading}
                  value={babyName}
                  onChangeText={setBabyName}
                />
                {errors.babyName && <ThemedText style={styles.fieldError}>{errors.babyName}</ThemedText>}
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.label}>Date of Birth (DD/MM/YYYY) *</ThemedText>
                <TextInput
                  style={[styles.input, errors.dateOfBirth && styles.inputError]}
                  placeholder="15/06/2023"
                  placeholderTextColor={PROGRESS_THEME.placeholder}
                  keyboardType="numbers-and-punctuation"
                  editable={!loading}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />
                {errors.dateOfBirth && <ThemedText style={styles.fieldError}>{errors.dateOfBirth}</ThemedText>}
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.label}>Gender *</ThemedText>
                <View style={styles.buttonGroup}>
                  {(['male', 'female', 'other'] as const).map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.toggleButton,
                        selectedGender === gender && styles.toggleButtonSelected,
                      ]}
                      onPress={() => setSelectedGender(gender)}
                      disabled={loading}
                    >
                      <ThemedText
                        style={[
                          styles.toggleButtonText,
                          selectedGender === gender && styles.toggleButtonTextSelected,
                        ]}
                      >
                        {gender === 'male' ? '👦 Boy' : gender === 'female' ? '👧 Girl' : '👶 Other'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.gender && <ThemedText style={styles.fieldError}>{errors.gender}</ThemedText>}
              </View>

              <View style={styles.divider} />

              <View style={styles.optionalSection}>
                <ThemedText style={styles.optionalTitle}>📏 Growth Measurements (Optional)</ThemedText>
                <ThemedText style={styles.optionalSubtitle}>Add now or fill in later from your profile</ThemedText>
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.label}>Gestational Age at Birth (weeks) *</ThemedText>
                <TextInput
                  style={[styles.input, errors.gestationalAge && styles.inputError]}
                  placeholder="e.g. 40"
                  placeholderTextColor={PROGRESS_THEME.placeholder}
                  keyboardType="number-pad"
                  editable={!loading}
                  value={gestationalAge}
                  onChangeText={setGestationalAge}
                />
                <ThemedText style={styles.fieldHint}>How many weeks was the pregnancy?</ThemedText>
                {errors.gestationalAge && <ThemedText style={styles.fieldError}>{errors.gestationalAge}</ThemedText>}
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <ThemedText style={[styles.label, { opacity: 0.8 }]}>Birth Wt (kg)</ThemedText>
                  <TextInput
                    style={[styles.input, errors.birthWeight && styles.inputError]}
                    placeholder="e.g. 3.2"
                    placeholderTextColor={PROGRESS_THEME.placeholder}
                    keyboardType="decimal-pad"
                    editable={!loading}
                    value={birthWeight}
                    onChangeText={setBirthWeight}
                  />
                  {errors.birthWeight && <ThemedText style={styles.fieldError}>{errors.birthWeight}</ThemedText>}
                </View>
                <View style={styles.gridItem}>
                  <ThemedText style={[styles.label, { opacity: 0.8 }]}>Birth Ht (cm)</ThemedText>
                  <TextInput
                    style={[styles.input, errors.birthHeight && styles.inputError]}
                    placeholder="e.g. 50.0"
                    placeholderTextColor={PROGRESS_THEME.placeholder}
                    keyboardType="decimal-pad"
                    editable={!loading}
                    value={birthHeight}
                    onChangeText={setBirthHeight}
                  />
                  {errors.birthHeight && <ThemedText style={styles.fieldError}>{errors.birthHeight}</ThemedText>}
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <ThemedText style={[styles.label, { opacity: 0.8 }]}>Current Wt (kg)</ThemedText>
                  <TextInput
                    style={[styles.input, errors.currentWeight && styles.inputError]}
                    placeholder="e.g. 5.8"
                    placeholderTextColor={PROGRESS_THEME.placeholder}
                    keyboardType="decimal-pad"
                    editable={!loading}
                    value={currentWeight}
                    onChangeText={setCurrentWeight}
                  />
                  {errors.currentWeight && <ThemedText style={styles.fieldError}>{errors.currentWeight}</ThemedText>}
                </View>
                <View style={styles.gridItem}>
                  <ThemedText style={[styles.label, { opacity: 0.8 }]}>Current Ht (cm)</ThemedText>
                  <TextInput
                    style={[styles.input, errors.currentHeight && styles.inputError]}
                    placeholder="e.g. 60.0"
                    placeholderTextColor={PROGRESS_THEME.placeholder}
                    keyboardType="decimal-pad"
                    editable={!loading}
                    value={currentHeight}
                    onChangeText={setCurrentHeight}
                  />
                  {errors.currentHeight && <ThemedText style={styles.fieldError}>{errors.currentHeight}</ThemedText>}
                </View>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                <ThemedText style={styles.primaryButtonText}>Next →</ThemedText>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <View style={styles.fieldContainer}>
                <ThemedText style={styles.label}>Mother's Age (years) *</ThemedText>
                <TextInput
                  style={[styles.input, errors.maternalAge && styles.inputError]}
                  placeholder="e.g. 28"
                  placeholderTextColor={PROGRESS_THEME.placeholder}
                  keyboardType="number-pad"
                  editable={!loading}
                  value={maternalAge}
                  onChangeText={setMaternalAge}
                />
                {errors.maternalAge && <ThemedText style={styles.fieldError}>{errors.maternalAge}</ThemedText>}
              </View>

              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <ThemedText style={styles.label}>Height (cm) *</ThemedText>
                  <TextInput
                    style={[styles.input, errors.maternalHeight && styles.inputError]}
                    placeholder="e.g. 165"
                    placeholderTextColor={PROGRESS_THEME.placeholder}
                    keyboardType="decimal-pad"
                    editable={!loading}
                    value={maternalHeight}
                    onChangeText={setMaternalHeight}
                  />
                  {errors.maternalHeight && <ThemedText style={styles.fieldError}>{errors.maternalHeight}</ThemedText>}
                </View>
                <View style={styles.gridItem}>
                  <ThemedText style={styles.label}>Weight (kg) *</ThemedText>
                  <TextInput
                    style={[styles.input, errors.maternalWeight && styles.inputError]}
                    placeholder="e.g. 65"
                    placeholderTextColor={PROGRESS_THEME.placeholder}
                    keyboardType="decimal-pad"
                    editable={!loading}
                    value={maternalWeight}
                    onChangeText={setMaternalWeight}
                  />
                  {errors.maternalWeight && <ThemedText style={styles.fieldError}>{errors.maternalWeight}</ThemedText>}
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.label}>Socioeconomic Level *</ThemedText>
                <View style={styles.buttonGroup}>
                  {['Low', 'Medium', 'High'].map((status, index) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.toggleButton,
                        sesLevel === index && styles.toggleButtonSelected,
                      ]}
                      onPress={() => setSesLevel(index)}
                      disabled={loading}
                    >
                      <ThemedText
                        style={[
                          styles.toggleButtonText,
                          sesLevel === index && styles.toggleButtonTextSelected,
                        ]}
                      >
                        {status}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.sesLevel && <ThemedText style={styles.fieldError}>{errors.sesLevel}</ThemedText>}
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.label}>Maternal Nutrition Quality *</ThemedText>
                <View style={styles.buttonGroup}>
                  {['Poor', 'Adequate', 'Good'].map((status, index) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.toggleButton,
                        nutritionQuality === index && styles.toggleButtonSelected,
                      ]}
                      onPress={() => setNutritionQuality(index)}
                      disabled={loading}
                    >
                      <ThemedText
                        style={[
                          styles.toggleButtonText,
                          nutritionQuality === index && styles.toggleButtonTextSelected,
                        ]}
                      >
                        {status}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.nutritionQuality && <ThemedText style={styles.fieldError}>{errors.nutritionQuality}</ThemedText>}
              </View>

              <View style={styles.fieldContainer}>
                <ThemedText style={styles.label}>Breastfeeding *</ThemedText>
                <View style={styles.buttonGroup}>
                  {['Yes', 'No'].map((status, index) => {
                    const isYes = status === 'Yes';
                    const isSelected = isBreastfeeding === isYes;
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.toggleButton,
                          isSelected && (isYes ? styles.toggleButtonSelected : styles.toggleButtonSelectedNo),
                        ]}
                        onPress={() => setIsBreastfeeding(isYes)}
                        disabled={loading}
                      >
                        <ThemedText
                          style={[
                            styles.toggleButtonText,
                            isSelected && (isYes ? styles.toggleButtonTextSelected : styles.toggleButtonTextSelectedNo),
                          ]}
                        >
                          {status}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.isBreastfeeding && <ThemedText style={styles.fieldError}>{errors.isBreastfeeding}</ThemedText>}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, loading && styles.disabledButton]}
                  onPress={handleBack}
                  disabled={loading}
                >
                  <ThemedText style={styles.secondaryButtonText}>← Back</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, styles.flexButton, loading && styles.disabledButton]}
                  onPress={() => handleSave(false)}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#102216" /> : <ThemedText style={styles.primaryButtonText}>Let's Go!</ThemedText>}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => handleSave(true)}
                disabled={loading}
              >
                <ThemedText style={styles.skipButtonText}>Skip for now</ThemedText>
              </TouchableOpacity>
            </>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  progressContainer: {
    marginBottom: 24,
  },
  stepLabel: {
    color: PROGRESS_THEME.primary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: PROGRESS_THEME.inputBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PROGRESS_THEME.primary,
    borderRadius: 3,
  },
  headerContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    color: '#ffffff',
  },
  formSection: {
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 13,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: PROGRESS_THEME.label,
  },
  fieldHint: {
    fontSize: 12,
    color: PROGRESS_THEME.muted,
    marginTop: 4,
  },
  input: {
    backgroundColor: PROGRESS_THEME.inputBg,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: PROGRESS_THEME.border,
    color: '#ffffff',
  },
  inputError: {
    borderColor: '#FF5252',
  },
  fieldError: {
    color: '#FF5252',
    fontSize: 12,
    marginTop: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: PROGRESS_THEME.border,
    backgroundColor: PROGRESS_THEME.inputBg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonSelected: {
    borderColor: PROGRESS_THEME.primary,
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: PROGRESS_THEME.muted,
    textAlign: 'center',
  },
  toggleButtonTextSelected: {
    color: PROGRESS_THEME.primary,
  },
  toggleButtonSelectedNo: {
    borderColor: '#FF5252',
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
  },
  toggleButtonTextSelectedNo: {
    color: '#FF5252',
  },
  divider: {
    height: 1,
    backgroundColor: PROGRESS_THEME.border,
    marginVertical: 24,
  },
  optionalSection: {
    marginBottom: 20,
  },
  optionalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#ffffff',
  },
  optionalSubtitle: {
    fontSize: 13,
    color: PROGRESS_THEME.muted,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: PROGRESS_THEME.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  flexButton: {
    flex: 1,
    marginTop: 0,
  },
  secondaryButton: {
    backgroundColor: PROGRESS_THEME.inputBg,
    borderWidth: 1,
    borderColor: PROGRESS_THEME.border,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  skipButtonText: {
    color: PROGRESS_THEME.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});

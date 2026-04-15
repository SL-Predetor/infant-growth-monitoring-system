import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  Pressable, ActivityIndicator, Alert,
  ScrollView, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Lock, Camera } from 'lucide-react-native';
import { useAuth, Infant } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const C = Colors.light;

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, profile, fetchProfile } = useAuth();

  const [fullName, setFullName]           = useState(profile?.full_name ?? '');
  const [bio, setBio]                     = useState(profile?.bio ?? '');
  const [avatarUri, setAvatarUri]         = useState<string | null>(profile?.avatar_url ?? null);

  const [infant, setInfant]                   = useState<Infant | null>(null);
  const [babyName, setBabyName]               = useState('');
  const [birthWeight, setBirthWeight]         = useState('');
  const [birthHeight, setBirthHeight]         = useState('');
  const [currentWeight, setCurrentWeight]     = useState('');
  const [currentHeight, setCurrentHeight]     = useState('');
  const [maternalAge, setMaternalAge]         = useState('');
  const [maternalBmi, setMaternalBmi]         = useState('');
  const [sesLevel, setSesLevel]               = useState<number | null>(null);
  const [nutritionQuality, setNutritionQuality] = useState<number | null>(null);
  const [isBreastfeeding, setIsBreastfeeding] = useState<boolean | null>(null);
  const [loadingInfant, setLoadingInfant]     = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  useEffect(() => { fetchInfant(); }, []);

  const fetchInfant = async () => {
    if (!user) { setLoadingInfant(false); return; }
    try {
      const { data } = await supabase
        .from('infants')
        .select('id, name, date_of_birth, gender, birth_weight_kg, birth_height_cm, current_weight_kg, current_height_cm, last_measurement_date, maternal_age, maternal_bmi, ses_level, maternal_nutrition_quality, breastfeeding_status')
        .eq('parent_id', user.id)
        .limit(1).maybeSingle();
      if (data) {
        const d = data as Infant;
        setInfant(d);
        setBabyName(d.name ?? '');
        setBirthWeight(d.birth_weight_kg != null ? String(d.birth_weight_kg) : '');
        setBirthHeight(d.birth_height_cm != null ? String(d.birth_height_cm) : '');
        setCurrentWeight(d.current_weight_kg != null ? String(d.current_weight_kg) : '');
        setCurrentHeight(d.current_height_cm != null ? String(d.current_height_cm) : '');
        setMaternalAge(d.maternal_age != null ? String(d.maternal_age) : '');
        setMaternalBmi(d.maternal_bmi != null ? String(d.maternal_bmi) : '');
        setSesLevel(d.ses_level);
        setNutritionQuality(d.maternal_nutrition_quality);
        setIsBreastfeeding(d.breastfeeding_status);
      }
    } catch { /* no infant found */ }
    finally { setLoadingInfant(false); }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      const parts = name.trim().split(' ').filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0]?.[0]?.toUpperCase() || 'U';
    }
    return email?.[0]?.toUpperCase() ?? 'U';
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const pickedUri = result.assets[0].uri;
    try {
      const response = await fetch(pickedUri);
      const blob = await response.blob();
      const filePath = `${user?.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars').upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) { Alert.alert('Photo Upload', 'Upload coming soon'); return; }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (urlData?.publicUrl) {
        setAvatarUri(urlData.publicUrl);
        await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user?.id);
      }
    } catch { Alert.alert('Photo Upload', 'Upload coming soon'); }
  };

  const handleSave = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.'); return;
    }
    if (bio.length > 150) { setError('Bio must be 150 characters or less.'); return; }
    if (birthWeight) {
      const bw = parseFloat(birthWeight);
      if (isNaN(bw) || bw < 0.5 || bw > 8.0) { setError('Birth weight must be 0.5 – 8.0 kg'); return; }
    }
    if (birthHeight) {
      const bh = parseFloat(birthHeight);
      if (isNaN(bh) || bh < 30 || bh > 65) { setError('Birth height must be 30 – 65 cm'); return; }
    }
    if (currentWeight) {
      const cw = parseFloat(currentWeight);
      if (isNaN(cw) || cw < 0.5 || cw > 30.0) { setError('Current weight must be 0.5 – 30.0 kg'); return; }
    }
    if (currentHeight) {
      const ch = parseFloat(currentHeight);
      if (isNaN(ch) || ch < 30 || ch > 110) { setError('Current height must be 30 – 110 cm'); return; }
    }
    if (maternalAge) {
      const ma = parseInt(maternalAge);
      if (isNaN(ma) || ma < 15 || ma > 55) { setError('Maternal age must be 15 – 55'); return; }
    }
    try {
      setSaving(true); setError(null);
      const updates: Promise<any>[] = [];
      updates.push(
        supabase.from('profiles')
          .update({ full_name: fullName.trim(), bio: bio.trim() || null })
          .eq('id', user?.id)
          .then(r => { if (r.error) throw r.error; })
      );
      if (infant?.id) {
        updates.push(
          supabase.from('infants').update({
            name: babyName.trim(),
            birth_weight_kg: birthWeight ? parseFloat(birthWeight) : null,
            birth_height_cm: birthHeight ? parseFloat(birthHeight) : null,
            current_weight_kg: currentWeight ? parseFloat(currentWeight) : null,
            current_height_cm: currentHeight ? parseFloat(currentHeight) : null,
            maternal_age: maternalAge ? parseInt(maternalAge) : null,
            maternal_bmi: maternalBmi ? parseFloat(maternalBmi) : null,
            ses_level: sesLevel,
            maternal_nutrition_quality: nutritionQuality,
            breastfeeding_status: isBreastfeeding,
            last_measurement_date: (currentWeight || currentHeight)
              ? new Date().toISOString().split('T')[0] : null,
          }).eq('id', infant.id).eq('parent_id', user?.id)
          .then(r => { if (r.error) throw r.error; })
        );
      }
      await Promise.all(updates);
      await fetchProfile();
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatGender = (g: string) => {
    if (g === 'male') return '👦 Boy';
    if (g === 'female') return '👧 Girl';
    return '👶 Other';
  };

  if (loadingInfant) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.loader}><ActivityIndicator size="large" color={C.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={20} color={C.label} strokeWidth={2} />
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <Text style={s.headerTitle}>Edit Profile</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Avatar ── */}
          <View style={s.avatarSection}>
            <Pressable onPress={pickImage} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatar} />
              ) : (
                <View style={s.avatarCircle}>
                  <Text style={s.avatarInitials}>
                    {getInitials(fullName || profile?.full_name, user?.email)}
                  </Text>
                </View>
              )}
              <View style={s.cameraOverlay}>
                <Camera size={12} color="#FFF" strokeWidth={2} />
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.changePhotoBtn, pressed && { opacity: 0.7 }]}
              onPress={pickImage}
            >
              <Text style={s.changePhotoText}>Change Photo</Text>
            </Pressable>
          </View>

          {/* ── ACCOUNT ── */}
          <SectionHeader title="Account" />

          <FieldGroup label="Your Name">
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={C.labelPlaceholder}
              autoCapitalize="words"
            />
          </FieldGroup>

          <FieldGroup label="Email">
            <View style={s.lockedRow}>
              <Lock size={13} color={C.labelTertiary} strokeWidth={2} />
              <Text style={s.lockedText}>{user?.email}</Text>
            </View>
            <Text style={s.lockedHint}>Cannot be changed</Text>
          </FieldGroup>

          <FieldGroup label="Bio">
            <TextInput
              style={[s.input, s.bioInput]}
              value={bio}
              onChangeText={t => setBio(t.slice(0, 150))}
              placeholder="A little about yourself…"
              placeholderTextColor={C.labelPlaceholder}
              multiline maxLength={150}
            />
            <Text style={s.charCount}>{bio.length}/150</Text>
          </FieldGroup>

          {infant && (
            <>
              <View style={s.divider} />

              {/* ── BABY PROFILE ── */}
              <SectionHeader title="Baby's Profile" />

              <FieldGroup label="Baby's Name">
                <TextInput
                  style={s.input}
                  value={babyName}
                  onChangeText={setBabyName}
                  placeholder="Enter baby's name"
                  placeholderTextColor={C.labelPlaceholder}
                  autoCapitalize="words"
                />
              </FieldGroup>

              <FieldGroup label="Date of Birth">
                <View style={s.lockedRow}>
                  <Lock size={13} color={C.labelTertiary} strokeWidth={2} />
                  <Text style={s.lockedText}>{formatDate(infant.date_of_birth)}</Text>
                </View>
                <Text style={s.lockedHint}>Contact support to change</Text>
              </FieldGroup>

              <FieldGroup label="Gender">
                <View style={s.lockedRow}>
                  <Lock size={13} color={C.labelTertiary} strokeWidth={2} />
                  <Text style={s.lockedText}>{formatGender(infant.gender)}</Text>
                </View>
              </FieldGroup>

              <SubSectionHeader title="Birth Measurements" />
              <View style={s.gridRow}>
                <View style={s.gridItem}>
                  <FieldGroup label="Weight (kg)">
                    <TextInput
                      style={s.input}
                      value={birthWeight}
                      onChangeText={setBirthWeight}
                      placeholder="e.g. 3.2"
                      placeholderTextColor={C.labelPlaceholder}
                      keyboardType="decimal-pad"
                    />
                  </FieldGroup>
                </View>
                <View style={s.gridItem}>
                  <FieldGroup label="Height (cm)">
                    <TextInput
                      style={s.input}
                      value={birthHeight}
                      onChangeText={setBirthHeight}
                      placeholder="e.g. 50.0"
                      placeholderTextColor={C.labelPlaceholder}
                      keyboardType="decimal-pad"
                    />
                  </FieldGroup>
                </View>
              </View>

              <SubSectionHeader
                title="Latest Measurements"
                sub="Update regularly for accurate growth tracking"
              />
              <View style={s.gridRow}>
                <View style={s.gridItem}>
                  <FieldGroup label="Weight (kg)">
                    <TextInput
                      style={s.input}
                      value={currentWeight}
                      onChangeText={setCurrentWeight}
                      placeholder="e.g. 5.8"
                      placeholderTextColor={C.labelPlaceholder}
                      keyboardType="decimal-pad"
                    />
                  </FieldGroup>
                </View>
                <View style={s.gridItem}>
                  <FieldGroup label="Height (cm)">
                    <TextInput
                      style={s.input}
                      value={currentHeight}
                      onChangeText={setCurrentHeight}
                      placeholder="e.g. 60.0"
                      placeholderTextColor={C.labelPlaceholder}
                      keyboardType="decimal-pad"
                    />
                  </FieldGroup>
                </View>
              </View>

              <View style={s.divider} />

              {/* ── MOTHER'S PROFILE ── */}
              <SectionHeader title="Mother's Profile" />

              <View style={s.gridRow}>
                <View style={s.gridItem}>
                  <FieldGroup label="Your Age">
                    <TextInput
                      style={s.input}
                      value={maternalAge}
                      onChangeText={setMaternalAge}
                      placeholder="e.g. 28"
                      placeholderTextColor={C.labelPlaceholder}
                      keyboardType="number-pad"
                    />
                  </FieldGroup>
                </View>
                <View style={s.gridItem}>
                  <FieldGroup label="Your BMI">
                    <TextInput
                      style={s.input}
                      value={maternalBmi}
                      onChangeText={setMaternalBmi}
                      placeholder="e.g. 22.5"
                      placeholderTextColor={C.labelPlaceholder}
                      keyboardType="decimal-pad"
                    />
                  </FieldGroup>
                </View>
              </View>

              <FieldGroup label="Household Income Level">
                <PillToggle
                  options={['Low', 'Medium', 'High']}
                  selected={sesLevel}
                  onSelect={setSesLevel}
                />
              </FieldGroup>

              <FieldGroup label="Diet Quality">
                <PillToggle
                  options={['Poor', 'Adequate', 'Good']}
                  selected={nutritionQuality}
                  onSelect={setNutritionQuality}
                />
              </FieldGroup>

              <FieldGroup label="Breastfeeding">
                <View style={s.pillRow}>
                  {(['Yes', 'No'] as const).map(opt => {
                    const isYes = opt === 'Yes';
                    const active = isBreastfeeding === isYes;
                    return (
                      <Pressable
                        key={opt}
                        style={[s.pill, active && s.pillActive]}
                        onPress={() => setIsBreastfeeding(isYes)}
                      >
                        <Text style={[s.pillText, active && s.pillTextActive]}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FieldGroup>
            </>
          )}

          {/* ── Error ── */}
          {!!error && <Text style={s.errorText}>{error}</Text>}

          {/* ── Save Button ── */}
          <Pressable
            style={({ pressed }) => [s.saveBtn, saving && { opacity: 0.65 }, pressed && { opacity: 0.85 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#FFF" />
              : <Text style={s.saveBtnText}>Save Changes</Text>}
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── Sub-components ── */
function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={s.sectionHeader}>{title.toUpperCase()}</Text>
  );
}

function SubSectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginTop: 12, marginBottom: sub ? 4 : 12 }}>
      <Text style={s.subSectionTitle}>{title}</Text>
      {sub && <Text style={s.subSectionSub}>{sub}</Text>}
    </View>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function PillToggle({ options, selected, onSelect }: {
  options: string[];
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  return (
    <View style={s.pillRow}>
      {options.map((opt, i) => (
        <Pressable
          key={opt}
          style={[s.pill, selected === i && s.pillActive]}
          onPress={() => onSelect(i)}
        >
          <Text style={[s.pillText, selected === i && s.pillTextActive]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.background,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4 },
  backText: { fontSize: 15, color: C.label, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.label, letterSpacing: -0.3 },

  /* Scroll */
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: Spacing.xl, paddingBottom: 40 },

  /* Avatar */
  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: C.primarySoft,
  },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  avatarInitials: { fontSize: 34, fontWeight: '700', color: '#FFF' },
  cameraOverlay: {
    position: 'absolute', bottom: 2, right: 2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: C.background,
  },
  changePhotoBtn: { marginTop: 8 },
  changePhotoText: { fontSize: 14, fontWeight: '600', color: C.primary },

  /* Divider */
  divider: { height: 1, backgroundColor: C.border, marginVertical: Spacing.xl },

  /* Section headers */
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: C.labelTertiary,
    letterSpacing: 0.8, marginBottom: Spacing.md, marginTop: 4,
  },
  subSectionTitle: { fontSize: 14, fontWeight: '700', color: C.label },
  subSectionSub: { fontSize: 12, color: C.labelTertiary, marginTop: 2, marginBottom: 10 },

  /* Field group */
  fieldGroup: { marginBottom: Spacing.lg },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: C.labelSecondary, marginBottom: 8 },

  /* Input */
  input: {
    backgroundColor: C.cardSecondary,
    borderWidth: 1, borderColor: C.border,
    borderRadius: Radius.md, padding: 14,
    fontSize: 16, color: C.label,
  },
  bioInput: { height: 90, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: C.labelTertiary, textAlign: 'right', marginTop: 4 },

  /* Locked field */
  lockedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.cardSecondary, borderRadius: Radius.md,
    padding: 14,
  },
  lockedText: { flex: 1, fontSize: 15, color: C.labelSecondary },
  lockedHint: { fontSize: 11, color: C.labelTertiary, marginTop: 4, fontStyle: 'italic' },

  /* Grid */
  gridRow: { flexDirection: 'row', gap: 12 },
  gridItem: { flex: 1 },

  /* Pills (toggle group) */
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1, paddingVertical: 11,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: Radius.md, alignItems: 'center',
    backgroundColor: C.cardSecondary,
  },
  pillActive: {
    borderColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  pillText: { fontSize: 13, fontWeight: '600', color: C.labelTertiary },
  pillTextActive: { color: C.primary },

  /* Error */
  errorText: {
    fontSize: 13, color: C.danger,
    textAlign: 'center', marginBottom: Spacing.md,
  },

  /* Save */
  saveBtn: {
    height: 54, borderRadius: Radius.full,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    marginTop: Spacing.md,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
    ...Shadows.sm,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

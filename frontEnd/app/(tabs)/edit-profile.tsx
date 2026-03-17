import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth-context';
import { Infant } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const THEME = {
    bg: '#1a1a2e',
    primary: '#6C63FF',
    surface: '#16213e',
    text: '#FFFFFF',
    secondaryText: '#a0a0b8',
    error: '#ef5350',
    border: '#2a2a4a',
    locked: '#3a3a5a',
};

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, profile, fetchProfile } = useAuth();

    // Form state
    const [fullName, setFullName] = useState(profile?.full_name ?? '');
    const [bio, setBio] = useState(profile?.bio ?? '');
    const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);

    // Infant state
    const [infant, setInfant] = useState<Infant | null>(null);
    const [babyName, setBabyName] = useState('');
    const [birthWeight, setBirthWeight] = useState('');
    const [birthHeight, setBirthHeight] = useState('');
    const [currentWeight, setCurrentWeight] = useState('');
    const [currentHeight, setCurrentHeight] = useState('');
    const [maternalAge, setMaternalAge] = useState('');
    const [maternalBmi, setMaternalBmi] = useState('');
    const [sesLevel, setSesLevel] = useState<number | null>(null);
    const [nutritionQuality, setNutritionQuality] = useState<number | null>(null);
    const [isBreastfeeding, setIsBreastfeeding] = useState<boolean | null>(null);
    const [loadingInfant, setLoadingInfant] = useState(true);

    // Save state
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchInfant();
    }, []);

    const fetchInfant = async () => {
        if (!user) {
            setLoadingInfant(false);
            return;
        }
        try {
            const { data } = await supabase
                .from('infants')
                .select('id, name, date_of_birth, gender, birth_weight_kg, birth_height_cm, current_weight_kg, current_height_cm, last_measurement_date, maternal_age, maternal_bmi, ses_level, maternal_nutrition_quality, breastfeeding_status')
                .eq('parent_id', user.id)
                .limit(1)
                .maybeSingle();
            if (data) {
                const infantData = data as Infant;
                setInfant(infantData);
                setBabyName(infantData.name ?? '');
                setBirthWeight(infantData.birth_weight_kg != null ? String(infantData.birth_weight_kg) : '');
                setBirthHeight(infantData.birth_height_cm != null ? String(infantData.birth_height_cm) : '');
                setCurrentWeight(infantData.current_weight_kg != null ? String(infantData.current_weight_kg) : '');
                setCurrentHeight(infantData.current_height_cm != null ? String(infantData.current_height_cm) : '');
                setMaternalAge(infantData.maternal_age != null ? String(infantData.maternal_age) : '');
                setMaternalBmi(infantData.maternal_bmi != null ? String(infantData.maternal_bmi) : '');
                setSesLevel(infantData.ses_level);
                setNutritionQuality(infantData.maternal_nutrition_quality);
                setIsBreastfeeding(infantData.breastfeeding_status);
            }
        } catch {
            // No infant found
        } finally {
            setLoadingInfant(false);
        }
    };

    const getInitials = (name?: string | null, email?: string | null) => {
        if (name) {
            const parts = name.trim().split(' ').filter(Boolean);
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return parts[0]?.[0]?.toUpperCase() || 'U';
        }
        if (email) return email[0].toUpperCase();
        return 'U';
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const pickedUri = result.assets[0].uri;

        try {
            const response = await fetch(pickedUri);
            const blob = await response.blob();
            const filePath = `${user?.id}/avatar.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

            if (uploadError) {
                Alert.alert('Avatar Upload', 'Avatar upload coming soon');
                return;
            }

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            if (urlData?.publicUrl) {
                setAvatarUri(urlData.publicUrl);
                await supabase
                    .from('profiles')
                    .update({ avatar_url: urlData.publicUrl })
                    .eq('id', user?.id);
            }
        } catch {
            Alert.alert('Avatar Upload', 'Avatar upload coming soon');
        }
    };

    const handleSave = async () => {
        // Validation
        if (!fullName.trim() || fullName.trim().length < 2) {
            setError('Full name is required and must be at least 2 characters.');
            return;
        }
        if (bio.length > 150) {
            setError('Bio must be 150 characters or less.');
            return;
        }
        // Growth field validation
        if (birthWeight) {
            const bw = parseFloat(birthWeight);
            if (isNaN(bw) || bw < 0.5 || bw > 8.0) {
                setError('Birth weight must be between 0.5 and 8.0 kg');
                return;
            }
        }
        if (birthHeight) {
            const bh = parseFloat(birthHeight);
            if (isNaN(bh) || bh < 30 || bh > 65) {
                setError('Birth height must be between 30 and 65 cm');
                return;
            }
        }
        if (currentWeight) {
            const cw = parseFloat(currentWeight);
            if (isNaN(cw) || cw < 0.5 || cw > 30.0) {
                setError('Current weight must be between 0.5 and 30.0 kg');
                return;
            }
        }
        if (currentHeight) {
            const ch = parseFloat(currentHeight);
            if (isNaN(ch) || ch < 30 || ch > 110) {
                setError('Current height must be between 30 and 110 cm');
                return;
            }
        }
        if (maternalAge) {
            const ma = parseInt(maternalAge);
            if (isNaN(ma) || ma < 15 || ma > 55) {
                setError('Maternal Age must be between 15 and 55');
                return;
            }
        }

        try {
            setSaving(true);
            setError(null);

            const updates = [];

            // Update profile
            updates.push(
                supabase
                    .from('profiles')
                    .update({ full_name: fullName.trim(), bio: bio.trim() || null })
                    .eq('id', user?.id)
                    .then((res) => { if (res.error) throw res.error; })
            );

            // Update infant if exists
            if (infant?.id) {
                updates.push(
                    supabase
                        .from('infants')
                        .update({
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
                                ? new Date().toISOString().split('T')[0]
                                : null,
                        })
                        .eq('id', infant.id)
                        .eq('parent_id', user?.id)
                        .then((res) => { if (res.error) throw res.error; })
                );
            }

            await Promise.all(updates);

            await fetchProfile();
            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err: any) {
            setError(err?.message || 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const formatGender = (g: string) => {
        if (g === 'male') return '👦 Boy';
        if (g === 'female') return '👧 Girl';
        return '👶 Other';
    };

    if (loadingInfant) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={THEME.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backArrow}>←</Text>
                    </Pressable>
                    <Text style={styles.headerTitle}>Edit Profile</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        {avatarUri ? (
                            <Pressable onPress={pickImage}>
                                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                            </Pressable>
                        ) : (
                            <Pressable onPress={pickImage}>
                                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                    <Text style={styles.avatarInitials}>
                                        {getInitials(fullName || profile?.full_name, user?.email)}
                                    </Text>
                                </View>
                            </Pressable>
                        )}
                        <Pressable style={styles.changePhotoBtn} onPress={pickImage}>
                            <Text style={styles.changePhotoText}>Change Photo</Text>
                        </Pressable>
                    </View>

                    <View style={styles.divider} />

                    {/* ACCOUNT Section */}
                    <Text style={styles.sectionHeader}>ACCOUNT</Text>

                    {/* Full Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Enter your full name"
                            placeholderTextColor={THEME.secondaryText}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Email (locked) */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.lockedField}>
                            <Text style={styles.lockIcon}>🔒</Text>
                            <Text style={styles.lockedText}>{user?.email}</Text>
                        </View>
                        <Text style={styles.lockedHint}>Cannot be changed</Text>
                    </View>

                    {/* Bio */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            value={bio}
                            onChangeText={(t) => setBio(t.slice(0, 150))}
                            placeholder="Tell us about yourself..."
                            placeholderTextColor={THEME.secondaryText}
                            multiline
                            maxLength={150}
                        />
                        <Text style={styles.charCount}>{bio.length}/150</Text>
                    </View>

                    {infant && (
                        <>
                            <View style={styles.divider} />

                            {/* BABY PROFILE Section */}
                            <Text style={styles.sectionHeader}>BABY PROFILE</Text>

                            {/* Baby Name (editable) */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Baby's Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={babyName}
                                    onChangeText={setBabyName}
                                    placeholder="Enter baby's name"
                                    placeholderTextColor={THEME.secondaryText}
                                    autoCapitalize="words"
                                />
                            </View>

                            {/* Baby DOB (locked) */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Date of Birth</Text>
                                <View style={styles.lockedField}>
                                    <Text style={styles.lockIcon}>🔒</Text>
                                    <Text style={styles.lockedText}>
                                        {formatDate(infant.date_of_birth)}
                                    </Text>
                                </View>
                                <Text style={styles.lockedHint}>Contact support to change</Text>
                            </View>

                            {/* Baby Gender (locked) */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Gender</Text>
                                <View style={styles.lockedField}>
                                    <Text style={styles.lockIcon}>🔒</Text>
                                    <Text style={styles.lockedText}>
                                        {formatGender(infant.gender)}
                                    </Text>
                                </View>
                            </View>

                            {/* Birth Measurements */}
                            <Text style={styles.subSectionHeader}>🍼 Birth Measurements</Text>
                            <View style={styles.gridRow}>
                                <View style={styles.gridItem}>
                                    <Text style={styles.label}>Weight (kg)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={birthWeight}
                                        onChangeText={setBirthWeight}
                                        placeholder="e.g. 3.2"
                                        placeholderTextColor={THEME.secondaryText}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.label}>Height (cm)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={birthHeight}
                                        onChangeText={setBirthHeight}
                                        placeholder="e.g. 50.0"
                                        placeholderTextColor={THEME.secondaryText}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            {/* Current Measurements */}
                            <Text style={styles.subSectionHeader}>📅 Latest Measurements</Text>
                            <Text style={styles.subSectionSubtitle}>
                                Update these regularly for accurate growth tracking
                            </Text>
                            <View style={styles.gridRow}>
                                <View style={styles.gridItem}>
                                    <Text style={styles.label}>Weight (kg)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={currentWeight}
                                        onChangeText={setCurrentWeight}
                                        placeholder="e.g. 5.8"
                                        placeholderTextColor={THEME.secondaryText}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.label}>Height (cm)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={currentHeight}
                                        onChangeText={setCurrentHeight}
                                        placeholder="e.g. 60.0"
                                        placeholderTextColor={THEME.secondaryText}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.sectionHeader}>MOTHER'S PROFILE</Text>

                            <View style={styles.gridRow}>
                                <View style={styles.gridItem}>
                                    <Text style={styles.label}>Maternal Age</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={maternalAge}
                                        onChangeText={setMaternalAge}
                                        placeholder="e.g. 28"
                                        placeholderTextColor={THEME.secondaryText}
                                        keyboardType="number-pad"
                                    />
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.label}>Maternal BMI</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={maternalBmi}
                                        onChangeText={setMaternalBmi}
                                        placeholder="e.g. 22.5"
                                        placeholderTextColor={THEME.secondaryText}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Socioeconomic Level</Text>
                                <View style={styles.buttonGroup}>
                                    {['Low', 'Medium', 'High'].map((status, index) => (
                                        <Pressable
                                            key={status}
                                            style={[
                                                styles.toggleButton,
                                                sesLevel === index && styles.toggleButtonSelected,
                                            ]}
                                            onPress={() => setSesLevel(index)}
                                        >
                                            <Text
                                                style={[
                                                    styles.toggleButtonText,
                                                    sesLevel === index && styles.toggleButtonTextSelected,
                                                ]}
                                            >
                                                {status}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Nutrition Quality</Text>
                                <View style={styles.buttonGroup}>
                                    {['Poor', 'Adequate', 'Good'].map((status, index) => (
                                        <Pressable
                                            key={status}
                                            style={[
                                                styles.toggleButton,
                                                nutritionQuality === index && styles.toggleButtonSelected,
                                            ]}
                                            onPress={() => setNutritionQuality(index)}
                                        >
                                            <Text
                                                style={[
                                                    styles.toggleButtonText,
                                                    nutritionQuality === index && styles.toggleButtonTextSelected,
                                                ]}
                                            >
                                                {status}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>Breastfeeding</Text>
                                <View style={styles.buttonGroup}>
                                    {['Yes', 'No'].map((status) => {
                                        const isYes = status === 'Yes';
                                        return (
                                            <Pressable
                                                key={status}
                                                style={[
                                                    styles.toggleButton,
                                                    isBreastfeeding === isYes && styles.toggleButtonSelected,
                                                ]}
                                                onPress={() => setIsBreastfeeding(isYes)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.toggleButtonText,
                                                        isBreastfeeding === isYes && styles.toggleButtonTextSelected,
                                                    ]}
                                                >
                                                    {status}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        </>
                    )}

                    {/* Error Message */}
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {/* Save Button */}
                    <Pressable
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Text style={styles.saveButtonText}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backArrow: {
        fontSize: 24,
        color: THEME.text,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME.text,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 60,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: THEME.primary,
    },
    avatarPlaceholder: {
        backgroundColor: THEME.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitials: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    changePhotoBtn: {
        marginTop: 10,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },
    changePhotoText: {
        color: THEME.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: THEME.border,
        marginVertical: 20,
    },
    sectionHeader: {
        color: THEME.secondaryText,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 16,
    },
    subSectionHeader: {
        color: THEME.text,
        fontSize: 14,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 6,
    },
    subSectionSubtitle: {
        color: THEME.secondaryText,
        fontSize: 12,
        marginBottom: 14,
    },
    fieldGroup: {
        marginBottom: 18,
    },
    label: {
        color: THEME.secondaryText,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: THEME.surface,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: THEME.text,
    },
    bioInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        color: THEME.secondaryText,
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
    lockedField: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.locked,
        borderRadius: 10,
        padding: 14,
        gap: 10,
    },
    lockIcon: {
        fontSize: 14,
    },
    lockedText: {
        color: THEME.secondaryText,
        fontSize: 16,
        flex: 1,
    },
    lockedHint: {
        color: THEME.secondaryText,
        fontSize: 11,
        marginTop: 4,
        fontStyle: 'italic',
    },
    gridRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    gridItem: {
        flex: 1,
    },
    errorText: {
        color: THEME.error,
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center',
    },
    saveButton: {
        backgroundColor: THEME.primary,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    toggleButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: THEME.border,
        backgroundColor: THEME.surface,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleButtonSelected: {
        borderColor: THEME.primary,
        backgroundColor: 'rgba(108, 99, 255, 0.1)',
    },
    toggleButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: THEME.secondaryText,
        textAlign: 'center',
    },
    toggleButtonTextSelected: {
        color: THEME.primary,
    },
});

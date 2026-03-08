import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth-context';
import { Infant } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [infant, setInfant] = useState<Infant | null>(null);
  const [loadingInfant, setLoadingInfant] = useState(true);

  useEffect(() => {
    fetchInfant();
  }, [user]);

  const fetchInfant = async () => {
    if (!user) { setLoadingInfant(false); return; }
    try {
      const { data } = await supabase
        .from('infants')
        .select('id, name, date_of_birth, gender, birth_weight_kg, birth_height_cm, current_weight_kg, current_height_cm, last_measurement_date')
        .eq('parent_id', user.id)
        .limit(1)
        .maybeSingle();
      if (data) setInfant(data as Infant);
    } catch {
      // No infant found
    } finally {
      setLoadingInfant(false);
    }
  };

  const doSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to sign out. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    } finally {
      setSigningOut(false);
    }
  };

  const handleLogOut = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) doSignOut();
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out of your account?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
        ]
      );
    }
  };

  const getInitials = (fullName?: string | null, email?: string | null) => {
    if (fullName) {
      const parts = fullName.trim().split(' ').filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0]?.[0]?.toUpperCase() || 'U';
    }
    return email?.[0]?.toUpperCase() || 'U';
  };

  const getMemberSince = () => {
    const dateStr = profile?.created_at;
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch { return ''; }
  };

  const getBabyAge = () => {
    if (!infant?.date_of_birth) return null;
    const birth = new Date(infant.date_of_birth);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 1) {
      const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} day${days !== 1 ? 's' : ''} old`;
    }
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''} old`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}m old` : `${years} year${years !== 1 ? 's' : ''} old`;
  };

  const formatGender = (g?: string) => {
    if (g === 'male') return 'Boy';
    if (g === 'female') return 'Girl';
    return g || '';
  };

  if (!user || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>  
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Section Row component
  const SettingsRow = ({ icon, label, value, onPress, danger, showChevron = true }: {
    icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean; showChevron?: boolean;
  }) => (
    <Pressable
      style={({ pressed }) => [styles.settingsRow, pressed && onPress && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingsIconWrap, { backgroundColor: danger ? c.dangerSoft : c.primarySoft }]}>  
        <Text style={styles.settingsIcon}>{icon}</Text>
      </View>
      <View style={styles.settingsLabelWrap}>
        <Text style={[styles.settingsLabel, { color: danger ? c.danger : c.text }]}>{label}</Text>
        {value ? <Text style={[styles.settingsValue, { color: c.secondaryText }]} numberOfLines={1}>{value}</Text> : null}
      </View>
      {showChevron && onPress && <Text style={[styles.chevron, { color: c.secondaryText }]}>›</Text>}
    </Pressable>
  );

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.sectionCard, { backgroundColor: c.card }, Shadows.sm]}>{children}</View>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: c.secondaryText }]}>{title}</Text>
  );

  const Divider = () => <View style={[styles.divider, { backgroundColor: c.border }]} />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={[styles.backArrow, { color: c.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ─────────────────────────── */}
        <SectionCard>
          <View style={styles.profileCardInner}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>
                  {getInitials(profile.full_name, user.email)}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: c.text }]} numberOfLines={1}>
                {profile.full_name || user.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={[styles.profileEmail, { color: c.secondaryText }]} numberOfLines={1}>
                {user.email}
              </Text>
              {getMemberSince() ? (
                <Text style={[styles.memberBadge, { color: c.primary }]}>
                  Since {getMemberSince()}
                </Text>
              ) : null}
            </View>
          </View>
          {profile.bio ? (
            <Text style={[styles.bioText, { color: c.secondaryText }]} numberOfLines={3}>
              {profile.bio}
            </Text>
          ) : null}
        </SectionCard>

        {/* ── Baby Info ────────────────────────────── */}
        {infant && (
          <>
            <SectionHeader title="BABY" />
            <SectionCard>
              <View style={styles.babyHeader}>
                <View style={[styles.babyIconWrap, { backgroundColor: c.secondarySoft }]}>
                  <Text style={{ fontSize: 24 }}>{infant.gender === 'male' ? '👦' : infant.gender === 'female' ? '👧' : '👶'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.babyName, { color: c.text }]}>{infant.name || 'Baby'}</Text>
                  <View style={styles.babyMetaRow}>
                    {getBabyAge() && <Text style={[styles.babyMeta, { color: c.secondaryText }]}>{getBabyAge()}</Text>}
                    {infant.gender && (
                      <Text style={[styles.babyMeta, { color: c.secondaryText }]}>
                        {getBabyAge() ? ' · ' : ''}{formatGender(infant.gender)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: c.primarySoft }]}>
                  <Text style={styles.statEmoji}>⚖️</Text>
                  <Text style={[styles.statValue, { color: c.text }]}>
                    {infant.current_weight_kg != null ? `${infant.current_weight_kg} kg` : '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: c.secondaryText }]}>Weight</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: c.successSoft }]}>
                  <Text style={styles.statEmoji}>📏</Text>
                  <Text style={[styles.statValue, { color: c.text }]}>
                    {infant.current_height_cm != null ? `${infant.current_height_cm} cm` : '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: c.secondaryText }]}>Height</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: c.warningSoft }]}>
                  <Text style={styles.statEmoji}>🎂</Text>
                  <Text style={[styles.statValue, { color: c.text }]}>
                    {infant.birth_weight_kg != null ? `${infant.birth_weight_kg} kg` : '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: c.secondaryText }]}>Birth Wt.</Text>
                </View>
              </View>
            </SectionCard>
          </>
        )}

        {/* ── Account ─────────────────────────────── */}
        <SectionHeader title="ACCOUNT" />
        <SectionCard>
          <SettingsRow
            icon="✏️"
            label="Edit Profile"
            value="Name, bio, photo"
            onPress={() => router.push('/(tabs)/edit-profile')}
          />
          <Divider />
          <SettingsRow
            icon="👶"
            label="Baby Profile"
            value={infant?.name || 'Add baby info'}
            onPress={() => router.push('/(tabs)/edit-profile')}
          />
          <Divider />
          <SettingsRow
            icon="📊"
            label="Update Measurements"
            value={infant?.last_measurement_date
              ? `Last: ${new Date(infant.last_measurement_date).toLocaleDateString()}`
              : 'No measurements yet'}
            onPress={() => router.push('/(tabs)/edit-profile')}
          />
        </SectionCard>

        {/* ── App ──────────────────────────────────── */}
        <SectionHeader title="APP" />
        <SectionCard>
          <SettingsRow
            icon="📈"
            label="Growth History"
            value="View past records"
            onPress={() => router.push('/(tabs)/growth-history')}
          />
          <Divider />
          <SettingsRow
            icon="🩺"
            label="Postpartum Dashboard"
            value="Recovery insights"
            onPress={() => router.push('/postpartum-dashboard')}
          />
          <Divider />
          <SettingsRow
            icon="🧠"
            label="ASD Screening"
            value="Developmental tools"
            onPress={() => router.push('/asd-home')}
          />
        </SectionCard>

        {/* ── Support & Info ───────────────────────── */}
        <SectionHeader title="SUPPORT" />
        <SectionCard>
          <SettingsRow
            icon="ℹ️"
            label="About TinySteps"
            value="Version 1.0.0"
            onPress={() => Alert.alert('TinySteps', 'Infant Growth Monitoring System\nVersion 1.0.0\n\nBuilt with care for parents and babies.')}
          />
          <Divider />
          <SettingsRow
            icon="📋"
            label="Terms & Privacy"
            onPress={() => Alert.alert('Privacy Policy', 'Your data is stored securely and never shared with third parties. All health data is encrypted and only accessible by you.')}
          />
        </SectionCard>

        {/* ── Danger Zone ──────────────────────────── */}
        <SectionHeader title="" />
        <SectionCard>
          <Pressable
            style={({ pressed }) => [styles.logoutRow, pressed && { opacity: 0.7 }]}
            onPress={handleLogOut}
            disabled={signingOut}
          >
            <View style={[styles.settingsIconWrap, { backgroundColor: c.dangerSoft }]}>
              <Text style={styles.settingsIcon}>🚪</Text>
            </View>
            <Text style={[styles.logoutText, { color: c.danger }]}>
              {signingOut ? 'Signing Out…' : 'Sign Out'}
            </Text>
            {signingOut && <ActivityIndicator size="small" color={c.danger} style={{ marginLeft: 8 }} />}
          </Pressable>
        </SectionCard>

        {/* Footer */}
        <Text style={[styles.footer, { color: c.labelTertiary }]}>
          Logged in as {user.email}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 32, fontWeight: '300', marginTop: -2 },
  headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  /* Section generics */
  sectionCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },

  /* Profile Card */
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: '#5E5CE6',
  },
  avatarPlaceholder: {
    backgroundColor: '#5E5CE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  profileEmail: { fontSize: 14, marginTop: 2 },
  memberBadge: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  bioText: { fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14 },

  /* Baby Section */
  babyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  babyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  babyName: { fontSize: 17, fontWeight: '600' },
  babyMetaRow: { flexDirection: 'row', marginTop: 2 },
  babyMeta: { fontSize: 13 },

  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  statEmoji: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },

  /* Settings Rows */
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsIcon: { fontSize: 16 },
  settingsLabelWrap: { flex: 1 },
  settingsLabel: { fontSize: 15, fontWeight: '500' },
  settingsValue: { fontSize: 12, marginTop: 1 },
  chevron: { fontSize: 22, fontWeight: '300' },

  /* Logout */
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutText: { fontSize: 15, fontWeight: '600', marginLeft: 12 },

  /* Footer */
  footer: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 16,
    marginBottom: 8,
  },
});

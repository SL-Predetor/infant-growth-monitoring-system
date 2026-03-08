import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth-context';
import { Infant } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [infant, setInfant] = useState<Infant | null>(null);

  useEffect(() => {
    fetchInfant();
  }, [user]);

  const fetchInfant = async () => {
    if (!user) return;
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
    }
  };

  const handleLogOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setSigningOut(true);
              await signOut();
            } catch (err) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/(tabs)/edit-profile');
  };

  const getInitials = (fullName?: string | null, email?: string | null) => {
    if (fullName) {
      const parts = fullName.trim().split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0]?.[0]?.toUpperCase() || 'U';
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const getMemberSince = () => {
    if (!user?.created_at) return '';
    try {
      return new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  if (!user || !profile) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      </SafeAreaView>
    );
  }

  const hasGrowthData = infant?.current_weight_kg != null || infant?.current_height_cm != null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]}>
      <ThemedView style={styles.container}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: '#6C63FF',
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <ThemedText style={styles.avatarInitials}>
              {getInitials(profile.full_name, user.email)}
            </ThemedText>
          </View>
        )}

        <ThemedText style={styles.name}>
          {profile.full_name || user.email?.split('@')[0] || 'User'}
        </ThemedText>
        <Text style={[styles.email, { color: themeColors.secondaryText }]}>
          {user.email}
        </Text>

        {/* Bio */}
        <Text
          style={[
            styles.bio,
            { color: profile.bio ? themeColors.text : themeColors.secondaryText },
          ]}
        >
          {profile.bio || 'No bio yet'}
        </Text>

        {/* Baby info + measurements */}
        <View style={styles.infoRow}>
          {infant?.name && (
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>👶 {infant.name}</Text>
            </View>
          )}
          {hasGrowthData && infant?.current_weight_kg != null && (
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>⚖️ {infant.current_weight_kg} kg</Text>
            </View>
          )}
          {hasGrowthData && infant?.current_height_cm != null && (
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>📏 {infant.current_height_cm} cm</Text>
            </View>
          )}
          {profile.role === 'parent' && (
            <View style={styles.infoPill}>
              <Text style={styles.infoPillText}>👨‍👩‍👧 Parent</Text>
            </View>
          )}
        </View>

        {/* Add measurements link if no data */}
        {infant && !hasGrowthData && (
          <Pressable onPress={handleEditProfile} style={styles.addMeasurementsLink}>
            <Text style={styles.addMeasurementsText}>📏 Add measurements</Text>
          </Pressable>
        )}

        {getMemberSince() ? (
          <Text style={[styles.memberSince, { color: themeColors.secondaryText }]}>
            Member since {getMemberSince()}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, { backgroundColor: themeColors.primary }]}
            onPress={handleEditProfile}
          >
            <Text style={styles.buttonText}>Edit Profile</Text>
          </Pressable>

          <TouchableOpacity
            onPress={handleLogOut}
            disabled={signingOut}
            style={{
              borderWidth: 1.5,
              borderColor: '#6C63FF',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: signingOut ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#6C63FF', fontSize: 16, fontWeight: '600' }}>
              {signingOut ? 'Signing out...' : 'Log Out'}
            </Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: Spacing.lg,
    borderWidth: 3,
    borderColor: '#6C63FF',
  },
  avatarInitials: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  email: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  bio: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  infoPill: {
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoPillText: {
    color: '#6C63FF',
    fontSize: 13,
    fontWeight: '600',
  },
  addMeasurementsLink: {
    marginTop: Spacing.sm,
    paddingVertical: 6,
  },
  addMeasurementsText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  memberSince: {
    fontSize: 12,
    marginTop: Spacing.md,
  },
  actions: {
    width: '100%',
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Pressable, Dimensions,
  ScrollView, Text, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Infant } from '@/lib/auth-context';

const { width: W } = Dimensions.get('window');
const H_PAD = 20;
const CARD_GAP = 14;
const CARD_W = (W - H_PAD * 2 - CARD_GAP) / 2;

const C = {
  white: '#FFFFFF',
  bg: '#F4F7FF',
  card: '#FFFFFF',
  primary: '#6C63FF',
  primarySoft: '#EEF0FF',
  teal: '#38BDF8',
  tealSoft: '#E0F7FF',
  mint: '#34D399',
  mintSoft: '#D1FAF0',
  peach: '#FB7185',
  peachSoft: '#FFE4E8',
  amber: '#FBBF24',
  amberSoft: '#FFF8E1',
  text: '#1E1B4B',
  textSub: '#64748B',
  textMuted: '#94A3B8',
  border: '#E8ECF4',
  shadow: '#6C63FF',
};

const TOOLS = [
  {
    id: 'cry',
    emoji: '🎵',
    label: 'Cry Translator',
    benefit: 'Decode hunger, pain & comfort',
    accent: C.primary,
    soft: C.primarySoft,
    route: '/smart-cry-analysis',
  },
  {
    id: 'growth',
    emoji: '📈',
    label: 'Growth Tracker',
    benefit: 'Forecast height & weight',
    accent: C.teal,
    soft: C.tealSoft,
    route: '/(tabs)/growth',
  },
  {
    id: 'autism',
    emoji: '🧩',
    label: 'Autism Screening',
    benefit: 'Early detection & analysis',
    accent: C.mint,
    soft: C.mintSoft,
    route: '/asd-home',
  },
  {
    id: 'recovery',
    emoji: '🌸',
    label: "Mom's Recovery",
    benefit: 'Postpartum wellness',
    accent: C.peach,
    soft: C.peachSoft,
    route: '/moms-recovery',
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(fullName?: string | null, email?: string | null): string {
  if (fullName) return fullName.trim().split(' ')[0];
  if (email) return email.split('@')[0];
  return 'there';
}

function getBabyAge(dob?: string | null): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 1) {
    const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);
    return `${days} days old`;
  }
  if (months < 12) return `${months} months old`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}y ${m}mo old` : `${y} year old`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [infant, setInfant] = useState<Infant | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('infants')
      .select('id, name, date_of_birth, gender, current_weight_kg, current_height_cm, last_measurement_date')
      .eq('parent_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setInfant(data as Infant); });
  }, [user]);

  const firstName = getFirstName(profile?.full_name, user?.email);
  const babyAge = getBabyAge(infant?.date_of_birth);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()} ✨</Text>
            <Text style={styles.greetingName}>Hi, {firstName}!</Text>
            {infant?.name ? (
              <View style={styles.babyPill}>
                <Text style={styles.babyPillEmoji}>👶</Text>
                <Text style={styles.babyPillText}>
                  {infant.name}{babyAge ? `  ·  ${babyAge}` : ''}
                </Text>
              </View>
            ) : (
              <Text style={styles.babySubtext}>Welcome to TinySteps 💙</Text>
            )}
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/Profile')}
            style={styles.avatarBtn}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarInitial}>
                {firstName[0]?.toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View style={styles.avatarOnline} />
          </Pressable>
        </View>

        {/* ── HERO BANNER ── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBannerLeft}>
            <Text style={styles.heroBannerTitle}>
              How's {infant?.name ?? 'your baby'} today?
            </Text>
            <Text style={styles.heroBannerSub}>
              4 AI tools ready to help you monitor and understand your little one.
            </Text>
            <View style={styles.heroBannerBadge}>
              <View style={styles.heroBannerDot} />
              <Text style={styles.heroBannerBadgeText}>All systems active</Text>
            </View>
          </View>
          <View style={styles.heroBannerRight}>
            <Text style={styles.heroBabyEmoji}>🍼</Text>
            <Text style={styles.heroBabyEmoji2}>✨</Text>
          </View>
        </View>

        {/* ── TOOLS SECTION ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Your Tools</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>4 active</Text>
          </View>
        </View>

        <View style={styles.toolsGrid}>
          {TOOLS.map((tool) => (
            <Pressable
              key={tool.id}
              style={({ pressed: p }) => [
                styles.toolCard,
                p && { transform: [{ scale: 0.96 }], opacity: 0.9 },
              ]}
              onPress={() => router.push(tool.route as any)}
              accessibilityLabel={tool.label}
            >
              <View style={[styles.toolIconWrap, { backgroundColor: tool.soft }]}>
                <Text style={styles.toolEmoji}>{tool.emoji}</Text>
              </View>
              <Text style={styles.toolLabel}>{tool.label}</Text>
              <Text style={styles.toolBenefit} numberOfLines={2}>{tool.benefit}</Text>
              <View style={[styles.toolFooter, { backgroundColor: tool.soft }]}>
                <Text style={[styles.toolFooterText, { color: tool.accent }]}>Open →</Text>
              </View>
              <View style={[styles.toolAccentBar, { backgroundColor: tool.accent }]} />
            </Pressable>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: H_PAD, paddingTop: 12, paddingBottom: 32 },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 13, color: C.textMuted, fontWeight: '500', letterSpacing: 0.3 },
  greetingName: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.6, marginTop: 2, marginBottom: 8 },
  babyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primarySoft, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  babyPillEmoji: { fontSize: 14 },
  babyPillText: { fontSize: 13, fontWeight: '600', color: C.primary },
  babySubtext: { fontSize: 13, color: C.textMuted, fontWeight: '500' },
  avatarBtn: { marginLeft: 12, position: 'relative' },
  avatarInner: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: C.white,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  avatarInitial: { fontSize: 20, fontWeight: '800', color: C.white },
  avatarOnline: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#4ADE80', borderWidth: 2.5, borderColor: C.white,
  },

  // Hero Banner
  heroBanner: {
    backgroundColor: C.primary, borderRadius: 24, padding: 22,
    marginBottom: 28, flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  heroBannerLeft: { flex: 1 },
  heroBannerTitle: { fontSize: 20, fontWeight: '800', color: C.white, letterSpacing: -0.4, marginBottom: 6 },
  heroBannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 19, marginBottom: 14 },
  heroBannerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 20,
  },
  heroBannerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  heroBannerBadgeText: { fontSize: 12, fontWeight: '600', color: C.white },
  heroBannerRight: { alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  heroBabyEmoji: { fontSize: 48 },
  heroBabyEmoji2: { fontSize: 20, marginTop: -8, textAlign: 'center' },

  // Section
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  sectionBadge: {
    backgroundColor: C.primarySoft, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20,
  },
  sectionBadgeText: { fontSize: 12, fontWeight: '700', color: C.primary },

  // Tool Cards
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  toolCard: {
    width: CARD_W, backgroundColor: C.card, borderRadius: 22,
    padding: 16, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', minHeight: 180, justifyContent: 'space-between',
    shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  toolAccentBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 4,
  },
  toolIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  toolEmoji: { fontSize: 26 },
  toolLabel: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 4, letterSpacing: -0.2 },
  toolBenefit: { fontSize: 12, color: C.textSub, lineHeight: 17, flex: 1 },
  toolFooter: {
    marginTop: 12, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, alignItems: 'center', marginBottom: 4,
  },
  toolFooterText: { fontSize: 13, fontWeight: '700' },
});

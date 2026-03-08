import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Dimensions,
  ScrollView,
  Text,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Infant } from '@/lib/auth-context';

const { width: W } = Dimensions.get('window');
const H_PAD = 20;
const CARD_GAP = 12;
const CARD_W = (W - H_PAD * 2 - CARD_GAP) / 2;

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  white:        '#FFFFFF',
  bg:           '#F7FAFC',
  blue:         '#A7D8DE',
  blueSoft:     '#E8F6F8',
  blueDeep:     '#5BB8C1',
  peach:        '#FFD3D8',
  peachSoft:    '#FFF2F4',
  mint:         '#B8DDB8',
  mintSoft:     '#EBF6EB',
  lavender:     '#C9C5F0',
  lavenderSoft: '#EFEEFC',
  amber:        '#FFD97D',
  amberSoft:    '#FFF8E6',
  text:         '#1A2332',
  textSub:      '#5C6B7A',
  textMuted:    '#94A3B0',
  border:       '#E8EDF2',
  shadow:       '#A0B4C2',
  heroGrad1:    '#EAF7F9',
  heroGrad2:    '#FEF0F2',
};

interface QuickStat { label: string; value: string; color: string; soft: string; emoji: string }

const TOOLS = [
  {
    id: 'cry',
    emoji: '🎵',
    label: 'Cry Translator',
    benefit: 'Decode hunger, pain & comfort cues',
    accent: C.blue,
    soft: C.blueSoft,
    route: '/(tabs)/cry-translator',
  },
  {
    id: 'growth',
    emoji: '📈',
    label: 'Growth Tracker',
    benefit: 'Forecast height & weight milestones',
    accent: C.mint,
    soft: C.mintSoft,
    route: '/(tabs)/growth',
  },
  {
    id: 'behavior',
    emoji: '🧩',
    label: 'Behavior & Dev',
    benefit: 'Early screening & milestone analysis',
    accent: C.lavender,
    soft: C.lavenderSoft,
    route: '/behavior-development',
  },
  {
    id: 'recovery',
    emoji: '🌸',
    label: "Mom's Recovery",
    benefit: 'Postpartum wellness & nutrition',
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
    return `${days}d old`;
  }
  if (months < 12) return `${months}mo old`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}y ${m}mo` : `${y}yr old`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [infant, setInfant] = useState<Infant | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);

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

  const quickStats: QuickStat[] = [
    {
      label: infant?.name ? `${infant.name}'s Weight` : 'Weight',
      value: infant?.current_weight_kg != null ? `${infant.current_weight_kg} kg` : '—',
      color: C.blueDeep,
      soft: C.blueSoft,
      emoji: '⚖️',
    },
    {
      label: 'Height',
      value: infant?.current_height_cm != null ? `${infant.current_height_cm} cm` : '—',
      color: '#4CAF7D',
      soft: C.mintSoft,
      emoji: '📏',
    },
    {
      label: 'Age',
      value: babyAge ?? '—',
      color: '#B48EEA',
      soft: C.lavenderSoft,
      emoji: '🎂',
    },
    {
      label: 'Last Check',
      value: infant?.last_measurement_date
        ? new Date(infant.last_measurement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—',
      color: '#F0945C',
      soft: C.amberSoft,
      emoji: '📅',
    },
  ];

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── TOP HEADER ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.greetingName}>{firstName} 👋</Text>
            <Text style={styles.todayDate}>{todayStr}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/Profile')}
            style={styles.avatarBtn}
            accessibilityLabel="Open profile"
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarInitial}>
                {firstName[0]?.toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View style={styles.avatarOnline} />
          </Pressable>
        </View>

        {/* ── QUICK STATS STRIP ───────────────────────────────────── */}
        {infant && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsStrip}
            style={{ marginBottom: 24 }}
          >
            {quickStats.map((s) => (
              <View key={s.label} style={[styles.statPill, { backgroundColor: s.soft }]}>
                <Text style={styles.statEmoji}>{s.emoji}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── HERO AI COPILOT CARD ─────────────────────────────────── */}
        <Pressable
          style={({ pressed: p }) => [styles.heroCard, p && styles.heroCardPressed]}
          onPress={() => router.push('/smart-cry-analysis')}
          accessibilityLabel="Chat with AI Copilot"
        >
          {/* Soft pastel blobs for depth */}
          <View style={styles.heroBlob1} />
          <View style={styles.heroBlob2} />

          <View style={styles.heroTop}>
            <View style={styles.heroBadge}>
              <View style={styles.heroDot} />
              <Text style={styles.heroBadgeText}>AI Copilot · Ready</Text>
            </View>
            <Text style={styles.heroBotAvatar}>🤖</Text>
          </View>

          <Text style={styles.heroHeadline}>
            Hi {firstName}! How's{infant?.name ? ` ${infant.name}` : ' your little one'} doing today? 💙
          </Text>
          <Text style={styles.heroSub}>
            Ask me anything — cry patterns, growth concerns, feeding questions, or just check in.
          </Text>

          <View style={styles.heroCTA}>
            <View style={styles.heroCTABtn}>
              <Text style={styles.heroCTAText}>✦ Ask Copilot</Text>
            </View>
            <Text style={styles.heroCTAHint}>Powered by AI · Always here</Text>
          </View>
        </Pressable>

        {/* ── TOOLS SECTION ───────────────────────────────────────── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Your Tools</Text>
          <Text style={styles.sectionSub}>4 features</Text>
        </View>

        <View style={styles.toolsGrid}>
          {TOOLS.map((tool) => (
            <Pressable
              key={tool.id}
              style={({ pressed: p }) => [
                styles.toolCard,
                p && { transform: [{ scale: 0.97 }], opacity: 0.92 },
              ]}
              onPress={() => router.push(tool.route as any)}
              accessibilityLabel={tool.label}
            >
              {/* accent strip */}
              <View style={[styles.toolAccentStrip, { backgroundColor: tool.accent }]} />

              <View style={[styles.toolIconWrap, { backgroundColor: tool.soft }]}>
                <Text style={styles.toolEmoji}>{tool.emoji}</Text>
              </View>

              <Text style={styles.toolLabel}>{tool.label}</Text>
              <Text style={styles.toolBenefit} numberOfLines={2}>{tool.benefit}</Text>

              <View style={[styles.toolChevron, { backgroundColor: tool.soft }]}>
                <Text style={[styles.toolChevronText, { color: tool.accent === C.mint ? '#4CAF7D' : tool.accent === C.lavender ? '#7B74E0' : tool.accent === C.peach ? '#E8758C' : C.blueDeep }]}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* ── EXPLORE MORE BANNER ─────────────────────────────────── */}
        <Pressable
          style={styles.exploreBanner}
          onPress={() => router.push('/asd-home')}
        >
          <View style={styles.exploreBannerLeft}>
            <Text style={styles.exploreBannerEmoji}>🔬</Text>
            <View>
              <Text style={styles.exploreBannerTitle}>ASD Early Screening</Text>
              <Text style={styles.exploreBannerSub}>Facial & Q-CHAT analysis for early detection</Text>
            </View>
          </View>
          <Text style={styles.exploreBannerChevron}>›</Text>
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 16,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
  },
  greeting: {
    fontSize: 15,
    color: C.textMuted,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  greetingName: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    marginTop: 1,
  },
  todayDate: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 4,
  },
  avatarBtn: {
    marginLeft: 12,
    position: 'relative',
  },
  avatarInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.blue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: C.white,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: C.white,
  },
  avatarOnline: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: C.white,
  },

  // ── Quick Stats Strip
  statsStrip: {
    paddingLeft: 2,
    paddingRight: H_PAD,
    gap: 10,
  },
  statPill: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    minWidth: 84,
    gap: 2,
  },
  statEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Hero Card
  heroCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 22,
    marginBottom: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EBF7F9',
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  heroCardPressed: {
    transform: [{ scale: 0.99 }],
    shadowOpacity: 0.1,
  },
  heroBlob1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.blueSoft,
    opacity: 0.7,
  },
  heroBlob2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.peachSoft,
    opacity: 0.8,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.blueDeep,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.blueDeep,
  },
  heroBotAvatar: {
    fontSize: 32,
  },
  heroHeadline: {
    fontSize: 19,
    fontWeight: '800',
    color: C.text,
    lineHeight: 27,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 21,
    marginBottom: 18,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroCTABtn: {
    backgroundColor: C.blue,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    shadowColor: C.blueDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  heroCTAText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  heroCTAHint: {
    fontSize: 12,
    color: C.textMuted,
  },

  // ── Section Row
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '500',
  },

  // ── Tools Grid
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: 20,
  },
  toolCard: {
    width: CARD_W,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 168,
    justifyContent: 'space-between',
  },
  toolAccentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  toolIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  toolEmoji: {
    fontSize: 22,
  },
  toolLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  toolBenefit: {
    fontSize: 12,
    color: C.textSub,
    lineHeight: 17,
    flex: 1,
  },
  toolChevron: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  toolChevronText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: -1,
  },

  // ── Explore Banner
  exploreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  exploreBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  exploreBannerEmoji: {
    fontSize: 28,
  },
  exploreBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  exploreBannerSub: {
    fontSize: 12,
    color: C.textSub,
  },
  exploreBannerChevron: {
    fontSize: 28,
    color: C.textMuted,
    fontWeight: '300',
    marginLeft: 8,
  },
});


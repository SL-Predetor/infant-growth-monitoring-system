import React from 'react';
import { StyleSheet, View, Pressable, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

const { width: screenWidth } = Dimensions.get('window');

const GRID_GAP = Spacing.lg;
const HORIZONTAL_PADDING = Spacing.lg;
const isSmallScreen = screenWidth < 768;
const CARD_WIDTH = isSmallScreen 
  ? screenWidth - HORIZONTAL_PADDING * 2
  : (screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  route: string;
}

const TOOLS: Tool[] = [
  {
    id: 'cry-analysis',
    name: 'Cry Analysis',
    description: 'Understand your baby\'s cry patterns',
    icon: '🎤',
    color: '#4ECDC4',
    route: '/smart-cry-analysis',
  },
  {
    id: 'growth-forecaster',
    name: 'Growth Forecaster',
    description: 'Track your baby\'s development',
    icon: '📈',
    color: '#FF6B9D',
    route: '/growth-forecaster',
  },
  {
    id: 'behavior-development',
    name: 'Behavior & Development',
    description: 'Monitor developmental milestones',
    icon: '🧠',
    color: '#FFC75F',
    route: '/behavior-development',
  },
  {
    id: 'moms-recovery',
    name: 'Mom\'s Recovery',
    description: 'Your wellness and recovery guide',
    icon: '🌸',
    color: '#95E1D3',
    route: '/recovery',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  // Define theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'secondaryText');


  // (rowOneItems/rowTwoItems defined but not used – grid rendered from TOOLS constant below)
  const rowOneItems = [
    {
      id: "cry-translator",
      title: "Cry Translator",
      subtitle: "Identify Hunger, Pain, or Fuss.",
      iconName: "speaker.wave.2",
      onPress: () => router.push("/(tabs)/cry-translator"),
      accentColor: "#FF6B6B",
    },
    {
      id: "growth-forecaster",
      title: "Growth Forecaster",
      subtitle: "Predict Height & Weight.",
      iconName: "chart.line.uptrend.xyaxis",
      badge: "Next measure: Today",
      onPress: () => router.push("/(tabs)/growth"),
      accentColor: "#4ECDC4",
    },
  ];

  const rowTwoItems = [
    {
      id: "behavior-development",
      title: "Behavior & Development",
      subtitle: "Screening & Eye Gaze Analysis.",
      iconName: "puzzlepiece",
      onPress: () => router.push("/behavior"),
      accentColor: "#FFE66D",
    },
    {
      id: "moms-recovery",
      title: "Mom's Recovery",
      subtitle: "Postpartum Pain & Nutrition.",
      iconName: "heart",
      onPress: () => router.push("/recovery"),
      accentColor: "#FF85B3",
    },
  ];

  const handleToolPress = (route: string) => {
    router.push(route as any);
  };

  const ToolCard = ({ tool }: { tool: Tool }) => (
    <Pressable
      style={[
        styles.toolCard,
        {
          backgroundColor: cardBackground,
          width: CARD_WIDTH,
          shadowColor: tool.color,
        },
      ]}
      onPress={() => handleToolPress(tool.route)}
      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
    >
      <View style={[styles.toolIconCircle, { backgroundColor: `${tool.color}20` }]}>
        <ThemedText style={styles.toolIcon}>{tool.icon}</ThemedText>
      </View>

      <ThemedText style={[styles.toolName, { color: textColor }]}>
        {tool.name}
      </ThemedText>

      <ThemedText style={[styles.toolDescription, { color: secondaryText }]} numberOfLines={2}>
        {tool.description}
      </ThemedText>

      <View style={[styles.toolArrow, { borderTopColor: tool.color }]}>
        <ThemedText style={{ color: tool.color, fontSize: 16 }}>→</ThemedText>
      </View>
    </Pressable>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <ThemedText style={[styles.mainTitle, { color: textColor }]}>
          Infant Care Assistant
        </ThemedText>
        <ThemedText style={[styles.mainSubtitle, { color: secondaryText }]}>
          Choose your tool
        </ThemedText>
      </View>

      {/* Tools Grid */}
      <View style={styles.gridContainer}>
        <View style={[styles.sectionLabel, { paddingHorizontal: HORIZONTAL_PADDING }]}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Tools
          </ThemedText>
        </View>

        <View style={[styles.grid, { gap: GRID_GAP, paddingHorizontal: HORIZONTAL_PADDING }]}>
          {TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </View>
      </View>

      {/* Footer spacing */}
      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerSection: {
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: HORIZONTAL_PADDING,
    alignItems: 'center',
  },

  mainTitle: {
    fontSize: Typography.sizes.heading,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },

  mainSubtitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
    textAlign: 'center',
  },

  gridContainer: {
    width: '100%',
  },

  sectionLabel: {
    marginBottom: Spacing.md,
  },

  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.semiBold,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: isSmallScreen ? 'center' : 'flex-start',
    paddingBottom: Spacing.lg,
  },

  toolCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'flex-start',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  toolIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },

  toolIcon: {
    fontSize: 24,
  },

  toolName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semiBold,
    marginBottom: Spacing.sm,
  },

  toolDescription: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    lineHeight: 18,
    marginBottom: Spacing.md,
    flex: 1,
  },

toolArrow: {
  width: '100%',
  paddingTop: Spacing.sm,
  borderTopWidth: 1,
  borderTopColor: 'rgba(0,0,0,0.1)',
  alignItems: 'flex-end',
},

// Main Cry Analysis Card
mainCard: {
  borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  mainIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },

  mainIconText: {
    fontSize: 28,
  },

  mainCardContent: {
    flex: 1,
  },

  mainCardTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semiBold,
    marginBottom: Spacing.xs,
  },

  mainCardSubtitle: {
    fontSize: Typography.sizes.sm,
  },

  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chevronText: {
    fontSize: 16,
    fontWeight: Typography.weights.semiBold,
  },

  mainCardDescription: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },

  // Section Headers
  sectionHeader: {
    marginBottom: Spacing.lg,
  },

  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semiBold,
    marginBottom: Spacing.xs,
  },

  sectionSubtitle: {
    fontSize: Typography.sizes.sm,
  },

  // Tools Grid
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },

  toolCard: {
    width: (screenWidth - Spacing.lg * 2 - Spacing.md) / 2,
    ...BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 120,
  },

  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },

  toolIconText: {
    fontSize: 20,
  },

  toolTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semiBold,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },

  toolSubtitle: {
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },

  // Advanced Link
  advancedLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },

  linkText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },

  modalContent: {
    width: '100%',
    maxWidth: 400,
    ...BorderRadius.lg,
    padding: Spacing.xl,
  },

  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },

  modalSubtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  // Option Cards
  optionCard: {
    ...BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },

  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },

  optionIconText: {
    fontSize: 24,
  },

  optionContent: {
    flex: 1,
  },

  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },

  optionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semiBold,
    marginRight: Spacing.sm,
  },

  newBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    ...BorderRadius.sm,
  },

  newBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: 'white',
  },

  optionSubtitle: {
    fontSize: Typography.sizes.sm,
  },

  optionDescription: {
    fontSize: Typography.sizes.sm,
    lineHeight: 18,
  },

  // Cancel Button
  cancelButton: {
    borderWidth: 1,
    ...BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },

  cancelText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
});

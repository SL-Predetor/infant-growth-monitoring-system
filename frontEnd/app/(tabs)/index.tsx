import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import { HelloWave } from "@/components/hello-wave";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MenuGrid } from "@/components/menu-grid";

export default function HomeScreen() {
  const router = useRouter();

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
      onPress: () => router.push("/(tabs)/behavior"),
      accentColor: "#FFE66D",
    },
    {
      id: "moms-recovery",
      title: "Mom's Recovery",
      subtitle: "Postpartum Pain & Nutrition.",
      iconName: "heart",
      onPress: () => router.push("/(tabs)/recovery"),
      accentColor: "#FF85B3",
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <ThemedView style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText type="title" style={styles.title}>
            Welcome!
          </ThemedText>
          <HelloWave />
        </View>

        <ThemedText style={styles.subtitle}>
          Let’s take care of your baby and you, one step at a time.
        </ThemedText>
      </ThemedView>

      {/* Section title */}
      <ThemedView style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Quick Tools</ThemedText>
        <ThemedText style={styles.sectionHint}>
          Tap any card to start
        </ThemedText>
      </ThemedView>

      {/* Grid card */}
      <ThemedView style={styles.gridCard}>
        <MenuGrid rowOneItems={rowOneItems} rowTwoItems={rowTwoItems} />
      </ThemedView>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingBottom: 10,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    opacity: 0.8,
    lineHeight: 20,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  sectionHint: {
    fontSize: 12,
    opacity: 0.6,
  },

  gridCard: {
    marginHorizontal: 16,
    marginTop: 6,
    padding: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});

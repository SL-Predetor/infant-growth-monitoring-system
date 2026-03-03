import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  
  // dummy user data (replace with your real data later)
  const user = {
    name: "yasindu nethmi",
    email: "nethyas@example.com",
    avatar: "https://i.pravatar.cc/300",
    bio: "Building cool things with React Native 🚀",
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]}>
      <ThemedView style={styles.container}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />

        <ThemedText style={styles.name}>{user.name}</ThemedText>
        <Text style={[styles.email, { color: themeColors.secondaryText }]}>{user.email}</Text>
        <Text style={[styles.bio, { color: themeColors.text }]}>{user.bio}</Text>

        <View style={styles.actions}>
          <Pressable 
            style={[styles.button, { backgroundColor: themeColors.primary }]} 
            onPress={() => {}}
          >
            <Text style={styles.buttonText}>Edit Profile</Text>
          </Pressable>

          <Pressable 
            style={[styles.button, styles.outline, { borderColor: themeColors.primary }]} 
            onPress={() => {}}
          >
            <Text style={[styles.buttonText, { color: themeColors.primary }]}>Log Out</Text>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: Spacing.lg,
    borderWidth: 3,
    borderColor: "#6C63FF",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  email: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  bio: {
    fontSize: 15,
    textAlign: "center",
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  actions: {
    width: "100%",
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
  outlineText: {
    color: "#6C63FF",
  },
});

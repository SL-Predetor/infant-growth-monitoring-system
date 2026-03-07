import React from "react";
import { View, Text, StyleSheet, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  // dummy user data (replace with your real data later)
  const user = {
    name: "yasindu nethmi",
    email: "nethyas@example.com",
    avatar: "https://i.pravatar.cc/300",
    bio: "Building cool things with React Native 🚀",
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />

        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.bio}>{user.bio}</Text>

        <View style={styles.actions}>
          <Pressable style={styles.button} onPress={() => {}}>
            <Text style={styles.buttonText}>Edit Profile</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.outline]} onPress={() => {}}>
            <Text style={[styles.buttonText, styles.outlineText]}>Log Out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0b0b0b",
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#2a2a2a",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  email: {
    fontSize: 14,
    color: "#b3b3b3",
    marginTop: 4,
  },
  bio: {
    fontSize: 15,
    color: "#d6d6d6",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
  actions: {
    width: "100%",
    marginTop: 24,
    gap: 12,
  },
  button: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 16,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  outlineText: {
    color: "#ffffff",
  },
});

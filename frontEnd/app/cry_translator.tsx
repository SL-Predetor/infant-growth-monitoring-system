import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

// If testing on physical phone, replace localhost with your PC IP
const API_URL = "http://localhost:5000/predict-cry";

export default function CryTranslatorScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);

  const [result, setResult] = useState<{ label: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState(false);

  // ---------- AUDIO ----------
  const startRecording = async () => {
    setResult(null);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow microphone access.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
    } catch (e) {
      console.log("startRecording error", e);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setAudioUri(uri || null);

      if (!uri) {
        Alert.alert("Recording error", "Audio URI not found.");
      }
    } catch (e) {
      console.log("stopRecording error", e);
    } finally {
      setLoading(false);
    }
  };

  // ---------- IMAGE ----------
  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow gallery access.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!res.canceled) {
        setImageUri(res.assets[0].uri);
        setResult(null);
      }
    } catch (e) {
      console.log("pickImage error", e);
    }
  };

  const clearAll = () => {
    setAudioUri(null);
    setImageUri(null);
    setResult(null);
    setRecording(null);
  };

  // ---------- UPLOAD ----------
  const uploadAndPredict = async () => {
    if (!audioUri) {
      Alert.alert("Missing audio", "Please record baby cry audio first.");
      return;
    }
    if (!imageUri) {
      Alert.alert("Missing image", "Please upload baby face image.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();

      // audio
      formData.append("audio", {
        uri: audioUri,
        name: "cry.wav",
        type: "audio/wav",
      } as any);

      // image
      formData.append("image", {
        uri: imageUri,
        name: "baby.jpg",
        type: "image/jpeg",
      } as any);

      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const json = await res.json();
      setResult(json);
    } catch (e) {
      console.log("upload error", e);
      Alert.alert("Upload failed", "Check backend / network.");
    } finally {
      setLoading(false);
    }
  };

  const labelPretty = (label?: string) => {
    if (!label) return "";
    if (label === "pain_cry") return "😢 Pain Cry";
    if (label === "hunger_cry") return "🍼 Hunger Cry";
    return "🙂 Normal/Comfort Cry";
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Cry Translator
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Record cry audio + upload baby face image. We’ll classify using your model.
      </ThemedText>

      <View style={styles.card}>
        {/* AUDIO BUTTON */}
        {!recording ? (
          <Pressable style={styles.btn} onPress={startRecording}>
            <ThemedText style={styles.btnText}>
              {audioUri ? "Re-record Audio" : "Start Recording"}
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable style={[styles.btn, styles.stop]} onPress={stopRecording}>
            <ThemedText style={styles.btnText}>Stop Recording</ThemedText>
          </Pressable>
        )}

        {/* AUDIO STATUS */}
        {audioUri && (
          <ThemedText style={styles.statusText}>
            ✅ Audio recorded
          </ThemedText>
        )}

        {/* IMAGE PICKER */}
        <Pressable style={[styles.btn, styles.imageBtn]} onPress={pickImage}>
          <ThemedText style={styles.btnText}>
            {imageUri ? "Change Baby Image" : "Upload Baby Face Image"}
          </ThemedText>
        </Pressable>

        {/* IMAGE PREVIEW */}
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            style={styles.previewImage}
          />
        )}

        {/* ANALYZE BUTTON */}
        <Pressable
          style={[
            styles.btn,
            styles.analyzeBtn,
            (!audioUri || !imageUri || loading) && styles.btnDisabled,
          ]}
          onPress={uploadAndPredict}
          disabled={!audioUri || !imageUri || loading}
        >
          <ThemedText style={styles.btnText}>
            Analyze (Audio + Image)
          </ThemedText>
        </Pressable>

        {/* CLEAR */}
        {(audioUri || imageUri) && !loading && (
          <Pressable style={styles.clearBtn} onPress={clearAll}>
            <ThemedText style={styles.clearText}>Clear</ThemedText>
          </Pressable>
        )}

        {loading && <ActivityIndicator style={{ marginTop: 14 }} />}

        {/* RESULT */}
        {result && (
          <View style={styles.resultBox}>
            <ThemedText style={styles.resultTitle}>
              {labelPretty(result.label)}
            </ThemedText>
            <ThemedText style={styles.confText}>
              Confidence: {(result.confidence * 100).toFixed(1)}%
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  subtitle: { marginTop: 6, opacity: 0.75, fontSize: 15, lineHeight: 22 },

  card: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#FF6B6B",
    marginTop: 10,
  },
  stop: { backgroundColor: "#D32F2F" },
  imageBtn: { backgroundColor: "#4ECDC4" },
  analyzeBtn: { backgroundColor: "#111" },
  btnDisabled: { opacity: 0.5 },

  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  statusText: {
    marginTop: 10,
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
  },

  previewImage: {
    marginTop: 12,
    width: "100%",
    height: 200,
    borderRadius: 12,
  },

  clearBtn: {
    marginTop: 8,
    alignItems: "center",
  },
  clearText: {
    fontSize: 13,
    opacity: 0.7,
    textDecorationLine: "underline",
  },

  resultBox: {
    marginTop: 20,
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255,107,107,0.12)",
    borderRadius: 12,
  },
  resultTitle: { fontSize: 24, fontWeight: "800" },
  confText: { marginTop: 8, opacity: 0.7, fontSize: 14 },
});

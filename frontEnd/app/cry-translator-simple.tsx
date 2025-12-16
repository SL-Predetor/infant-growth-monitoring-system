import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Audio } from "expo-av";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

// Change this to your PC IP if testing on physical phone
const API_URL = "http://localhost:8000/predict-cry";

export default function CryTranslatorScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Get theme-aware colors
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#1E1E1E' }, 'background');
  const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.1)' }, 'background');
  const clearBtnBg = useThemeColor({ light: 'rgba(0,0,0,0.03)', dark: 'rgba(255,255,255,0.08)' }, 'background');
  const clearTextColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');

  // Start recording audio
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

  // Stop recording audio
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

  // Upload audio and get prediction
  const uploadAndPredict = async () => {
    if (!audioUri) {
      Alert.alert("Missing audio", "Please record baby cry audio first.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      
      // For web: create blob from audio URI
      const response = await fetch(audioUri);
      const blob = await response.blob();
      formData.append("file", blob, "cry.wav");

      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      
      if (res.ok) {
        setResult(json);
      } else {
        Alert.alert("Error", json.detail || "Prediction failed");
      }
    } catch (e) {
      console.log("upload error", e);
      Alert.alert("Connection failed", "Make sure backend is running at http://localhost:8000");
    } finally {
      setLoading(false);
    }
  };

  // Clear all data
  const clearAll = () => {
    setAudioUri(null);
    setResult(null);
    setRecording(null);
  };

  // Format label for display
  const labelPretty = (label?: string) => {
    if (!label) return "";
    if (label === "pain_cry") return "😢 Pain Cry";
    if (label === "hunger_cry") return "🍼 Hunger Cry";
    return "🙂 Normal Cry";
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Cry Translator
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        Record your baby's cry and get instant AI analysis
      </ThemedText>

      <ThemedView 
        lightColor="#FFFFFF" 
        darkColor="#1E1E1E" 
        style={[styles.card, { borderColor }]}
      >
        {/* RECORD BUTTON */}
        {!recording ? (
          <Pressable style={styles.btn} onPress={startRecording}>
            <ThemedText style={styles.btnText}>
              {audioUri ? "🔄 Re-record Audio" : "🎤 Start Recording"}
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable style={[styles.btn, styles.stop]} onPress={stopRecording}>
            <ThemedText style={styles.btnText}>⏹️ Stop Recording</ThemedText>
          </Pressable>
        )}

        {/* AUDIO STATUS */}
        {audioUri && !recording && (
          <ThemedText style={styles.statusText}>
            ✅ Audio recorded successfully
          </ThemedText>
        )}

        {/* ANALYZE BUTTON */}
        {audioUri && !recording && (
          <Pressable
            style={[styles.btn, styles.analyzeBtn, loading && styles.btnDisabled]}
            onPress={uploadAndPredict}
            disabled={loading}
          >
            <ThemedText style={styles.btnText}>
              🔍 Analyze Cry
            </ThemedText>
          </Pressable>
        )}

        {/* CLEAR BUTTON */}
        {(audioUri || result) && !loading && (
          <Pressable style={[styles.clearBtn, { backgroundColor: clearBtnBg }]} onPress={clearAll}>
            <ThemedText style={[styles.clearText, { color: clearTextColor }]}>🗑️ Clear</ThemedText>
          </Pressable>
        )}

        {/* LOADING */}
        {loading && <ActivityIndicator size="large" style={styles.loader} />}

        {/* RESULT */}
        {result && result.label && (
          <ThemedView 
            lightColor="rgba(78, 205, 196, 0.08)" 
            darkColor="rgba(78, 205, 196, 0.15)" 
            style={styles.resultBox}
          >
            <ThemedText style={styles.resultTitle}>
              {labelPretty(result.label)}
            </ThemedText>
            <ThemedText style={styles.confText}>
              Confidence: {(result.confidence * 100).toFixed(1)}%
            </ThemedText>
            {result.message && (
              <ThemedText style={styles.messageText}>
                {result.message}
              </ThemedText>
            )}
          </ThemedView>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: { 
    fontSize: 32, 
    fontWeight: "900", 
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: { 
    marginTop: 4, 
    opacity: 0.65, 
    fontSize: 16, 
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  card: {
    marginTop: 32,
    padding: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 1,
  },

  btn: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    marginTop: 12,
    shadowColor: "#FF6B6B",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    minHeight: 56,
  },
  stop: { 
    backgroundColor: "#E53935",
    shadowColor: "#E53935",
  },
  analyzeBtn: { 
    backgroundColor: "#4ECDC4",
    shadowColor: "#4ECDC4",
    marginTop: 16,
  },
  btnDisabled: { 
    opacity: 0.4,
    shadowOpacity: 0,
  },

  btnText: { 
    color: "#fff", 
    fontWeight: "800", 
    fontSize: 17,
    letterSpacing: 0.3,
  },

  statusText: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 15,
    textAlign: "center",
    color: "#4ECDC4",
    fontWeight: "600",
    backgroundColor: "rgba(78, 205, 196, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },

  clearBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  clearText: {
    fontSize: 15,
    fontWeight: "600",
  },

  loader: {
    marginTop: 24,
    marginBottom: 8,
  },

  resultBox: {
    marginTop: 24,
    alignItems: "center",
    padding: 28,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#4ECDC4",
    shadowColor: "#4ECDC4",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  resultTitle: { 
    fontSize: 32, 
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  confText: { 
    marginTop: 8, 
    fontSize: 18,
    fontWeight: "700",
    color: "#4ECDC4",
  },
  messageText: {
    marginTop: 12,
    opacity: 0.65,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
});

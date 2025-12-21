import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform, 
} from "react-native";
import { Audio } from "expo-av";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

// --- CONFIGURATION ---
// USB Tethering IP (Update this if you reconnect USB!)
const API_URL = "http://192.168.8.119:8000/predict-cry";

export default function CryTranslatorScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Get theme-aware colors
  const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.1)' }, 'background');
  const clearBtnBg = useThemeColor({ light: 'rgba(0,0,0,0.03)', dark: 'rgba(255,255,255,0.08)' }, 'background');
  const clearTextColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');

  // --- 1. START RECORDING ---
  // Start recording audio (Auto-stop after 5s)
  const startRecording = async () => {
    setResult(null);
    setAudioUri(null);
    
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

      // --- AUTO STOP LOGIC ---
      console.log("Recording started... stopping in 5s");
      
      // Stop automatically after 5000ms (5 seconds)
      setTimeout(async () => {
        // We need to check if 'rec' is still valid inside the timeout
        try {
            await rec.stopAndUnloadAsync();
            const uri = rec.getURI();
            setRecording(null);
            setAudioUri(uri || null);
            console.log("Auto-stopped recording successfully");
            
            // Optional: Haptic feedback (vibration) here to tell user it's done
        } catch (e) {
            console.log("Auto-stop error (user might have stopped manually):", e);
        }
      }, 5000);

    } catch (e) {
      console.log("startRecording error", e);
    }
  };

  // --- 2. STOP RECORDING ---
  const stopRecording = async () => {
    if (!recording) return;

    setLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setAudioUri(uri || null);
    } catch (e) {
      console.log("stopRecording error", e);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. PLAY RECORDING ---
  const playRecording = async () => {
    if (!audioUri) return;
    try {
      console.log("Loading Sound");
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      setSound(sound);
      console.log("Playing Sound");
      await sound.playAsync();
    } catch (e) {
      console.log("Play Error", e);
      Alert.alert("Error", "Cannot play audio");
    }
  };

  // --- 4. UPLOAD AND ANALYZE (UPDATED) ---
  const uploadAndPredict = async () => {
    if (!audioUri) {
      Alert.alert("Missing audio", "Please record baby cry audio first.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      
      // FIX: Handle Web vs Mobile File Types safely
      if (Platform.OS === 'web') {
          // Web: Fetch as blob
          const response = await fetch(audioUri);
          const blob = await response.blob();
          formData.append("file", blob, "recording.webm");
      } else {
          // Mobile: Send file object with correct MIME type
          const uriParts = audioUri.split('.');
          const fileType = uriParts[uriParts.length - 1]; // e.g. "m4a"
          
          // Android is picky: 'audio/mp4' is safer for m4a files
          const mimeType = fileType === 'm4a' ? 'audio/mp4' : `audio/${fileType}`;

          formData.append("file", {
            uri: audioUri,
            name: `recording.${fileType}`, 
            type: mimeType,
          } as any);
      }

      console.log(`Sending to backend: ${API_URL}`);

      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
        headers: {
            'Accept': 'application/json',
            // Note: Content-Type is set automatically by fetch for FormData
        },
      });

      const json = await res.json();
      
      if (res.ok) {
        setResult(json);
      } else {
        Alert.alert("Server Error", json.detail || "Prediction failed");
      }
    } catch (e) {
      console.log("Upload Error:", e);
      Alert.alert("Connection Failed", "Make sure backend is running and IP is correct.");
    } finally {
      setLoading(false);
    }
  };

  // --- 5. CLEAR DATA ---
  const clearAll = () => {
    setAudioUri(null);
    setResult(null);
    setRecording(null);
    if (sound) {
        sound.unloadAsync();
    }
  };

  // Helper for nice labels
  const labelPretty = (label?: string) => {
    if (!label) return "";
    if (label === "pain_cry") return "😢 Pain Cry";
    if (label === "hunger_cry") return "🍼 Hunger Cry";
    if (label === "normal_cry") return "🙂 Normal Cry";
    return label;
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Cry Translator</ThemedText>
      <ThemedText style={styles.subtitle}>Record your baby's cry and get instant AI analysis</ThemedText>

      <ThemedView lightColor="#FFFFFF" darkColor="#1E1E1E" style={[styles.card, { borderColor }]}>
        
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

        {/* PLAY BUTTON */}
        {audioUri && !recording && (
           <Pressable style={[styles.btn, styles.playBtn]} onPress={playRecording}>
             <ThemedText style={styles.btnText}>▶️ Play Recording</ThemedText>
           </Pressable>
        )}

        {/* ANALYZE BUTTON */}
        {audioUri && !recording && (
          <Pressable
            style={[styles.btn, styles.analyzeBtn, loading && styles.btnDisabled]}
            onPress={uploadAndPredict}
            disabled={loading}
          >
            <ThemedText style={styles.btnText}>🔍 Analyze Cry</ThemedText>
          </Pressable>
        )}

        {/* CLEAR BUTTON */}
        {(audioUri || result) && !loading && (
          <Pressable style={[styles.clearBtn, { backgroundColor: clearBtnBg }]} onPress={clearAll}>
            <ThemedText style={[styles.clearText, { color: clearTextColor }]}>🗑️ Clear</ThemedText>
          </Pressable>
        )}

        {/* LOADING SPINNER */}
        {loading && <ActivityIndicator size="large" style={styles.loader} />}

        {/* RESULT DISPLAY */}
        {result && result.label && (
          <ThemedView lightColor="rgba(78, 205, 196, 0.08)" darkColor="rgba(78, 205, 196, 0.15)" style={styles.resultBox}>
            <ThemedText style={styles.resultTitle}>{labelPretty(result.label)}</ThemedText>
            <ThemedText style={styles.confText}>Confidence: {(result.confidence * 100).toFixed(1)}%</ThemedText>
            {result.message && <ThemedText style={styles.messageText}>{result.message}</ThemedText>}
          </ThemedView>
        )}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 32, fontWeight: "900", marginBottom: 12, textAlign: "center", letterSpacing: -0.5 },
  subtitle: { marginTop: 4, opacity: 0.65, fontSize: 16, lineHeight: 24, textAlign: "center", paddingHorizontal: 20 },
  card: { marginTop: 32, padding: 24, borderRadius: 24, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8, borderWidth: 1 },
  
  btn: { paddingVertical: 18, paddingHorizontal: 24, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FF6B6B", marginTop: 12, shadowColor: "#FF6B6B", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4, minHeight: 56 },
  stop: { backgroundColor: "#E53935", shadowColor: "#E53935" },
  playBtn: { backgroundColor: "#4D96FF", shadowColor: "#4D96FF" },
  analyzeBtn: { backgroundColor: "#4ECDC4", shadowColor: "#4ECDC4", marginTop: 16 },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 17, letterSpacing: 0.3 },
  
  clearBtn: { marginTop: 16, alignItems: "center", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  clearText: { fontSize: 15, fontWeight: "600" },
  loader: { marginTop: 24, marginBottom: 8 },
  
  resultBox: { marginTop: 24, alignItems: "center", padding: 28, borderRadius: 20, borderWidth: 2, borderColor: "#4ECDC4", shadowColor: "#4ECDC4", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  resultTitle: { fontSize: 32, fontWeight: "900", marginBottom: 12, letterSpacing: -0.5 },
  confText: { marginTop: 8, fontSize: 18, fontWeight: "700", color: "#4ECDC4" },
  messageText: { marginTop: 12, opacity: 0.65, fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },
});
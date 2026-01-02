import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform, 
  Image,
  ScrollView
} from "react-native";
import { Audio } from "expo-av";
import * as ImagePicker from 'expo-image-picker'; // <--- NEW IMPORT

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

// --- CONFIGURATION ---
const BASE_URL = "http://localhost:8000";
const AUDIO_API = `${BASE_URL}/predict-cry`;
const FACE_API = `${BASE_URL}/predict-face`; // <--- NEW ENDPOINT

export default function CryTranslatorScreen() {
  // --- STATE ---
  const [mode, setMode] = useState<'audio' | 'face'>('audio'); // Toggle modes
  
  // Audio State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Face State
  const [faceUri, setFaceUri] = useState<string | null>(null);

  // Shared State
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Colors
  const borderColor = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.1)' }, 'background');
  const activeTabColor = "#4ECDC4";
  const inactiveTabColor = "#ccc";

  // ==============================
  // 🎵 AUDIO LOGIC (Keep existing)
  // ==============================
  const startRecording = async () => {
    setResult(null);
    setAudioUri(null);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission needed"); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setTimeout(async () => {
        try {
            const status = await rec.getStatusAsync();
            if (status.isRecording) {
                await rec.stopAndUnloadAsync();
                setRecording(null);
                setAudioUri(rec.getURI() || null);
            }
        } catch (e) {}
      }, 5000);
    } catch (e) {}
  };

  const stopRecording = async () => {
    if (!recording) return;
    setLoading(true);
    await recording.stopAndUnloadAsync();
    setRecording(null);
    setAudioUri(recording.getURI() || null);
    setLoading(false);
  };

  const playRecording = async () => {
    if (!audioUri) return;
    const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
    setSound(sound);
    await sound.playAsync();
  };

  // ==============================
  // 📸 FACE LOGIC (New)
  // ==============================
  const pickImage = async (useCamera: boolean) => {
    setResult(null);
    setFaceUri(null);

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Camera access is required."); return; }

    let result;
    if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1], // Square is better for AI
            quality: 1,
        });
    } else {
        result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
    }

    if (!result.canceled) {
        setFaceUri(result.assets[0].uri);
    }
  };

  // ==============================
  // 🚀 UPLOAD LOGIC (Unified)
  // ==============================
  const analyzeData = async () => {
    const isAudio = mode === 'audio';
    const uri = isAudio ? audioUri : faceUri;
    const api = isAudio ? AUDIO_API : FACE_API;

    if (!uri) {
      Alert.alert("Missing Data", `Please ${isAudio ? 'record audio' : 'take a photo'} first.`);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append("file", blob, isAudio ? "audio.webm" : "face.jpg");
      } else {
          const type = isAudio ? 'audio/mp4' : 'image/jpeg';
          const name = isAudio ? 'recording.m4a' : 'face.jpg';
          formData.append("file", { uri, name, type } as any);
      }

      const res = await fetch(api, {
        method: "POST",
        body: formData,
        headers: { 'Accept': 'application/json' },
      });

      const json = await res.json();
      if (res.ok) setResult(json);
      else Alert.alert("Error", json.detail || "Failed");

    } catch (e) {
      Alert.alert("Connection Failed", "Check Backend IP.");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setAudioUri(null);
    setFaceUri(null);
    setResult(null);
    setRecording(null);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        
        <ThemedText type="title" style={styles.title}>Cry Translator</ThemedText>

        {/* --- TABS --- */}
        <View style={styles.tabContainer}>
            <Pressable 
                style={[styles.tab, mode === 'audio' && { backgroundColor: activeTabColor }]} 
                onPress={() => { setMode('audio'); clearAll(); }}
            >
                <ThemedText style={styles.tabText}>🎤 Audio</ThemedText>
            </Pressable>
            <Pressable 
                style={[styles.tab, mode === 'face' && { backgroundColor: activeTabColor }]} 
                onPress={() => { setMode('face'); clearAll(); }}
            >
                <ThemedText style={styles.tabText}>📸 Face</ThemedText>
            </Pressable>
        </View>

        <ThemedView lightColor="#FFFFFF" darkColor="#1E1E1E" style={[styles.card, { borderColor }]}>
          
          {/* --- AUDIO UI --- */}
          {mode === 'audio' && (
            <>
                <ThemedText style={styles.instruction}>Record 5 seconds of crying</ThemedText>
                {!recording ? (
                <Pressable style={styles.btn} onPress={startRecording}>
                    <ThemedText style={styles.btnText}>{audioUri ? "🔄 Re-record" : "🎤 Start"}</ThemedText>
                </Pressable>
                ) : (
                <Pressable style={[styles.btn, styles.stopBtn]} onPress={stopRecording}>
                    <ThemedText style={styles.btnText}>⏹️ Stop</ThemedText>
                </Pressable>
                )}
                {audioUri && !recording && (
                   <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={playRecording}>
                        <ThemedText style={styles.btnText}>▶️ Play</ThemedText>
                   </Pressable> 
                )}
            </>
          )}

          {/* --- FACE UI --- */}
          {mode === 'face' && (
            <>
                <ThemedText style={styles.instruction}>Take a clear photo of the baby's face</ThemedText>
                <View style={styles.row}>
                    <Pressable style={[styles.btn, styles.halfBtn]} onPress={() => pickImage(true)}>
                        <ThemedText style={styles.btnText}>📷 Camera</ThemedText>
                    </Pressable>
                    <Pressable style={[styles.btn, styles.halfBtn, styles.secondaryBtn]} onPress={() => pickImage(false)}>
                        <ThemedText style={styles.btnText}>🖼️ Gallery</ThemedText>
                    </Pressable>
                </View>
                
                {faceUri && (
                    <Image source={{ uri: faceUri }} style={styles.previewImage} />
                )}
            </>
          )}

          {/* --- ANALYZE BUTTON --- */}
          {(audioUri || faceUri) && !recording && (
            <Pressable style={[styles.btn, styles.analyzeBtn]} onPress={analyzeData} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.btnText}>🔍 Analyze</ThemedText>}
            </Pressable>
          )}
          
          {/* --- RESULT --- */}
          {result && (
            <ThemedView lightColor="rgba(78, 205, 196, 0.1)" darkColor="rgba(78, 205, 196, 0.2)" style={styles.resultBox}>
                <ThemedText style={styles.resultTitle}>
                    {result.label === 'pain_expression' || result.label === 'pain_cry' ? '😣 Pain Detected' : '🙂 No Pain / Normal'}
                </ThemedText>
                <ThemedText style={styles.confText}>Confidence: {result.confidence.toFixed(1)}%</ThemedText>
                <ThemedText style={styles.msgText}>{result.message}</ThemedText>
            </ThemedView>
          )}

          {/* --- CLEAR --- */}
          {(audioUri || faceUri) && !loading && (
            <Pressable onPress={clearAll} style={styles.clearLink}>
                <ThemedText style={{ color: '#999' }}>Clear & Restart</ThemedText>
            </Pressable>
          )}

        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: "900", marginBottom: 20, textAlign: "center" },
  
  tabContainer: { flexDirection: 'row', marginBottom: 20, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#f0f0f0' },
  tabText: { fontWeight: '700', fontSize: 16 },
  
  card: { padding: 24, borderRadius: 24, shadowOpacity: 0.1, elevation: 5 },
  instruction: { textAlign: 'center', opacity: 0.6, marginBottom: 15 },
  
  btn: { padding: 16, borderRadius: 14, alignItems: 'center', backgroundColor: '#FF6B6B', marginBottom: 10 },
  stopBtn: { backgroundColor: '#E53935' },
  secondaryBtn: { backgroundColor: '#4D96FF' },
  analyzeBtn: { backgroundColor: '#4ECDC4', marginTop: 10 },
  halfBtn: { flex: 1, marginHorizontal: 5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  previewImage: { width: '100%', height: 250, borderRadius: 12, marginVertical: 10, resizeMode: 'cover' },
  
  resultBox: { marginTop: 20, padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 2, borderColor: '#4ECDC4' },
  resultTitle: { fontSize: 24, fontWeight: '800', marginBottom: 5 },
  confText: { fontSize: 16, fontWeight: '600', color: '#4ECDC4' },
  msgText: { marginTop: 8, opacity: 0.7 },
  
  clearLink: { marginTop: 15, alignItems: 'center' }
});
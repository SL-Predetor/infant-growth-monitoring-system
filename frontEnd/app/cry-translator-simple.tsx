import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  ScrollView,
  TextInput
} from "react-native";
import { Audio } from "expo-av";
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

// --- CONFIGURATION ---
const BASE_URL = "http://localhost:8000";
const AUDIO_API = `${BASE_URL}/predict-cry`;
const FACE_API = `${BASE_URL}/predict-face`;
const FUSION_API = `${BASE_URL}/fusion/predict`;

export default function CryTranslatorScreen() {
  type AudioResult = {
    label: string;
    confidence: number;
    message?: string;
    isFusion?: false;
  };

  type FaceResult = {
    label: string;
    confidence: number;
    message?: string;
    pain_probability?: number;
    features?: unknown;
    isFusion?: false;
  };

  type FusionResult = {
    predicted_cry_reason: string;
    confidence: number;
    confidence_level: 'Low' | 'Medium' | 'High' | string;
    confidence_message?: string;
    context_info?: string;
    all_class_probabilities?: Record<string, number>;
    disclaimer?: string;
    model_disagreement?: boolean;
    isFusion: true;
  };

  type ResultState = AudioResult | FaceResult | FusionResult | null;

  // --- STATE ---
  const [mode, setMode] = useState<'audio' | 'face' | 'comprehensive'>('audio');

  // Audio State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Face State
  const [faceUri, setFaceUri] = useState<string | null>(null);

  // Shared State
  const [result, setResult] = useState<ResultState>(null);
  const [loading, setLoading] = useState(false);

  // Contextual Data for Fusion Analysis
  const [contextData, setContextData] = useState({
    baby_age_months: '',
    time_since_feed_hours: '',
    time_since_sleep_hours: '',
    diaper_status: 'Clean',
    room_temperature_celsius: '',
  });

  // Colors
  const bgColor = useThemeColor({ light: '#F8F9FA', dark: '#0A0A0A' }, 'background');
  const cardColor = useThemeColor({ light: '#FFFFFF', dark: '#1A1A1A' }, 'background');
  const inputBg = useThemeColor({ light: '#F5F5F5', dark: '#2A2A2A' }, 'background');
  const textColor = useThemeColor({ light: '#000000', dark: '#FFFFFF' }, 'text');

  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Normalize confidence scale between 0-1 and 0-100.
  const to01 = (value: number | string | null | undefined) => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return 0;
    return num > 1 ? num / 100 : num;
  };

  // Normalize confidence scale for display as percent.
  const toPct = (value: number | string | null | undefined) => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return 0;
    return num <= 1 ? num * 100 : num;
  };

  const mapAudioLabel = (label?: string) => {
    const normalized = (label || '').toLowerCase();
    if (normalized === 'pain_cry') return 'Pain';
    if (normalized === 'hunger_cry') return 'Hunger';
    if (normalized === 'normal_cry') return 'Normal';
    return 'Unknown';
  };

  const mapFaceLabel = (label?: string) => {
    const normalized = (label || '').toLowerCase();
    if (normalized === 'pain_expression') return 'Pain';
    if (normalized === 'no_pain' || normalized === 'no-pain') return 'No-Pain';
    return 'Unknown';
  };

  // Retry fusion endpoint once if we hit a 404 (alternate route fallback).
  const postFusion = async (payload: Record<string, any>) => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    const post = (url: string) => fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    let res = await post(FUSION_API);
    if (res.status === 404) {
      res = await post(`${BASE_URL}/predict`);
    }
    return res;
  };

  const nonFusionConfidencePct = result && !('isFusion' in result && result.isFusion)
    ? toPct(result.confidence)
    : 0;

  const isFusionResult = (value: ResultState): value is FusionResult => {
    return !!value && 'isFusion' in value && value.isFusion === true;
  };

  const isNonFusionResult = (value: ResultState): value is AudioResult | FaceResult => {
    return !!value && !isFusionResult(value) && 'label' in value;
  };

  const clearStopTimeout = () => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  };

  const abortActiveRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const unloadSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (e) { }
      soundRef.current = null;
      setSound(null);
    }
  };

  const stopAndUnloadRecording = async () => {
    if (!recordingRef.current) return;
    try {
      const status = await recordingRef.current.getStatusAsync();
      if (status.isRecording) {
        await recordingRef.current.stopAndUnloadAsync();
      }
    } catch (e) { }
    recordingRef.current = null;
    setRecording(null);
  };

  const setNonRecordingAudioMode = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (e) { }
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearStopTimeout();
      abortActiveRequest();
      void unloadSound();
      void stopAndUnloadRecording();
    };
  }, []);

  // ==============================
  // 🎵 AUDIO LOGIC
  // ==============================
  const startRecording = async () => {
    setResult(null);
    setAudioUri(null);
    clearStopTimeout();
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert("Permission needed"); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      recordingRef.current = rec;
      stopTimeoutRef.current = setTimeout(async () => {
        try {
          const status = await rec.getStatusAsync();
          if (status.isRecording) {
            await rec.stopAndUnloadAsync();
            setRecording(null);
            setAudioUri(rec.getURI() || null);
            recordingRef.current = null;
            await setNonRecordingAudioMode();
          }
        } catch (e) { }
      }, 5000);
    } catch (e) { }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setLoading(true);
    clearStopTimeout();
    await recording.stopAndUnloadAsync();
    setRecording(null);
    setAudioUri(recording.getURI() || null);
    recordingRef.current = null;
    await setNonRecordingAudioMode();
    setLoading(false);
  };

  const playRecording = async () => {
    if (!audioUri) return;
    await unloadSound();
    const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
    setSound(sound);
    soundRef.current = sound;
    await sound.playAsync();
  };

  // ==============================
  // 📸 FACE LOGIC
  // ==============================
  const pickImage = async (useCamera: boolean) => {
    setResult(null);
    setFaceUri(null);

    if (Platform.OS !== 'web') {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Camera access is required."); return; }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Gallery access is required."); return; }
      }
    }

    let pickerResult;
    if (useCamera) {
      pickerResult = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
    } else {
      pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
    }

    if (!pickerResult.canceled) {
      setFaceUri(pickerResult.assets[0].uri);
    }
  };

  // ==============================
  // 🚀 UPLOAD LOGIC
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
    abortActiveRequest();
    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append("file", blob, isAudio ? "audio.webm" : "face.jpg");
      } else {
        const type = isAudio ? 'audio/m4a' : 'image/jpeg';
        const name = isAudio ? 'recording.m4a' : 'face.jpg';
        formData.append("file", { uri, name, type } as any);
      }

      const res = await fetch(api, {
        method: "POST",
        body: formData,
        headers: { 'Accept': 'application/json' },
        signal: abortControllerRef.current.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const json = isJson ? await res.json() : null;
      if (!res.ok) {
        Alert.alert("Error", json?.detail || `Request failed (${res.status})`);
        return;
      }
      if (!json) {
        Alert.alert("Error", `Unexpected response (${res.status})`);
        return;
      }
      if (isMountedRef.current) setResult(json);

    } catch (e) {
      const isAbort = (e as { name?: string } | null)?.name === 'AbortError';
      if (!isAbort) {
        Alert.alert("Connection Failed", "Check Backend IP.");
      }
    } finally {
      abortControllerRef.current = null;
      if (isMountedRef.current) setLoading(false);
    }
  };

  const clearAll = () => {
    clearStopTimeout();
    abortActiveRequest();
    void unloadSound();
    void stopAndUnloadRecording();
    setAudioUri(null);
    setFaceUri(null);
    setResult(null);
  };

  // ==============================
  // 🧠 COMPREHENSIVE FUSION ANALYSIS
  // ==============================
  const comprehensiveAnalysis = async () => {
    console.log('=== COMPREHENSIVE ANALYSIS STARTED ===');
    console.log('Mode:', mode);
    console.log('Audio URI:', audioUri);
    console.log('Face URI:', faceUri);
    console.log('Context Data:', contextData);
    console.log('Loading state:', loading);

    let nonFusionResult: AudioResult | FaceResult | null = null;

    // For comprehensive mode, check if we have audio or face data
    if (mode === 'comprehensive') {
      if (!audioUri && !faceUri) {
        console.log('ERROR: No audio or face data');
        Alert.alert('Missing Data', 'Please record audio and/or take a photo first.');
        return;
      }
      console.log('✓ Audio/Face validation passed');
    } else {
      // For other modes, validate that analysis has been done
      if (!isNonFusionResult(result)) {
        console.log('ERROR: No result available');
        Alert.alert('Analysis Required', 'Please analyze audio or face first before comprehensive analysis.');
        return;
      }
      nonFusionResult = result;
      console.log('✓ Result validation passed');
    }

    // Validate context data (room temp is optional)
    console.log('Validating context data...');
    if (!contextData.baby_age_months || !contextData.time_since_feed_hours ||
      !contextData.time_since_sleep_hours) {
      console.log('ERROR: Missing required context fields');
      Alert.alert('Missing Information', 'Please fill in baby age, time since feed, and time since sleep.');
      return;
    }
    console.log('✓ Required context fields filled');

    const age = parseFloat(contextData.baby_age_months);
    const temp = contextData.room_temperature_celsius ? parseFloat(contextData.room_temperature_celsius) : 24; // Default 24°C
    console.log('Parsed age:', age, 'temp:', temp);

    if (isNaN(age) || age < 0 || age > 36) {
      console.log('ERROR: Invalid age');
      Alert.alert('Invalid Input', 'Baby age must be between 0-36 months');
      return;
    }
    if (contextData.room_temperature_celsius && (isNaN(temp) || temp < 5 || temp > 35)) {
      console.log('ERROR: Invalid temperature');
      Alert.alert('Invalid Input', 'Room temperature must be between 5-35°C');
      return;
    }
    console.log('✓ Validation passed, starting analysis');

    setLoading(true);
    abortActiveRequest();
    abortControllerRef.current = new AbortController();

    try {
      let audioPrediction = 'Unknown';
      let audioConfidence = 0;
      let imagePrediction = 'Unknown';
      let imageConfidence = 0;

      // For comprehensive mode, analyze audio and/or face first
      if (mode === 'comprehensive') {
        // Analyze audio if available
        if (audioUri) {
          const formData = new FormData();
          if (Platform.OS === 'web') {
            const response = await fetch(audioUri);
            const blob = await response.blob();
            formData.append("file", blob, "audio.webm");
          } else {
            formData.append("file", { uri: audioUri, name: 'recording.m4a', type: 'audio/m4a' } as any);
          }

          const audioRes = await fetch(AUDIO_API, {
            method: "POST",
            body: formData,
            headers: { 'Accept': 'application/json' },
            signal: abortControllerRef.current.signal,
          });

          const audioContentType = audioRes.headers.get('content-type') || '';
          const audioJson = audioContentType.includes('application/json')
            ? await audioRes.json()
            : null;
          if (audioRes.ok && audioJson) {
            audioPrediction = mapAudioLabel(audioJson.label);
            audioConfidence = to01(audioJson.confidence);
          } else if (!audioRes.ok) {
            Alert.alert("Error", audioJson?.detail || `Audio request failed (${audioRes.status})`);
            return;
          }
        }

        // Analyze face if available
        if (faceUri) {
          const formData = new FormData();
          if (Platform.OS === 'web') {
            const response = await fetch(faceUri);
            const blob = await response.blob();
            formData.append("file", blob, "face.jpg");
          } else {
            formData.append("file", { uri: faceUri, name: 'face.jpg', type: 'image/jpeg' } as any);
          }

          const faceRes = await fetch(FACE_API, {
            method: "POST",
            body: formData,
            headers: { 'Accept': 'application/json' },
            signal: abortControllerRef.current.signal,
          });

          const faceContentType = faceRes.headers.get('content-type') || '';
          const faceJson = faceContentType.includes('application/json')
            ? await faceRes.json()
            : null;
          if (faceRes.ok && faceJson) {
            imagePrediction = mapFaceLabel(faceJson.label);
            imageConfidence = to01(faceJson.confidence);
          } else if (!faceRes.ok) {
            Alert.alert("Error", faceJson?.detail || `Face request failed (${faceRes.status})`);
            return;
          }
        }
      } else {
        // Parse from existing result for audio/face modes
        if (!nonFusionResult) {
          Alert.alert('Analysis Required', 'Please analyze audio or face first before comprehensive analysis.');
          return;
        }
        if (mode === 'audio') {
          audioPrediction = mapAudioLabel(nonFusionResult.label);
          audioConfidence = to01(nonFusionResult.confidence);
        } else {
          imagePrediction = mapFaceLabel(nonFusionResult.label);
          imageConfidence = to01(nonFusionResult.confidence);
        }
      }

      const payload = {
        baby_age_months: parseFloat(contextData.baby_age_months),
        audio_predicted_class: audioPrediction,
        audio_confidence: audioConfidence,
        image_predicted_class: imagePrediction,
        image_confidence: imageConfidence,
        time_since_feed_hours: parseFloat(contextData.time_since_feed_hours),
        time_since_sleep_hours: parseFloat(contextData.time_since_sleep_hours),
        diaper_status: contextData.diaper_status,
        room_temperature_celsius: contextData.room_temperature_celsius ? parseFloat(contextData.room_temperature_celsius) : 24,
      };

      console.log('Sending payload to fusion API:', payload);
      console.log('FUSION_API URL:', FUSION_API);

      const res = await postFusion(payload);

      console.log('Response status:', res.status);
      const contentType = res.headers.get('content-type') || '';
      const json = contentType.includes('application/json') ? await res.json() : null;
      console.log('Response data:', json);

      if (!res.ok) {
        Alert.alert('Error', json?.detail || `Fusion request failed (${res.status})`);
        return;
      }
      if (!json) {
        Alert.alert('Error', `Unexpected response (${res.status})`);
        return;
      }
      if (res.ok) {
        console.log('✓ Fusion analysis successful!');
        const audioIsPain = audioPrediction === 'Pain';
        const imageIsPain = imagePrediction === 'Pain';
        const hasDisagreement = Object.prototype.hasOwnProperty.call(json, 'model_disagreement');
        if (isMountedRef.current) {
          setResult({
            ...json,
            model_disagreement: hasDisagreement ? audioIsPain !== imageIsPain : json.model_disagreement,
            isFusion: true,
          });
        }
        console.log('Result set with isFusion=true');
      } else {
        console.log('ERROR: API returned error');
        Alert.alert('Error', json.detail || 'Failed to analyze');
      }
    } catch (e: any) {
      const isAbort = (e as { name?: string } | null)?.name === 'AbortError';
      if (!isAbort) {
        console.error('Comprehensive analysis error:', e);
        Alert.alert('Connection Failed', e.message || 'Check Backend IP and ensure server is running.');
      }
    } finally {
      abortControllerRef.current = null;
      if (isMountedRef.current) setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <ThemedText type="title" style={styles.title}>Cry Translator</ThemedText>
        <ThemedText style={styles.subtitle}>AI-powered infant communication analysis</ThemedText>

        {/* --- TABS --- */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, mode === 'audio' && styles.activeTab]}
            onPress={() => { setMode('audio'); clearAll(); }}
          >
            <ThemedText style={[styles.tabText, mode === 'audio' && styles.activeTabText]}>
              {mode === 'audio' ? '🎤' : '🎵'} Audio
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === 'face' && styles.activeTab]}
            onPress={() => { setMode('face'); clearAll(); }}
          >
            <ThemedText style={[styles.tabText, mode === 'face' && styles.activeTabText]}>
              {mode === 'face' ? '📸' : '👶'} Face
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === 'comprehensive' && styles.activeTab]}
            onPress={() => { setMode('comprehensive'); clearAll(); }}
          >
            <ThemedText style={[styles.tabText, mode === 'comprehensive' && styles.activeTabText]}>
              {mode === 'comprehensive' ? '🧠' : '🔍'} Full
            </ThemedText>
          </Pressable>
        </View>

        <ThemedView style={[styles.card, { backgroundColor: cardColor }]}>

          {/* --- AUDIO UI --- */}
          {mode === 'audio' && (
            <>
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <ThemedText style={styles.iconEmoji}>{recording ? '⏺️' : '🎤'}</ThemedText>
                </View>
              </View>

              <ThemedText style={styles.instruction}>
                {recording ? 'Recording...' : 'Record 5 seconds of crying'}
              </ThemedText>

              {!recording ? (
                <Pressable style={styles.primaryBtn} onPress={startRecording}>
                  <ThemedText style={styles.btnText}>{audioUri ? "🔄 Record Again" : "Start Recording"}</ThemedText>
                </Pressable>
              ) : (
                <Pressable style={styles.stopBtn} onPress={stopRecording}>
                  <ThemedText style={styles.btnText}>Stop Recording</ThemedText>
                </Pressable>
              )}

              {audioUri && !recording && (
                <Pressable style={styles.secondaryBtn} onPress={playRecording}>
                  <ThemedText style={styles.secondaryBtnText}>▶️ Play Recording</ThemedText>
                </Pressable>
              )}
            </>
          )}

          {/* --- FACE UI --- */}
          {mode === 'face' && (
            <>
              {!faceUri ? (
                <>
                  <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                      <ThemedText style={styles.iconEmoji}>📸</ThemedText>
                    </View>
                  </View>

                  <ThemedText style={styles.instruction}>
                    Capture a clear photo of baby's face
                  </ThemedText>

                  <View style={styles.row}>
                    <Pressable style={[styles.primaryBtn, styles.halfBtn]} onPress={() => pickImage(true)}>
                      <ThemedText style={styles.btnText}>📷 Camera</ThemedText>
                    </Pressable>
                    <Pressable style={[styles.secondaryBtn, styles.halfBtn]} onPress={() => pickImage(false)}>
                      <ThemedText style={styles.secondaryBtnText}>🖼️ Gallery</ThemedText>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: faceUri }} style={styles.previewImage} />
                  </View>
                  <Pressable style={styles.secondaryBtn} onPress={() => pickImage(true)}>
                    <ThemedText style={styles.secondaryBtnText}>📷 Take Another Photo</ThemedText>
                  </Pressable>
                </>
              )}
            </>
          )}

          {/* --- COMPREHENSIVE MODE UI --- */}
          {mode === 'comprehensive' && (
            <>
              <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                  <ThemedText style={styles.iconEmoji}>🧠</ThemedText>
                </View>
              </View>

              <ThemedText style={styles.instruction}>
                Complete analysis: Record cry + Take photo + Context
              </ThemedText>

              {/* Audio Recording Section */}
              <View style={styles.comprehensiveSection}>
                <ThemedText style={styles.sectionTitle}>🎤 Step 1: Record Crying</ThemedText>
                {!recording ? (
                  <Pressable
                    style={audioUri ? styles.secondaryBtn : styles.primaryBtn}
                    onPress={startRecording}
                  >
                    <ThemedText style={audioUri ? styles.secondaryBtnText : styles.btnText}>
                      {audioUri ? "✓ Recorded" : "🎤 Start Recording"}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <Pressable style={styles.stopBtn} onPress={stopRecording}>
                    <ThemedText style={styles.btnText}>⏹️ Stop Recording (5s auto)</ThemedText>
                  </Pressable>
                )}
                {audioUri && !recording && (
                  <Pressable style={[styles.secondaryBtn, { marginTop: 8 }]} onPress={playRecording}>
                    <ThemedText style={styles.secondaryBtnText}>▶️ Play</ThemedText>
                  </Pressable>
                )}
              </View>

              {/* Photo Capture Section */}
              <View style={styles.comprehensiveSection}>
                <ThemedText style={styles.sectionTitle}>📸 Step 2: Capture Face</ThemedText>
                {!faceUri ? (
                  <View style={styles.row}>
                    <Pressable style={[styles.primaryBtn, styles.halfBtn]} onPress={() => pickImage(true)}>
                      <ThemedText style={styles.btnText}>📷 Camera</ThemedText>
                    </Pressable>
                    <Pressable style={[styles.secondaryBtn, styles.halfBtn]} onPress={() => pickImage(false)}>
                      <ThemedText style={styles.secondaryBtnText}>🖼️ Gallery</ThemedText>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={styles.imagePreviewSmall}>
                      <Image source={{ uri: faceUri }} style={styles.previewImageSmall} />
                    </View>
                    <Pressable style={styles.secondaryBtn} onPress={() => pickImage(true)}>
                      <ThemedText style={styles.secondaryBtnText}>🔄 Retake Photo</ThemedText>
                    </Pressable>
                  </>
                )}
              </View>

              {/* Context Form */}
              <View style={styles.comprehensiveSection}>
                <ThemedText style={styles.sectionTitle}>📋 Step 3: Context Info</ThemedText>

                <ThemedText style={styles.contextLabel}>Baby Age (months)</ThemedText>
                <TextInput
                  style={[styles.contextInput, { backgroundColor: inputBg, color: textColor }]}
                  value={contextData.baby_age_months}
                  onChangeText={(val) => setContextData({ ...contextData, baby_age_months: val })}
                  placeholder="e.g., 6"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />

                <ThemedText style={styles.contextLabel}>Time Since Feed (hours)</ThemedText>
                <TextInput
                  style={[styles.contextInput, { backgroundColor: inputBg, color: textColor }]}
                  value={contextData.time_since_feed_hours}
                  onChangeText={(val) => setContextData({ ...contextData, time_since_feed_hours: val })}
                  placeholder="e.g., 4.5"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />

                <ThemedText style={styles.contextLabel}>Time Since Sleep (hours)</ThemedText>
                <TextInput
                  style={[styles.contextInput, { backgroundColor: inputBg, color: textColor }]}
                  value={contextData.time_since_sleep_hours}
                  onChangeText={(val) => setContextData({ ...contextData, time_since_sleep_hours: val })}
                  placeholder="e.g., 1.2"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />

                <ThemedText style={styles.contextLabel}>Diaper Status</ThemedText>
                <View style={styles.diaperButtons}>
                  {['Clean', 'Wet', 'Soiled'].map((status) => (
                    <Pressable
                      key={status}
                      style={[
                        styles.diaperBtn,
                        contextData.diaper_status === status && styles.diaperBtnActive
                      ]}
                      onPress={() => setContextData({ ...contextData, diaper_status: status })}
                    >
                      <ThemedText style={[
                        styles.diaperBtnText,
                        contextData.diaper_status === status && styles.diaperBtnTextActive
                      ]}>
                        {status === 'Clean' ? '✨' : status === 'Wet' ? '💧' : '💩'} {status}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                <ThemedText style={styles.contextLabel}>Room Temperature (°C) - Optional</ThemedText>
                <TextInput
                  style={[styles.contextInput, { backgroundColor: inputBg, color: textColor }]}
                  value={contextData.room_temperature_celsius}
                  onChangeText={(val) => setContextData({ ...contextData, room_temperature_celsius: val })}
                  placeholder="e.g., 26 (leave empty for default)"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />

                <Pressable
                  style={[styles.analyzeBtn, loading && styles.analyzeDisabled]}
                  onPress={comprehensiveAnalysis}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <ThemedText style={styles.btnText}>🧠 Analyze Comprehensively</ThemedText>
                  )}
                </Pressable>
              </View>
            </>
          )}

          {/* --- ANALYZE BUTTON --- */}
          {(audioUri || faceUri) && !recording && mode !== 'comprehensive' && (
            <Pressable
              style={[styles.analyzeBtn, loading && styles.analyzeDisabled]}
              onPress={analyzeData}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.btnText}>🔍 Analyze Now</ThemedText>
              )}
            </Pressable>
          )}



          {/* --- RESULT --- */}
          {result && (mode !== 'comprehensive' || isFusionResult(result)) && (
            <View style={styles.resultContainer}>
              {isFusionResult(result) ? (
                // Fusion Result Display
                <View style={[
                  styles.resultBox,
                  {
                    borderColor: result.confidence_level === 'High' ? '#4ECDC4' :
                      result.confidence_level === 'Medium' ? '#FFB347' : '#FF6B6B'
                  }
                ]}>
                  <View style={styles.fusionBadge}>
                    <ThemedText style={styles.fusionBadgeText}>🧠 COMPREHENSIVE ANALYSIS</ThemedText>
                  </View>

                  <View style={styles.resultIconContainer}>
                    <ThemedText style={styles.resultIcon}>
                      {result.predicted_cry_reason === 'Hunger' ? '🍼' :
                        result.predicted_cry_reason === 'Pain' ? '😢' :
                          result.predicted_cry_reason === 'Discomfort' ? '😣' :
                            result.predicted_cry_reason === 'Tiredness' ? '😴' :
                              result.predicted_cry_reason === 'Diaper' ? '🚼' : '👶'}
                    </ThemedText>
                  </View>

                  <ThemedText style={styles.resultTitle}>{result.predicted_cry_reason}</ThemedText>

                  <View style={styles.confidenceLevelBadge}>
                    <ThemedText style={[
                      styles.confidenceLevelText,
                      {
                        color: result.confidence_level === 'High' ? '#4ECDC4' :
                          result.confidence_level === 'Medium' ? '#FFB347' : '#FF6B6B'
                      }
                    ]}>
                      {result.confidence_level} Confidence
                    </ThemedText>
                  </View>

                  <View style={styles.confidenceBar}>
                    <View style={[
                      styles.confidenceFill,
                      {
                        width: `${result.confidence * 100}%`,
                        backgroundColor: result.confidence_level === 'High' ? '#4ECDC4' :
                          result.confidence_level === 'Medium' ? '#FFB347' : '#FF6B6B'
                      }
                    ]} />
                  </View>

                  <ThemedText style={styles.confText}>{(result.confidence * 100).toFixed(1)}%</ThemedText>
                  <ThemedText style={styles.msgText}>{result.confidence_message}</ThemedText>

                  {result.context_info && (
                    <View style={styles.contextInfoBox}>
                      <ThemedText style={styles.contextInfoTitle}>📌 Context:</ThemedText>
                      <ThemedText style={styles.contextInfoText}>{result.context_info}</ThemedText>
                    </View>
                  )}

                  {result.all_class_probabilities && (
                    <View style={styles.allProbabilities}>
                      <ThemedText style={styles.allProbTitle}>All Predictions:</ThemedText>
                      {Object.entries(result.all_class_probabilities).map(([cls, prob]: [string, any]) => (
                        <View key={cls} style={styles.probRow}>
                          <ThemedText style={styles.probLabel}>{cls}</ThemedText>
                          <ThemedText style={styles.probValue}>{(prob * 100).toFixed(1)}%</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.disclaimer}>
                    <ThemedText style={styles.disclaimerText}>⚠️ {result.disclaimer}</ThemedText>
                  </View>
                </View>
              ) : (
                // Standard Result Display
                <View style={[
                  styles.resultBox,
                  isNonFusionResult(result) && (result.label === 'pain_expression' || result.label === 'pain_cry')
                    ? styles.resultPain
                    : styles.resultNormal
                ]}>
                  <View style={styles.resultIconContainer}>
                    <ThemedText style={styles.resultIcon}>
                      {isNonFusionResult(result) && (result.label === 'pain_expression' || result.label === 'pain_cry') ? '😣' : '😊'}
                    </ThemedText>
                  </View>

                  <ThemedText style={styles.resultTitle}>
                    {isNonFusionResult(result) && (result.label === 'pain_expression' || result.label === 'pain_cry')
                      ? 'Pain Detected'
                      : 'Normal / No Pain'}
                  </ThemedText>

                  <View style={styles.confidenceBar}>
                    <View style={[styles.confidenceFill, { width: `${nonFusionConfidencePct}%` }]} />
                  </View>

                  <ThemedText style={styles.confText}>{nonFusionConfidencePct.toFixed(1)}% Confidence</ThemedText>
                  <ThemedText style={styles.msgText}>{result.message}</ThemedText>
                </View>
              )}
            </View>
          )}

          {/* --- CLEAR --- */}
          {(audioUri || faceUri) && !loading && (
            <Pressable onPress={clearAll} style={styles.clearBtn}>
              <ThemedText style={styles.clearText}>↻ Start Over</ThemedText>
            </Pressable>
          )}

        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24
  },

  title: {
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5
  },

  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.5,
    marginBottom: 32,
    fontWeight: '500'
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 16,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.03)'
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'transparent'
  },

  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },

  tabText: {
    fontWeight: '600',
    fontSize: 15,
    opacity: 0.5
  },

  activeTabText: {
    opacity: 1,
    color: '#4ECDC4',
    fontWeight: '700'
  },

  // Card
  card: {
    padding: 32,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8
  },

  iconContainer: {
    alignItems: 'center',
    marginBottom: 24
  },

  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },

  iconEmoji: {
    fontSize: 40
  },

  instruction: {
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 24,
    fontSize: 15,
    fontWeight: '500'
  },

  // Buttons
  primaryBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    marginBottom: 12,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },

  stopBtn: {
    backgroundColor: '#FF6B6B',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },

  secondaryBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderWidth: 2,
    borderColor: '#4ECDC4',
    marginBottom: 12
  },

  analyzeBtn: {
    backgroundColor: '#6C5CE7',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },

  analyzeDisabled: {
    opacity: 0.6
  },

  halfBtn: {
    flex: 1,
    marginHorizontal: 6
  },

  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },

  secondaryBtnText: {
    color: '#4ECDC4',
    fontWeight: '700',
    fontSize: 16
  },

  // Layout
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  imagePreviewContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden'
  },

  previewImage: {
    width: '100%',
    height: 280,
    resizeMode: 'cover'
  },

  // Results
  resultContainer: {
    marginTop: 24
  },

  resultBox: {
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2
  },

  resultPain: {
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderColor: '#FF6B6B'
  },

  resultNormal: {
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
    borderColor: '#4ECDC4'
  },

  resultIconContainer: {
    marginBottom: 12
  },

  resultIcon: {
    fontSize: 48
  },

  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.3
  },

  confidenceBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8
  },

  confidenceFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 4
  },

  confText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4ECDC4',
    marginBottom: 8
  },

  msgText: {
    marginTop: 4,
    opacity: 0.6,
    textAlign: 'center',
    fontSize: 14
  },

  clearBtn: {
    marginTop: 20,
    alignItems: 'center',
    padding: 12
  },

  clearText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '600'
  },

  // Fusion Analysis Button
  fusionBtn: {
    backgroundColor: '#6C5CE7',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  fusionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Context Form
  contextForm: {
    marginTop: 24,
    padding: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },

  contextFormDirect: {
    padding: 4,
  },

  comprehensiveSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#6C5CE7',
  },

  imagePreviewSmall: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    width: 200,
    height: 200,
  },

  previewImageSmall: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  contextFormTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
    color: '#6C5CE7',
  },

  contextLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    opacity: 0.7,
  },

  helperText: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.5,
    marginBottom: 12,
  },

  contextInput: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 8,
  },

  diaperButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },

  diaperBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },

  diaperBtnActive: {
    backgroundColor: '#6C5CE7',
  },

  diaperBtnText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },

  diaperBtnTextActive: {
    color: '#fff',
    opacity: 1,
  },

  contextBtnRow: {
    flexDirection: 'row',
    marginTop: 16,
  },

  contextCancelBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  contextCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },

  contextSubmitBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // Fusion Results
  fusionBadge: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
  },

  fusionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6C5CE7',
    letterSpacing: 1,
  },

  confidenceLevelBadge: {
    marginBottom: 12,
  },

  confidenceLevelText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  contextInfoBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(108, 92, 231, 0.05)',
    borderRadius: 12,
  },

  contextInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },

  contextInfoText: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
  },

  allProbabilities: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },

  allProbTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },

  probRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },

  probLabel: {
    fontSize: 13,
    opacity: 0.7,
  },

  probValue: {
    fontSize: 13,
    fontWeight: '600',
  },

  disclaimer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },

  disclaimerText: {
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 16,
  },
});


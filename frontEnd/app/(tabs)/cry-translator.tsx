import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// --- CONFIGURATION ---
const BASE_URL = 'http://localhost:8000';
const AUDIO_API = `${BASE_URL}/predict-cry`;
const FACE_API = `${BASE_URL}/predict-face`;

interface RecordingState {
  recording: Audio.Recording | null;
  audioUri: string | null;
  sound: Audio.Sound | null;
  faceUri: string | null;
  result: any | null;
  loading: boolean;
}

export default function CryTranslatorScreen() {
  const [mode, setMode] = useState<'audio' | 'face'>('audio');
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];
  
  const [state, setState] = useState<RecordingState>({
    recording: null,
    audioUri: null,
    sound: null,
    faceUri: null,
    result: null,
    loading: false,
  });

  // ==============================
  // 🎵 AUDIO LOGIC
  // ==============================
  const startRecording = async () => {
    setState(prev => ({ ...prev, result: null, audioUri: null }));
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setState(prev => ({ ...prev, recording: rec }));

      setTimeout(async () => {
        try {
          const status = await rec.getStatusAsync();
          if (status.isRecording) {
            await rec.stopAndUnloadAsync();
            setState(prev => ({
              ...prev,
              recording: null,
              audioUri: rec.getURI() || null,
            }));
          }
        } catch (e) {
          console.error('Error stopping recording:', e);
        }
      }, 5000);
    } catch (e) {
      console.error('Recording error:', e);
    }
  };

  const stopRecording = async () => {
    if (!state.recording) return;
    setState(prev => ({ ...prev, loading: true }));
    const recordedUri = state.recording.getURI();
    await state.recording.stopAndUnloadAsync();
    setState(prev => ({
      ...prev,
      recording: null,
      audioUri: recordedUri || null,
      loading: false,
    }));
  };

  const playRecording = async () => {
    if (!state.audioUri) return;
    const { sound } = await Audio.Sound.createAsync({ uri: state.audioUri });
    setState(prev => ({ ...prev, sound }));
    await sound.playAsync();
  };

  // ==============================
  // 📸 FACE LOGIC
  // ==============================
  const pickImage = async (useCamera: boolean) => {
    setState(prev => ({ ...prev, result: null, faceUri: null }));

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }

    try {
      let imageResult;
      if (useCamera) {
        imageResult = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });
      } else {
        imageResult = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });
      }

      if (!imageResult.canceled && imageResult.assets && imageResult.assets.length > 0) {
        setState(prev => ({ ...prev, faceUri: imageResult.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const submitAudio = async () => {
    if (!state.audioUri) {
      Alert.alert('No audio', 'Record or select audio first');
      return;
    }
    setState(prev => ({ ...prev, loading: true }));

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: state.audioUri,
        type: 'audio/mpeg',
        name: 'audio.mp3',
      } as any);

      const response = await fetch(AUDIO_API, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setState(prev => ({ ...prev, result: data }));
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to analyze audio');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const submitFace = async () => {
    if (!state.faceUri) {
      Alert.alert('No image', 'Select image first');
      return;
    }
    setState(prev => ({ ...prev, loading: true }));

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: state.faceUri,
        type: 'image/jpeg',
        name: 'face.jpg',
      } as any);

      const response = await fetch(FACE_API, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setState(prev => ({ ...prev, result: data }));
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to analyze image');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Cry Translator
        </ThemedText>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <Pressable
            style={[
              styles.modeButton,
              mode === 'audio' && { backgroundColor: themeColors.primary },
            ]}
            onPress={() => setMode('audio')}
          >
            <ThemedText
              style={{
                color: mode === 'audio' ? '#fff' : themeColors.secondaryText,
                fontWeight: '600',
              }}
            >
              🎤 Audio
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.modeButton,
              mode === 'face' && { backgroundColor: themeColors.primary },
            ]}
            onPress={() => setMode('face')}
          >
            <ThemedText
              style={{
                color: mode === 'face' ? '#fff' : themeColors.secondaryText,
                fontWeight: '600',
              }}
            >
              📸 Face
            </ThemedText>
          </Pressable>
        </View>

        {/* AUDIO MODE */}
        {mode === 'audio' && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Audio Analysis
            </ThemedText>

            <Pressable
              style={[
                styles.button,
                { backgroundColor: state.recording ? themeColors.error : themeColors.primary },
              ]}
              onPress={state.recording ? stopRecording : startRecording}
            >
              <ThemedText style={styles.buttonText}>
                {state.recording
                  ? '⏹ Stop Recording'
                  : '🎤 Start Recording'}
              </ThemedText>
            </Pressable>

            {state.audioUri && (
              <Pressable
                style={[styles.button, { backgroundColor: themeColors.warning }]}
                onPress={playRecording}
              >
                <ThemedText style={styles.buttonText}>▶ Play Audio</ThemedText>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.button,
                {
                  backgroundColor: state.audioUri ? themeColors.secondary : '#ccc',
                  opacity: state.audioUri ? 1 : 0.5,
                },
              ]}
              disabled={!state.audioUri || state.loading}
              onPress={submitAudio}
            >
              <ThemedText style={styles.buttonText}>
                {state.loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  '📊 Analyze Audio'
                )}
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* FACE MODE */}
        {mode === 'face' && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Face Analysis
            </ThemedText>

            {state.faceUri && (
              <Image
                source={{ uri: state.faceUri }}
                style={styles.previewImage}
              />
            )}

            <Pressable
              style={[styles.button, { backgroundColor: themeColors.primary }]}
              onPress={() => pickImage(true)}
            >
              <ThemedText style={styles.buttonText}>
                📸 Take Photo
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.button, { backgroundColor: themeColors.warning }]}
              onPress={() => pickImage(false)}
            >
              <ThemedText style={styles.buttonText}>
                🖼 Choose from Gallery
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.button,
                {
                  backgroundColor: state.faceUri ? themeColors.secondary : '#ccc',
                  opacity: state.faceUri ? 1 : 0.5,
                },
              ]}
              disabled={!state.faceUri || state.loading}
              onPress={submitFace}
            >
              <ThemedText style={styles.buttonText}>
                {state.loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  '📊 Analyze Face'
                )}
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* RESULTS */}
        {state.result && (
          <View style={styles.resultSection}>
            <ThemedText type="subtitle">Analysis Result</ThemedText>
            <ThemedView style={styles.resultBox}>
              <ThemedText style={styles.resultText}>
                {JSON.stringify(state.result, null, 2)}
              </ThemedText>
            </ThemedView>
          </View>
        )}

        {state.loading && mode === 'audio' && !state.result && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <ThemedText style={styles.loadingText}>
              Analyzing audio...
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 30,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    marginBottom: 20,
  },
  modeToggle: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  resultSection: {
    marginTop: 20,
  },
  resultBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'Courier New',
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
  },
});

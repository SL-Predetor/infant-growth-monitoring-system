import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Dimensions,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeInDown,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import FeedbackModal from '@/components/FeedbackModal';
import { getApiBaseUrl } from '@/lib/api-config';

// --- CONFIGURATION ---
const BASE_URL = getApiBaseUrl();
const AUDIO_API = `${BASE_URL}/predict-cry`;
const FACE_API = `${BASE_URL}/predict-face`;
const FUSION_API = `${BASE_URL}/fusion/predict`;

console.log('🔗 Smart Cry Analysis API:', BASE_URL);

const { width: screenWidth } = Dimensions.get('window');

type FlowStep = 'record' | 'capture' | 'context' | 'result';

type FusionContext = {
  baby_age_months: number;
  time_since_feed_hours: number;
  time_since_sleep_hours: number;
  diaper_status: string;
  room_temperature_celsius: number;
};

type AudioApiResult = { label: string; confidence: number; message?: string; debug_info?: Record<string, any> };
type FaceApiResult = { label: string; confidence: number; message?: string; features?: Record<string, any> };
type FusionApiResult = {
  predicted_cry_reason: string;
  confidence: number;
  confidence_level?: string;
  confidence_message?: string;
  context_info?: string;
  all_class_probabilities?: Record<string, number>;
  disclaimer?: string;
  model_disagreement?: boolean;
};

export default function SmartAnalysisScreen() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<FlowStep>('record');

  // Audio
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Face
  const [faceUri, setFaceUri] = useState<string | null>(null);

  // Loading
  const [isLoading, setIsLoading] = useState(false);

  // Context
  const [babyAge, setBabyAge] = useState('');
  const [feedingTime, setFeedingTime] = useState('');
  const [sleepTime, setSleepTime] = useState('');
  const [diaperStatus, setDiaperStatus] = useState('Clean');
  const [roomTemperature, setRoomTemperature] = useState('');

  // Result
  const [analysisResult, setAnalysisResult] = useState<FusionApiResult & {
    recommendations: string[];
    audioPrediction?: string;
    audioConfidence?: number;
    imagePrediction?: string;
    imageConfidence?: number;
    audioModelInputs?: Record<string, any>;
    imageModelInputs?: Record<string, any>;
  } | null>(null);

  // Feedback modal
  const [showFeedback, setShowFeedback] = useState(false);

  // Native recording
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Duration timer
  const durationInterval = useRef<any>(null);
  const stopTimeoutRef = useRef<any>(null);
  const isStoppingRef = useRef(false);

  // Web recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioObjectUrlRef = useRef<string | null>(null);

  // ========== ANIMATION SETUP ==========
  // Screen entrance animation
  const screenOpacity = useSharedValue(0);
  const screenTranslateY = useSharedValue(30);

  // Step badge animation
  const badgeScale = useSharedValue(0.8);
  const badgeOpacity = useSharedValue(0);

  // Form fields staggered animation (5 fields)
  const fieldAnimations = useRef([
    useSharedValue(0), // Baby age
    useSharedValue(0), // Feeding time
    useSharedValue(0), // Sleep time
    useSharedValue(0), // Diaper status
    useSharedValue(0), // Room temperature
  ]).current;

  // Diaper button press animation
  const diaperButtonScales = useRef({
    Clean: useSharedValue(1),
    Wet: useSharedValue(1),
    Soiled: useSharedValue(1),
  }).current;

  // Analyze button press animation
  const analyzeButtonScale = useSharedValue(1);
  const analyzeButtonShadow = useSharedValue(2);

  // Validation shake animation
  const validationShakeX = useSharedValue(0);

  // Loading pulse animation
  const loadingPulse = useSharedValue(1);

  // Modern color palette - Professional Baby Care Theme (Premium Healthcare)
  // Soft pastels for calming, trustworthy aesthetic
  const LIGHT_BG = '#FAFBFC';
  const LIGHT_CARD = '#FFFFFF';
  const LIGHT_TEXT = '#0F172A';
  const LIGHT_SECONDARY = '#5A6B7D';
  const PRIMARY_TEAL = '#5DAFB9';
  const SECONDARY_CORAL = '#F2B5A7';
  const ACCENT_YELLOW = '#F6C76F';
  const SUCCESS_MINT = '#7BC6A4';
  const WARNING_AMBER = '#F59E0B';
  const DANGER_RED = '#EF6F6C';
  const BORDER_LIGHT = '#E8ECEF';
  const SOFT_TEAL_BG = '#F0F9FA';
  const SOFT_CORAL_BG = '#FEF4F2';
  const SOFT_YELLOW_BG = '#FFFBF0';
  const SOFT_MINT_BG = '#F1F8F5';
  const shadowColor = '#000';

  const backgroundColor = LIGHT_BG;
  const cardBackground = LIGHT_CARD;
  const textColor = LIGHT_TEXT;
  const secondaryText = LIGHT_SECONDARY;

  // -------- Helpers --------
  const clearTimers = () => {
    isStoppingRef.current = false;
    if (durationInterval.current) clearInterval(durationInterval.current);
    durationInterval.current = null;
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    stopTimeoutRef.current = null;
  };

  const cleanupWebRecorder = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch { }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    mediaStreamRef.current = null;

    audioChunksRef.current = [];

    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimers();
      cleanupWebRecorder();
    };
  }, []);

  // ========== ANIMATION EFFECTS ==========
  // Trigger animations when context screen opens
  useEffect(() => {
    if (currentStep === 'context') {
      // Screen entrance: fade in + slide up
      screenOpacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.inOut(Easing.ease),
      });
      screenTranslateY.value = withTiming(0, {
        duration: 500,
        easing: Easing.inOut(Easing.ease),
      });

      // Step badge: scale + fade
      badgeOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.inOut(Easing.ease),
      });
      badgeScale.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.back(1.2)),
      });

      // Form fields: staggered fade-in and slide-up
      fieldAnimations.forEach((animation, index) => {
        animation.value = withDelay(
          150 + index * 100,
          withTiming(1, {
            duration: 400,
            easing: Easing.inOut(Easing.ease),
          })
        );
      });
    } else {
      // Reset animations when leaving context screen
      screenOpacity.value = 0;
      screenTranslateY.value = 30;
      badgeScale.value = 0.8;
      badgeOpacity.value = 0;
      fieldAnimations.forEach(anim => (anim.value = 0));
    }
  }, [currentStep]);

  // Loading pulse animation when analyzing
  useEffect(() => {
    if (isLoading && currentStep === 'context') {
      loadingPulse.value = withSequence(
        withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 600, easing: Easing.inOut(Easing.ease) })
      );
    } else {
      loadingPulse.value = 1;
    }
  }, [isLoading, currentStep]);

  const validateContext = (ctx: FusionContext) => {
    const errors: string[] = [];

    if (!babyAge.trim()) {
      errors.push('Baby age is required');
    } else if (!Number.isFinite(ctx.baby_age_months) || ctx.baby_age_months < 0 || ctx.baby_age_months > 36) {
      errors.push('Baby age must be between 0-36 months');
    }

    if (!feedingTime.trim()) {
      errors.push('Time since last feeding is required');
    } else if (!Number.isFinite(ctx.time_since_feed_hours) || ctx.time_since_feed_hours < 0 || ctx.time_since_feed_hours > 48) {
      errors.push('Time since last feeding must be between 0-48 hours');
    }

    if (!sleepTime.trim()) {
      errors.push('Time since last sleep is required');
    } else if (!Number.isFinite(ctx.time_since_sleep_hours) || ctx.time_since_sleep_hours < 0 || ctx.time_since_sleep_hours > 48) {
      errors.push('Time since last sleep must be between 0-48 hours');
    }

    if (!['Clean', 'Wet', 'Soiled'].includes(ctx.diaper_status)) {
      errors.push('Diaper status must be Clean/Wet/Soiled');
    }

    if (!roomTemperature.trim()) {
      errors.push('Room temperature is required');
    } else if (!Number.isFinite(ctx.room_temperature_celsius) || ctx.room_temperature_celsius < 15 || ctx.room_temperature_celsius > 35) {
      errors.push('Room temperature must be between 15-35°C');
    }

    return errors;
  };

  // ========== ANIMATED STYLES (ALL AT TOP LEVEL - RULES OF HOOKS) ==========
  const screenAnimatedStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: screenTranslateY.value }],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ scale: badgeScale.value }],
  }));

  // Field animated styles - all 5 fields at top level
  const fieldAnimatedStyle0 = useAnimatedStyle(() => ({
    opacity: fieldAnimations[0].value,
    transform: [{ translateY: (1 - fieldAnimations[0].value) * 15 }],
  }));

  const fieldAnimatedStyle1 = useAnimatedStyle(() => ({
    opacity: fieldAnimations[1].value,
    transform: [{ translateY: (1 - fieldAnimations[1].value) * 15 }],
  }));

  const fieldAnimatedStyle2 = useAnimatedStyle(() => ({
    opacity: fieldAnimations[2].value,
    transform: [{ translateY: (1 - fieldAnimations[2].value) * 15 }],
  }));

  const fieldAnimatedStyle3 = useAnimatedStyle(() => ({
    opacity: fieldAnimations[3].value,
    transform: [{ translateY: (1 - fieldAnimations[3].value) * 15 }],
  }));

  const fieldAnimatedStyle4 = useAnimatedStyle(() => ({
    opacity: fieldAnimations[4].value,
    transform: [{ translateY: (1 - fieldAnimations[4].value) * 15 }],
  }));

  const fieldAnimatedStyles = [
    fieldAnimatedStyle0,
    fieldAnimatedStyle1,
    fieldAnimatedStyle2,
    fieldAnimatedStyle3,
    fieldAnimatedStyle4,
  ];

  const analyzeButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: analyzeButtonScale.value }],
  }));

  const diaperButtonAnimatedStyleClean = useAnimatedStyle(() => ({
    transform: [{ scale: diaperButtonScales.Clean.value }],
  }));

  const diaperButtonAnimatedStyleWet = useAnimatedStyle(() => ({
    transform: [{ scale: diaperButtonScales.Wet.value }],
  }));

  const diaperButtonAnimatedStyleSoiled = useAnimatedStyle(() => ({
    transform: [{ scale: diaperButtonScales.Soiled.value }],
  }));

  const diaperButtonAnimatedStyles = {
    Clean: diaperButtonAnimatedStyleClean,
    Wet: diaperButtonAnimatedStyleWet,
    Soiled: diaperButtonAnimatedStyleSoiled,
  };

  const loadingButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loadingPulse.value }],
  }));

  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: validationShakeX.value }],
  }));

  // ========== ANIMATION HANDLERS ==========
  const handleDiaperPress = (status: 'Clean' | 'Wet' | 'Soiled') => {
    // Scale animation on press
    diaperButtonScales[status].value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.ease }),
      withSpring(1, { damping: 0.7, mass: 1, stiffness: 100 })
    );
    // Preserve original functionality
    setDiaperStatus(status);
  };

  const handleAnalyzePress = () => {
    // Scale animation
    analyzeButtonScale.value = withSequence(
      withTiming(0.97, { duration: 80, easing: Easing.ease }),
      withSpring(1, { damping: 0.6, mass: 1, stiffness: 120 })
    );
    // Trigger actual analysis (preserve original function)
    submitAnalysis();
  };

  const performValidationShake = () => {
    validationShakeX.value = withSequence(
      withTiming(-8, { duration: 80, easing: Easing.ease }),
      withTiming(8, { duration: 80, easing: Easing.ease }),
      withTiming(-8, { duration: 80, easing: Easing.ease }),
      withTiming(0, { duration: 80, easing: Easing.ease })
    );
  };

  const mapAudioLabel = (label?: string) => {
    const n = (label || '').toLowerCase();
    if (n === 'pain_cry') return 'Pain';
    if (n === 'hunger_cry') return 'Hunger';
    if (n === 'normal_cry') return 'Normal';
    return 'Unknown';
  };

  const mapFaceLabel = (label?: string) => {
    const n = (label || '').toLowerCase();
    if (n === 'pain_expression') return 'Pain';
    if (n === 'no_pain' || n === 'no-pain') return 'No-Pain';
    return 'Unknown';
  };

  const to01 = (v: any) => {
    const num = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(num)) return 0;
    return num > 1 ? num / 100 : num;
  };

  // -------- Recording (Native + Web) --------
  const startRecording = async () => {
    try {
      isStoppingRef.current = false;
      setAnalysisResult(null);
      setAudioUri(null);
      setAudioBlob(null);
      clearTimers();

      setIsRecording(true);
      setRecordingDuration(0);

      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      if (Platform.OS === 'web') {
        cleanupWebRecorder();

        const navAny = navigator as any;
        if (!navAny?.mediaDevices?.getUserMedia) {
          setIsRecording(false);
          clearTimers();
          Alert.alert('Web not supported', 'Your browser does not support audio recording.');
          return;
        }

        try {
          if (navigator.permissions?.query) {
            const permStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            if (permStatus.state === 'denied') {
              setIsRecording(false);
              clearTimers();
              Alert.alert(
                'Microphone Blocked',
                'Microphone access is blocked by your browser or system.\n\n' +
                '1. Click the lock/info icon in the address bar\n' +
                '2. Set Microphone to "Allow"\n' +
                '3. Also check: Windows Settings → Privacy → Microphone → Allow apps to access your microphone\n' +
                '4. Reload the page and try again'
              );
              return;
            }
          }
        } catch (_permCheckErr) {
          // permissions.query may not support 'microphone' in all browsers
        }

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (micError: any) {
          setIsRecording(false);
          clearTimers();
          const errName = micError?.name || '';
          if (errName === 'NotAllowedError') {
            Alert.alert(
              'Microphone Permission Denied',
              'The browser or your system blocked microphone access.\n\n' +
              'To fix this:\n' +
              '1. Click the lock/site-info icon in the address bar → set Microphone to "Allow"\n' +
              '2. Check Windows Settings → Privacy & Security → Microphone → ensure "Let apps access your microphone" is ON and your browser is allowed\n' +
              '3. Reload the page and try again'
            );
          } else if (errName === 'NotFoundError') {
            Alert.alert('No Microphone', 'No microphone device was found. Please connect a microphone and try again.');
          } else {
            Alert.alert('Microphone Error', micError?.message || 'Failed to access microphone.');
          }
          return;
        }
        mediaStreamRef.current = stream;

        const possibleTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/ogg',
        ];
        let mimeType = '';
        for (const t of possibleTypes) {
          if ((window as any).MediaRecorder?.isTypeSupported?.(t)) {
            mimeType = t;
            break;
          }
        }

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          setAudioBlob(blob);

          const url = URL.createObjectURL(blob);
          audioObjectUrlRef.current = url;
          setAudioUri(url);

          setIsRecording(false);
          isStoppingRef.current = false;
          clearTimers();
          Alert.alert('✅ Recording complete', 'Ready to proceed to next step');
        };

        recorder.start();

        if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = setTimeout(() => {
          stopRecording();
        }, 5000);

        return;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setIsRecording(false);
        clearTimers();
        Alert.alert('Permission needed', 'Microphone access is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 5000);

    } catch (error: any) {
      console.error('Recording error:', error);
      setIsRecording(false);
      clearTimers();

      if (Platform.OS === 'web' && error?.name === 'NotAllowedError') {
        Alert.alert(
          'Microphone Permission Denied',
          'The browser or your system blocked microphone access.\n\n' +
          'To fix this:\n' +
          '1. Click the lock/site-info icon in the address bar → set Microphone to "Allow"\n' +
          '2. Check Windows Settings → Privacy & Security → Microphone → ensure "Let apps access your microphone" is ON\n' +
          '3. Reload the page and try again'
        );
      } else {
        Alert.alert('Error', error?.message || 'Failed to start recording');
      }
    }
  };

  const stopRecording = async () => {
    try {
      if (isStoppingRef.current) return;
      isStoppingRef.current = true;

      if (Platform.OS === 'web') {
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== 'inactive') {
          rec.stop();
        }
        return;
      }

      if (!recordingRef.current) return;
      await recordingRef.current.stopAndUnloadAsync();
      const recordedUri = recordingRef.current.getURI();

      recordingRef.current = null;
      setIsRecording(false);
      clearTimers();

      if (!recordedUri) {
        Alert.alert('⚠️ Error', 'Failed to capture recording. URI is null.');
        return;
      }

      setAudioUri(recordedUri);
      Alert.alert('✅ Recording complete', 'Ready to proceed to next step');

    } catch (error: any) {
      console.error('Stop recording error:', error);
      setIsRecording(false);
      clearTimers();
      Alert.alert('Error', error?.message || 'Failed to stop recording');
    }
  };

  // -------- Image capture --------
  const captureImage = async (useCamera: boolean) => {
    try {
      setIsLoading(true);

      if (Platform.OS !== 'web') {
        const permission = useCamera
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert('Permission needed', useCamera ? 'Camera access is required.' : 'Gallery access is required.');
          setIsLoading(false);
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });

      if (!result.canceled && result.assets?.[0]) {
        setFaceUri(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image capture error:', error);
      Alert.alert('Error', error?.message || 'Failed to capture image');
    } finally {
      setIsLoading(false);
    }
  };

  // -------- Backend upload helpers --------
  const postFusion = async (payload: Record<string, any>) => {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    let res = await fetch(FUSION_API, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (res.status === 404) {
      res = await fetch(`${BASE_URL}/predict`, { method: 'POST', headers, body: JSON.stringify(payload) });
    }
    return res;
  };

  const uploadAudio = async (): Promise<AudioApiResult | null> => {
    if (!audioUri && !audioBlob) return null;

    try {
      const form = new FormData();

      if (Platform.OS === 'web') {
        if (!audioBlob) throw new Error('Web audio blob missing');
        form.append('file', audioBlob, 'recording.webm');
      } else {
        if (!audioUri) throw new Error('Native audio uri missing');
        form.append('file', { uri: audioUri, name: 'recording.m4a', type: 'audio/m4a' } as any);
      }

      console.log(`📤 Uploading audio to ${AUDIO_API} ...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(AUDIO_API, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const ct = res.headers.get('content-type') || '';
      const json = ct.includes('application/json') ? await res.json() : null;

      if (!res.ok) throw new Error(json?.detail || `Audio request failed (${res.status})`);

      console.log('✅ Audio upload successful:', json);
      return json;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error(
          `Request timed out. Make sure your backend is running at ${BASE_URL} and reachable from this device.`
        );
      }
      if (error?.message === 'Network request failed') {
        throw new Error(
          `Cannot reach server at ${BASE_URL}. Ensure:\n` +
          `1. The backend is running\n` +
          `2. Your device is on the same Wi-Fi network\n` +
          `3. EXPO_PUBLIC_API_BASE_URL in .env is set to your computer's local IP (not localhost)`
        );
      }
      console.error('❌ Audio upload error:', error);
      throw error;
    }
  };

  const uploadFace = async (): Promise<FaceApiResult | null> => {
    if (!faceUri) return null;

    try {
      const form = new FormData();

      if (Platform.OS === 'web') {
        const resp = await fetch(faceUri);
        const blob = await resp.blob();
        form.append('file', blob, 'face.jpg');
      } else {
        form.append('file', { uri: faceUri, name: 'face.jpg', type: 'image/jpeg' } as any);
      }

      console.log('📤 Uploading face image...');
      const res = await fetch(FACE_API, {
        method: 'POST',
        body: form,
        headers: { Accept: 'application/json' },
      });

      const ct = res.headers.get('content-type') || '';
      const json = ct.includes('application/json') ? await res.json() : null;

      if (!res.ok) throw new Error(json?.detail || `Face request failed (${res.status})`);

      console.log('✅ Face upload successful:', json);
      return json;
    } catch (error: any) {
      console.error('❌ Face upload error:', error);
      throw error;
    }
  };

  // -------- Final analysis --------
  const submitAnalysis = async () => {
    setIsLoading(true);

    try {
      if (!audioUri && !audioBlob) {
        Alert.alert('Missing Audio', 'Please record audio first.');
        setIsLoading(false);
        return;
      }
      if (!faceUri) {
        Alert.alert('Missing Photo', 'Please capture a face photo first.');
        setIsLoading(false);
        return;
      }

      const context: FusionContext = {
        baby_age_months: parseFloat(babyAge),
        time_since_feed_hours: parseFloat(feedingTime),
        time_since_sleep_hours: parseFloat(sleepTime),
        diaper_status: diaperStatus,
        room_temperature_celsius: parseFloat(roomTemperature),
      };

      const errors = validateContext(context);
      if (errors.length) {
        performValidationShake();
        Alert.alert('Invalid Input', errors.join('\n'));
        setIsLoading(false);
        return;
      }

      const [audioRes, faceRes] = await Promise.all([uploadAudio(), uploadFace()]);

      const audioPrediction = audioRes ? mapAudioLabel(audioRes.label) : 'Unknown';
      const audioConfidence = audioRes ? to01(audioRes.confidence) : 0;

      const imagePrediction = faceRes ? mapFaceLabel(faceRes.label) : 'Unknown';
      const imageConfidence = faceRes ? to01(faceRes.confidence) : 0;

      const payload = {
        baby_age_months: context.baby_age_months,
        audio_predicted_class: audioPrediction,
        audio_confidence: audioConfidence,
        image_predicted_class: imagePrediction,
        image_confidence: imageConfidence,
        time_since_feed_hours: context.time_since_feed_hours,
        time_since_sleep_hours: context.time_since_sleep_hours,
        diaper_status: context.diaper_status,
        room_temperature_celsius: context.room_temperature_celsius,
      };

      console.log('📤 Sending fusion payload:', payload);

      const fusionRes = await postFusion(payload);
      const ct = fusionRes.headers.get('content-type') || '';
      const fusionJson: FusionApiResult | null = ct.includes('application/json') ? await fusionRes.json() : null;

      if (!fusionRes.ok) {
        const errorMsg = fusionJson && typeof fusionJson === 'object' ? (fusionJson as any).detail || JSON.stringify(fusionJson) : `HTTP ${fusionRes.status}`;
        throw new Error(`Backend error: ${errorMsg}`);
      }
      if (!fusionJson) throw new Error('Fusion response not JSON');

      const recommendations = getRecommendations(fusionJson.predicted_cry_reason, context);

      setAnalysisResult({
        ...fusionJson,
        recommendations,
        audioPrediction,
        audioConfidence,
        imagePrediction,
        imageConfidence,
        audioModelInputs: audioRes?.debug_info || {},
        imageModelInputs: faceRes?.features || {},
      });
      setCurrentStep('result');

    } catch (error: any) {
      console.error('❌ Analysis error:', error);

      let errorMessage = 'Analysis failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Analysis Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendations = (prediction: string, context: FusionContext): string[] => {
    const rec: string[] = [];
    switch ((prediction || '').toLowerCase()) {
      case 'hunger':
        rec.push('Your baby may be hungry');
        rec.push(`Last feeding was ${context.time_since_feed_hours} hours ago`);
        rec.push('Consider offering food or milk');
        break;
      case 'pain':
        rec.push('Your baby may be experiencing discomfort');
        rec.push('Check for signs of illness or injury');
        if (context.diaper_status !== 'Clean') rec.push('Check and change diaper if needed');
        rec.push('If crying continues, consider medical advice');
        break;
      case 'tiredness':
        rec.push('Your baby might be tired');
        rec.push(`Last sleep was ${context.time_since_sleep_hours} hours ago`);
        rec.push('Try soothing and a calm sleep environment');
        break;
      default:
        rec.push('Monitor your baby closely');
        rec.push('Check feeding, diaper, temperature, and comfort');
        break;
    }
    return rec;
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'record': return 'Record Baby Cry';
      case 'capture': return 'Capture Baby Face';
      case 'context': return 'Baby Care Info';
      case 'result': return 'Analysis Result';
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'record': return '1';
      case 'capture': return '2';
      case 'context': return '3';
      case 'result': return '✓';
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: LIGHT_BG }]} 
      contentContainerStyle={styles.scrollContent} 
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerTop}>
        <Pressable
          onPress={() => router.push('/(tabs)')}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </Pressable>
      </View>

      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <Animated.View style={badgeAnimatedStyle}>
            <View style={[styles.stepIndicator, { backgroundColor: PRIMARY_TEAL }]}>
              <ThemedText style={styles.stepNumber}>{getStepNumber()}</ThemedText>
            </View>
          </Animated.View>
          {currentStep !== 'result' && (
            <ThemedText style={styles.stepInfo}>
              Step {getStepNumber()} of 3
            </ThemedText>
          )}
        </View>
        <ThemedText style={[styles.stepTitle, { color: textColor }]}>{getStepTitle()}</ThemedText>
      </View>

      <View style={styles.content}>
        {/* STEP 1: RECORD */}
        {currentStep === 'record' && (
          <View style={[styles.stepCard, { backgroundColor: cardBackground, shadowColor }]}>
            {!audioUri && (
              <>
                <View style={styles.iconContainer}>
                  <View style={[styles.recordIcon, { backgroundColor: isRecording ? DANGER_RED : PRIMARY_TEAL }]}>
                    <ThemedText style={styles.recordIconText}>{isRecording ? '⏺' : '🎤'}</ThemedText>
                  </View>
                </View>

                <ThemedText style={[styles.stepDescription, { color: secondaryText }]}>
                  {isRecording ? 'Recording in progress...' : 'Place your phone near your baby and record a short cry sample.'}
                </ThemedText>
              </>
            )}

            {isRecording && (
              <View style={styles.recordingIndicator}>
                <ThemedText style={[styles.recordingText, { color: DANGER_RED }]}>
                  Recording... {recordingDuration}s / 5s
                </ThemedText>
                <View style={styles.waveform}>
                  <View style={[styles.waveBar, { backgroundColor: DANGER_RED }]} />
                  <View style={[styles.waveBar, { backgroundColor: DANGER_RED }]} />
                  <View style={[styles.waveBar, { backgroundColor: DANGER_RED }]} />
                </View>
                <ThemedText style={[styles.countdownText, { color: DANGER_RED }]}>
                  Stopping in {Math.max(0, 5 - recordingDuration)}...
                </ThemedText>
              </View>
            )}

            {audioUri && !isRecording && (
              <View style={[styles.successContainer, { backgroundColor: SOFT_MINT_BG, borderColor: 'rgba(123, 198, 164, 0.25)' }]}>
                <ThemedText style={[styles.successIcon, { color: SUCCESS_MINT }]}>✓</ThemedText>
                <ThemedText style={[styles.successText, { color: SUCCESS_MINT }]}>
                  Audio recorded successfully
                </ThemedText>
                <ThemedText style={[styles.recordDurationText, { color: secondaryText }]}>
                  {recordingDuration} seconds captured
                </ThemedText>
              </View>
            )}

            {!audioUri && (
              <>
                <Pressable
                  style={[
                    styles.recordButton,
                    {
                      backgroundColor: isRecording ? DANGER_RED : PRIMARY_TEAL,
                      opacity: isLoading ? 0.7 : 1,
                    },
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                >
                  {isLoading && isRecording ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <ThemedText style={styles.recordButtonText}>
                        {isRecording ? 'Recording... Tap to stop' : 'Tap to Record'}
                      </ThemedText>
                      {!isRecording && (
                        <ThemedText style={styles.recordButtonSubtext}>
                          Auto-stops at 5 seconds
                        </ThemedText>
                      )}
                    </View>
                  )}
                </Pressable>

                <View style={styles.tipCard}>
                  <ThemedText style={styles.tipIcon}>💡</ThemedText>
                  <ThemedText style={styles.tipText}>
                    Record in a quiet place for better accuracy.
                  </ThemedText>
                </View>
              </>
            )}

            {audioUri && !isRecording && (
              <View style={styles.actionButtonsGroup}>
                <Pressable
                  style={[styles.outlineButton, { borderColor: PRIMARY_TEAL }]}
                  onPress={() => {
                    if (Platform.OS === 'web' && audioObjectUrlRef.current) {
                      URL.revokeObjectURL(audioObjectUrlRef.current);
                      audioObjectUrlRef.current = null;
                    }
                    setAudioUri(null);
                    setAudioBlob(null);
                    setRecordingDuration(0);
                  }}
                  disabled={isLoading}
                >
                  <ThemedText style={[styles.outlineButtonText, { color: PRIMARY_TEAL }]}>
                    🔄 Record Again
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.solidButton, { backgroundColor: PRIMARY_TEAL }]}
                  onPress={() => setCurrentStep('capture')}
                  disabled={isLoading}
                >
                  <ThemedText style={styles.solidButtonText}>
                    Next: Capture Face →
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* STEP 2: CAPTURE */}
        {currentStep === 'capture' && (
          <View style={[styles.stepCard, { backgroundColor: cardBackground, shadowColor }]}>
            {faceUri ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: faceUri }} style={styles.previewImage} />
                <ThemedText style={[styles.successText, { color: SUCCESS_MINT }]}>
                  ✓ Photo captured successfully
                </ThemedText>

                <View style={styles.actionButtons}>
                  <Pressable
                    style={[styles.secondaryButton, { backgroundColor: PRIMARY_TEAL }]}
                    onPress={() => setFaceUri(null)}
                  >
                    <ThemedText style={styles.buttonText}>🔄 Retake Photo</ThemedText>
                  </Pressable>

                  <Pressable
                    style={[styles.secondaryButton, { backgroundColor: SUCCESS_MINT }]}
                    onPress={() => setCurrentStep('context')}
                  >
                    <ThemedText style={styles.buttonText}>Continue →</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.iconContainer}>
                  <View style={[styles.recordIcon, { backgroundColor: ACCENT_YELLOW }]}>
                    <ThemedText style={styles.recordIconText}>📸</ThemedText>
                  </View>
                </View>

                <ThemedText style={[styles.stepDescription, { color: secondaryText }]}>
                  Use a clear, well-lit photo where the baby's face is visible.
                </ThemedText>

                <View style={styles.buttonRow}>
                  <Pressable
                    style={[styles.secondaryButton, { backgroundColor: SECONDARY_CORAL }]}
                    onPress={() => captureImage(true)}
                    disabled={isLoading}
                  >
                    <ThemedText style={styles.buttonText}>Take Photo</ThemedText>
                  </Pressable>

                  <Pressable
                    style={[styles.secondaryButton, { backgroundColor: ACCENT_YELLOW }]}
                    onPress={() => captureImage(false)}
                    disabled={isLoading}
                  >
                    <ThemedText style={styles.buttonText}>Choose Photo</ThemedText>
                  </Pressable>
                </View>

                <View style={[styles.tipCard, { marginTop: 20 }]}>
                  <ThemedText style={styles.tipIcon}>💡</ThemedText>
                  <ThemedText style={styles.tipText}>
                    Avoid blurry or dark images for best results.
                  </ThemedText>
                </View>
              </>
            )}

            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={PRIMARY_TEAL} />
              </View>
            )}
          </View>
        )}

        {/* STEP 3: CONTEXT */}
        {currentStep === 'context' && (
          <Animated.View style={[screenAnimatedStyle, { width: '100%' }]}>
            <View style={[styles.stepCard, { backgroundColor: cardBackground, shadowColor }]}>
              <ThemedText style={[styles.stepDescription, { color: secondaryText, marginBottom: 8 }]}>
                Share a few care details to improve the result
              </ThemedText>

              <Animated.View style={fieldAnimatedStyles[0]}>
                <View style={styles.inputContainer}>
                  <ThemedText style={[styles.inputLabel, { color: textColor }]}>👶 Baby's age (months)</ThemedText>
                  <TextInput
                    style={[styles.textInput, { borderColor: BORDER_LIGHT, color: textColor }]}
                    value={babyAge}
                    onChangeText={setBabyAge}
                    placeholder="3"
                    placeholderTextColor={LIGHT_SECONDARY}
                    keyboardType="numeric"
                  />
                  <ThemedText style={[styles.inputHint, { color: LIGHT_SECONDARY }]}>Valid range: 0-36 months</ThemedText>
                </View>
              </Animated.View>

              <Animated.View style={fieldAnimatedStyles[1]}>
                <View style={styles.inputContainer}>
                  <ThemedText style={[styles.inputLabel, { color: textColor }]}>🍼 Time since last feeding (hours)</ThemedText>
                  <TextInput
                    style={[styles.textInput, { borderColor: BORDER_LIGHT, color: textColor }]}
                    value={feedingTime}
                    onChangeText={setFeedingTime}
                    placeholder="2"
                    placeholderTextColor={LIGHT_SECONDARY}
                    keyboardType="numeric"
                  />
                  <ThemedText style={[styles.inputHint, { color: LIGHT_SECONDARY }]}>Valid range: 0-48 hours</ThemedText>
                </View>
              </Animated.View>

              <Animated.View style={fieldAnimatedStyles[2]}>
                <View style={styles.inputContainer}>
                  <ThemedText style={[styles.inputLabel, { color: textColor }]}>😴 Time since last sleep (hours)</ThemedText>
                  <TextInput
                    style={[styles.textInput, { borderColor: BORDER_LIGHT, color: textColor }]}
                    value={sleepTime}
                    onChangeText={setSleepTime}
                    placeholder="1"
                    placeholderTextColor={LIGHT_SECONDARY}
                    keyboardType="numeric"
                  />
                  <ThemedText style={[styles.inputHint, { color: LIGHT_SECONDARY }]}>Valid range: 0-48 hours</ThemedText>
                </View>
              </Animated.View>

              <Animated.View style={fieldAnimatedStyles[3]}>
                <View style={styles.inputContainer}>
                  <ThemedText style={[styles.inputLabel, { color: textColor }]}>🚼 Diaper status</ThemedText>
                  <View style={styles.radioContainer}>
                    {(['Clean', 'Wet', 'Soiled'] as const).map(status => (
                      <Animated.View key={status} style={diaperButtonAnimatedStyles[status]} collapsable={false}>
                        <Pressable
                          style={[
                            styles.radioOption,
                            diaperStatus === status && { ...styles.radioSelected, borderColor: PRIMARY_TEAL },
                          ]}
                          onPress={() => handleDiaperPress(status)}
                        >
                          <ThemedText style={[styles.radioText, { color: textColor }]}>
                            {status}
                          </ThemedText>
                        </Pressable>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={fieldAnimatedStyles[4]}>
                <View style={styles.inputContainer}>
                  <ThemedText style={[styles.inputLabel, { color: textColor }]}>🌡️ Room temperature (°C)</ThemedText>
                  <TextInput
                    style={[styles.textInput, { borderColor: BORDER_LIGHT, color: textColor }]}
                    value={roomTemperature}
                    onChangeText={setRoomTemperature}
                    placeholder="24"
                    placeholderTextColor={LIGHT_SECONDARY}
                    keyboardType="numeric"
                  />
                  <ThemedText style={[styles.inputHint, { color: LIGHT_SECONDARY }]}>Valid range: 15-35°C</ThemedText>
                </View>
              </Animated.View>

              <View style={styles.actionButtons}>
                <Animated.View style={[analyzeButtonAnimatedStyle, isLoading ? loadingButtonAnimatedStyle : {}]}>
                  <Pressable
                    style={[styles.primaryButton, { backgroundColor: PRIMARY_TEAL }]}
                    onPress={handleAnalyzePress}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.buttonText}>Analyze Cry Pattern</ThemedText>
                    )}
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* RESULT */}
        {currentStep === 'result' && analysisResult && (
          <View style={[styles.stepCard, { backgroundColor: cardBackground }]}>
            <View style={styles.resultHeader}>
              <View style={[styles.resultIcon, { backgroundColor: SOFT_TEAL_BG, borderColor: PRIMARY_TEAL }]}>
                <ThemedText style={styles.resultIconText}>
                  {analysisResult.predicted_cry_reason === 'Pain' ? '😟' :
                    analysisResult.predicted_cry_reason === 'Hunger' ? '🍼' :
                      analysisResult.predicted_cry_reason === 'Discomfort' ? '😤' : '😴'}
                </ThemedText>
              </View>

              <ThemedText style={[styles.resultTitle, { color: textColor }]}>
                {analysisResult.predicted_cry_reason}
              </ThemedText>

              {analysisResult.confidence_message && (
                <ThemedText style={[styles.confidenceMessage, { color: secondaryText }]}>
                  {analysisResult.confidence_message}
                </ThemedText>
              )}

              <View style={styles.confidenceContainer}>
                <View style={[styles.confidenceBar, { backgroundColor: BORDER_LIGHT }]}>
                  <View style={[styles.confidenceFill, {
                    backgroundColor: (analysisResult.confidence ?? 0) > 0.8 ? SUCCESS_MINT :
                      (analysisResult.confidence ?? 0) > 0.6 ? WARNING_AMBER : DANGER_RED,
                    width: `${Math.round((analysisResult.confidence ?? 0) * 100)}%`,
                  }]} />
                </View>
                <ThemedText style={[styles.confidenceText, { color: LIGHT_TEXT }]}>
                  {Math.round((analysisResult.confidence ?? 0) * 100)}% Confidence Score
                </ThemedText>
              </View>
            </View>

            {/* Individual Model Results */}
            <View style={styles.modelResultsContainer}>
              <View style={[styles.modelResultCard, { backgroundColor: '#F0F9FF', borderLeftColor: '#3B82F6' }]}>
                <View style={styles.modelResultHeader}>
                  <ThemedText style={styles.modelResultIcon}>🎙️</ThemedText>
                  <ThemedText style={styles.modelResultTitle}>Audio Model</ThemedText>
                </View>
                <ThemedText style={[styles.modelResultLabel, { color: textColor }]}>
                  {analysisResult.audioPrediction || 'Unknown'}
                </ThemedText>
                <View style={styles.modelConfidenceRow}>
                  <View style={[styles.modelConfidenceBar, { backgroundColor: '#E5E7EB' }]}>
                    <View style={[styles.modelConfidenceFill, {
                      width: `${Math.round((analysisResult.audioConfidence ?? 0) * 100)}%`,
                      backgroundColor: '#3B82F6'
                    }]} />
                  </View>
                  <ThemedText style={[styles.modelConfidenceText, { color: LIGHT_TEXT }]}>
                    {Math.round((analysisResult.audioConfidence ?? 0) * 100)}%
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.modelResultCard, { backgroundColor: '#FEF3F2', borderLeftColor: '#EF4444' }]}>
                <View style={styles.modelResultHeader}>
                  <ThemedText style={styles.modelResultIcon}>📷</ThemedText>
                  <ThemedText style={styles.modelResultTitle}>Image Model</ThemedText>
                </View>
                <ThemedText style={[styles.modelResultLabel, { color: textColor }]}>
                  {analysisResult.imagePrediction || 'Unknown'}
                </ThemedText>
                <View style={styles.modelConfidenceRow}>
                  <View style={[styles.modelConfidenceBar, { backgroundColor: '#E5E7EB' }]}>
                    <View style={[styles.modelConfidenceFill, {
                      width: `${Math.round((analysisResult.imageConfidence ?? 0) * 100)}%`,
                      backgroundColor: '#EF4444'
                    }]} />
                  </View>
                  <ThemedText style={[styles.modelConfidenceText, { color: LIGHT_TEXT }]}>
                    {Math.round((analysisResult.imageConfidence ?? 0) * 100)}%
                  </ThemedText>
                </View>
              </View>
            </View>

            {analysisResult.all_class_probabilities && (
              <View style={[styles.insightCard, { backgroundColor: SOFT_YELLOW_BG, borderLeftColor: ACCENT_YELLOW }]}>
                <ThemedText style={[styles.insightTitle, { color: textColor }]}>Probability Breakdown</ThemedText>
                <View style={styles.probabilityTable}>
                  {Object.entries(analysisResult.all_class_probabilities).map(([reason, prob]: [string, any]) => (
                    <View key={reason} style={styles.probabilityRow}>
                      <ThemedText style={[styles.probabilityLabel, { color: textColor }]} numberOfLines={1}>
                        {reason}
                      </ThemedText>
                      <View style={[styles.probabilityBarSmall, { backgroundColor: BORDER_LIGHT }]}>
                        <View style={[styles.probabilityFillSmall, {
                          width: `${Math.round((prob ?? 0) * 100)}%`,
                          backgroundColor: (prob ?? 0) > 0.4 ? PRIMARY_TEAL : WARNING_AMBER
                        }]} />
                      </View>
                      <ThemedText style={[styles.probabilityValue, { color: LIGHT_TEXT }]}>
                        {Math.round((prob ?? 0) * 100)}%
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.insightCard, { backgroundColor: SOFT_MINT_BG, borderLeftColor: SUCCESS_MINT }]}>
              <ThemedText style={[styles.insightTitle, { color: textColor }]}>Suggested Care Actions</ThemedText>
              <ThemedText style={[styles.insightText, { color: secondaryText }]}>
                {analysisResult.recommendations.map(r => `• ${r}`).join('\n')}
              </ThemedText>
            </View>

            {analysisResult.disclaimer && (
              <View style={[styles.disclaimerCard, { backgroundColor: '#FEF3C7', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                <ThemedText style={[styles.disclaimerText, { color: secondaryText }]}>
                  {analysisResult.disclaimer}
                </ThemedText>
              </View>
            )}

            <View style={styles.actionButtons}>
              <Pressable
                style={[styles.analyzeAgainButton, { borderColor: PRIMARY_TEAL }]}
                onPress={() => {
                  setCurrentStep('record');
                  setAudioUri(null);
                  setAudioBlob(null);
                  setFaceUri(null);
                  setAnalysisResult(null);
                  setBabyAge('');
                  setFeedingTime('');
                  setSleepTime('');
                  setRoomTemperature('');
                  setRecordingDuration(0);
                }}
              >
                <ThemedText style={[styles.analyzeAgainText, { color: PRIMARY_TEAL }]}>🔄 Analyze Again</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.doneButton, { backgroundColor: PRIMARY_TEAL, shadowColor: PRIMARY_TEAL }]}
                onPress={() => setShowFeedback(true)}
              >
                <ThemedText style={styles.doneButtonText}>✓ Done</ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={showFeedback}
        onClose={() => {
          setShowFeedback(false);
          router.push('/');
        }}
        onSubmit={async (rating, comment) => {
          const FEEDBACK_API = `${BASE_URL}/feedback`;
          const body = {
            predictionResult: analysisResult?.predicted_cry_reason || 'Unknown',
            audioModelScore: analysisResult?.audioConfidence ?? 0,
            imageModelScore: analysisResult?.imageConfidence ?? 0,
            fusionModelScore: analysisResult?.confidence ?? 0,
            audioModelInputs: analysisResult?.audioModelInputs || {},
            imageModelInputs: analysisResult?.imageModelInputs || {},
            allClassProbabilities: analysisResult?.all_class_probabilities || {},
            contextInputs: {
              baby_age_months: parseFloat(babyAge) || 0,
              time_since_feed_hours: parseFloat(feedingTime) || 0,
              time_since_sleep_hours: parseFloat(sleepTime) || 0,
              diaper_status: diaperStatus,
              room_temperature_celsius: parseFloat(roomTemperature) || 0,
            },
            userRating: rating,
            userComment: comment,
          };
          const res = await fetch(FEEDBACK_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.detail || 'Failed to submit feedback');
          }
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ========== CONTAINER & LAYOUT ==========
  container: { 
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  scrollContent: { 
    flexGrow: 1, 
    paddingBottom: 140,
    paddingTop: 14,
  },

  // ========== HEADER & NAVIGATION ==========
  headerTop: { 
    paddingHorizontal: 20, 
    paddingBottom: 14, 
    paddingTop: 12,
    alignItems: 'flex-start',
  },
  backButton: { 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 12, 
    alignItems: 'center',
    backgroundColor: 'rgba(240, 249, 250, 0.9)',
  },
  backButtonText: { 
    fontSize: 14, 
    fontWeight: '600',
    color: '#5DAFB9',
  },

  header: { 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    paddingTop: 8,
    alignItems: 'center',
  },
  progressContainer: { 
    alignItems: 'center', 
    marginBottom: 16,
    width: '100%',
  },
  stepIndicator: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  stepNumber: { 
    color: '#FFFFFF', 
    fontSize: 24, 
    fontWeight: '700',
  },
  stepInfo: { 
    fontSize: 13, 
    fontWeight: '500',
    color: '#64748B',
  },
  stepTitle: { 
    fontSize: 28, 
    fontWeight: '700', 
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // ========== CONTENT & CARDS ==========
  content: { 
    paddingHorizontal: 20, 
    paddingBottom: 24,
  },
  stepCard: {
    padding: 28,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },

  // ========== ICONS & CONTAINERS ==========
  iconContainer: { 
    marginBottom: 24,
    marginTop: 8,
  },
  recordIcon: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  recordIconText: { 
    fontSize: 48,
  },

  // ========== TYPOGRAPHY & TEXT ==========
  stepDescription: { 
    fontSize: 16, 
    textAlign: 'center', 
    lineHeight: 25, 
    marginBottom: 28,
    fontWeight: '500',
    color: '#5A6B7D',
  },

  // ========== RECORDING STATE ==========
  recordingIndicator: { 
    alignItems: 'center', 
    marginBottom: 24,
    width: '100%',
  },
  recordingText: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 16,
  },
  waveform: { 
    flexDirection: 'row', 
    gap: 6,
    marginBottom: 16,
  },
  waveBar: { 
    width: 5, 
    height: 24, 
    borderRadius: 2.5,
  },
  countdownText: { 
    fontSize: 14, 
    fontWeight: '600', 
    marginTop: 12,
  },

  // ========== BUTTONS - PRIMARY ==========
  recordButton: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 0,
  },
  buttonContent: { 
    alignItems: 'center',
    width: '100%',
  },
  recordButtonText: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  recordButtonSubtext: { 
    color: 'rgba(255, 255, 255, 0.9)', 
    fontSize: 14, 
    marginTop: 6,
    fontWeight: '500',
  },

  // ========== BUTTONS - SECONDARY ==========
  primaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  secondaryButton: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 15, 
    fontWeight: '700',
  },
  actionButtonsGroup: { 
    flexDirection: 'row', 
    gap: 14, 
    width: '100%', 
    marginTop: 28,
  },
  outlineButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 2.5,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 0,
  },
  outlineButtonText: { 
    fontSize: 15, 
    fontWeight: '700',
  },
  solidButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  solidButtonText: { 
    color: '#FFFFFF', 
    fontSize: 15, 
    fontWeight: '700',
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: 14, 
    width: '100%',
    marginTop: 24,
  },

  // ========== IMAGE PREVIEW ==========
  imagePreview: { 
    alignItems: 'center', 
    width: '100%',
  },
  previewImage: { 
    width: 240, 
    height: 240, 
    borderRadius: 24, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    backgroundColor: '#F8FAFC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  // ========== FORMS & INPUTS ==========
  inputContainer: { 
    width: '100%', 
    marginBottom: 22,
    paddingBottom: 6,
  },
  inputLabel: { 
    fontSize: 15, 
    fontWeight: '700', 
    marginBottom: 10,
    letterSpacing: 0.2,
    color: '#0F172A',
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: '#F8FAFC',
  },
  inputHint: { 
    fontSize: 12, 
    marginTop: 6, 
    fontWeight: '500',
    fontStyle: 'italic',
    color: '#94A3B8',
  },

  // ========== RADIO / SEGMENTED BUTTONS ==========
  radioContainer: { 
    flexDirection: 'row', 
    gap: 10, 
    justifyContent: 'space-between', 
    width: '100%',
  },
  radioOption: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E8ECEF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 56,
  },
  radioSelected: { 
    backgroundColor: 'rgba(93, 175, 185, 0.1)',
  },
  radioText: { 
    fontSize: 14, 
    fontWeight: '700', 
    textAlign: 'center',
  },

  // ========== SUCCESS STATES ==========
  successIcon: { 
    fontSize: 48, 
    marginBottom: 12,
  },
  successText: { 
    fontSize: 17, 
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  successContainer: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 18,
    borderWidth: 1,
  },
  recordDurationText: { 
    fontSize: 14, 
    marginTop: 8,
    fontWeight: '500',
  },

  // ========== TIP CARD ==========
  tipCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFBF0',
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(246, 199, 111, 0.25)',
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    lineHeight: 20,
  },

  // ========== RESULT SCREEN ==========
  resultHeader: { 
    alignItems: 'center', 
    marginBottom: 28, 
    width: '100%',
    paddingVertical: 12,
  },
  resultIcon: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 18,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  resultIconText: { 
    fontSize: 40,
  },
  resultTitle: { 
    fontSize: 34, 
    fontWeight: '700', 
    marginBottom: 14, 
    textAlign: 'center',
    letterSpacing: 0.4,
    color: '#0F172A',
  },
  confidenceMessage: { 
    fontSize: 13, 
    fontStyle: 'italic', 
    marginVertical: 8, 
    textAlign: 'center',
    fontWeight: '500',
  },

  // ========== CONFIDENCE & PROGRESS BARS ==========
  confidenceContainer: { 
    width: '100%', 
    alignItems: 'center',
    marginTop: 12,
  },
  confidenceBar: { 
    width: '100%', 
    height: 12, 
    borderRadius: 6, 
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F4F8',
  },
  confidenceFill: { 
    height: '100%', 
    borderRadius: 6,
  },
  confidenceText: { 
    fontSize: 13, 
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ========== MODEL RESULTS CARDS ==========
  modelResultsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 24,
    paddingBottom: 8,
  },
  modelResultCard: {
    flex: 1,
    padding: 18,
    borderRadius: 18,
    borderLeftWidth: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  modelResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modelResultIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  modelResultTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modelResultLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  modelConfidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelConfidenceBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F0F4F8',
  },
  modelConfidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  modelConfidenceText: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },

  // ========== INSIGHT CARDS ==========
  insightCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    borderLeftWidth: 6,
    marginBottom: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  insightTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    marginBottom: 14,
    letterSpacing: 0.3,
    color: '#0F172A',
  },
  insightText: { 
    fontSize: 15, 
    lineHeight: 23,
    fontWeight: '500',
    color: '#5A6B7D',
  },

  // ========== PROBABILITY TABLE ==========
  probabilityTable: { 
    width: '100%',
  },
  probabilityRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 14, 
    gap: 10,
  },
  probabilityLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    flex: 1, 
    maxWidth: 110,
  },
  probabilityBarSmall: { 
    flex: 2, 
    height: 8, 
    borderRadius: 4, 
    overflow: 'hidden',
    backgroundColor: '#F0F4F8',
  },
  probabilityFillSmall: { 
    height: '100%', 
    borderRadius: 4,
  },
  probabilityValue: { 
    fontSize: 13, 
    fontWeight: '700', 
    minWidth: 45, 
    textAlign: 'right',
  },

  // ========== DISCLAIMER ==========
  disclaimerCard: { 
    width: '100%', 
    padding: 16, 
    borderRadius: 14, 
    borderLeftWidth: 5,
    marginBottom: 20,
    borderWidth: 1,
  },
  disclaimerText: { 
    fontSize: 12, 
    lineHeight: 18, 
    fontStyle: 'italic',
    fontWeight: '500',
  },

  // ========== ACTION BUTTONS - FINAL ==========
  actionButtons: { 
    flexDirection: 'row', 
    gap: 12, 
    width: '100%',
  },
  analyzeAgainButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2.5,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  analyzeAgainText: { 
    fontSize: 15, 
    fontWeight: '700',
  },
  doneButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: { 
    color: '#FFFFFF', 
    fontSize: 15, 
    fontWeight: '700',
  },

  // ========== LOADING STATE ==========
  loadingOverlay: {
    position: 'absolute',
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250, 251, 252, 0.98)',
    borderRadius: 24,
  },
});

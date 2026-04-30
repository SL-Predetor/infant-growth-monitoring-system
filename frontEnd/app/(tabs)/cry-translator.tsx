import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Alert, Platform, Image as NativeImage, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withSpring,
} from 'react-native-reanimated';
import {
  Mic, MicOff, Camera, Image as ImageIcon,
  RotateCcw, Volume2,
} from 'lucide-react-native';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';

const C = Colors.light;
const BASE_URL = 'http://127.0.0.1:9000';
const AUDIO_API = `${BASE_URL}/predict-cry`;
const FACE_API = `${BASE_URL}/predict-face`;

/* ── Maps raw API result to parent-friendly message ── */
function friendlyResult(
  result: any,
  mode: 'audio' | 'face',
): { title: string; desc: string; emoji: string } {
  if (!result) return { title: '', desc: '', emoji: '' };
  const cls = (
    result.class || result.prediction || result.label || result.emotion || ''
  ).toLowerCase();

  if (mode === 'audio') {
    if (cls.includes('hunger') || cls.includes('hungry'))
      return { title: 'Your baby is hungry', desc: 'Try a feeding — your baby needs milk right now.', emoji: '🍼' };
    if (cls.includes('pain') || cls.includes('discomfort'))
      return { title: 'Your baby feels uncomfortable', desc: 'Check nappy, temperature, or look for tummy pain.', emoji: '😢' };
    if (cls.includes('sleep') || cls.includes('tired') || cls.includes('sleepy'))
      return { title: 'Your baby is sleepy', desc: 'Try rocking gently or playing soft music.', emoji: '😴' };
    if (cls.includes('bored') || cls.includes('attention') || cls.includes('lonely'))
      return { title: 'Your baby wants company', desc: 'Pick them up, make eye contact, and talk softly.', emoji: '🤗' };
    if (cls.includes('gas') || cls.includes('colic'))
      return { title: 'Tummy discomfort', desc: 'A gentle tummy massage or burping may help.', emoji: '🤱' };
    const label = result.class || result.prediction || result.label || 'Detected';
    const conf = result.confidence ? ` (${(result.confidence * 100).toFixed(0)}% sure)` : '';
    return { title: label + conf, desc: 'Check on your baby and see how they respond.', emoji: '🔍' };
  }

  // Face mode
  if (cls.includes('asd') || cls.includes('autism'))
    return {
      title: 'Some indicators found',
      desc: 'This is a screening tool only. Please speak to your doctor for a proper assessment.',
      emoji: '🧠',
    };
  if (cls.includes('normal') || cls.includes('typical') || cls.includes('negative'))
    return { title: 'No concerns detected', desc: 'Facial expression analysis looks typical.', emoji: '✅' };
  const label = result.class || result.prediction || result.label || 'Analysis complete';
  return {
    title: label,
    desc: result.confidence ? `Confidence: ${(result.confidence * 100).toFixed(0)}%` : '',
    emoji: '📸',
  };
}

export default function CryTranslatorScreen() {
  const [mode, setMode] = useState<'audio' | 'face'>('audio');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [faceUri, setFaceUri] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  /* ── Pulse animation while recording ── */
  const pulse = useSharedValue(1);
  const outerPulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const outerPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerPulse.value }],
    opacity: 1 - (outerPulse.value - 1) * 10,
  }));

  useEffect(() => {
    if (recording) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.07, { duration: 650 }), withTiming(1, { duration: 650 })),
        -1, false,
      );
      outerPulse.value = withRepeat(
        withSequence(withTiming(1.35, { duration: 900 }), withTiming(1, { duration: 900 })),
        -1, false,
      );
    } else {
      pulse.value = withSpring(1);
      outerPulse.value = withSpring(1);
    }
  }, [recording]);

  /* ── Audio ── */
  const startRecording = async () => {
    setResult(null);
    setAudioUri(null);
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone needed', 'Please allow microphone access to listen to your baby.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Auto-stop after 5 s
      setTimeout(async () => {
        try {
          const status = await rec.getStatusAsync();
          if (status.isRecording) {
            await rec.stopAndUnloadAsync();
            setRecording(null);
            setAudioUri(rec.getURI() || null);
          }
        } catch {}
      }, 5000);
    } catch (e) { console.error('Recording error:', e); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    const uri = recording.getURI();
    await recording.stopAndUnloadAsync();
    setRecording(null);
    setAudioUri(uri || null);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const playRecording = async () => {
    if (!audioUri) return;
    const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
    await sound.playAsync();
  };

  const submitAudio = async () => {
    if (!audioUri) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', { uri: audioUri, type: 'audio/mpeg', name: 'audio.mp3' } as any);
      const res = await fetch(AUDIO_API, { method: 'POST', body: form });
      setResult(await res.json());
    } catch {
      Alert.alert('Cannot connect', 'The analysis server is offline. Try again later.');
    } finally { setLoading(false); }
  };

  /* ── Face ── */
  const pickImage = async (useCamera: boolean) => {
    setResult(null);
    setFaceUri(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Please allow camera access to take a photo.');
      return;
    }
    try {
      const picked = useCamera
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 });
      if (!picked.canceled && picked.assets?.length > 0) setFaceUri(picked.assets[0].uri);
    } catch (e) { console.error('Image error:', e); }
  };

  const submitFace = async () => {
    if (!faceUri) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', { uri: faceUri, type: 'image/jpeg', name: 'face.jpg' } as any);
      const res = await fetch(FACE_API, { method: 'POST', body: form });
      setResult(await res.json());
    } catch {
      Alert.alert('Cannot connect', 'The analysis server is offline. Try again later.');
    } finally { setLoading(false); }
  };

  const isRecording = !!recording;
  const hasAudio = !!audioUri && !isRecording;
  const hasFace = !!faceUri;
  const friendly = result ? friendlyResult(result, mode) : null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <Animated.View entering={FadeInUp.duration(350).springify()} style={s.header}>
          <Text style={s.title}>Cry Translator</Text>
          <Text style={s.subtitle}>Find out what your baby needs right now</Text>
        </Animated.View>

        {/* ── Mode Toggle ── */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={s.modeRow}>
          {(['audio', 'face'] as const).map(m => (
            <Pressable
              key={m}
              style={[s.modeBtn, mode === m && s.modeBtnActive]}
              onPress={() => { setMode(m); setResult(null); setAudioUri(null); setFaceUri(null); }}
            >
              <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                {m === 'audio' ? '🎤  Listen' : '📸  Look'}
              </Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* ── AUDIO MODE ── */}
        {mode === 'audio' && (
          <Animated.View entering={FadeInDown.delay(130).springify().damping(14)} style={s.center}>

            {/* Record button with pulse ring */}
            <View style={s.recordWrap}>
              <Animated.View style={[s.pulseRing, { backgroundColor: isRecording ? 'rgba(214,118,118,0.15)' : 'rgba(93,167,177,0.12)' }, outerPulseStyle]} />
              <Animated.View style={pulseStyle}>
                <Pressable
                  style={[s.recordBtn, isRecording && s.recordBtnRec]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  {isRecording
                    ? <MicOff size={46} color="#FFFFFF" strokeWidth={1.8} />
                    : <Mic size={46} color="#FFFFFF" strokeWidth={1.8} />
                  }
                </Pressable>
              </Animated.View>
            </View>

            <Text style={s.recordLabel}>
              {isRecording
                ? 'Listening… tap to stop'
                : hasAudio
                  ? 'Recording saved ✓'
                  : 'Tap to start listening'}
            </Text>

            {isRecording && (
              <Text style={s.recordHint}>Auto-stops in 5 seconds</Text>
            )}

            {/* Play + Analyze row */}
            {hasAudio && (
              <Animated.View entering={FadeInDown.duration(300)} style={s.actionRow}>
                <Pressable style={s.secondaryBtn} onPress={playRecording}>
                  <Volume2 size={16} color={C.primary} strokeWidth={2} />
                  <Text style={s.secondaryBtnText}>Play Back</Text>
                </Pressable>
                <Pressable
                  style={[s.primaryBtn, loading && { opacity: 0.6 }]}
                  onPress={submitAudio}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={s.primaryBtnText}>Analyze →</Text>
                  }
                </Pressable>
              </Animated.View>
            )}

            {hasAudio && (
              <Pressable style={s.resetBtn} onPress={() => { setAudioUri(null); setResult(null); }}>
                <RotateCcw size={13} color={C.labelTertiary} strokeWidth={2} />
                <Text style={s.resetText}>Start over</Text>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* ── FACE MODE ── */}
        {mode === 'face' && (
          <Animated.View entering={FadeInDown.delay(130).springify().damping(14)} style={s.center}>
            {hasFace
              ? <NativeImage source={{ uri: faceUri! }} style={s.preview} />
              : (
                <View style={s.photoPlaceholder}>
                  <Camera size={42} color={C.labelTertiary} strokeWidth={1.5} />
                  <Text style={s.photoHint}>Take a photo of your baby's face</Text>
                </View>
              )
            }
            <View style={s.photoButtons}>
              <Pressable style={s.secondaryBtn} onPress={() => pickImage(true)}>
                <Camera size={15} color={C.primary} strokeWidth={2} />
                <Text style={s.secondaryBtnText}>Take Photo</Text>
              </Pressable>
              <Pressable style={s.secondaryBtn} onPress={() => pickImage(false)}>
                <ImageIcon size={15} color={C.primary} strokeWidth={2} />
                <Text style={s.secondaryBtnText}>Gallery</Text>
              </Pressable>
            </View>
            {hasFace && (
              <Pressable
                style={[s.primaryBtn, { marginTop: Spacing.lg }, loading && { opacity: 0.6 }]}
                onPress={submitFace}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={s.primaryBtnText}>Analyze Face →</Text>
                }
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* ── Loading ── */}
        {loading && (
          <Animated.View entering={FadeInDown.duration(250)} style={s.loadingRow}>
            <ActivityIndicator color={C.primary} size="small" />
            <Text style={s.loadingText}>
              {mode === 'audio' ? 'Listening to your baby…' : 'Analyzing the photo…'}
            </Text>
          </Animated.View>
        )}

        {/* ── Result Card ── */}
        {friendly && !loading && (
          <Animated.View entering={FadeInDown.delay(80).springify().damping(12)} style={s.resultCard}>
            <Text style={s.resultEmoji}>{friendly.emoji}</Text>
            <Text style={s.resultTitle}>{friendly.title}</Text>
            {!!friendly.desc && (
              <Text style={s.resultDesc}>{friendly.desc}</Text>
            )}
            <Pressable style={s.tryAgainBtn} onPress={() => setResult(null)}>
              <Text style={s.tryAgainText}>Try again</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Tip when idle */}
        {!recording && !audioUri && !faceUri && !result && !loading && (
          <Animated.View entering={FadeInDown.delay(300).springify()} style={s.tipCard}>
            <Text style={s.tipTitle}>How it works</Text>
            <Text style={s.tipText}>
              {mode === 'audio'
                ? '1. Tap the button above\n2. Hold your phone near your crying baby\n3. We\'ll tell you what they need'
                : '1. Take a clear photo of your baby\'s face\n2. Tap Analyze Face\n3. Get an instant reading'}
            </Text>
          </Animated.View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: Spacing.screenPadding, paddingTop: 8, paddingBottom: 32 },

  header: { marginBottom: Spacing.xl },
  title: { fontSize: 28, fontWeight: '700', color: C.label, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.labelTertiary, marginTop: 4 },

  modeRow: {
    flexDirection: 'row', gap: 6,
    backgroundColor: C.cardSecondary,
    borderRadius: Radius.full, padding: 4,
    marginBottom: 36,
  },
  modeBtn: { flex: 1, paddingVertical: 11, borderRadius: Radius.full, alignItems: 'center' },
  modeBtnActive: { backgroundColor: C.card, ...Shadows.sm },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: C.labelTertiary },
  modeBtnTextActive: { color: C.primary },

  center: { alignItems: 'center', marginBottom: Spacing.xl },

  // Record button
  recordWrap: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  pulseRing: {
    position: 'absolute', width: 148, height: 148, borderRadius: 74,
  },
  recordBtn: {
    width: 116, height: 116, borderRadius: 58,
    backgroundColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38, shadowRadius: 22, elevation: 14,
  },
  recordBtnRec: {
    backgroundColor: C.danger,
    shadowColor: C.danger,
  },
  recordLabel: { fontSize: 16, fontWeight: '600', color: C.labelTertiary, textAlign: 'center' },
  recordHint: { fontSize: 12, color: C.labelPlaceholder, marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.xl, width: '100%' },
  primaryBtn: {
    flex: 1, backgroundColor: C.primary,
    paddingVertical: 15, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 6,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flex: 1, backgroundColor: C.card,
    paddingVertical: 15, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 6,
    borderWidth: 1, borderColor: C.border,
  },
  secondaryBtnText: { color: C.primary, fontSize: 14, fontWeight: '600' },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: Spacing.lg, paddingVertical: 4,
  },
  resetText: { fontSize: 13, color: C.labelTertiary },

  // Face
  photoPlaceholder: {
    width: 200, height: 200, borderRadius: Radius.xxl,
    backgroundColor: C.cardSecondary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 2, borderColor: C.border, borderStyle: 'dashed',
  },
  photoHint: { fontSize: 13, color: C.labelTertiary, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 },
  preview: { width: 200, height: 200, borderRadius: Radius.xxl, marginBottom: Spacing.xl },
  photoButtons: { flexDirection: 'row', gap: 10, width: '100%' },

  // Loading
  loadingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    justifyContent: 'center', paddingVertical: Spacing.xl,
  },
  loadingText: { fontSize: 14, color: C.labelTertiary, fontWeight: '500' },

  // Result
  resultCard: {
    backgroundColor: C.card, borderRadius: Radius.xxl,
    padding: Spacing.xxl, alignItems: 'center',
    marginTop: Spacing.sm, ...Shadows.md,
  },
  resultEmoji: { fontSize: 52, marginBottom: Spacing.md },
  resultTitle: {
    fontSize: 22, fontWeight: '700', color: C.label,
    textAlign: 'center', marginBottom: 8,
  },
  resultDesc: {
    fontSize: 15, color: C.labelTertiary,
    textAlign: 'center', lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  tryAgainBtn: {
    paddingVertical: 11, paddingHorizontal: 28,
    backgroundColor: C.cardSecondary, borderRadius: Radius.full,
  },
  tryAgainText: { fontSize: 14, fontWeight: '600', color: C.labelTertiary },

  // Tip
  tipCard: {
    backgroundColor: C.cardSecondary, borderRadius: Radius.xxl,
    padding: Spacing.xl, marginTop: Spacing.lg,
  },
  tipTitle: { fontSize: 14, fontWeight: '700', color: C.label, marginBottom: 10 },
  tipText: { fontSize: 14, color: C.labelTertiary, lineHeight: 22 },
});

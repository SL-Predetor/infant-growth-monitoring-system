/**
 * asd-research.tsx
 * ─────────────────
 * Multi-step wizard:
 *   Step -1  → Intro / explanation
 *   Step  0  → Video recording
 *   Step 1–10 → Q-CHAT-10 questions
 *   Step 11  → Demographics (sex)
 *   Step 12  → Demographics (family history)
 *   Step 13  → Processing (loading animation → navigate to asd-result)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const { width: SW } = Dimensions.get('window');
const API_BASE = 'http://192.168.252.49:8001';

// ── Official Q-CHAT-10 (Cambridge University / Autism Research Centre)
// Scoring: Q1–9: "No" = atypical (score 1)  |  Q10: "Yes" = atypical (score 1)
// inverse=true means "Yes" → atypical (score 1), "No" → typical (score 0)
const QUESTIONS = [
  { id: 'A1',  text: 'Does your child look at you when you call his/her name?', inverse: false },
  { id: 'A2',  text: 'Is it easy for you to get eye contact with your child?', inverse: false },
  { id: 'A3',  text: 'Does your child point to indicate that s/he wants something? (e.g. a toy that is out of reach)', inverse: false },
  { id: 'A4',  text: 'Does your child point to share interest with you? (e.g. pointing at an interesting sight)', inverse: false },
  { id: 'A5',  text: 'Does your child pretend? (e.g. care for dolls, talk on a toy phone)', inverse: false },
  { id: 'A6',  text: "Does your child follow where you're looking?", inverse: false },
  { id: 'A7',  text: 'If you or someone in the family is visibly upset, does your child show signs of wanting to comfort them? (e.g. stroking hair, hugging them)', inverse: false },
  { id: 'A8',  text: "Would you describe your child's first words as typical?", inverse: false },
  { id: 'A9',  text: 'Does your child use simple gestures? (e.g. wave goodbye)', inverse: false },
  { id: 'A10', text: 'Does your child stare at nothing with no apparent purpose?', inverse: true },
];

const DEMOGRAPHICS = [
  { id: 'Sex_M',                   text: "What is your child's sex?",               yesLabel: 'Male',  noLabel: 'Female' },
  { id: 'Family_mem_with_ASD_Yes', text: 'Does any family member have ASD?',        yesLabel: 'Yes',   noLabel: 'No'     },
];

// Step boundaries
const STEP_VIDEO    = 0;
const STEP_Q_START  = 1;
const STEP_Q_END    = QUESTIONS.length;          // 10
const STEP_D_START  = STEP_Q_END + 1;            // 11
const STEP_D_END    = STEP_D_START + DEMOGRAPHICS.length - 1; // 12
const STEP_PROCESS  = STEP_D_END + 1;            // 13
const TOTAL_SURVEY  = QUESTIONS.length + DEMOGRAPHICS.length; // 12 survey steps

// ── 4-dot loading animation ──────────────────────────────────────────────────
function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i) * 160),
        ])
      )
    );
    Animated.parallel(animations).start();
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={dotStyles.row}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            dotStyles.dot,
            {
              opacity: dot,
              transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.3] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#007AFF' },
});

// ── Main component ─────────────────────────────────────────────────────────
export default function ASDResearchScreen() {
  const router  = useRouter();
  const slideX  = useRef(new Animated.Value(0)).current;

  const [step,      setStep]      = useState(-1);
  const [videoUri,  setVideoUri]  = useState<string | null>(null);
  const [answers,   setAnswers]   = useState<Record<string, number>>({});
  const [status,    setStatus]    = useState('');

  // ── Slide transition ─────────────────────────────────────────────────────
  const animateTo = (nextStep: number) => {
    const direction = nextStep > step ? -1 : 1;
    Animated.timing(slideX, {
      toValue: direction * SW,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      slideX.setValue(-direction * SW);
      Animated.timing(slideX, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    });
  };

  const goNext = () => animateTo(step + 1);
  const goPrev = () => animateTo(step - 1);

  // ── Record video ─────────────────────────────────────────────────────────
  const recordVideo = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to record the video.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'videos',
      videoMaxDuration: 10,
      quality: 0.6,
      allowsEditing: false,
    } as any);

    if (!result.canceled && result.assets?.[0]?.uri) {
      setVideoUri(result.assets[0].uri);
    }
  };

  // ── Answer a Q-CHAT / demographic question ───────────────────────────────
  const answer = (id: string, score: number) => {
    const updated = { ...answers, [id]: score };
    setAnswers(updated);
    if (step < STEP_PROCESS - 1) {
      goNext();
    } else {
      // last question answered → go to processing
      animateTo(STEP_PROCESS);
      runInference(updated);
    }
  };

  // ── Call all three endpoints and navigate to result ──────────────────────
  const runInference = async (finalAnswers: Record<string, number>) => {
    try {
      setStatus('Analysing video frames…');

      // 1. Video prediction
      let p_facial   = 0;
      let frame_urls: string[] = [];
      if (videoUri) {
        const form = new FormData();
        form.append('file', {
          uri:  videoUri,
          type: 'video/mp4',
          name: 'asd_video.mp4',
        } as any);
        const vRes  = await fetch(`${API_BASE}/asd/predict-video`, { method: 'POST', body: form });
        const vData = await vRes.json();
        p_facial   = vData.asd_probability ?? 0;
        frame_urls = vData.frame_urls      ?? [];
      }

      setStatus('Running questionnaire model…');

      // 2. Q-CHAT prediction
      const payload = {
        A1:  finalAnswers['A1']  ?? 0,
        A2:  finalAnswers['A2']  ?? 0,
        A3:  finalAnswers['A3']  ?? 0,
        A4:  finalAnswers['A4']  ?? 0,
        A5:  finalAnswers['A5']  ?? 0,
        A6:  finalAnswers['A6']  ?? 0,
        A7:  finalAnswers['A7']  ?? 0,
        A8:  finalAnswers['A8']  ?? 0,
        A9:  finalAnswers['A9']  ?? 0,
        A10: finalAnswers['A10'] ?? 0,
        Sex_M:                   finalAnswers['Sex_M']                   ?? 0,
        Family_mem_with_ASD_Yes: finalAnswers['Family_mem_with_ASD_Yes'] ?? 0,
      };
      const qRes    = await fetch(`${API_BASE}/asd/predict-qchat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const qData = await qRes.json();
      const p_qchat     = qData.asd_probability   ?? 0;
      const qchat_score = qData.qchat_score        ?? 0;

      setStatus('Computing fused prediction…');

      // 3. Fusion
      const fRes  = await fetch(`${API_BASE}/asd/predict-fused`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_facial,
          p_qchat,
          qchat_score,
          qchat_answers: payload,
          frame_urls,
        }),
      });
      const fData = await fRes.json();

      // Navigate to result
      router.replace({
        pathname: '/asd-result',
        params: {
          p_facial:        String(p_facial),
          p_qchat:         String(p_qchat),
          qchat_score:     String(qchat_score),
          fused_prob:      String(fData.fused_probability),
          risk_level:      fData.risk_level,
          risk_color:      fData.risk_color,
          recommendation:  fData.recommendation,
          qchat_label:     qData.label,
          facial_label:    p_facial >= 0.06 ? 'ASD Risk Detected' : 'Low ASD Risk',
        },
      });
    } catch (e) {
      console.error('Inference error:', e);
      Alert.alert('Error', 'Could not connect to the server. Please check your connection and try again.');
      animateTo(STEP_VIDEO);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // ── Intro ────────────────────────────────────────────────────────────────
  if (step === -1) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={s.container}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={s.introWrap}>
            <View style={s.introBadge}>
              <Text style={s.introBadgeText}>AI Research</Text>
            </View>
            <Text style={s.introTitle}>AI-Powered{'\n'}ASD Screening</Text>
            <Text style={s.introDesc}>
              Our deep learning model analyses your child's face from a short video, combined with a 10-question behavioural survey, to produce a multi-signal ASD risk score.
            </Text>

            <View style={s.steps}>
              {[
                { num: '1', label: 'Record a 10-second video of your child\'s face' },
                { num: '2', label: 'Answer 10 behavioural questions' },
                { num: '3', label: 'Get an instant AI risk assessment' },
              ].map(st => (
                <View key={st.num} style={s.stepRow}>
                  <View style={s.stepNumBadge}>
                    <Text style={s.stepNum}>{st.num}</Text>
                  </View>
                  <Text style={s.stepLabel}>{st.label}</Text>
                </View>
              ))}
            </View>

            <Text style={s.introNote}>
              Your data is used to improve the model and provide better predictions over time.
            </Text>
          </View>

          <TouchableOpacity style={s.beginBtn} onPress={goNext}>
            <Text style={s.beginBtnText}>Begin Session →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Processing ───────────────────────────────────────────────────────────
  if (step === STEP_PROCESS) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: '#FFFFFF' }]}>
        <StatusBar barStyle="dark-content" />
        <View style={s.processingWrap}>
          <LoadingDots />
          <Text style={s.processingTitle}>Analysing…</Text>
          <Text style={s.processingStatus}>{status}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Video step ────────────────────────────────────────────────────────────
  if (step === STEP_VIDEO) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: '#FFFFFF' }]}>
        <StatusBar barStyle="dark-content" />
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: '8%' }]} />
        </View>
        <View style={s.stepHeaderRow}>
          <TouchableOpacity onPress={goPrev}><Text style={s.backText}>← Back</Text></TouchableOpacity>
          <Text style={s.stepCount}>Step 1 of {STEP_PROCESS}</Text>
        </View>

        <Animated.View style={[s.stepContent, { transform: [{ translateX: slideX }] }]}>
          <Text style={s.sectionLabel}>Video</Text>
          <Text style={s.questionText}>Record your child's{'\n'}face for 10 seconds</Text>
          <Text style={s.videoHint}>
            Make sure your child's face is clearly visible in good lighting. Hold the phone steady.
          </Text>

          <TouchableOpacity style={s.videoBtn} onPress={recordVideo} activeOpacity={0.82}>
            {videoUri ? (
              <>
                <Text style={s.videoBtnIcon}>✅</Text>
                <Text style={s.videoBtnLabel}>Video Recorded</Text>
                <Text style={s.videoBtnSub}>Tap to re-record</Text>
              </>
            ) : (
              <>
                <Text style={s.videoBtnIcon}>🎥</Text>
                <Text style={s.videoBtnLabel}>Tap to Record</Text>
                <Text style={s.videoBtnSub}>10 seconds · Face visible</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.nextBtn, !videoUri && s.nextBtnDisabled]}
            onPress={goNext}
            disabled={!videoUri}
          >
            <Text style={s.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Q-CHAT / Demographic steps ────────────────────────────────────────────
  const isDemo   = step >= STEP_D_START;
  const dIdx     = step - STEP_D_START;
  const qIdx     = step - STEP_Q_START;
  const item     = isDemo ? DEMOGRAPHICS[dIdx] : QUESTIONS[qIdx];

  const surveyStep  = step - STEP_Q_START + 1;               // 1-based in survey
  const progress    = ((step) / (STEP_PROCESS - 1)) * 100;

  const yesScore = isDemo ? 1 : (QUESTIONS[qIdx].inverse ? 1 : 0);
  const noScore  = isDemo ? 0 : (QUESTIONS[qIdx].inverse ? 0 : 1);
  const yesLabel = 'yesLabel' in item ? (item as any).yesLabel : 'Yes';
  const noLabel  = 'noLabel'  in item ? (item as any).noLabel  : 'No';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: '#FFFFFF' }]}>
      <StatusBar barStyle="dark-content" />

      <View style={s.progressBar}>
        <View style={[s.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={s.stepHeaderRow}>
        <TouchableOpacity onPress={goPrev}><Text style={s.backText}>← Back</Text></TouchableOpacity>
        <Text style={s.stepCount}>
          Step {step + 1} of {STEP_PROCESS}
        </Text>
      </View>

      <Animated.View style={[s.stepContent, { transform: [{ translateX: slideX }] }]}>
        <Text style={s.sectionLabel}>
          {isDemo ? 'About your child' : `Question ${surveyStep}`}
        </Text>
        <Text style={s.questionText}>{item.text}</Text>

        <View style={s.answerCol}>
          <TouchableOpacity
            style={[s.answerBtn, s.answerYes]}
            activeOpacity={0.8}
            onPress={() => answer(item.id, yesScore)}
          >
            <Text style={s.answerBtnText}>{yesLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.answerBtn, s.answerNo]}
            activeOpacity={0.8}
            onPress={() => answer(item.id, noScore)}
          >
            <Text style={[s.answerBtnText, { color: '#000' }]}>{noLabel}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  backBtn:  { marginBottom: 20 },
  backText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },

  // ── Intro ──
  introWrap: { flex: 1, justifyContent: 'center' },
  introBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  introBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  introTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: 16,
  },
  introDesc: { fontSize: 16, color: '#6E6E73', lineHeight: 24, marginBottom: 28 },
  steps: { marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  stepNum:   { fontSize: 13, fontWeight: '700', color: '#FFF' },
  stepLabel: { fontSize: 15, color: '#3A3A3C', flex: 1, lineHeight: 22 },
  introNote: { fontSize: 13, color: '#8E8E93', lineHeight: 18 },

  beginBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 8 : 20,
  },
  beginBtnText: { fontSize: 17, fontWeight: '600', color: '#FFF' },

  // ── Processing ──
  processingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  processingTitle:  { fontSize: 24, fontWeight: '700', color: '#000', marginTop: 24, letterSpacing: -0.3 },
  processingStatus: { fontSize: 15, color: '#6E6E73', marginTop: 10 },

  // ── Progress bar ──
  progressBar:  { height: 3, backgroundColor: '#E5E5EA' },
  progressFill: { height: 3, backgroundColor: '#007AFF' },

  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  stepCount: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },

  stepContent: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 32,
  },

  // ── Video step ──
  videoHint: { fontSize: 15, color: '#6E6E73', lineHeight: 22, marginBottom: 28 },
  videoBtn: {
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingVertical: 36,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  videoBtnIcon:  { fontSize: 44, marginBottom: 10 },
  videoBtnLabel: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 4 },
  videoBtnSub:   { fontSize: 14, color: '#8E8E93' },
  nextBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: '#C7C7CC' },
  nextBtnText: { fontSize: 17, fontWeight: '600', color: '#FFF' },

  // ── Q-CHAT answers ──
  answerCol: { gap: 14 },
  answerBtn: {
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  answerYes:     { backgroundColor: '#007AFF' },
  answerNo:      { backgroundColor: '#F2F2F7' },
  answerBtnText: { fontSize: 18, fontWeight: '600', color: '#FFF' },
});

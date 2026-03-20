/**
 * asd-research.tsx
 * Flow:
 *   'intro'      → explanation
 *   'video'      → 10-second face recording
 *   'questions'  → all 12 YES/NO questions as scrollable cards
 *   'processing' → loading while inference runs
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Animated, ScrollView,
  Platform, StatusBar, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';

const C = Colors.light;
const API_BASE = 'http://localhost:8000';

// Same 5-option frequency questions as Q-CHAT-10
// Scoring: Q1–Q9 optIdx >= 2 → atypical (1).  Q10 reversed: optIdx <= 2 → atypical (1).
const QUESTIONS = [
  { id: 'A1',  text: 'Does your child look at you when you call his/her name?',                                                                           options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'] },
  { id: 'A2',  text: 'How easy is it for you to get eye contact with your child?',                                                                        options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'] },
  { id: 'A3',  text: 'Does your child point to indicate that s/he wants something?\n(e.g. a toy that is out of reach)',                                   options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'] },
  { id: 'A4',  text: 'Does your child point to share interest with you?\n(e.g. pointing at an interesting sight)',                                        options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'] },
  { id: 'A5',  text: 'Does your child pretend?\n(e.g. care for dolls, talk on a toy phone)',                                                             options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'] },
  { id: 'A6',  text: "Does your child follow where you're looking?",                                                                                      options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'] },
  { id: 'A7',  text: 'If someone in the family is visibly upset, does your child show signs of wanting to comfort them?\n(e.g. stroking hair, hugging)', options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'] },
  { id: 'A8',  text: "Would you describe your child's first words as:",                                                                                   options: ['Very typical', 'Quite typical', 'Slightly unusual', 'Very unusual', "My child doesn't speak"] },
  { id: 'A9',  text: 'Does your child use simple gestures?\n(e.g. wave goodbye)',                                                                        options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'] },
  { id: 'A10', text: 'Does your child stare at nothing with no apparent purpose?',                                                                        options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'] },
];

function getScore(qIdx: number, optIdx: number): number {
  if (qIdx === 9) return optIdx <= 2 ? 1 : 0;
  return optIdx >= 2 ? 1 : 0;
}

const DEMOGRAPHICS = [
  { id: 'Sex_M',                   text: "What is your child's sex?",                        yesLabel: 'Male', noLabel: 'Female' },
  { id: 'Family_mem_with_ASD_Yes', text: 'Does any family member have a diagnosis of ASD?',  yesLabel: 'Yes',  noLabel: 'No'     },
];

const TOTAL = QUESTIONS.length + DEMOGRAPHICS.length;

type View = 'intro' | 'video' | 'questions' | 'processing';

/* ── Animated loading dots ── */
function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 160),
        Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay((dots.length - i) * 160),
      ]))
    );
    Animated.parallel(anims).start();
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={dot.row}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[dot.dot, {
          opacity: d,
          transform: [{ scale: d.interpolate({ inputRange: [0,1], outputRange: [0.7, 1.3] }) }],
        }]} />
      ))}
    </View>
  );
}
const dot = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary },
});

/* ── Main ── */
export default function ASDResearchScreen() {
  const router = useRouter();

  const [screen,    setScreen]    = useState<View>('intro');
  const [videoUri,  setVideoUri]  = useState<string | null>(null);
  const [answers,   setAnswers]   = useState<Record<string, number>>({});
  const [selections,setSelections]= useState<Record<string, number>>({}); // tracks option idx per question
  const [status,    setStatus]    = useState('');

  const answered = Object.keys(selections).length;
  const allDone  = answered >= TOTAL;

  const setAnswer = (id: string, score: number, btnIdx: number) => {
    setAnswers(prev => ({ ...prev, [id]: score }));
    setSelections(prev => ({ ...prev, [id]: btnIdx }));
  };

  /* ── Record video ── */
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

  /* ── Run all three endpoints ── */
  const runInference = async () => {
    if (!allDone) return;
    setScreen('processing');
    try {
      setStatus('Analysing video frames…');
      let p_facial = 0;
      let frame_urls: string[] = [];
      if (videoUri) {
        const form = new FormData();
        form.append('file', { uri: videoUri, type: 'video/mp4', name: 'asd_video.mp4' } as any);
        const vRes  = await fetch(`${API_BASE}/api/asd/predict-video`, { method: 'POST', body: form });
        const vData = await vRes.json();
        p_facial   = vData.asd_probability ?? 0;
        frame_urls = vData.frame_urls ?? [];
      }

      setStatus('Running questionnaire model…');
      const payload = {
        A1: answers['A1'] ?? 0, A2: answers['A2'] ?? 0, A3: answers['A3'] ?? 0,
        A4: answers['A4'] ?? 0, A5: answers['A5'] ?? 0, A6: answers['A6'] ?? 0,
        A7: answers['A7'] ?? 0, A8: answers['A8'] ?? 0, A9: answers['A9'] ?? 0,
        A10: answers['A10'] ?? 0,
        Sex_M:                   answers['Sex_M']                   ?? 0,
        Family_mem_with_ASD_Yes: answers['Family_mem_with_ASD_Yes'] ?? 0,
      };
      const qRes  = await fetch(`${API_BASE}/api/asd/predict-qchat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const qData    = await qRes.json();
      const p_qchat  = qData.asd_probability ?? 0;
      const qchat_score = qData.qchat_score ?? 0;

      setStatus('Computing fused prediction…');
      const fRes  = await fetch(`${API_BASE}/api/asd/predict-fused`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_facial, p_qchat, qchat_score, qchat_answers: payload, frame_urls }),
      });
      const fData = await fRes.json();

      router.replace({
        pathname: '/(tabs)/asd-result' as any,
        params: {
          p_facial:       String(p_facial),
          p_qchat:        String(p_qchat),
          qchat_score:    String(qchat_score),
          fused_prob:     String(fData.fused_probability ?? 0),
          risk_level:     fData.risk_level     ?? 'Low',
          risk_color:     fData.risk_color      ?? 'green',
          recommendation: fData.recommendation ?? '',
          qchat_label:    qData.label           ?? 'Low ASD Risk',
          facial_label:   p_facial >= 0.06 ? 'ASD Risk Detected' : 'Low ASD Risk',
        },
      });
    } catch (e) {
      Alert.alert('Error', 'Could not connect to the server. Please check your connection and try again.');
      setScreen('questions');
    }
  };

  /* ══════════════════════════════════════════════════════
     INTRO
  ══════════════════════════════════════════════════════ */
  if (screen === 'intro') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <View style={s.introWrap}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/asd-screen' as any)}
            style={s.backBtn}
            hitSlop={{ top:10,bottom:10,left:10,right:10 }}
          >
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={s.introCentre}>
            <View style={s.introBadge}>
              <Text style={s.introBadgeText}>AI Research</Text>
            </View>
            <Text style={s.introTitle}>AI-Powered{'\n'}ASD Screening</Text>
            <Text style={s.introDesc}>
              Our deep learning model analyses your child's face from a short video, combined with a
              10-question behavioural survey, to produce a multi-signal ASD risk score.
            </Text>

            <View style={s.stepsList}>
              {[
                { num: '1', label: "Record a 10-second video of your child's face" },
                { num: '2', label: 'Answer 10 behavioural questions' },
                { num: '3', label: 'Get an instant AI risk assessment' },
              ].map(st => (
                <View key={st.num} style={s.stepItem}>
                  <View style={s.stepNumBadge}><Text style={s.stepNum}>{st.num}</Text></View>
                  <Text style={s.stepLabel}>{st.label}</Text>
                </View>
              ))}
            </View>

            <Text style={s.introNote}>
              Your data is used to improve the model and provide better predictions over time.
            </Text>
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={() => setScreen('video')}>
            <Text style={s.primaryBtnText}>Begin Session →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ══════════════════════════════════════════════════════
     PROCESSING
  ══════════════════════════════════════════════════════ */
  if (screen === 'processing') {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.card }]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.card} />
        <View style={s.processingWrap}>
          <LoadingDots />
          <Text style={s.processingTitle}>Analysing…</Text>
          <Text style={s.processingStatus}>{status}</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ══════════════════════════════════════════════════════
     VIDEO
  ══════════════════════════════════════════════════════ */
  if (screen === 'video') {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.card }]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.card} />
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: '7%' as any }]} />
        </View>
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => setScreen('intro')} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.stepCount}>Step 1 of 2</Text>
        </View>

        <View style={s.videoContent}>
          <Text style={s.sectionLabel}>Video</Text>
          <Text style={s.videoTitle}>Record your child's{'\n'}face for 10 seconds</Text>
          <Text style={s.videoHint}>
            Make sure your child's face is clearly visible in good lighting. Hold the phone steady.
          </Text>

          <TouchableOpacity style={s.videoBox} onPress={recordVideo} activeOpacity={0.82}>
            <Text style={s.videoBoxIcon}>{videoUri ? '✅' : '🎥'}</Text>
            <Text style={s.videoBoxLabel}>{videoUri ? 'Video Recorded' : 'Tap to Record'}</Text>
            <Text style={s.videoBoxSub}>{videoUri ? 'Tap to re-record' : '10 seconds · Face visible'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.primaryBtn, !videoUri && s.primaryBtnDisabled]}
            onPress={() => setScreen('questions')}
            disabled={!videoUri}
          >
            <Text style={s.primaryBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ══════════════════════════════════════════════════════
     QUESTIONS (scrollable cards)
  ══════════════════════════════════════════════════════ */
  const progress = answered / TOTAL;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={s.navRow}>
        <TouchableOpacity onPress={() => setScreen('video')} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Behavioural Survey</Text>
        <Text style={s.stepCount}>{answered}/{TOTAL}</Text>
      </View>

      {/* Progress */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Q1–Q10 — 5-option frequency pills */}
        {QUESTIONS.map((q, qi) => {
          const sel = selections[q.id];
          return (
            <View key={q.id} style={s.card}>
              <Text style={s.qNum}>Question {qi + 1}</Text>
              <Text style={s.qText}>{q.text}</Text>
              <View style={s.optionList}>
                {q.options.map((label, idx) => {
                  const isSelected = sel === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[s.optionPill, isSelected && s.optionPillActive]}
                      activeOpacity={0.75}
                      onPress={() => setAnswer(q.id, getScore(qi, idx), idx)}
                    >
                      <Text style={[s.optionText, isSelected && s.optionTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Demographics */}
        {DEMOGRAPHICS.map((d, di) => {
          const sel = selections[d.id];
          return (
            <View key={d.id} style={s.card}>
              <Text style={s.qNum}>About your child</Text>
              <Text style={s.qText}>{d.text}</Text>
              <View style={s.binaryRow}>
                <TouchableOpacity
                  style={[s.binaryBtn, sel === 0 && s.binaryBtnActive]}
                  activeOpacity={0.75}
                  onPress={() => setAnswer(d.id, 1, 0)}
                >
                  <Text style={[s.binaryBtnText, sel === 0 && s.binaryBtnTextActive]}>{d.yesLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.binaryBtn, sel === 1 && s.binaryBtnActive]}
                  activeOpacity={0.75}
                  onPress={() => setAnswer(d.id, 0, 1)}
                >
                  <Text style={[s.binaryBtnText, sel === 1 && s.binaryBtnTextActive]}>{d.noLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Submit */}
        <TouchableOpacity
          style={[s.primaryBtn, !allDone && s.primaryBtnDisabled]}
          onPress={runInference}
          disabled={!allDone}
          activeOpacity={0.85}
        >
          <Text style={s.primaryBtnText}>
            {allDone ? 'Analyse Results →' : `Answer all questions  (${answered}/${TOTAL})`}
          </Text>
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          This is a screening tool only and does not constitute a clinical diagnosis.
        </Text>
        <View style={{ height: Platform.OS === 'ios' ? 16 : 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  /* ── Intro ── */
  introWrap: {
    flex: 1, paddingHorizontal: Spacing.screenPadding,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  backBtn:  { marginBottom: 20 },
  backText: { fontSize: 16, color: C.primary, fontWeight: '500' },

  introCentre: { flex: 1, justifyContent: 'center' },
  introBadge: {
    alignSelf: 'flex-start', backgroundColor: C.accent,
    borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 16,
  },
  introBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  introTitle: {
    fontSize: 34, fontWeight: '700', color: C.label,
    letterSpacing: -0.8, lineHeight: 40, marginBottom: 16,
  },
  introDesc: { fontSize: 16, color: C.labelTertiary, lineHeight: 24, marginBottom: 28 },

  stepsList: { marginBottom: 24 },
  stepItem:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepNumBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    marginRight: 12, marginTop: 1,
  },
  stepNum:   { fontSize: 13, fontWeight: '700', color: '#FFF' },
  stepLabel: { fontSize: 15, color: C.labelSecondary, flex: 1, lineHeight: 22 },
  introNote: { fontSize: 13, color: C.labelTertiary, lineHeight: 18 },

  /* ── Processing ── */
  processingWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  processingTitle:  { fontSize: 24, fontWeight: '700', color: C.label, marginTop: 24, letterSpacing: -0.3 },
  processingStatus: { fontSize: 15, color: C.labelTertiary, marginTop: 10 },

  /* ── Shared nav ── */
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding, paddingVertical: 12,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: C.label },
  stepCount:   { fontSize: 13, color: C.labelTertiary, fontWeight: '600', minWidth: 36, textAlign: 'right' },

  /* ── Progress bar ── */
  progressTrack: { height: 3, backgroundColor: C.border },
  progressFill:  { height: 3, backgroundColor: C.primary },

  /* ── Video ── */
  videoContent: { flex: 1, paddingHorizontal: Spacing.screenPadding, paddingTop: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  videoTitle: {
    fontSize: 26, fontWeight: '700', color: C.label,
    lineHeight: 34, letterSpacing: -0.4, marginBottom: 10,
  },
  videoHint: { fontSize: 15, color: C.labelTertiary, lineHeight: 22, marginBottom: 28 },
  videoBox: {
    backgroundColor: C.cardSecondary, borderRadius: Radius.xl,
    paddingVertical: 36, alignItems: 'center', marginBottom: 28,
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
  },
  videoBoxIcon:  { fontSize: 44, marginBottom: 10 },
  videoBoxLabel: { fontSize: 18, fontWeight: '600', color: C.label, marginBottom: 4 },
  videoBoxSub:   { fontSize: 14, color: C.labelTertiary },

  /* ── Scroll / cards ── */
  scroll: { paddingHorizontal: Spacing.screenPadding, paddingTop: 16 },

  card: {
    backgroundColor: C.card, borderRadius: Radius.xl,
    padding: 18, marginBottom: 12, ...Shadows.sm,
  },
  qNum: {
    fontSize: 11, fontWeight: '700', color: C.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  qText: { fontSize: 15, fontWeight: '600', color: C.label, lineHeight: 22, marginBottom: 14 },

  /* 5-option frequency pills */
  optionList: { gap: 8 },
  optionPill: {
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: Radius.lg,
    paddingVertical: 11, paddingHorizontal: 14,
    backgroundColor: C.card,
  },
  optionPillActive: { backgroundColor: C.primarySoft, borderColor: C.primary },
  optionText:       { fontSize: 14, color: C.labelSecondary, fontWeight: '500' },
  optionTextActive: { color: C.primary, fontWeight: '700' },

  /* YES / NO buttons (demographics only) */
  binaryRow: { flexDirection: 'row', gap: 10 },
  binaryBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.lg,
    alignItems: 'center', borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card,
  },
  binaryBtnActive:     { backgroundColor: C.primary, borderColor: C.primary },
  binaryBtnText:       { fontSize: 15, fontWeight: '600', color: C.labelSecondary },
  binaryBtnTextActive: { color: '#FFF' },

  /* ── Buttons ── */
  primaryBtn: {
    backgroundColor: C.primary, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 8, marginBottom: 12,
  },
  primaryBtnDisabled: { backgroundColor: C.border },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  disclaimer: {
    fontSize: 12, color: C.labelTertiary,
    textAlign: 'center', lineHeight: 18, paddingHorizontal: 16,
  },
});

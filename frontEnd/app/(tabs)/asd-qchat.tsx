import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';

const C = Colors.light;
const API_BASE = 'http://localhost:8000';

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
  { id: 'A10', text: 'Does your child stare at nothing with no apparent purpose?',                                                                       options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'] },
];

const DEMOGRAPHICS = [
  { id: 'Sex_M',                   text: "What is your child's sex?",                        yesLabel: 'Male', noLabel: 'Female' },
  { id: 'Family_mem_with_ASD_Yes', text: 'Does any family member have a diagnosis of ASD?',  yesLabel: 'Yes',  noLabel: 'No'     },
];

const TOTAL = QUESTIONS.length + DEMOGRAPHICS.length;

function getScore(qIdx: number, optIdx: number): number {
  if (qIdx === 9) return optIdx <= 2 ? 1 : 0;
  return optIdx >= 2 ? 1 : 0;
}

export default function ASDQChatScreen() {
  const router  = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [answers,  setAnswers]  = useState<Record<string, number | null>>({});
  const [loading,  setLoading]  = useState(false);
  const [started,  setStarted]  = useState(false);

  const answered = Object.values(answers).filter(v => v !== null && v !== undefined).length;
  const allDone  = answered >= TOTAL;

  const setAnswer = (id: string, score: number) => {
    setAnswers(prev => ({ ...prev, [id]: score }));
  };

  const submit = async () => {
    if (!allDone || loading) return;
    setLoading(true);
    try {
      const a = answers as Record<string, number>;
      const payload = {
        A1: a['A1'] ?? 0, A2: a['A2'] ?? 0, A3: a['A3'] ?? 0,
        A4: a['A4'] ?? 0, A5: a['A5'] ?? 0, A6: a['A6'] ?? 0,
        A7: a['A7'] ?? 0, A8: a['A8'] ?? 0, A9: a['A9'] ?? 0,
        A10: a['A10'] ?? 0,
        Sex_M:                   a['Sex_M']                   ?? 0,
        Family_mem_with_ASD_Yes: a['Family_mem_with_ASD_Yes'] ?? 0,
      };
      const res  = await fetch(`${API_BASE}/api/asd/predict-qchat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      router.push({
        pathname: '/(tabs)/asd-qchat-result' as any,
        params: {
          asd_probability: String(data.asd_probability),
          label:           data.label,
          qchat_score:     String(data.qchat_score),
          score_exceeded:  String(data.score_exceeded),
          confidence:      data.confidence,
        },
      });
    } catch (e) {
      alert('API error: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  /* ── INTRO ── */
  if (!started) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <View style={s.introWrap}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/asd-screen' as any)} style={s.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={s.introCentre}>
            <Text style={s.introEmoji}>📋</Text>
            <Text style={s.introTitle}>Q-CHAT-10</Text>
            <Text style={s.introSubtitle}>Quantitative Checklist for Autism in Toddlers</Text>
            <Text style={s.introBody}>
              A validated clinical screening tool developed by Cambridge University researchers.
              Answer all 12 questions at your own pace — you can scroll back to change any answer.
            </Text>

            <View style={s.pillRow}>
              <View style={s.pill}><Text style={s.pillNum}>12</Text><Text style={s.pillLbl}>Questions</Text></View>
              <View style={s.pillDivider} />
              <View style={s.pill}><Text style={s.pillNum}>~2</Text><Text style={s.pillLbl}>Minutes</Text></View>
            </View>

            <Text style={s.introNote}>Best answered by whoever knows the child best.</Text>
          </View>

          <TouchableOpacity style={s.startBtn} onPress={() => setStarted(true)}>
            <Text style={s.startBtnText}>Begin Questions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ── QUESTIONNAIRE ── */
  const progress = answered / TOTAL;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => setStarted(false)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Q-CHAT-10</Text>
        <Text style={s.headerCount}>{answered}/{TOTAL}</Text>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Q1–Q10 ── */}
        {QUESTIONS.map((q, qi) => {
          const sel = answers[q.id];
          return (
            <View key={q.id} style={s.card}>
              <Text style={s.qNum}>Question {qi + 1}</Text>
              <Text style={s.qText}>{q.text}</Text>
              <View style={s.optionList}>
                {q.options.map((label, idx) => {
                  const active = sel !== undefined && sel !== null &&
                    (qi === 9 ? (idx <= 2 ? 1 : 0) : (idx >= 2 ? 1 : 0)) === sel &&
                    /* resolve back to original idx */
                    answers[q.id + '__idx'] === idx;

                  /* Simpler: store raw optIdx alongside score */
                  const isSelected = answers[q.id + '__idx'] === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[s.optionPill, isSelected && s.optionPillActive]}
                      activeOpacity={0.75}
                      onPress={() => {
                        setAnswers(prev => ({
                          ...prev,
                          [q.id]:           getScore(qi, idx),
                          [q.id + '__idx']: idx,
                        }));
                      }}
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

        {/* ── Demographics ── */}
        {DEMOGRAPHICS.map((d) => {
          const selIdx = answers[d.id + '__idx'] as number | undefined;
          return (
            <View key={d.id} style={s.card}>
              <Text style={s.qNum}>About your child</Text>
              <Text style={s.qText}>{d.text}</Text>
              <View style={s.demoRow}>
                {[d.yesLabel, d.noLabel].map((label, idx) => {
                  const value     = idx === 0 ? 1 : 0;
                  const isSelected = selIdx === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[s.demoBtn, isSelected && s.demoBtnActive]}
                      activeOpacity={0.75}
                      onPress={() => setAnswers(prev => ({
                        ...prev,
                        [d.id]:           value,
                        [d.id + '__idx']: idx,
                      }))}
                    >
                      <Text style={[s.demoBtnText, isSelected && s.demoBtnTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[s.submitBtn, !allDone && s.submitBtnDisabled]}
          onPress={submit}
          disabled={!allDone || loading}
          activeOpacity={0.85}
        >
          <Text style={s.submitBtnText}>
            {loading ? 'Calculating…' : allDone ? 'See Results' : `Answer all questions  (${answered}/${TOTAL})`}
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
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  backBtn:     { marginBottom: 20 },
  backText:    { fontSize: 16, color: C.primary, fontWeight: '500' },
  introCentre: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  introEmoji:  { fontSize: 56, marginBottom: 16 },
  introTitle:  { fontSize: 32, fontWeight: '700', color: C.label, letterSpacing: -0.5, marginBottom: 6 },
  introSubtitle: { fontSize: 14, color: C.labelTertiary, marginBottom: 18, textAlign: 'center', paddingHorizontal: 16 },
  introBody:   { fontSize: 15, color: C.labelSecondary, lineHeight: 24, textAlign: 'center', paddingHorizontal: 8, marginBottom: 28 },
  pillRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  pill:        { alignItems: 'center', paddingHorizontal: 32 },
  pillNum:     { fontSize: 26, fontWeight: '800', color: C.primary },
  pillLbl:     { fontSize: 12, color: C.labelTertiary, marginTop: 3 },
  pillDivider: { width: 1, height: 40, backgroundColor: C.border },
  introNote:   { fontSize: 13, color: C.labelTertiary, textAlign: 'center' },
  startBtn: {
    backgroundColor: C.primary, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 8 : 20,
  },
  startBtnText: { fontSize: 17, fontWeight: '600', color: '#FFF' },

  /* ── Header ── */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding, paddingVertical: 12,
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: C.label },
  headerCount: { fontSize: 13, color: C.labelTertiary, fontWeight: '600', minWidth: 36, textAlign: 'right' },

  /* ── Progress ── */
  progressTrack: { height: 3, backgroundColor: C.border },
  progressFill:  { height: 3, backgroundColor: C.primary },

  /* ── Scroll ── */
  scroll: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
  },

  /* ── Question card ── */
  card: {
    backgroundColor: C.card,
    borderRadius: Radius.xl,
    padding: 18,
    marginBottom: 12,
    ...Shadows.sm,
  },
  qNum: {
    fontSize: 11, fontWeight: '700', color: C.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  qText: {
    fontSize: 15, fontWeight: '600', color: C.label,
    lineHeight: 22, marginBottom: 14,
  },

  /* ── Option pills (vertical) ── */
  optionList: { gap: 8 },
  optionPill: {
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: Radius.lg,
    paddingVertical: 11, paddingHorizontal: 14,
    backgroundColor: C.card,
  },
  optionPillActive: {
    backgroundColor: C.primarySoft,
    borderColor: C.primary,
  },
  optionText:       { fontSize: 14, color: C.labelSecondary, fontWeight: '500' },
  optionTextActive: { color: C.primary, fontWeight: '700' },

  /* ── Demographics yes/no ── */
  demoRow: { flexDirection: 'row', gap: 10 },
  demoBtn: {
    flex: 1, paddingVertical: 16, borderRadius: Radius.lg,
    alignItems: 'center', borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card,
  },
  demoBtnActive:     { backgroundColor: C.primary, borderColor: C.primary },
  demoBtnText:       { fontSize: 15, fontWeight: '600', color: C.labelSecondary },
  demoBtnTextActive: { color: '#FFF' },

  /* ── Submit ── */
  submitBtn: {
    backgroundColor: C.primary, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 8, marginBottom: 12,
  },
  submitBtnDisabled: { backgroundColor: C.border },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  disclaimer: {
    fontSize: 12, color: C.labelTertiary,
    textAlign: 'center', lineHeight: 18, paddingHorizontal: 16,
  },
});

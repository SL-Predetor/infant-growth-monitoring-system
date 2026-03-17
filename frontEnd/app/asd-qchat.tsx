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
  BackHandler,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const { height: SH } = Dimensions.get('window');
const API_BASE = 'http://localhost:8000';

const QUESTIONS = [
  {
    id: 'A1',
    text: 'Does your child look at you when you call his/her name?',
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
  },
  {
    id: 'A2',
    text: 'How easy is it for you to get eye contact with your child?',
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
  },
  {
    id: 'A3',
    text: 'Does your child point to indicate that s/he wants something? (e.g. a toy that is out of reach)',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
  {
    id: 'A4',
    text: 'Does your child point to share interest with you? (e.g. pointing at an interesting sight)',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
  {
    id: 'A5',
    text: 'Does your child pretend? (e.g. care for dolls, talk on a toy phone)',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
  {
    id: 'A6',
    text: "Does your child follow where you're looking?",
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
  {
    id: 'A7',
    text: 'If you or someone in the family is visibly upset, does your child show signs of wanting to comfort them? (e.g. stroking hair, hugging them)',
    options: ['Always', 'Usually', 'Sometimes', 'Rarely', 'Never'],
  },
  {
    id: 'A8',
    text: "Would you describe your child's first words as:",
    options: ['Very typical', 'Quite typical', 'Slightly unusual', 'Very unusual', "My child doesn't speak"],
  },
  {
    id: 'A9',
    text: 'Does your child use simple gestures? (e.g. wave goodbye)',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
  {
    id: 'A10',
    text: 'Does your child stare at nothing with no apparent purpose?',
    options: ['Many times a day', 'A few times a day', 'A few times a week', 'Less than once a week', 'Never'],
  },
];

const DEMOGRAPHICS = [
  { id: 'Sex_M', text: "What is your child's sex?", yesLabel: 'Male', noLabel: 'Female' },
  { id: 'Family_mem_with_ASD_Yes', text: 'Does any family member have a diagnosis of ASD?', yesLabel: 'Yes', noLabel: 'No' },
];

const TOTAL_STEPS = QUESTIONS.length + DEMOGRAPHICS.length;

// Q1–Q9: optIdx >= 2 → atypical (score 1). Q10 reversed: optIdx <= 2 → atypical (score 1).
function getScore(qIdx: number, optIdx: number): number {
  if (qIdx === 9) return optIdx <= 2 ? 1 : 0;
  return optIdx >= 2 ? 1 : 0;
}

export default function ASDQChatScreen() {
  const router = useRouter();
  const slideY = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Reset option highlight whenever step changes
  useEffect(() => {
    setSelectedOption(null);
  }, [step]);

  // Intercept hardware back button & iOS edge swipe
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        if (step === -1) {
          router.back();
        } else {
          goPrev();
        }
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [step])
  );

  const CARD_HEIGHT = SH * 0.72; // approximate height of one card + gap

  const goNext = () => {
    Animated.timing(slideY, { toValue: -CARD_HEIGHT, duration: 320, useNativeDriver: true }).start(() => {
      setStep(s => s + 1);
      slideY.setValue(0);
    });
  };

  const goPrev = () => {
    Animated.timing(slideY, { toValue: CARD_HEIGHT, duration: 320, useNativeDriver: true }).start(() => {
      setStep(s => s - 1);
      slideY.setValue(0);
    });
  };

  const handleQuestionOption = (qIdx: number, optIdx: number) => {
    const score = getScore(qIdx, optIdx);
    const id = QUESTIONS[qIdx].id;
    setSelectedOption(optIdx);
    setTimeout(() => {
      const updated = { ...answers, [id]: score };
      setAnswers(updated);
      if (step < TOTAL_STEPS - 1) {
        goNext();
      } else {
        submit(updated);
      }
    }, 150);
  };

  const handleDemoOption = (id: string, value: number) => {
    const updated = { ...answers, [id]: value };
    setAnswers(updated);
    if (step < TOTAL_STEPS - 1) {
      goNext();
    } else {
      submit(updated);
    }
  };

  const submit = async (finalAnswers: Record<string, number>) => {
    setLoading(true);
    try {
      const payload = {
        A1: finalAnswers['A1'] ?? 0,
        A2: finalAnswers['A2'] ?? 0,
        A3: finalAnswers['A3'] ?? 0,
        A4: finalAnswers['A4'] ?? 0,
        A5: finalAnswers['A5'] ?? 0,
        A6: finalAnswers['A6'] ?? 0,
        A7: finalAnswers['A7'] ?? 0,
        A8: finalAnswers['A8'] ?? 0,
        A9: finalAnswers['A9'] ?? 0,
        A10: finalAnswers['A10'] ?? 0,
        Sex_M: finalAnswers['Sex_M'] ?? 0,
        Family_mem_with_ASD_Yes: finalAnswers['Family_mem_with_ASD_Yes'] ?? 0,
      };
      const res = await fetch(`${API_BASE}/api/asd/predict-qchat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      router.push({
        pathname: '/asd-qchat-result',
        params: {
          asd_probability: String(data.asd_probability),
          label: data.label,
          qchat_score: String(data.qchat_score),
          score_exceeded: String(data.score_exceeded),
          confidence: data.confidence,
        },
      });
    } catch (e) {
      console.error('Q-CHAT submit error:', e);
      alert('API error: ' + String(e));
    } finally {
      setLoading(false);
    }
  };

  // ── Intro screen ──────────────────────────────────────────────────────────
  if (step === -1) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.introContent}>
            <Text style={styles.introEmoji}>📋</Text>
            <Text style={styles.introTitle}>Q-CHAT-10</Text>
            <Text style={styles.introSubtitle}>Quantitative Checklist for Autism in Toddlers</Text>
            <Text style={styles.introBody}>
              A validated clinical screening tool developed by researchers at Cambridge University.
              Used by pediatricians worldwide for early ASD detection in children.
            </Text>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoValue}>10</Text>
                <Text style={styles.infoLabel}>Questions</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoValue}>~2</Text>
                <Text style={styles.infoLabel}>Minutes</Text>
              </View>
            </View>

            <Text style={styles.introNote}>
              Best answered by a parent or primary caregiver who knows the child well.
            </Text>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={goNext}>
            <Text style={styles.startBtnText}>Begin Questions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── helpers to render a card for any step index ─────────────────────────
  const renderCard = (s: number, isNext: boolean) => {
    if (s < 0 || s >= TOTAL_STEPS) return null;
    const demo = s >= QUESTIONS.length;
    const qi = demo ? s - QUESTIONS.length : s;
    const it = demo ? DEMOGRAPHICS[qi] : QUESTIONS[qi];

    return (
      <View style={{ position: 'relative' }}>
        <View style={[styles.questionCard, isNext && styles.nextCard]} pointerEvents={isNext ? 'none' : 'auto'}>
          <Text style={styles.sectionLabel}>
            {demo ? 'About your child' : `Question ${s + 1}`}
          </Text>
          <Text style={styles.questionText}>{it.text}</Text>

          {!demo && (
            <View style={styles.optionsCol}>
              {(it as typeof QUESTIONS[0]).options.map((label, idx) => {
                const active = !isNext && selectedOption === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.optionBtn, active && styles.optionBtnActive]}
                    activeOpacity={0.8}
                    onPress={() => !isNext && handleQuestionOption(qi, idx)}
                    disabled={loading || isNext}
                  >
                    <View style={[styles.optionBadge, active && styles.optionBadgeActive]}>
                      <Text style={[styles.optionLetter, active && { color: '#007AFF' }]}>
                        {String.fromCharCode(65 + idx)}
                      </Text>
                    </View>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {demo && (
            <View style={styles.answerRow}>
              <TouchableOpacity
                style={[styles.answerBtn, styles.answerYes]}
                activeOpacity={0.8}
                onPress={() => !isNext && handleDemoOption((it as typeof DEMOGRAPHICS[0]).id, 1)}
                disabled={loading || isNext}
              >
                <Text style={styles.answerBtnText}>{(it as typeof DEMOGRAPHICS[0]).yesLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.answerBtn, styles.answerNo]}
                activeOpacity={0.8}
                onPress={() => !isNext && handleDemoOption((it as typeof DEMOGRAPHICS[0]).id, 0)}
                disabled={loading || isNext}
              >
                <Text style={[styles.answerBtnText, { color: '#000' }]}>{(it as typeof DEMOGRAPHICS[0]).noLabel}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isNext && loading && <Text style={styles.loadingText}>Calculating result…</Text>}
        </View>
        {/* Frosted overlay on next card only */}
        {isNext && <View style={styles.nextCardOverlay} pointerEvents="none" />}
      </View>
    );
  };

  // ── Question / Demographic step ───────────────────────────────────────────
  const progress = (step + 1) / TOTAL_STEPS;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#F2F2F7' }]}>
      <StatusBar barStyle="dark-content" />

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Back + counter */}
      <View style={styles.stepRow}>
        <TouchableOpacity onPress={goPrev}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.stepCount}>{step + 1} / {TOTAL_STEPS}</Text>
      </View>

      {/* Cards stack — overflow hidden clips the peeking next card */}
      <View style={styles.cardsClip}>
        <Animated.View style={[styles.cardsStack, { transform: [{ translateY: slideY }] }]}>
          {/* Current card */}
          {renderCard(step, false)}
          {/* Next card — peeking below */}
          {renderCard(step + 1, true)}
        </Animated.View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 16, color: '#007AFF', fontWeight: '500' },

  // ── Intro ──
  introContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  introEmoji: { fontSize: 60, marginBottom: 16 },
  introTitle: { fontSize: 32, fontWeight: '700', color: '#000', letterSpacing: -0.5, marginBottom: 6 },
  introSubtitle: { fontSize: 14, color: '#6E6E73', marginBottom: 24, textAlign: 'center', paddingHorizontal: 16 },
  introBody: { fontSize: 15, color: '#3A3A3C', lineHeight: 24, textAlign: 'center', paddingHorizontal: 8, marginBottom: 32 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28, paddingHorizontal: 32 },
  infoItem: { alignItems: 'center', flex: 1, paddingHorizontal: 24 },
  infoValue: { fontSize: 22, fontWeight: '700', color: '#007AFF' },
  infoLabel: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  infoDivider: { width: 1, height: 36, backgroundColor: '#E5E5EA' },
  introNote: { fontSize: 13, color: '#8E8E93', textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },
  startBtn: { backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: Platform.OS === 'ios' ? 8 : 20 },
  startBtnText: { fontSize: 17, fontWeight: '600', color: '#FFF' },

  // ── Progress ──
  progressBar: { height: 3, backgroundColor: '#E5E5EA' },
  progressFill: { height: 3, backgroundColor: '#007AFF' },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  stepCount: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },

  // ── Question ──
  cardsClip: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cardsStack: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    lineHeight: 30,
    letterSpacing: -0.3,
    marginBottom: 24,
  },

  // ── Question card ──
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  nextCard: {
    opacity: 0.5,
    transform: [{ scale: 0.97 }],
  },
  nextCardOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(242, 242, 247, 0.35)',
  },
  optionsCol: { gap: 12, marginBottom: 24 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  optionBtnActive: { backgroundColor: '#EBF3FF', borderColor: '#007AFF' },
  optionBadge: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  optionBadgeActive: { backgroundColor: '#C8DFFF' },
  optionLetter: { fontSize: 15, fontWeight: '700', color: '#8E8E93' },
  optionLabel: { fontSize: 16, color: '#1C1C1E', flexShrink: 1, fontWeight: '500' },
  optionLabelActive: { color: '#007AFF', fontWeight: '600' },

  // ── Yes/No (demographics) ──
  answerRow: { gap: 14, marginBottom: 24 },
  answerBtn: {
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  answerYes: { backgroundColor: '#007AFF' },
  answerNo: { backgroundColor: '#F2F2F7' },
  answerBtnText: { fontSize: 18, fontWeight: '600', color: '#FFF' },

  loadingText: { marginTop: 24, textAlign: 'center', color: '#8E8E93', fontSize: 15 },
});
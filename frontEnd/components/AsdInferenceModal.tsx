import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, BackHandler, Platform,
} from 'react-native';
import { CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useAsdInference } from '@/lib/asd-inference-context';

const C = Colors.light;

/* Animated loading dots — same look as the old in-screen indicator */
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
        Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
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
          transform: [{ scale: d.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.3] }) }],
        }]} />
      ))}
    </View>
  );
}
const dot = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary },
});

export default function AsdInferenceModal() {
  const router = useRouter();
  const { state, status, resultParams, errorMsg, retry, clear } = useAsdInference();

  // Block hardware back during inference (Android)
  useEffect(() => {
    if (state !== 'running') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [state]);

  const viewResult = () => {
    if (!resultParams) return;
    clear();
    router.replace({ pathname: '/(tabs)/asd-result' as any, params: resultParams });
  };

  // Running state: non-blocking floating pill so user can navigate tabs.
  if (state === 'running') {
    return (
      <View pointerEvents="box-none" style={s.pillWrap}>
        <View style={s.pill}>
          <LoadingDots />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={s.pillTitle}>Analysing…</Text>
            <Text style={s.pillStatus} numberOfLines={1}>{status}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Done / error: full modal — these states need user action.
  return (
    <Modal
      visible={state !== 'idle'}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (state === 'done')  viewResult();
        if (state === 'error') clear();
      }}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          {state === 'done' && (
            <>
              <View style={[s.iconWrap, { backgroundColor: C.success }]}>
                <CheckCircle2 size={32} color="#FFF" strokeWidth={2.4} />
              </View>
              <Text style={s.title}>Analysis Complete</Text>
              <Text style={s.desc}>
                Your child's multi-signal ASD screening is ready. Tap below to view the full breakdown.
              </Text>
              <TouchableOpacity style={s.primaryBtn} onPress={viewResult} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>See Result →</Text>
              </TouchableOpacity>
            </>
          )}

          {state === 'error' && (
            <>
              <View style={[s.iconWrap, { backgroundColor: C.danger }]}>
                <AlertTriangle size={28} color="#FFF" strokeWidth={2.4} />
              </View>
              <Text style={s.title}>Something went wrong</Text>
              <Text style={s.desc}>
                {errorMsg || 'Could not connect to the server. Please check your connection and try again.'}
              </Text>
              <TouchableOpacity style={s.primaryBtn} onPress={retry} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} onPress={clear} activeOpacity={0.7}>
                <Text style={s.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  pillWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100, // sits just above the tab bar
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 240,
    maxWidth: 360,
    ...Shadows.lg,
  },
  pillTitle: { fontSize: 14, fontWeight: '700', color: C.label },
  pillStatus: { fontSize: 12, color: C.labelTertiary, marginTop: 2 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 49, 50, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: C.card,
    borderRadius: Radius.xxl,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...Shadows.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: C.label,
    letterSpacing: -0.3,
    marginTop: 18,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
    marginTop: 6,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: C.labelTertiary,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: C.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  secondaryBtn: { paddingVertical: 12, marginTop: 4 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: C.labelTertiary },
});

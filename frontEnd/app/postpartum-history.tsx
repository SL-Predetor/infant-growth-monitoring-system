import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';

const C = Colors.light;

export default function PostpartumHistory() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronLeft size={20} color={C.label} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Postpartum History</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>
          Here you can view past recovery submissions and insights.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.card,
  },
  title: { fontSize: 17, fontWeight: '700', color: C.label },
  content: { padding: Spacing.lg },
  body: { fontSize: 15, color: C.labelSecondary, lineHeight: 22 },
});

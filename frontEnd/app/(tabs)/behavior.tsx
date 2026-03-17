import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function BehaviorScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{
        light: Colors.light.primary,
        dark: Colors.dark.primary,
      }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title">Behavior & Development</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Screening & Eye Gaze Analysis
        </ThemedText>
        <ThemedText style={styles.content}>
          Screen for developmental milestones and autism spectrum indicators. (Component by Kularathne)
        </ThemedText>

        <TouchableOpacity
          onPress={() => router.push('/asd-home')}
          style={{
            backgroundColor: '#101150',
            borderRadius: 16,
            padding: 20,
            marginTop: 24,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
            🧠 ASD Screening
          </Text>
          <Text style={{ color: '#AEAEB2', fontSize: 13, marginTop: 4 }}>
            Q-CHAT-10 · AI Video Analysis
          </Text>
        </TouchableOpacity>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
  },
  content: {
    marginTop: 12,
  },
  headerImage: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});

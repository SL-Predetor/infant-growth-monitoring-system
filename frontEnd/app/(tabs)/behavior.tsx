import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function BehaviorScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  
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

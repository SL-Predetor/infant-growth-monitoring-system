import React from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function GrowthScreen() {
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
        <ThemedText type="title">Growth Forecaster</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Predict Height & Weight
        </ThemedText>
        <ThemedText style={styles.content}>
          Track and forecast your baby's growth patterns. (Component by Premachandra)
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

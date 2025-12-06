import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MenuGrid } from '@/components/menu-grid';

export default function HomeScreen() {
  const router = useRouter();

  const rowOneItems = [
    {
      id: 'cry-translator',
      title: 'Cry Translator',
      subtitle: 'Identify Hunger, Pain, or Fuss.',
      iconName: 'speaker.wave.2',
      onPress: () => router.push('/cry-translator'),
      accentColor: '#FF6B6B',
    },
    {
      id: 'growth-forecaster',
      title: 'Growth Forecaster',
      subtitle: 'Predict Height & Weight.',
      iconName: 'chart.line.uptrend.xyaxis',
      badge: 'Next measure: Today',
      onPress: () => router.push('/growth-forecaster'),
      accentColor: '#4ECDC4',
    },
  ];

  const rowTwoItems = [
    {
      id: 'behavior-development',
      title: 'Behavior & Development',
      subtitle: 'Screening & Eye Gaze Analysis.',
      iconName: 'puzzlepiece',
      onPress: () => router.push('/behavior-development'),
      accentColor: '#FFE66D',
    },
    {
      id: 'moms-recovery',
      title: "Mom's Recovery",
      subtitle: 'Postpartum Pain & Nutrition.',
      iconName: 'heart',
      onPress: () => router.push('/moms-recovery'),
      accentColor: '#FF85B3',
    },
  ];

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      <MenuGrid rowOneItems={rowOneItems} rowTwoItems={rowTwoItems} />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});

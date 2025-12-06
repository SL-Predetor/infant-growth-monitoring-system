import { StyleSheet } from 'react-native';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Image } from 'expo-image';

export default function MomsRecoveryScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title">Mom's Recovery</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Postpartum Pain & Nutrition.
        </ThemedText>
        <ThemedText style={styles.content}>
          Monitor maternal health and postpartum recovery. (Component by Hennayake)
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

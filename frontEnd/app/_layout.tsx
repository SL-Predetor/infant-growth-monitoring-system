import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: 'disclaimer', // Show disclaimer first
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // Fonts loading - using try-catch to handle missing fonts gracefully
  let fontsLoaded = true;
  try {
    const [loaded] = useFonts({
      // SpaceMono font loading commented out - file not found in assets/fonts/
      // To use: Add SpaceMono-Regular.ttf to assets/fonts/ directory
      // SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });
    fontsLoaded = loaded;
  } catch (e) {
    console.warn('Font loading error:', e);
    fontsLoaded = true; // Continue anyway
  }

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="mom-prediction-result"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="postpartum-dashboard"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="postpartum-history"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

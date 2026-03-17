import 'react-native-get-random-values';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to sign-in if no session
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      // Allow add-infant screen for new signups
      const onAddInfant = segments[1] === 'add-infant';
      if (!onAddInfant) {
        router.replace('/(tabs)');
      }
    }
  }, [session, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="mom-prediction-result" options={{ headerShown: false }} />
        <Stack.Screen name="asd-home" options={{ headerShown: false }} />
        <Stack.Screen name="asd-qchat" options={{ headerShown: false }} />
        <Stack.Screen name="asd-research" options={{ headerShown: false }} />
        <Stack.Screen name="asd-qchat-result" options={{ headerShown: false }} />
        <Stack.Screen name="asd-result" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

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
      <RootLayoutNav />
    </AuthProvider>
  );
}

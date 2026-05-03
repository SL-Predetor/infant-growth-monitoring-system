import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Pressable, View, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Mic, BookOpen, LayoutDashboard, Brain, Heart } from 'lucide-react-native';
import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/* ── Standard spring tab button ── */
function AnimatedTabButton({
  children, onPress, onLongPress, style,
  accessibilityState, accessibilityLabel,
}: any) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.84, { damping: 15, stiffness: 400 });
        opacity.value = withTiming(0.55, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
        opacity.value = withTiming(1, { duration: 150 });
      }}
      style={[style, tabS.btn]}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[anim, tabS.inner]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ── Floating center Dashboard button ── */
function CenterTabButton(props: any) {
  const C = Colors.light;
  const focused = props.accessibilityState?.selected;
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        props.onPress?.();
      }}
      onPressIn={() => { scale.value = withSpring(0.88, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 250 }); }}
      style={tabS.centerWrap}
      accessibilityState={props.accessibilityState}
      accessibilityLabel="Home"
    >
      <Animated.View style={[
        anim, tabS.centerBtn,
        { backgroundColor: focused ? C.primary : C.card, borderColor: focused ? 'transparent' : C.border },
      ]}>
        <LayoutDashboard size={26} color={focused ? '#FFFFFF' : C.labelTertiary} strokeWidth={focused ? 2 : 1.8} />
      </Animated.View>
      <Text style={[tabS.centerLabel, { color: focused ? C.primary : C.labelTertiary }]}>Home</Text>
    </Pressable>
  );
}


const tabS = StyleSheet.create({
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -20 },
  centerBtn: {
    width: 56, height: 56, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 10,
  },
  centerLabel: { fontSize: 10, fontWeight: '600', marginTop: 3, letterSpacing: 0.1 },
  tabLabel: { fontSize: 10, fontWeight: '600', marginTop: 3, letterSpacing: 0.1 },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.labelTertiary,
        tabBarStyle: {
          backgroundColor: C.tabBar,
          borderTopColor: C.tabBarBorder,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 92 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04, shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1, marginTop: 2 },
        headerShown: false,
        tabBarButton: AnimatedTabButton,
        // Reset every tab screen when blurred — fresh scroll/state on return.
        unmountOnBlur: true,
      }}
    >
      {/* 1 — Cry Translator */}
      <Tabs.Screen
        name="smart-cry-analysis"
        options={{
          title: 'Cry',
          href: '/(tabs)/smart-cry-analysis',
          tabBarIcon: ({ color, focused }) => (
            <Mic size={focused ? 23 : 21} color={color} strokeWidth={focused ? 2.2 : 1.8} />
          ),
        }}
      />
      {/* Hidden — old cry-translator route kept for backwards compat */}
      <Tabs.Screen name="cry-translator" options={{ href: null, headerShown: false }} />

      {/* 2 — Daily Log */}
      <Tabs.Screen
        name="daily-log"
        options={{
          title: 'Log',
          href: '/(tabs)/daily-log',
          tabBarIcon: ({ color, focused }) => (
            <BookOpen size={focused ? 23 : 21} color={color} strokeWidth={focused ? 2.2 : 1.8} />
          ),
        }}
      />

      {/* 3 — DASHBOARD (center) */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarButton: (props) => <CenterTabButton {...props} />,
        }}
      />

      {/* 4 — ASD Screening */}
      <Tabs.Screen
        name="asd-screen"
        options={{
          title: 'ASD',
          href: '/(tabs)/asd-screen',
          tabBarIcon: ({ color, focused }) => (
            <Brain size={focused ? 23 : 21} color={color} strokeWidth={focused ? 2.2 : 1.8} />
          ),
        }}
        listeners={({ navigation }) => ({
          // Always send the user to asd-screen when the ASD tab is tapped,
          // even if they were last on asd-research / asd-qchat / a result page.
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('asd-screen' as never);
          },
        })}
      />

      {/* 5 — Mom's Recovery */}
      <Tabs.Screen
        name="wellness"
        options={{
          title: 'Mom',
          href: '/(tabs)/wellness',
          tabBarIcon: ({ color, focused }) => (
            <Heart size={focused ? 23 : 21} color={color} strokeWidth={focused ? 2.2 : 1.8} />
          ),
        }}
      />

      {/* Profile — accessible only from home screen top-right */}
      <Tabs.Screen name="Profile" options={{ href: null, headerShown: false }} />

      {/* Hidden — ASD flow */}
      <Tabs.Screen name="asd-qchat"        options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="asd-qchat-result" options={{ href: null, headerShown: false }} />
      {/* asd-research is the in-flight video-screening flow — keep mounted
          so the video / answers aren't lost while inference is running. */}
      <Tabs.Screen name="asd-research"     options={{ href: null, headerShown: false, unmountOnBlur: false }} />
      <Tabs.Screen name="asd-result"       options={{ href: null, headerShown: false }} />

      {/* Hidden */}
      <Tabs.Screen name="growth" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="behavior" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="recovery" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="edit-profile" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="update-measurements" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="growth-history" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="growth-insights" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="growth-alert" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="explore" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

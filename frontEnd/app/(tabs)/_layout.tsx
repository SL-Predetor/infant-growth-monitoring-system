import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
          height: Platform.OS === 'ios' ? 83 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.1,
          fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 26 : 24} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="growth"
        options={{
          title: 'Growth',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 26 : 24} name="chart.line.uptrend.xyaxis" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="behavior"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 26 : 24} name="brain.head.profile" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 26 : 24} name="person.fill" color={color} />
          ),
        }}
      />

      {/* HIDDEN TABS */}
      <Tabs.Screen
        name="cry-translator"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="recovery"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="daily-log"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="update-measurements"
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

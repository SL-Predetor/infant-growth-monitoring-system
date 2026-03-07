import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#C7C7CC',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 }, // shorter shadow
          shadowOpacity: 0.08,
          shadowRadius: 12, // softer, less extended
          elevation: 8,
           height: Platform.OS === 'ios' ? 84 : 68,
           paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          paddingTop: 6,
          ...(Platform.OS === 'ios' ? { position: 'absolute' as const } : {}),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'BabySense AI',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={focused ? 32 : 28}
              name="house.fill"
              color={color}
              style={{
                filter: focused ? 'drop-shadow(0px 2px 4px rgba(0,0,0,0.12))' : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.08))',
              }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="cry-translator"
        options={{
          title: 'Cry Translator',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={focused ? 32 : 28}
              name="waveform"
              color={color}
              style={{
                filter: focused ? 'drop-shadow(0px 2px 4px rgba(0,0,0,0.12))' : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.08))',
              }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="growth"
        options={{
          title: 'Growth',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={focused ? 32 : 28}
              name="chart.line.uptrend.xyaxis"
              color={color}
              style={{
                filter: focused ? 'drop-shadow(0px 2px 4px rgba(0,0,0,0.12))' : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.08))',
              }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="recovery"
        options={{
          title: 'Recovery',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={focused ? 32 : 28}
              name="heart.fill"
              color={color}
              style={{
                filter: focused ? 'drop-shadow(0px 2px 4px rgba(0,0,0,0.12))' : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.08))',
              }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="behavior"
        options={{
          title: 'Behavior',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={focused ? 32 : 28}
              name="brain.head.profile"
              color={color}
              style={{
                filter: focused ? 'drop-shadow(0px 2px 4px rgba(0,0,0,0.12))' : 'drop-shadow(0px 1px 2px rgba(0,0,0,0.08))',
              }}
            />
          ),
        }}
      />

      {/* Hidden from tab bar – accessed via profile avatar */}
      <Tabs.Screen
        name="Profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
  );
}


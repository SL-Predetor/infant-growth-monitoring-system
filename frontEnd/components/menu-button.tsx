import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from './ui/icon-symbol';

interface MenuButtonProps {
  title: string;
  subtitle: string;
  iconName: string;
  badge?: string;
  onPress: () => void;
  isHighlighted?: boolean;
  accentColor?: string;
}

export function MenuButton({
  title,
  subtitle,
  iconName,
  badge,
  onPress,
  isHighlighted = false,
  accentColor = '#0a7ea4',
}: MenuButtonProps) {
  const textColor = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');
  const isDark = textColor === '#ECEDEE';
  const bgLight = isDark ? '#1a1a1a' : '#ffffff';
  const bgDark = isDark ? '#2d2d2d' : '#f8f9fa';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: bgLight,
          borderColor: accentColor + '30',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Accent bar at top */}
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor: accentColor,
          },
        ]}
      />

      {/* Icon with background */}
      <View
        style={[
          styles.iconBg,
          {
            backgroundColor: accentColor + '15',
          },
        ]}
      >
        <IconSymbol
          name={iconName as any}
          size={44}
          color={accentColor}
        />
      </View>

      {/* Title */}
      <ThemedText
        type="defaultSemiBold"
        style={[styles.title, { color: textColor }]}
      >
        {title}
      </ThemedText>

      {/* Subtitle */}
      <ThemedText
        type="default"
        style={[styles.subtitle, { color: textColor + '80' }]}
      >
        {subtitle}
      </ThemedText>

      {/* Badge */}
      {badge && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: accentColor,
            },
          ]}
        >
          <ThemedText
            type="default"
            style={[styles.badgeText, { color: '#fff', fontSize: 9 }]}
          >
            {badge}
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 10,
    padding: 0,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: 180,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  accentBar: {
    width: '100%',
    height: 4,
  },
  iconBg: {
    width: 70,
    height: 70,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

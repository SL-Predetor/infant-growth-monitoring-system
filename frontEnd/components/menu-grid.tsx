import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedView } from './themed-view';
import { ThemedText } from './themed-text';
import { MenuButton } from './menu-button';
import { useThemeColor } from '@/hooks/use-theme-color';

interface MenuItemConfig {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  badge?: string;
  onPress: () => void;
  isHighlighted?: boolean;
  accentColor?: string;
}

interface MenuGridProps {
  rowOneItems: MenuItemConfig[];
  rowTwoItems: MenuItemConfig[];
  title?: string;
}

// Define accent colors for each button
const accentColors = {
  'cry-translator': '#FF6B6B',
  'growth-forecaster': '#4ECDC4',
  'behavior-development': '#FFE66D',
  'moms-recovery': '#FF85B3',
};

export function MenuGrid({
  rowOneItems,
  rowTwoItems,
  title = 'The Daily Essentials',
}: MenuGridProps) {
  const textColor = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');
  const subtleColor = useThemeColor({ light: '#666', dark: '#999' }, 'text');

  return (
    <ThemedView style={styles.container}>
      {/* Row One Title */}
      {title && (
        <View style={styles.titleSection}>
          <ThemedText type="title" style={[styles.rowTitle, { color: textColor }]}>
            {title}
          </ThemedText>
          <View
            style={[
              styles.titleUnderline,
              { backgroundColor: '#FF6B6B' },
            ]}
          />
        </View>
      )}

      {/* Row One */}
      <View style={styles.row}>
        {rowOneItems.map((item) => (
          <MenuButton
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            iconName={item.iconName}
            badge={item.badge}
            onPress={item.onPress}
            isHighlighted={item.isHighlighted}
            accentColor={accentColors[item.id as keyof typeof accentColors] || '#0a7ea4'}
          />
        ))}
      </View>

      {/* Row Two Title */}
      <View style={styles.titleSection}>
        <ThemedText type="title" style={[styles.rowTitle, { color: textColor }]}>
          The Check-Ups
        </ThemedText>
        <View
          style={[
            styles.titleUnderline,
            { backgroundColor: '#FFE66D' },
          ]}
        />
      </View>

      {/* Row Two */}
      <View style={styles.row}>
        {rowTwoItems.map((item) => (
          <MenuButton
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            iconName={item.iconName}
            badge={item.badge}
            onPress={item.onPress}
            isHighlighted={item.isHighlighted}
            accentColor={accentColors[item.id as keyof typeof accentColors] || '#0a7ea4'}
          />
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  titleSection: {
    marginLeft: 16,
    marginRight: 16,
    marginBottom: 16,
    marginTop: 16,
  },
  rowTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  titleUnderline: {
    height: 3,
    width: 40,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
});

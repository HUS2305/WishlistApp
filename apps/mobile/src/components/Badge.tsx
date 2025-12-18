import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface BadgeProps {
  count: number;
  maxCount?: number;
  style?: any;
}

export function Badge({ count, maxCount = 99, style }: BadgeProps) {
  const { theme } = useTheme();
  
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.primary,
        },
        style,
      ]}
    >
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});


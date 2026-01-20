import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Text } from './Text';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { WISHLIST_COVERS_ARRAY, type WishlistCoverId } from '@/constants/wishlistCovers';
import { BottomSheet } from './BottomSheet';

interface WishlistCoverPickerProps {
  selectedCoverId: WishlistCoverId | string | null | undefined;
  onSelect: (coverId: WishlistCoverId | null) => void;
  visible: boolean;
  onClose: () => void;
}

export function WishlistCoverPicker({ selectedCoverId, onSelect, visible, onClose }: WishlistCoverPickerProps) {
  const { theme } = useTheme();
  const [localSelection, setLocalSelection] = useState<WishlistCoverId | null>(
    (selectedCoverId as WishlistCoverId) || null
  );

  // Sync local selection when prop changes (e.g., when opening the picker)
  useEffect(() => {
    if (visible) {
      setLocalSelection((selectedCoverId as WishlistCoverId) || null);
    }
  }, [visible, selectedCoverId]);

  const handleSelect = (coverId: WishlistCoverId | null) => {
    setLocalSelection(coverId);
  };

  const handleConfirm = () => {
    onSelect(localSelection);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['80%']}
      index={0}
      stackBehavior="push"
      scrollable={true}
    >
      {/* Header - centered title with Choose button on right */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Choose Cover
        </Text>
        <TouchableOpacity
          onPress={handleConfirm}
          activeOpacity={0.6}
          style={styles.headerButton}
        >
          <Text style={[styles.headerButtonText, { color: theme.colors.primary }]}>
            Choose
          </Text>
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView
        style={styles.content}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={true}
      >
        {/* None option */}
        <TouchableOpacity
          style={[
            styles.coverOption,
            localSelection === null && { borderColor: theme.colors.primary, borderWidth: 3 },
          ]}
          onPress={() => handleSelect(null)}
          activeOpacity={0.7}
        >
          <View style={[styles.noneImageWrapper, {
            backgroundColor: theme.isDark ? '#2E2E2E' : '#E5E5E5',
          }]}>
            <Feather name="image" size={32} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Cover image options */}
        {WISHLIST_COVERS_ARRAY.map((cover) => (
          <TouchableOpacity
            key={cover.id}
            style={[
              styles.coverOption,
              localSelection === cover.id && { borderColor: theme.colors.primary, borderWidth: 3 },
            ]}
            onPress={() => handleSelect(cover.id)}
            activeOpacity={0.7}
          >
            <Image
              source={cover.image}
              style={styles.coverImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerButton: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 16,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingBottom: 40,
    gap: 12,
    justifyContent: 'flex-start',
  },
  coverOption: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  noneImageWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});

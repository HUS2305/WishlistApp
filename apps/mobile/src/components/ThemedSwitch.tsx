import React, { useEffect, useRef } from 'react';
import { Switch, SwitchProps, Platform, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemedSwitchProps extends SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function ThemedSwitch({ value, onValueChange, ...props }: ThemedSwitchProps) {
  const { theme } = useTheme();
  const viewRef = useRef<View>(null);

  // On web: directly manipulate the DOM to change thumb color ONLY when checked
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const applyThumbColor = () => {
        // Find all checkboxes and set thumb color based on checked state
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
          const htmlCheckbox = checkbox as HTMLInputElement;
          
          // Only apply theme color if checkbox is CHECKED
          if (htmlCheckbox.checked) {
            htmlCheckbox.style.setProperty('accent-color', theme.colors.primary, 'important');
            
            // Find the thumb (smallest rounded div, not the track)
            const parent = htmlCheckbox.parentElement;
            if (parent) {
              const divElements = Array.from(parent.querySelectorAll('div'));
              // Sort by size to find the smallest (thumb, not track)
              const sortedDivs = divElements.sort((a, b) => {
                const aRect = a.getBoundingClientRect();
                const bRect = b.getBoundingClientRect();
                return (aRect.width * aRect.height) - (bRect.width * bRect.height);
              });
              // Only style the smallest rounded div (the thumb)
              if (sortedDivs.length > 0) {
                const thumb = sortedDivs[0] as HTMLElement;
                const computedStyle = window.getComputedStyle(thumb);
                if (computedStyle.borderRadius && computedStyle.borderRadius !== '0px') {
                  thumb.style.setProperty('background-color', theme.colors.primary, 'important');
                }
              }
            }
          } else {
            // When unchecked, use gray
            htmlCheckbox.style.setProperty('accent-color', theme.colors.textSecondary, 'important');
            
            // Find the thumb (smallest rounded div, not the track)
            const parent = htmlCheckbox.parentElement;
            if (parent) {
              const divElements = Array.from(parent.querySelectorAll('div'));
              // Sort by size to find the smallest (thumb, not track)
              const sortedDivs = divElements.sort((a, b) => {
                const aRect = a.getBoundingClientRect();
                const bRect = b.getBoundingClientRect();
                return (aRect.width * aRect.height) - (bRect.width * bRect.height);
              });
              // Only style the smallest rounded div (the thumb)
              if (sortedDivs.length > 0) {
                const thumb = sortedDivs[0] as HTMLElement;
                const computedStyle = window.getComputedStyle(thumb);
                if (computedStyle.borderRadius && computedStyle.borderRadius !== '0px') {
                  thumb.style.setProperty('background-color', theme.colors.textSecondary, 'important');
                }
              }
            }
          }
        });
      };

      // Apply immediately
      applyThumbColor();
      
      // Apply after a short delay to catch dynamically rendered switches
      const timeout = setTimeout(applyThumbColor, 100);
      
      // Use MutationObserver to catch changes
      const observer = new MutationObserver(applyThumbColor);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['checked'] });

      return () => {
        clearTimeout(timeout);
        observer.disconnect();
      };
    }
  }, [theme.colors.primary, theme.colors.textSecondary, value]);

  return (
    <View ref={viewRef}>
      <Switch
        value={value}
        onValueChange={onValueChange}
      trackColor={{
        false: theme.colors.textSecondary + '40',
        true: theme.colors.primary + '30', // Subtle background like Private button
      }}
        thumbColor={value ? theme.colors.primary : theme.colors.textSecondary}
        ios_backgroundColor={theme.colors.textSecondary + '40'}
        {...props}
      />
    </View>
  );
}


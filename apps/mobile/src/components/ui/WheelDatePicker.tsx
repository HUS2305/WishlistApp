import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Text } from "../Text";
const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

interface WheelDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
}

export function WheelDatePicker({
  date,
  onDateChange,
  maximumDate = new Date(),
  minimumDate = new Date(1900, 0, 1),
}: WheelDatePickerProps) {
  const [selectedMonth, setSelectedMonth] = useState(date.getMonth());
  const [selectedDay, setSelectedDay] = useState(date.getDate());
  const [selectedYear, setSelectedYear] = useState(date.getFullYear());

  const monthScrollRef = useRef<ScrollView | null>(null);
  const dayScrollRef = useRef<ScrollView | null>(null);
  const yearScrollRef = useRef<ScrollView | null>(null);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years: number[] = [];
  for (let year = minimumDate.getFullYear(); year <= maximumDate.getFullYear(); year++) {
    years.push(year);
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const days: number[] = [];
  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  useEffect(() => {
    // Update day if it's invalid for the selected month/year
    const maxDay = getDaysInMonth(selectedMonth, selectedYear);
    if (selectedDay > maxDay) {
      setSelectedDay(maxDay);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    if (newDate <= maximumDate && newDate >= minimumDate) {
      onDateChange(newDate);
    }
  }, [selectedMonth, selectedDay, selectedYear]);

  const scrollToIndex = (scrollView: ScrollView | null, index: number) => {
    if (scrollView) {
      scrollView.scrollTo({
        y: index * ITEM_HEIGHT,
        animated: true,
      });
    }
  };

  useEffect(() => {
    // Scroll to selected values on mount
    setTimeout(() => {
      scrollToIndex(monthScrollRef.current, selectedMonth);
      scrollToIndex(dayScrollRef.current, selectedDay - 1);
      scrollToIndex(yearScrollRef.current, years.indexOf(selectedYear));
    }, 100);
  }, []);

  const renderItems = (
    items: (string | number)[],
    selectedIndex: number,
    onSelect: (index: number) => void,
    scrollRef: React.RefObject<ScrollView | null>
  ) => {
    return (
      <ScrollView
        ref={scrollRef}
        style={styles.wheel}
        contentContainerStyle={styles.wheelContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
          onSelect(clampedIndex);
          scrollToIndex(scrollRef.current, clampedIndex);
        }}
      >
        {/* Spacer items */}
        {Array.from({ length: VISIBLE_ITEMS / 2 }).map((_, i) => (
          <View key={`spacer-top-${i}`} style={styles.wheelItem} />
        ))}

        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.wheelItem,
              index === selectedIndex && styles.wheelItemSelected,
            ]}
            onPress={() => {
              onSelect(index);
              scrollToIndex(scrollRef.current, index);
            }}
          >
            <Text
              style={[
                styles.wheelItemText,
                index === selectedIndex && styles.wheelItemTextSelected,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Spacer items */}
        {Array.from({ length: VISIBLE_ITEMS / 2 }).map((_, i) => (
          <View key={`spacer-bottom-${i}`} style={styles.wheelItem} />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.wheelsContainer}>
        {/* Month Wheel */}
        <View style={styles.wheelColumn}>
          {renderItems(
            months,
            selectedMonth,
            (index) => setSelectedMonth(index),
            monthScrollRef
          )}
        </View>

        {/* Day Wheel */}
        <View style={styles.wheelColumn}>
          {renderItems(
            days,
            selectedDay - 1,
            (index) => setSelectedDay(index + 1),
            dayScrollRef
          )}
        </View>

        {/* Year Wheel */}
        <View style={styles.wheelColumn}>
          {renderItems(
            years,
            years.indexOf(selectedYear),
            (index) => setSelectedYear(years[index]),
            yearScrollRef
          )}
        </View>
      </View>
      <View style={styles.selectionIndicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: "relative",
  },
  wheelsContainer: {
    flexDirection: "row",
    height: "100%",
  },
  wheelColumn: {
    flex: 1,
    height: "100%",
  },
  wheel: {
    flex: 1,
  },
  wheelContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  wheelItemSelected: {
    // Selected item styling
  },
  wheelItemText: {
    fontSize: 18,
    color: "#999",
  },
  wheelItemTextSelected: {
    fontSize: 20,
    color: "#1D1D1F",
  },
  selectionIndicator: {
    position: "absolute",
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "rgba(0, 122, 255, 0.05)",
    pointerEvents: "none",
  },
});




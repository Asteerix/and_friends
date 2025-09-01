import React from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet, Platform } from 'react-native';
import UnderlineDecoration from './UnderlineDecoration.svg';

type Props = {
  categories: string[];
  activeIndex: number;
  onPress: (index: number) => void;
};

export default function CategoryTabs({ categories = [], activeIndex, onPress }: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {categories.map((cat, idx) => (
          <Pressable key={cat + idx} onPress={() => onPress(idx)} style={styles.tab}>
            <Text style={[styles.label, idx === activeIndex && styles.labelActive]}>{cat}</Text>
            {idx === activeIndex && (
              <UnderlineDecoration width={56} height={4} style={styles.underline} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 48,
    marginBottom: 16,
  },
  scroll: {
    paddingLeft: 0,
    alignItems: 'center',
  },
  tab: {
    marginRight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    position: 'relative',
  },
  label: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '400',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
  labelActive: {
    color: '#000',
    fontWeight: '600',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import LongUnderlineDecoration from '@/features/home/components/LongUnderlineDecoration.svg';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}
export default function Tabs({ activeTab, onTabChange }: TabsProps) {
  const tabs = [
    { id: 'all', label: 'Recent activity' },
    { id: 'unread', label: 'Unread' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity key={tab.id} style={styles.tab} onPress={() => onTabChange(tab.id)}>
          <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
            {tab.label}
          </Text>
          {activeTab === tab.id && (
            <LongUnderlineDecoration width={120} height={4} style={styles.underline} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 14,
    position: 'relative',
  },
  activeTab: {
    // borderBottomWidth: 2,
    // borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 18,
    color: '#999',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -60 }], // 120/2 = 60, pour centrer le SVG sous le label
  },
});

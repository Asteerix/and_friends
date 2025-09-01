import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { t } from '@/shared/locales';

export default function Header() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('notifications_title')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
});

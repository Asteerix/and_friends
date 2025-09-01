import React from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@/assets/svg/search.svg';

export default function SearchBar() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <SearchIcon width={20} height={20} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={t('home.searchPlaceholder', 'Search for an event or friend')}
        placeholderTextColor="#8E8E93"
        underlineColorAndroid="transparent"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: '#000',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
    paddingVertical: 0,
  },
});

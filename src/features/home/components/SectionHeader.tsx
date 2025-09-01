import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import UnderlineDecoration from './UnderlineDecoration.svg';
import LongUnderlineDecoration from './LongUnderlineDecoration.svg';

const { width: screenWidth } = Dimensions.get('window');

type Props = {
  title: string;
  onViewAll?: () => void;
};

const LONG_UNDERLINE_TITLES = [
  'All Events',
  'Based on Your Interests',
  'Your Friends Are Going To',
  'Events You Are Going To',
];

export default function SectionHeader({ title, onViewAll }: Props) {
  const { t } = useTranslation();
  const useLongUnderline = LONG_UNDERLINE_TITLES.includes(title) || title.length > 20;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={styles.viewAll}>{t('common.viewAll')}</Text>
          </TouchableOpacity>
        )}
      </View>
      {useLongUnderline ? (
        <LongUnderlineDecoration
          width={screenWidth - 40}
          height={8}
          style={styles.longDivider}
          preserveAspectRatio="none"
        />
      ) : (
        <UnderlineDecoration width={56} height={4} style={styles.divider} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 32,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
      default: 'System',
    }),
  },
  viewAll: {
    fontSize: 16,
    color: '#666',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
  divider: {
    marginTop: 8,
  },
  longDivider: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
});

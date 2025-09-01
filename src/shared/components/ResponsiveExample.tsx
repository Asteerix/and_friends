import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { rw, rh, rf, wp, spacing, borderRadius, dimensions } from '@/shared/utils/responsive';

/**
 * Exemple d'utilisation des utilitaires de responsivité
 */
export const ResponsiveExample: React.FC = () => {
  const { width, height, isTablet, isLandscape } = useResponsive();

  return (
    <View style={styles.container}>
      {/* Utilisation des pourcentages */}
      <View style={[styles.card, { width: wp(90) }]}>
        <Text style={styles.title}>Responsive Card</Text>
        <Text style={styles.text}>
          Device: {isTablet ? 'Tablet' : 'Phone'} | {isLandscape ? 'Landscape' : 'Portrait'}
        </Text>
        <Text style={styles.text}>
          Screen: {width} x {height}
        </Text>
      </View>

      {/* Utilisation des dimensions responsives */}
      <View style={styles.avatarContainer}>
        <View
          style={[styles.avatar, { width: dimensions.avatarLg, height: dimensions.avatarLg }]}
        />
        <View
          style={[styles.avatar, { width: dimensions.avatarMd, height: dimensions.avatarMd }]}
        />
        <View
          style={[styles.avatar, { width: dimensions.avatarSm, height: dimensions.avatarSm }]}
        />
      </View>

      {/* Layout adaptatif */}
      <View style={[styles.grid, isTablet && styles.gridTablet]}>
        <View style={[styles.gridItem, isTablet && styles.gridItemTablet]} />
        <View style={[styles.gridItem, isTablet && styles.gridItemTablet]} />
        <View style={[styles.gridItem, isTablet && styles.gridItemTablet]} />
        <View style={[styles.gridItem, isTablet && styles.gridItemTablet]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#f0f0f0',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: rf(24),
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: rf(16),
    marginBottom: spacing.xs,
  },
  avatarContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatar: {
    backgroundColor: '#007AFF',
    borderRadius: borderRadius.full,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
  },
  gridTablet: {
    maxWidth: rw(600),
  },
  gridItem: {
    width: `${(100 - spacing.sm) / 2}%`,
    height: rh(150),
    backgroundColor: '#e0e0e0',
    borderRadius: borderRadius.md,
  },
  gridItemTablet: {
    width: `${(100 - spacing.sm * 3) / 4}%`,
    height: rh(200),
  },
});

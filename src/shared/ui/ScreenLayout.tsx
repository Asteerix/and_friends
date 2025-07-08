import { useRouter } from 'expo-router';
import React, { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { rs, rf } from '@/shared/utils/responsive';


export interface ScreenLayoutProps {
  title?: string;
  subtitle?: string;
  progress: number; // 0 to 1
  onContinue?: () => void;
  continueDisabled?: boolean;
  children: ReactNode;
  showContinueButton?: boolean;
  showBackButton?: boolean;
  showAltLink?: boolean;
  altLinkText?: string;
  onAltLinkPress?: () => void;
  continueButtonText?: string;
  isLoading?: boolean;
  onBackPress?: () => void; // Custom back handler
}
const COLORS = {
  // TODO: Centraliser les couleurs
  white: '#FFFFFF',
  black: '#000000',
  grey0: '#E5E5E5',
  grey3: '#555555',
  blue: '#016fff',
};

const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  title,
  subtitle,
  progress,
  onContinue,
  continueDisabled = false,
  children,
  showContinueButton = true,
  showBackButton = true,
  showAltLink = false,
  altLinkText = 'Alternative Action',
  onAltLinkPress,
  continueButtonText = 'Continue',
  isLoading = false,
  onBackPress,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const canGoBack = router.canGoBack();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          paddingTop: Platform.OS === 'android' ? insets.top + rs(10) : insets.top,
        },
      ]}
      edges={['left', 'right', 'bottom']}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerRow}>
        {showBackButton ? (
          <Pressable
            hitSlop={rs(16)}
            onPress={() => {
              if (onBackPress) {
                onBackPress();
              } else if (canGoBack) {
                router.back();
              }
            }}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? 0.5 : 1 }
            ]}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Title & Subtitle */}
      {title && <Text style={styles.titleLine1}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={styles.contentContainer}>{children}</View>

      {/* Continue Button */}
      {showContinueButton && onContinue && (
        <Pressable
          disabled={continueDisabled || isLoading}
          onPress={onContinue}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              opacity: pressed ? 0.75 : continueDisabled || isLoading ? 0.3 : 1,
            },
            // Ajustement pour la safe area et le lien alternatif potentiel
            {
              bottom:
                insets.bottom > 0
                  ? insets.bottom + (showAltLink ? rs(40) : 0)
                  : rs(24) + (showAltLink ? rs(40) : 0),
            },
          ]}
        >
          <Text style={styles.buttonText}>{continueButtonText}</Text>
        </Pressable>
      )}

      {/* Alternative Link */}
      {showAltLink && onAltLinkPress && (
        <Pressable
          onPress={onAltLinkPress}
          style={({ pressed }) => [
            styles.altLinkButton,
            { opacity: pressed ? 0.6 : 1 },
            // Positionner en dessous du bouton Continue, ou en bas si pas de bouton Continue
            {
              bottom:
                insets.bottom > 0
                  ? insets.bottom
                  : Platform.OS === 'ios'
                    ? rs(12)
                    : rs(20),
            },
          ]}
        >
          <Text style={styles.altLinkText}>{altLinkText}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: rs(24),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(12),
    marginTop: Platform.OS === 'ios' ? 0 : rs(10), // Ajustement pour Android StatusBar
  },
  backButton: {
    width: rs(44),
    height: rs(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: rf(28),
    color: COLORS.blue,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    width: '70%',
    height: rs(2),
    backgroundColor: COLORS.grey0,
    overflow: 'hidden',
    borderRadius: rs(1),
  },
  progressFill: {
    height: rs(2),
    backgroundColor: COLORS.blue,
    borderRadius: rs(1),
  },
  titleLine1: {
    marginTop: rs(32),
    fontSize: rf(34),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: COLORS.black,
    textAlign: 'center',
    lineHeight: rf(38),
    letterSpacing: rs(0.34),
  },
  subtitle: {
    marginTop: rs(20),
    fontSize: rf(16),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: COLORS.grey3,
    textAlign: 'center',
    lineHeight: rf(24),
    marginBottom: rs(20),
  },
  contentContainer: {
    flex: 1,
  },
  primaryButton: {
    position: 'absolute',
    left: rs(24),
    right: rs(24),
    height: rs(60),
    backgroundColor: '#016fff',
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: rf(20),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: COLORS.white,
  },
  altLinkButton: {
    position: 'absolute',
    left: rs(24),
    right: rs(24),
    alignItems: 'center', // Centrer le texte du lien
    // marginBottom est géré par `bottom` pour le positionnement absolu
  },
  altLinkText: {
    fontSize: rf(15),
    fontWeight: '500',
    color: COLORS.grey3,
    textAlign: 'center',
  },
});

export default ScreenLayout;

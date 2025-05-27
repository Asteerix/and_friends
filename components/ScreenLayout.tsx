import { StackNavigationProp } from "@react-navigation/stack";
import React, { ReactNode } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// TODO: Définir un type plus générique pour la navigation ou le passer en prop
type NavProp = StackNavigationProp<any>; // Temporaire

interface ScreenLayoutProps {
  navigation: NavProp;
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
}

const { width: W } = Dimensions.get("window");
const COLORS = {
  // TODO: Centraliser les couleurs
  white: "#FFFFFF",
  black: "#000000",
  grey0: "#E5E5E5",
  grey3: "#555555",
};

const ScreenLayout: React.FC<ScreenLayoutProps> = ({
  navigation,
  title,
  subtitle,
  progress,
  onContinue,
  continueDisabled = false,
  children,
  showContinueButton = true,
  showBackButton = true,
  showAltLink = false,
  altLinkText = "Alternative Action",
  onAltLinkPress,
  continueButtonText = "Continue",
  isLoading = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          paddingTop: Platform.OS === "android" ? insets.top + 10 : insets.top,
        },
      ]}
      edges={["left", "right", "bottom"]}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerRow}>
        {showBackButton ? (
          <Pressable
            hitSlop={16}
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholderArrow} /> // Pour maintenir l'alignement
        )}
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: (W - 48 - 40) * progress }]}
          />
        </View>
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
                  ? insets.bottom + (showAltLink ? 40 : 0)
                  : 24 + (showAltLink ? 40 : 0),
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
                  : Platform.OS === "ios"
                  ? 12
                  : 20,
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    marginTop: Platform.OS === "ios" ? 0 : 10, // Ajustement pour Android StatusBar
  },
  backArrow: {
    fontSize: 28,
    color: COLORS.black,
    marginRight: 16, // Ajusté
    paddingLeft: 0, // Assurer qu'il n'y a pas de padding interne qui décale
  },
  placeholderArrow: {
    width: 28 + 16, // Largeur de la flèche + marge
  },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.grey0,
    overflow: "hidden",
    paddingHorizontal: 0, // On laisse le SafeAreaView gérer le padding global
  },
  progressFill: {
    height: 2,
    backgroundColor: COLORS.black,
  },
  titleLine1: {
    marginTop: 32,
    fontSize: 34,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: COLORS.black,
    textAlign: "center",
    lineHeight: 38,
    letterSpacing: 0.34,
  },
  subtitle: {
    marginTop: 20,
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    color: COLORS.grey3,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  contentContainer: {
    flex: 1,
  },
  primaryButton: {
    position: "absolute",
    left: 24,
    right: 24,
    height: 60,
    backgroundColor: COLORS.black,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 20,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: COLORS.white,
  },
  altLinkButton: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center", // Centrer le texte du lien
    // marginBottom est géré par `bottom` pour le positionnement absolu
  },
  altLinkText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.grey3,
    textAlign: "center",
  },
});

export default ScreenLayout;

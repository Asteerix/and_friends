// LoadingScreen.tsx
// ---------------------------------------------------------------------------
import {
  CommonActions,
  StackActions,
  useNavigation,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { getDeviceLanguage, t } from "../../../locales";
import { AuthStackParamList } from "@/navigation/types";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------
type LoadingScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "LoadingScreen"
>;

// constants & helpers
const { width: W, height: H } = Dimensions.get("window");
const COLORS = {
  blue: "#3B82F6",
  cream: "#FFF6DB",
  purple: "#E879F9",
  orange: "#FDBA74",
  white: "#FFFFFF",
};
const rnd = (min: number, max: number) => Math.random() * (max - min) + min;

// ---------------------------------------------------------------------------
// Animated background blob (inchangé)
// ---------------------------------------------------------------------------
interface BlobProps {
  color: string;
  initialScale?: number;
  initialX: number;
  initialY: number;
  radius: number;
}
const AnimatedBlob: React.FC<BlobProps> = ({
  color,
  initialScale = 1,
  initialX,
  initialY,
  radius,
}) => {
  const translate = useRef(
    new Animated.ValueXY({ x: initialX, y: initialY })
  ).current;
  const scale = useRef(new Animated.Value(initialScale)).current;
  useEffect(() => {
    const loop = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(translate, {
            toValue: {
              x: initialX + rnd(-W * 0.1, W * 0.1),
              y: initialY + rnd(-H * 0.1, H * 0.1),
            },
            duration: rnd(6000, 9000),
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(translate, {
            toValue: { x: initialX, y: initialY },
            duration: rnd(6000, 9000),
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: initialScale * rnd(0.9, 1.15),
            duration: rnd(6000, 9000),
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(scale, {
            toValue: initialScale,
            duration: rnd(6000, 9000),
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== "web",
          }),
        ]),
      ]).start(() => loop());
    };
    loop();
  }, [initialScale, initialX, initialY, scale, translate]);
  return (
    <Animated.View
      style={[
        styles.blob,
        {
          backgroundColor: color,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          transform: [...translate.getTranslateTransform(), { scale }],
        },
      ]}
    />
  );
};

// ---------------------------------------------------------------------------
// main component
// ---------------------------------------------------------------------------
const LoadingScreen: React.FC = () => {
  const lang = getDeviceLanguage();
  const navigation = useNavigation<LoadingScreenNavigationProp>();

  const completeOnboardingAndNavigate = useCallback(async () => {
    console.log("[LoadingScreen] completeOnboardingAndNavigate called");
    try {
      // Met à jour directement le profil comme complet
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(
          t("error_session_expired_title", lang),
          t("error_session_expired_message", lang)
        );
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "PhoneVerification" }],
          })
        );
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          is_profile_complete: true,
          current_registration_step: "onboarding_complete",
        })
        .eq("id", user.id);
      if (!error) {
        // Ne fais PAS de navigation ici !
        // Le root navigator va détecter le changement et afficher AppScreens automatiquement.
        // Optionnel: tu peux afficher un message de succès ou loader.
      } else {
        Alert.alert(
          t("error_incomplete_profile_title", lang),
          t("error_incomplete_profile_message", lang)
        );
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "PhoneVerification" }],
          })
        );
      }
    } catch (e: any) {
      console.error(
        "[LoadingScreen] Unexpected JS error during completeOnboardingAndNavigate:",
        e
      );
      Alert.alert(
        t("unexpected_error_title", lang),
        t("unexpected_error_message", lang) + `\n${e.message}`
      );
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: "Home" }] })
      );
    }
    console.log("[LoadingScreen] completeOnboardingAndNavigate FIN");
  }, [navigation, lang]);

  useEffect(() => {
    // Cet écran est supposé être atteint APRÈS la 10ème étape d'onboarding (HobbyPicker).
    // Sa seule responsabilité est d'appeler la RPC pour marquer l'onboarding comme complet
    // et ensuite de naviguer vers l'écran Home.

    // Un délai artificiel pour montrer l'écran de chargement, simulant un appel réseau.
    // En production, cet appel réseau est `complete_onboarding`.
    const timer = setTimeout(() => {
      completeOnboardingAndNavigate();
    }, 1500); // Simule un délai réseau

    return () => clearTimeout(timer);
  }, [completeOnboardingAndNavigate]);

  // L'ancienne logique de redirection basée sur `current_registration_step` n'est plus nécessaire ici,
  // car ce rôle est maintenant géré par le `RootNavigator` dans `App.tsx` en utilisant `useOnboardingStatus`.
  // Ce `LoadingScreen` est spécifiquement pour la transition finale après l'étape 10.

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <LinearGradient
        colors={[COLORS.purple, COLORS.blue, COLORS.orange]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <View style={styles.innerContainer}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <AnimatedBlob
              color={COLORS.cream}
              radius={W * 0.9}
              initialX={-W * 0.3}
              initialY={-H * 0.25}
            />
            <AnimatedBlob
              color={COLORS.blue}
              radius={W * 1.2}
              initialX={-W * 0.1}
              initialY={H * 0.0}
            />
            <AnimatedBlob
              color={COLORS.cream}
              radius={W * 0.9}
              initialX={-W * 0.2}
              initialY={H * 0.55}
            />
            <BlurView
              intensity={Platform.OS === "ios" ? 80 : 10}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View style={styles.contentWrapper}>
            <ActivityIndicator
              size="large"
              color={COLORS.white}
              style={{ marginBottom: 32 }}
            />
            <Text style={styles.title}>{t("loading_title", lang)}</Text>
            {/* Changed key from "loading" to "loading_title" for clarity */}
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default LoadingScreen;

const BORDER_WIDTH = Platform.OS === "ios" ? 12 : 8; // Thinner border on Android for aesthetics

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.purple },
  border: { flex: 1, padding: BORDER_WIDTH },
  innerContainer: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: Platform.OS === "ios" ? 18 : 12,
    overflow: "hidden",
  },
  blob: { position: "absolute" },
  contentWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: Platform.OS === "ios" ? 34 : 28,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: COLORS.white,
    textAlign: "center",
    lineHeight: Platform.OS === "ios" ? 38 : 32,
    letterSpacing: 0.34,
    fontWeight: Platform.OS === "ios" ? "normal" : "bold", // Georgia might be thin on Android
  },
});

/*
TODO:
1. Verify RootStackParamList:
   - Ensure "Home" is defined.
   - For HobbyPicker, if it expects `{ restaurantId: string | null }`, the redirectToCorrectStep
     function needs to handle this. If it's `HobbyPicker: undefined`, then no params are needed.
     The current code in redirectToCorrectStep for HobbyPicker is commented to reflect this.
     **IMPORTANT**: If HobbyPicker *does* require `restaurantId`, you'll need a strategy to fetch
     this param if the user resumes at this step, or simplify HobbyPicker's params.
     Given our previous changes, HobbyPicker should ideally be `HobbyPicker: undefined;` in types.

2. Add translation keys:
   "loading_title": "We're getting everything ready for you..." (or similar)
   "error_loading_profile_title": "Error Loading Profile"
   "error_loading_profile_message": "We couldn't load your profile. Please try again."
   "unexpected_error_title": "Unexpected Error"
   "unexpected_error_message": "An unexpected error occurred. Please restart the app."

3. Test all redirection scenarios:
   - New user (no profile yet after phone verification).
   - User mid-registration (e.g., at AvatarPick).
   - User with registration_complete.
   - User with onboarding_completed = true.
   - User not signed in.
   - Error fetching profile.
*/
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  TextInput,
} from "react-native";
import Toast from "react-native-toast-message"; // Ajout pour les notifications Toast

import ScreenLayout from "../../../components/ScreenLayout";
import { supabase } from "../../../lib/supabase";
import { useOtpVerification } from "../../hooks/useOtpVerification";
import { getDeviceLanguage, t } from "../../locales";
import { AuthStackParamList } from "../../navigation/types";
import {
  parsePhoneNumberFromString,
  CountryCode as LibCountryCode,
} from "libphonenumber-js"; // Ajout pour formater le numéro

const { width: W, height: H } = Dimensions.get("window");
const CODE_VERIFICATION_PROGRESS = 0.28; // 2/7
const COLORS = {
  white: "#FFFFFF",
  black: "#000000",
  grey0: "#E5E5E5",
  grey1: "#AEB0B4",
  grey3: "#555555",
  error: "#D32F2F",
  focus: "#1976D2",
};

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const getOtpBoxSize = () => {
  const screenWidth = W - 32;
  const maxBox = 64;
  const minBox = 48;
  const spacing = 8;
  const totalSpacing = spacing * 5;
  let box = Math.floor((screenWidth - totalSpacing) / 6);
  if (box > maxBox) box = maxBox;
  if (box < minBox) box = minBox;
  return { box, spacing };
};

const OtpInput: React.FC<{
  value: string;
  error: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  shake: boolean;
  disabled?: boolean;
}> = ({ value, error, onChange, onSubmit, shake, disabled }) => {
  const inputRef = useRef<any>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const { box, spacing } = getOtpBoxSize();

  useEffect(() => {
    if (shake) {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 60,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -1,
          duration: 60,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 60,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shake, shakeAnim]);

  const translateX = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-10, 10],
  });

  return (
    <Animated.View
      style={[
        styles.otpInputContainer,
        { transform: [{ translateX }], width: box * 6 + spacing * 5 },
      ]}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.otpBox,
            {
              width: box,
              height: box,
              marginRight: i < 5 ? spacing : 0,
              borderColor: error ? COLORS.error : COLORS.grey0,
            },
          ]}
        >
          <Text style={[styles.otpDigit, { fontSize: box * 0.45 }]}>
            {value[i] || "\u2013"}
          </Text>
        </View>
      ))}
      <AnimatedTextInput
        ref={inputRef}
        style={styles.hiddenInput}
        autoFocus
        keyboardType="number-pad"
        value={value}
        onChangeText={onChange}
        maxLength={6}
        onSubmitEditing={onSubmit}
        textContentType="oneTimeCode"
        importantForAutofill="yes"
        editable={!disabled}
        accessible={false}
      />
    </Animated.View>
  );
};

const ErrorMessageDisplay: React.FC<{ message: string }> = ({ message }) => (
  <Text
    style={styles.errorText}
    accessibilityLiveRegion="polite"
    accessibilityRole="alert"
  >
    {message}
  </Text>
);

type CodeVerificationNavProp = StackNavigationProp<
  AuthStackParamList,
  "CodeVerification"
>;

const CodeVerificationScreen: React.FC = () => {
  const navigation = useNavigation<CodeVerificationNavProp>();
  const route = useRoute<RouteProp<AuthStackParamList, "CodeVerification">>();
  // Récupération des paramètres de téléphone au lieu de l'email
  const { phone, callingCode, countryCode } = route.params;
  const lang = getDeviceLanguage(); // Moved up for navigateToNextRegistrationStep if t() is used there.
  const hasVerificationBeenAttempted = useRef(false); // Guard for verifyCode

  // Log screen mount and unmount
  useEffect(() => {
    console.log(
      "[CodeVerificationScreen] Mounted. Route params:",
      JSON.stringify(route.params, null, 2)
    );
    console.log(
      "[CodeVerificationScreen] Destructured params: phone:",
      phone,
      "callingCode:",
      callingCode,
      "countryCode:",
      countryCode
    );
    return () => {
      console.log("[CodeVerificationScreen] Unmounted.");
    };
  }, [phone, callingCode, countryCode, route.params]); // Ensure params are stable or correctly handled if they can change while screen is mounted

  const [shake, setShake] = useState(false);

  const navigateToNextRegistrationStep = useCallback(
    (step: string | null, isComplete: boolean | undefined) => {
      let routeName: keyof AuthStackParamList = "NameInput"; // Default
      let routeParams: any = undefined;

      if (isComplete) {
        // Ici, on pourrait naviguer vers l'app principale via un mécanisme global (ex: navigation.reset vers AppCore ou autre)
        // Mais dans AuthStackParamList, il n'y a pas de 'Home'.
        // On redirige donc par défaut vers NameInput (ou à adapter selon la logique globale de l'app)
        routeName = "NameInput";
      } else {
        switch (step) {
          case "name_input":
            routeName = "NameInput";
            break;
          case "avatar_pick":
            routeName = "AvatarPick";
            break;
          case "contacts_permission":
            routeName = "ContactsPermission";
            break;
          case "location_permission":
            routeName = "LocationPermission";
            break;
          case "age_input":
            routeName = "AgeInput";
            break;
          case "jam_picker":
            routeName = "JamPicker";
            break;
          case "restaurant_picker":
            routeName = "RestaurantPicker";
            break;
          case "hobby_picker":
            routeName = "HobbyPicker";
            routeParams = { restaurantId: null };
            break;
          default:
            console.warn(
              "[CodeVerificationScreen] Unknown or missing registration step:",
              step,
              "Defaulting to NameInput."
            );
            routeName = "NameInput";
        }
      }
      // On utilise toujours navigation.reset pour garantir un flux propre après vérification OTP
      console.log(
        `[CodeVerificationScreen] Navigating (reset): ${routeName}`,
        routeParams || {}
      );
      navigation.reset({
        index: 0,
        routes: [{ name: routeName, params: routeParams }],
      });
    },
    [navigation]
  );

  const handleOtpSuccess = useCallback(async () => {
    console.log(
      "[CodeVerificationScreen] handleOtpSuccess called. OTP verification by Supabase was successful."
    );
    navigateToNextRegistrationStep("name_input", false);
  }, [lang, navigateToNextRegistrationStep, t]);

  const {
    code,
    setCode,
    error: otpError,
    errorMessage: otpErrorMessage,
    loading: otpLoading,
    timer,
    verifyCode,
    resendCode,
  } = useOtpVerification({
    phone,
    callingCode,
    countryCode,
    onSuccess: handleOtpSuccess,
    lang,
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      hasVerificationBeenAttempted.current = false;
      console.log(
        "[CodeVerificationScreen] Screen focused, verification attempt flag reset."
      );
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (code === "") {
      hasVerificationBeenAttempted.current = false;
    }
  }, [code]);

  useEffect(() => {
    if (otpError) {
      setShake(true);
      const timeout = setTimeout(() => setShake(false), 300);
      hasVerificationBeenAttempted.current = false;
      return () => clearTimeout(timeout);
    }
  }, [otpError]);

  const triggerVerifyCode = useCallback(() => {
    if (hasVerificationBeenAttempted.current) {
      console.log(
        "[CodeVerificationScreen] Verification already attempted, skipping."
      );
      return;
    }
    if (code.length === 6 && !otpLoading) {
      console.log("[CodeVerificationScreen] Triggering OTP verification.");
      hasVerificationBeenAttempted.current = true;
      verifyCode();
    } else {
      console.log(
        "[CodeVerificationScreen] Conditions not met for OTP verification or already loading."
      );
    }
  }, [code, verifyCode, otpLoading]);

  const handleChange = useCallback(
    (text: string) => {
      const numeric = text.replace(/[^0-9]/g, "").slice(0, 6);
      setCode(numeric);
    },
    [setCode]
  );

  const overallLoading = otpLoading;

  useEffect(() => {
    if (code.length === 6 && !overallLoading) {
      triggerVerifyCode();
    }
  }, [code, overallLoading, triggerVerifyCode]);

  return (
    <ScreenLayout
      navigation={navigation}
      title={t("verify_code_title", lang)}
      progress={CODE_VERIFICATION_PROGRESS}
      onContinue={triggerVerifyCode}
      continueDisabled={
        code.length !== 6 ||
        overallLoading ||
        hasVerificationBeenAttempted.current
      }
      showAltLink={true}
      altLinkText={
        timer > 0
          ? `${t("resend_code_link", lang)} (${timer}s)`
          : t("resend_code_link", lang)
      }
      onAltLinkPress={
        timer > 0 || overallLoading
          ? undefined
          : () => {
              hasVerificationBeenAttempted.current = false;
              resendCode();
            }
      }
    >
      <KeyboardAvoidingView
        style={styles.flexGrow}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View style={styles.contentContainer}>
          {/* Afficher le numéro de téléphone formaté */}
          <Text style={styles.subtitle}>
            {t("code_verification_subtitle_phone", lang, {
              phone:
                parsePhoneNumberFromString(
                  `+${callingCode}${phone}`,
                  countryCode as LibCountryCode
                )?.formatInternational() || `+${callingCode}${phone}`,
            })}
          </Text>
          <OtpInput
            value={code}
            error={otpError}
            onChange={handleChange}
            onSubmit={triggerVerifyCode}
            shake={shake}
            disabled={overallLoading}
          />
          <Image
            source={require("../../../assets/images/register/verify-number.png")}
            style={[styles.illustration, { height: H * 0.25 }]}
            resizeMode="contain"
          />

          {otpErrorMessage && <ErrorMessageDisplay message={otpErrorMessage} />}
          {overallLoading && !otpErrorMessage && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.black} />
              <Text style={styles.loadingText}>
                {t("verifying_code", lang)}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

export default CodeVerificationScreen;

const styles = StyleSheet.create({
  flexGrow: { flexGrow: 1 },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 0,
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    color: COLORS.grey3,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  otpInputContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
    alignSelf: "center",
  },
  otpBox: {
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  otpDigit: {
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    color: COLORS.black,
    textAlign: "center",
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    color: "transparent",
  },
  illustration: {
    width: "90%",
    alignSelf: "center",
    marginTop: H * 0.04,
    marginBottom: H * 0.04,
  },
  errorText: {
    color: COLORS.error,
    marginTop: 24,
    fontSize: 15,
    textAlign: "center",
    fontWeight: "500",
    paddingHorizontal: 20,
  },
  loadingContainer: { marginTop: 24, alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16, color: COLORS.grey3 },
});

/*
TODO:
1. Vérifiez la table profiles et les RLS dans Supabase.
2. Vérifiez les noms d'écrans et les paramètres dans RootStackParamList et votre navigateur.
3. Ajoutez les clés de traduction.
4. Testez soigneusement le flux de reset pour la navigation. Si le GO_BACK est souhaité
   depuis le premier écran de profil (ex: NameInput) vers CodeVerification,
   alors navigation.navigate devrait être utilisé ici au lieu de reset,
   et le reset devrait être fait au moment de la complétion totale du profil ou
   lors du démarrage de l'app si l'utilisateur est déjà loggué et a un profil.
*/

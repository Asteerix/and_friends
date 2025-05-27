import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
  Animated,
  AccessibilityInfo,
  Platform,
  Image,
  Dimensions,
} from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import {
  parsePhoneNumberFromString,
  CountryCode as LibCountryCode,
  AsYouType,
} from "libphonenumber-js";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import ScreenLayout from "@/components/ScreenLayout";
import { supabase } from "@/lib/supabase";

type AuthStackParamList = {
  PhoneVerification: undefined;
  CodeVerification: {
    phone: string;
    callingCode: string;
    countryCode: LibCountryCode;
  };
};

type Props = StackScreenProps<AuthStackParamList, "PhoneVerification">;

const COLORS = {
  white: "#FFFFFF",
  black: "#000000",
  grey0: "#E5E5E5",
  grey1: "#AEB0B4",
  redError: "#FF3B30",
};

const { height: H } = Dimensions.get("window");

const t = (key: string, _lang?: string) => {
  const translations: { [key: string]: string } = {
    "phoneVerification.title": "Vérifiez votre numéro",
    "phoneVerification.description":
      "Nous vous enverrons un code de vérification par SMS.",
    "phoneVerification.country": "Pays",
    "phoneVerification.phonePlaceholder": "000 000 0000",
    "phoneVerification.continue": "Continuer",
    "phoneVerification.error.invalid_phone_format":
      "Format de téléphone invalide.",
    "phoneVerification.error.rate_limit":
      "Trop de tentatives. Veuillez réessayer plus tard.",
    "phoneVerification.error.network_error":
      "Erreur réseau. Veuillez vérifier votre connexion.",
    "phoneVerification.error.otp_error":
      "Une erreur est survenue lors de l'envoi du code.",
    "phoneVerification.selectCountry": "Sélectionner un pays",
    "onboarding.progressStep": "Étape {current} sur {total}",
  };
  return translations[key] || key;
};

interface Country {
  name: string;
  flag: string;
  code: LibCountryCode;
  callingCode: string;
}

const COMMON_COUNTRIES: Country[] = [
  { name: "France", flag: "🇫🇷", code: "FR", callingCode: "33" },
  { name: "United States", flag: "🇺🇸", code: "US", callingCode: "1" },
  { name: "United Kingdom", flag: "🇬🇧", code: "GB", callingCode: "44" },
  { name: "Spain", flag: "🇪🇸", code: "ES", callingCode: "34" },
  { name: "Germany", flag: "🇩🇪", code: "DE", callingCode: "49" },
  { name: "Canada", flag: "🇨🇦", code: "CA", callingCode: "1" },
  { name: "Australia", flag: "🇦🇺", code: "AU", callingCode: "61" },
  { name: "Belgium", flag: "🇧🇪", code: "BE", callingCode: "32" },
  { name: "Switzerland", flag: "🇨🇭", code: "CH", callingCode: "41" },
  { name: "Italy", flag: "🇮🇹", code: "IT", callingCode: "39" },
];

const PHONE_VERIFICATION_PROGRESS = 0.14;

const getPhonePlaceholder = (countryCode: string) => {
  switch (countryCode) {
    case "FR":
      return "0 00 00 00 00";
    case "US":
    case "CA":
      return "(000) 000-0000";
    case "GB":
      return "0000 000000";
    case "DE":
      return "0000 0000000";
    case "ES":
      return "000 00 00 00";
    case "IT":
      return "000 000 0000";
    case "BE":
      return "000 00 00 00";
    case "CH":
      return "00 000 00 00";
    case "AU":
      return "0000 000 000";
    default:
      return "000 000 0000";
  }
};

const PhoneVerificationScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COMMON_COUNTRIES[0]
  );
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [rawPhoneNumber, setRawPhoneNumber] = useState<string>("");
  const [isValidNumber, setIsValidNumber] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCountryModalVisible, setIsCountryModalVisible] =
    useState<boolean>(false);

  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const haloAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pn = parsePhoneNumberFromString("", selectedCountry.code);
  }, [selectedCountry]);

  const handlePhoneNumberChange = (text: string) => {
    let digits = text.replace(/\D/g, "");
    setRawPhoneNumber(digits);
    const formatter = new AsYouType(selectedCountry.code);
    const formatted = formatter.input(digits);
    setPhoneNumber(formatted);
    setError(null);
    const pn = parsePhoneNumberFromString(digits, selectedCountry.code);
    setIsValidNumber(pn?.isValid() ?? false);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsCountryModalVisible(false);
    setPhoneNumber("");
    setIsValidNumber(false);
    setError(null);
    const pn = parsePhoneNumberFromString("", country.code);
  };

  const startShakeAnimation = () => {
    shakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startHaloAnimation = () => {
    haloAnimation.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(haloAnimation, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(haloAnimation, {
          toValue: 0,
          duration: 700,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  const stopHaloAnimation = () => {
    haloAnimation.stopAnimation();
    haloAnimation.setValue(0);
  };

  const handleContinue = async () => {
    if (!isValidNumber || isLoading) return;
    Keyboard.dismiss();
    setIsLoading(true);
    setError(null);
    startHaloAnimation();
    let digitsOnly = rawPhoneNumber;
    if (selectedCountry.code === "FR" && digitsOnly.startsWith("0")) {
      digitsOnly = digitsOnly.substring(1);
    }
    const fullPhoneNumber = `+${selectedCountry.callingCode}${digitsOnly}`;
    try {
      console.log(
        "[PhoneVerificationScreen] Attempting to sign in with OTP. Full phone number:",
        fullPhoneNumber
      );
      const { data, error: supaError } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
        options: {
          shouldCreateUser: true,
        },
      });
      if (supaError) {
        console.error(
          "[PhoneVerificationScreen] Supabase signInWithOtp error:",
          JSON.stringify(supaError, null, 2)
        );
        let errorMessageKey = "phoneVerification.error.otp_error";
        if (
          supaError.message.includes("Invalid phone number format") ||
          supaError.message.includes("format")
        ) {
          errorMessageKey = "phoneVerification.error.invalid_phone_format";
        } else if (
          supaError.message.includes("rate limit") ||
          supaError.message.includes("Rate limit exceeded")
        ) {
          errorMessageKey = "phoneVerification.error.rate_limit";
        } else if (
          supaError.message.includes("network") ||
          supaError.message.includes("Network request failed")
        ) {
          errorMessageKey = "phoneVerification.error.network_error";
        }
        setError(t(errorMessageKey));
        startShakeAnimation();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        AccessibilityInfo.announceForAccessibility(t(errorMessageKey));
      } else if (data) {
        console.log(
          "[PhoneVerificationScreen] Supabase signInWithOtp success (OTP sent). Data:",
          JSON.stringify(data, null, 2)
        );
        const navigationParams = {
          phone: digitsOnly,
          callingCode: selectedCountry.callingCode,
          countryCode: selectedCountry.code,
        };
        console.log(
          "[PhoneVerificationScreen] Navigating to CodeVerification with params:",
          JSON.stringify(navigationParams, null, 2)
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.replace("CodeVerification", navigationParams);
      } else {
        console.warn(
          "[PhoneVerificationScreen] Supabase signInWithOtp returned no error but no data either."
        );
        setError(t("phoneVerification.error.otp_error"));
        startShakeAnimation();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e: any) {
      console.error(
        "[PhoneVerificationScreen] Generic error during signInWithOtp:",
        e
      );
      setError(t("phoneVerification.error.otp_error"));
      startShakeAnimation();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      AccessibilityInfo.announceForAccessibility(
        t("phoneVerification.error.otp_error")
      );
    } finally {
      setIsLoading(false);
      stopHaloAnimation();
    }
  };

  // Fonction de connexion automatique pour les tests
  const handleTestLogin = async () => {
    console.log("[PhoneVerificationScreen] Test login démarré");
    setIsLoading(true);
    try {
      // Simuler une connexion avec l'email de test
      const testEmail =
        process.env.EXPO_PUBLIC_TEST_EMAIL || "poltavtseefamaury@gmail.com";
      console.log(
        "[PhoneVerificationScreen] Tentative de connexion avec:",
        testEmail
      );

      const { data, error } = await supabase.auth.signInWithOtp({
        email: testEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.error(
          "[PhoneVerificationScreen] Erreur lors de la connexion test:",
          error
        );
        setError("Erreur lors de la connexion test");
      } else {
        console.log(
          "[PhoneVerificationScreen] OTP envoyé pour test à:",
          testEmail
        );
        setError(
          "Un code de vérification a été envoyé à votre email de test. Vérifiez votre boîte mail."
        );
      }
    } catch (error) {
      console.error("[PhoneVerificationScreen] Erreur inattendue:", error);
      setError("Erreur inattendue");
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de connexion directe pour bypasser l'authentification (dev seulement)
  const handleDirectLogin = async () => {
    console.log("[PhoneVerificationScreen] Connexion directe pour dev");
    setIsLoading(true);
    try {
      // Tentative de connexion anonyme ou avec un token de développement
      const testEmail = "test@andfriends.dev";
      const testPassword = "testpassword123";

      // Créer un utilisateur de test s'il n'existe pas, puis se connecter
      let { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      if (error && error.message.includes("User already registered")) {
        // L'utilisateur existe déjà, essayons de nous connecter
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });

        if (signInError) {
          console.error(
            "[PhoneVerificationScreen] Erreur connexion directe:",
            signInError
          );
          setError("Erreur lors de la connexion directe");
        } else {
          console.log("[PhoneVerificationScreen] Connexion directe réussie!");
          // La navigation sera gérée automatiquement par le context de session
        }
      } else if (error) {
        console.error(
          "[PhoneVerificationScreen] Erreur création utilisateur test:",
          error
        );
        setError("Erreur lors de la création de l'utilisateur test");
      } else {
        console.log(
          "[PhoneVerificationScreen] Utilisateur test créé et connecté!"
        );
        // La navigation sera gérée automatiquement par le context de session
      }
    } catch (error) {
      console.error("[PhoneVerificationScreen] Erreur inattendue:", error);
      setError("Erreur inattendue");
    } finally {
      setIsLoading(false);
    }
  };

  const animatedHaloStyle = {
    opacity: haloAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.3],
    }),
    transform: [
      {
        scale: haloAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2],
        }),
      },
    ],
  };

  return (
    <ScreenLayout
      navigation={navigation}
      title={undefined}
      subtitle={undefined}
      progress={PHONE_VERIFICATION_PROGRESS}
      onContinue={handleContinue}
      continueDisabled={!isValidNumber || isLoading}
      continueButtonText={t("phoneVerification.continue")}
      showAltLink={false}
      showBackButton={false}
    >
      <Text
        style={{
          fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
          fontSize: 34,
          color: COLORS.black,
          textAlign: "center",
          lineHeight: 38,
          letterSpacing: 0.34,
          marginTop: 8,
        }}
      >
        Are you <Text style={{ fontStyle: "italic" }}>real or something?</Text>
      </Text>
      <Text
        style={{
          fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
          fontSize: 16,
          color: COLORS.grey1,
          textAlign: "center",
          lineHeight: 24,
          marginTop: 16,
          marginBottom: 24,
        }}
      >
        {"Let's make sure you're a real one.\nEnter your phone number to keep things safe."
          .split("\n")
          .map((line, idx) => (
            <Text key={idx}>
              {line}
              {"\n"}
            </Text>
          ))}
      </Text>
      <TouchableOpacity
        style={styles.countryPickerButton}
        onPress={() => setIsCountryModalVisible(true)}
        disabled={isLoading}
      >
        <Text style={styles.countryPickerButtonText}>
          {selectedCountry.flag} {selectedCountry.name} (+
          {selectedCountry.callingCode})
        </Text>
        <Text style={styles.countryPickerArrow}>▼</Text>
      </TouchableOpacity>
      <Animated.View
        style={[
          styles.inputContainer,
          { transform: [{ translateX: shakeAnimation }] },
        ]}
      >
        <Text style={styles.prefix}>+{selectedCountry.callingCode}</Text>
        <TextInput
          style={styles.textInput}
          placeholder={getPhonePlaceholder(selectedCountry.code)}
          placeholderTextColor={COLORS.grey1}
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={handlePhoneNumberChange}
          editable={!isLoading}
          autoFocus
        />
      </Animated.View>
      <Image
        source={require("../../../assets/images/register/wine.png")}
        style={{
          width: "100%",
          maxWidth: 420,
          alignSelf: "center",
          marginTop: H * 0.04,
          marginBottom: H * 0.04,
          height: H * 0.28,
        }}
        resizeMode="contain"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Boutons de test temporaires - À SUPPRIMER EN PRODUCTION */}
      <TouchableOpacity
        style={[styles.testButton, { opacity: isLoading ? 0.6 : 1 }]}
        onPress={handleTestLogin}
        disabled={isLoading}
      >
        <Text style={styles.testButtonText}>📧 Test OTP Email</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.directLoginButton, { opacity: isLoading ? 0.6 : 1 }]}
        onPress={handleDirectLogin}
        disabled={isLoading}
      >
        <Text style={styles.directLoginButtonText}>
          🚀 Connexion Directe (Dev)
        </Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isCountryModalVisible}
        onRequestClose={() => setIsCountryModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsCountryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {t("phoneVerification.selectCountry")}
                </Text>
                <FlatList
                  data={COMMON_COUNTRIES}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.countryModalItem}
                      onPress={() => handleCountrySelect(item)}
                    >
                      <Text style={styles.countryModalItemText}>
                        {item.flag} {item.name} (+{item.callingCode})
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: COLORS.grey0,
    marginTop: Platform.OS === "android" ? 25 : 0,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.black,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: "5%",
    paddingTop: "5%",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.black,
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 17,
    color: COLORS.grey1,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: "5%",
  },
  countryPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    width: "100%",
    borderColor: COLORS.grey0,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  countryPickerButtonText: {
    fontSize: 17,
    color: COLORS.black,
  },
  countryPickerArrow: {
    fontSize: 17,
    color: COLORS.grey1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    width: "100%",
    borderColor: COLORS.grey0,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  prefix: {
    fontSize: 17,
    fontWeight: "500",
    color: COLORS.black,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: COLORS.black,
    paddingVertical: 0,
    backgroundColor: COLORS.white,
  },
  errorText: {
    color: COLORS.redError,
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
    width: "100%",
  },
  continueButton: {
    height: 56,
    width: "100%",
    backgroundColor: COLORS.black,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    overflow: "hidden",
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.grey1,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "600",
  },
  haloBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.black,
    marginBottom: 20,
    textAlign: "center",
  },
  countryModalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey0,
  },
  countryModalItemText: {
    fontSize: 17,
    color: COLORS.black,
  },
  testButton: {
    height: 48,
    width: "100%",
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  testButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
  directLoginButton: {
    height: 48,
    width: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  directLoginButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
});

export default PhoneVerificationScreen;
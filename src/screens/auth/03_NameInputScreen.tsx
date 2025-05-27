// NameInputScreen.tsx
// ---------------------------------------------------------------------------
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native"; // Ajout useNavigation
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useState, useCallback } from "react"; // Ajout useCallback
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert, // Ajout pour les messages d'erreur
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import ScreenLayout from "../../../components/ScreenLayout";
import { supabase } from "../../../lib/supabase";
import { getDeviceLanguage, t } from "../../locales";
import { AuthStackParamList } from "../../navigation/types"; // Modifié pour AuthStackParamList

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
// Modifié pour utiliser AuthStackParamList
type NameInputNavProp = StackNavigationProp<AuthStackParamList, "NameInput">;

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const COLORS = {
  white: "#FFFFFF",
  black: "#000000",
  grey0: "#E5E5E5",
  grey1: "#AEB0B4",
  grey3: "#555555",
  error: "#D32F2F", // Standard error color
};

const NAME_INPUT_PROGRESS = 0.42; // 3/7 (environ)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const NameInputScreen: React.FC = () => {
  const navigation = useNavigation<NameInputNavProp>();
  const lang = getDeviceLanguage();

  const [fullName, setFullName] = useState("");
  const [fullNameErrorKey, setFullNameErrorKey] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [usernameErrorKey, setUsernameErrorKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);

  // Fetch existing profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetchingInitialData(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("[NameInputScreen] fetchProfile - user:", user);
      if (user) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", user.id)
            .single();
          console.log("[NameInputScreen] fetchProfile - select full_name:", {
            data,
            error,
          });
          if (error && error.code !== "PGRST116") {
            // PGRST116: row not found
            console.error("Error fetching name input profile data:", error);
            // Optionally set a general error message for the screen
          } else if (data) {
            if (data.full_name) setFullName(data.full_name);
            if (data.username) setUsername(data.username);
          }
        } catch (e) {
          console.error(
            "Unexpected error fetching name input profile data:",
            e
          );
        }
      }
      setIsFetchingInitialData(false);
      console.log("[NameInputScreen] fetchProfile - FIN. fullName:", fullName);
    };
    fetchProfile();
  }, []);

  const validateFullName = useCallback((name: string): boolean => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setFullNameErrorKey("error_fullname_required");
      return false;
    }
    if (/\d/.test(trimmedName)) {
      setFullNameErrorKey("error_fullname_invalid_numbers");
      return false;
    }
    setFullNameErrorKey(null);
    return true;
  }, []);

  // Ajout d'une fonction pour vérifier l'unicité du username
  const checkUsernameUnique = useCallback(
    async (username: string, userId: string): Promise<boolean> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", username)
        .neq("id", userId)
        .maybeSingle();
      if (error) {
        console.error("Error checking username uniqueness:", error);
        return false; // On laisse passer, mais on pourrait bloquer
      }
      return !data;
    },
    []
  );

  const validateUsername = useCallback(
    async (username: string): Promise<boolean> => {
      const trimmed = username.trim().replace(/^@/, "");
      if (trimmed.length === 0) {
        setUsernameErrorKey("error_username_required");
        return false;
      }
      if (!/^[a-zA-Z0-9_\.]+$/.test(trimmed)) {
        setUsernameErrorKey("error_username_invalid");
        return false;
      }
      // Vérification unicité
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && user.id) {
        const isUnique = await checkUsernameUnique(trimmed, user.id);
        if (!isUnique) {
          setUsernameErrorKey("error_username_taken");
          return false;
        }
      }
      setUsernameErrorKey(null);
      return true;
    },
    [checkUsernameUnique]
  );

  const canContinue =
    !fullNameErrorKey &&
    !usernameErrorKey &&
    fullName.trim().length > 0 &&
    username.trim().length > 0 &&
    !isLoading &&
    !isFetchingInitialData;

  useEffect(() => {
    if (fullName !== "" || fullNameErrorKey) validateFullName(fullName);
  }, [fullName, validateFullName, fullNameErrorKey]);

  useEffect(() => {
    if (username !== "" || usernameErrorKey) {
      (async () => {
        await validateUsername(username);
      })();
    }
  }, [username, validateUsername, usernameErrorKey]);

  const handleContinue = async () => {
    const isFullNameValid = validateFullName(fullName);
    const isUsernameValid = await validateUsername(username);
    if (!isFullNameValid || !isUsernameValid) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log(
      "[NameInputScreen] handleContinue - user:",
      user,
      "fullName:",
      fullName,
      "username:",
      username
    );
    if (!user || !user.id) {
      console.error("User not found for saving name.");
      // TODO: Display a generic error to the user (e.g., session expired)
      return;
    }

    setIsLoading(true);
    console.log(
      "[NameInputScreen] handleContinue() - Attempting to update profile for user:",
      user.id,
      "with name:",
      fullName.trim(),
      "and username:",
      username.trim().replace(/^@/, "")
    );

    try {
      const { data: updateData, error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          username: username.trim().replace(/^@/, ""),
          current_registration_step: "name_input",
        })
        .eq("id", user.id)
        .select(); // Ajout de .select() pour obtenir des données en retour et confirmer l'écriture
      console.log(
        "[NameInputScreen] handleContinue - updateData:",
        updateData,
        "updateError:",
        updateError
      );
      if (updateError) {
        console.error(
          "[NameInputScreen] Supabase error updating profile:",
          JSON.stringify(updateError, null, 2)
        );
        Alert.alert(
          t("error_saving_profile_title", lang, {
            defaultValue: "Erreur de sauvegarde",
          }),
          t("error_saving_profile_message", lang, {
            defaultValue: `Impossible d'enregistrer le nom. Veuillez réessayer. Détail: ${updateError.message} (Code: ${updateError.code})`,
            message: updateError.message,
            code: updateError.code,
          })
        );
        setIsLoading(false); // Assurez-vous que isLoading est false ici
      } else {
        console.log(
          "[NameInputScreen] Profile updated successfully. Response data:",
          JSON.stringify(updateData, null, 2)
        );
        console.log(
          `[NameInputScreen] isLoading state BEFORE navigation: ${isLoading}`
        );
        console.log(
          "[NameInputScreen] Attempting to navigate to AvatarPick..."
        );
        try {
          navigation.navigate("AvatarPick");
          console.log(
            "[NameInputScreen] Successfully called navigation.navigate('AvatarPick')"
          );
        } catch (navError: any) {
          console.error(
            "[NameInputScreen] ERROR DURING NAVIGATION CALL to AvatarPick:",
            JSON.stringify(navError, null, 2)
          );
          Alert.alert(
            "Navigation Error",
            `Failed to navigate to AvatarPick: ${navError.message}`
          );
        }
        // setIsLoading(false) sera appelé dans le finally.
      }
    } catch (e) {
      console.error("[NameInputScreen] Exception in handleContinue:", e);
    } finally {
      setIsLoading(false);
      console.log(
        "[NameInputScreen] handleContinue - FIN. isLoading:",
        isLoading
      );
    }
  };

  // Sécurité : si la session saute, on force la navigation vers PhoneVerification
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !session.user) {
        console.error(
          "[NameInputScreen] ERREUR: Session absente, navigation forcée vers PhoneVerification."
        );
        navigation.navigate("PhoneVerification"); // 'as never' n'est plus nécessaire si le type est correct
      }
    });
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          e.preventDefault();
          console.warn(
            "[NameInputScreen] Go back bloqué car session présente."
          );
        }
      });
    });
    return unsubscribe;
  }, [navigation]);

  // Handler pour la croix (déconnexion)
  const handleLogout = async () => {
    console.log("[NameInputScreen] Déconnexion demandée via la croix.");
    try {
      await supabase.auth.signOut();
      console.log(
        "[NameInputScreen] Déconnexion réussie. Navigation vers PhoneVerification."
      );
      navigation.reset({ index: 0, routes: [{ name: "PhoneVerification" }] });
    } catch (e) {
      console.error("[NameInputScreen] Erreur lors de la déconnexion:", e);
      Alert.alert(
        "Erreur",
        "Impossible de se déconnecter. Veuillez réessayer."
      );
    }
  };

  if (isFetchingInitialData && !isLoading) {
    // Show loader only for initial data fetch if not already saving
    return (
      <View style={styles.loadingScreenContainer}>
        <ActivityIndicator size="large" color={COLORS.black} />
      </View>
    );
  }

  return (
    <>
      {/* Croix de déconnexion en haut à gauche */}
      <TouchableOpacity
        onPress={handleLogout}
        style={{
          position: "absolute",
          top: Platform.OS === "ios" ? 54 : 34,
          left: 24,
          zIndex: 10,
        }}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <Ionicons name="close" size={28} color={COLORS.black} />
      </TouchableOpacity>
      <ScreenLayout
        navigation={navigation}
        title={t("name_input_title", lang)}
        subtitle={t("name_input_subtitle", lang)}
        progress={NAME_INPUT_PROGRESS}
        onContinue={handleContinue}
        continueDisabled={!canContinue || isLoading}
        showBackButton={false}
      >
        <KeyboardAvoidingView
          style={styles.flexGrow}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
          <View style={styles.contentContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.textInput,
                  fullNameErrorKey ? styles.inputError : {},
                ]}
                placeholder={t("name_input_fullname_placeholder", lang)}
                placeholderTextColor={COLORS.grey1}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (fullNameErrorKey) validateFullName(text);
                }}
                onBlur={() => validateFullName(fullName)}
                autoCapitalize="words"
                returnKeyType="next"
                editable={!isLoading}
                // onSubmitEditing={() => { /* focus username input */ }} // TODO
              />
              {fullNameErrorKey && (
                <Text style={styles.errorText}>
                  {t(fullNameErrorKey, lang)}
                </Text>
              )}
            </View>
            <View style={styles.inputWrapper}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 17,
                    color: COLORS.grey3,
                    marginLeft: 12,
                    marginRight: 2,
                  }}
                >
                  @
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    usernameErrorKey ? styles.inputError : {},
                    { flex: 1, marginLeft: 0 },
                  ]}
                  placeholder={t("name_input_username_placeholder", lang, {
                    defaultValue: "Choose a username",
                  })}
                  placeholderTextColor={COLORS.grey1}
                  value={username.replace(/^@/, "")}
                  onChangeText={(text) => {
                    setUsername(text.replace(/^@/, ""));
                    if (usernameErrorKey)
                      validateUsername(text.replace(/^@/, ""));
                  }}
                  onBlur={async () => {
                    await validateUsername(username);
                  }}
                  autoCapitalize="none"
                  returnKeyType="done"
                  editable={!isLoading}
                />
              </View>
              {usernameErrorKey && (
                <Text style={styles.errorText}>
                  {t(usernameErrorKey, lang)}
                </Text>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenLayout>
    </>
  );
};

export default NameInputScreen;

const styles = StyleSheet.create({
  flexGrow: { flexGrow: 1 },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 0,
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  inputWrapper: { alignSelf: "stretch", marginBottom: 10 },
  textInput: {
    height: 56,
    borderColor: COLORS.grey0,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    color: COLORS.black,
    backgroundColor: COLORS.white,
  },
  inputError: { borderColor: COLORS.error },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 4,
  },
  loadingScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
});

/*
TODO:
1. Assurez-vous que les clés de traduction suivantes existent:
   "error_fullname_required": "Full name is required."
   "error_fullname_invalid_numbers": "Full name cannot contain numbers."
   "error_saving_profile": "Error saving profile."
   (et les clés existantes comme "name_input_title", "name_input_subtitle", "name_input_fullname_placeholder", "unexpected_error")
2. Testez la lecture des données existantes et la sauvegarde.
3. Implémentez le focus sur le champ username après la soumission du full name si souhaité.
4. Si ScreenLayout ne gère pas `isLoading`, l'ActivityIndicator pour la sauvegarde est déjà implicitement géré par `continueDisabled`.
*/

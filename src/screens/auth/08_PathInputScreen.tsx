import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenLayout from "../../../components/ScreenLayout";
import { supabase } from "../../../lib/supabase";
import { getDeviceLanguage, t } from "../../locales";
import { AuthStackParamList } from "../../navigation/types";

type PathInputNavProp = StackNavigationProp<AuthStackParamList, "PathInput">;

const COLORS = {
  white: "#FFFFFF",
  black: "#000000",
  grey0: "#E5E5E5",
  grey1: "#AEB0B4",
  grey3: "#555555",
  error: "#D32F2F",
};

const PATH_INPUT_PROGRESS = 0.65; // Ajuster selon le nombre d'étapes

const PathInputScreen: React.FC = () => {
  const navigation = useNavigation<PathInputNavProp>();
  const lang = getDeviceLanguage();
  const [path, setPath] = useState("");
  const [pathErrorKey, setPathErrorKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetchingInitialData(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("path")
            .eq("id", user.id)
            .single();
          if (error && error.code !== "PGRST116") {
            console.error("Error fetching path input profile data:", error);
          } else if (data && data.path) {
            setPath(data.path);
          }
        } catch (e) {
          console.error(
            "Unexpected error fetching path input profile data:",
            e
          );
        }
      }
      setIsFetchingInitialData(false);
    };
    fetchProfile();
  }, []);

  const validatePath = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setPathErrorKey("error_path_required");
      return false;
    }
    setPathErrorKey(null);
    return true;
  }, []);

  const canContinue =
    !pathErrorKey &&
    path.trim().length > 0 &&
    !isLoading &&
    !isFetchingInitialData;

  useEffect(() => {
    if (path !== "" || pathErrorKey) validatePath(path);
  }, [path, validatePath, pathErrorKey]);

  const handleContinue = async () => {
    const isPathValid = validatePath(path);
    if (!isPathValid) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.id) {
      console.error("User not found for saving path.");
      return;
    }
    setIsLoading(true);
    try {
      const { data: updateData, error: updateError } = await supabase
        .from("profiles")
        .update({
          path: path.trim(),
          current_registration_step: "path_input",
        })
        .eq("id", user.id)
        .select();
      if (updateError) {
        Alert.alert(
          t("error_saving_profile_title", lang, {
            defaultValue: "Erreur de sauvegarde",
          }),
          t("error_saving_profile_message", lang, {
            defaultValue: `Impossible d'enregistrer le chemin. Veuillez réessayer. Détail: ${updateError.message} (Code: ${updateError.code})`,
            message: updateError.message,
            code: updateError.code,
          })
        );
        setIsLoading(false);
      } else {
        navigation.navigate("JamPicker");
      }
    } catch (e) {
      console.error("[PathInputScreen] Exception in handleContinue:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Sécurité : si la session saute, on force la navigation vers PhoneVerification
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !session.user) {
        navigation.navigate("PhoneVerification");
      }
    });
  }, [navigation]);

  if (isFetchingInitialData && !isLoading) {
    return (
      <View style={styles.loadingScreenContainer}>
        <ActivityIndicator size="large" color={COLORS.black} />
      </View>
    );
  }

  return (
    <>
      <ScreenLayout
        navigation={navigation}
        title={t("path_input_title", lang, {
          defaultValue: "What's your path?",
        })}
        subtitle={t("path_input_subtitle", lang, {
          defaultValue:
            "Work, school, or anything else — it helps us find your crew.",
        })}
        progress={PATH_INPUT_PROGRESS}
        onContinue={handleContinue}
        continueDisabled={!canContinue || isLoading}
        showBackButton={true}
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
                  pathErrorKey ? styles.inputError : {},
                ]}
                placeholder={t("path_input_placeholder", lang, {
                  defaultValue: "Job, School, Freelance, Exploring...",
                })}
                placeholderTextColor={COLORS.grey1}
                value={path}
                onChangeText={(text) => {
                  setPath(text);
                  if (pathErrorKey) validatePath(text);
                }}
                onBlur={() => validatePath(path)}
                autoCapitalize="sentences"
                returnKeyType="done"
                editable={!isLoading}
              />
              {pathErrorKey && (
                <Text style={styles.errorText}>{t(pathErrorKey, lang)}</Text>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenLayout>
    </>
  );
};

export default PathInputScreen;

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

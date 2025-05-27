// LocationPermissionScreen.tsx
// ---------------------------------------------------------------------------
import { StackNavigationProp } from "@react-navigation/stack";
import * as Location from "expo-location";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  View,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import ScreenLayout from "@/components/ScreenLayout";
import { supabase } from "@/lib/supabase";
import { getDeviceLanguage, t } from "../../../locales";
import { AuthStackParamList } from "@/navigation/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type NavProp = StackNavigationProp<AuthStackParamList, "LocationPermission">;

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const { height: H } = Dimensions.get("window");
const COLORS = {
  white: "#FFFFFF",
  black: "#000000",
  grey3: "#555555",
};
const LOCATION_PERMISSION_PROGRESS = 0.85; // 6/7 (environ)
const NEXT_SCREEN_NAME: keyof AuthStackParamList = "AgeInput";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const LocationPermissionScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const lang = getDeviceLanguage();
  const [isLoading, setIsLoading] = useState(false);

  // Auto-skip if already granted
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      console.log(
        "[LocationPermissionScreen] Permission status on mount:",
        status
      );
      if (status === Location.PermissionStatus.GRANTED) {
        // Met à jour le profil AVANT de passer à l'étape suivante
        const updated = await updateUserProfileWithPermission(true);
        if (updated) {
          navigation.navigate(NEXT_SCREEN_NAME);
        }
      }
    })();
  }, [navigation]);

  const updateUserProfileWithPermission = async (
    permissionGranted: boolean
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.id) {
      console.error("User not found for updating location permission.");
      Alert.alert(
        t("error_session_expired_title", lang),
        t("error_session_expired_message", lang)
      );
      return false;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          location_permission_granted: permissionGranted,
          current_registration_step: "location_permission",
        })
        .eq("id", user.id);

      if (error) {
        console.error(
          "Error updating profile with location permission:",
          error
        );
        Alert.alert(t("error_saving_profile", lang), error.message);
        return false;
      }
      return true;
    } catch (e: any) {
      console.error("Unexpected error updating profile:", e);
      Alert.alert(t("unexpected_error", lang), e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionRequest = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log(
      "[LocationPermissionScreen] Permission requested, status:",
      status
    );
    const permissionGranted = status === Location.PermissionStatus.GRANTED;
    const profileUpdated = await updateUserProfileWithPermission(
      permissionGranted
    );

    // Always navigate to next screen, even if permission denied
    navigation.navigate(NEXT_SCREEN_NAME);
    setIsLoading(false);
  };

  const handleSkip = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // Si l'utilisateur saute, on enregistre que la permission n'a pas été accordée (false).
    const profileUpdated = await updateUserProfileWithPermission(false);
    if (profileUpdated) {
      navigation.navigate(NEXT_SCREEN_NAME);
    } else {
      setIsLoading(false);
    }
  };

  return (
    <ScreenLayout
      navigation={navigation}
      title={t("location_permission_title", lang)}
      subtitle={t("location_permission_subtitle", lang)}
      progress={LOCATION_PERMISSION_PROGRESS}
      onContinue={handlePermissionRequest}
      continueButtonText={t("location_permission_button_allow", lang)} // Ex: "Enable Location"
      continueDisabled={isLoading}
      showAltLink={true}
      altLinkText={t("skip_for_now", lang)} // Ex: "Skip for now"
      onAltLinkPress={handleSkip}
      // isLoading prop retirée si ScreenLayout ne la supporte pas
    >
      <View style={styles.contentContainer}>
        <Image
          source={require("../../../assets/images/register/location-illustration.png")}
          style={styles.illustration}
          resizeMode="contain"
        />
        {isLoading && (
          <ActivityIndicator
            size="large"
            color={COLORS.black}
            style={styles.loadingIndicator}
          />
        )}
      </View>
    </ScreenLayout>
  );
};

export default LocationPermissionScreen;

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 0,
    justifyContent: "center",
    paddingTop: 20,
  },
  illustration: {
    width: "85%",
    height: H * 0.35,
    alignSelf: "center",
    marginBottom: 20,
  },
  loadingIndicator: {
    marginTop: 20,
  },
});

/*
TODO:
1. Assurez-vous que la table `profiles`
*/
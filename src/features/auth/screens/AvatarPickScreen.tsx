// AvatarPickScreen.tsx
// ---------------------------------------------------------------------------
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ScreenLayout from "@/components/ScreenLayout";
import { supabase } from "@/lib/supabase";
import { getDeviceLanguage, t } from "../../../locales";
import { AuthStackParamList } from "@/navigation/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NavProp = StackNavigationProp<AuthStackParamList, "AvatarPick">;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: W } = Dimensions.get("window");
const COLORS = {
  white: "#FFFFFF",
  black: "#000000",
  grey0: "#E5E5E5",
  grey2: "#666666",
  grey3: "#555555",
  error: "#D32F2F",
};

const AVATAR_PICK_PROGRESS = 0.57; // 4/7 of the onboarding wizard
const AVATAR_SIZE = W * 0.58;
const NEXT_SCREEN_NAME: keyof AuthStackParamList = "ContactsPermission";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AvatarPickScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const lang = getDeviceLanguage();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [initialAvatarUrl, setInitialAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);

  // ------------------------------------------------------------
  // Fetch existing avatar on mount
  // ------------------------------------------------------------
  useEffect(() => {
    const fetchAvatar = async () => {
      setIsFetchingInitialData(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "[AvatarPickScreen] Could not get current user:",
          userError
        );
        Alert.alert(
          t("error_session_expired_title", lang),
          t("error_session_expired_message", lang)
        );
        setIsFetchingInitialData(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("[AvatarPickScreen] Error fetching profile:", error);
        Alert.alert(
          t("error_loading_profile_title", lang),
          t("error_loading_profile_message", lang)
        );
      } else if (data?.avatar_url) {
        setImageUri(data.avatar_url);
        setInitialAvatarUrl(data.avatar_url);
      }

      setIsFetchingInitialData(false);
    };

    fetchAvatar();
  }, [lang]);

  // ------------------------------------------------------------
  // Helpers: permissions & pickers
  // ------------------------------------------------------------
  const openCamera = async () => {
    if (isLoading) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("permission_denied_camera_title", lang),
        t("permission_denied_camera_message", lang)
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    if (isLoading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t("permission_denied_gallery_title", lang),
        t("permission_denied_gallery_message", lang)
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ------------------------------------------------------------
  // Upload avatar to Supabase Storage and return the public URL
  // ------------------------------------------------------------
  const uploadAvatar = async (uri: string): Promise<string | null> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert(
        t("error_session_expired_title", lang),
        t("error_session_expired_message", lang)
      );
      return null;
    }

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, {
          cacheControl: "3600",
          upsert: true,
          contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
        });

      if (uploadError) {
        console.error("[AvatarPickScreen] Upload error:", uploadError);
        Alert.alert(
          t("error_uploading_avatar_title", lang),
          uploadError.message
        );
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        Alert.alert(
          t("error_uploading_avatar_title", lang),
          t("unexpected_error_message", lang)
        );
        return null;
      }

      return publicUrlData.publicUrl;
    } catch (e: any) {
      console.error("[AvatarPickScreen] Unexpected upload error:", e);
      Alert.alert(t("unexpected_error_title", lang), e.message);
      return null;
    }
  };

  // ------------------------------------------------------------
  // Update profile row with avatar URL
  // ------------------------------------------------------------
  const updateUserProfile = async (
    avatarUrl: string | null
  ): Promise<boolean> => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert(
        t("error_session_expired_title", lang),
        t("error_session_expired_message", lang)
      );
      return false;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        current_registration_step: "avatar_pick",
      })
      .eq("id", user.id);

    if (error) {
      console.error("[AvatarPickScreen] Profile update error:", error);
      Alert.alert(t("error_saving_profile_title", lang), error.message);
      return false;
    }

    return true;
  };

  // ------------------------------------------------------------
  // Primary actions
  // ------------------------------------------------------------
  const handleContinue = async () => {
    if (!imageUri || isLoading) return;

    setIsLoading(true);

    let finalUrl = initialAvatarUrl;
    if (imageUri !== initialAvatarUrl) {
      const uploaded = await uploadAvatar(imageUri);
      if (!uploaded) {
        setIsLoading(false);
        return;
      }
      finalUrl = uploaded;
    }

    const success = await updateUserProfile(finalUrl);
    setIsLoading(false);

    if (success) {
      navigation.navigate(NEXT_SCREEN_NAME);
    }
  };

  const skipAction = () => {
    if (isLoading) return;
    navigation.navigate(NEXT_SCREEN_NAME);
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  if (isFetchingInitialData) {
    return (
      <View style={styles.loadingScreenContainer}>
        <ActivityIndicator size="large" color={COLORS.black} />
      </View>
    );
  }

  return (
    <ScreenLayout
      navigation={navigation}
      title={t("avatar_pick_title", lang)}
      subtitle={t("avatar_pick_subtitle", lang)}
      progress={AVATAR_PICK_PROGRESS}
      onContinue={handleContinue}
      continueDisabled={!imageUri || isLoading}
      showAltLink
      altLinkText={t("skip", lang)}
      onAltLinkPress={skipAction}
      isLoading={isLoading}
    >
      <View style={styles.contentContainer}>
        <View style={styles.avatarWrapper}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatarImage} />
          ) : (
            <Image
              source={require("../../../assets/images/register/face.png")}
              style={styles.avatarPlaceholder}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Camera button */}
        <View style={styles.actionButton}>
          <View style={styles.actionLeft}>
            <Text style={styles.actionIcon}>📷</Text>
          </View>
          <Pressable
            onPress={openCamera}
            style={styles.actionRight}
            android_ripple={{ color: "#00000010" }}
            disabled={isLoading}
          >
            <Text style={styles.actionLabel}>
              {t("avatar_pick_snap", lang)}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        {/* Gallery button */}
        <View style={styles.actionButton}>
          <View style={styles.actionLeft}>
            <Text style={styles.actionIcon}>🖼</Text>
          </View>
          <Pressable
            onPress={openGallery}
            style={styles.actionRight}
            android_ripple={{ color: "#00000010" }}
            disabled={isLoading}
          >
            <Text style={styles.actionLabel}>
              {t("avatar_pick_gallery", lang)}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
      </View>
    </ScreenLayout>
  );
};

export default AvatarPickScreen;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 0,
    justifyContent: "flex-start",
    paddingTop: 20,
  },
  avatarWrapper: {
    alignSelf: "center",
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.grey0,
    marginBottom: 20,
  },
  avatarPlaceholder: { width: "100%", height: "100%" },
  avatarImage: { width: "100%", height: "100%" },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderColor: COLORS.grey0,
    borderWidth: 1,
    borderRadius: 12,
    alignSelf: "stretch",
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  actionLeft: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderColor: COLORS.grey0,
  },
  actionIcon: { fontSize: 20, color: COLORS.black },
  actionRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  actionLabel: {
    fontSize: 17,
    color: COLORS.black,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
  },
  chevron: { fontSize: 24, color: COLORS.grey2, marginLeft: 8 },
  loadingScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
});
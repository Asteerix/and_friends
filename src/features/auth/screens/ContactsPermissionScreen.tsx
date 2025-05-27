// ContactsPermissionScreen.tsx
// ---------------------------------------------------------------------------
import { StackNavigationProp } from "@react-navigation/stack";
import * as Contacts from "expo-contacts";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  View,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native"; // Ajout
import { useSession } from "@/lib/SessionContext";

import ScreenLayout from "@/components/ScreenLayout";
import { supabase } from "@/lib/supabase"; // Ajout
import { getDeviceLanguage, t } from "../../../locales";
import { AuthStackParamList } from "@/navigation/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type NavProp = StackNavigationProp<AuthStackParamList, "ContactsPermission">;

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const { height: H } = Dimensions.get("window");
const COLORS = {
  white: "#FFFFFF",
  black: "#000000",
  grey3: "#555555",
};
const CONTACTS_PERMISSION_PROGRESS = 0.71; // 5/7 (environ)
const NEXT_SCREEN_NAME: keyof AuthStackParamList = "LocationPermission";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const ContactsPermissionScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const lang = getDeviceLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useSession();

  const handlePermissionRequest = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const { status } = await Contacts.requestPermissionsAsync();
    console.log("[ContactsPermissionScreen] Permission status:", status);
    if (session?.user) {
      // Mettre à jour le statut de permission et l'étape courante dans le profil
      await supabase
        .from("profiles")
        .update({
          contacts_permission_status: status,
          current_registration_step: "contacts_permission",
        })
        .eq("id", session.user.id);
    }
    if (status === "granted") {
      // Récupérer les contacts
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });
      if (data && data.length > 0 && session?.user) {
        // Préparer les contacts à insérer
        const contactsToInsert = data
          .map((contact) => {
            const phone = contact.phoneNumbers?.[0]?.number || null;
            const email = contact.emails?.[0]?.email || null;
            if (!phone && !email) return null;
            return {
              user_id: session.user.id,
              phone_number: phone,
              email: email,
              first_name: contact.firstName || null,
              last_name: contact.lastName || null,
            };
          })
          .filter(Boolean);
        if (contactsToInsert.length > 0) {
          const { error } = await supabase
            .from("phone_contacts")
            .insert(contactsToInsert);
          if (error) {
            console.error("Erreur lors de l'insertion des contacts:", error);
            Alert.alert(t("error_saving_profile", lang), error.message);
          }
        }
      }
    }
    console.log("[ContactsPermissionScreen] Navigating to LocationPermission");
    navigation.navigate(NEXT_SCREEN_NAME);
    setIsLoading(false);
  };

  const handleSkip = async () => {
    if (isLoading) return;
    setIsLoading(true);
    if (session?.user) {
      // Stocker le refus explicite et l'étape courante
      await supabase
        .from("profiles")
        .update({
          contacts_permission_status: "denied",
          current_registration_step: "contacts_permission",
        })
        .eq("id", session.user.id);
    }
    console.log(
      "[ContactsPermissionScreen] Skip pressed, navigating to LocationPermission"
    );
    navigation.navigate(NEXT_SCREEN_NAME);
  };

  return (
    <ScreenLayout
      navigation={navigation}
      title={t("contacts_permission_title", lang)}
      subtitle={t("contacts_permission_subtitle", lang)}
      progress={CONTACTS_PERMISSION_PROGRESS}
      onContinue={handlePermissionRequest}
      continueButtonText={t("contacts_permission_button_allow", lang)} // Ex: "Allow Access"
      continueDisabled={isLoading}
      showAltLink={true}
      altLinkText={t("skip_for_now", lang)} // Ex: "Skip for now"
      onAltLinkPress={handleSkip}
      // isLoading prop retirée si ScreenLayout ne la supporte pas
    >
      <View style={styles.contentContainer}>
        <Image
          source={require("../../../assets/images/register/contacts-illustration.png")}
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

export default ContactsPermissionScreen;

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 0,
    justifyContent: "center", // Center the illustration and loader
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
1. Assurez-vous que la table `profiles` dans Supabase a une colonne
   `contacts_permission_status` (par exemple, de type TEXT) pour stocker
   'granted', 'denied', 'undetermined', ou 'skipped'.

2. Ajoutez les clés de traduction nécessaires:
   "contacts_permission_title": "Help us find your people" (ou équivalent)
   "contacts_permission_subtitle": "Granting access to your contacts helps us connect you with friends already on the platform." (ou équivalent)
   "contacts_permission_button_allow": "Allow Access" (ou "Continue")
   "skip_for_now": "Skip for now"
   "error_session_expired_title": "Session Expired" (déjà demandée)
   "error_session_expired_message": "Your session has expired. Please log in again." (déjà demandée)
   "error_saving_profile": "Error saving profile." (déjà demandée)
   "unexpected_error": "An unexpected error occurred." (déjà demandée)

3. Testez les deux flux : accorder la permission et sauter.
   Vérifiez que `contacts_permission_status` et `current_registration_step` sont
   correctement mis à jour dans Supabase.
4. Si ScreenLayout ne gère pas `isLoading`, l'ActivityIndicator est déjà présent.
*/
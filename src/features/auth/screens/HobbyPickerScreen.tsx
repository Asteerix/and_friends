// HobbyPickerScreen.tsx
// ---------------------------------------------------------------------------
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
type NavProp = StackNavigationProp<AuthStackParamList, "HobbyPicker">;

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const COLORS = {
  white: "#FFFFFF",
  black: "#000000",
  grey0: "#E5E5E5",
  error: "#D32F2F",
};
const HOBBY_SCREEN_PROGRESS = 1.0; // Étape finale
const NEXT_REGISTRATION_SCREEN_NAME: keyof AuthStackParamList = "LoadingScreen";
const FINAL_REGISTRATION_STEP_VALUE = "registration_complete";
const MAX_HOBBIES = 5;

const DEFAULT_HOBBIES = [
  "Painting",
  "Photography",
  "Writing",
  "Singing",
  "Surfing",
  "Running",
  "Playing Instruments",
  "Coding",
  "Hiking",
  "Board Games",
  "Yoga",
  "Biking",
  "Thrifting",
  "Gaming",
  "Dancing",
  "Journaling",
  "Traveling",
  "Reading",
  "Learning Languages",
  "Cooking",
  "Scuba Diving",
  "Gardening",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const HobbyPickerScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const lang = getDeviceLanguage();

  const [allHobbies, setAllHobbies] = useState<string[]>(DEFAULT_HOBBIES);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHobby, setNewHobby] = useState("");
  const [isSaving, setIsSaving] = useState(false); // Renamed from isLoading for clarity
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);

  // Fetch initial hobbies
  useEffect(() => {
    const fetchInitialHobbies = async () => {
      setIsFetchingInitialData(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("hobbies")
            .eq("id", user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            console.error("Error fetching initial hobbies:", error);
            Alert.alert(t("error_loading_profile_generic", lang));
          } else if (data && Array.isArray(data.hobbies)) {
            setSelectedHobbies(data.hobbies);
            const uniqueFetchedHobbies = data.hobbies.filter(
              (h: string) => !DEFAULT_HOBBIES.includes(h)
            );
            if (uniqueFetchedHobbies.length > 0) {
              setAllHobbies((prev) =>
                Array.from(new Set([...prev, ...uniqueFetchedHobbies])).sort()
              );
            } else {
              setAllHobbies((prev) => [...prev].sort()); // Ensure default hobbies are sorted too
            }
          } else {
            setAllHobbies((prev) => [...prev].sort()); // Sort default hobbies if no data
          }
        } catch (e) {
          console.error("Unexpected error fetching hobbies:", e);
          Alert.alert(t("unexpected_error", lang));
        }
      }
      setIsFetchingInitialData(false);
    };
    fetchInitialHobbies();
  }, [lang]);

  const toggleHobby = useCallback(
    (hobby: string) => {
      if (isSaving || isFetchingInitialData) return;
      setSelectedHobbies((prev) => {
        if (prev.includes(hobby)) return prev.filter((x) => x !== hobby);
        if (prev.length >= MAX_HOBBIES) {
          Alert.alert(
            t("hobby_picker_max_title", lang),
            t("hobby_picker_max_message", lang, { max: MAX_HOBBIES })
          );
          return prev;
        }
        return [...prev, hobby];
      });
    },
    [isSaving, isFetchingInitialData, lang]
  );

  const addCustomHobby = () => {
    if (isSaving || isFetchingInitialData) return;
    const trimmedHobby = newHobby.trim();
    if (!trimmedHobby) return;

    if (selectedHobbies.length >= MAX_HOBBIES) {
      Alert.alert(
        t("hobby_picker_max_title", lang),
        t("hobby_picker_max_message", lang, { max: MAX_HOBBIES })
      );
      setModalVisible(false);
      setNewHobby("");
      return;
    }
    if (!allHobbies.includes(trimmedHobby)) {
      setAllHobbies((prev) => [...prev, trimmedHobby].sort());
    }
    if (!selectedHobbies.includes(trimmedHobby)) {
      setSelectedHobbies((prev) => [...prev, trimmedHobby]);
    }
    setNewHobby("");
    setModalVisible(false);
  };

  const updateProfileHobbies = async (hobbiesToSave: string[]) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert(
        t("error_session_expired_title", lang),
        t("error_session_expired_message", lang)
      );
      return false;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          hobbies: hobbiesToSave,
          current_registration_step: FINAL_REGISTRATION_STEP_VALUE,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving hobbies to profile:", error);
        Alert.alert(t("error_saving_profile", lang), error.message);
        return false;
      }
      return true;
    } catch (e: any) {
      console.error("Unexpected error saving hobbies:", e);
      Alert.alert(t("unexpected_error", lang), e.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (isSaving) return; // selectedHobbies.length === 0 is handled by continueDisabled prop
    const success = await updateProfileHobbies(selectedHobbies);
    if (success) {
      // NEXT_SCREEN_NAME est "LoadingScreen", qui est une destination valide pour replace.
      navigation.replace(NEXT_REGISTRATION_SCREEN_NAME);
    }
  };

  const handleSkip = async () => {
    if (isSaving) return;
    const success = await updateProfileHobbies([]); // Save empty array for skip
    if (success) {
      navigation.replace(NEXT_REGISTRATION_SCREEN_NAME);
    }
  };

  const isLoading = isSaving || isFetchingInitialData;

  const renderItem = ({ item }: { item: string }) => (
    <Pressable
      key={item}
      onPress={() => toggleHobby(item)}
      style={[
        styles.chip,
        selectedHobbies.includes(item) && styles.chipSelected,
        isLoading && styles.disabledChip,
      ]}
      disabled={isLoading}
    >
      <Text
        style={[
          styles.chipLabel,
          selectedHobbies.includes(item) && { color: COLORS.white },
        ]}
      >
        {item}
      </Text>
    </Pressable>
  );

  if (isFetchingInitialData && !isSaving) {
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
        title={t("hobby_picker_title", lang)}
        subtitle={t("hobby_picker_subtitle", lang, { max: MAX_HOBBIES })}
        progress={HOBBY_SCREEN_PROGRESS}
        onContinue={handleContinue}
        continueDisabled={selectedHobbies.length === 0 || isLoading}
        showAltLink={true}
        altLinkText={t("skip", lang)}
        onAltLinkPress={handleSkip}
      >
        <View style={styles.contentContainer}>
          <FlatList
            data={allHobbies}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContentContainer}
            showsVerticalScrollIndicator={false}
            style={styles.listStyle}
            numColumns={2} // Example for a 2-column layout
            columnWrapperStyle={styles.row} // For spacing between columns
          />
          <Pressable
            style={[styles.addButton, isLoading && styles.disabledButton]}
            onPress={() => !isLoading && setModalVisible(true)}
            disabled={isLoading}
          >
            <Text style={styles.addButtonText}>
              {t("hobby_picker_add", lang)}
            </Text>
          </Pressable>

          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <KeyboardAvoidingView
              style={styles.modalBackdrop}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>
                  {t("hobby_picker_new", lang)}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder={t("hobby_picker_placeholder", lang)}
                  value={newHobby}
                  onChangeText={setNewHobby}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>
                      {t("cancel", lang)}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.modalAddButton}
                    onPress={addCustomHobby}
                  >
                    <Text style={styles.addButtonText}>{t("add", lang)}</Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      </ScreenLayout>
    </>
  );
};

export default HobbyPickerScreen;

const styles = StyleSheet.create({
  contentContainer: { flex: 1, paddingHorizontal: 10, paddingTop: 10 }, // Reduced padding for more space for chips
  listStyle: { flex: 1 },
  listContentContainer: { paddingBottom: 80, alignItems: "center" }, // Center items if not enough to fill width
  row: { justifyContent: "space-around" }, // Distribute space in rows for numColumns
  chip: {
    borderWidth: 1,
    borderColor: COLORS.grey0,
    borderRadius: 20, // More rounded
    paddingVertical: 10,
    paddingHorizontal: 18,
    margin: 6,
    alignItems: "center",
    justifyContent: "center",
    minWidth: "40%", // Ensure chips take up reasonable space
  },
  chipSelected: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  chipLabel: {
    fontSize: 15,
    color: COLORS.black,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif-medium",
    textAlign: "center",
  },
  disabledChip: { opacity: 0.5 },
  addButton: {
    backgroundColor: COLORS.black,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    marginVertical: 15,
    alignSelf: "center",
    minWidth: 180,
  },
  addButtonText: { fontSize: 16, color: COLORS.white, fontWeight: "600" },
  disabledButton: { backgroundColor: COLORS.grey0 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "stretch",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.grey0,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: COLORS.grey0,
  },
  cancelButtonText: { fontSize: 16, color: COLORS.black, fontWeight: "500" },
  modalAddButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: COLORS.black,
    borderRadius: 8,
    marginLeft: 6,
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
1. Assurez-vous que la table `profiles` dans Supabase a une colonne `hobbies` (type `TEXT[]` ou `JSONB`).
2. Ajoutez/vérifiez les clés de traduction:
   "hobby_picker_title": "Yep, let's talk hobbies"
   "hobby_picker_subtitle": "Select up to {{max}} hobbies that you enjoy."
   "hobby_picker_add": "Add Your Own"
   "hobby_picker_new": "Add a New Hobby"
   "hobby_picker_placeholder": "Enter hobby name..."
   "hobby_picker_max_title": "Limit Reached"
   "hobby_picker_max_message": "You can select up to {{max}} hobbies."
   "add": "Add"
   "cancel": "Cancel"
   (et les clés génériques)
3. Testez la sélection, l'ajout de hobbies custom, la limite, la sauvegarde, le skip, et le pré-remplissage.
*/
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { create } from 'react-native-pixel-perfect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/shared/lib/supabase/client';
import { getDeviceLanguage, t } from '@/shared/locales';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

// HobbyPickerScreen.tsx
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

const COLORS = {
  white: '#FFFFFF',
  black: '#121213',
  gray: '#DFE1E4',
  blue: '#006EFF',
  bluePressed: '#0052CC',
  textGray: '#666666',
};

// Removed - using getProgress() from useAuthNavigation
const FINAL_REGISTRATION_STEP_VALUE = 'registration_complete';
const MAX_HOBBIES = 5;

const DEFAULT_HOBBIES = [
  'Painting',
  'Photography',
  'Writing',
  'Singing',
  'Surfing',
  'Running',
  'Playing Instruments',
  'Coding',
  'Hiking',
  'Board Games',
  'Yoga',
  'Biking',
  'Thrifting',
  'Gaming',
  'Dancing',
  'Journaling',
  'Traveling',
  'Reading',
  'Learning Languages',
  'Cooking',
  'Scuba Diving',
  'Gardening',
];


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
// 1. Types pour les hobbies (pour TS strict)
type HobbyType = {
  text: string;
  isCustom?: boolean;
  isAdd?: boolean;
};

const HobbyPickerScreen: React.FC = React.memo(() => {
  const router = useRouter();
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('hobby-picker');
  const lang = getDeviceLanguage();
  const { currentStep, isComplete, loading: onboardingLoading } = useOnboardingStatus();
  const insets = useSafeAreaInsets();

  // Save registration step
  useRegistrationStep('hobby_picker');

  const handleBackPress = () => {
    navigateBack();
  };

  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newHobby, setNewHobby] = useState('');
  const [isSaving, setIsSaving] = useState(false); // Renamed from isLoading for clarity
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
  const [customHobbies, setCustomHobbies] = useState<string[]>([]);

  useEffect(() => {
    if (!onboardingLoading && currentStep && currentStep !== 'HobbyPicker') {
      // Si ce n'est pas l'étape HobbyPicker, on redirige vers la page loading si tout est rempli
      if (isComplete) {
        router.replace('/(auth)/loading');
      } else {
        // Sinon, on redirige vers la bonne étape
        // (Pas d'étape suivante après HobbyPicker, donc on redirige vers loading)
        router.replace('/(auth)/loading');
      }
    }
  }, [onboardingLoading, currentStep, isComplete, router]);

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
            .from('profiles')
            .select('hobbies')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching initial hobbies:', error);
            Alert.alert(t('error_loading_profile_generic', lang));
          } else if (data && Array.isArray(data.hobbies)) {
            setSelectedHobbies(data.hobbies);
            // Les custom hobbies sont gérés séparément
            const uniqueFetchedHobbies = data.hobbies.filter(
              (h: string) => !DEFAULT_HOBBIES.includes(h)
            );
            if (uniqueFetchedHobbies.length > 0) {
              setCustomHobbies(uniqueFetchedHobbies);
            }
          }
        } catch (e) {
          console.error('Unexpected error fetching hobbies:', e);
          Alert.alert(t('unexpected_error', lang));
        }
      }
      setIsFetchingInitialData(false);
    };
    void fetchInitialHobbies();
  }, [lang]);

  const toggleHobby = useCallback(
    (hobby: string) => {
      if (isSaving || isFetchingInitialData) return;
      setSelectedHobbies((prev) => {
        if (prev.includes(hobby)) return prev.filter((x) => x !== hobby);
        if (prev.length >= MAX_HOBBIES) {
          Alert.alert(
            t('hobby_picker_max_title', lang),
            t('hobby_picker_max_message', lang, { max: MAX_HOBBIES })
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
        t('hobby_picker_max_title', lang),
        t('hobby_picker_max_message', lang, { max: MAX_HOBBIES })
      );
      setModalVisible(false);
      setNewHobby('');
      return;
    }
    if (!DEFAULT_HOBBIES.includes(trimmedHobby) && !customHobbies.includes(trimmedHobby)) {
      setCustomHobbies((prev) => [...prev, trimmedHobby]);
    }
    if (!selectedHobbies.includes(trimmedHobby)) {
      setSelectedHobbies((prev) => [...prev, trimmedHobby]);
    }
    setNewHobby('');
    setModalVisible(false);
  };

  const updateProfileHobbies = async (hobbiesToSave: string[]) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert(t('error_session_expired_title', lang), t('error_session_expired_message', lang));
      return false;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          hobbies: hobbiesToSave,
          current_registration_step: FINAL_REGISTRATION_STEP_VALUE,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving hobbies to profile:', error);
        Alert.alert(t('error_saving_profile', lang), error.message);
        return false;
      }
      return true;
    } catch (e: unknown) {
      console.error('Unexpected error saving hobbies:', e);
      Alert.alert(t('unexpected_error', lang), e instanceof Error ? e.message : String(e));
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
      navigateNext('loading');
    }
  };


  const isLoading = isSaving || isFetchingInitialData;

  // 2. Construction de la liste des hobbies pour affichage (ordre strict, grille compacte)
  const allHobbies: HobbyType[] = [
    { text: 'Painting' },
    { text: 'Photography' },
    { text: 'Writing' },
    { text: 'Singing' },
    { text: 'Surfing' },
    { text: 'Running' },
    { text: 'Playing Instruments' },
    { text: 'Coding' },
    { text: 'Hiking' },
    { text: 'Board Games' },
    { text: 'Yoga' },
    { text: 'Biking' },
    { text: 'Thrifting' },
    { text: 'Gaming' },
    { text: 'Dancing' },
    { text: 'Journaling' },
    { text: 'Traveling' },
    { text: 'Reading' },
    { text: 'Learning Languages' },
    { text: 'Cooking' },
    { text: 'Scuba Diving' },
    { text: 'Gardening' },
    ...customHobbies.map((h) => ({ text: h, isCustom: true })),
    { text: '+ Add Your Own', isAdd: true },
  ];

  if (isFetchingInitialData && !isSaving) {
    return (
      <View style={styles.loadingScreenContainer}>
        <ActivityIndicator size="large" color={COLORS.black} />
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      {/* Header Row avec back et progress bar */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.5 : 1 }]}
          onPress={handleBackPress}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          Yep, let's talk hobbies
        </Text>
        <Text style={styles.subtitle}>This helps you find people who get it. Select up to 5.</Text>
        <View style={styles.gridContainer}>
          {allHobbies.map((hobby) => {
            const isSelected = selectedHobbies.includes(hobby.text);
            if (hobby.isAdd) {
              return (
                <Pressable
                  key="add"
                  style={({ pressed }) => [
                    styles.chip,
                    styles.addChip,
                    pressed && styles.chipPressed,
                    isLoading && styles.disabledChip,
                  ]}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Add your own hobby"
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.addChipText}>+ Add Your Own</Text>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={hobby.text}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && styles.chipSelected,
                  pressed && styles.chipPressed,
                  isLoading && styles.disabledChip,
                ]}
                disabled={isLoading}
                accessibilityRole="checkbox"
                accessibilityLabel={hobby.text}
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggleHobby(hobby.text)}
              >
                <Text
                  style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {hobby.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <Pressable
        style={({ pressed }) => [
          styles.continueBtn,
          selectedHobbies.length === 0 && styles.continueBtnDisabled,
          pressed && selectedHobbies.length > 0 && styles.continueBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        disabled={selectedHobbies.length === 0}
        onPress={handleContinue}
      >
        <Text style={styles.continueBtnText}>Continue</Text>
      </Pressable>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add your hobby</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type your hobby"
              value={newHobby}
              onChangeText={setNewHobby}
              autoFocus
              accessibilityLabel="Type your hobby"
              returnKeyType="done"
              onSubmitEditing={addCustomHobby}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalAdd}
                accessibilityRole="button"
                accessibilityLabel="Add hobby"
                onPress={addCustomHobby}
              >
                <Text style={styles.modalAddText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: perfectSize(24),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: perfectSize(8),
    marginBottom: perfectSize(16),
  },
  backButton: {
    width: perfectSize(44),
    height: perfectSize(44),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: {
    fontSize: perfectSize(28),
    color: COLORS.blue,
    marginLeft: perfectSize(0),
  },
  progressTrack: {
    flex: 1,
    height: perfectSize(2),
    backgroundColor: '#E5E5E5',
    marginLeft: perfectSize(8),
    marginRight: perfectSize(8),
    borderRadius: perfectSize(1),
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.blue,
    borderRadius: perfectSize(1),
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: perfectSize(8),
    paddingBottom: perfectSize(24),
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
    fontSize: perfectSize(32),
    fontWeight: '400',
    textAlign: 'center',
    marginTop: perfectSize(32),
    marginBottom: perfectSize(12),
    color: COLORS.black,
    lineHeight: perfectSize(38),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: perfectSize(17),
    color: '#666666',
    textAlign: 'center',
    marginBottom: perfectSize(32),
    lineHeight: perfectSize(24),
    paddingHorizontal: perfectSize(32),
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
    width: '100%',
    alignSelf: 'center',
    marginTop: perfectSize(10),
    marginBottom: perfectSize(10),
    marginHorizontal: 0,
    justifyContent: 'center',
  },
  chip: {
    minWidth: perfectSize(90),
    height: perfectSize(48),
    backgroundColor: COLORS.white,
    borderColor: COLORS.gray,
    borderWidth: 1.5,
    borderRadius: perfectSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: perfectSize(6),
    paddingHorizontal: perfectSize(12),
    margin: perfectSize(6),
    overflow: 'hidden',
    flexDirection: 'row',
  },
  chipSelected: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
    borderWidth: 0,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipLabel: {
    fontFamily: 'Inter',
    fontSize: perfectSize(15),
    lineHeight: perfectSize(20),
    color: COLORS.black,
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
  },
  chipLabelSelected: {
    color: COLORS.white,
  },
  disabledChip: {
    opacity: 0.6,
  },
  addChip: {
    borderStyle: 'dashed',
    borderColor: COLORS.gray,
    backgroundColor: COLORS.white,
  },
  addChipText: {
    fontFamily: 'Inter',
    fontSize: perfectSize(15),
    lineHeight: perfectSize(20),
    color: COLORS.black,
    fontWeight: '500',
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: COLORS.blue,
    borderRadius: perfectSize(12),
    marginHorizontal: perfectSize(16),
    marginBottom: perfectSize(24),
    height: perfectSize(52),
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.blue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  continueBtnDisabled: {
    backgroundColor: '#B3D1FF',
  },
  continueBtnPressed: {
    opacity: 0.8,
  },
  continueBtnText: {
    color: COLORS.white,
    fontSize: perfectSize(18),
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: COLORS.white,
    borderRadius: perfectSize(16),
    padding: perfectSize(20),
    alignItems: 'stretch',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalTitle: {
    fontSize: perfectSize(18),
    fontWeight: '600',
    marginBottom: perfectSize(12),
    textAlign: 'center',
    color: COLORS.black,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: perfectSize(8),
    paddingVertical: perfectSize(10),
    paddingHorizontal: perfectSize(14),
    fontSize: perfectSize(16),
    marginBottom: perfectSize(18),
    color: COLORS.black,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: perfectSize(10),
    borderRadius: perfectSize(8),
    backgroundColor: COLORS.gray,
    marginRight: perfectSize(8),
  },
  modalCancelText: {
    fontSize: perfectSize(16),
    color: COLORS.black,
    fontWeight: '500',
  },
  modalAdd: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: perfectSize(10),
    borderRadius: perfectSize(8),
    backgroundColor: COLORS.blue,
    marginLeft: perfectSize(8),
  },
  modalAddText: {
    fontSize: perfectSize(16),
    color: COLORS.white,
    fontWeight: '600',
  },
  loadingScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
});

export default HobbyPickerScreen;

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

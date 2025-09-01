import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'react-native-pixel-perfect';
import Animated, { FadeInDown } from 'react-native-reanimated';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

interface Language {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

interface LanguageSwitcherProps {
  style?: any;
  buttonStyle?: any;
  textStyle?: any;
  showLabel?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  style,
  buttonStyle,
  textStyle,
  showLabel = true,
}) => {
  const { i18n, t } = useTranslation();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const currentLanguage = LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      await AsyncStorage.setItem('app_language', languageCode);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <View style={style}>
      <TouchableOpacity
        style={[styles.button, buttonStyle]}
        onPress={() => setIsModalVisible(true)}
        accessibilityLabel={t('settings.preferences.language')}
      >
        <Text style={[styles.flag, textStyle]}>{currentLanguage.flag}</Text>
        {showLabel && <Text style={[styles.languageName, textStyle]}>{currentLanguage.name}</Text>}
        <Text style={[styles.chevron, textStyle]}>▼</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
          <Animated.View
            entering={FadeInDown.duration(300).springify()}
            style={styles.modalContent}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('settings.preferences.language')}</Text>

            {LANGUAGES.map((language) => (
              <Pressable
                key={language.code}
                style={({ pressed }) => [
                  styles.languageItem,
                  pressed && styles.languageItemPressed,
                  currentLanguage.code === language.code && styles.languageItemSelected,
                ]}
                onPress={() => changeLanguage(language.code)}
              >
                <View style={styles.languageItemContent}>
                  <Text style={styles.languageFlag}>{language.flag}</Text>
                  <Text
                    style={[
                      styles.languageItemName,
                      currentLanguage.code === language.code && styles.languageItemNameSelected,
                    ]}
                  >
                    {language.name}
                  </Text>
                  {currentLanguage.code === language.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: perfectSize(12),
    paddingVertical: perfectSize(8),
    borderRadius: perfectSize(8),
    backgroundColor: '#F3F4F6',
  },
  flag: {
    fontSize: perfectSize(20),
    marginRight: perfectSize(8),
  },
  languageName: {
    fontSize: perfectSize(16),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#374151',
    marginRight: perfectSize(4),
  },
  chevron: {
    fontSize: perfectSize(10),
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: perfectSize(24),
    borderTopRightRadius: perfectSize(24),
    paddingTop: perfectSize(12),
    paddingBottom: perfectSize(20),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHandle: {
    width: perfectSize(40),
    height: perfectSize(4),
    backgroundColor: '#E5E5E5',
    borderRadius: perfectSize(2),
    alignSelf: 'center',
    marginBottom: perfectSize(20),
  },
  modalTitle: {
    fontSize: perfectSize(20),
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: perfectSize(20),
  },
  languageItem: {
    paddingVertical: perfectSize(16),
    paddingHorizontal: perfectSize(20),
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  languageItemPressed: {
    backgroundColor: '#F9FAFB',
  },
  languageItemSelected: {
    backgroundColor: '#F0F4FF',
    borderBottomColor: '#E0E7FF',
  },
  languageItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFlag: {
    fontSize: perfectSize(28),
    marginRight: perfectSize(16),
  },
  languageItemName: {
    flex: 1,
    fontSize: perfectSize(17),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#111827',
  },
  languageItemNameSelected: {
    fontWeight: '600',
    color: '#000000',
  },
  checkmark: {
    fontSize: perfectSize(20),
    color: '#016fff',
    fontWeight: '600',
  },
});

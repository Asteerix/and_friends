import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  SafeAreaView,
  Pressable,
  AccessibilityRole,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { create } from 'react-native-pixel-perfect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/shared/lib/supabase/client';
import { useAuthNavigation } from '@/shared/hooks/useAuthNavigation';
import { useRegistrationStep } from '@/shared/hooks/useRegistrationStep';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

const PathInputScreen: React.FC = React.memo(() => {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
  const insets = useSafeAreaInsets();
  const { navigateBack, navigateNext, getProgress } = useAuthNavigation('path-input');
  useRegistrationStep('path_input');

  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetchingInitialData(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('path')
            .eq('id', user.id)
            .single();
          if (data?.path) {
            setValue(data.path);
          }
        } catch {}
      }
      setIsFetchingInitialData(false);
    };
    void fetchProfile();
  }, []);

  const handleContinue = async () => {
    if (!value.trim()) {
      Alert.alert('Required', 'Please enter your path');
      return;
    }

    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Session expired', 'Please log in again.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          path: value.trim(),
          current_registration_step: 'jam_picker',
        })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        navigateNext('jam-picker');
      }
    } catch (e) {
      Alert.alert('Unexpected error', e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingInitialData && !isLoading) {
    return (
      <View style={styles.loadingScreenContainer}>
        <ActivityIndicator size="large" color="#1677FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        {/* Header bar with back arrow and progress */}
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={navigateBack}
            hitSlop={16}
            style={styles.backBtn}
            disabled={isLoading}
          >
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </Pressable>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${getProgress() * 100}%` }]} />
          </View>
        </View>

        {/* Title */}
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel="What's your path?"
        >
          What's your <Text style={styles.titleItalic}>path?</Text>
        </Text>
        {/* Subtitle */}
        <Text
          style={styles.subtitle}
          accessibilityLabel="Work, school, or anything else — it helps us find your crew."
        >
          Work, school, or anything else — it helps us find your crew.
        </Text>

        {/* Input */}
        <TextInput
          style={styles.input}
          placeholder="Job, School, Freelance, Exploring..."
          placeholderTextColor="#B0B0B0"
          value={value}
          onChangeText={setValue}
          accessibilityLabel="Your path"
          accessibilityRole="search"
          returnKeyType="done"
        />

        {/* Illustration */}
        <Image
          source={require('@/assets/images/register/life.png')}
          style={styles.illustration}
          resizeMode="contain"
          accessible
          accessibilityLabel="Person with a drink illustration"
        />

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.button, (isLoading || !value.trim()) && { opacity: 0.5 }]}
          activeOpacity={0.8}
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          disabled={isLoading || !value.trim()}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingHorizontal: perfectSize(24),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: perfectSize(8),
    marginBottom: perfectSize(24),
  },
  backBtn: {
    width: perfectSize(32),
    height: perfectSize(32),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backArrow: {
    fontSize: perfectSize(24),
    color: '#007AFF',
    fontWeight: '400',
    marginLeft: perfectSize(2),
  },
  progressBarBg: {
    flex: 1,
    height: perfectSize(3),
    backgroundColor: '#EAF1FF',
    borderRadius: perfectSize(2),
    marginLeft: perfectSize(8),
    justifyContent: 'center',
  },
  progressBarFill: {
    height: perfectSize(3),
    backgroundColor: '#2196F3',
    borderRadius: perfectSize(2),
  },
  title: {
    width: '100%',
    textAlign: 'center',
    fontSize: perfectSize(34),
    fontFamily: 'Times New Roman', // Replace with custom if needed
    fontWeight: '400',
    color: '#111',
    marginTop: perfectSize(16),
    marginBottom: perfectSize(8),
    lineHeight: perfectSize(40),
  },
  titleItalic: {
    fontStyle: 'italic',
  },
  subtitle: {
    width: '100%',
    textAlign: 'center',
    fontSize: perfectSize(17),
    color: '#6B6B6B',
    fontWeight: '400',
    marginBottom: perfectSize(32),
    lineHeight: perfectSize(22),
  },
  input: {
    width: '100%',
    height: perfectSize(48),
    borderRadius: perfectSize(10),
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    paddingHorizontal: perfectSize(16),
    fontSize: perfectSize(17),
    color: '#222',
    marginBottom: perfectSize(32),
  },
  illustration: {
    width: perfectSize(260),
    height: perfectSize(220),
    marginBottom: perfectSize(24),
    marginTop: perfectSize(8),
  },
  button: {
    width: '100%',
    height: perfectSize(56),
    backgroundColor: '#1677FF',
    borderRadius: perfectSize(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: perfectSize(24),
    ...Platform.select({
      ios: {
        shadowColor: '#1677FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  buttonText: {
    color: '#fff',
    fontSize: perfectSize(19),
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  loadingScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default PathInputScreen;

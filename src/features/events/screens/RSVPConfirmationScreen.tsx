import * as Calendar from 'expo-calendar';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import CustomText, { AfterHoursText } from '@/shared/ui/CustomText';
import GradientBackground from '@/shared/ui/GradientBackground';

const { width } = Dimensions.get('window');

const confirmationThemes = {
  beer: {
    gradient: ['#FFD93D', '#FFE873'] as [string, string],
    illustration: require('@/assets/images/relax.png'), // Replace with beer illustration
    color: '#FFD93D',
  },
  disco: {
    gradient: ['#FF6B9D', '#FFC4D6'] as [string, string],
    illustration: require('@/assets/images/relax.png'), // Replace with disco ball
    color: '#FF6B9D',
  },
  wine: {
    gradient: ['#8B5CF6', '#A78BFA'] as [string, string],
    illustration: require('@/assets/images/register/wine.png'),
    color: '#8B5CF6',
  },
  birthday: {
    gradient: ['#6BCF7F', '#92E3A9'] as [string, string],
    illustration: require('@/assets/images/relax.png'), // Replace with cake
    color: '#6BCF7F',
  },
  dance: {
    gradient: ['#45B7D1', '#3498DB'] as [string, string],
    illustration: require('@/assets/images/relax.png'), // Replace with dancing figure
    color: '#45B7D1',
  },
  geometric: {
    gradient: ['#FF6B6B', '#FF8787'] as [string, string],
    illustration: require('@/assets/images/scribble.png'),
    color: '#FF6B6B',
  },
};

export default function RSVPConfirmationScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ eventName: string; eventDate: string; theme?: string }>();
  const { eventName, eventDate, theme = 'beer' } = params;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const illustrationAnim = useRef(new Animated.Value(0)).current;

  const currentTheme =
    confirmationThemes[theme as keyof typeof confirmationThemes] || confirmationThemes.beer;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(illustrationAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleAddToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const defaultCalendar = calendars.find((cal) => cal.allowsModifications);

        if (defaultCalendar) {
          await Calendar.createEventAsync(defaultCalendar.id, {
            title: eventName,
            startDate: new Date(eventDate),
            endDate: new Date(eventDate),
            timeZone: 'GMT',
          });

          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I'm going to ${eventName}! 🎉`,
        url: 'https://andfriends.app/event/',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleClose = () => {
    void router.back();
  };

  return (
    <GradientBackground colors={currentTheme.gradient} animated>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <CustomText size="xl" color="#000">
            ×
          </CustomText>
        </TouchableOpacity>

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.illustrationContainer,
              {
                opacity: illustrationAnim,
                transform: [
                  { scale: illustrationAnim },
                  {
                    rotate: illustrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={currentTheme.illustration} style={styles.illustration} />
          </Animated.View>

          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <AfterHoursText size="xxl" color="#000" align="center" style={styles.title}>
              You are in!
            </AfterHoursText>
            <CustomText size="xl" color="#000" align="center" style={styles.eventName}>
              {eventName}
            </CustomText>
          </Animated.View>

          <Animated.View
            style={[
              styles.buttonsContainer,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.button, { backgroundColor: currentTheme.color }]}
              onPress={handleAddToCalendar}
              activeOpacity={0.8}
            >
              <CustomText size="lg" color="#FFF" weight="bold">
                Add to Calendar
              </CustomText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.shareButton]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <CustomText size="lg" color={currentTheme.color} weight="bold">
                Share with Friends
              </CustomText>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  illustrationContainer: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: 40,
  },
  illustration: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    marginBottom: 10,
  },
  eventName: {
    opacity: 0.8,
  },
  buttonsContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#000',
  },
});

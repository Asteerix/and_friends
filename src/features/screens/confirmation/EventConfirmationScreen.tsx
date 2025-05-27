import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const confirmationAnimations = [
  {
    type: 'cheers',
    animation: require('../../../assets/animations/cheers.json'),
    colors: ['#FF6B6B', '#FF8787'] as [string, string],
  },
  {
    type: 'disco',
    animation: require('../../../assets/animations/disco.json'),
    colors: ['#4ECDC4', '#44A3AA'] as [string, string],
  },
  {
    type: 'champagne',
    animation: require('../../../assets/animations/champagne.json'),
    colors: ['#45B7D1', '#3498DB'] as [string, string],
  },
  {
    type: 'cake',
    animation: require('../../../assets/animations/cake.json'),
    colors: ['#96CEB4', '#88C999'] as [string, string],
  },
  {
    type: 'dance',
    animation: require('../../../assets/animations/dance.json'),
    colors: ['#DDA0DD', '#BA55D3'] as [string, string],
  },
];

export default function EventConfirmationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId, eventTitle, eventDate } = route.params as any;
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  
  const randomAnimation = confirmationAnimations[Math.floor(Math.random() * confirmationAnimations.length)];

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleAddToCalendar = async () => {
    // TODO: Implement calendar integration
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShareInvite = async () => {
    try {
      await Share.share({
        message: `Join me at ${eventTitle}! 🎉\n\nDate: ${eventDate}\n\nRSVP on & friends app`,
        title: `Invitation to ${eventTitle}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDone = () => {
    navigation.navigate('EventDetails' as never, { eventId } as never);
  };

  return (
    <LinearGradient colors={randomAnimation.colors} style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.successContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark-circle" size={80} color="white" />
          </View>
          <Text style={styles.title}>You are in!</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.animationContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  scale: bounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Placeholder for animation - would use LottieView in real app */}
          <View style={styles.animationPlaceholder}>
            <Text style={styles.animationEmoji}>🎉</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.buttonsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: bounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              })}],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAddToCalendar}
          >
            <Ionicons name="calendar-outline" size={24} color="#333" />
            <Text style={styles.primaryButtonText}>Add to Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleShareInvite}
          >
            <Ionicons name="share-outline" size={24} color="white" />
            <Text style={styles.secondaryButtonText}>Share Invite</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  checkmarkContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    textAlign: 'center',
  },
  animationContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  animationPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationEmoji: {
    fontSize: 100,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'white',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 10,
  },
  doneButton: {
    paddingHorizontal: 50,
    paddingVertical: 12,
  },
  doneButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textDecorationLine: 'underline',
  },
});
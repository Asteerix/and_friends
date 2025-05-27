import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

export default function PersonCardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { person } = route.params as any;
  
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        Animated.spring(scale, {
          toValue: 0.95,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        if (gestureState.dy > 100) {
          // Swipe down to dismiss
          Animated.timing(pan, {
            toValue: { x: 0, y: height },
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            navigation.goBack();
          });
        } else {
          // Spring back
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleConnect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Implement connection request
  };

  const opacity = pan.y.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { translateY: pan.y },
              { scale },
            ],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Image source={{ uri: person.avatar }} style={styles.image} />
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <BlurView intensity={80} tint="dark" style={styles.blurButton}>
            <Ionicons name="close" size={24} color="white" />
          </BlurView>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <View style={styles.mainInfo}>
            <Text style={styles.name}>{person.name}</Text>
            <Text style={styles.age}>{person.age}</Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.locationContainer}>
              <Text style={styles.flag}>{person.countryFlag}</Text>
              <Text style={styles.location}>{person.location}</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="briefcase-outline" size={20} color="white" />
                <Text style={styles.statText}>{person.job}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={20} color="white" />
                <Text style={styles.statText}>{person.followers} followers</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
            <LinearGradient
              colors={['#45B7D1', '#3498DB']}
              style={styles.connectButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="person-add-outline" size={20} color="white" />
              <Text style={styles.connectButtonText}>Connect</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.swipeHint}>
            <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.swipeHintText}>Swipe down to close</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  blurButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 30,
    paddingBottom: 50,
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  name: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    marginRight: 10,
  },
  age: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '300',
  },
  detailsContainer: {
    marginBottom: 30,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  flag: {
    fontSize: 24,
    marginRight: 10,
  },
  location: {
    fontSize: 18,
    color: 'white',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  connectButton: {
    marginBottom: 20,
  },
  connectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
  },
  connectButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  swipeHint: {
    alignItems: 'center',
    opacity: 0.5,
  },
  swipeHintText: {
    fontSize: 14,
    color: 'white',
    marginTop: 5,
  },
});
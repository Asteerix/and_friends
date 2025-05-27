import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import CustomText, { AfterHoursText, PlayfairText } from "@/components/common/CustomText";
import { useProfile } from "@/hooks/useProfile";
import { format } from 'date-fns';

const { width, height } = Dimensions.get('window');

export default function PersonCardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = route.params as any;
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const { fetchProfile } = useProfile();

  useEffect(() => {
    loadUserProfile();
    animateIn();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await fetchProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const animateIn = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => navigation.goBack());
  };

  const handleConnect = () => {
    setIsFollowing(!isFollowing);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleMessage = () => {
    navigation.navigate('ConversationScreen' as never, { userId } as never);
  };

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
      </View>
    );
  }

  const age = userProfile.birth_date
    ? new Date().getFullYear() - new Date(userProfile.birth_date).getFullYear()
    : null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}
      >
        <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.handle} />
        
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {userProfile.cover_url ? (
            <Image source={{ uri: userProfile.cover_url }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder} />
          )}

          <View style={styles.profileSection}>
            {userProfile.avatar_url ? (
              <Image source={{ uri: userProfile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <CustomText size="xxl">👤</CustomText>
              </View>
            )}

            <AfterHoursText size="xxl" style={styles.name}>
              {userProfile.full_name || userProfile.username || 'Unknown'}
            </AfterHoursText>

            {userProfile.username && (
              <CustomText size="md" color="#666" style={styles.username}>
                @{userProfile.username}
              </CustomText>
            )}

            {userProfile.bio && (
              <CustomText size="md" align="center" style={styles.bio}>
                {userProfile.bio}
              </CustomText>
            )}

            <View style={styles.infoRow}>
              {userProfile.path && (
                <View style={styles.infoItem}>
                  <CustomText size="sm">💼</CustomText>
                  <CustomText size="sm" color="#666" style={styles.infoText}>
                    {userProfile.path}
                  </CustomText>
                </View>
              )}
              
              {age && !userProfile.hide_birth_date && (
                <View style={styles.infoItem}>
                  <CustomText size="sm">🎂</CustomText>
                  <CustomText size="sm" color="#666" style={styles.infoText}>
                    {age} years old
                  </CustomText>
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, isFollowing && styles.buttonSecondary]}
                onPress={handleConnect}
                activeOpacity={0.8}
              >
                <CustomText
                  size="md"
                  color={isFollowing ? '#000' : '#FFF'}
                  weight="bold"
                >
                  {isFollowing ? 'Following' : 'Connect'}
                </CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleMessage}
                activeOpacity={0.8}
              >
                <CustomText size="md" weight="bold">
                  Message
                </CustomText>
              </TouchableOpacity>
            </View>

            {(userProfile.selected_jams?.length > 0 ||
              userProfile.selected_restaurants?.length > 0 ||
              userProfile.hobbies?.length > 0) && (
              <View style={styles.interestsSection}>
                <PlayfairText size="lg" style={styles.sectionTitle}>
                  Interests
                </PlayfairText>

                {userProfile.selected_jams?.length > 0 && (
                  <View style={styles.interestGroup}>
                    <CustomText size="sm" color="#666">🎵 Music</CustomText>
                    <View style={styles.tagList}>
                      {userProfile.selected_jams.map((jam: string, index: number) => (
                        <View key={index} style={styles.tag}>
                          <CustomText size="sm">{jam}</CustomText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {userProfile.selected_restaurants?.length > 0 && (
                  <View style={styles.interestGroup}>
                    <CustomText size="sm" color="#666">🍽 Restaurants</CustomText>
                    <View style={styles.tagList}>
                      {userProfile.selected_restaurants.map((restaurant: string, index: number) => (
                        <View key={index} style={styles.tag}>
                          <CustomText size="sm">{restaurant}</CustomText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {userProfile.hobbies?.length > 0 && (
                  <View style={styles.interestGroup}>
                    <CustomText size="sm" color="#666">✨ Hobbies</CustomText>
                    <View style={styles.tagList}>
                      {userProfile.hobbies.map((hobby: string, index: number) => (
                        <View key={index} style={styles.tag}>
                          <CustomText size="sm">{hobby}</CustomText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
    minHeight: height * 0.7,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  coverImage: {
    width: '100%',
    height: 150,
  },
  coverPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#F5F5F5',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: -50,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -50,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  name: {
    marginTop: 16,
    marginBottom: 4,
  },
  username: {
    marginBottom: 12,
  },
  bio: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  infoText: {
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#000',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginHorizontal: 8,
  },
  buttonSecondary: {
    backgroundColor: '#F5F5F5',
  },
  interestsSection: {
    width: '100%',
  },
  sectionTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  interestGroup: {
    marginBottom: 16,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
});
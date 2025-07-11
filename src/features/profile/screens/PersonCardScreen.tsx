import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/shared/lib/supabase/client';
import CustomText, { AfterHoursText, PlayfairText } from '@/shared/ui/CustomText';
import { useSession } from '@/shared/providers/SessionContext';
import ProfileOptionsButton from '@/features/profiles/components/ProfileOptionsButton';

const { height } = Dimensions.get('window');

export default function PersonCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = params.userId;
  const { session } = useSession();

  const [userProfile, setUserProfile] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserProfile();
    animateIn();
  }, [userId]);

  const loadUserProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (error) throw error;
      setUserProfile(data);
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


  const handleConnect = () => {
    setIsFollowing(!isFollowing);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleMessage = () => {
    void router.push(`/screens/conversation?userId=${userId}`);
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
      <View style={styles.coverContainer}>
        {userProfile.avatar_url ? (
          <Image source={{ uri: userProfile.avatar_url }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}
        <View style={styles.topRightIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble-ellipses-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <ProfileOptionsButton
            userId={userId}
            userName={userProfile.full_name || userProfile.username || 'Unknown'}
            isOwnProfile={userId === session?.user?.id}
            trigger={
              <View style={styles.iconBtn}>
                <Ionicons name="ellipsis-horizontal" size={26} color="#fff" />
              </View>
            }
          />
        </View>
      </View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.profileMain}>
            <View style={styles.flagRow}>
              {userProfile.country && (
                <CustomText size="lg" style={{ marginRight: 6 }}>
                  🇺🇸
                </CustomText>
              )}
              {userProfile.city && (
                <CustomText size="md" color="#888">
                  {userProfile.country ? `${userProfile.country}, ` : ''}
                  {userProfile.city}
                </CustomText>
              )}
            </View>
            <AfterHoursText size="xxl" style={styles.name}>
              {userProfile.full_name || userProfile.username || 'Unknown'}
            </AfterHoursText>
            <CustomText size="lg" color="#222" style={styles.ageFollowersRow}>
              {age ? `${age} ans` : ''}
              {userProfile.followers_count ? ` • ${userProfile.followers_count} followers` : ''}
            </CustomText>
            <CustomText size="md" color="#888" style={{ marginBottom: 12 }}>
              {userProfile.bio || 'Self-employed'}
            </CustomText>
            <TouchableOpacity
              style={[styles.connectBtn, isFollowing && styles.connectBtnActive]}
              onPress={handleConnect}
              activeOpacity={0.8}
            >
              <CustomText size="md" color={isFollowing ? '#000' : '#FFF'} weight="bold">
                {isFollowing ? 'Following' : 'Connect'}
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
                  <CustomText size="sm" color="#666">
                    🎵 Music
                  </CustomText>
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
                  <CustomText size="sm" color="#666">
                    🍽 Restaurants
                  </CustomText>
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
                  <CustomText size="sm" color="#666">
                    ✨ Hobbies
                  </CustomText>
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
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  coverContainer: {
    width: '100%',
    height: 390,
    position: 'relative',
    backgroundColor: '#222',
  },
  coverImage: {
    width: '100%',
    height: 390,
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: 390,
    backgroundColor: '#F5F5F5',
  },
  topRightIcons: {
    position: 'absolute',
    top: 40,
    right: 20,
    flexDirection: 'row',
    gap: 16,
    zIndex: 2,
  },
  iconBtn: {
    marginLeft: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    padding: 6,
  },
  sheet: {
    position: 'absolute',
    top: 340,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: 400,
    paddingTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileMain: {
    alignItems: 'center',
    marginBottom: 24,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    marginBottom: 4,
  },
  ageFollowersRow: {
    marginBottom: 8,
  },
  connectBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
    marginBottom: 8,
  },
  connectBtnActive: {
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

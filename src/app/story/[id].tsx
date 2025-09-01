import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

export default function StoryDeepLinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadStory();
    }
  }, [id]);

  const loadStory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stories')
        .select(
          `
          *,
          user:profiles!stories_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setStory(data);

        // If user is logged in, redirect to the story viewer
        if (session?.user) {
          router.replace(`/screens/stories/viewer?userId=${data.user_id}&storyId=${id}`);
        }
      }
    } catch (err) {
      console.error('Error loading story:', err);
      setError('Story not found or has expired');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    // Save the story ID to redirect after login
    router.push(`/auth/login?redirect=/story/${id}`);
  };

  const handleSignup = () => {
    // Save the story ID to redirect after signup
    router.push(`/auth/signup?redirect=/story/${id}`);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  if (error || !story) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={64} color="#999" />
        <Text style={styles.errorText}>{error || 'Story not found'}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/')}>
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If user is not logged in, show preview
  if (!session?.user) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: story.media_url }} style={styles.previewImage} resizeMode="cover" />

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradient} />

        <View style={styles.content}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: story.user?.avatar_url || 'https://via.placeholder.com/48' }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.username}>@{story.user?.username || 'unknown'}</Text>
              <Text style={styles.fullName}>{story.user?.full_name || ''}</Text>
            </View>
          </View>

          {story.caption && <Text style={styles.caption}>{story.caption}</Text>}

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={20} color="#FFF" />
              <Text style={styles.statText}>{story.views_count || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={20} color="#FFF" />
              <Text style={styles.statText}>{story.likes_count || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
              <Text style={styles.statText}>{story.replies_count || 0}</Text>
            </View>
          </View>

          <Text style={styles.ctaText}>Join AndFriends to view this story and more!</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
            <Text style={styles.primaryButtonText}>Sign Up Free</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleLogin}>
            <Text style={styles.secondaryButtonText}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null; // Will redirect if logged in
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  username: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  fullName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  caption: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ctaText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 28,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#999',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#FF4458',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

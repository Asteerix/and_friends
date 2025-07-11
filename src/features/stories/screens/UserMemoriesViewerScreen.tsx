import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useMemories } from '@/shared/providers/MemoriesProvider';
import { useSession } from '@/shared/providers/SessionContext';
import { Video, ResizeMode } from 'expo-av';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { supabase } from '@/shared/lib/supabase/client';
import { useStories } from '@/shared/providers/StoriesContext';
import ReportModal from '@/features/reports/components/ReportModal';

type Reply = {
  id: string;
  story_id: string;
  user_id: string;
  parent_reply_id: string | null;
  text: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    username: string;
    avatar_url: string;
    full_name: string;
  };
  is_liked?: boolean;
  child_replies?: Reply[];
};

type Story = {
  id: string;
  user_id: string;
  media_url: string;
  media_type?: 'image' | 'video';
  caption?: string;
  caption_position?: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  replies_count: number;
  saves_count: number;
  created_at: string;
  expires_at: string;
  user?: {
    id: string;
    username: string;
    avatar_url: string;
    full_name: string;
    location?: string;
  };
  is_liked?: boolean;
  is_saved?: boolean;
  has_viewed?: boolean;
  liked_by_me?: boolean;
  saved_by_me?: boolean;
  replies?: Reply[];
  event?: {
    id: string;
    title: string;
  };
};

const { width: screenWidth } = Dimensions.get('window');

export default function UserMemoriesViewerScreen() {
  const router = useRouter();
  const { userId, storyId } = useLocalSearchParams<{ userId: string; storyId?: string }>();
  const { session } = useSession();
  const responsive = useResponsive();
  const { getStoriesByUser } = useStories();
  const { 
    replies,
    addView,
    fetchReplies,
    addReply,
    toggleReplyLike,
    deleteReply,
  } = useMemories();
  const [memories, setMemories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [localReplies, setLocalReplies] = useState<Reply[]>([]);
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Reply | null>(null);
  const [showLikes, setShowLikes] = useState(false);
  const [likedUsers, setLikedUsers] = useState<any[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadUserMemories();
  }, [userId]);

  useEffect(() => {
    if (memories[currentIndex]?.id) {
      // Clear local replies when changing memory
      setLocalReplies([]);
      // Fetch new replies
      fetchReplies(memories[currentIndex].id);
    }
  }, [currentIndex, fetchReplies]);
  
  useEffect(() => {
    // Update local replies when global replies change
    setLocalReplies(replies);
  }, [replies]);

  const loadUserMemories = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .eq('id', userId)
        .single();
      
      if (profile) {
        setUserProfile(profile);
      }

      // Fetch user stories using the stories provider
      const userStories = await getStoriesByUser(userId);
      
      // Ensure each story has user info
      for (let i = 0; i < userStories.length; i++) {
        if (!userStories[i].user) {
          userStories[i].user = profile;
        }
      }
      
      // Transform stories to memories format and sort by date
      const transformedMemories = [];
      
      for (const story of userStories) {
        // Fetch likes count and check if current user liked
        const { count: likesCount } = await supabase
          .from('story_likes')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', story.id);

        let isLiked = false;
        if (session?.user) {
          const { data: userLike } = await supabase
            .from('story_likes')
            .select('id')
            .eq('story_id', story.id)
            .eq('user_id', session.user.id)
            .single();
          
          isLiked = !!userLike;
        }

        // Fetch saves count and check if current user saved
        const { count: savesCount } = await supabase
          .from('story_saves')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', story.id);

        let isSaved = false;
        if (session?.user) {
          const { data: userSave } = await supabase
            .from('story_saves')
            .select('id')
            .eq('story_id', story.id)
            .eq('user_id', session.user.id)
            .single();
          
          isSaved = !!userSave;
        }

        // Fetch replies count
        const { count: repliesCount } = await supabase
          .from('story_replies')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', story.id);

        // Fetch views count
        const { count: viewsCount } = await supabase
          .from('story_views')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', story.id);

        transformedMemories.push({
          ...story,
          media_url: story.image_url || story.media_url,
          liked_by_me: isLiked,
          saved_by_me: isSaved,
          likes_count: likesCount || 0,
          saves_count: savesCount || 0,
          replies_count: repliesCount || 0,
          views_count: viewsCount || 0,
          replies: []
        });
      }

      // Sort by date
      transformedMemories.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Most recent first
      });

      setMemories(transformedMemories);

      // If specific storyId provided, find its index
      if (storyId && transformedMemories.length > 0) {
        const targetIndex = transformedMemories.findIndex(m => m.id === storyId);
        if (targetIndex !== -1) {
          setCurrentIndex(targetIndex);
        }
      }
    } catch (error) {
      console.error('Error loading user memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMemory = async (memoryId: string) => {
    if (!session?.user) return;
    await addView(memoryId);
  };

  const handleLike = async () => {
    if (!session?.user) return;
    
    const currentMemory = memories[currentIndex];
    if (!currentMemory) return;

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const wasLiked = currentMemory.liked_by_me;
    
    // Update local state optimistically FIRST
    setMemories(prev => prev.map(m => 
      m.id === currentMemory.id 
        ? { ...m, liked_by_me: !wasLiked, likes_count: wasLiked ? (m.likes_count - 1) : (m.likes_count + 1) } 
        : m
    ));
    
    // Then update database in background without waiting
    try {
      if (wasLiked) {
        // Unlike
        await supabase
          .from('story_likes')
          .delete()
          .eq('story_id', currentMemory.id)
          .eq('user_id', session.user.id);
      } else {
        // Like
        await supabase
          .from('story_likes')
          .insert({
            story_id: currentMemory.id,
            user_id: session.user.id,
          });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setMemories(prev => prev.map(m => 
        m.id === currentMemory.id 
          ? { ...m, liked_by_me: wasLiked, likes_count: currentMemory.likes_count } 
          : m
      ));
    }
  };

  const handleComment = async () => {
    if (!comment.trim() || !session?.user) return;
    
    const currentMemory = memories[currentIndex];
    if (!currentMemory) return;

    // Optimistically add the comment
    const newReply: Reply = {
      id: `temp-${Date.now()}`,
      story_id: currentMemory.id,
      user_id: session.user.id,
      parent_reply_id: replyingTo?.id || null,
      text: comment.trim(),
      likes_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: session.user.id,
        username: session.user.user_metadata?.username || 'Unknown',
        avatar_url: session.user.user_metadata?.avatar_url || '',
        full_name: session.user.user_metadata?.full_name || ''
      },
      is_liked: false
    };

    // Add to local state immediately
    if (replyingTo) {
      // Add as child reply
      setLocalReplies(prev => {
        const updateReplies = (replies: Reply[]): Reply[] => {
          return replies.map(r => {
            if (r.id === replyingTo.id) {
              return {
                ...r,
                child_replies: [...(r.child_replies || []), newReply]
              };
            } else if (r.child_replies) {
              return {
                ...r,
                child_replies: updateReplies(r.child_replies)
              };
            }
            return r;
          });
        };
        return updateReplies(prev);
      });
    } else {
      // Add as root reply
      setLocalReplies(prev => [...prev, newReply]);
    }

    // Update comment count
    setMemories(prev => prev.map(m => 
      m.id === currentMemory.id 
        ? { ...m, replies_count: (m.replies_count || 0) + 1 } 
        : m
    ));

    setComment('');
    setReplyingTo(null);

    // Then add to database
    try {
      await addReply(currentMemory.id, comment.trim(), replyingTo?.id);
      // Refresh to get the real ID and ensure sync
      await fetchReplies(currentMemory.id);
    } catch (error) {
      console.error('Error adding comment:', error);
      // Remove optimistic update on error
      if (replyingTo) {
        setLocalReplies(prev => {
          const removeReply = (replies: Reply[]): Reply[] => {
            return replies.map(r => {
              if (r.id === replyingTo.id && r.child_replies) {
                return {
                  ...r,
                  child_replies: r.child_replies.filter(c => c.id !== newReply.id)
                };
              } else if (r.child_replies) {
                return {
                  ...r,
                  child_replies: removeReply(r.child_replies)
                };
              }
              return r;
            });
          };
          return removeReply(prev);
        });
      } else {
        setLocalReplies(prev => prev.filter(r => r.id !== newReply.id));
      }
      // Revert comment count
      setMemories(prev => prev.map(m => 
        m.id === currentMemory.id 
          ? { ...m, replies_count: Math.max(0, (m.replies_count || 0) - 1) } 
          : m
      ));
    }
  };

  const handleShare = async () => {
    const currentMemory = memories[currentIndex];
    if (!currentMemory) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Create a shareable link with the story/memory ID
      const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://andfriends.app';
      const shareUrl = `${baseUrl}/story/${currentMemory.id}`;
      
      // Create the share message
      const shareMessage = Platform.select({
        ios: `Check out this memory by @${currentMemory.user?.username || userProfile?.username || 'Unknown'}${currentMemory.caption ? `: ${currentMemory.caption}` : ''}\n\n${shareUrl}`,
        android: `Check out this memory by @${currentMemory.user?.username || userProfile?.username || 'Unknown'}${currentMemory.caption ? `: ${currentMemory.caption}` : ''}\n\n${shareUrl}`,
        default: `Check out this memory by @${currentMemory.user?.username || userProfile?.username || 'Unknown'}${currentMemory.caption ? `: ${currentMemory.caption}` : ''}\n\n${shareUrl}`
      });

      const shareOptions = {
        message: shareMessage,
        url: Platform.OS === 'ios' ? shareUrl : undefined,
        title: `Memory by @${currentMemory.user?.username || userProfile?.username || 'Unknown'}`,
      };

      const result = await Share.share(shareOptions);
      
      if (result.action === Share.sharedAction) {
        // Track share event
        await supabase
          .from('story_shares')
          .insert({
            story_id: currentMemory.id,
            user_id: session?.user?.id,
            shared_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSave = async () => {
    if (!session?.user) return;
    
    const currentMemory = memories[currentIndex];
    if (!currentMemory) return;

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const wasSaved = currentMemory.saved_by_me;
    
    // Update local state optimistically FIRST
    setMemories(prev => prev.map(m => 
      m.id === currentMemory.id 
        ? { ...m, saved_by_me: !wasSaved } 
        : m
    ));
    
    // Then update database in background without waiting
    try {
      if (wasSaved) {
        // Unsave
        await supabase
          .from('story_saves')
          .delete()
          .eq('story_id', currentMemory.id)
          .eq('user_id', session.user.id);
      } else {
        // Save
        await supabase
          .from('story_saves')
          .insert({
            story_id: currentMemory.id,
            user_id: session.user.id,
          });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      // Revert on error
      setMemories(prev => prev.map(m => 
        m.id === currentMemory.id 
          ? { ...m, saved_by_me: wasSaved } 
          : m
      ));
    }
  };

  const handleLikeComment = async (reply: any) => {
    if (!session?.user) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleReplyLike(reply.id);
  };

  const handleDeleteComment = async (replyId: string) => {
    if (!session?.user) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReply(replyId);
            } catch (error) {
              console.error('Error deleting comment:', error);
            }
          }
        }
      ]
    );
  };

  const handleShowLikes = async () => {
    const currentMemory = memories[currentIndex];
    if (!currentMemory) return;

    try {
      const { data: likes } = await supabase
        .from('story_likes')
        .select(`
          user_id,
          created_at,
          user:profiles!story_likes_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('story_id', currentMemory.id)
        .order('created_at', { ascending: false });

      setLikedUsers(likes || []);
      setShowLikes(true);
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const handleReport = async () => {
    const currentMemory = memories[currentIndex];
    if (!currentMemory) return;

    Alert.alert(
      'Report Memory',
      'Why are you reporting this memory?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inappropriate content', onPress: () => reportMemory('inappropriate') },
        { text: 'Spam', onPress: () => reportMemory('spam') },
        { text: 'False information', onPress: () => reportMemory('false_info') },
        { text: 'Other', onPress: () => reportMemory('other') },
      ]
    );
  };

  const reportMemory = async (reason: string) => {
    if (!session?.user) return;
    
    const currentMemory = memories[currentIndex];
    if (!currentMemory) return;

    try {
      await supabase
        .from('story_reports')
        .insert({
          story_id: currentMemory.id,
          reporter_id: session.user.id,
          reason: reason,
        });
      
      Alert.alert('Reported', 'Thank you for your report. We will review this content.');
      setShowOptions(false);
    } catch (error) {
      console.error('Error reporting memory:', error);
      Alert.alert('Error', 'Failed to report memory. Please try again.');
    }
  };

  const handleBlockUser = async () => {
    const currentMemory = memories[currentIndex];
    if (!currentMemory || !session?.user) return;

    Alert.alert(
      'Block User',
      `Are you sure you want to block @${currentMemory.user?.username || userProfile?.username || 'Unknown'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement block functionality
            Alert.alert('Blocked', `You have blocked @${currentMemory.user?.username || userProfile?.username || 'Unknown'}`);
            setShowOptions(false);
          }
        }
      ]
    );
  };

  const handleDeleteMemory = async () => {
    const currentMemory = memories[currentIndex];
    if (!currentMemory || !session?.user || currentMemory.user_id !== session.user.id) return;

    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('stories')
                .delete()
                .eq('id', currentMemory.id);
              
              setShowOptions(false);
              
              // Remove from local array
              const newMemories = memories.filter(m => m.id !== currentMemory.id);
              setMemories(newMemories);
              
              if (newMemories.length === 0) {
                router.back();
              } else if (currentIndex >= newMemories.length) {
                setCurrentIndex(newMemories.length - 1);
              }
            } catch (error) {
              console.error('Error deleting memory:', error);
              Alert.alert('Error', 'Failed to delete memory. Please try again.');
            }
          }
        }
      ]
    );
  };

  const formatCommentTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return `${Math.floor(diffInMinutes / 10080)}w`;
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const renderMemory = ({ item, index }: { item: Story; index: number }) => {
    
    return (
      <View style={[styles.memoryContainer, { height: responsive.height }]}>
        {/* Background Image/Video */}
        {item.media_type === 'video' ? (
          <Video
            source={{ uri: item.media_url }}
            style={styles.memoryMedia}
            shouldPlay={index === currentIndex}
            isLooping
            resizeMode={ResizeMode.COVER}
          />
        ) : (
          <Image
            source={{ uri: item.media_url }}
            style={styles.memoryMedia}
            resizeMode="cover"
          />
        )}

        {/* Gradient Overlays */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent']}
          style={styles.topGradient}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={styles.bottomGradient}
        />

        {/* Header */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Memories</Text>
          <TouchableOpacity style={styles.cameraButton} onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            void router.push('/screens/create-story');
          }}>
            <Ionicons name="camera-outline" size={28} color="#FFF" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Caption - positioned based on caption_position */}
        {item.caption && (
          <View
            style={[
              styles.captionContainer,
              {
                top: item.caption_position || (responsive.height * 0.5),
              }
            ]}
          >
            <View style={styles.captionBox}>
              <Text style={styles.captionText}>{item.caption}</Text>
            </View>
          </View>
        )}

        {/* Right Side Actions */}
        <View style={styles.rightActions}>
          <View style={styles.actionContainer}>
            <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
              <Ionicons 
                name={item.liked_by_me ? "heart" : "heart-outline"} 
                size={32} 
                color={item.liked_by_me ? "#FF4458" : "#FFF"} 
              />
            </TouchableOpacity>
            {item.likes_count > 0 && (
              <TouchableOpacity onPress={handleShowLikes} style={styles.actionCountButton}>
                <Text style={styles.actionText}>
                  {item.likes_count}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity 
              onPress={async () => {
                setShowComments(true);
                setLoadingComments(true);
                const currentMemory = memories[currentIndex];
                if (currentMemory?.id) {
                  await fetchReplies(currentMemory.id);
                }
                setLoadingComments(false);
              }} 
              style={styles.actionButton}
            >
              <Ionicons name="chatbubble-outline" size={30} color="#FFF" />
            </TouchableOpacity>
            {item.replies_count > 0 && (
              <TouchableOpacity 
                onPress={async () => {
                  setShowComments(true);
                  setLoadingComments(true);
                  const currentMemory = memories[currentIndex];
                  if (currentMemory?.id) {
                    await fetchReplies(currentMemory.id);
                  }
                  setLoadingComments(false);
                }} 
                style={styles.actionCountButton}
              >
                <Text style={styles.actionText}>{item.replies_count}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <Ionicons name="share-outline" size={30} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSave} style={styles.actionButton}>
            <Ionicons 
              name={item.saved_by_me ? "bookmark" : "bookmark-outline"} 
              size={30} 
              color={item.saved_by_me ? "#FFD700" : "#FFF"} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowOptions(true)}
          >
            <Ionicons name="ellipsis-vertical" size={30} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => router.push(`/screens/profile/${item.user?.id || userId}`)}
          >
            <Image
              source={{ 
                uri: item.user?.avatar_url || userProfile?.avatar_url || 'https://via.placeholder.com/40' 
              }}
              style={styles.userAvatar}
            />
            <View style={styles.userTextInfo}>
              <Text style={styles.username}>@{item.user?.username || userProfile?.username || 'Unknown'}</Text>
              {item.caption && (
                <Text style={styles.bottomCaption} numberOfLines={2}>
                  {item.caption}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* View count */}
          <View style={styles.viewsRow}>
            <Ionicons name="play" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.viewsText}>{formatViewCount(item.views_count || 0)}</Text>
          </View>

          {item.event && (
            <TouchableOpacity style={styles.eventInfo}>
              <Ionicons name="location" size={14} color="#FFF" />
              <Text style={styles.eventText}>{item.event.title}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      setCurrentIndex(index);
      handleViewMemory(viewableItems[0].item.id);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const renderReply = (reply: Reply, level: number = 0) => {
    return (
      <View key={reply.id}>
        <Pressable
          style={[styles.commentItem, level > 0 && { marginLeft: 48 }]}
          onLongPress={() => {
            if (reply.user?.id === session?.user?.id) {
              handleDeleteComment(reply.id);
            }
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setShowComments(false);
              router.push(`/screens/profile/${reply.user?.id}`);
            }}
          >
            <Image
              source={{ 
                uri: reply.user?.avatar_url || 'https://via.placeholder.com/32' 
              }}
              style={styles.commentAvatar}
            />
          </TouchableOpacity>
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentUsername}>{reply.user?.username || 'Unknown'}</Text>
              <Text style={styles.commentTime}>
                {formatCommentTime(reply.created_at)}
              </Text>
            </View>
            <Text style={styles.commentText}>{reply.text}</Text>
            <View style={styles.commentActions}>
              <TouchableOpacity 
                style={styles.commentActionButton}
                onPress={() => setReplyingTo(reply)}
              >
                <Text style={styles.commentActionText}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.commentActionButton}
                onPress={() => handleLikeComment(reply)}
              >
                <Ionicons 
                  name={reply.is_liked ? "heart" : "heart-outline"} 
                  size={14} 
                  color={reply.is_liked ? "#FF4458" : "#666"} 
                />
                {reply.likes_count > 0 && (
                  <Text style={styles.commentLikeCount}>{reply.likes_count}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
        {reply.child_replies?.map((childReply: any) => renderReply(childReply, level + 1))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (memories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <SafeAreaView style={styles.emptyHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
        </SafeAreaView>
        <Ionicons name="images-outline" size={64} color="#666" />
        <Text style={styles.emptyText}>No memories yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={memories}
        renderItem={renderMemory}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={responsive.height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Likes Modal */}
      {showLikes && (
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowLikes(false)}
        >
          <Pressable style={styles.likesModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Likes</Text>
              <TouchableOpacity onPress={() => setShowLikes(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.likesList}>
              {likedUsers.map((like) => (
                <TouchableOpacity 
                  key={like.user_id} 
                  style={styles.likeItem}
                  onPress={() => {
                    setShowLikes(false);
                    router.push(`/screens/profile/${like.user_id}`);
                  }}
                >
                  <Image
                    source={{ 
                      uri: like.user?.avatar_url || 'https://via.placeholder.com/40' 
                    }}
                    style={styles.likeAvatar}
                  />
                  <View style={styles.likeInfo}>
                    <Text style={styles.likeUsername}>@{like.user?.username || 'Unknown'}</Text>
                    <Text style={styles.likeName}>{like.user?.full_name || ''}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      )}

      {/* Options Modal */}
      {showOptions && memories[currentIndex] && (
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.optionsModal}>
            {memories[currentIndex].user_id === session?.user?.id ? (
              <TouchableOpacity style={styles.optionItem} onPress={handleDeleteMemory}>
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                <Text style={[styles.optionText, { color: '#FF3B30' }]}>Delete Story</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.optionItem} onPress={handleReport}>
                  <Ionicons name="flag-outline" size={24} color="#333" />
                  <Text style={styles.optionText}>Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionItem} onPress={handleBlockUser}>
                  <Ionicons name="ban-outline" size={24} color="#333" />
                  <Text style={styles.optionText}>Block @{memories[currentIndex].user?.username || userProfile?.username || 'Unknown'}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={[styles.optionItem, { borderTopWidth: 1, borderTopColor: '#E5E5E5', marginTop: 8 }]} onPress={() => setShowOptions(false)}>
              <Text style={styles.optionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      {/* Comments Modal */}
      {showComments && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.commentsModal}
        >
          <Pressable 
            style={styles.commentsOverlay} 
            onPress={() => setShowComments(false)} 
          />
          <View style={[styles.commentsContainer, { height: responsive.height * 0.85 }]}>
            <TouchableOpacity 
              style={{ alignItems: 'center', paddingVertical: 8 }}
              onPress={() => setShowComments(false)}
            >
              <View style={styles.modalHandle} />
            </TouchableOpacity>
            <View style={styles.commentsHeader}>
              <View style={{ width: 42 }} />
              <Text style={styles.commentsTitle}>Comments</Text>
              <TouchableOpacity 
                onPress={() => setShowComments(false)}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.commentsList}>
              {loadingComments ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#FF4458" />
                  <Text style={{ marginTop: 12, color: '#666' }}>Loading comments...</Text>
                </View>
              ) : localReplies.length === 0 ? (
                <View style={{ padding: 60, alignItems: 'center' }}>
                  <Ionicons name="chatbubble-outline" size={48} color="#CCC" />
                  <Text style={{ marginTop: 12, fontSize: 16, color: '#666' }}>No comments yet</Text>
                  <Text style={{ marginTop: 4, fontSize: 14, color: '#999' }}>Be the first to comment!</Text>
                </View>
              ) : (
                localReplies.map((reply) => renderReply(reply))
              )}
            </ScrollView>

            {replyingTo && (
              <View style={styles.replyingToBar}>
                <Text style={styles.replyingToText}>
                  Replying to @{replyingTo?.user?.username || 'Unknown'}
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <TouchableOpacity 
                onPress={handleComment}
                disabled={!comment.trim()}
                style={[
                  styles.sendButton,
                  { backgroundColor: comment.trim() ? '#007AFF' : '#E5E5E5' }
                ]}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={comment.trim() ? "#FFF" : "#999"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginTop: 16,
  },
  memoryContainer: {
    width: screenWidth,
    position: 'relative',
  },
  memoryMedia: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 1,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    zIndex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cameraButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 5,
  },
  captionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxWidth: '90%',
  },
  captionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  rightActions: {
    position: 'absolute',
    right: 12,
    bottom: 80,
    alignItems: 'center',
    zIndex: 20,
  },
  actionContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  actionCountButton: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 30,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 60,
    padding: 16,
    paddingBottom: 30,
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  userTextInfo: {
    flex: 1,
  },
  username: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomCaption: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  viewsText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  eventText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  commentsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  commentsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  commentsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    flex: 1,
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  commentText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
    marginTop: 2,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  commentInput: {
    flex: 1,
    marginRight: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 48,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likesModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  likesList: {
    padding: 16,
  },
  likeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  likeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  likeInfo: {
    flex: 1,
  },
  likeUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  likeName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  optionsModal: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '90%',
    padding: 8,
    maxWidth: 400,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 20,
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  commentLikeCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  replyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  replyingToText: {
    fontSize: 14,
    color: '#666',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
});
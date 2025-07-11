import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  StatusBar,
  ActivityIndicator,
  Animated,
  Alert,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useStories } from '@/shared/providers/StoriesContext';
import { useSession } from '@/shared/providers/SessionContext';
import { useMemories } from '@/shared/providers/MemoriesProvider';
import CustomText from '@/shared/ui/CustomText';
import { StoryFrame } from '../components/StoryFrame';
import { supabase } from '@/shared/lib/supabase/client';
import ReportModal from '@/features/reports/components/ReportModal';

const { height: screenHeight } = Dimensions.get('window');

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

export default function StoryViewerScreen() {
  const router = useRouter();
  const { userId, storyId } = useLocalSearchParams<{ userId: string; storyId?: string }>();
  const { session } = useSession();
  const { getStoriesByUser, viewStory, deleteStory } = useStories();
  const { 
    replies,
    fetchReplies,
    addReply,
    toggleReplyLike,
    deleteReply,
  } = useMemories();

  const [stories, setStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [likes, setLikes] = useState<any[]>([]);
  const [localReplies, setLocalReplies] = useState<Reply[]>([]);
  const [hasLiked, setHasLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Reply | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const STORY_DURATION = 7000; // 7 seconds per story

  useEffect(() => {
    loadStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length > 0 && stories[currentIndex]) {
      loadStoryInteractions(stories[currentIndex].id);
      // Clear local replies when changing story
      setLocalReplies([]);
      // Fetch new replies
      fetchReplies(stories[currentIndex].id);
    }
  }, [currentIndex, stories, fetchReplies]);
  
  useEffect(() => {
    // Update local replies when global replies change
    setLocalReplies(replies);
  }, [replies]);

  const loadStories = async () => {
    if (!userId) return;

    console.log('📱 [StoryViewerScreen] Loading stories for user:', userId);
    setLoading(true);
    try {
      const userStories = await getStoriesByUser(userId);
      console.log('📚 [StoryViewerScreen] Loaded stories:', {
        count: userStories.length,
        stories: userStories.map((s, index) => ({ 
          index, 
          id: s.id, 
          user_id: s.user_id, 
          image_url: s.image_url 
        }))
      });
      setStories(userStories);

      if (userStories.length > 0) {
        // If a specific storyId is provided, find its index
        if (storyId) {
          const targetIndex = userStories.findIndex((s) => s.id === storyId);
          if (targetIndex !== -1) {
            setCurrentIndex(targetIndex);
          }
        }

        // Mark first (or target) story as viewed
        const initialStoryId =
          storyId && userStories.find((s) => s.id === storyId) ? storyId : userStories[0].id;
        console.log('👁️ [StoryViewerScreen] Marking story as viewed:', initialStoryId);
        await viewStory(initialStoryId);
        startProgress();
      }
    } catch (error) {
      console.error('❌ [StoryViewerScreen] Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoryInteractions = async (storyId: string) => {
    if (!session?.user?.id) return;

    console.log('📊 [StoryViewerScreen] Loading interactions for story:', storyId);

    try {
      // Load viewers for own stories
      const isOwnStory = userId === session.user.id;
      if (isOwnStory) {
        const { data: viewsData, error: viewsError } = await supabase
          .from('story_views')
          .select('viewer_id, viewed_at')
          .eq('story_id', storyId)
          .order('viewed_at', { ascending: false });

        if (viewsError) {
          console.error('Error loading views:', viewsError);
        } else {
          // Fetch user profiles separately
          let enrichedViews = viewsData || [];
          if (enrichedViews.length > 0) {
            const viewerIds = [...new Set(enrichedViews.map(v => v.viewer_id))];
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, avatar_url, full_name')
              .in('id', viewerIds);
            
            const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
            enrichedViews = enrichedViews.map(view => ({
              ...view,
              viewer: profilesMap.get(view.viewer_id)
            }));
          }
          
          setViewers(enrichedViews);
          console.log('👁️ Loaded', viewsData?.length || 0, 'viewers');
        }
      }

      // Load likes
      const { data: likesData, error: likesError } = await supabase
        .from('story_likes')
        .select('user_id, created_at')
        .eq('story_id', storyId);

      if (likesError) {
        console.error('Error loading likes:', likesError);
      } else {
        // Fetch user profiles separately
        let enrichedLikes = likesData || [];
        if (enrichedLikes.length > 0) {
          const userIds = [...new Set(enrichedLikes.map(l => l.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name')
            .in('id', userIds);
          
          const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
          enrichedLikes = enrichedLikes.map(like => ({
            ...like,
            user: profilesMap.get(like.user_id)
          }));
        }
        
        setLikes(enrichedLikes);
        setHasLiked(likesData?.some((like) => like.user_id === session.user.id) || false);
        console.log('❤️ Loaded', likesData?.length || 0, 'likes');
      }

      // Comments are now loaded via fetchReplies in useEffect
    } catch (error) {
      console.error('Error loading story interactions:', error);
    }
  };

  const startProgress = () => {
    // Reset animation
    progressAnim.setValue(0);
    
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }

    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        // Only advance if not paused and still on the same story
        if (!paused) {
          handleNext();
        }
      }
    });
  };

  const handleNext = async () => {
    console.log('🔍 [handleNext] Current state:', {
      currentIndex,
      storiesLength: stories.length,
      userId,
      stories: stories.map((s, i) => ({ index: i, id: s.id }))
    });

    if (currentIndex < stories.length - 1) {
      const nextIndex = currentIndex + 1;
      console.log('➡️ Moving to next story:', { from: currentIndex, to: nextIndex });
      setCurrentIndex(nextIndex);

      // Mark as viewed
      console.log('👁️ [StoryViewerScreen] Marking story as viewed:', stories[nextIndex].id);
      await viewStory(stories[nextIndex].id);

      // Reset and start progress
      startProgress();
    } else {
      // On est sur la dernière story - NE PAS FERMER
      console.log('✅ [StoryViewerScreen] Last story reached, staying on last story', {
        currentIndex,
        totalStories: stories.length
      });
      
      // La barre reste pleine, on ne fait rien
      // L'utilisateur devra fermer manuellement avec le bouton X
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      startProgress();
    }
  };

  const handleLongPress = () => {
    setPaused(true);
    animationRef.current?.stop();
  };

  const handlePressOut = () => {
    if (paused) {
      setPaused(false);
      startProgress();
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory || deleting) return;

    // Pause the story while showing the alert
    setPaused(true);
    animationRef.current?.stop();

    Alert.alert(
      'Supprimer la story',
      'Êtes-vous sûr de vouloir supprimer cette story ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => {
            // Resume the story
            setPaused(false);
            startProgress();
          },
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);

            try {
              console.log('🗑️ [StoryViewerScreen] Deleting story:', currentStory.id);
              const { error } = await deleteStory(currentStory.id);

              if (error) {
                Alert.alert('Erreur', 'Impossible de supprimer la story. Veuillez réessayer.');
                setDeleting(false);
                setPaused(false);
                startProgress();
                return;
              }

              // Remove from local stories array
              const newStories = stories.filter((s) => s.id !== currentStory.id);
              setStories(newStories);

              if (newStories.length === 0) {
                // No more stories, go back
                router.back();
              } else if (currentIndex >= newStories.length) {
                // Was on last story, go to previous
                setCurrentIndex(newStories.length - 1);
                startProgress();
              } else {
                // Stay on same index (next story)
                startProgress();
              }
            } catch (error) {
              console.error('❌ [StoryViewerScreen] Error deleting story:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression.');
            } finally {
              setDeleting(false);
              setPaused(false);
            }
          },
        },
      ]
    );
  };

  const handleLike = async () => {
    if (!session?.user?.id || !currentStory) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (hasLiked) {
      // Unlike
      await supabase
        .from('story_likes')
        .delete()
        .eq('story_id', currentStory.id)
        .eq('user_id', session.user.id);

      setHasLiked(false);
      setLikes(likes.filter((like) => like.user_id !== session.user.id));
    } else {
      // Like
      const { data } = await supabase
        .from('story_likes')
        .insert({
          story_id: currentStory.id,
          user_id: session.user.id,
        })
        .select('user_id, created_at')
        .single();

      if (data) {
        // Fetch user profile for the new like
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, full_name')
          .eq('id', session.user.id)
          .single();
        
        const enrichedLike = {
          ...data,
          user: profile
        };
        
        setHasLiked(true);
        setLikes([...likes, enrichedLike]);
      }
    }
  };

  const handleSendComment = async () => {
    if (!session?.user?.id || !currentStory || !commentText.trim()) return;
    
    setSendingComment(true);
    
    // Optimistically add the comment
    const newReply: Reply = {
      id: `temp-${Date.now()}`,
      story_id: currentStory.id,
      user_id: session.user.id,
      parent_reply_id: replyingTo?.id || null,
      text: commentText.trim(),
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

    setCommentText('');
    setReplyingTo(null);

    // Then add to database
    try {
      await addReply(currentStory.id, commentText.trim(), replyingTo?.id);
      // Refresh to get the real ID and ensure sync
      await fetchReplies(currentStory.id);
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
    } finally {
      setSendingComment(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !session?.user?.id || !currentStory) return;

    try {
      // Create a direct message with story reference
      const { error } = await supabase.from('messages').insert({
        sender_id: session.user.id,
        receiver_id: currentStory.user.id,
        content: replyText.trim(),
        story_id: currentStory.id,
        message_type: 'story_reply',
      });

      if (error) throw error;

      setReplyText('');
      setShowReplyInput(false);

      // Show success feedback
      Alert.alert('Envoyé!', 'Votre réponse a été envoyée');
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Erreur', "Impossible d'envoyer la réponse");
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !session?.user?.id || !currentStory) return;

    setSendingMessage(true);
    try {
      // Create a direct message with story reference
      const { error } = await supabase.from('messages').insert({
        sender_id: session.user.id,
        receiver_id: currentStory.user.id,
        content: messageText.trim(),
        story_id: currentStory.id,
        message_type: 'story_reply',
      });

      if (error) throw error;

      setMessageText('');
      
      // Show success feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Erreur', "Impossible d'envoyer le message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleShowLikes = async () => {
    const currentMemory = stories[currentIndex];
    if (!currentMemory) return;

    // Pause story when showing likes
    setPaused(true);
    animationRef.current?.stop();

    try {
      const { data: likesData } = await supabase
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

      setLikes(likesData || []);
      setShowLikes(true);
    } catch (error) {
      console.error('Error fetching likes:', error);
      // Resume on error
      setPaused(false);
      startProgress();
    }
  };

  const handleShare = async () => {
    if (!currentStory) return;

    // Pause the story while sharing
    setPaused(true);
    animationRef.current?.stop();

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://andfriends.app';
      const shareUrl = `${baseUrl}/story/${currentStory.id}`;

      const shareMessage = Platform.select({
        ios: `Check out @${currentStory.user?.username || 'Someone'}'s story${currentStory.text ? `: ${currentStory.text}` : ''}\n\n${shareUrl}`,
        android: `Check out @${currentStory.user?.username || 'Someone'}'s story${currentStory.text ? `: ${currentStory.text}` : ''}\n\n${shareUrl}`,
        default: `Check out @${currentStory.user?.username || 'Someone'}'s story${currentStory.text ? `: ${currentStory.text}` : ''}\n\n${shareUrl}`,
      });

      const result = await Share.share({
        message: shareMessage,
        url: Platform.OS === 'ios' ? shareUrl : undefined,
        title: `Story by @${currentStory.user?.username || 'Unknown'}`,
      });

      // Resume the story after sharing is complete or cancelled
      if (result.action === Share.sharedAction || result.action === Share.dismissedAction) {
        setPaused(false);
        startProgress();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Resume on error
      setPaused(false);
      startProgress();
    }
  };

  const handleReport = () => {
    if (!currentStory) return;
    setShowReportModal(true);
  };

  const handleLikeComment = async (reply: Reply) => {
    if (!session?.user) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleReplyLike(reply.id);
  };

  const handleDeleteComment = async (replyId: string) => {
    if (!session?.user) return;

    Alert.alert(
      'Supprimer le commentaire',
      'Êtes-vous sûr de vouloir supprimer ce commentaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
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

  const formatCommentTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'à l\'instant';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}j`;
    return `${Math.floor(diffInMinutes / 10080)}s`;
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
              <CustomText size="sm" weight="bold">
                {reply.user?.username || 'Unknown'}
              </CustomText>
              <CustomText size="xs" color="#666">
                {formatCommentTime(reply.created_at)}
              </CustomText>
            </View>
            <CustomText size="sm" style={styles.commentText}>
              {reply.text}
            </CustomText>
            <View style={styles.commentActions}>
              <TouchableOpacity 
                style={styles.commentActionButton}
                onPress={() => setReplyingTo(reply)}
              >
                <CustomText size="xs" color="#666" weight="normal">
                  Répondre
                </CustomText>
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
                  <CustomText size="xs" color="#666" style={{ marginLeft: 4 }}>
                    {reply.likes_count}
                  </CustomText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
        {reply.child_replies?.map((childReply) => renderReply(childReply, level + 1))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (stories.length === 0) {
    return (
      <View style={styles.container}>
        <CustomText size="lg" color="#FFF">
          No stories available
        </CustomText>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  }

  const currentStory = stories[currentIndex];
  const isOwnStory = userId === session?.user?.id;

  console.log('🔍 [StoryViewerScreen] Current state:', {
    currentStoryId: currentStory?.id,
    isOwnStory,
    likesCount: likes.length,
    repliesCount: localReplies.length,
    viewersCount: viewers.length,
    hasLiked
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Story Frame */}
      <View style={StyleSheet.absoluteFillObject}>
        <StoryFrame
          uri={currentStory.image_url}
          caption={currentStory.text}
          type={currentStory.image_url?.includes('.mp4') ? 'video' : 'image'}
          captionPosition={currentStory.caption_position}
        />
      </View>

      {/* Touchable overlay for navigation */}
      <View style={styles.touchableArea}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.leftTouchArea}
          onPress={handlePrevious}
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
          delayLongPress={200}
        />
        <TouchableOpacity
          activeOpacity={1}
          style={styles.rightTouchArea}
          onPress={handleNext}
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
          delayLongPress={200}
        />
      </View>

      {/* Header */}
      <SafeAreaView style={styles.header}>
        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View key={index} style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground} />
              {index < currentIndex && <View style={[styles.progressBar, { width: '100%' }]} />}
              {index === currentIndex && (
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* User Info */}
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: currentStory.user?.avatar_url || `https://i.pravatar.cc/150?u=${userId}`,
            }}
            style={styles.avatar}
          />
          <View style={styles.userTextContainer}>
            <CustomText size="md" color="#FFF" weight="bold">
              {currentStory.user?.display_name || 'User'}
            </CustomText>
            <CustomText size="sm" color="rgba(255,255,255,0.7)">
              {getTimeAgo(currentStory.created_at)}
            </CustomText>
          </View>

          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom interaction bar */}
      <View style={styles.bottomBar}>
        {isOwnStory ? (
          <View style={styles.interactionRow}>
            {/* Views */}
            <TouchableOpacity 
              style={styles.interactionItem} 
              onPress={() => {
                setPaused(true);
                animationRef.current?.stop();
                setShowViewers(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={22} color="#FFF" />
              <CustomText size="sm" color="#FFF" weight="bold" style={styles.interactionText}>
                {viewers.length}
              </CustomText>
            </TouchableOpacity>

            {/* Likes */}
            <View style={styles.interactionItem}>
              <TouchableOpacity
                onPress={handleLike}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hasLiked ? "heart" : "heart-outline"}
                  size={22}
                  color={hasLiked ? "#FF0000" : "#FFF"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleShowLikes}
                activeOpacity={0.7}
              >
                <CustomText size="sm" color="#FFF" weight="bold" style={styles.interactionText}>
                  {likes.length}
                </CustomText>
              </TouchableOpacity>
            </View>

            {/* Comments */}
            <TouchableOpacity 
              style={styles.interactionItem}
              onPress={async () => {
                setPaused(true);
                animationRef.current?.stop();
                setShowComments(true);
                setLoadingComments(true);
                if (currentStory?.id) {
                  await fetchReplies(currentStory.id);
                }
                setLoadingComments(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={22} color="#FFF" />
              <CustomText size="sm" color="#FFF" weight="bold" style={styles.interactionText}>
                {localReplies.length}
              </CustomText>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              style={styles.interactionItem}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={22} color="#FFF" />
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              style={[styles.interactionItem, deleting && styles.deleteButtonDisabled]}
              onPress={handleDeleteStory}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="trash-outline" size={22} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.interactionRow}>
            {/* Like */}
            <View style={styles.interactionItem}>
              <TouchableOpacity
                onPress={handleLike}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={hasLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={hasLiked ? '#FF0000' : '#FFF'}
                />
              </TouchableOpacity>
              {likes.length > 0 && (
                <TouchableOpacity
                  onPress={handleShowLikes}
                  activeOpacity={0.7}
                >
                  <CustomText size="sm" color="#FFF" weight="bold" style={styles.interactionText}>
                    {likes.length}
                  </CustomText>
                </TouchableOpacity>
              )}
            </View>

            {/* Comment */}
            <TouchableOpacity
              style={styles.interactionItem}
              onPress={async () => {
                setPaused(true);
                animationRef.current?.stop();
                setShowComments(true);
                setLoadingComments(true);
                if (currentStory?.id) {
                  await fetchReplies(currentStory.id);
                }
                setLoadingComments(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={22} color="#FFF" />
              {localReplies.length > 0 && (
                <CustomText size="sm" color="#FFF" weight="bold" style={styles.interactionText}>
                  {localReplies.length}
                </CustomText>
              )}
            </TouchableOpacity>

            {/* Reply */}
            <TouchableOpacity
              style={styles.interactionItem}
              onPress={() => {
                setPaused(true);
                animationRef.current?.stop();
                setShowReplyInput(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="send-outline" size={22} color="#FFF" />
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              style={styles.interactionItem}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={22} color="#FFF" />
            </TouchableOpacity>

            {/* More Options */}
            <TouchableOpacity 
              style={styles.interactionItem}
              onPress={handleReport}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Message Input for other's stories */}
        {!isOwnStory && (
          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Envoyer un message..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={messageText}
              onChangeText={setMessageText}
              multiline={false}
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!messageText.trim() || sendingMessage}
              style={[
                styles.messageSendButton,
                (!messageText.trim() || sendingMessage) && styles.sendButtonDisabled,
              ]}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Viewers Modal */}
      {showViewers && (
        <Animated.View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              setShowViewers(false);
              setPaused(false);
              startProgress();
            }}
          />
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <CustomText size="lg" weight="bold">
                Vues
              </CustomText>
              <TouchableOpacity onPress={() => {
                setShowViewers(false);
                setPaused(false);
                startProgress();
              }}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {viewers.map((view, index) => (
                <View key={index} style={styles.viewerItem}>
                  <Image
                    source={{
                      uri:
                        view.viewer?.avatar_url || `https://i.pravatar.cc/150?u=${view.viewer_id}`,
                    }}
                    style={styles.viewerAvatar}
                  />
                  <View style={styles.viewerInfo}>
                    <CustomText size="md" weight="bold">
                      {view.viewer?.username || view.viewer?.full_name || 'Utilisateur'}
                    </CustomText>
                    <CustomText size="sm" color="#666">
                      {getTimeAgo(view.viewed_at)}
                    </CustomText>
                  </View>
                  {likes.some((like) => like.user_id === view.viewer_id) && (
                    <Ionicons name="heart" size={16} color="#FF0000" />
                  )}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}

      {/* Comments Modal */}
      {showComments && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              setShowComments(false);
              setPaused(false);
              startProgress();
            }}
          />
          <Animated.View style={[styles.modalContent, styles.commentsModal]}>
            <View style={styles.modalHeader}>
              <CustomText size="lg" weight="bold">
                Commentaires
              </CustomText>
              <TouchableOpacity onPress={() => {
                setShowComments(false);
                setPaused(false);
                startProgress();
              }}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {loadingComments ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#FF4458" />
                  <CustomText size="md" color="#666" style={{ marginTop: 12 }}>
                    Chargement des commentaires...
                  </CustomText>
                </View>
              ) : localReplies.length === 0 ? (
                <View style={styles.emptyComments}>
                  <Ionicons name="chatbubble-outline" size={48} color="#CCC" />
                  <CustomText size="md" color="#666" style={{ marginTop: 12 }}>
                    Soyez le premier à commenter
                  </CustomText>
                </View>
              ) : (
                localReplies.map((reply) => renderReply(reply))
              )}
            </ScrollView>

            {replyingTo && (
              <View style={styles.replyingToBar}>
                <CustomText size="sm" color="#666">
                  Répondre à @{replyingTo?.user?.username || 'Unknown'}
                </CustomText>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder={replyingTo ? "Écrire une réponse..." : "Ajouter un commentaire..."}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handleSendComment}
                disabled={!commentText.trim() || sendingComment}
                style={[
                  styles.sendButton,
                  (!commentText.trim() || sendingComment) && styles.sendButtonDisabled,
                ]}
              >
                {sendingComment ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      )}

      {/* Likes Modal */}
      {showLikes && (
        <Animated.View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              setShowLikes(false);
              setPaused(false);
              startProgress();
            }}
          />
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <CustomText size="lg" weight="bold">
                J'aime
              </CustomText>
              <TouchableOpacity onPress={() => {
                setShowLikes(false);
                setPaused(false);
                startProgress();
              }}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {likes.length === 0 ? (
                <View style={styles.emptyComments}>
                  <Ionicons name="heart-outline" size={48} color="#CCC" />
                  <CustomText size="md" color="#666" style={{ marginTop: 12 }}>
                    Aucun j'aime pour le moment
                  </CustomText>
                </View>
              ) : (
                likes.map((like, index) => (
                  <View key={index} style={styles.viewerItem}>
                    <Image
                      source={{
                        uri:
                          like.user?.avatar_url || `https://i.pravatar.cc/150?u=${like.user_id}`,
                      }}
                      style={styles.viewerAvatar}
                    />
                    <View style={styles.viewerInfo}>
                      <CustomText size="md" weight="bold">
                        {like.user?.username || like.user?.full_name || 'Utilisateur'}
                      </CustomText>
                      <CustomText size="sm" color="#666">
                        {getTimeAgo(like.created_at)}
                      </CustomText>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}

      {/* Reply Input Modal */}
      {showReplyInput && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              setShowReplyInput(false);
              setReplyText('');
              setPaused(false);
              startProgress();
            }}
          />
          <View style={styles.replyInputContainer}>
            <View style={styles.replyHeader}>
              <View style={styles.storyPreview}>
                {currentStory.image_url?.includes('.mp4') ? (
                  <View style={styles.videoPreview}>
                    <Ionicons name="play-circle" size={24} color="#FFF" />
                  </View>
                ) : (
                  <Image source={{ uri: currentStory.image_url }} style={styles.previewImage} />
                )}
              </View>
              <View style={styles.replyInfo}>
                <CustomText size="sm" color="#666">
                  Répondre à la story de
                </CustomText>
                <CustomText size="md" weight="bold">
                  @{currentStory.user?.username || 'Unknown'}
                </CustomText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowReplyInput(false);
                  setReplyText('');
                  setPaused(false);
                  startProgress();
                }}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.replyInputWrapper}>
              <TextInput
                style={styles.replyTextInput}
                placeholder="Envoyer une réponse..."
                value={replyText}
                onChangeText={setReplyText}
                multiline
                maxLength={500}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleSendReply}
                disabled={!replyText.trim()}
                style={[styles.replySendButton, !replyText.trim() && styles.sendButtonDisabled]}
              >
                <Ionicons name="send" size={20} color={replyText.trim() ? '#007AFF' : '#999'} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
      
      {showReportModal && currentStory && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          type="story"
          targetId={currentStory.id}
          targetName={`Story de ${currentStory.user?.username || 'User'}`}
        />
      )}
    </View>
  );
}

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const created = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return "À l'instant";
  } else if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes}m`;
  } else if (diffInHours < 24) {
    return `Il y a ${diffInHours}h`;
  } else if (diffInDays === 1) {
    return 'Hier';
  } else if (diffInDays < 7) {
    return `Il y a ${diffInDays}j`;
  } else {
    return created.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 4,
  },
  progressBarContainer: {
    flex: 1,
    height: 2,
    position: 'relative',
  },
  progressBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
    backgroundColor: '#FFF',
    borderRadius: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userTextContainer: {
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 2,
  },
  interactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  interactionText: {
    marginLeft: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF0000',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#000',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.9,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalScroll: {
    flex: 1,
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  viewerInfo: {
    flex: 1,
  },
  commentsModal: {
    height: screenHeight * 0.9,
  },
  commentItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    marginVertical: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
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
  replyingToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emptyComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  touchableArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 1,
  },
  leftTouchArea: {
    flex: 1,
  },
  rightTouchArea: {
    flex: 1,
  },
  replyInputContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storyPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyInfo: {
    flex: 1,
  },
  replyInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  replyTextInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 44,
  },
  replySendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    paddingVertical: 6,
    paddingHorizontal: 4,
    maxHeight: 60,
  },
  messageSendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

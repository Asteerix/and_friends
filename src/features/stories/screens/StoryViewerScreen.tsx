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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useStories } from '@/shared/providers/StoriesContext';
import { useSession } from '@/shared/providers/SessionContext';
import CustomText from '@/shared/ui/CustomText';
import { StoryFrame } from '../components/StoryFrame';
import { supabase } from '@/shared/lib/supabase/client';

const { height: screenHeight } = Dimensions.get('window');

export default function StoryViewerScreen() {
  const router = useRouter();
  const { userId, storyId } = useLocalSearchParams<{ userId: string; storyId?: string }>();
  const { session } = useSession();
  const { getStoriesByUser, viewStory, deleteStory } = useStories();
  
  const [stories, setStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [hasLiked, setHasLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const STORY_DURATION = 7000; // 7 seconds per story

  useEffect(() => {
    loadStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length > 0 && stories[currentIndex]) {
      loadStoryInteractions(stories[currentIndex].id);
    }
  }, [currentIndex, stories]);

  const loadStories = async () => {
    if (!userId) return;
    
    console.log('📱 [StoryViewerScreen] Loading stories for user:', userId);
    setLoading(true);
    try {
      const userStories = await getStoriesByUser(userId);
      console.log('📚 [StoryViewerScreen] Loaded', userStories.length, 'stories');
      setStories(userStories);
      
      if (userStories.length > 0) {
        // If a specific storyId is provided, find its index
        if (storyId) {
          const targetIndex = userStories.findIndex(s => s.id === storyId);
          if (targetIndex !== -1) {
            setCurrentIndex(targetIndex);
          }
        }
        
        // Mark first (or target) story as viewed
        const initialStoryId = storyId && userStories.find(s => s.id === storyId) 
          ? storyId 
          : userStories[0].id;
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
    
    try {
      // Load viewers for own stories
      const isOwnStory = userId === session.user.id;
      if (isOwnStory) {
        const { data: viewsData } = await supabase
          .from('story_views')
          .select(`
            viewer_id,
            viewed_at,
            viewer:profiles!story_views_viewer_id_fkey (
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('story_id', storyId)
          .order('viewed_at', { ascending: false });
        
        setViewers(viewsData || []);
      }
      
      // Load likes
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
        .eq('story_id', storyId);
      
      setLikes(likesData || []);
      setHasLiked(likesData?.some(like => like.user_id === session.user.id) || false);
      
      // Load comments
      const { data: commentsData } = await supabase
        .from('story_comments')
        .select(`
          id,
          text,
          created_at,
          user:profiles!story_comments_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('story_id', storyId)
        .order('created_at', { ascending: false });
      
      setComments(commentsData || []);
    } catch (error) {
      console.error('Error loading story interactions:', error);
    }
  };

  const startProgress = () => {
    progressAnim.setValue(0);
    
    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (finished && !paused) {
        handleNext();
      }
    });
  };

  const handleNext = async () => {
    if (currentIndex < stories.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      
      // Mark as viewed
      console.log('👁️ [StoryViewerScreen] Marking story as viewed:', stories[nextIndex].id);
      await viewStory(stories[nextIndex].id);
      
      // Reset and start progress
      startProgress();
    } else {
      // All stories viewed
      console.log('✅ [StoryViewerScreen] All stories viewed, going back');
      router.back();
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
          }
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
              const newStories = stories.filter(s => s.id !== currentStory.id);
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
          }
        }
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
      setLikes(likes.filter(like => like.user_id !== session.user.id));
    } else {
      // Like
      const { data } = await supabase
        .from('story_likes')
        .insert({
          story_id: currentStory.id,
          user_id: session.user.id
        })
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
        .single();
      
      if (data) {
        setHasLiked(true);
        setLikes([...likes, data]);
      }
    }
  };

  const handleSendComment = async () => {
    if (!session?.user?.id || !currentStory || !commentText.trim()) return;
    
    setSendingComment(true);
    try {
      const { data } = await supabase
        .from('story_comments')
        .insert({
          story_id: currentStory.id,
          user_id: session.user.id,
          text: commentText.trim()
        })
        .select(`
          id,
          text,
          created_at,
          user:profiles!story_comments_user_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .single();
      
      if (data) {
        setComments([data, ...comments]);
        setCommentText('');
        setShowComments(false);
      }
    } catch (error) {
      console.error('Error sending comment:', error);
    } finally {
      setSendingComment(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !session?.user?.id || !currentStory) return;
    
    try {
      // Create a direct message with story reference
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: session.user.id,
          receiver_id: currentStory.user.id,
          content: replyText.trim(),
          story_id: currentStory.id,
          message_type: 'story_reply'
        });
      
      if (error) throw error;
      
      setReplyText('');
      setShowReplyInput(false);
      
      // Show success feedback
      Alert.alert('Envoyé!', 'Votre réponse a été envoyée');
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la réponse');
    }
  };

  const handleShare = async () => {
    if (!currentStory) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://andfriends.app';
      const shareUrl = `${baseUrl}/story/${currentStory.id}`;
      
      const shareMessage = Platform.select({
        ios: `Check out @${currentStory.user?.username || 'Someone'}'s story${currentStory.text ? `: ${currentStory.text}` : ''}\n\n${shareUrl}`,
        android: `Check out @${currentStory.user?.username || 'Someone'}'s story${currentStory.text ? `: ${currentStory.text}` : ''}\n\n${shareUrl}`,
        default: `Check out @${currentStory.user?.username || 'Someone'}'s story${currentStory.text ? `: ${currentStory.text}` : ''}\n\n${shareUrl}`
      });

      await Share.share({
        message: shareMessage,
        url: Platform.OS === 'ios' ? shareUrl : undefined,
        title: `Story by @${currentStory.user?.username || 'Unknown'}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Signaler cette story',
      'Pourquoi signalez-vous cette story?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Contenu inapproprié', onPress: () => reportStory('inappropriate') },
        { text: 'Spam', onPress: () => reportStory('spam') },
        { text: 'Harcèlement', onPress: () => reportStory('harassment') },
        { text: 'Autre', onPress: () => reportStory('other') },
      ]
    );
  };

  const reportStory = async (reason: string) => {
    if (!session?.user?.id || !currentStory) return;
    
    try {
      await supabase
        .from('story_reports')
        .insert({
          story_id: currentStory.id,
          reporter_id: session.user.id,
          reason
        });
      
      Alert.alert('Story signalée', 'Merci de nous avoir signalé ce contenu.');
    } catch (error) {
      console.error('Error reporting story:', error);
    }
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
        <CustomText size="lg" color="#FFF">No stories available</CustomText>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  }

  const currentStory = stories[currentIndex];
  const isOwnStory = userId === session?.user?.id;

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
              {index < currentIndex && (
                <View style={[styles.progressBar, { width: '100%' }]} />
              )}
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
            source={{ uri: currentStory.user?.avatar_url || `https://i.pravatar.cc/150?u=${userId}` }} 
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
        <View style={styles.leftActions}>
          {isOwnStory ? (
            // Own story - show viewers
            <TouchableOpacity 
              style={styles.viewersButton}
              onPress={() => setShowViewers(true)}
            >
              <Ionicons name="eye-outline" size={20} color="#FFF" />
              <CustomText size="sm" color="#FFF" style={{ marginLeft: 6 }}>
                {viewers.length} {viewers.length === 1 ? 'vue' : 'vues'}
              </CustomText>
            </TouchableOpacity>
          ) : (
            // Others' story - show action buttons
            <>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleLike}
              >
                <Ionicons 
                  name={hasLiked ? "heart" : "heart-outline"} 
                  size={24} 
                  color={hasLiked ? "#FF0000" : "#FFF"} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowComments(true)}
              >
                <Ionicons name="chatbubble-outline" size={24} color="#FFF" />
                {comments.length > 0 && (
                  <View style={styles.badge}>
                    <CustomText size="xs" color="#FFF">{comments.length}</CustomText>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowReplyInput(true)}
              >
                <Ionicons name="send-outline" size={24} color="#FFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
        
        {/* Right side buttons */}
        <View style={styles.rightButtons}>
          {isOwnStory ? (
            <>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowComments(true)}
              >
                <Ionicons name="chatbubble-outline" size={24} color="#FFF" />
                {comments.length > 0 && (
                  <View style={styles.badge}>
                    <CustomText size="xs" color="#FFF">{comments.length}</CustomText>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, deleting && styles.deleteButtonDisabled]} 
                onPress={handleDeleteStory}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="trash-outline" size={24} color="#FFF" />
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleReport}
            >
              <Ionicons name="flag-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Viewers Modal */}
      {showViewers && (
        <Animated.View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            activeOpacity={1}
            onPress={() => setShowViewers(false)}
          />
          <Animated.View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <CustomText size="lg" weight="bold">Vues</CustomText>
              <TouchableOpacity onPress={() => setShowViewers(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {viewers.map((view, index) => (
                <View key={index} style={styles.viewerItem}>
                  <Image 
                    source={{ uri: view.viewer?.avatar_url || `https://i.pravatar.cc/150?u=${view.viewer_id}` }}
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
                  {likes.some(like => like.user_id === view.viewer_id) && (
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
            onPress={() => setShowComments(false)}
          />
          <Animated.View style={[styles.modalContent, styles.commentsModal]}>
              <View style={styles.modalHeader}>
                <CustomText size="lg" weight="bold">Commentaires</CustomText>
                <TouchableOpacity onPress={() => setShowComments(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScroll}>
                {comments.length === 0 ? (
                  <View style={styles.emptyComments}>
                    <Ionicons name="chatbubble-outline" size={48} color="#CCC" />
                    <CustomText size="md" color="#666" style={{ marginTop: 12 }}>
                      Soyez le premier à commenter
                    </CustomText>
                  </View>
                ) : (
                  comments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <Image 
                        source={{ uri: comment.user?.avatar_url || `https://i.pravatar.cc/150?u=${comment.user_id}` }}
                        style={styles.commentAvatar}
                      />
                      <View style={styles.commentContent}>
                        <CustomText size="sm" weight="bold">
                          {comment.user?.username || comment.user?.full_name}
                        </CustomText>
                        <CustomText size="sm" style={styles.commentText}>
                          {comment.text}
                        </CustomText>
                        <CustomText size="xs" color="#666">
                          {getTimeAgo(comment.created_at)}
                        </CustomText>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
              
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Ajouter un commentaire..."
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={200}
                />
                <TouchableOpacity 
                  onPress={handleSendComment}
                  disabled={!commentText.trim() || sendingComment}
                  style={[styles.sendButton, (!commentText.trim() || sendingComment) && styles.sendButtonDisabled]}
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
                  <Image 
                    source={{ uri: currentStory.image_url }} 
                    style={styles.previewImage}
                  />
                )}
              </View>
              <View style={styles.replyInfo}>
                <CustomText size="sm" color="#666">Répondre à</CustomText>
                <CustomText size="md" weight="bold">@{currentStory.user?.username || 'Unknown'}</CustomText>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowReplyInput(false);
                  setReplyText('');
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
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={replyText.trim() ? "#007AFF" : "#999"} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    return 'À l\'instant';
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
    justifyContent: 'center',
    alignItems: 'center',
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
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  viewersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  likeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
});
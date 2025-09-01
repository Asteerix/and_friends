import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  Dimensions,
  Pressable,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import VoiceRecorderModal from '../components/VoiceRecorderModal';
import { useMessagesAdvanced } from '@/hooks/useMessagesAdvanced';
import { useSession } from '@/shared/providers/SessionContext';
import { ChatService } from '@/features/chats/services/chatService';
import { supabase } from '@/shared/lib/supabase/client';
import { usePresence } from '@/hooks/usePresence';
import { MediaService } from '@/features/chats/services/mediaService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MessageBubbleProps {
  message: any;
  isOwnMessage: boolean;
  onDoubleTap: () => void;
  onLongPress: () => void;
  onReply: () => void;
  showAvatar: boolean;
  showTime: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  onDoubleTap,
  onLongPress,
  onReply,
  showAvatar,
  showTime,
}) => {
  let lastTapTime = 0;
  const animatedScale = useRef(new Animated.Value(1)).current;
  const heartAnimation = useRef(new Animated.Value(0)).current;

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 300) {
      // Double tap detected
      onDoubleTap();

      // Heart animation
      Animated.sequence([
        Animated.timing(heartAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(heartAnimation, {
          toValue: 0,
          duration: 200,
          delay: 800,
          useNativeDriver: true,
        }),
      ]).start();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    lastTapTime = now;
  };

  const handlePressIn = () => {
    Animated.spring(animatedScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={handleDoubleTap}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
          { transform: [{ scale: animatedScale }] },
        ]}
      >
        {!isOwnMessage &&
          showAvatar &&
          (message.sender?.avatar_url ? (
            <Image source={{ uri: message.sender.avatar_url }} style={styles.messageAvatar} />
          ) : (
            <View style={[styles.messageAvatar, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>{message.sender?.full_name?.charAt(0) || '?'}</Text>
            </View>
          ))}

        <View style={styles.bubbleContainer}>
          {message.reply_to && (
            <TouchableOpacity style={styles.replyContainer} activeOpacity={0.7}>
              <View style={styles.replyBar} />
              <View>
                <Text style={styles.replyAuthor}>{message.reply_to.sender?.full_name}</Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {message.reply_to.content}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View
            style={[
              styles.bubble,
              isOwnMessage ? styles.ownBubble : styles.otherBubble,
              message.reactions?.length > 0 && styles.bubbleWithReaction,
            ]}
          >
            {message.message_type === 'image' && message.media_url ? (
              <Image
                source={{ uri: message.media_url }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : message.message_type === 'video' && message.media_url ? (
              <View style={styles.videoContainer}>
                <Image
                  source={{ uri: message.media_url }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                <View style={styles.playButton}>
                  <Ionicons name="play" size={24} color="#fff" />
                </View>
              </View>
            ) : message.message_type === 'voice' && message.media_url ? (
              <TouchableOpacity style={styles.voiceMessage}>
                <Ionicons name="play-circle" size={32} color={isOwnMessage ? '#fff' : '#3797F0'} />
                <View style={styles.voiceWaveform}>
                  {[...Array(15)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.voiceWaveformBar,
                        {
                          height: Math.random() * 20 + 5,
                          backgroundColor: isOwnMessage
                            ? 'rgba(255,255,255,0.5)'
                            : 'rgba(0,0,0,0.2)',
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text
                  style={[
                    styles.voiceDuration,
                    isOwnMessage ? styles.ownVoiceDuration : styles.otherVoiceDuration,
                  ]}
                >
                  {message.metadata?.duration
                    ? `${Math.floor(message.metadata.duration / 60)}:${(message.metadata.duration % 60).toString().padStart(2, '0')}`
                    : '0:00'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text
                style={[
                  styles.messageText,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                ]}
              >
                {message.is_deleted ? 'Message supprimé' : message.content}
              </Text>
            )}

            {showTime && (
              <Text
                style={[
                  styles.messageTime,
                  isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
                ]}
              >
                {format(new Date(message.created_at), 'HH:mm')}
              </Text>
            )}
          </View>

          {message.reactions?.length > 0 && (
            <View
              style={[
                styles.reactionsContainer,
                isOwnMessage ? styles.ownReactions : styles.otherReactions,
              ]}
            >
              {message.reactions.map((reaction: any, index: number) => (
                <View key={index} style={styles.reaction}>
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  {reaction.count > 1 && <Text style={styles.reactionCount}>{reaction.count}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        {!isOwnMessage && !showAvatar && <View style={styles.avatarSpace} />}

        <Animated.View
          style={[
            styles.heartReaction,
            {
              opacity: heartAnimation,
              transform: [
                {
                  scale: heartAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.heartEmoji}>❤️</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

export default function InstagramConversationScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = params?.id;
  const router = useRouter();
  const { session } = useSession();
  const { messages, sendMessage, loading, chats } = useMessagesAdvanced(chatId);
  const { isUserOnline } = usePresence();

  const [inputText, setInputText] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [inputHeight, setInputHeight] = useState(40);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (chatId) {
      loadParticipants();
    }
  }, [chatId]);

  useEffect(() => {
    const chat = chats.find((c) => c.id === chatId);
    if (chat) {
      setChatInfo(chat);
    }
  }, [chats, chatId]);

  const loadParticipants = async () => {
    const { data } = await ChatService.getChatParticipants(chatId!);
    setParticipants(data);
  };

  const getChatTitle = () => {
    if (chatInfo?.is_group) {
      return chatInfo.name || 'Groupe';
    }
    const otherParticipant = participants.find((p) => p.user_id !== currentUserId);
    return otherParticipant?.profiles?.full_name || 'Conversation';
  };

  const getSubtitle = () => {
    if (chatInfo?.is_group) {
      return `${participants.length} membres`;
    }
    const otherParticipant = participants.find((p) => p.user_id !== currentUserId);
    if (otherParticipant && isUserOnline(otherParticipant.user_id)) {
      return 'En ligne';
    }
    return 'Hors ligne';
  };

  const handleSend = async () => {
    if (inputText.trim()) {
      const messageData: any = {
        content: inputText.trim(),
      };

      if (replyingTo) {
        messageData.reply_to_id = replyingTo.id;
      }

      await sendMessage(inputText.trim());
      setInputText('');
      setReplyingTo(null);
      flatListRef.current?.scrollToEnd();
    }
  };

  const handleCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          "L'accès à la caméra est nécessaire pour prendre des photos."
        );
        return;
      }

      const result = await MediaService.takePhoto();
      if (result) {
        await sendMediaMessage(result);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          "L'accès à la galerie est nécessaire pour sélectionner des photos."
        );
        return;
      }

      const result = await MediaService.pickImage();
      if (result) {
        await sendMediaMessage(result);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', "Impossible de sélectionner l'image");
    }
  };

  const sendMediaMessage = async (media: any) => {
    try {
      const messageData = {
        chat_id: chatId,
        user_id: currentUserId,
        content: '',
        message_type: media.type,
        media_url: media.url,
        metadata: media.metadata,
      };

      const { error } = await supabase.from('messages').insert(messageData);

      if (error) throw error;

      flatListRef.current?.scrollToEnd();
    } catch (error) {
      console.error('Error sending media:', error);
      Alert.alert('Erreur', "Impossible d'envoyer le média");
    }
  };

  const handleDoubleTap = async (message: any) => {
    try {
      // Check if user already reacted with heart
      const existingReaction = message.reactions?.find(
        (r: any) => r.user_id === currentUserId && r.emoji === '❤️'
      );

      if (existingReaction) {
        // Remove reaction
        await supabase.from('message_reactions').delete().eq('id', existingReaction.id);
      } else {
        // Add heart reaction
        await supabase.from('message_reactions').insert({
          message_id: message.id,
          user_id: currentUserId,
          emoji: '❤️',
        });
      }

      // Refresh messages to show updated reactions
      // The real-time subscription should handle this automatically
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleLongPress = (message: any) => {
    setSelectedMessage(message);
    setShowMessageOptions(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleReply = (message: any) => {
    setReplyingTo(message);
    setShowMessageOptions(false);
    inputRef.current?.focus();
  };

  const handleCopy = async (message: any) => {
    try {
      await Clipboard.setStringAsync(message.content);
      setShowMessageOptions(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error copying message:', error);
    }
  };

  const handleUnsend = async (message: any) => {
    try {
      await supabase
        .from('messages')
        .update({
          content: 'Message supprimé',
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', message.id)
        .eq('user_id', currentUserId); // Only allow deleting own messages

      setShowMessageOptions(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error unsending message:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le message');
    }
  };

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isOwnMessage = item.user_id === currentUserId;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

    const showAvatar =
      !isOwnMessage &&
      (!nextMessage ||
        nextMessage.user_id !== item.user_id ||
        new Date(nextMessage.created_at).getTime() - new Date(item.created_at).getTime() > 60000);

    const showTime =
      !previousMessage ||
      new Date(item.created_at).getTime() - new Date(previousMessage.created_at).getTime() > 300000;

    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        onDoubleTap={() => handleDoubleTap(item)}
        onLongPress={() => handleLongPress(item)}
        onReply={() => handleReply(item)}
        showAvatar={showAvatar}
        showTime={showTime}
      />
    );
  };

  const renderDateSeparator = (date: string) => (
    <View style={styles.dateSeparator}>
      <Text style={styles.dateText}>{format(new Date(date), 'EEEE d MMMM', { locale: fr })}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => router.push(`/screens/instagram-chat-details?id=${chatId}`)}
        >
          <View style={styles.headerAvatar}>
            {chatInfo?.is_group ? (
              <View style={[styles.avatar, styles.groupAvatar]}>
                <Ionicons name="people" size={24} color="#000" />
              </View>
            ) : participants[0]?.profiles?.avatar_url ? (
              <Image source={{ uri: participants[0].profiles.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatar]}>
                <Text style={styles.avatarText}>{getChatTitle().charAt(0)}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {getChatTitle()}
            </Text>
            <Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(`/screens/video-call?chatId=${chatId}`)}>
            <Ionicons name="call-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/screens/video-call?chatId=${chatId}&video=true`)}
            style={styles.videoCallButton}
          >
            <Ionicons name="videocam-outline" size={28} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.messagesContainer}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          inverted
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {/* Reply Preview */}
        {replyingTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyContent}>
              <Text style={styles.replyLabel}>Répondre à {replyingTo.sender?.full_name}</Text>
              <Text style={styles.replyMessage} numberOfLines={1}>
                {replyingTo.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.inputButton} onPress={handleCamera}>
            <Ionicons name="camera-outline" size={28} color="#3797F0" />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { minHeight: Math.max(40, inputHeight) }]}
              placeholder="Message..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              onContentSizeChange={(e) => {
                setInputHeight(Math.min(100, e.nativeEvent.contentSize.height));
              }}
            />

            <View style={styles.inputActions}>
              {inputText.length === 0 && (
                <>
                  <TouchableOpacity
                    style={styles.inputAction}
                    onPress={() => setShowVoiceRecorder(true)}
                  >
                    <Ionicons name="mic-outline" size={24} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputAction} onPress={handleImagePicker}>
                    <Ionicons name="image-outline" size={24} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.inputAction}>
                    <Ionicons name="add-circle-outline" size={24} color="#000" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {inputText.length > 0 && (
            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Envoyer</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Message Options Modal */}
      <Modal
        visible={showMessageOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageOptions(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMessageOptions(false)}>
          <BlurView intensity={100} style={StyleSheet.absoluteFillObject} />

          <View style={styles.messageOptionsContainer}>
            <View style={styles.messageOptionsContent}>
              <View style={styles.reactionsRow}>
                {['❤️', '😂', '😮', '😢', '😠', '👍'].map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.reactionButton}
                    onPress={async () => {
                      try {
                        await supabase.from('message_reactions').insert({
                          message_id: selectedMessage.id,
                          user_id: currentUserId,
                          emoji: emoji,
                        });
                        setShowMessageOptions(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (error) {
                        console.error('Error adding reaction:', error);
                      }
                    }}
                  >
                    <Text style={styles.reactionButtonEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.messageOptions}>
                <TouchableOpacity
                  style={styles.messageOption}
                  onPress={() => handleReply(selectedMessage)}
                >
                  <Ionicons name="arrow-undo" size={24} color="#000" />
                  <Text style={styles.messageOptionText}>Répondre</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.messageOption}
                  onPress={() => handleCopy(selectedMessage)}
                >
                  <Ionicons name="copy-outline" size={24} color="#000" />
                  <Text style={styles.messageOptionText}>Copier</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.messageOption}>
                  <Ionicons name="arrow-redo" size={24} color="#000" />
                  <Text style={styles.messageOptionText}>Transférer</Text>
                </TouchableOpacity>

                {selectedMessage?.user_id === currentUserId && (
                  <TouchableOpacity
                    style={styles.messageOption}
                    onPress={() => handleUnsend(selectedMessage)}
                  >
                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                    <Text style={[styles.messageOptionText, { color: '#FF3B30' }]}>
                      Annuler l'envoi
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        visible={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onSend={async (audioUrl, duration) => {
          try {
            const messageData = {
              chat_id: chatId,
              user_id: currentUserId,
              content: '',
              message_type: 'voice',
              media_url: audioUrl,
              metadata: { duration },
            };

            const { error } = await supabase.from('messages').insert(messageData);

            if (error) throw error;
            flatListRef.current?.scrollToEnd();
          } catch (error) {
            console.error('Error sending voice message:', error);
            Alert.alert('Erreur', "Impossible d'envoyer le message vocal");
          }
        }}
        chatId={chatId!}
        userId={currentUserId!}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    marginRight: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  groupAvatar: {
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatar: {
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  videoCallButton: {
    marginLeft: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 2,
    position: 'relative',
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  avatarSpace: {
    width: 36,
  },
  bubbleContainer: {
    maxWidth: '70%',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  bubbleWithReaction: {
    marginBottom: 16,
  },
  ownBubble: {
    backgroundColor: '#3797F0',
  },
  otherBubble: {
    backgroundColor: '#EFEFEF',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999',
  },
  replyContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 12,
  },
  replyBar: {
    width: 3,
    backgroundColor: '#3797F0',
    marginRight: 8,
    borderRadius: 2,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#666',
  },
  reactionsContainer: {
    position: 'absolute',
    bottom: -8,
    flexDirection: 'row',
    gap: 4,
  },
  ownReactions: {
    right: 8,
  },
  otherReactions: {
    left: 8,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    marginLeft: 2,
    color: '#666',
  },
  heartReaction: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  heartEmoji: {
    fontSize: 40,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
  },
  inputButton: {
    padding: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#EFEFEF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  inputAction: {
    marginLeft: 12,
  },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3797F0',
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 0.5,
    borderTopColor: '#DBDBDB',
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  replyMessage: {
    fontSize: 14,
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageOptionsContainer: {
    width: SCREEN_WIDTH - 40,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  messageOptionsContent: {
    paddingVertical: 8,
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DBDBDB',
  },
  reactionButton: {
    padding: 8,
  },
  reactionButtonEmoji: {
    fontSize: 28,
  },
  messageOptions: {
    paddingVertical: 8,
  },
  messageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  messageOptionText: {
    fontSize: 16,
    marginLeft: 16,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  videoContainer: {
    position: 'relative',
    width: 200,
    height: 200,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 200,
    gap: 8,
  },
  voiceWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  voiceWaveformBar: {
    width: 2,
    borderRadius: 1,
  },
  voiceDuration: {
    fontSize: 12,
    marginLeft: 8,
  },
  ownVoiceDuration: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherVoiceDuration: {
    color: '#666',
  },
});

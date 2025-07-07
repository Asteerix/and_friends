import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResizeMode, Video } from 'expo-av';
import React from 'react';
import { useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  Image,
} from 'react-native';

import { EventMemory, MemoryComment } from '@/hooks/useEventMemories';
import { useSession } from '@/shared/providers/SessionContext';

interface MemoryCardProps {
  memory: EventMemory;
  onLike: (memoryId: string) => void;
  onDelete?: (memoryId: string) => void;
  onAddComment: (memoryId: string, content: string) => Promise<any>;
  onGetComments: (memoryId: string) => Promise<MemoryComment[]>;
}

const { width: screenWidth } = Dimensions.get('window');

export default function MemoryCard({
  memory,
  onLike,
  onDelete,
  onAddComment,
  onGetComments,
}: MemoryCardProps) {
  const { session } = useSession();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<MemoryComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const videoRef = useRef<Video>(null);

  const isOwn = memory.user_id === session?.user?.id;

  const handleShowComments = async () => {
    setShowComments(true);
    setLoadingComments(true);
    try {
      const fetchedComments = await onGetComments(memory.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      await onAddComment(memory.id, commentText.trim());
      setCommentText('');
      // Refresh comments
      const updatedComments = await onGetComments(memory.id);
      setComments(updatedComments);
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'ajouter le commentaire");
    }
  };

  const handleDelete = () => {
    Alert.alert('Supprimer le souvenir', 'Êtes-vous sûr de vouloir supprimer ce souvenir ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => onDelete?.(memory.id),
      },
    ]);
  };

  return (
    <>
      <View
        style={{
          backgroundColor: '#111',
          marginBottom: 16,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
          }}
        >
          <Image
            source={{ uri: memory.avatar_url || 'https://via.placeholder.com/40' }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: 12,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              {memory.username || 'Utilisateur'}
            </Text>
            <Text style={{ color: '#666', fontSize: 12 }}>
              {formatDistanceToNow(new Date(memory.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </Text>
          </View>
          {isOwn && (
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Media */}
        {memory.type === 'photo' ? (
          <Image
            source={{ uri: memory.media_url }}
            style={{
              width: screenWidth - 32,
              height: screenWidth - 32,
              backgroundColor: '#222',
            }}
            resizeMode="cover"
          />
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: memory.media_url }}
            style={{
              width: screenWidth - 32,
              height: screenWidth - 32,
            }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
            shouldPlay={false}
            posterSource={{ uri: memory.thumbnail_url }}
          />
        )}

        {/* Caption */}
        {memory.caption && (
          <View style={{ padding: 12 }}>
            <Text style={{ color: '#fff', fontSize: 14 }}>{memory.caption}</Text>
          </View>
        )}

        {/* Actions */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            paddingTop: 0,
          }}
        >
          <TouchableOpacity
            onPress={() => onLike(memory.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginRight: 24,
            }}
          >
            <Ionicons
              name={memory.is_liked ? 'heart' : 'heart-outline'}
              size={24}
              color={memory.is_liked ? '#ff4444' : '#fff'}
            />
            <Text
              style={{
                color: '#fff',
                marginLeft: 6,
                fontSize: 14,
              }}
            >
              {memory.likes_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShowComments}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#fff" />
            <Text
              style={{
                color: '#fff',
                marginLeft: 6,
                fontSize: 14,
              }}
            >
              {memory.comments_count}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowComments(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: '#000' }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#222',
            }}
          >
            <TouchableOpacity onPress={() => setShowComments(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#fff',
                marginLeft: 16,
              }}
            >
              Commentaires
            </Text>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={{
                  flexDirection: 'row',
                  padding: 16,
                }}
              >
                <Image
                  source={{ uri: item.avatar_url || 'https://via.placeholder.com/32' }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    marginRight: 12,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                    {item.username}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 14, marginTop: 2 }}>{item.content}</Text>
                  <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#666' }}>
                  {loadingComments ? 'Chargement...' : 'Aucun commentaire'}
                </Text>
              </View>
            }
          />

          <View
            style={{
              backgroundColor: '#111',
              paddingHorizontal: 16,
              paddingVertical: 12,
              paddingBottom: Platform.OS === 'ios' ? 32 : 12,
              flexDirection: 'row',
              alignItems: 'flex-end',
            }}
          >
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor="#666"
              style={{
                flex: 1,
                backgroundColor: '#222',
                color: '#fff',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 24,
                maxHeight: 100,
              }}
              multiline
            />
            <TouchableOpacity
              onPress={handleAddComment}
              disabled={!commentText.trim()}
              style={{
                marginLeft: 8,
                opacity: commentText.trim() ? 1 : 0.5,
              }}
            >
              <Ionicons name="send" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import React from 'react';
import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import { Alert, FlatList, KeyboardAvoidingView, Platform } from 'react-native';

import { EventComment, useEventInteractions } from '@/hooks/useEventInteractions';
import { useSession } from '@/shared/providers/SessionContext';

interface EventCommentsProps {
  eventId: string;
}
export default function EventComments({ eventId }: EventCommentsProps) {
  const { session } = useSession();
  const { comments, addComment, editComment, deleteComment } = useEventInteractions(eventId);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleSendComment = async () => {
    if (!commentText.trim()) return;

    try {
      await addComment(commentText.trim(), replyingTo || undefined);
      setCommentText('');
      setReplyingTo(null);
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'envoyer le commentaire");
    }
  };

  const handleEdit = async () => {
    if (!editText.trim() || !editingComment) return;

    try {
      await editComment(editingComment, editText.trim());
      setEditingComment(null);
      setEditText('');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le commentaire');
    }
  };

  const handleDelete = (commentId: string) => {
    Alert.alert('Supprimer le commentaire', 'Êtes-vous sûr de vouloir supprimer ce commentaire ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentId);
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de supprimer le commentaire');
          }
        },
      },
    ]);
  };

  const renderComment = ({
    item: comment,
    isReply = false,
  }: {
    item: EventComment;
    isReply?: boolean;
  }) => {
    const isOwn = comment.user_id === session?.user?.id;

    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginLeft: isReply ? 48 : 0,
          borderBottomWidth: !isReply ? 1 : 0,
          borderBottomColor: '#222',
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          <Image
            source={{
              uri: comment.user?.avatar_url || 'https://via.placeholder.com/40',
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: 12,
            }}
          />

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                {comment.user?.full_name || 'Utilisateur'}
              </Text>
              <Text style={{ color: '#666', fontSize: 12, marginLeft: 8 }}>
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </Text>
              {comment.is_edited && (
                <Text style={{ color: '#666', fontSize: 12, marginLeft: 4 }}>(modifié)</Text>
              )}
            </View>

            {editingComment === comment.id ? (
              <View>
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  style={{
                    backgroundColor: '#222',
                    color: '#fff',
                    padding: 8,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                  multiline
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={handleEdit}
                    style={{
                      backgroundColor: '#007AFF',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12 }}>Enregistrer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingComment(null);
                      setEditText('');
                    }}
                    style={{
                      backgroundColor: '#333',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12 }}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>
                  {comment.content}
                </Text>

                <View style={{ flexDirection: 'row', marginTop: 8, gap: 16 }}>
                  {!isReply && (
                    <TouchableOpacity
                      onPress={() => setReplyingTo(comment.id)}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Ionicons name="arrow-undo" size={16} color="#666" />
                      <Text style={{ color: '#666', fontSize: 12, marginLeft: 4 }}>Répondre</Text>
                    </TouchableOpacity>
                  )}

                  {isOwn && (
                    <>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingComment(comment.id);
                          setEditText(comment.content);
                        }}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Ionicons name="pencil" size={16} color="#666" />
                        <Text style={{ color: '#666', fontSize: 12, marginLeft: 4 }}>Modifier</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDelete(comment.id)}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Ionicons name="trash" size={16} color="#ff4444" />
                        <Text style={{ color: '#ff4444', fontSize: 12, marginLeft: 4 }}>
                          Supprimer
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>

        {comment.replies && comment.replies.length > 0 && (
          <View style={{ marginTop: 12 }}>
            {comment.replies.map((reply) => (
              <View key={reply.id}>{renderComment({ item: reply, isReply: true })}</View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="chatbubble-outline" size={48} color="#666" />
            <Text style={{ color: '#666', marginTop: 16, textAlign: 'center' }}>
              Soyez le premier à commenter
            </Text>
          </View>
        }
      />

      {replyingTo && (
        <View
          style={{
            backgroundColor: '#222',
            paddingHorizontal: 16,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#666', flex: 1 }}>Réponse à un commentaire</Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}

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
          placeholder={replyingTo ? 'Écrire une réponse...' : 'Ajouter un commentaire...'}
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
          onPress={handleSendComment}
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
  );
}

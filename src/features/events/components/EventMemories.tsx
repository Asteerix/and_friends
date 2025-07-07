import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ResizeMode, Video } from 'expo-av';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { EventMemory, useEventMemories } from '@/hooks/useEventMemories';
import { Colors } from '@/shared/config/Colors';
import { useSession } from '@/shared/providers/SessionContext';
import CustomText from '@/shared/ui/CustomText';

interface EventMemoriesProps {
  eventId: string;
  eventStatus: 'upcoming' | 'ongoing' | 'past';
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const EventMemories: React.FC<EventMemoriesProps> = ({ eventId, eventStatus }) => {
  const { session } = useSession();
  const user = session?.user;
  const {
    memories,
    loading,
    uploading,
    uploadProgress,
    canAddMemory,
    addMemory,
    pickImage,
    pickVideo,
    takePhoto,
    toggleLike,
    deleteMemory,
  } = useEventMemories(eventId);

  const [selectedMemory, setSelectedMemory] = useState<EventMemory | null>(null);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    type: 'photo' | 'video';
  } | null>(null);

  const handleAddMemory = () => {
    if (Platform.OS === 'ios') {
      Alert.alert('Add Memory', 'Choose how to add a memory', [
        {
          text: 'Take Photo',
          onPress: () => {
            (async () => {
              const photo = await takePhoto();
              if (photo) {
                setSelectedMedia(photo);
                setShowAddModal(true);
              }
            })();
          },
        },
        {
          text: 'Choose from Library',
          onPress: () => {
            (async () => {
              const image = await pickImage();
              if (image) {
                setSelectedMedia(image);
                setShowAddModal(true);
              }
            })();
          },
        },
        {
          text: 'Record Video',
          onPress: () => {
            (async () => {
              const video = await pickVideo();
              if (video) {
                setSelectedMedia(video);
                setShowAddModal(true);
              }
            })();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      // Android implementation
      Alert.alert('Add Memory', 'Choose how to add a memory', [
        {
          text: 'Take Photo',
          onPress: () => {
            (async () => {
              const photo = await takePhoto();
              if (photo) {
                setSelectedMedia(photo);
                setShowAddModal(true);
              }
            })();
          },
        },
        {
          text: 'Choose from Library',
          onPress: () => {
            (async () => {
              const image = await pickImage();
              if (image) {
                setSelectedMedia(image);
                setShowAddModal(true);
              }
            })();
          },
        },
        {
          text: 'Record Video',
          onPress: () => {
            (async () => {
              const video = await pickVideo();
              if (video) {
                setSelectedMedia(video);
                setShowAddModal(true);
              }
            })();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleUploadMemory = async () => {
    if (!selectedMedia) return;

    try {
      await addMemory(selectedMedia, caption, isPublic);
      setShowAddModal(false);
      setSelectedMedia(null);
      setCaption('');
      setIsPublic(true);
      Alert.alert('Success', 'Memory added successfully!');
    } catch {
      Alert.alert('Error', 'Failed to add memory');
    }
  };

  const handleDeleteMemory = (memory: EventMemory) => {
    Alert.alert('Delete Memory', 'Are you sure you want to delete this memory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMemory(memory.id);
            setSelectedMemory(null);
          } catch {
            Alert.alert('Error', 'Failed to delete memory');
          }
        },
      },
    ]);
  };

  const renderMemory = ({ item }: { item: EventMemory }) => (
    <TouchableOpacity
      style={styles.memoryItem}
      onPress={() => setSelectedMemory(item)}
      activeOpacity={0.9}
    >
      {item.type === 'photo' ? (
        <Image source={{ uri: item.media_url }} style={styles.memoryImage} contentFit="cover" />
      ) : (
        <>
          <Image
            source={{ uri: item.thumbnail_url || item.media_url }}
            style={styles.memoryImage}
            contentFit="cover"
          />
          <View style={styles.videoOverlay}>
            <Ionicons name="play-circle" size={40} color="white" />
          </View>
        </>
      )}

      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.memoryGradient}>
        <View style={styles.memoryInfo}>
          <View style={styles.memoryUser}>
            <Image
              source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
              style={styles.memoryAvatar}
              contentFit="cover"
            />
            <CustomText style={styles.memoryUsername}>@{item.username}</CustomText>
          </View>

          <View style={styles.memoryStats}>
            <View style={styles.memoryStat}>
              <Ionicons
                name={item.is_liked ? 'heart' : 'heart-outline'}
                size={16}
                color={item.is_liked ? Colors.light.error : 'white'}
              />
              <CustomText style={styles.memoryStatText}>{item.likes_count}</CustomText>
            </View>
            <View style={styles.memoryStat}>
              <Ionicons name="chatbubble-outline" size={16} color="white" />
              <CustomText style={styles.memoryStatText}>{item.comments_count}</CustomText>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="camera-outline" size={64} color={Colors.light.textSecondary} />
      <CustomText style={styles.emptyText}>
        {eventStatus === 'upcoming'
          ? 'Memories will be available once the event starts'
          : 'No memories yet. Be the first to add one!'}
      </CustomText>
      {canAddMemory && (
        <TouchableOpacity style={styles.addFirstButton} onPress={handleAddMemory}>
          <CustomText style={styles.addFirstText}>Add Memory</CustomText>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <CustomText style={styles.title}>Memories</CustomText>
        {canAddMemory && (
          <TouchableOpacity style={styles.addButton} onPress={handleAddMemory}>
            <Ionicons name="add-circle" size={28} color={Colors.light.tint} />
          </TouchableOpacity>
        )}
      </View>

      {memories.length > 0 ? (
        <FlatList
          data={memories}
          renderItem={renderMemory}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.memoriesList}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Memory viewer modal */}
      <Modal
        visible={!!selectedMemory}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMemory(null)}
      >
        <BlurView intensity={100} style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedMemory(null)}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>

          {selectedMemory && (
            <View style={styles.modalContent}>
              {selectedMemory.type === 'photo' ? (
                <Image
                  source={{ uri: selectedMemory.media_url }}
                  style={styles.modalImage}
                  contentFit="contain"
                />
              ) : (
                <Video
                  source={{ uri: selectedMemory.media_url }}
                  style={styles.modalVideo}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping
                  useNativeControls
                />
              )}

              <View style={styles.modalInfo}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalUser}>
                    <Image
                      source={{
                        uri: selectedMemory.avatar_url || 'https://via.placeholder.com/40',
                      }}
                      style={styles.modalAvatar}
                      contentFit="cover"
                    />
                    <View>
                      <CustomText style={styles.modalUsername}>
                        @{selectedMemory.username}
                      </CustomText>
                      <CustomText style={styles.modalTime}>
                        {formatDistanceToNow(new Date(selectedMemory.created_at), {
                          addSuffix: true,
                        })}
                      </CustomText>
                    </View>
                  </View>

                  {selectedMemory.user_id === user?.id && (
                    <TouchableOpacity onPress={() => handleDeleteMemory(selectedMemory)}>
                      <Ionicons name="trash-outline" size={24} color={Colors.light.error} />
                    </TouchableOpacity>
                  )}
                </View>

                {selectedMemory.caption && (
                  <CustomText style={styles.modalCaption}>{selectedMemory.caption}</CustomText>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalAction}
                    onPress={() => toggleLike(selectedMemory.id)}
                  >
                    <Ionicons
                      name={selectedMemory.is_liked ? 'heart' : 'heart-outline'}
                      size={24}
                      color={selectedMemory.is_liked ? Colors.light.error : 'white'}
                    />
                    <CustomText style={styles.modalActionText}>
                      {selectedMemory.likes_count}
                    </CustomText>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalAction}>
                    <Ionicons name="chatbubble-outline" size={24} color="white" />
                    <CustomText style={styles.modalActionText}>
                      {selectedMemory.comments_count}
                    </CustomText>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalAction}>
                    <Ionicons name="share-outline" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </BlurView>
      </Modal>

      {/* Add memory modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setSelectedMedia(null);
          setCaption('');
        }}
      >
        <KeyboardAvoidingView
          style={styles.addModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.addModalContent}>
            <View style={styles.addModalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setSelectedMedia(null);
                  setCaption('');
                }}
              >
                <CustomText style={styles.cancelText}>Cancel</CustomText>
              </TouchableOpacity>

              <CustomText style={styles.addModalTitle}>New Memory</CustomText>

              <TouchableOpacity onPress={handleUploadMemory} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color={Colors.light.tint} />
                ) : (
                  <CustomText style={styles.shareText}>Share</CustomText>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addModalScroll}>
              {selectedMedia && (
                <View style={styles.previewContainer}>
                  {selectedMedia.type === 'photo' ? (
                    <Image
                      source={{ uri: selectedMedia.uri }}
                      style={styles.previewImage}
                      contentFit="cover"
                    />
                  ) : (
                    <Video
                      source={{ uri: selectedMedia.uri }}
                      style={styles.previewVideo}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay
                      isLooping
                    />
                  )}
                </View>
              )}

              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor={Colors.light.textSecondary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={200}
              />

              <TouchableOpacity style={styles.privacyToggle} onPress={() => setIsPublic(!isPublic)}>
                <Ionicons
                  name={isPublic ? 'earth' : 'lock-closed'}
                  size={24}
                  color={Colors.light.text}
                />
                <View style={styles.privacyInfo}>
                  <CustomText style={styles.privacyTitle}>
                    {isPublic ? 'Public' : 'Private'}
                  </CustomText>
                  <CustomText style={styles.privacyDesc}>
                    {isPublic ? 'Anyone at the event can see this' : 'Only you can see this'}
                  </CustomText>
                </View>
              </TouchableOpacity>

              {uploading && uploadProgress && (
                <View style={styles.uploadProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${uploadProgress.percentage}%` }]}
                    />
                  </View>
                  <CustomText style={styles.progressText}>
                    Uploading... {uploadProgress.percentage}%
                  </CustomText>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  addButton: {
    padding: 4,
  },
  memoriesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  memoryItem: {
    width: 200,
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  memoryImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  memoryGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    justifyContent: 'flex-end',
    padding: 12,
  },
  memoryInfo: {
    gap: 8,
  },
  memoryUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memoryAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  memoryUsername: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  memoryStats: {
    flexDirection: 'row',
    gap: 16,
  },
  memoryStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memoryStatText: {
    color: 'white',
    fontSize: 12,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  addFirstButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 20,
  },
  addFirstText: {
    color: 'white',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  modalImage: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  modalVideo: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  modalInfo: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalUsername: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  modalCaption: {
    color: 'white',
    fontSize: 14,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 32,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalActionText: {
    color: 'white',
    fontSize: 14,
  },
  addModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  addModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: screenHeight * 0.9,
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  shareText: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  addModalScroll: {
    flex: 1,
  },
  previewContainer: {
    width: screenWidth,
    height: screenWidth,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  captionInput: {
    padding: 20,
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 100,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  privacyInfo: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
  },
  privacyDesc: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  uploadProgress: {
    padding: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
  },
  progressText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});

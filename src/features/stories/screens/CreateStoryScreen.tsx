import { Camera, CameraView, CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useStories } from '@/shared/providers/StoriesContext';
import { useDirectUpload } from '@/shared/hooks/useDirectUpload';
import CustomText from '@/shared/ui/CustomText';
import { DraggableStoryFrame } from '../components';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type MediaType = 'image' | 'video';

interface SelectedMedia {
  uri: string;
  type: MediaType;
  width: number;
  height: number;
}

export default function CreateStoryScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<CameraType>('back');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [hideUIForCapture] = useState(false);
  const [captionPosition, setCaptionPosition] = useState(screenHeight * 0.5); // Default position - center of screen

  const cameraRef = useRef<CameraView>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const recordingProgress = useRef(new Animated.Value(0)).current;

  const { createStory } = useStories();
  const { uploadFile } = useDirectUpload();

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const audioPermission = await Camera.requestMicrophonePermissionsAsync();
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
      
      setHasPermission(
        cameraPermission.status === 'granted' && 
        audioPermission.status === 'granted' &&
        mediaLibraryPermission.status === 'granted'
      );
    })();
  }, []);

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        console.log('[CreateStoryScreen] Taking photo...');
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
          skipProcessing: false,
          exif: false,
        });
        if (!photo?.uri) {
          console.error('[CreateStoryScreen] No photo URI returned');
          return;
        }
        
        console.log('[CreateStoryScreen] Photo captured:', {
          uri: photo.uri.substring(0, 50) + '...',
          width: photo.width,
          height: photo.height,
        });
        
        
        // Sauvegarder l'image dans un répertoire temporaire pour s'assurer qu'elle est bien écrite
        const tempDir = `${FileSystem.documentDirectory}temp/`;
        await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true }).catch(() => {});
        
        const tempFileName = `temp_${Date.now()}.jpg`;
        const tempUri = `${tempDir}${tempFileName}`;
        
        // Copier l'image capturée vers le répertoire temporaire
        await FileSystem.copyAsync({
          from: photo.uri,
          to: tempUri
        });
        
        console.log('[CreateStoryScreen] Image copied to temp:', tempUri);
        
        // Vérifier que le fichier existe et n'est pas vide
        const fileInfo = await FileSystem.getInfoAsync(tempUri);
        console.log('[CreateStoryScreen] Temp file info:', fileInfo);
        
        if (!fileInfo.exists || fileInfo.size === 0) {
          console.error('[CreateStoryScreen] Temp file is empty or doesn\'t exist');
          return;
        }
        
        // Manipuler l'image depuis le fichier temporaire avec compression plus agressive
        const imageInfo = await ImageManipulator.manipulateAsync(
          tempUri,
          [{ resize: { width: 1080 } }], // Redimensionner à 1080px de large (format Instagram)
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Compression plus forte
        );
        
        console.log('[CreateStoryScreen] Image processed:', {
          uri: imageInfo.uri.substring(0, 50) + '...',
          width: imageInfo.width,
          height: imageInfo.height,
        });
        
        // Vérifier que l'image est valide
        if (!imageInfo.uri || imageInfo.width === 0 || imageInfo.height === 0) {
          console.error('[CreateStoryScreen] Invalid image data');
          return;
        }
        
        setSelectedMedia({
          uri: imageInfo.uri, // Use the processed image URI instead of the original
          type: 'image',
          width: imageInfo.width,
          height: imageInfo.height,
        });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        console.error('[CreateStoryScreen] Error capturing photo:', error);
      }
    }
  };

  const handleStartRecording = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        setIsRecording(true);
        
        // Start progress animation (max 15 seconds)
        Animated.timing(recordingProgress, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: false,
        }).start();

        const video = await cameraRef.current.recordAsync({
          maxDuration: 15,
        });
        
        if (video?.uri) {
          setSelectedMedia({
            uri: video.uri,
            type: 'video',
            width: screenWidth,
            height: screenHeight,
          });
        }
      } catch (error) {
        console.error('Error recording video:', error);
      } finally {
        setIsRecording(false);
        recordingProgress.setValue(0);
      }
    }
  };

  const handleStopRecording = () => {
    if (cameraRef.current && isRecording) {
      try {
        cameraRef.current.stopRecording();
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as const,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      
      setSelectedMedia({
        uri: asset.uri,
        type: mediaType,
        width: asset.width || screenWidth,
        height: asset.height || screenHeight,
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleFlipCamera = useCallback(() => {
    setType((current) => (current === 'back' ? 'front' : 'back'));
    void Haptics.selectionAsync();
  }, []);

  const handlePost = async () => {
    if (!selectedMedia) {
      console.log('[CreateStoryScreen] No media selected, aborting post');
      return;
    }

    console.log('[CreateStoryScreen] Starting story post process:', {
      mediaType: selectedMedia.type,
      hasCaption: !!caption,
      captionLength: caption.length,
      mediaUri: selectedMedia.uri.substring(0, 50) + '...',
    });
    
    // Démarrer l'upload direct
    try {
      setIsProcessing(true);
      
      let uploadUri = selectedMedia.uri;
      
      // For now, just upload the original image
      // TODO: Implement proper story composition with ImageManipulator
      console.log('[CreateStoryScreen] Using original image for upload');
      
      const { publicUrl } = await uploadFile(
        uploadUri,
        'stories',
        undefined,
        {
          onProgress: (progress) => {
            console.log(`[CreateStoryScreen] Upload progress: ${progress}%`);
          },
          onError: (error) => {
            console.error('[CreateStoryScreen] Upload failed:', error);
            setIsProcessing(false);
          },
        }
      );

      console.log('[CreateStoryScreen] Upload completed, creating story:', publicUrl);
      
      // Créer la story avec l'URL publique
      const result = await createStory({
        media_url: publicUrl,
        media_type: selectedMedia.type,
        caption: caption.trim() || null, // Use null instead of undefined
        caption_position: captionPosition,
      });

      if (result?.error) {
        console.error('[CreateStoryScreen] Story creation failed:', result.error);
        
        // Check if it's the story limit error
        const errorMessage = result.error.code === 'STORY_LIMIT_REACHED' 
          ? result.error.message 
          : 'La story a été uploadée mais n\'a pas pu être créée. Veuillez réessayer.';
        
        Alert.alert(
          'Erreur',
          errorMessage,
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
      } else {
        console.log('[CreateStoryScreen] Story created successfully!');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Nettoyer les fichiers temporaires
        try {
          const tempDir = `${FileSystem.documentDirectory}temp/`;
          await FileSystem.deleteAsync(tempDir, { idempotent: true });
          console.log('[CreateStoryScreen] Temp files cleaned up');
        } catch (cleanupError) {
          console.error('[CreateStoryScreen] Error cleaning up temp files:', cleanupError);
        }
        
        // Fermer l'écran après la création réussie
        router.back();
      }
      
    } catch (error) {
      setIsProcessing(false);
      console.error('[CreateStoryScreen] Error creating upload task:', error);
      Alert.alert(
        'Erreur',
        'Impossible de démarrer l\'upload. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCapturePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    void handleCapture();
  }, []);

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPermission}>
          <CustomText size="lg" align="center">
            Camera and audio permissions are required
          </CustomText>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <CustomText size="md" color="#007AFF">
              Close
            </CustomText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedMedia) {

    return (
      <View style={styles.container}>
        {/* Draggable Story Frame Component */}
        <DraggableStoryFrame 
          uri={selectedMedia.uri}
          caption={caption}
          type={selectedMedia.type}
          aspectRatio={{ width: selectedMedia.width, height: selectedMedia.height }}
          captionPosition={captionPosition}
          onCaptionPositionChange={setCaptionPosition}
          isDraggable={true}
        />

        {/* Header */}
        {!hideUIForCapture && (
          <SafeAreaView style={styles.headerSafeArea}>
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={() => {
                  setSelectedMedia(null);
                  setCaption('');
                  setCaptionPosition(screenHeight * 0.5);
                }}
                style={styles.headerButton}
              >
                <Ionicons name="arrow-back" size={28} color="#FFF" />
              </TouchableOpacity>
              
              <View style={styles.headerRight}>
                {/* Add stickers button */}
                <TouchableOpacity style={[styles.headerButton, { marginRight: 12 }]}>
                  <Ionicons name="happy-outline" size={24} color="#FFF" />
                </TouchableOpacity>
                
                {/* Add text button */}
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={() => setShowCaption(true)}
                >
                  <Ionicons name="text-outline" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        )}

        {/* Bottom Controls */}
        {!hideUIForCapture && (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.bottomContainer}
          >
          <View>
            {showCaption ? (
              <View style={styles.captionInputContainer}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Write a caption..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  numberOfLines={3}
                  maxLength={80}
                  autoFocus
                  textAlignVertical="center"
                />
                <TouchableOpacity 
                  onPress={() => setShowCaption(false)}
                  style={styles.captionDoneButton}
                >
                  <CustomText size="md" color="#FFF" weight="bold">
                    Done
                  </CustomText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.bottomControls}>
                <TouchableOpacity 
                  onPress={() => setShowCaption(true)}
                  style={styles.addCaptionButton}
                >
                  <Ionicons name="text" size={20} color="#FFF" />
                  <CustomText size="sm" color="#FFF" style={{ marginLeft: 8 }}>
                    Add caption
                  </CustomText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handlePost} 
                  style={[styles.shareButton, isProcessing && styles.shareButtonDisabled]}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <ActivityIndicator size="small" color="#000" />
                      <CustomText size="md" color="#000" weight="bold" style={{ marginLeft: 8 }}>
                        Publication...
                      </CustomText>
                    </>
                  ) : (
                    <>
                      <CustomText size="md" color="#000" weight="bold">
                        Share to Story
                      </CustomText>
                      <Ionicons name="arrow-forward" size={20} color="#000" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
        )}

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#FFF" />
            <CustomText size="md" color="#FFF" style={{ marginTop: 10 }}>
              Publication en cours...
            </CustomText>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={type} ref={cameraRef} />
      
      {/* Camera Overlays */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent']}
        style={styles.topGradient}
      />
      
      <SafeAreaView style={styles.cameraControls}>
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleFlipCamera} style={styles.flipButton}>
            <Ionicons name="camera-reverse-outline" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.cameraBottomControls}>
          <TouchableOpacity onPress={handlePickFromGallery} style={styles.galleryButton}>
            <Ionicons name="images-outline" size={28} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCapturePress}
            onLongPress={handleStartRecording}
            onPressOut={handleStopRecording}
            delayLongPress={200}
          >
            <Animated.View
              style={[styles.captureButton, { transform: [{ scale: scaleAnim }] }]}
            >
              {isRecording && (
                <Animated.View
                  style={[
                    styles.recordingProgress,
                    {
                      width: recordingProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              )}
              <View style={[styles.captureInner, isRecording && styles.captureInnerRecording]} />
            </Animated.View>
          </TouchableOpacity>

          <View style={{ width: 28 }} />
        </View>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <CustomText size="sm" color="#FFF">
              Recording...
            </CustomText>
          </View>
        )}
      </SafeAreaView>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)']}
        style={styles.bottomGradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  storyContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  blurredBackground: {
    ...StyleSheet.absoluteFillObject,
    width: screenWidth,
    height: screenHeight,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    zIndex: 1,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 1,
  },
  headerSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 35,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  addCaptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 150,
    justifyContent: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.7,
  },
  captionInputContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 35,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 70,
  },
  captionInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    maxHeight: 80, // Limite à environ 3 lignes
    marginRight: 12,
    paddingVertical: 8,
    lineHeight: 22,
  },
  captionDoneButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  captionOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  captionText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  cameraControls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#FFF',
    padding: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  captureInner: {
    flex: 1,
    borderRadius: 35,
    backgroundColor: '#FFF',
  },
  captureInnerRecording: {
    backgroundColor: '#FF0000',
  },
  recordingProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0000',
    marginRight: 8,
  },
  noPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
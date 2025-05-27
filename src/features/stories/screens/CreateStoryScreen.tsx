import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Video } from 'expo-av';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCreateStory } from "@/hooks/useCreateStory";
import { StorySticker } from '../types';
import StickerPicker from "@/components/StickerPicker";
import MusicPicker from "@/components/MusicPicker";
import TextEditor from "@/components/TextEditor";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CreateStoryScreen({ navigation, route }: any) {
  const { eventId } = route.params || {};
  const { createStory, uploading } = useCreateStory();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);
  const [isRecording, setIsRecording] = useState(false);
  const [media, setMedia] = useState<{ uri: string; type: 'photo' | 'video' } | null>(null);
  const [caption, setCaption] = useState('');
  const [stickers, setStickers] = useState<StorySticker[]>([]);
  const [musicData, setMusicData] = useState<any>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  
  const cameraRef = useRef<Camera>(null);
  
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);
  
  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      setMedia({ uri: photo.uri, type: 'photo' });
    }
  };
  
  const startRecording = async () => {
    if (cameraRef.current) {
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 15, // 15 seconds max
        quality: Camera.Constants.VideoQuality['720p'],
      });
      setMedia({ uri: video.uri, type: 'video' });
      setIsRecording(false);
    }
  };
  
  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };
  
  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setMedia({
        uri: result.assets[0].uri,
        type: result.assets[0].type === 'video' ? 'video' : 'photo',
      });
    }
  };
  
  const addSticker = (sticker: StorySticker) => {
    setStickers([...stickers, sticker]);
    setShowStickerPicker(false);
  };
  
  const removeSticker = (id: string) => {
    setStickers(stickers.filter(s => s.id !== id));
  };
  
  const addText = (text: string, style: any) => {
    const textSticker: StorySticker = {
      id: Date.now().toString(),
      type: 'text' as any,
      data: { text, style },
      position: { x: SCREEN_WIDTH / 2 - 100, y: SCREEN_HEIGHT / 2 - 50 },
      size: { width: 200, height: 100 },
    };
    setStickers([...stickers, textSticker]);
    setShowTextEditor(false);
  };
  
  const publishStory = async () => {
    if (!media) return;
    
    try {
      await createStory({
        mediaUrl: media.uri, // In production, upload to storage first
        mediaType: media.type === 'photo' ? 'image' : 'video',
        caption,
        eventId,
        stickers,
        musicData,
      });
      
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create story. Please try again.');
    }
  };
  
  if (hasPermission === null) {
    return <View style={styles.container} />;
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>No access to camera</Text>
      </View>
    );
  }
  
  if (media) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Preview */}
        {media.type === 'photo' ? (
          <Image source={{ uri: media.uri }} style={styles.preview} />
        ) : (
          <Video
            source={{ uri: media.uri }}
            style={styles.preview}
            shouldPlay
            isLooping
          />
        )}
        
        {/* Stickers Layer */}
        {stickers.map((sticker) => (
          <TouchableOpacity
            key={sticker.id}
            style={[
              styles.stickerContainer,
              {
                left: sticker.position.x,
                top: sticker.position.y,
                width: sticker.size.width,
                height: sticker.size.height,
              },
            ]}
            onPress={() => removeSticker(sticker.id)}
          >
            {sticker.type === 'text' ? (
              <Text style={[styles.stickerText, sticker.data.style]}>
                {sticker.data.text}
              </Text>
            ) : (
              <Image source={{ uri: sticker.data.url }} style={styles.stickerImage} />
            )}
          </TouchableOpacity>
        ))}
        
        {/* Header */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity onPress={() => setMedia(null)}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowTextEditor(true)}
            >
              <MaterialIcons name="text-fields" size={28} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowStickerPicker(true)}
            >
              <MaterialIcons name="emoji-emotions" size={28} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowMusicPicker(true)}
            >
              <Ionicons name="musical-notes" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        
        {/* Bottom Actions */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.bottomActions}
        >
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={200}
          />
          
          <TouchableOpacity
            style={styles.publishButton}
            onPress={publishStory}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.publishText}>Share to Story</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
        
        {/* Pickers */}
        {showStickerPicker && (
          <StickerPicker
            onSelect={addSticker}
            onClose={() => setShowStickerPicker(false)}
          />
        )}
        
        {showMusicPicker && (
          <MusicPicker
            onSelect={(music) => {
              setMusicData(music);
              setShowMusicPicker(false);
            }}
            onClose={() => setShowMusicPicker(false)}
          />
        )}
        
        {showTextEditor && (
          <TextEditor
            onSave={addText}
            onClose={() => setShowTextEditor(false)}
          />
        )}
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        flashMode={flashMode}
      >
        {/* Header */}
        <SafeAreaView style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          
          <View style={styles.cameraHeaderActions}>
            <TouchableOpacity
              onPress={() => setFlashMode(
                flashMode === Camera.Constants.FlashMode.off
                  ? Camera.Constants.FlashMode.on
                  : Camera.Constants.FlashMode.off
              )}
            >
              <Ionicons
                name={flashMode === Camera.Constants.FlashMode.off ? "flash-off" : "flash"}
                size={28}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        
        {/* Bottom Controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity onPress={pickFromGallery} style={styles.galleryButton}>
            <Ionicons name="images" size={32} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
            onLongPress={startRecording}
            onPressOut={stopRecording}
          >
            <View style={[styles.captureButtonInner, isRecording && styles.recording]} />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setCameraType(
              cameraType === CameraType.back ? CameraType.front : CameraType.back
            )}
            style={styles.flipButton}
          >
            <Ionicons name="camera-reverse" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  preview: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
  },
  permissionText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 100,
  },
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cameraHeaderActions: {
    flexDirection: 'row',
    gap: 20,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'white',
  },
  recording: {
    backgroundColor: 'red',
  },
  galleryButton: {
    padding: 10,
  },
  flipButton: {
    padding: 10,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    zIndex: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 8,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
  },
  captionInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    color: 'white',
    fontSize: 16,
    marginBottom: 16,
    maxHeight: 100,
  },
  publishButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  publishText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  stickerContainer: {
    position: 'absolute',
    zIndex: 5,
  },
  stickerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  stickerText: {
    color: 'white',
    textAlign: 'center',
  },
});
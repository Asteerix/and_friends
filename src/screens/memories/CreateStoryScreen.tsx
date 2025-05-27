import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import CustomText, { AfterHoursText } from "@/components/common/CustomText";
import { useStories } from "@/hooks/useStories";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";

const { width, height } = Dimensions.get('window');

export default function CreateStoryScreen() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const cameraRef = useRef<Camera>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const { createStory } = useStories();
  const { uploadImage } = useSupabaseStorage();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleCapture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      setSelectedImage(photo.uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleFlipCamera = () => {
    setType(current => (current === CameraType.back ? CameraType.front : CameraType.back));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePost = async () => {
    if (!selectedImage) return;
    
    setIsUploading(true);
    
    try {
      const imageUrl = await uploadImage(selectedImage, 'stories');
      
      await createStory({
        imageUrl,
        caption,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error('Error posting story:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCapturePress = () => {
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
    
    handleCapture();
  };

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPermission}>
          <CustomText size="lg" align="center">
            Camera permission is required
          </CustomText>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <CustomText size="md" color="#007AFF">Close</CustomText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedImage) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.container}>
          <Image source={{ uri: selectedImage }} style={styles.preview} />
          
          <View style={styles.overlay}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setSelectedImage(null)}>
                <CustomText size="lg" color="#FFF">← Back</CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePost}
                disabled={isUploading}
              >
                <CustomText
                  size="lg"
                  color={isUploading ? '#999' : '#FFF'}
                  weight="bold"
                >
                  {isUploading ? 'Posting...' : 'Post'}
                </CustomText>
              </TouchableOpacity>
            </View>

            <View style={styles.captionContainer}>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor="#CCC"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={200}
              />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={type} ref={cameraRef}>
        <View style={styles.overlay}>
          <SafeAreaView style={styles.controls}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <CustomText size="xl" color="#FFF">×</CustomText>
              </TouchableOpacity>
              <AfterHoursText size="lg" color="#FFF">
                Add to Story
              </AfterHoursText>
              <TouchableOpacity onPress={handleFlipCamera}>
                <CustomText size="lg" color="#FFF">🔄</CustomText>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity
                onPress={handlePickFromGallery}
                style={styles.galleryButton}
              >
                <CustomText size="lg" color="#FFF">🖼</CustomText>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCapturePress}>
                <Animated.View
                  style={[
                    styles.captureButton,
                    { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  <View style={styles.captureInner} />
                </Animated.View>
              </TouchableOpacity>

              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
        </View>
      </Camera>
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
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  controls: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
  },
  galleryButton: {
    width: 40,
    height: 40,
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
  },
  captureInner: {
    flex: 1,
    borderRadius: 35,
    backgroundColor: '#FFF',
  },
  preview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
  },
  captionInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFF',
    fontSize: 16,
    maxHeight: 100,
  },
  noPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
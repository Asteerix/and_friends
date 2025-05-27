import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { useStories } from "@/hooks/useStories";
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const stickers = ['🎉', '🔥', '❤️', '😎', '🌟', '🎊', '✨', '🎈', '🎮', '🍕'];

export default function CreateStoryScreen() {
  const navigation = useNavigation();
  const { createStory } = useStories();
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [selectedStickers, setSelectedStickers] = useState<any[]>([]);
  const [showTextInput, setShowTextInput] = useState(false);
  
  const panAnim = useRef(new Animated.ValueXY()).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAddSticker = (sticker: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSticker = {
      id: Date.now().toString(),
      emoji: sticker,
      position: {
        x: Math.random() * (width - 60) + 30,
        y: Math.random() * (height / 2) + 100,
      },
      scale: 1,
    };
    setSelectedStickers([...selectedStickers, newSticker]);
  };

  const handlePublish = async () => {
    if (!imageUri) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    await createStory({
      image_url: imageUri,
      text: text,
      text_position: { x: width / 2, y: height / 3 },
      stickers: selectedStickers,
    });

    navigation.goBack();
  };

  if (!imageUri) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FF6B6B', '#4ECDC4']}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.mediaOptions,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.title}>Create Story</Text>
          
          <TouchableOpacity style={styles.mediaButton} onPress={handleTakePhoto}>
            <LinearGradient
              colors={['#45B7D1', '#3498DB']}
              style={styles.mediaButtonGradient}
            >
              <Ionicons name="camera" size={40} color="white" />
              <Text style={styles.mediaButtonText}>Take Photo</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mediaButton} onPress={handlePickImage}>
            <LinearGradient
              colors={['#96CEB4', '#88C999']}
              style={styles.mediaButtonGradient}
            >
              <Ionicons name="images" size={40} color="white" />
              <Text style={styles.mediaButtonText}>Choose from Gallery</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Image source={{ uri: imageUri }} style={styles.storyImage} />
      
      {/* Dark overlay for better text visibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.3)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header Controls */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setImageUri(null)}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowTextInput(!showTextInput)}
          >
            <Ionicons name="text" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Text Input */}
      {showTextInput && (
        <BlurView intensity={80} tint="dark" style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Add text..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            multiline
            autoFocus
          />
          <TouchableOpacity
            onPress={() => setShowTextInput(false)}
            style={styles.doneButton}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Story Text Display */}
      {text && !showTextInput && (
        <Animated.View
          style={[
            styles.storyText,
            {
              transform: [
                { translateX: panAnim.x },
                { translateY: panAnim.y },
              ],
            },
          ]}
        >
          <Text style={styles.storyTextContent}>{text}</Text>
        </Animated.View>
      )}

      {/* Stickers Display */}
      {selectedStickers.map((sticker) => (
        <Animated.View
          key={sticker.id}
          style={[
            styles.sticker,
            {
              left: sticker.position.x,
              top: sticker.position.y,
              transform: [{ scale: sticker.scale }],
            },
          ]}
        >
          <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
        </Animated.View>
      ))}

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Stickers Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stickersBar}
          contentContainerStyle={styles.stickersContent}
        >
          {stickers.map((sticker, index) => (
            <TouchableOpacity
              key={index}
              style={styles.stickerButton}
              onPress={() => handleAddSticker(sticker)}
            >
              <Text style={styles.stickerButtonEmoji}>{sticker}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Publish Button */}
        <TouchableOpacity style={styles.publishButton} onPress={handlePublish}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8787']}
            style={styles.publishButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.publishButtonText}>Share Story</Text>
            <Ionicons name="send" size={20} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
  },
  mediaOptions: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    marginBottom: 60,
    textAlign: 'center',
  },
  mediaButton: {
    width: '100%',
    marginBottom: 20,
  },
  mediaButtonGradient: {
    paddingVertical: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  mediaButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
    marginTop: 10,
  },
  storyImage: {
    position: 'absolute',
    width: width,
    height: height,
    resizeMode: 'cover',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 15,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputContainer: {
    position: 'absolute',
    top: '40%',
    left: 20,
    right: 20,
    padding: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  textInput: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
    minHeight: 60,
  },
  doneButton: {
    alignSelf: 'center',
    marginTop: 15,
    paddingHorizontal: 30,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  storyText: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    left: width / 2 - 100,
    top: height / 3,
  },
  storyTextContent: {
    fontSize: 24,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  sticker: {
    position: 'absolute',
  },
  stickerEmoji: {
    fontSize: 50,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
  },
  stickersBar: {
    maxHeight: 70,
    marginBottom: 20,
  },
  stickersContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  stickerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stickerButtonEmoji: {
    fontSize: 30,
  },
  publishButton: {
    marginHorizontal: 20,
  },
  publishButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
  },
  publishButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
});
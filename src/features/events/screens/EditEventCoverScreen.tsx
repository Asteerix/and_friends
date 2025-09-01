import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEventCover } from '../context/EventCoverContext';

const { width: screenWidth } = Dimensions.get('window');

// Constants for sticker functionality
const MAX_STICKERS = 10;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;

// Import event templates from data file
import {
  EVENT_TEMPLATE_CATEGORIES,
  FONTS as IMPORTED_FONTS,
  BACKGROUNDS as IMPORTED_BACKGROUNDS,
  STICKER_CATEGORIES as IMPORTED_STICKER_CATEGORIES,
} from '../data/eventTemplates';
import BackButton from '@/assets/svg/back-button.svg';

// Map fonts with their styles
const FONTS = IMPORTED_FONTS.map((font) => ({
  ...font,
  value: font.value, // Keep the value property
  style: {
    fontFamily: font.value,
    fontWeight:
      font.name === 'AFTERPARTY'
        ? ('bold' as const)
        : font.name === 'Bold Impact'
          ? ('900' as const)
          : font.name === 'Modern'
            ? ('300' as const)
            : font.name === 'Elegant'
              ? ('500' as const)
              : ('normal' as const),
    fontStyle:
      font.name === 'Classic Invite' || font.name === 'Fun Script'
        ? ('italic' as const)
        : ('normal' as const),
  },
}));

const BACKGROUNDS = IMPORTED_BACKGROUNDS.map((bg) => ({
  ...bg,
  colors: bg.colors as [string, string],
  type: bg.type,
  start: bg.start,
  end: bg.end,
}));

// Map sticker categories to include emoji names
const STICKER_CATEGORIES = IMPORTED_STICKER_CATEGORIES.map((category) => ({
  ...category,
  stickers: category.stickers.map((emoji, index) => ({
    id: `${category.id}-${index + 1}`,
    emoji: emoji,
    name: emoji, // Using emoji as name for simplicity
  })),
}));

// Use event template categories from imported data
const TEMPLATE_CATEGORIES = EVENT_TEMPLATE_CATEGORIES.map((category) => ({
  ...category,
  templates: category.templates, // Templates already have the correct structure
}));

type TabType = 'style' | 'decorate' | 'template';

interface StickerType {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

// Instagram/Snapchat style Draggable Sticker Component
const DraggableSticker: React.FC<{
  sticker: StickerType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (sticker: StickerType) => void;
  onRemove: () => void;
}> = ({ sticker, isSelected, onSelect, onUpdate, onRemove }) => {
  const pan = useRef(
    new Animated.ValueXY({
      x: (sticker.x / 100) * screenWidth,
      y: (sticker.y / 100) * 700,
    })
  ).current;

  const scale = useRef(new Animated.Value(sticker.scale)).current;
  const rotation = useRef(new Animated.Value(sticker.rotation)).current;
  const lastScale = useRef(sticker.scale);
  const lastRotation = useRef(sticker.rotation);
  const lastDistance = useRef(0);
  const lastAngle = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        onSelect();

        // Set offset for current position
        pan.setOffset({
          x: (pan.x as any)._value || 0,
          y: (pan.y as any)._value || 0,
        });
        pan.setValue({ x: 0, y: 0 });

        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },

      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches || [];

        // Handle pinch to zoom and rotate
        if (touches.length === 2) {
          const touch1 = touches[0];
          const touch2 = touches[1];

          if (touch1 && touch2) {
            // Calculate distance for scaling
            const distance = Math.sqrt(
              Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
            );

            // Calculate angle for rotation
            const angle =
              Math.atan2(touch2.pageY - touch1.pageY, touch2.pageX - touch1.pageX) *
              (180 / Math.PI);

            // Handle scaling
            if (lastDistance.current > 0) {
              const delta = distance / lastDistance.current;
              const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, lastScale.current * delta));
              scale.setValue(newScale);
            }

            // Handle rotation
            if (lastAngle.current !== 0) {
              const angleDelta = angle - lastAngle.current;
              const newRotation = lastRotation.current + angleDelta;
              rotation.setValue(newRotation);
            }

            lastDistance.current = distance;
            lastAngle.current = angle;
          }
        } else {
          // Normal drag
          pan.x.setValue(gestureState.dx);
          pan.y.setValue(gestureState.dy);
        }
      },

      onPanResponderRelease: () => {
        pan.flattenOffset();
        lastDistance.current = 0;
        lastAngle.current = 0;

        // Update sticker position, scale and rotation
        const currentX = (((pan.x as any)._value || 0) / screenWidth) * 100;
        const currentY = (((pan.y as any)._value || 0) / 700) * 100;
        const currentScale = (scale as any)._value || 1;
        const currentRotation = (rotation as any)._value || 0;

        lastScale.current = currentScale;
        lastRotation.current = currentRotation;

        onUpdate({
          ...sticker,
          x: Math.max(0, Math.min(100, currentX)),
          y: Math.max(0, Math.min(100, currentY)),
          scale: currentScale,
          rotation: currentRotation,
        });
      },
    })
  ).current;

  const animatedStyle = {
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { scale },
      {
        rotate: rotation.interpolate({
          inputRange: [-360, 360],
          outputRange: ['-360deg', '360deg'],
        }),
      },
    ],
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 60,
          height: 60,
          zIndex: isSelected ? 11 : 10,
        },
        animatedStyle,
      ]}
      {...panResponder.panHandlers}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Text style={{ fontSize: 40 }}>{sticker.emoji}</Text>
      </View>

      {isSelected && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            top: -8,
            right: -8,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
          onPress={onRemove}
        >
          <Ionicons name="close" size={14} color="#000" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default function EditEventCoverScreen() {
  const router = useRouter();
  const { coverData, updateCoverData, saveCoverData } = useEventCover();

  const [activeTab, setActiveTab] = useState<TabType>('style');
  const [selectedTitleFont, setSelectedTitleFont] = useState(coverData.selectedTitleFont || '1');
  const [selectedSubtitleFont, setSelectedSubtitleFont] = useState(
    coverData.selectedSubtitleFont || '1'
  );
  const [selectedBackground, setSelectedBackground] = useState(coverData.selectedBackground || '');
  const [eventTitle, setEventTitle] = useState(coverData.eventTitle || '');
  const [eventSubtitle, setEventSubtitle] = useState(coverData.eventSubtitle || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
  const [coverImage, setCoverImage] = useState(coverData.coverImage || '');
  const [uploadedImage, setUploadedImage] = useState(coverData.uploadedImage || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('party');
  const [placedStickers, setPlacedStickers] = useState<StickerType[]>(
    coverData.placedStickers || []
  );
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDecorationMode, setIsDecorationMode] = useState(false);
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState('party');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<{
    id: string;
    name: string;
    image: any;
  } | null>(coverData.selectedTemplate || null);

  // Load saved data when component mounts
  useEffect(() => {
    setSelectedTitleFont(coverData.selectedTitleFont || '1');
    setSelectedSubtitleFont(coverData.selectedSubtitleFont || '1');
    setSelectedBackground(coverData.selectedBackground || '');
    setEventTitle(coverData.eventTitle || '');
    setEventSubtitle(coverData.eventSubtitle || '');
    setCoverImage(coverData.coverImage || '');
    setUploadedImage(coverData.uploadedImage || '');
    setPlacedStickers(coverData.placedStickers || []);
    setSelectedTemplate(coverData.selectedTemplate || null);
  }, [coverData]);

  const handleUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadedImage(result.assets[0].uri);
      setCoverImage(result.assets[0].uri);
      setSelectedBackground('');
      setSelectedTemplate(null); // Clear selected template
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleResetToDefault = () => {
    setCoverImage('');
    setUploadedImage('');
    setSelectedBackground('');
    setSelectedTemplate(null);
    setSelectedTitleFont('1');
    setSelectedSubtitleFont('1');
    setPlacedStickers([]);
    setEventTitle('');
    setEventSubtitle('');

    // Update context with default values
    updateCoverData({
      eventTitle: '',
      eventSubtitle: '',
      selectedTitleFont: '1',
      selectedSubtitleFont: '1',
      selectedBackground: '',
      coverImage: '',
      uploadedImage: '',
      placedStickers: [],
      selectedTemplate: null,
    });

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Create the cover data object
      const newCoverData = {
        eventTitle,
        eventSubtitle,
        selectedTitleFont,
        selectedSubtitleFont,
        selectedBackground,
        coverImage,
        uploadedImage,
        placedStickers,
        selectedTemplate,
      };

      // Update the context with all the current data
      updateCoverData(newCoverData);

      // Save to AsyncStorage with the new data
      await saveCoverData(newCoverData);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save cover');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterDecorationMode = () => {
    setIsDecorationMode(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleExitDecorationMode = (save: boolean) => {
    if (save) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsDecorationMode(false);
  };

  const handleBackgroundSelect = (bgId: string) => {
    setSelectedBackground(bgId);
    setCoverImage(''); // Désélectionner l'image quand on choisit un background
    setSelectedTemplate(null); // Clear selected template
  };

  const handleImageSelect = () => {
    if (uploadedImage) {
      setCoverImage(uploadedImage);
      setSelectedBackground(''); // Désélectionner le background quand on choisit l'image
      setSelectedTemplate(null); // Clear selected template
    }
  };

  const getTitleFontStyle = () => {
    const font = FONTS.find((f) => f.id === selectedTitleFont);
    return font ? font.style : {};
  };

  const getSubtitleFontStyle = () => {
    const font = FONTS.find((f) => f.id === selectedSubtitleFont);
    return font ? font.style : {};
  };

  const renderStyleTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Event Title Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Title</Text>
        <TextInput
          style={styles.titleInput}
          value={eventTitle.replace('\n', ' ')}
          onChangeText={(text) => {
            if (text.length <= 50) {
              setEventTitle(
                text.includes(' ') && text.length > 20 ? text.replace(' ', '\n') : text
              );
            }
          }}
          placeholder="Tap to add your event title"
          placeholderTextColor="#999"
          maxLength={50}
        />
        <Text style={styles.characterCount}>{eventTitle.length}/50</Text>
      </View>

      {/* Event Subtitle Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Subtitle</Text>
        <TextInput
          style={[styles.titleInput, styles.subtitleInput]}
          value={eventSubtitle.replace('\n', ' ')}
          onChangeText={(text) => {
            if (text.length <= 80) {
              setEventSubtitle(text);
            }
          }}
          placeholder="Drop a punchline to get the crew hyped for what's coming"
          placeholderTextColor="#999"
          multiline
          numberOfLines={2}
          maxLength={80}
        />
        <Text style={styles.characterCount}>{eventSubtitle.length}/80</Text>
      </View>

      {/* Title Font Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Title Font</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fontsScroll}>
          <View style={styles.fontsRow}>
            {FONTS.map((font) => (
              <TouchableOpacity
                key={font.id}
                style={[
                  styles.fontOption,
                  selectedTitleFont === font.id && styles.selectedFontOption,
                ]}
                onPress={() => setSelectedTitleFont(font.id)}
              >
                <Text
                  style={[
                    styles.fontText,
                    font.style,
                    selectedTitleFont === font.id && styles.selectedFontText,
                  ]}
                >
                  {font.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Subtitle Font Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subtitle Font</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fontsScroll}>
          <View style={styles.fontsRow}>
            {FONTS.map((font) => (
              <TouchableOpacity
                key={font.id}
                style={[
                  styles.fontOption,
                  selectedSubtitleFont === font.id && styles.selectedFontOption,
                ]}
                onPress={() => setSelectedSubtitleFont(font.id)}
              >
                <Text
                  style={[
                    styles.fontText,
                    font.style,
                    selectedSubtitleFont === font.id && styles.selectedFontText,
                  ]}
                >
                  {font.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Background Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Background</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.backgroundsScroll}
        >
          <View style={styles.backgroundsRow}>
            {BACKGROUNDS.map((bg) => (
              <TouchableOpacity
                key={bg.id}
                style={styles.backgroundOption}
                onPress={() => handleBackgroundSelect(bg.id)}
              >
                <LinearGradient
                  colors={bg.colors}
                  style={[
                    styles.backgroundGradient,
                    selectedBackground === bg.id && styles.selectedBackground,
                  ]}
                />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.backgroundOption} onPress={handleUploadImage}>
              <View style={styles.addBackgroundBtn}>
                <Ionicons name="add" size={24} color="#007AFF" />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Upload Media Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cover Image</Text>
        {uploadedImage ? (
          <View style={styles.uploadedImageContainer}>
            <TouchableOpacity
              style={[
                styles.uploadedImageWrapper,
                coverImage === uploadedImage && styles.selectedUploadedImage,
              ]}
              onPress={handleImageSelect}
            >
              <Image source={{ uri: uploadedImage }} style={styles.uploadedImageThumb} />
              {coverImage === uploadedImage && (
                <View style={styles.selectedCheckmark}>
                  <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.changeImageBtn} onPress={handleUploadImage}>
              <Ionicons name="camera-outline" size={20} color="#007AFF" />
              <Text style={styles.changeImageText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadOption} onPress={handleUploadImage}>
            <Ionicons name="image-outline" size={24} color="#666" />
            <Text style={styles.uploadText}>Upload Image</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  const handleStickerSelect = (sticker: any) => {
    if (placedStickers.length >= MAX_STICKERS) {
      Alert.alert('Limit Reached', `You can only add up to ${MAX_STICKERS} stickers`);
      return;
    }

    const newSticker = {
      id: `placed-${Date.now()}`,
      emoji: sticker.emoji,
      x: 50, // Center X %
      y: 30, // Upper center Y %
      scale: 1.2,
      rotation: 0,
    };
    setPlacedStickers([...placedStickers, newSticker]);
    setSelectedStickerId(newSticker.id);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Automatically enter decoration mode when adding a new sticker
    setIsDecorationMode(true);
  };

  const handleRemoveSticker = (stickerId: string) => {
    setPlacedStickers(placedStickers.filter((s) => s.id !== stickerId));
  };

  const renderDecorateTab = () => {
    const currentCategory = STICKER_CATEGORIES.find((cat) => cat.id === selectedCategory);
    const filteredStickers =
      currentCategory?.stickers.filter(
        (sticker) =>
          searchQuery === '' || sticker.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) || [];

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <View style={styles.categoryRow}>
            {STICKER_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.id && styles.selectedCategoryTab,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category.id && styles.selectedCategoryTabText,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stickers"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Stickers Grid */}
        <View style={styles.stickersGrid}>
          {filteredStickers.map((sticker) => (
            <TouchableOpacity
              key={sticker.id}
              style={styles.stickerOption}
              onPress={() => handleStickerSelect(sticker)}
            >
              <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Placed Stickers Info */}
        {placedStickers.length > 0 && (
          <View style={styles.placedStickersSection}>
            <View style={styles.placedStickersInfo}>
              <Text style={styles.placedStickersText}>
                {placedStickers.length} sticker{placedStickers.length > 1 ? 's' : ''} added
              </Text>
              <TouchableOpacity onPress={() => setPlacedStickers([])}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {/* Reposition Stickers button in Decorate panel */}
            <TouchableOpacity
              style={styles.repositionPanelButton}
              onPress={handleEnterDecorationMode}
            >
              <Ionicons name="move-outline" size={20} color="#007AFF" />
              <Text style={styles.repositionPanelButtonText}>Reposition Stickers</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  const handleTemplateSelect = (template: { id: string; name: string; image: any }) => {
    // Store the template image as a selected template
    setSelectedTemplate(template);
    setCoverImage(''); // Clear regular cover image
    setUploadedImage('');
    setSelectedBackground('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderTemplateTab = () => {
    const currentCategory = TEMPLATE_CATEGORIES.find((cat) => cat.id === selectedTemplateCategory);
    const filteredTemplates =
      currentCategory?.templates.filter(
        (template) =>
          templateSearchQuery === '' ||
          template.name.toLowerCase().includes(templateSearchQuery.toLowerCase())
      ) || [];

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <View style={styles.categoryRow}>
            {TEMPLATE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  selectedTemplateCategory === category.id && styles.selectedCategoryTab,
                ]}
                onPress={() => setSelectedTemplateCategory(category.id)}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedTemplateCategory === category.id && styles.selectedCategoryTabText,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates"
            placeholderTextColor="#999"
            value={templateSearchQuery}
            onChangeText={setTemplateSearchQuery}
          />
        </View>

        {/* Templates Grid */}
        <View style={styles.templatesGrid}>
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={styles.templateOption}
                onPress={() => handleTemplateSelect(template)}
                activeOpacity={0.9}
              >
                <Image source={template.image} style={styles.templateImage} />
                <View style={styles.templateOverlay}>
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.templateGradient}
                  />
                  <Text style={styles.templateName}>{template.name}</Text>
                </View>
                {selectedTemplate?.id === template.id && (
                  <View style={styles.templateSelectedBadge}>
                    <Ionicons name="checkmark-circle" size={26} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noTemplatesContainer}>
              <Ionicons name="image-outline" size={48} color="#999" />
              <Text style={styles.noTemplatesText}>No templates found</Text>
              <Text style={styles.noTemplatesSubtext}>Try another search term</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const getBackgroundStyle = () => {
    if (selectedBackground) {
      const bg = BACKGROUNDS.find((b) => b.id === selectedBackground);
      if (bg) {
        return { colors: bg.colors };
      }
    }
    return { colors: ['#C8E6C9', '#C8E6C9'] as [string, string] };
  };

  // Decoration mode screen
  if (isDecorationMode) {
    return (
      <View style={styles.container}>
        {/* Header with preview - no scroll */}
        <View style={styles.decorationModeContainer}>
          <View style={styles.headerContainer}>
            {selectedBackground && !coverImage && !selectedTemplate ? (
              <LinearGradient colors={getBackgroundStyle().colors} style={styles.headerGradient} />
            ) : selectedTemplate ? (
              <Image source={selectedTemplate.image} style={styles.coverImage} />
            ) : (
              <Image
                source={{
                  uri: coverImage || uploadedImage || 'https://via.placeholder.com/400x700',
                }}
                style={styles.coverImage}
              />
            )}

            {/* Overlay for readability */}
            <View style={styles.headerOverlay} pointerEvents="none" />

            {/* Placed Stickers - Draggable in decoration mode */}
            <View style={styles.stickersLayer} pointerEvents="box-none">
              {placedStickers.map((sticker) => (
                <DraggableSticker
                  key={sticker.id}
                  sticker={sticker}
                  isSelected={selectedStickerId === sticker.id}
                  onSelect={() => setSelectedStickerId(sticker.id)}
                  onUpdate={(updatedSticker) => {
                    setPlacedStickers(
                      placedStickers.map((s) => (s.id === updatedSticker.id ? updatedSticker : s))
                    );
                  }}
                  onRemove={() => {
                    handleRemoveSticker(sticker.id);
                    if (selectedStickerId === sticker.id) {
                      setSelectedStickerId(null);
                    }
                  }}
                />
              ))}
            </View>

            {/* Decoration mode header */}
            <View style={styles.decorationHeader}>
              <TouchableOpacity
                onPress={() => handleExitDecorationMode(false)}
                style={styles.decorationButton}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>

              <Text style={styles.decorationTitle}>Position Stickers</Text>

              <TouchableOpacity
                onPress={() => handleExitDecorationMode(true)}
                style={styles.decorationButton}
              >
                <Ionicons name="checkmark" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Event title and subtitle - always visible but not interactive in decoration mode */}
            <View style={styles.eventTitleContainer} pointerEvents="none">
              <Text style={[styles.eventTitle, getTitleFontStyle()]}>
                {eventTitle || 'Tap to add your\nevent title'}
              </Text>
              <Text style={[styles.eventSubtitle, getSubtitleFontStyle()]}>
                {eventSubtitle || "Drop a punchline to get the crew\nhyped for what's coming."}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} showsVerticalScrollIndicator={false}>
        {/* Header with preview */}
        <View style={styles.headerContainer}>
          {selectedBackground && !coverImage && !selectedTemplate ? (
            <LinearGradient colors={getBackgroundStyle().colors} style={styles.headerGradient} />
          ) : selectedTemplate ? (
            <Image source={selectedTemplate.image} style={styles.coverImage} />
          ) : (
            <Image
              source={{ uri: coverImage || uploadedImage || 'https://via.placeholder.com/400x700' }}
              style={styles.coverImage}
            />
          )}

          {/* Overlay for readability */}
          <View style={styles.headerOverlay} pointerEvents="none" />

          {/* Placed Stickers - Static in normal mode */}
          <View style={styles.stickersLayer} pointerEvents="none">
            {placedStickers.map((sticker) => (
              <View
                key={sticker.id}
                style={[
                  styles.staticSticker,
                  {
                    left: `${sticker.x}%`,
                    top: `${sticker.y}%`,
                    transform: [{ scale: sticker.scale }, { rotate: `${sticker.rotation}deg` }],
                  },
                ]}
              >
                <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
              </View>
            ))}
          </View>

          {/* Top navigation bar */}
          <View style={styles.topNavBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <BackButton width={24} height={24} fill="#FFF" color="#FFF" stroke="#FFF" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Edit Cover</Text>

            <View style={styles.rightIcons} />
          </View>

          {/* Event title and subtitle - always visible */}
          <View style={styles.eventTitleContainer}>
            <TouchableOpacity onPress={() => setIsEditingTitle(true)}>
              <Text style={[styles.eventTitle, getTitleFontStyle()]}>
                {eventTitle || 'Tap to add your\nevent title'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsEditingSubtitle(true)}>
              <Text style={[styles.eventSubtitle, getSubtitleFontStyle()]}>
                {eventSubtitle || "Drop a punchline to get the crew\nhyped for what's coming."}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Title Edit Modal */}
          {isEditingTitle && (
            <View style={styles.editOverlay}>
              <View style={styles.editModal}>
                <Text style={styles.editModalTitle}>Edit Title</Text>
                <TextInput
                  style={styles.editModalInput}
                  value={eventTitle.replace('\n', ' ')}
                  onChangeText={(text) => {
                    if (text.length <= 50) {
                      setEventTitle(
                        text.includes(' ') && text.length > 20 ? text.replace(' ', '\n') : text
                      );
                    }
                  }}
                  placeholder="Tap to add your event title"
                  placeholderTextColor="#999"
                  autoFocus
                  maxLength={50}
                />
                <Text style={styles.modalCharacterCount}>{eventTitle.length}/50</Text>
                <View style={styles.editModalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setIsEditingTitle(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => setIsEditingTitle(false)}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Subtitle Edit Modal */}
          {isEditingSubtitle && (
            <View style={styles.editOverlay}>
              <View style={styles.editModal}>
                <Text style={styles.editModalTitle}>Edit Subtitle</Text>
                <TextInput
                  style={[styles.editModalInput, { height: 80 }]}
                  value={eventSubtitle.replace('\n', ' ')}
                  onChangeText={(text) => {
                    if (text.length <= 80) {
                      setEventSubtitle(text);
                    }
                  }}
                  placeholder="Drop a punchline to get the crew hyped for what's coming"
                  placeholderTextColor="#999"
                  autoFocus
                  multiline
                  numberOfLines={3}
                  maxLength={80}
                />
                <Text style={styles.modalCharacterCount}>{eventSubtitle.length}/80</Text>
                <View style={styles.editModalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setIsEditingSubtitle(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => setIsEditingSubtitle(false)}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Reset to Default button */}
          <TouchableOpacity style={styles.resetButton} onPress={handleResetToDefault}>
            <Ionicons name="trash-outline" size={20} color="#666" />
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom sheet with tabs */}
        <View style={styles.bottomSheet}>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'style' && styles.activeTab]}
              onPress={() => setActiveTab('style')}
            >
              <Text style={[styles.tabText, activeTab === 'style' && styles.activeTabText]}>
                Style
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'decorate' && styles.activeTab]}
              onPress={() => setActiveTab('decorate')}
            >
              <Text style={[styles.tabText, activeTab === 'decorate' && styles.activeTabText]}>
                Decorate
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'template' && styles.activeTab]}
              onPress={() => setActiveTab('template')}
            >
              <Text style={[styles.tabText, activeTab === 'template' && styles.activeTabText]}>
                Template
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab content */}
          <View style={styles.tabContent}>
            {activeTab === 'style' && renderStyleTab()}
            {activeTab === 'decorate' && renderDecorateTab()}
            {activeTab === 'template' && renderTemplateTab()}
          </View>

          {/* Action buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.discardText}>Discard Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  headerContainer: {
    height: 700,
    width: '100%',
    position: 'relative',
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  headerGradient: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 1,
  },
  topNavBar: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
    height: 48,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#FFF',
    fontWeight: '600',
    fontSize: 22,
    textAlign: 'center',
  },
  rightIcons: {
    flexDirection: 'row',
  },
  eventTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    transform: [{ translateY: -50 }],
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 50,
  },
  eventTitle: {
    color: '#FFF',
    fontSize: 38,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 44,
  },
  eventSubtitle: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
    opacity: 0.85,
  },
  resetButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 80,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
  },
  bottomSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 400,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 16,
    color: '#007AFF',
  },
  fontsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  fontsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  fontOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minWidth: 120,
  },
  selectedFontOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  fontText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  selectedFontText: {
    color: '#FFF',
  },
  backgroundsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  backgroundsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  backgroundOption: {
    width: 50,
    height: 50,
  },
  backgroundGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBackground: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  addBackgroundBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  uploadText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#000',
  },
  categoryScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: 20,
  },
  categoryTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
  },
  selectedCategoryTab: {
    backgroundColor: '#007AFF',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryTabText: {
    color: '#FFF',
  },
  stickersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  stickerOption: {
    width: (screenWidth - 60) / 4,
    height: (screenWidth - 60) / 4,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    padding: 8,
  },
  stickerEmoji: {
    fontSize: 36,
  },
  placedStickersInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  placedStickersText: {
    fontSize: 14,
    color: '#666',
  },
  clearAllText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  placedSticker: {
    position: 'absolute',
    width: 60,
    height: 60,
    zIndex: 200,
  },
  placedStickerEmoji: {
    fontSize: 40,
    textAlign: 'center',
  },
  removeStickerBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 10,
  },
  stickersLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  stickerControlBtn: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    backgroundColor: '#FF3B30',
    top: -10,
    right: -10,
  },
  scaleUpBtn: {
    backgroundColor: '#007AFF',
    bottom: -10,
    right: -10,
  },
  scaleDownBtn: {
    backgroundColor: '#007AFF',
    bottom: -10,
    left: -10,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 20,
    marginTop: 8,
    gap: 12, // espace entre les éléments
  },
  noTemplatesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noTemplatesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  noTemplatesSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  templateOption: {
    // Réduit de 10% : multiplié par 0.90
    width: ((screenWidth - 24 - 12) / 2) * 0.9,
    height: ((screenWidth - 24 - 12) / 2) * 1.4 * 0.9, // ratio portrait réduit de 10%
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F5F5F7',
  },
  templateImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  templateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    justifyContent: 'flex-end',
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  templateGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  templateName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  templateSelectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  actionsContainer: {
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
  discardText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
  },
  uploadedImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  uploadedImageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedUploadedImage: {
    borderColor: '#007AFF',
  },
  uploadedImageThumb: {
    width: '100%',
    height: '100%',
  },
  selectedCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
  },
  changeImageText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  titleInput: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
  },
  subtitleInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  editModal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 350,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  editModalInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
  },
  modalCharacterCount: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
    textAlign: 'right',
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Decoration mode styles
  decorationModeContainer: {
    flex: 1,
  },
  decorationHeader: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  decorationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorationTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
  },
  staticSticker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  repositionButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  repositionButtonText: {
    color: '#007AFF',
    fontWeight: '500',
    fontSize: 16,
  },
  placedStickersSection: {
    marginTop: 24,
  },
  repositionPanelButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  repositionPanelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

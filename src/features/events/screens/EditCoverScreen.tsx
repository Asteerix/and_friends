import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import CustomText, { AfterHoursText, OffbeatText, PlayfairText } from '@/shared/ui/CustomText';
import GradientBackground from '@/shared/ui/GradientBackground';

const { width } = Dimensions.get('window');

const fontOptions = [
  { id: 'afterHours', name: 'After Hours', component: AfterHoursText },
  { id: 'playfair', name: 'Playfair', component: PlayfairText },
  { id: 'offbeat', name: 'Offbeat', component: OffbeatText },
];

const colorOptions = [
  ['#FF6B6B', '#FF8787'],
  ['#4ECDC4', '#44A3AA'],
  ['#45B7D1', '#3498DB'],
  ['#96CEB4', '#88C999'],
  ['#FFD93D', '#FFE873'],
  ['#FF6B9D', '#FFC4D6'],
  ['#8B5CF6', '#A78BFA'],
  ['#6BCF7F', '#92E3A9'],
];

const decorations = [
  { id: 'star', emoji: '⭐' },
  { id: 'heart', emoji: '❤️' },
  { id: 'party', emoji: '🎉' },
  { id: 'cake', emoji: '🎂' },
  { id: 'music', emoji: '🎵' },
  { id: 'drink', emoji: '🍷' },
  { id: 'pizza', emoji: '🍕' },
  { id: 'dance', emoji: '💃' },
  { id: 'fire', emoji: '🔥' },
  { id: 'sparkle', emoji: '✨' },
];

const templates = [
  {
    id: 'birthday',
    name: 'Birthday',
    gradient: ['#6BCF7F', '#92E3A9'],
    font: 'playfair',
    decorations: ['🎂', '🎉'],
  },
  {
    id: 'party',
    name: 'Party',
    gradient: ['#FF6B9D', '#FFC4D6'],
    font: 'afterHours',
    decorations: ['🎉', '💃'],
  },
  {
    id: 'dinner',
    name: 'Dinner',
    gradient: ['#8B5CF6', '#A78BFA'],
    font: 'playfair',
    decorations: ['🍷', '🍕'],
  },
  {
    id: 'concert',
    name: 'Concert',
    gradient: ['#45B7D1', '#3498DB'],
    font: 'offbeat',
    decorations: ['🎵', '🔥'],
  },
  {
    id: 'casual',
    name: 'Casual',
    gradient: ['#FFD93D', '#FFE873'],
    font: 'afterHours',
    decorations: ['⭐', '✨'],
  },
];

export default function EditCoverScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ eventTitle?: string; onSave?: string }>();
  const { eventTitle = 'Event Title' } = params;

  const [activeTab, setActiveTab] = useState<'style' | 'decorate' | 'templates'>('style');
  const [selectedFont, setSelectedFont] = useState('afterHours');
  const [selectedGradient, setSelectedGradient] = useState<[string, string]>(
    colorOptions[0] as [string, string]
  );
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [placedDecorations, setPlacedDecorations] = useState<
    Array<{ id: string; emoji: string; x: number; y: number }>
  >([]);
  const [title] = useState(eventTitle);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleTabChange = (tab: 'style' | 'decorate' | 'templates') => {
    const toValue = tab === 'style' ? 0 : tab === 'decorate' ? -width : -width * 2;

    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();

    setActiveTab(tab);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setBackgroundImage(result.assets[0].uri);
    }
  };

  const handleAddDecoration = (decoration: { id: string; emoji: string }) => {
    const newDecoration = {
      ...decoration,
      x: Math.random() * (width - 100) + 50,
      y: Math.random() * 200 + 100,
    };
    setPlacedDecorations([...placedDecorations, newDecoration]);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleApplyTemplate = (template: any) => {
    setSelectedFont(template.font);
    setSelectedGradient(template.gradient);
    setPlacedDecorations(
      template.decorations.map((emoji: string, index: number) => ({
        id: `template_${index}`,
        emoji,
        x: (index + 1) * (width / (template.decorations.length + 1)),
        y: 150,
      }))
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    // For now, just go back

    void router.back();
  };

  const FontComponent = fontOptions.find((f) => f.id === selectedFont)?.component || AfterHoursText;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <CustomText size="lg">Cancel</CustomText>
        </TouchableOpacity>
        <AfterHoursText size="lg">Edit Cover</AfterHoursText>
        <TouchableOpacity onPress={handleSave}>
          <CustomText size="lg" color="#007AFF" weight="bold">
            Save
          </CustomText>
        </TouchableOpacity>
      </View>

      <View style={styles.preview}>
        <GradientBackground colors={selectedGradient} style={styles.previewCard}>
          {backgroundImage && (
            <Image source={{ uri: backgroundImage }} style={styles.backgroundImage} />
          )}

          {placedDecorations.map((dec, index) => (
            <View
              key={`${dec.id}_${index}`}
              style={[styles.decoration, { left: dec.x, top: dec.y }]}
            >
              <CustomText size="xxl">{dec.emoji}</CustomText>
            </View>
          ))}

          <View style={styles.titleContainer}>
            <FontComponent size="xl" color="#FFF" align="center" style={styles.previewTitle}>
              {title}
            </FontComponent>
          </View>
        </GradientBackground>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'style' && styles.activeTab]}
          onPress={() => handleTabChange('style')}
        >
          <CustomText
            size="md"
            color={activeTab === 'style' ? '#000' : '#666'}
            weight={activeTab === 'style' ? 'bold' : 'normal'}
          >
            Style
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'decorate' && styles.activeTab]}
          onPress={() => handleTabChange('decorate')}
        >
          <CustomText
            size="md"
            color={activeTab === 'decorate' ? '#000' : '#666'}
            weight={activeTab === 'decorate' ? 'bold' : 'normal'}
          >
            Decorate
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'templates' && styles.activeTab]}
          onPress={() => handleTabChange('templates')}
        >
          <CustomText
            size="md"
            color={activeTab === 'templates' ? '#000' : '#666'}
            weight={activeTab === 'templates' ? 'bold' : 'normal'}
          >
            Templates
          </CustomText>
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Style Tab */}
        <ScrollView style={[styles.tabPanel, { width }]}>
          <View style={styles.section}>
            <CustomText size="sm" color="#666" style={styles.sectionTitle}>
              FONT
            </CustomText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {fontOptions.map((font) => {
                const FontComp = font.component;
                return (
                  <TouchableOpacity
                    key={font.id}
                    style={[styles.fontOption, selectedFont === font.id && styles.selectedOption]}
                    onPress={() => setSelectedFont(font.id)}
                  >
                    <FontComp size="lg">{font.name}</FontComp>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <CustomText size="sm" color="#666" style={styles.sectionTitle}>
              BACKGROUND
            </CustomText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {colorOptions.map((colors, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.colorOption,
                    selectedGradient[0] === colors[0] && styles.selectedOption,
                  ]}
                  onPress={() => setSelectedGradient(colors as [string, string])}
                >
                  <GradientBackground
                    colors={colors as [string, string]}
                    style={styles.colorPreview}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <CustomText size="sm" color="#666" style={styles.sectionTitle}>
              MEDIA
            </CustomText>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
              <CustomText size="md" color="#007AFF">
                {backgroundImage ? 'Change Image' : 'Upload Image'}
              </CustomText>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Decorate Tab */}
        <View style={[styles.tabPanel, { width }]}>
          <FlatList
            data={decorations}
            numColumns={5}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.decorationOption}
                onPress={() => handleAddDecoration(item)}
              >
                <CustomText size="xxl">{item.emoji}</CustomText>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Templates Tab */}
        <ScrollView style={[styles.tabPanel, { width }]}>
          {templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateOption}
              onPress={() => handleApplyTemplate(template)}
            >
              <GradientBackground
                colors={template.gradient as [string, string]}
                style={styles.templatePreview}
              >
                <CustomText size="lg" color="#FFF" align="center">
                  {template.name}
                </CustomText>
              </GradientBackground>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  preview: {
    height: 200,
    margin: 16,
  },
  previewCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  previewTitle: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  decoration: {
    position: 'absolute',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabContent: {
    flex: 1,
    flexDirection: 'row',
  },
  tabPanel: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  fontOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  colorOption: {
    marginRight: 12,
  },
  colorPreview: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#000',
  },
  uploadButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  decorationOption: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  templateOption: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  templatePreview: {
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

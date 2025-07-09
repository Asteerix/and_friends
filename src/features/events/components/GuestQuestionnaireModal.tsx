import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BottomModal from './BottomModal';

interface Question {
  id: string;
  text: string;
  type: 'short' | 'multiple' | 'host-answer';
  options?: string[];
  hostAnswer?: string;
  required?: boolean;
}

interface GuestQuestionnaireModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (questions: Question[], settings: { allowSkipAll: boolean; showResponsesLive: boolean }) => void;
}

interface QuestionSuggestion {
  emoji: string;
  text: string;
  type: 'short' | 'multiple' | 'host-answer';
  options?: string[];
  hostAnswer?: string;
  popularity: number;
  category: string;
}

// Popular question templates with event-specific suggestions
const QUESTION_TEMPLATES: QuestionSuggestion[] = [
  // Most Used - Planning (90%+ usage)
  { 
    emoji: '✅', 
    text: "Are you coming?", 
    type: 'multiple',
    options: ['Yes! 🎉', 'Maybe', 'Can\'t make it 😢'],
    popularity: 98,
    category: 'essential'
  },
  { 
    emoji: '👥', 
    text: "How many people are you bringing?", 
    type: 'multiple',
    options: ['Just me', '+1', '+2', '+3 or more'],
    popularity: 95,
    category: 'essential'
  },
  { 
    emoji: '🕐', 
    text: "What time will you arrive?", 
    type: 'multiple',
    options: ['On time', '15-30 min late', '30-60 min late', 'Fashionably late'],
    popularity: 85,
    category: 'essential'
  },
  
  // Food & Drinks (70-90% usage)
  { 
    emoji: '🥗', 
    text: "Any dietary restrictions?", 
    type: 'multiple',
    options: ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Halal', 'Kosher', 'Other'],
    popularity: 88,
    category: 'food'
  },
  { 
    emoji: '🥜', 
    text: "Any allergies we should know about?", 
    type: 'short',
    popularity: 82,
    category: 'food'
  },
  { 
    emoji: '🍽️', 
    text: "Food preferences?", 
    type: 'multiple',
    options: ['I eat everything!', 'No meat', 'No dairy', 'No seafood', 'No spicy food'],
    popularity: 78,
    category: 'food'
  },
  { 
    emoji: '🥤', 
    text: "Drink preference?", 
    type: 'multiple',
    options: ['Beer 🍺', 'Wine 🍷', 'Cocktails 🍹', 'Non-alcoholic', 'Everything!'],
    popularity: 75,
    category: 'food'
  },
  
  // Logistics (50-70% usage)
  { 
    emoji: '🚗', 
    text: "Do you need parking?", 
    type: 'multiple',
    options: ['Yes', 'No', 'Maybe'],
    popularity: 68,
    category: 'logistics'
  },
  { 
    emoji: '🚕', 
    text: "How are you getting here?", 
    type: 'multiple',
    options: ['Driving 🚗', 'Uber/Taxi 🚕', 'Public transport 🚇', 'Walking 🚶', 'Need a ride! 🙏'],
    popularity: 65,
    category: 'logistics'
  },
  { 
    emoji: '🛏️', 
    text: "Staying overnight?", 
    type: 'multiple',
    options: ['Going home', 'Need a place to crash', 'Have accommodation', 'Let\'s see how it goes'],
    popularity: 58,
    category: 'logistics'
  },
  { 
    emoji: '👔', 
    text: "Dress code?", 
    type: 'host-answer',
    hostAnswer: 'Casual - come as you are!',
    popularity: 55,
    category: 'logistics'
  },
  
  // Activities & Help (40-50% usage)
  { 
    emoji: '🎵', 
    text: "Any song requests?", 
    type: 'short',
    popularity: 52,
    category: 'activities'
  },
  { 
    emoji: '🤝', 
    text: "Can you help out?", 
    type: 'multiple',
    options: ['Setup crew 💪', 'Cleanup squad 🧹', 'Both!', 'Just partying 🎉'],
    popularity: 48,
    category: 'activities'
  },
  { 
    emoji: '🎮', 
    text: "What are you excited for?", 
    type: 'multiple',
    options: ['Dancing 💃', 'Games 🎮', 'Food 🍕', 'Drinks 🍻', 'Everything!'],
    popularity: 45,
    category: 'activities'
  },
  { 
    emoji: '📸', 
    text: "Photo sharing?", 
    type: 'multiple',
    options: ['Love photos!', 'Prefer not', 'Ask me first', 'I\'m the photographer!'],
    popularity: 42,
    category: 'activities'
  },
  
  // Important Info (Host Answers) (30-40% usage)
  { 
    emoji: '📍', 
    text: "Special instructions?", 
    type: 'host-answer',
    hostAnswer: 'Ring the doorbell twice!',
    popularity: 38,
    category: 'info'
  },
  { 
    emoji: '👟', 
    text: "House rules?", 
    type: 'host-answer',
    hostAnswer: 'Shoes off at the door, make yourself at home!',
    popularity: 35,
    category: 'info'
  },
  { 
    emoji: '🅿️', 
    text: "Parking info?", 
    type: 'host-answer',
    hostAnswer: 'Street parking on Main St, driveway for 2 cars',
    popularity: 32,
    category: 'info'
  },
  { 
    emoji: '🔇', 
    text: "Quiet hours?", 
    type: 'host-answer',
    hostAnswer: 'Keep it down after 11 PM - neighbors!',
    popularity: 30,
    category: 'info'
  },
  
  // Special Occasions (20-30% usage)
  { 
    emoji: '🎁', 
    text: "Gift preferences?", 
    type: 'host-answer',
    hostAnswer: 'Your presence is the best gift!',
    popularity: 28,
    category: 'special'
  },
  { 
    emoji: '🎂', 
    text: "Birthday surprise ideas?", 
    type: 'short',
    popularity: 25,
    category: 'special'
  },
  { 
    emoji: '💝', 
    text: "Bringing anything special?", 
    type: 'short',
    popularity: 22,
    category: 'special'
  },
  
  // Additional Info (10-20% usage)
  { 
    emoji: '💭', 
    text: "Anything else we should know?", 
    type: 'short',
    popularity: 20,
    category: 'other'
  },
  { 
    emoji: '🌟', 
    text: "Special requirements?", 
    type: 'short',
    popularity: 18,
    category: 'other'
  },
  { 
    emoji: '📝', 
    text: "Comments or questions?", 
    type: 'short',
    popularity: 15,
    category: 'other'
  },
  { 
    emoji: '🎯', 
    text: "What would make this perfect for you?", 
    type: 'short',
    popularity: 12,
    category: 'other'
  },
  { 
    emoji: '🤔', 
    text: "Any concerns?", 
    type: 'short',
    popularity: 10,
    category: 'other'
  }
];

export default function GuestQuestionnaireModal({
  visible,
  onClose,
  onSave,
}: GuestQuestionnaireModalProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [customType, setCustomType] = useState<'short' | 'multiple' | 'host-answer'>('short');
  const [customOptions, setCustomOptions] = useState(['', '']);
  const [customHostAnswer, setCustomHostAnswer] = useState('');
  const [makeRequired, setMakeRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings
  const [allowSkipAll, setAllowSkipAll] = useState(true);
  const [showResponsesLive, setShowResponsesLive] = useState(true);

  const handleAddQuestion = (template: QuestionSuggestion) => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      text: template.text,
      type: template.type,
      options: template.options,
      hostAnswer: template.hostAnswer,
      required: false,
    };
    setQuestions([...questions, newQuestion]);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddCustomQuestion = () => {
    if (!customQuestionText.trim()) return;

    const newQuestion: Question = {
      id: Date.now().toString(),
      text: customQuestionText.trim(),
      type: customType,
      options: customType === 'multiple' ? customOptions.filter(opt => opt.trim()) : undefined,
      hostAnswer: customType === 'host-answer' ? customHostAnswer : undefined,
      required: makeRequired,
    };

    setQuestions([...questions, newQuestion]);
    resetCustomForm();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const resetCustomForm = () => {
    setIsAddingCustom(false);
    setCustomQuestionText('');
    setCustomType('short');
    setCustomOptions(['', '']);
    setCustomHostAnswer('');
    setMakeRequired(false);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleRequired = (id: string) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, required: !q.required } : q
    ));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...customOptions];
    newOptions[index] = value;
    setCustomOptions(newOptions);
  };

  const addOption = () => {
    if (customOptions.length < 6) {
      setCustomOptions([...customOptions, '']);
    }
  };

  const removeOption = (index: number) => {
    if (customOptions.length > 2) {
      setCustomOptions(customOptions.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    onSave(questions, { allowSkipAll, showResponsesLive });
    onClose();
  };

  const getQuestionIcon = (type: Question['type']) => {
    switch (type) {
      case 'short': return 'text-outline';
      case 'multiple': return 'list-outline';
      case 'host-answer': return 'information-circle-outline';
      default: return 'help-outline';
    }
  };

  // Filter templates based on search and category
  const filteredTemplates = QUESTION_TEMPLATES
    .filter(template => {
      const matchesSearch = searchQuery === '' || 
        template.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.emoji.includes(searchQuery) ||
        template.category.toLowerCase().includes(searchQuery.toLowerCase());
      const notAlreadyAdded = !questions.some(q => q.text === template.text);
      return matchesSearch && notAlreadyAdded;
    })
    .sort((a, b) => b.popularity - a.popularity);
  
  // Group templates by category for better organization
  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category]!.push(template);
    return acc;
  }, {} as Record<string, QuestionSuggestion[]>);
  
  const categoryOrder = ['essential', 'food', 'logistics', 'activities', 'info', 'special', 'other'];
  const categoryLabels: Record<string, string> = {
    essential: '🔥 Most Popular',
    food: '🍽️ Food & Drinks',
    logistics: '🚗 Logistics',
    activities: '🎮 Activities',
    info: '📍 Event Info',
    special: '🎁 Special',
    other: '💭 Other'
  };

  const requiredCount = questions.filter(q => q.required).length;

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="Guest Questions"
      height={Platform.OS === 'ios' ? 700 : 750}
      onSave={handleSave}
      saveButtonText={questions.length > 0 ? `Save ${questions.length} Question${questions.length > 1 ? 's' : ''}` : 'Skip Questions'}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Current Questions */}
        {questions.length > 0 && (
          <View style={styles.currentQuestionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Questions</Text>
              {requiredCount > 0 && (
                <Text style={styles.requiredCount}>
                  {requiredCount} required
                </Text>
              )}
            </View>
            
            {questions.map((question) => (
              <View key={question.id} style={styles.questionCard}>
                <View style={styles.questionContent}>
                  <View style={styles.questionHeader}>
                    <Ionicons 
                      name={getQuestionIcon(question.type)} 
                      size={20} 
                      color="#007AFF" 
                    />
                    <Text style={styles.questionText}>{question.text}</Text>
                  </View>
                  
                  {question.type === 'multiple' && question.options && (
                    <View style={styles.optionsPreview}>
                      {question.options.slice(0, 3).map((opt, idx) => (
                        <Text key={idx} style={styles.optionPreviewText}>
                          • {opt}
                        </Text>
                      ))}
                      {question.options.length > 3 && (
                        <Text style={styles.moreOptions}>
                          +{question.options.length - 3} more
                        </Text>
                      )}
                    </View>
                  )}
                  
                  {question.type === 'host-answer' && question.hostAnswer && (
                    <View style={styles.hostAnswerPreview}>
                      <Text style={styles.hostAnswerText}>→ {question.hostAnswer}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.questionActions}>
                  <TouchableOpacity
                    style={[styles.requiredToggle, question.required && styles.requiredToggleActive]}
                    onPress={() => toggleRequired(question.id)}
                  >
                    <Text style={[styles.requiredToggleText, question.required && styles.requiredToggleTextActive]}>
                      {question.required ? 'Required' : 'Optional'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => removeQuestion(question.id)}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Search Bar */}
        {!isAddingCustom && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search questions..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        {/* Quick Add Templates */}
        {!isAddingCustom && (
          <View style={styles.templatesSection}>
            <View style={styles.templatesSectionHeader}>
              <Text style={styles.sectionTitle}>Popular Questions</Text>
              <Text style={styles.sectionSubtitle}>Tap to add</Text>
            </View>
            
            {categoryOrder.map(category => {
              const templates = templatesByCategory[category];
              if (!templates || templates.length === 0) return null;
              
              return (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{categoryLabels[category]}</Text>
                  <View style={styles.templatesList}>
                    {templates.slice(0, searchQuery ? undefined : 5).map((template, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.templateItem}
                        onPress={() => handleAddQuestion(template)}
                      >
                        <View style={styles.templateContent}>
                          <Text style={styles.templateEmoji}>{template.emoji}</Text>
                          <View style={styles.templateTextContent}>
                            <Text style={styles.templateText}>{template.text}</Text>
                            <View style={styles.templateMeta}>
                              <Ionicons 
                                name={getQuestionIcon(template.type)} 
                                size={14} 
                                color="#999" 
                              />
                              <Text style={styles.templateType}>
                                {template.type === 'short' ? 'Text' : 
                                 template.type === 'multiple' ? 'Multiple choice' : 
                                 'You answer'}
                              </Text>
                              <Text style={styles.popularityBadge}>
                                {template.popularity}% use this
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Ionicons name="add-circle" size={24} color="#007AFF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Custom Question Button */}
        {!isAddingCustom && (
          <TouchableOpacity
            style={styles.customQuestionButton}
            onPress={() => setIsAddingCustom(true)}
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
            <Text style={styles.customQuestionButtonText}>Create Custom Question</Text>
          </TouchableOpacity>
        )}

        {/* Custom Question Form */}
        {isAddingCustom && (
          <View style={styles.customForm}>
            <View style={styles.customFormHeader}>
              <Text style={styles.customFormTitle}>Create Custom Question</Text>
              <TouchableOpacity onPress={resetCustomForm}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.customQuestionInput}
              placeholder="Type your question..."
              placeholderTextColor="#999"
              value={customQuestionText}
              onChangeText={setCustomQuestionText}
              multiline
              numberOfLines={2}
            />

            {/* Answer Type Selection */}
            <View style={styles.answerTypeSection}>
              <Text style={styles.answerTypeTitle}>Answer Type</Text>
              <View style={styles.answerTypes}>
                <TouchableOpacity
                  style={[styles.answerTypeButton, customType === 'short' && styles.answerTypeActive]}
                  onPress={() => setCustomType('short')}
                >
                  <Ionicons name="text-outline" size={20} color={customType === 'short' ? '#007AFF' : '#666'} />
                  <Text style={[styles.answerTypeLabel, customType === 'short' && styles.answerTypeLabelActive]}>
                    Text
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.answerTypeButton, customType === 'multiple' && styles.answerTypeActive]}
                  onPress={() => setCustomType('multiple')}
                >
                  <Ionicons name="list-outline" size={20} color={customType === 'multiple' ? '#007AFF' : '#666'} />
                  <Text style={[styles.answerTypeLabel, customType === 'multiple' && styles.answerTypeLabelActive]}>
                    Multiple
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.answerTypeButton, customType === 'host-answer' && styles.answerTypeActive]}
                  onPress={() => setCustomType('host-answer')}
                >
                  <Ionicons name="information-circle-outline" size={20} color={customType === 'host-answer' ? '#007AFF' : '#666'} />
                  <Text style={[styles.answerTypeLabel, customType === 'host-answer' && styles.answerTypeLabelActive]}>
                    You Answer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Multiple Choice Options */}
            {customType === 'multiple' && (
              <View style={styles.optionsSection}>
                <Text style={styles.optionsSectionTitle}>Options</Text>
                {customOptions.map((option, index) => (
                  <View key={index} style={styles.optionRow}>
                    <TextInput
                      style={styles.optionInput}
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor="#999"
                      value={option}
                      onChangeText={(text) => updateOption(index, text)}
                    />
                    {customOptions.length > 2 && (
                      <TouchableOpacity onPress={() => removeOption(index)}>
                        <Ionicons name="close-circle" size={22} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {customOptions.length < 6 && (
                  <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
                    <Ionicons name="add" size={20} color="#007AFF" />
                    <Text style={styles.addOptionText}>Add Option</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Host Answer Input */}
            {customType === 'host-answer' && (
              <View style={styles.hostAnswerSection}>
                <Text style={styles.hostAnswerTitle}>Your Answer</Text>
                <TextInput
                  style={styles.hostAnswerInput}
                  placeholder="Type your answer..."
                  placeholderTextColor="#999"
                  value={customHostAnswer}
                  onChangeText={setCustomHostAnswer}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}

            {/* Required Toggle */}
            <View style={styles.requiredSection}>
              <View style={styles.requiredContent}>
                <Text style={styles.requiredLabel}>Make this question required</Text>
                <Text style={styles.requiredDescription}>Guests must answer to RSVP</Text>
              </View>
              <Switch
                value={makeRequired}
                onValueChange={setMakeRequired}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor="#FFF"
                ios_backgroundColor="#E5E5EA"
              />
            </View>

            {/* Add Button */}
            <TouchableOpacity
              style={[styles.addCustomButton, !customQuestionText.trim() && styles.addCustomButtonDisabled]}
              onPress={handleAddCustomQuestion}
              disabled={!customQuestionText.trim()}
            >
              <Text style={[styles.addCustomButtonText, !customQuestionText.trim() && styles.addCustomButtonTextDisabled]}>
                Add Question
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Allow "Skip All"</Text>
              <Text style={styles.settingDescription}>Guests can RSVP without answering</Text>
            </View>
            <Switch
              value={allowSkipAll}
              onValueChange={setAllowSkipAll}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFF"
              ios_backgroundColor="#E5E5EA"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Show Responses Live</Text>
              <Text style={styles.settingDescription}>Guests can see others' answers</Text>
            </View>
            <Switch
              value={showResponsesLive}
              onValueChange={setShowResponsesLive}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFF"
              ios_backgroundColor="#E5E5EA"
            />
          </View>
        </View>
      </ScrollView>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  helperSection: {
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  helperText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
    textAlign: 'center',
  },
  currentQuestionsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  requiredCount: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '500',
  },
  questionCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questionContent: {
    flex: 1,
    marginRight: 10,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  optionsPreview: {
    marginLeft: 28,
  },
  optionPreviewText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  moreOptions: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  hostAnswerPreview: {
    marginLeft: 28,
    marginTop: 4,
  },
  hostAnswerText: {
    fontSize: 13,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  questionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requiredToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
  },
  requiredToggleActive: {
    backgroundColor: '#FF3B30',
  },
  requiredToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  requiredToggleTextActive: {
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  templatesSection: {
    marginBottom: 20,
  },
  templatesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  templatesList: {
    gap: 8,
  },
  templateItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 8,
  },
  templateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  templateEmoji: {
    fontSize: 24,
  },
  templateTextContent: {
    flex: 1,
  },
  templateText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  templateType: {
    fontSize: 12,
    color: '#999',
  },
  popularityBadge: {
    fontSize: 11,
    color: '#007AFF',
    marginLeft: 8,
  },
  customQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  customQuestionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  customForm: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  customFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customFormTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  customQuestionInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 20,
  },
  answerTypeSection: {
    marginBottom: 20,
  },
  answerTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  answerTypes: {
    flexDirection: 'row',
    gap: 8,
  },
  answerTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 4,
  },
  answerTypeActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  answerTypeLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  answerTypeLabelActive: {
    color: '#007AFF',
  },
  optionsSection: {
    marginBottom: 20,
  },
  optionsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addOptionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  hostAnswerSection: {
    marginBottom: 20,
  },
  hostAnswerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  hostAnswerInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    minHeight: 50,
  },
  requiredSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginBottom: 16,
  },
  requiredContent: {
    flex: 1,
  },
  requiredLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  requiredDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  addCustomButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addCustomButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  addCustomButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  addCustomButtonTextDisabled: {
    color: '#999',
  },
  settingsSection: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingContent: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});
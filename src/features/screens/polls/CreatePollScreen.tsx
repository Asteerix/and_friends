import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addDays } from 'date-fns';
import { usePollStore } from "@/hooks/usePollStore";
import * as Haptics from 'expo-haptics';

const pollTypes = [
  { id: 'single', label: 'Single Choice', icon: 'radio-button-on' },
  { id: 'multiple', label: 'Multiple Choice', icon: 'checkbox' },
];

export default function CreatePollScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { chatId, eventId } = route.params as any;
  const { createPoll } = usePollStore();
  
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [pollType, setPollType] = useState<'single' | 'multiple'>('single');
  const [expiresAt, setExpiresAt] = useState(addDays(new Date(), 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    } else {
      Alert.alert('Limit Reached', 'You can add up to 10 options');
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    // Validate inputs
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      Alert.alert('Error', 'Please add at least 2 options');
      return;
    }

    try {
      await createPoll({
        question: question.trim(),
        options: validOptions,
        type: pollType,
        expires_at: expiresAt.toISOString(),
        anonymous,
        chat_id: chatId,
        event_id: eventId,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create poll');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#45B7D1', '#3498DB']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Poll</Text>
          <TouchableOpacity onPress={handleCreate}>
            <Text style={styles.createButton}>Create</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Question Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Question</Text>
          <TextInput
            style={styles.questionInput}
            value={question}
            onChangeText={setQuestion}
            placeholder="What would you like to ask?"
            placeholderTextColor="#999"
            multiline
            maxLength={200}
          />
          <Text style={styles.charCount}>{question.length}/200</Text>
        </View>

        {/* Poll Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Poll Type</Text>
          <View style={styles.pollTypeContainer}>
            {pollTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.pollTypeOption,
                  pollType === type.id && styles.pollTypeOptionActive,
                ]}
                onPress={() => setPollType(type.id as 'single' | 'multiple')}
              >
                <Ionicons
                  name={type.icon as any}
                  size={24}
                  color={pollType === type.id ? '#45B7D1' : '#666'}
                />
                <Text
                  style={[
                    styles.pollTypeText,
                    pollType === type.id && styles.pollTypeTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Options</Text>
          {options.map((option, index) => (
            <View key={index} style={styles.optionContainer}>
              <TextInput
                style={styles.optionInput}
                value={option}
                onChangeText={(text) => handleOptionChange(index, text)}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor="#999"
              />
              {options.length > 2 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveOption(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          {options.length < 10 && (
            <TouchableOpacity style={styles.addOptionButton} onPress={handleAddOption}>
              <Ionicons name="add-circle-outline" size={24} color="#45B7D1" />
              <Text style={styles.addOptionText}>Add Option</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          {/* Expiry Date */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowDatePicker(true)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="time-outline" size={24} color="#666" />
              <Text style={styles.settingLabel}>Expires</Text>
            </View>
            <Text style={styles.settingValue}>
              {format(expiresAt, 'MMM d, h:mm a')}
            </Text>
          </TouchableOpacity>

          {/* Anonymous Voting */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setAnonymous(!anonymous)}
          >
            <View style={styles.settingLeft}>
              <Ionicons
                name={anonymous ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#666"
              />
              <Text style={styles.settingLabel}>Anonymous Voting</Text>
            </View>
            <Ionicons
              name={anonymous ? 'checkbox' : 'square-outline'}
              size={24}
              color={anonymous ? '#45B7D1' : '#999'}
            />
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewQuestion}>
              {question || 'Your question will appear here'}
            </Text>
            <View style={styles.previewOptions}>
              {options
                .filter(opt => opt.trim())
                .map((option, index) => (
                  <View key={index} style={styles.previewOption}>
                    <Ionicons
                      name={pollType === 'single' ? 'radio-button-off' : 'square-outline'}
                      size={20}
                      color="#999"
                    />
                    <Text style={styles.previewOptionText}>{option}</Text>
                  </View>
                ))}
            </View>
            {anonymous && (
              <Text style={styles.anonymousText}>
                <Ionicons name="eye-off" size={14} color="#999" /> Anonymous poll
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={expiresAt}
          mode="datetime"
          minimumDate={new Date()}
          maximumDate={addDays(new Date(), 30)}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setExpiresAt(date);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  createButton: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  questionInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },
  pollTypeContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  pollTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pollTypeOptionActive: {
    borderColor: '#45B7D1',
  },
  pollTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  pollTypeTextActive: {
    color: '#45B7D1',
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  removeButton: {
    marginLeft: 10,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginTop: 10,
  },
  addOptionText: {
    fontSize: 16,
    color: '#45B7D1',
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  settingValue: {
    fontSize: 16,
    color: '#45B7D1',
    fontWeight: '500',
  },
  previewSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  previewQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  previewOptions: {
    gap: 10,
  },
  previewOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewOptionText: {
    fontSize: 16,
    color: '#666',
  },
  anonymousText: {
    fontSize: 14,
    color: '#999',
    marginTop: 15,
    alignItems: 'center',
  },
});
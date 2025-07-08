import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from './BottomModal';

interface Question {
  id: string;
  text: string;
  type: 'short' | 'multiple';
  options?: string[];
}

interface GuestQuestionnaireModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (questions: Question[]) => void;
}

export default function GuestQuestionnaireModal({
  visible,
  onClose,
  onSave,
}: GuestQuestionnaireModalProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [answerType, setAnswerType] = useState<'short' | 'multiple'>('short');
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState(['', '']);

  const addQuestion = () => {
    if (newQuestionText.trim()) {
      const newQuestion: Question = {
        id: Date.now().toString(),
        text: newQuestionText.trim(),
        type: answerType,
        options: answerType === 'multiple' ? multipleChoiceOptions.filter(opt => opt.trim()) : undefined,
      };
      setQuestions([...questions, newQuestion]);
      resetQuestionForm();
    }
  };

  const resetQuestionForm = () => {
    setIsAddingQuestion(false);
    setNewQuestionText('');
    setAnswerType('short');
    setMultipleChoiceOptions(['', '']);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...multipleChoiceOptions];
    newOptions[index] = value;
    setMultipleChoiceOptions(newOptions);
  };

  const addOption = () => {
    setMultipleChoiceOptions([...multipleChoiceOptions, '']);
  };

  const removeOption = (index: number) => {
    if (multipleChoiceOptions.length > 2) {
      setMultipleChoiceOptions(multipleChoiceOptions.filter((_, i) => i !== index));
    }
  };

  const handleSave = () => {
    onSave(questions);
    onClose();
  };

  return (
    <BottomModal
      visible={visible}
      onClose={onClose}
      title="Question"
      height={550}
      onSave={handleSave}
      saveButtonText="Save Questions"
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {questions.map((question) => (
          <View key={question.id} style={styles.questionCard}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionText}>{question.text}</Text>
              <TouchableOpacity onPress={() => removeQuestion(question.id)}>
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
            <Text style={styles.answerTypeText}>
              {question.type === 'short' ? 'Short Answer' : 'Multiple Choice'}
            </Text>
            {question.options && (
              <View style={styles.optionsList}>
                {question.options.map((option, index) => (
                  <View key={index} style={styles.optionItem}>
                    <Ionicons name="radio-button-off" size={20} color="#C7C7CC" />
                    <Text style={styles.optionText}>{option}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {!isAddingQuestion ? (
          <TouchableOpacity
            style={styles.addQuestionButton}
            onPress={() => setIsAddingQuestion(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.addQuestionButtonText}>Add Question</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.newQuestionCard}>
            <TextInput
              style={styles.questionInput}
              value={newQuestionText}
              onChangeText={setNewQuestionText}
              placeholder="Enter your question here..."
              placeholderTextColor="#C7C7CC"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.sectionTitle}>Answer Type</Text>
            <TouchableOpacity
              style={[styles.answerTypeOption, answerType === 'short' && styles.answerTypeSelected]}
              onPress={() => setAnswerType('short')}
            >
              <View style={styles.radioButton}>
                {answerType === 'short' && <View style={styles.radioButtonSelected} />}
              </View>
              <Text style={styles.answerTypeLabel}>Short Answer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.answerTypeOption, answerType === 'multiple' && styles.answerTypeSelected]}
              onPress={() => setAnswerType('multiple')}
            >
              <View style={styles.radioButton}>
                {answerType === 'multiple' && <View style={styles.radioButtonSelected} />}
              </View>
              <Text style={styles.answerTypeLabel}>Multiple Choice</Text>
            </TouchableOpacity>

            {answerType === 'multiple' && (
              <View style={styles.optionsSection}>
                {multipleChoiceOptions.map((option, index) => (
                  <View key={index} style={styles.optionInputRow}>
                    <TextInput
                      style={styles.optionInput}
                      value={option}
                      onChangeText={(text) => updateOption(index, text)}
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor="#999"
                    />
                    {multipleChoiceOptions.length > 2 && (
                      <TouchableOpacity onPress={() => removeOption(index)}>
                        <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
                  <Ionicons name="add" size={20} color="#007AFF" />
                  <Text style={styles.addOptionText}>Add Option</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.addQuestionBtn, !newQuestionText.trim() && styles.addQuestionBtnDisabled]} 
              onPress={addQuestion}
              disabled={!newQuestionText.trim()}
            >
              <Ionicons name="add" size={20} color={!newQuestionText.trim() ? '#999' : '#FFF'} />
              <Text style={[styles.addQuestionBtnText, !newQuestionText.trim() && styles.addQuestionBtnTextDisabled]}>Add Question</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </BottomModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  questionCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  answerTypeText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  optionsList: {
    marginTop: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    marginTop: 12,
  },
  addQuestionButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  newQuestionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    marginTop: 8,
  },
  questionInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 24,
    textAlignVertical: 'top',
  },
  answerTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 12,
  },
  answerTypeSelected: {
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  answerTypeLabel: {
    fontSize: 16,
    color: '#000',
  },
  optionsSection: {
    marginTop: 16,
  },
  optionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 14,
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
    marginTop: 8,
  },
  addOptionText: {
    fontSize: 14,
    color: '#007AFF',
  },
  addQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  addQuestionBtnDisabled: {
    backgroundColor: '#E5E5E5',
  },
  addQuestionBtnText: {
    fontSize: 17,
    color: '#FFF',
    fontWeight: '600',
  },
  addQuestionBtnTextDisabled: {
    color: '#999',
  },
});
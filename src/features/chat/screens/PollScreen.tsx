import * as Haptics from 'expo-haptics';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import { usePollStore, PollOption } from '@/hooks/usePollStore';
import CustomText, { AfterHoursText } from '@/shared/ui/CustomText';

export default function PollScreen() {
  const router = useRouter();
  
  const params = useLocalSearchParams<{ chatId?: string; mode?: string; pollId?: string }>();
  const { chatId = '', mode = 'create', pollId } = params;
  
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [animatedValues] = useState(() => 
    Array(10).fill(0).map(() => new Animated.Value(0))
  );
  
  const { createPoll, vote, getPoll } = usePollStore();
  const existingPoll = mode === 'vote' && pollId ? getPoll(pollId) : null;

  useEffect(() => {
    if (existingPoll) {
      animateVoteBars();
    }
  }, [existingPoll]);

  const animateVoteBars = () => {
    existingPoll?.options.forEach((option, index) => {
      if (animatedValues[index]) {
        Animated.timing(animatedValues[index], {
          toValue: getVotePercentage(option),
          duration: 500,
          delay: index * 100,
          useNativeDriver: false,
        }).start();
      }
    });
  };

  const getVotePercentage = (option: PollOption) => {
    const totalVotes = existingPoll?.options.reduce((sum, opt) => sum + opt.votes, 0) || 0;
    return totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
  };

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleUpdateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) {
      return;
    }

    const filteredOptions = options.filter(o => o.trim());

    await createPoll({
      question,
      options: filteredOptions,
      type: 'single',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      anonymous: false,
      chat_id: chatId || '',
    });

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void router.back();
  };

  const handleVote = async (optionId: string) => {
    if (!existingPoll) return;

    const newSelection = new Set(selectedOptions);
    if (newSelection.has(optionId)) {
      void newSelection.delete(optionId);
    } else {
      newSelection.clear(); // Always clear for single choice polls
      newSelection.add(optionId);
    }
    
    setSelectedOptions(newSelection);
    vote(existingPoll.id, optionId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (mode === 'vote' && existingPoll) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <CustomText size="lg">✕</CustomText>
          </TouchableOpacity>
          <AfterHoursText size="lg">Poll</AfterHoursText>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView style={styles.content}>
          <AfterHoursText size="xl" style={styles.question}>
            {existingPoll.question}
          </AfterHoursText>

          <View style={styles.optionsContainer}>
            {existingPoll.options.map((option, index) => {
              // const percentage = getVotePercentage(option);
              const isSelected = selectedOptions.has(option.id);
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.voteOption, isSelected && styles.selectedOption]}
                  onPress={() => handleVote(option.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.voteContent}>
                    <CustomText size="md" style={styles.optionText}>
                      {option.label}
                    </CustomText>
                    <CustomText size="sm" style={styles.voteCount}>
                      {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                    </CustomText>
                  </View>
                  
                  <Animated.View
                    style={[
                      styles.voteBar,
                      {
                        width: animatedValues[index]?.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.voters}>
            <CustomText size="sm" color="#666">
              {existingPoll.options.reduce((sum, opt) => sum + opt.votes, 0)} people voted
            </CustomText>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <CustomText size="lg">Cancel</CustomText>
          </TouchableOpacity>
          <AfterHoursText size="lg">Create Poll</AfterHoursText>
          <TouchableOpacity onPress={handleCreatePoll}>
            <CustomText size="lg" color="#007AFF" weight="bold">
              Create
            </CustomText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.questionInput}
            placeholder="Ask a question..."
            placeholderTextColor="#999"
            value={question}
            onChangeText={setQuestion}
            multiline
            maxLength={200}
          />

          <View style={styles.optionsContainer}>
            <CustomText size="sm" color="#666" style={styles.sectionLabel}>
              OPTIONS
            </CustomText>
            
            {options.map((option, index) => (
              <View key={index} style={styles.optionInputContainer}>
                <TextInput
                  style={styles.optionInput}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor="#999"
                  value={option}
                  onChangeText={(text) => handleUpdateOption(index, text)}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveOption(index)}
                    style={styles.removeButton}
                  >
                    <CustomText size="lg" color="#FF3B30">−</CustomText>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {options.length < 5 && (
              <TouchableOpacity
                style={styles.addOptionButton}
                onPress={handleAddOption}
              >
                <CustomText size="md" color="#007AFF">+ Add option</CustomText>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  questionInput: {
    fontSize: 24,
    fontFamily: 'AfterHours',
    marginBottom: 32,
    minHeight: 80,
  },
  question: {
    marginBottom: 24,
  },
  sectionLabel: {
    marginBottom: 12,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  removeButton: {
    marginLeft: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOptionButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  voteOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  voteContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    zIndex: 1,
  },
  optionText: {
    flex: 1,
  },
  voteCount: {
    color: '#666',
  },
  voteBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  voters: {
    alignItems: 'center',
    marginTop: 16,
  },
});
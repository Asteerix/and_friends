import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import React, { useState } from 'react';
import { Animated, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { Poll } from '@/hooks/usePollsSupabase';

interface PollMessageProps {
  poll: Poll;
  onVote: (pollId: string, optionIds: string[]) => void;
  isOwnMessage?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const MAX_WIDTH = screenWidth * 0.85;

export default function PollMessage({ poll, onVote, isOwnMessage = false }: PollMessageProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(poll.user_votes || []);
  const [animatedValues] = useState(() => poll.options.map(() => new Animated.Value(0)));

  const hasVoted = poll.user_votes && poll.user_votes.length > 0;
  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();
  const canVote = !hasVoted && !isExpired;

  React.useEffect(() => {
    // Animate progress bars
    poll.options.forEach((option, index) => {
      const percentage = poll.total_votes > 0 ? (option.votes / poll.total_votes) * 100 : 0;
      if (animatedValues[index]) {
        Animated.timing(animatedValues[index], {
          toValue: percentage,
          duration: 500,
          useNativeDriver: false,
        }).start();
      }
    });
  }, [poll.options, poll.total_votes]);

  const handleOptionPress = (optionId: string) => {
    if (!canVote) return;

    if (poll.multiple_choice) {
      setSelectedOptions((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleSubmitVote = () => {
    if (selectedOptions.length === 0) return;
    onVote(poll.id, selectedOptions);
  };

  const getOptionPercentage = (option: Poll['options'][0]) => {
    return poll.total_votes > 0 ? Math.round((option.votes / poll.total_votes) * 100) : 0;
  };

  return (
    <View
      style={{
        backgroundColor: isOwnMessage ? '#007AFF' : '#1C1C1E',
        borderRadius: 16,
        padding: 16,
        maxWidth: MAX_WIDTH,
        width: '100%',
      }}
    >
      {/* Question */}
      <Text
        style={{
          color: '#fff',
          fontSize: 16,
          fontWeight: '600',
          marginBottom: 12,
        }}
      >
        {poll.question}
      </Text>

      {/* Poll Type Indicator */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Ionicons
          name={poll.multiple_choice ? 'checkbox-outline' : 'radio-button-on-outline'}
          size={16}
          color="rgba(255,255,255,0.6)"
        />
        <Text
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 12,
            marginLeft: 4,
          }}
        >
          {poll.multiple_choice ? 'Choix multiples' : 'Choix unique'}
        </Text>
        {poll.anonymous && (
          <>
            <Text style={{ color: 'rgba(255,255,255,0.6)', marginHorizontal: 8 }}>•</Text>
            <Ionicons name="eye-off-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 12,
                marginLeft: 4,
              }}
            >
              Anonyme
            </Text>
          </>
        )}
      </View>

      {/* Options */}
      {poll.options.map((option, index) => {
        const isSelected = selectedOptions.includes(option.id);
        const percentage = getOptionPercentage(option);
        const hasVotes = option.votes > 0;

        return (
          <TouchableOpacity
            key={option.id}
            onPress={() => handleOptionPress(option.id)}
            disabled={!canVote}
            style={{
              marginBottom: 8,
              borderRadius: 8,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isSelected && canVote ? '#fff' : 'rgba(255,255,255,0.2)',
            }}
          >
            <View
              style={{
                padding: 12,
                position: 'relative',
              }}
            >
              {/* Progress bar background */}
              {(hasVoted || isExpired) && hasVotes && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    backgroundColor: isOwnMessage
                      ? 'rgba(255,255,255,0.2)'
                      : 'rgba(255,255,255,0.1)',
                    width: animatedValues[index]?.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  }}
                />
              )}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  {canVote && (
                    <Ionicons
                      name={
                        poll.multiple_choice
                          ? isSelected
                            ? 'checkbox'
                            : 'square-outline'
                          : isSelected
                            ? 'radio-button-on'
                            : 'radio-button-off'
                      }
                      size={20}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 14,
                      flex: 1,
                    }}
                  >
                    {option.text}
                  </Text>
                </View>

                {(hasVoted || isExpired) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      {percentage}%
                    </Text>
                    {!poll.anonymous && (
                      <Text
                        style={{
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: 12,
                          marginLeft: 4,
                        }}
                      >
                        ({option.votes})
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* User voted indicator */}
              {hasVoted && poll.user_votes?.includes(option.id) && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#4CD964" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Submit button */}
      {canVote && selectedOptions.length > 0 && (
        <TouchableOpacity
          onPress={handleSubmitVote}
          style={{
            backgroundColor: '#fff',
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text
            style={{
              color: isOwnMessage ? '#007AFF' : '#1C1C1E',
              fontWeight: '600',
            }}
          >
            Voter
          </Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
        }}
      >
        <Text
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 12,
          }}
        >
          {poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}
        </Text>

        {poll.expires_at && (
          <Text
            style={{
              color: isExpired ? '#FF3B30' : 'rgba(255,255,255,0.6)',
              fontSize: 12,
            }}
          >
            {isExpired
              ? 'Expiré'
              : `Expire ${formatDistanceToNow(new Date(poll.expires_at), {
                  addSuffix: true,
                  locale: fr,
                })}`}
          </Text>
        )}
      </View>
    </View>
  );
}

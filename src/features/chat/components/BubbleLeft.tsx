import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface BubbleLeftProps {
  text: string;
  avatarUrl: string;
  time: string;
  messageId?: string;
  senderName?: string;
  onReport?: (messageId: string, senderName: string) => void;
}

export default function BubbleLeft({
  text,
  avatarUrl,
  time,
  messageId,
  senderName = 'Utilisateur',
  onReport,
}: BubbleLeftProps) {
  const handleLongPress = () => {
    if (!messageId || !onReport) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Copier', 'Signaler'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Copier le message
            Alert.alert('Copié', 'Message copié dans le presse-papiers');
          } else if (buttonIndex === 2) {
            // Signaler le message
            onReport(messageId, senderName);
          }
        }
      );
    } else {
      Alert.alert(
        'Options',
        undefined,
        [
          {
            text: 'Copier',
            onPress: () => Alert.alert('Copié', 'Message copié dans le presse-papiers'),
          },
          {
            text: 'Signaler',
            onPress: () => onReport(messageId, senderName),
            style: 'destructive',
          },
          { text: 'Annuler', style: 'cancel' },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <View style={styles.row}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      <TouchableOpacity style={styles.bubble} onLongPress={handleLongPress} activeOpacity={0.8}>
        <Text style={styles.text}>{text}</Text>
        <Text style={styles.time}>{time}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    maxWidth: '70%',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#EEE',
  },
  bubble: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    flex: 1,
  },
  text: {
    fontFamily: Platform.select({
      ios: 'SFProText-Regular',
      android: 'Roboto',
    }),
    fontSize: 15,
    color: '#000',
  },
  time: {
    fontSize: 11,
    color: '#B0B0B0',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});

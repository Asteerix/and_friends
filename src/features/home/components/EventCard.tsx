import React from 'react';
import {

  TouchableOpacity,
  Image,
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';

type Props = {
  thumbnail: string;
  title: string;
  date: string;
  location: string;
  participants: string[];
  goingText: string;
  onPress?: () => void;
};

export default function EventCard({
  thumbnail,
  title,
  date,
  location,
  participants,
  goingText,
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.container}
    >
      <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.location} numberOfLines={1}>{location}</Text>
        <View style={styles.participantsRow}>
          <View style={styles.avatarsStack}>
            {participants.slice(0, 3).map((uri, idx) => (
              <Image
                key={uri + idx}
                source={{ uri }}
                style={[styles.avatar, { marginLeft: idx === 0 ? 0 : -8 }]}
              />
            ))}
          </View>
          <Text style={styles.goingText}>{goingText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  thumbnail: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: '#EEE',
  },
  body: {
    flex: 1,
    marginLeft: 16,
    paddingVertical: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
      default: 'System',
    }),
    marginBottom: 8,
    lineHeight: 24,
  },
  date: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
  location: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  avatarsStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFF',
    backgroundColor: '#EEE',
  },
  goingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    fontWeight: '500',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System',
    }),
  },
});
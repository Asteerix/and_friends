import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

interface Participant {
  id: string;
  avatar_url?: string;
}

interface EventCellProps {
  title: string;
  date: string;
  time: string;
  location: string;
  participants: Participant[];
  goingCount: number;
  coverImage?: string;
  onPress: () => void;
}

export default function EventCell({
  title,
  date,
  time,
  location,
  participants = [],
  goingCount,
  coverImage,
  onPress,
}: EventCellProps) {
  const displayParticipants = participants.slice(0, 4);
  const remainingCount = goingCount - displayParticipants.length;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Cover Image */}
      <View style={styles.imageContainer}>
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={styles.coverImage} />
        ) : (
          <View style={styles.placeholderImage}>
            {/* Damier pattern */}
            <View style={styles.checkerboard}>
              {[...Array(16)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.checkerSquare,
                    i % 2 === Math.floor(i / 4) % 2 ? styles.lightSquare : styles.darkSquare,
                  ]}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Event Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.datetime}>
          {date}, {time}
        </Text>
        <Text style={styles.location}>{location}</Text>

        {/* Participants */}
        <View style={styles.participantsRow}>
          <View style={styles.avatarsContainer}>
            {displayParticipants.map((participant, index) => (
              <View
                key={participant.id}
                style={[
                  styles.avatarWrapper,
                  { marginLeft: index > 0 ? -8 : 0, zIndex: displayParticipants.length - index },
                ]}
              >
                {participant.avatar_url ? (
                  <Image source={{ uri: participant.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]} />
                )}
              </View>
            ))}
          </View>
          {goingCount > 0 && (
            <Text style={styles.goingText}>
              +{remainingCount > 0 ? remainingCount : goingCount} going
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    marginRight: 12,
  },
  coverImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  placeholderImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  checkerboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 64,
    height: 64,
  },
  checkerSquare: {
    width: 16,
    height: 16,
  },
  lightSquare: {
    backgroundColor: '#F0F0F0',
  },
  darkSquare: {
    backgroundColor: '#E0E0E0',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  datetime: {
    fontSize: 13,
    color: '#6E6E73',
    marginBottom: 2,
  },
  location: {
    fontSize: 13,
    color: '#6E6E73',
    marginBottom: 6,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  avatarWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  avatarPlaceholder: {
    backgroundColor: '#E0E0E0',
  },
  goingText: {
    fontSize: 13,
    color: '#6E6E73',
  },
});

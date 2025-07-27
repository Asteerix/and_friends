import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import EventThumbnail from '@/shared/components/EventThumbnail';

interface ClusterModalProps {
  visible: boolean;
  events: any[];
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
  currentUserId?: string;
}

const ClusterModal: React.FC<ClusterModalProps> = ({
  visible,
  events,
  onClose,
  onSelectEvent,
  currentUserId,
}) => {
  const router = useRouter();

  const handleEventPress = (eventId: string) => {
    onClose();
    setTimeout(() => {
      onSelectEvent(eventId);
      router.push(`/screens/event-details?eventId=${eventId}`);
    }, 200);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handleBar} />
            <Text style={styles.title}>Événements à proximité</Text>
            <Text style={styles.subtitle}>
              {events.length} événement{events.length > 1 ? 's' : ''} dans cette zone
            </Text>
          </View>

          {/* Events List */}
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {events.map((event, index) => (
              <EventThumbnail
                key={event.id}
                event={event}
                onPress={() => handleEventPress(event.id)}
                style={index === 0 && styles.eventCardFirst}
                compact
                currentUserId={currentUserId}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D1D6',
    borderRadius: 3,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  eventCardFirst: {
    marginTop: 4,
  },
});

export default ClusterModal;
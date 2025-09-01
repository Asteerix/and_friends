// Exemple de migration EventDetailsScreen vers le système de cache
// Points critiques: galerie d'images et données d'événement

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { CachedImage, usePreloadImages } from '@/shared/components/CachedImage';
import { useEventDetails, useEventParticipants } from '@/shared/hooks/cache';
import { useOfflineQueue } from '@/shared/hooks/cache';

// Exemple de galerie d'images avec cache
export const EventGalleryExample = ({ eventId, photos }) => {
  // Précharger toutes les photos de la galerie
  const photoUrls = photos.map((p) => p.url).filter(Boolean);
  usePreloadImages(photoUrls);

  return (
    <ScrollView horizontal style={styles.gallery}>
      {photos.map((photo, index) => (
        <View key={photo.id || index} style={styles.photoWrapper}>
          {/* Avant: Image native */}
          {/* <Image
            source={{ uri: photo.url }}
            style={styles.galleryImage}
            resizeMode="cover"
          /> */}

          {/* Après: CachedImage avec priorité haute pour la galerie */}
          <CachedImage
            uri={photo.url}
            style={styles.galleryImage}
            priority="high"
            placeholder={require('@/assets/images/photo-placeholder.png')}
          />
        </View>
      ))}
    </ScrollView>
  );
};

// Exemple d'utilisation des hooks de cache pour les événements
export const EventDetailsExample = ({ eventId }) => {
  // Utiliser les hooks de cache
  const { data: event, isLoading, error } = useEventDetails(eventId);
  const { data: participants } = useEventParticipants(eventId);
  const { enqueue } = useOfflineQueue();

  // RSVP avec support offline
  const handleRSVP = async (status: 'going' | 'maybe' | 'declined') => {
    try {
      // Enqueue l'action pour synchronisation (fonctionne offline)
      await enqueue('event.rsvp', {
        eventId,
        status,
        userId: currentUser.id,
      });

      // Mettre à jour l'UI immédiatement
      // Le cache sera invalidé après la synchronisation
      showToast('RSVP enregistré !');
    } catch (error) {
      showToast('Erreur lors du RSVP', 'error');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
        <Text>Chargement de l'événement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.error}>
        <Text>Erreur: {error.message}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header avec image cachée */}
      <View style={styles.header}>
        <CachedImage
          uri={event.coverData?.media?.url || event.image_url}
          style={styles.coverImage}
          priority="high"
        />

        {/* Overlay avec infos */}
        <View style={styles.overlay}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.date}>{formatDate(event.date)}</Text>
        </View>
      </View>

      {/* Organisateur avec avatar caché */}
      <View style={styles.organizer}>
        <CachedImage
          uri={event.creator?.avatar_url}
          style={styles.organizerAvatar}
          placeholder={require('@/assets/images/default-avatar.png')}
        />
        <View>
          <Text style={styles.organizerName}>{event.creator?.full_name}</Text>
          <Text style={styles.organizerLabel}>Organisateur</Text>
        </View>
      </View>

      {/* Participants avec avatars cachés */}
      <View style={styles.participants}>
        <Text style={styles.sectionTitle}>Participants ({participants?.length || 0})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {participants?.slice(0, 10).map((participant, index) => (
            <View key={participant.user_id} style={styles.participantItem}>
              <CachedImage
                uri={participant.profile?.avatar_url}
                style={[styles.participantAvatar, index > 0 && styles.participantOverlap]}
                placeholder={require('@/assets/images/default-avatar.png')}
                priority="low" // Priorité basse pour les avatars
              />
            </View>
          ))}
          {participants?.length > 10 && (
            <View style={styles.moreParticipants}>
              <Text style={styles.moreText}>+{participants.length - 10}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Actions avec support offline */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.goingButton]}
          onPress={() => handleRSVP('going')}
        >
          <Text style={styles.buttonText}>J'y vais</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.maybeButton]}
          onPress={() => handleRSVP('maybe')}
        >
          <Text style={styles.buttonText}>Peut-être</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Exemple de préchargement intelligent
export const useEventPrefetch = (eventIds: string[]) => {
  const { prefetchEvents } = usePrefetchEvents(eventIds);

  useEffect(() => {
    // Précharger les événements visibles
    if (eventIds.length > 0) {
      prefetchEvents();
    }
  }, [eventIds]);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    height: 300,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  date: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  organizer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  organizerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  organizerName: {
    fontWeight: '600',
    fontSize: 16,
  },
  organizerLabel: {
    color: '#666',
    fontSize: 14,
  },
  gallery: {
    height: 200,
    marginVertical: 10,
  },
  photoWrapper: {
    marginRight: 10,
  },
  galleryImage: {
    width: 150,
    height: 180,
    borderRadius: 8,
  },
  participants: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  participantItem: {
    marginRight: -10,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  participantOverlap: {
    marginLeft: -15,
  },
  moreParticipants: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -15,
  },
  moreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  goingButton: {
    backgroundColor: '#4CAF50',
  },
  maybeButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

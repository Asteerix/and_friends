import { supabase } from '@/shared/lib/supabase/client';

// ==================== TYPES ====================

export interface EventCoverData {
  eventTitle: string;
  eventSubtitle: string;
  selectedTitleFont: string;
  selectedSubtitleFont: string;
  selectedBackground: string;
  coverImage: string;
  uploadedImage: string;
  placedStickers: Array<{
    id: string;
    emoji: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }>;
  selectedTemplate: any;
}

export interface EventLocation {
  name: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface EventCost {
  id: string;
  amount: string;
  currency: string;
  description: string;
}

export interface EventQuestionnaire {
  id: string;
  text: string;
  type: string;
}

export interface CreateEventData {
  // Données de base
  title: string;
  subtitle?: string;
  description?: string;
  date: Date;
  location?: string;
  locationDetails?: EventLocation;
  isPrivate: boolean;
  
  // Données de couverture
  coverData: EventCoverData;
  
  // Co-hosts
  coHosts?: Array<{id: string, name: string, avatar: string}>;
  
  // Extras
  costs?: EventCost[];
  eventPhotos?: string[];
  rsvpDeadline?: Date | null;
  rsvpReminderEnabled?: boolean;
  rsvpReminderTiming?: string;
  questionnaire?: EventQuestionnaire[];
  
  // Autres métadonnées
  itemsToBring?: string[];
  playlist?: any;
  spotifyLink?: string;
}

// ==================== SERVICE ====================

export class EventServiceV3 {
  static async createEvent(eventData: CreateEventData) {
    console.log('');
    console.log('🚀🚀🚀 [EventServiceV3] ========================================');
    console.log('🚀🚀🚀 [EventServiceV3] DÉBUT CRÉATION ÉVÉNEMENT - V3 COMPLÈTE');
    console.log('🚀🚀🚀 [EventServiceV3] ========================================');
    console.log('🕐 [V3] Timestamp:', new Date().toISOString());
    console.log('');
    
    // Log complet des données reçues
    console.log('📋 [V3] ===== DONNÉES REÇUES =====');
    console.log('📋 [V3] Structure complète:');
    console.log(JSON.stringify(eventData, null, 2));
    console.log('');

    try {
      // ==================== 1. AUTHENTIFICATION ====================
      console.log('🔐 [V3] ===== ÉTAPE 1: AUTHENTIFICATION =====');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ [V3] Erreur authentification:', userError);
        throw new Error(`Erreur d'authentification: ${userError.message}`);
      }
      
      if (!user) {
        console.error('❌ [V3] Aucun utilisateur connecté');
        throw new Error('Vous devez être connecté pour créer un événement');
      }
      
      console.log('✅ [V3] Utilisateur authentifié:');
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email);
      console.log('');

      // ==================== 2. UPLOAD IMAGE COUVERTURE ====================
      console.log('📸 [V3] ===== ÉTAPE 2: UPLOAD IMAGE COUVERTURE =====');
      let finalCoverImageUrl = null;
      
      if (eventData.coverData.uploadedImage && eventData.coverData.uploadedImage.startsWith('file://')) {
        console.log('📸 [V3] Image locale détectée, upload nécessaire');
        console.log('📸 [V3] URI:', eventData.coverData.uploadedImage);
        
        try {
          finalCoverImageUrl = await this.uploadCoverImage(eventData.coverData.uploadedImage, user.id);
          console.log('✅ [V3] Image uploadée avec succès:', finalCoverImageUrl);
        } catch (uploadError) {
          console.error('⚠️ [V3] Erreur upload, on continue sans image:', uploadError);
          finalCoverImageUrl = null;
        }
      } else if (eventData.coverData.coverImage) {
        console.log('🔗 [V3] URL d\'image existante:', eventData.coverData.coverImage);
        finalCoverImageUrl = eventData.coverData.coverImage;
      } else {
        console.log('🎨 [V3] Pas d\'image de couverture, utilisation du background/template');
      }
      console.log('');

      // ==================== 3. PRÉPARATION LOCALISATION ====================
      console.log('📍 [V3] ===== ÉTAPE 3: PRÉPARATION LOCALISATION =====');
      let locationPoint = null;
      
      if (eventData.locationDetails?.coordinates) {
        // Format PostGIS POINT(longitude latitude)
        locationPoint = `POINT(${eventData.locationDetails.coordinates.longitude} ${eventData.locationDetails.coordinates.latitude})`;
        console.log('📍 [V3] Coordonnées GPS disponibles:');
        console.log('  - Latitude:', eventData.locationDetails.coordinates.latitude);
        console.log('  - Longitude:', eventData.locationDetails.coordinates.longitude);
        console.log('  - Format PostGIS:', locationPoint);
      } else {
        console.log('📍 [V3] Pas de coordonnées GPS');
      }
      console.log('');

      // ==================== 4. PRÉPARATION DONNÉES COMPLÈTES ====================
      console.log('📝 [V3] ===== ÉTAPE 4: PRÉPARATION DONNÉES POUR SUPABASE =====');
      
      // Préparer les dates
      const startTime = eventData.date;
      const endTime = new Date(eventData.date.getTime() + 3 * 60 * 60 * 1000); // +3h par défaut
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      console.log('⏰ [V3] Dates et heures:');
      console.log('  - Start time:', startTime.toISOString());
      console.log('  - End time:', endTime.toISOString());
      console.log('  - Timezone:', timezone);
      console.log('');
      
      // Préparer les co-organisateurs
      const coOrganizerIds = eventData.coHosts?.map(ch => ch.id) || [];
      console.log('👥 [V3] Co-organisateurs:', coOrganizerIds.length);
      coOrganizerIds.forEach((id, i) => {
        console.log(`  - Co-host ${i + 1}: ${id}`);
      });
      console.log('');
      
      // Préparer cover_data complet
      const coverDataComplete = {
        ...eventData.coverData,
        finalCoverUrl: finalCoverImageUrl,
        uploadedImage: null, // Ne pas stocker l'URI locale
      };
      
      console.log('🎨 [V3] Cover data préparé:');
      console.log('  - Titre:', coverDataComplete.eventTitle);
      console.log('  - Sous-titre:', coverDataComplete.eventSubtitle);
      console.log('  - Font titre:', coverDataComplete.selectedTitleFont);
      console.log('  - Font sous-titre:', coverDataComplete.selectedSubtitleFont);
      console.log('  - Background:', coverDataComplete.selectedBackground);
      console.log('  - Image finale:', coverDataComplete.finalCoverUrl ? 'Oui' : 'Non');
      console.log('  - Stickers:', coverDataComplete.placedStickers?.length || 0);
      console.log('  - Template:', coverDataComplete.selectedTemplate ? 'Oui' : 'Non');
      console.log('');
      
      // Préparer extra_data
      const extraData = {
        // Métadonnées sur les extras
        hasCoHosts: coOrganizerIds.length > 0,
        coHostsDetails: eventData.coHosts || [],
        hasCosts: (eventData.costs?.length || 0) > 0,
        costsDetails: eventData.costs || [],
        hasPhotos: (eventData.eventPhotos?.length || 0) > 0,
        photosCount: eventData.eventPhotos?.length || 0,
        hasQuestionnaire: (eventData.questionnaire?.length || 0) > 0,
        questionnaireDetails: eventData.questionnaire || [],
        hasItemsToBring: (eventData.itemsToBring?.length || 0) > 0,
        itemsToBringDetails: eventData.itemsToBring || [],
        hasPlaylist: !!eventData.playlist || !!eventData.spotifyLink,
        playlistDetails: eventData.playlist || null,
        spotifyLink: eventData.spotifyLink || null,
        
        // RSVP
        rsvpReminderEnabled: eventData.rsvpReminderEnabled || false,
        rsvpReminderTiming: eventData.rsvpReminderTiming || '24h',
        
        // Métadonnées
        createdWithVersion: 'V3',
        createdAt: new Date().toISOString(),
      };
      
      console.log('🎯 [V3] Extra data préparé:');
      console.log('  - Co-hosts:', extraData.hasCoHosts);
      console.log('  - Coûts:', extraData.hasCosts);
      console.log('  - Photos:', extraData.hasPhotos);
      console.log('  - Questionnaire:', extraData.hasQuestionnaire);
      console.log('  - Items à apporter:', extraData.hasItemsToBring);
      console.log('  - Playlist:', extraData.hasPlaylist);
      console.log('');

      // ==================== 5. OBJET FINAL POUR INSERTION ====================
      // On utilise UNIQUEMENT les colonnes qui existent actuellement dans la table events
      const eventToInsert: any = {
        // Colonnes de base (migration 20250601000100)
        title: eventData.title || eventData.coverData.eventTitle || 'Nouvel événement',
        description: eventData.description || '',
        date: startTime.toISOString(), // La colonne s'appelle 'date', pas 'start_time'
        location: eventData.location || eventData.locationDetails?.address || '',
        image_url: finalCoverImageUrl || null,
        tags: [],
        is_private: eventData.isPrivate || false,
        created_by: user.id,
        
        // Colonnes ajoutées par migration 20250524032402
        cover_bg_color: eventData.coverData.selectedBackground || null,
        cover_font: eventData.coverData.selectedTitleFont || null,
        cover_image: finalCoverImageUrl || null,
        subtitle: eventData.subtitle || eventData.coverData.eventSubtitle || null,
      };
      
      // Vérifier si les colonnes supplémentaires existent (migration 20250708000000)
      // Pour l'instant, on va stocker TOUT dans extra_data pour éviter les erreurs
      eventToInsert.extra_data = {
        // Données de timing détaillées
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        timezone: timezone,
        
        // Localisation détaillée
        locationDetails: eventData.locationDetails || null,
        venue_name: eventData.locationDetails?.name || null,
        address: eventData.locationDetails?.address || null,
        city: eventData.locationDetails?.city || null,
        postal_code: eventData.locationDetails?.postalCode || null,
        country: eventData.locationDetails?.country || null,
        coordinates: eventData.locationDetails?.coordinates || null,
        locationPoint: locationPoint,
        
        // Organisateurs
        organizer_id: user.id,
        co_organizers: coOrganizerIds,
        coHostsDetails: eventData.coHosts || [],
        
        // Cover complet
        coverData: coverDataComplete,
        
        // Privacy et status
        privacy: eventData.isPrivate ? 'invite-only' : 'public',
        status: 'published',
        category: 'social',
        
        // Capacité
        max_attendees: null,
        current_attendees: 0,
        
        // What to bring
        what_to_bring: eventData.itemsToBring || [],
        
        // Prix et coûts
        price: eventData.costs && eventData.costs.length > 0 && eventData.costs[0] ? parseFloat(eventData.costs[0].amount) : null,
        currency: eventData.costs && eventData.costs.length > 0 && eventData.costs[0] ? eventData.costs[0].currency : 'EUR',
        payment_required: eventData.costs && eventData.costs.length > 0,
        costs: eventData.costs || [],
        
        // RSVP
        rsvp_deadline: eventData.rsvpDeadline ? eventData.rsvpDeadline.toISOString() : null,
        rsvp_reminder_enabled: eventData.rsvpReminderEnabled || false,
        rsvp_reminder_timing: eventData.rsvpReminderTiming || '24h',
        
        // Autres extras
        questionnaire: eventData.questionnaire || [],
        eventPhotos: eventData.eventPhotos || [],
        playlist: eventData.playlist || null,
        spotifyLink: eventData.spotifyLink || null,
        
        // Métadonnées
        createdWithVersion: 'V3',
        createdAt: new Date().toISOString(),
      };

      console.log('📦 [V3] ===== OBJET FINAL POUR INSERTION =====');
      console.log('📦 [V3] Structure de l\'objet (colonnes principales uniquement):');
      console.log('  - title:', eventToInsert.title);
      console.log('  - date:', eventToInsert.date);
      console.log('  - location:', eventToInsert.location);
      console.log('  - created_by:', eventToInsert.created_by);
      console.log('  - is_private:', eventToInsert.is_private);
      console.log('  - subtitle:', eventToInsert.subtitle || '[VIDE]');
      console.log('  - cover_bg_color:', eventToInsert.cover_bg_color || '[VIDE]');
      console.log('  - cover_font:', eventToInsert.cover_font || '[VIDE]');
      console.log('  - cover_image:', eventToInsert.cover_image ? 'OUI' : 'NON');
      console.log('  - image_url:', eventToInsert.image_url ? 'OUI' : 'NON');
      console.log('  - extra_data:', eventToInsert.extra_data ? 'OUI (' + JSON.stringify(eventToInsert.extra_data).length + ' caractères)' : 'NON');
      console.log('📦 [V3] Taille totale:', JSON.stringify(eventToInsert).length, 'caractères');
      console.log('');

      // ==================== 6. INSERTION DANS SUPABASE ====================
      console.log('💾 [V3] ===== ÉTAPE 5: INSERTION DANS SUPABASE =====');
      console.log('💾 [V3] Insertion dans la table "events"...');
      
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert([eventToInsert])
        .select()
        .single();

      if (insertError) {
        console.error('❌❌❌ [V3] ERREUR INSERTION SUPABASE ❌❌❌');
        console.error('❌ [V3] Code erreur:', insertError.code);
        console.error('❌ [V3] Message:', insertError.message);
        console.error('❌ [V3] Détails:', insertError.details);
        console.error('❌ [V3] Hint:', insertError.hint);
        
        // Analyser le type d'erreur
        if (insertError.code === '42703') {
          console.error('❌ [V3] COLONNE INEXISTANTE!');
          console.error('❌ [V3] Exécutez la migration: supabase db push');
        } else if (insertError.code === '23502') {
          console.error('❌ [V3] VALEUR NULL NON AUTORISÉE!');
        } else if (insertError.code === '23503') {
          console.error('❌ [V3] VIOLATION DE CLÉ ÉTRANGÈRE!');
        }
        
        throw new Error(`Erreur Supabase: ${insertError.message}`);
      }

      if (!newEvent) {
        console.error('❌ [V3] Aucun événement retourné');
        throw new Error('Erreur: aucun événement créé');
      }

      console.log('✅✅✅ [V3] ÉVÉNEMENT CRÉÉ AVEC SUCCÈS! ✅✅✅');
      console.log('🎯 [V3] ID:', newEvent.id);
      console.log('📝 [V3] Titre:', newEvent.title);
      console.log('📅 [V3] Date:', newEvent.date);
      console.log('📍 [V3] Location:', newEvent.location);
      console.log('🔒 [V3] Privé:', newEvent.is_private ? 'Oui' : 'Non');
      console.log('👤 [V3] Créé par:', newEvent.created_by);
      console.log('🎨 [V3] Cover image:', newEvent.cover_image ? 'Oui' : 'Non');
      console.log('');

      // ==================== 7. AJOUTER LE CRÉATEUR COMME PARTICIPANT ====================
      console.log('👤 [V3] ===== ÉTAPE 6: AJOUT DU CRÉATEUR COMME PARTICIPANT =====');
      
      // Utiliser event_participants qui existe, pas event_attendees
      const participantData: any = {
        event_id: newEvent.id,
        user_id: user.id,
        status: 'going'
      };
      
      // Certaines migrations ajoutent event_created_by
      if (eventToInsert.created_by) {
        participantData.event_created_by = eventToInsert.created_by;
      }
      
      console.log('👤 [V3] Données participant:', participantData);
      
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert([participantData]);

      if (participantError) {
        console.error('⚠️ [V3] Erreur ajout participant:', participantError.message);
        
        if (participantError.code === '42703' && participantData.event_created_by) {
          console.warn('⚠️ [V3] Colonne event_created_by manquante, réessai sans...');
          delete participantData.event_created_by;
          
          const { error: retryError } = await supabase
            .from('event_participants')
            .insert([participantData]);
            
          if (retryError) {
            console.error('⚠️ [V3] Échec du réessai:', retryError.message);
          } else {
            console.log('✅ [V3] Créateur ajouté comme participant (après réessai)');
          }
        }
      } else {
        console.log('✅ [V3] Créateur ajouté comme participant');
      }
      console.log('');

      // ==================== 8. TRAITEMENT DES EXTRAS ====================
      console.log('🎯 [V3] ===== ÉTAPE 7: TRAITEMENT DES EXTRAS =====');
      const extrasResults = {
        coHosts: { success: false, error: null as any },
        costs: { success: false, error: null as any },
        photos: { success: false, error: null as any },
        questionnaire: { success: false, error: null as any },
        stickers: { success: false, error: null as any },
        playlist: { success: false, error: null as any }
      };

      // 8.1 Co-hosts
      if (eventData.coHosts && eventData.coHosts.length > 0) {
        console.log('👥 [V3] Ajout des co-hosts...');
        try {
          await this.addCoHosts(newEvent.id, eventData.coHosts, user.id);
          extrasResults.coHosts.success = true;
          console.log('✅ [V3] Co-hosts ajoutés');
        } catch (error) {
          extrasResults.coHosts.error = error;
          console.error('❌ [V3] Erreur co-hosts:', error);
        }
      }

      // 8.2 Costs
      if (eventData.costs && eventData.costs.length > 0) {
        console.log('💰 [V3] Ajout des coûts...');
        try {
          await this.addCosts(newEvent.id, eventData.costs);
          extrasResults.costs.success = true;
          console.log('✅ [V3] Coûts ajoutés');
        } catch (error) {
          extrasResults.costs.error = error;
          console.error('❌ [V3] Erreur coûts:', error);
        }
      }

      // 8.3 Photos
      if (eventData.eventPhotos && eventData.eventPhotos.length > 0) {
        console.log('📷 [V3] Upload des photos...');
        try {
          await this.uploadEventPhotos(newEvent.id, eventData.eventPhotos, user.id);
          extrasResults.photos.success = true;
          console.log('✅ [V3] Photos uploadées');
        } catch (error) {
          extrasResults.photos.error = error;
          console.error('❌ [V3] Erreur photos:', error);
        }
      }

      // 8.4 Questionnaire
      if (eventData.questionnaire && eventData.questionnaire.length > 0) {
        console.log('📋 [V3] Ajout du questionnaire...');
        try {
          await this.addQuestionnaire(newEvent.id, eventData.questionnaire);
          extrasResults.questionnaire.success = true;
          console.log('✅ [V3] Questionnaire ajouté');
        } catch (error) {
          extrasResults.questionnaire.error = error;
          console.error('❌ [V3] Erreur questionnaire:', error);
        }
      }

      // 8.5 Stickers
      if (eventData.coverData.placedStickers && eventData.coverData.placedStickers.length > 0) {
        console.log('✨ [V3] Ajout des stickers...');
        try {
          await this.addCoverStickers(newEvent.id, eventData.coverData.placedStickers);
          extrasResults.stickers.success = true;
          console.log('✅ [V3] Stickers ajoutés');
        } catch (error) {
          extrasResults.stickers.error = error;
          console.error('❌ [V3] Erreur stickers:', error);
        }
      }

      // 8.6 Playlist
      if (eventData.playlist || eventData.spotifyLink) {
        console.log('🎵 [V3] Ajout de la playlist...');
        try {
          await this.addPlaylist(newEvent.id, eventData.playlist, eventData.spotifyLink);
          extrasResults.playlist.success = true;
          console.log('✅ [V3] Playlist ajoutée');
        } catch (error) {
          extrasResults.playlist.error = error;
          console.error('❌ [V3] Erreur playlist:', error);
        }
      }

      // ==================== 9. RÉSUMÉ FINAL ====================
      console.log('');
      console.log('🎉🎉🎉 [V3] ========================================');
      console.log('🎉🎉🎉 [V3] CRÉATION TERMINÉE AVEC SUCCÈS!');
      console.log('🎉🎉🎉 [V3] ========================================');
      console.log('');
      console.log('📊 [V3] RÉSUMÉ FINAL:');
      console.log('  🆔 ID:', newEvent.id);
      console.log('  📝 Titre:', newEvent.title);
      console.log('  📅 Date:', new Date(newEvent.date).toLocaleString());
      console.log('  📍 Lieu:', newEvent.location || 'Non spécifié');
      console.log('  🔒 Privé:', newEvent.is_private ? 'Oui' : 'Non');
      console.log('  👤 Organisateur:', newEvent.created_by);
      console.log('  👥 Co-hosts:', eventData.coHosts?.length || 0);
      console.log('');
      console.log('📋 [V3] EXTRAS CONFIGURÉS:');
      Object.entries(extrasResults).forEach(([key, result]) => {
        const icon = result.success ? '✅' : result.error ? '❌' : '⏭️';
        console.log(`  ${icon} ${key}: ${result.success ? 'Succès' : result.error ? 'Échec' : 'Ignoré'}`);
      });
      console.log('');
      console.log('🔗 [V3] URL de l\'événement: /event/' + newEvent.id);
      console.log('');
      
      // 7. Créer automatiquement une conversation pour l'événement
      console.log('💬 [V3] Création de la conversation de l\'événement...');
      try {
        const chatData = {
          name: newEvent.title,
          is_group: true,
          event_id: newEvent.id,
          created_by: user.id
        };
        
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert([chatData])
          .select()
          .single();
        
        if (chatError) {
          console.error('⚠️ [V3] Erreur création chat:', chatError);
          // On ne fait pas échouer la création de l'événement si le chat échoue
        } else if (newChat) {
          console.log('✅ [V3] Conversation créée:', newChat.id);
          
          // Ajouter le créateur comme participant à la conversation
          const { error: participantError } = await supabase
            .from('chat_participants')
            .insert([{
              chat_id: newChat.id,
              user_id: user.id
            }]);
          
          if (participantError) {
            console.error('⚠️ [V3] Erreur ajout participant:', participantError);
          } else {
            console.log('✅ [V3] Créateur ajouté à la conversation');
          }
        }
      } catch (chatError) {
        console.error('⚠️ [V3] Erreur lors de la création du chat:', chatError);
        // On continue quand même, l'événement est créé
      }
      
      console.log('🎉🎉🎉 [V3] ========================================');
      console.log('');
      
      return { success: true, event: newEvent };

    } catch (error) {
      console.error('');
      console.error('💥💥💥 [V3] ========================================');
      console.error('💥💥💥 [V3] ERREUR FATALE');
      console.error('💥💥💥 [V3] ========================================');
      console.error('💥 [V3] Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('💥 [V3] Message:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('💥 [V3] Stack:');
        console.error(error.stack);
      }
      console.error('💥💥💥 [V3] ========================================');
      console.error('');
      
      throw error;
    }
  }

  // ==================== MÉTHODES AUXILIAIRES ====================

  static async uploadCoverImage(imageUri: string, userId: string): Promise<string> {
    console.log('📤 [V3.uploadCoverImage] Début upload...');
    
    try {
      const bucketName = 'events';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileName = `${userId}/covers/${timestamp}-${randomId}.jpg`;
      
      console.log('📤 [V3.uploadCoverImage] Bucket:', bucketName);
      console.log('📤 [V3.uploadCoverImage] Chemin:', fileName);
      
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Erreur fetch: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('📤 [V3.uploadCoverImage] Blob size:', blob.size, 'bytes');
      
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600'
        });

      if (error) {
        console.error('❌ [V3.uploadCoverImage] Erreur storage:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log('✅ [V3.uploadCoverImage] Upload réussi:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ [V3.uploadCoverImage] Erreur:', error);
      throw error;
    }
  }

  static async addCoHosts(eventId: string, coHosts: any[], invitedBy: string) {
    console.log(`👥 [V3.addCoHosts] Ajout de ${coHosts.length} co-hosts...`);
    
    const participantsToAdd = coHosts.map(ch => {
      const participant: any = {
        event_id: eventId,
        user_id: ch.id,
        status: 'going'
      };
      
      // Ajouter event_created_by si la colonne existe
      participant.event_created_by = invitedBy;
      
      return participant;
    });

    console.log('👥 [V3.addCoHosts] Insertion dans event_participants...');
    const { error } = await supabase
      .from('event_participants')
      .insert(participantsToAdd);

    if (error) {
      console.error('❌ [V3.addCoHosts] Erreur:', error);
      
      if (error.code === '42703') {
        console.warn('⚠️ [V3.addCoHosts] Colonne manquante, réessai sans event_created_by');
        
        const retry = participantsToAdd.map(p => ({
          event_id: p.event_id,
          user_id: p.user_id,
          status: p.status
        }));
        
        const { error: retryError } = await supabase
          .from('event_participants')
          .insert(retry);
          
        if (retryError) {
          throw retryError;
        }
        
        console.log('✅ [V3.addCoHosts] Co-hosts ajoutés après réessai');
        return;
      }
      
      throw error;
    }
    
    console.log('✅ [V3.addCoHosts] Co-hosts ajoutés avec succès');
  }

  static async addCosts(eventId: string, costs: EventCost[]) {
    console.log(`💰 [V3.addCosts] Ajout de ${costs.length} coûts...`);
    
    const costsToAdd = costs.map(cost => ({
      event_id: eventId,
      amount: parseFloat(cost.amount),
      currency: cost.currency || 'EUR',
      description: cost.description
    }));

    const { error } = await supabase
      .from('event_costs')
      .insert(costsToAdd);

    if (error) {
      console.error('❌ [V3.addCosts] Erreur:', error);
      if (error.code === '42P01') {
        console.warn('⚠️ [V3.addCosts] Table event_costs n\'existe pas');
      }
      throw error;
    }
  }

  static async uploadEventPhotos(eventId: string, photos: string[], userId: string) {
    console.log(`📷 [V3.uploadEventPhotos] Upload de ${photos.length} photos...`);
    
    const photosToAdd = [];
    
    for (const [index, photoUri] of photos.entries()) {
      try {
        console.log(`📸 [V3] Upload photo ${index + 1}/${photos.length}`);
        
        const fileName = `${userId}/events/${eventId}/${Date.now()}-${index}.jpg`;
        const response = await fetch(photoUri);
        const blob = await response.blob();
        
        const { error } = await supabase.storage
          .from('events')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (error) {
          console.error(`❌ [V3] Erreur upload photo ${index + 1}:`, error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('events')
          .getPublicUrl(fileName);

        photosToAdd.push({
          event_id: eventId,
          photo_url: publicUrl,
          position: index,
          uploaded_by: userId
        });
      } catch (error) {
        console.error(`❌ [V3] Erreur photo ${index + 1}:`, error);
      }
    }

    if (photosToAdd.length > 0) {
      const { error } = await supabase
        .from('event_photos')
        .insert(photosToAdd);

      if (error) {
        console.error('❌ [V3.uploadEventPhotos] Erreur insertion:', error);
        throw error;
      }
    }
  }

  static async addQuestionnaire(eventId: string, questions: EventQuestionnaire[]) {
    console.log(`📋 [V3.addQuestionnaire] Ajout de ${questions.length} questions...`);
    
    const questionsToAdd = questions.map((q, i) => ({
      event_id: eventId,
      question: q.text,
      question_type: q.type || 'text',
      position: i
    }));

    const { error } = await supabase
      .from('event_questionnaire')
      .insert(questionsToAdd);

    if (error) {
      console.error('❌ [V3.addQuestionnaire] Erreur:', error);
      throw error;
    }
  }

  static async addCoverStickers(eventId: string, stickers: any[]) {
    console.log(`✨ [V3.addCoverStickers] Ajout de ${stickers.length} stickers...`);
    
    const stickersToAdd = stickers.map(s => ({
      event_id: eventId,
      sticker_emoji: s.emoji,
      position_x: s.x,
      position_y: s.y,
      scale: s.scale || 1.0,
      rotation: s.rotation || 0
    }));

    const { error } = await supabase
      .from('event_cover_stickers')
      .insert(stickersToAdd);

    if (error) {
      console.error('❌ [V3.addCoverStickers] Erreur:', error);
      throw error;
    }
  }

  static async addPlaylist(eventId: string, playlist: any, spotifyLink?: string) {
    console.log('🎵 [V3.addPlaylist] Ajout playlist...');
    
    const playlistData = {
      event_id: eventId,
      playlist_name: 'Event Playlist',
      spotify_link: spotifyLink || null,
      songs: playlist || []
    };

    const { error } = await supabase
      .from('event_playlists')
      .insert([playlistData]);

    if (error) {
      console.error('❌ [V3.addPlaylist] Erreur:', error);
      throw error;
    }
  }
}
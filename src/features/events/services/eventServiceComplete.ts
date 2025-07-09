import { supabase } from '@/shared/lib/supabase/client';

// Types pour la création d'événements
export interface CreateEventData {
  title: string;
  subtitle?: string;
  description?: string;
  date: Date;
  location?: string;
  locationDetails?: {
    name: string;
    address: string;
    city: string;
    postalCode?: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  isPrivate: boolean;
  coverData: {
    eventTitle: string;
    eventSubtitle?: string;
    selectedTitleFont?: string;
    selectedSubtitleFont?: string;
    selectedBackground?: string;
    coverImage?: string;
    uploadedImage?: string;
    placedStickers?: Array<{
      id: string;
      emoji: string;
      x: number;
      y: number;
      scale: number;
      rotation: number;
    }>;
    selectedTemplate?: any;
  };
  coHosts?: Array<{id: string, name: string, avatar: string}>;
  costs?: Array<{id: string, amount: string, currency: string, description: string}>;
  eventPhotos?: string[];
  rsvpDeadline?: Date | null;
  rsvpReminderEnabled?: boolean;
  rsvpReminderTiming?: string;
  questionnaire?: Array<{id: string, text: string, type: string}>;
  itemsToBring?: Array<{id: string, name: string, quantity: number, assignedTo?: string}>;
  playlist?: any;
  spotifyLink?: string;
}

export interface EventCost {
  id: string;
  amount: string;
  currency: string;
  description: string;
}

export class EventServiceComplete {
  static async createEvent(eventData: CreateEventData) {
    console.log('🚀 [EventServiceComplete] ========================================');
    console.log('🚀 [EventServiceComplete] DÉBUT DE LA CRÉATION D\'ÉVÉNEMENT');
    console.log('🚀 [EventServiceComplete] ========================================');
    console.log('');

    try {
      // 1. Vérifier l'authentification
      console.log('🔐 [EventServiceComplete] Vérification de l\'authentification...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('❌ [EventServiceComplete] Erreur d\'authentification:', authError);
        throw new Error('Vous devez être connecté pour créer un événement');
      }
      console.log('✅ [EventServiceComplete] Utilisateur authentifié:', user.id);
      console.log('');

      // 2. Upload de l'image de couverture si nécessaire
      let finalCoverImageUrl = null;
      if (eventData.coverData.uploadedImage || eventData.coverData.coverImage) {
        console.log('🖼️ [EventServiceComplete] Upload de l\'image de couverture...');
        try {
          finalCoverImageUrl = await this.uploadCoverImage(
            eventData.coverData.uploadedImage || eventData.coverData.coverImage!,
            user.id
          );
          console.log('✅ [EventServiceComplete] Image uploadée:', finalCoverImageUrl);
        } catch (uploadError) {
          console.error('⚠️ [EventServiceComplete] Erreur upload image:', uploadError);
          // On continue sans image
        }
      }
      console.log('');

      // 3. Préparer les données de l'événement
      console.log('📋 [EventServiceComplete] Préparation des données...');
      
      // Utiliser la date fournie pour start_time et calculer end_time (+3h par défaut)
      const startTime = new Date(eventData.date);
      const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // +3 heures
      
      // Préparer les données pour la table events
      const eventToInsert: any = {
        // Colonnes de base qui existent sûrement
        title: eventData.title || eventData.coverData.eventTitle || 'Nouvel événement',
        description: eventData.description || '',
        date: startTime.toISOString(),
        location: eventData.location || eventData.locationDetails?.address || '',
        is_private: eventData.isPrivate || false,
        created_by: user.id,
        
        // Colonnes de couverture (peuvent exister ou non)
        subtitle: eventData.subtitle || eventData.coverData.eventSubtitle || null,
        cover_bg_color: eventData.coverData.selectedBackground || null,
        cover_font: eventData.coverData.selectedTitleFont || null,
        cover_image: finalCoverImageUrl || null,
        image_url: finalCoverImageUrl || null,
        
        // Colonnes RSVP (ajoutées par migration)
        rsvp_deadline: eventData.rsvpDeadline ? eventData.rsvpDeadline.toISOString() : null,
        rsvp_reminder_enabled: eventData.rsvpReminderEnabled || false,
        rsvp_reminder_timing: eventData.rsvpReminderTiming || '24h',
      };

      // Préparer extra_data avec TOUTES les données supplémentaires
      eventToInsert.extra_data = {
        // Timing
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        
        // Localisation complète
        location_details: eventData.locationDetails || null,
        
        // Cover data complète
        coverData: {
          ...eventData.coverData,
          finalCoverImageUrl,
        },
        
        // Co-hosts
        coHosts: eventData.coHosts || [],
        
        // Extras
        costs: eventData.costs || [],
        eventPhotos: eventData.eventPhotos || [],
        questionnaire: eventData.questionnaire || [],
        itemsToBring: eventData.itemsToBring || [],
        playlist: eventData.playlist || null,
        spotifyLink: eventData.spotifyLink || null,
        
        // Métadonnées
        createdWithService: 'EventServiceComplete',
        createdAt: new Date().toISOString(),
      };

      // Si location_details existe comme colonne
      if (eventData.locationDetails) {
        eventToInsert.location_details = eventData.locationDetails;
      }

      console.log('📦 [EventServiceComplete] Données préparées');
      console.log('  - Titre:', eventToInsert.title);
      console.log('  - Date:', new Date(eventToInsert.date).toLocaleString());
      console.log('  - Privé:', eventToInsert.is_private);
      console.log('  - Extras dans extra_data:', Object.keys(eventToInsert.extra_data).length);
      console.log('');

      // 4. Insérer l'événement
      console.log('💾 [EventServiceComplete] Insertion dans Supabase...');
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert([eventToInsert])
        .select()
        .single();

      if (insertError) {
        console.error('❌ [EventServiceComplete] Erreur insertion:', insertError);
        console.error('  Code:', insertError.code);
        console.error('  Message:', insertError.message);
        console.error('  Détails:', insertError.details);
        
        // Si c'est une erreur de colonne manquante, on réessaie avec moins de colonnes
        if (insertError.code === '42703') {
          console.log('🔄 [EventServiceComplete] Réessai avec colonnes minimales...');
          
          const minimalEvent = {
            title: eventToInsert.title,
            description: eventToInsert.description,
            date: eventToInsert.date,
            location: eventToInsert.location,
            is_private: eventToInsert.is_private,
            created_by: eventToInsert.created_by,
            extra_data: eventToInsert.extra_data,
          };
          
          const { data: retryEvent, error: retryError } = await supabase
            .from('events')
            .insert([minimalEvent])
            .select()
            .single();
            
          if (retryError) {
            console.error('❌ [EventServiceComplete] Échec du réessai:', retryError);
            throw new Error('Impossible de créer l\'événement: ' + retryError.message);
          }
          
          console.log('✅ [EventServiceComplete] Événement créé avec colonnes minimales');
          return { success: true, event: retryEvent };
        }
        
        throw new Error('Erreur lors de la création: ' + insertError.message);
      }

      if (!newEvent) {
        throw new Error('Aucun événement retourné');
      }

      console.log('✅ [EventServiceComplete] Événement créé avec succès!');
      console.log('  🆔 ID:', newEvent.id);
      console.log('  📝 Titre:', newEvent.title);
      console.log('');

      // 5. Ajouter le créateur comme participant
      console.log('👤 [EventServiceComplete] Ajout du créateur comme participant...');
      try {
        await this.addCreatorAsParticipant(newEvent.id, user.id);
        console.log('✅ [EventServiceComplete] Créateur ajouté');
      } catch (error) {
        console.error('⚠️ [EventServiceComplete] Erreur ajout participant:', error);
      }
      console.log('');

      // 6. Traiter les extras en parallèle
      console.log('🎯 [EventServiceComplete] Traitement des extras...');
      const extrasPromises = [];

      // Co-hosts
      if (eventData.coHosts && eventData.coHosts.length > 0) {
        console.log(`  👥 Ajout de ${eventData.coHosts.length} co-hosts...`);
        extrasPromises.push(
          this.addCoHosts(newEvent.id, eventData.coHosts, user.id)
            .then(() => ({ type: 'coHosts', success: true }))
            .catch(error => ({ type: 'coHosts', success: false, error }))
        );
      }

      // Costs
      if (eventData.costs && eventData.costs.length > 0) {
        console.log(`  💰 Ajout de ${eventData.costs.length} coûts...`);
        extrasPromises.push(
          this.addCosts(newEvent.id, eventData.costs)
            .then(() => ({ type: 'costs', success: true }))
            .catch(error => ({ type: 'costs', success: false, error }))
        );
      }

      // Photos
      if (eventData.eventPhotos && eventData.eventPhotos.length > 0) {
        console.log(`  📸 Ajout de ${eventData.eventPhotos.length} photos...`);
        extrasPromises.push(
          this.addPhotos(newEvent.id, eventData.eventPhotos, user.id)
            .then(() => ({ type: 'photos', success: true }))
            .catch(error => ({ type: 'photos', success: false, error }))
        );
      }

      // Questionnaire
      if (eventData.questionnaire && eventData.questionnaire.length > 0) {
        console.log(`  📋 Ajout de ${eventData.questionnaire.length} questions...`);
        extrasPromises.push(
          this.addQuestionnaire(newEvent.id, eventData.questionnaire)
            .then(() => ({ type: 'questionnaire', success: true }))
            .catch(error => ({ type: 'questionnaire', success: false, error }))
        );
      }

      // Items to bring
      if (eventData.itemsToBring && eventData.itemsToBring.length > 0) {
        console.log(`  🎁 Ajout de ${eventData.itemsToBring.length} items...`);
        extrasPromises.push(
          this.addItemsToBring(newEvent.id, eventData.itemsToBring)
            .then(() => ({ type: 'items', success: true }))
            .catch(error => ({ type: 'items', success: false, error }))
        );
      }

      // Playlist
      if (eventData.playlist && eventData.playlist.length > 0) {
        console.log(`  🎵 Ajout de ${eventData.playlist.length} chansons...`);
        extrasPromises.push(
          this.addPlaylist(newEvent.id, eventData.playlist, eventData.spotifyLink || null)
            .then(() => ({ type: 'playlist', success: true }))
            .catch(error => ({ type: 'playlist', success: false, error }))
        );
      }

      // Stickers
      if (eventData.coverData.placedStickers && eventData.coverData.placedStickers.length > 0) {
        console.log(`  🎨 Ajout de ${eventData.coverData.placedStickers.length} stickers...`);
        extrasPromises.push(
          this.addStickers(newEvent.id, eventData.coverData.placedStickers)
            .then(() => ({ type: 'stickers', success: true }))
            .catch(error => ({ type: 'stickers', success: false, error }))
        );
      }

      // Attendre tous les extras
      if (extrasPromises.length > 0) {
        const results = await Promise.all(extrasPromises);
        console.log('');
        console.log('📊 [EventServiceComplete] Résultats des extras:');
        results.forEach(result => {
          const icon = result.success ? '✅' : '❌';
          console.log(`  ${icon} ${result.type}: ${result.success ? 'OK' : 'error' in result ? result.error?.message || 'Erreur' : 'Erreur'}`);
        });
      }

      console.log('');
      console.log('🎉 [EventServiceComplete] ========================================');
      console.log('🎉 [EventServiceComplete] CRÉATION TERMINÉE AVEC SUCCÈS!');
      console.log('🎉 [EventServiceComplete] ========================================');
      console.log('');
      console.log('🔗 URL: /event/' + newEvent.id);

      return { success: true, event: newEvent };

    } catch (error) {
      console.error('💥 [EventServiceComplete] ERREUR FATALE:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  // Upload de l'image de couverture
  private static async uploadCoverImage(imageUri: string, userId: string): Promise<string> {
    const fileName = `${userId}/${Date.now()}_cover.jpg`;
    
    // Essayer d'abord le bucket 'events'
    let bucket = 'events';
    let response = await fetch(imageUri);
    let blob = await response.blob();
    
    console.log(`📤 [uploadCoverImage] Upload vers bucket '${bucket}'...`);
    let { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    // Si erreur, essayer 'event-images'
    if (error && error.message.includes('404')) {
      console.log('⚠️ [uploadCoverImage] Bucket events non trouvé, essai avec event-images...');
      bucket = 'event-images';
      
      response = await fetch(imageUri);
      blob = await response.blob();
      
      const retry = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });
        
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error(`❌ [uploadCoverImage] Erreur upload:`, error);
      throw error;
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data?.path || fileName);

    return publicUrl;
  }

  // Ajouter le créateur comme participant
  private static async addCreatorAsParticipant(eventId: string, userId: string) {
    const { error } = await supabase
      .from('event_participants')
      .insert([{
        event_id: eventId,
        user_id: userId,
        status: 'going'
      }]);

    if (error) {
      console.error('❌ [addCreatorAsParticipant] Erreur:', error);
      throw error;
    }
  }

  // Ajouter les co-hosts
  private static async addCoHosts(eventId: string, coHosts: any[], addedBy: string) {
    // Utiliser la table event_cohosts (pas event_co_hosts)
    const coHostsData = coHosts.map(ch => ({
      event_id: eventId,
      user_id: typeof ch === 'string' ? ch : ch.id,
      invited_by: addedBy,
      status: 'pending',
      permissions: ['edit_basic', 'invite_guests']
    }));

    const { error } = await supabase
      .from('event_cohosts')
      .insert(coHostsData);

    if (error) {
      console.error('❌ [addCoHosts] Erreur:', error);
      throw error;
    }
  }

  // Ajouter les coûts
  private static async addCosts(eventId: string, costs: EventCost[]) {
    const costsData = costs.map(cost => ({
      event_id: eventId,
      amount: parseFloat(cost.amount),
      currency: cost.currency || 'EUR',
      description: cost.description || ''
    }));

    const { error } = await supabase
      .from('event_costs')
      .insert(costsData);

    if (error && error.code !== '42P01') { // Ignorer si table n'existe pas
      console.error('❌ [addCosts] Erreur:', error);
      throw error;
    }
  }

  // Ajouter les photos
  private static async addPhotos(eventId: string, photos: string[], uploadedBy: string) {
    const photosData = photos.map((url, index) => ({
      event_id: eventId,
      photo_url: url,
      caption: '',
      uploaded_by: uploadedBy,
      position: index
    }));

    const { error } = await supabase
      .from('event_photos')
      .insert(photosData);

    if (error && error.code !== '42P01') {
      console.error('❌ [addPhotos] Erreur:', error);
      throw error;
    }
  }

  // Ajouter le questionnaire
  private static async addQuestionnaire(eventId: string, questions: any[]) {
    const questionsData = questions.map((q, index) => ({
      event_id: eventId,
      question: q.text,
      type: q.type || 'text',
      options: q.options ? JSON.stringify(q.options) : null,
      is_required: q.required || false,
      position: index
    }));

    const { error } = await supabase
      .from('event_questionnaire')
      .insert(questionsData);

    if (error) {
      console.error('❌ [addQuestionnaire] Erreur:', error);
      throw error;
    }
  }

  // Ajouter les items à apporter
  private static async addItemsToBring(eventId: string, items: any[]) {
    console.log('🎁 [addItemsToBring] Items reçus:', items);
    
    // Gérer différents formats possibles avec TOUTES les colonnes nécessaires
    const itemsData = items.map((item, index) => ({
      event_id: eventId,
      // Les deux noms de colonnes pour la compatibilité
      item_name: typeof item === 'string' ? item : (item.name || 'Item'),
      name: typeof item === 'string' ? item : (item.name || 'Item'),
      // Les deux colonnes de quantité
      quantity_needed: typeof item === 'object' ? (item.quantity || 1) : 1,
      quantity: typeof item === 'object' ? (item.quantity || 1) : 1,
      quantity_assigned: 0,
      position: index,
      is_brought: false
    }));

    console.log('🎁 [addItemsToBring] Données formatées:', itemsData);

    const { error } = await supabase
      .from('event_items')
      .insert(itemsData);

    if (error) {
      console.error('❌ [addItemsToBring] Erreur:', error);
      throw error;
    }
  }

  // Ajouter la playlist
  private static async addPlaylist(eventId: string, playlist: any[], spotifyLink: string | null) {
    console.log('🎵 [addPlaylist] Playlist reçue:', playlist.length, 'chansons');
    
    // Créer une entrée de playlist principale
    const playlistData = {
      event_id: eventId,
      playlist_name: 'Event Playlist',
      spotify_link: spotifyLink,
      spotify_url: spotifyLink, // Pour la compatibilité
      apple_music_link: null,
      deezer_link: null,
      created_by: null,
      // Ajouter les champs de la première chanson si disponible
      song_title: playlist.length > 0 ? (playlist[0].title || playlist[0].name || 'Unknown') : 'Playlist',
      artist: playlist.length > 0 ? (playlist[0].artist || 'Unknown Artist') : '',
      position: 0
    };

    const { error } = await supabase
      .from('event_playlists')
      .insert([playlistData]);

    if (error) {
      console.error('❌ [addPlaylist] Erreur:', error);
      throw error;
    }

    // Si on a plus d'une chanson, ajouter les autres
    if (playlist.length > 1) {
      const songsData = playlist.slice(1).map((song, index) => ({
        event_id: eventId,
        song_title: song.title || song.name || 'Unknown',
        artist: song.artist || 'Unknown Artist',
        spotify_url: song.spotifyUrl || null,
        spotify_link: song.spotifyUrl || null,
        position: index + 1,
        playlist_name: 'Event Playlist',
        apple_music_link: null,
        deezer_link: null,
        created_by: null
      }));

      const { error: songsError } = await supabase
        .from('event_playlists')
        .insert(songsData);

      if (songsError) {
        console.error('❌ [addPlaylist] Erreur ajout chansons:', songsError);
      }
    }
  }

  // Ajouter les stickers
  private static async addStickers(eventId: string, stickers: any[]) {
    const stickersData = stickers.map((sticker, index) => ({
      event_id: eventId,
      sticker_emoji: sticker.emoji,
      position_x: sticker.x,
      position_y: sticker.y,
      scale: sticker.scale || 1,
      rotation: sticker.rotation || 0,
      z_index: index
    }));

    const { error } = await supabase
      .from('event_cover_stickers')
      .insert(stickersData);

    if (error && error.code !== '42P01') {
      console.error('❌ [addStickers] Erreur:', error);
      throw error;
    }
  }
}
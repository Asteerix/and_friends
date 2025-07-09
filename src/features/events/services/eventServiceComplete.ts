import { supabase } from '@/shared/lib/supabase/client';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

// Types pour la création d'événements
export interface CreateEventData {
  title: string;
  subtitle?: string;
  description?: string;
  date: Date;
  endDate?: Date;
  endTime?: Date;
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
  host?: {id: string, name: string, avatar?: string};
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
  dressCode?: string | null;
  eventTheme?: string | null;
  ageRestriction?: string;
  capacityLimit?: number;
  parkingInfo?: string;
  eventCategory?: string;
  accessibilityInfo?: string;
  eventWebsite?: string;
  contactInfo?: string;
  allowPlusOnes?: boolean;
  maxPlusOnes?: number;
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
      
      // Utiliser la date fournie pour start_time et end_time
      const startTime = new Date(eventData.date);
      const endTime = eventData.endTime || eventData.endDate || new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // Si pas de end_time, utiliser +3 heures par défaut
      
      // Préparer les données pour la table events
      // IMPORTANT: On n'inclut que les colonnes de base qui existent sûrement
      const eventToInsert: any = {
        // Colonnes de base qui existent sûrement
        title: eventData.title || eventData.coverData.eventTitle || 'Nouvel événement',
        description: eventData.description || '',
        date: startTime.toISOString(),
        location: eventData.locationDetails?.coordinates 
          ? `${eventData.locationDetails.coordinates.latitude},${eventData.locationDetails.coordinates.longitude}`
          : eventData.location || eventData.locationDetails?.address || '',
        is_private: eventData.isPrivate || false,
        created_by: user.id,
        host: eventData.host?.id || user.id,
        
        // Colonnes de temps (peuvent exister)
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        
        // Colonnes de couverture (peuvent exister)
        subtitle: eventData.subtitle || eventData.coverData.eventSubtitle || null,
        cover_bg_color: eventData.coverData.selectedBackground || null,
        cover_font: eventData.coverData.selectedTitleFont || null,
        cover_image: finalCoverImageUrl || null,
        image_url: finalCoverImageUrl || null,
        
        // Colonnes RSVP (peuvent exister)
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
        
        // Host info
        host: eventData.host || { id: user.id, name: 'Host' },
        
        // Co-hosts (fixed structure)
        co_organizers: eventData.coHosts || [],
        coHosts: eventData.coHosts || [],
        
        // Extras
        costs: eventData.costs || [],
        eventPhotos: eventData.eventPhotos || [],
        questionnaire: eventData.questionnaire || [],
        itemsToBring: eventData.itemsToBring || [],
        playlist: eventData.playlist || null,
        spotifyLink: eventData.spotifyLink || null,
        
        // TOUS les champs supplémentaires (au cas où les colonnes n'existent pas)
        dress_code: eventData.dressCode || null,
        event_theme: eventData.eventTheme || null,
        age_restriction: eventData.ageRestriction || null,
        capacity_limit: eventData.capacityLimit || null,
        parking_info: eventData.parkingInfo || null,
        event_category: eventData.eventCategory || null,
        accessibility_info: eventData.accessibilityInfo || null,
        event_website: eventData.eventWebsite || null,
        contact_info: eventData.contactInfo || null,
        allow_plus_ones: eventData.allowPlusOnes || false,
        max_plus_ones: eventData.maxPlusOnes || null,
        // event_tags removed - no longer exists
        
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
      console.log('  - Description:', eventToInsert.description || '(vide)');
      console.log('  - Date:', new Date(eventToInsert.date).toLocaleString());
      console.log('  - Location:', eventToInsert.location);
      console.log('  - Privé:', eventToInsert.is_private);
      console.log('  - Host:', eventToInsert.host);
      console.log('  - Co-hosts:', eventToInsert.extra_data.co_organizers?.length || 0);
      console.log('  - Extras dans extra_data:', Object.keys(eventToInsert.extra_data).length);
      console.log('');

      // 4. Insérer l'événement avec seulement les colonnes de base
      console.log('💾 [EventServiceComplete] Insertion dans Supabase...');
      
      // Créer un objet avec SEULEMENT les colonnes de BASE qui DOIVENT exister
      const safeEventToInsert = {
        title: eventToInsert.title,
        description: eventToInsert.description,
        date: eventToInsert.date,
        location: eventToInsert.location,
        is_private: eventToInsert.is_private,
        created_by: eventToInsert.created_by,
        extra_data: eventToInsert.extra_data,
      };
      
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert([safeEventToInsert])
        .select()
        .single();

      if (insertError) {
        console.error('❌ [EventServiceComplete] Erreur insertion:', insertError);
        console.error('  Code:', insertError.code);
        console.error('  Message:', insertError.message);
        console.error('  Détails:', insertError.details);
        
        // Si l'erreur concerne une colonne manquante, essayer avec la fonction RPC
        if (insertError.message?.includes('column') || insertError.code === 'PGRST204') {
          console.log('🔄 [EventServiceComplete] Tentative avec fonction RPC...');
          
          const { data: rpcResult, error: rpcError } = await supabase
            .rpc('create_event_safe', {
              p_title: safeEventToInsert.title,
              p_description: safeEventToInsert.description,
              p_date: safeEventToInsert.date,
              p_location: safeEventToInsert.location,
              p_is_private: safeEventToInsert.is_private,
              p_image_url: eventToInsert.image_url || null,
              p_subtitle: eventToInsert.subtitle || null,
              p_extra_data: safeEventToInsert.extra_data
            });
            
          if (rpcError) {
            console.error('❌ [EventServiceComplete] Erreur RPC:', rpcError);
            // Continuer avec le fallback existant
          } else if (rpcResult && rpcResult.length > 0) {
            console.log('✅ [EventServiceComplete] Événement créé via RPC!');
            // Récupérer l'événement complet
            const { data: fullEvent } = await supabase
              .from('events')
              .select('*')
              .eq('id', rpcResult[0].id)
              .single();
            
            if (fullEvent) {
              return { success: true, event: fullEvent };
            }
          }
        }
        
        // Si c'est une erreur de colonne manquante, on réessaie avec moins de colonnes
        if (insertError.code === '42703' || insertError.code === 'PGRST204' || insertError.message?.includes('column')) {
          console.log('🔄 [EventServiceComplete] Réessai avec colonnes de base uniquement...');
          
          // Créer un objet avec seulement les colonnes essentielles
          const baseEvent: any = {
            title: eventToInsert.title,
            description: eventToInsert.description,
            date: eventToInsert.date,
            location: eventToInsert.location,
            is_private: eventToInsert.is_private,
            created_by: eventToInsert.created_by,
          };
          
          // Ajouter les colonnes optionnelles une par une si elles existent
          const optionalFields = [
            'subtitle', 'cover_bg_color', 'cover_font', 'cover_image', 'image_url',
            'start_time', 'end_time', 'rsvp_deadline', 'rsvp_reminder_enabled', 
            'rsvp_reminder_timing', 'extra_data', 'location_details'
          ];
          
          for (const field of optionalFields) {
            if (eventToInsert[field] !== undefined) {
              baseEvent[field] = eventToInsert[field];
            }
          }
          
          // Stocker TOUTES les données supplémentaires dans extra_data
          baseEvent.extra_data = {
            ...eventToInsert.extra_data,
            // Ajouter tous les champs qui pourraient ne pas exister comme colonnes
            dress_code: eventData.dressCode,
            event_theme: eventData.eventTheme,
            age_restriction: eventData.ageRestriction,
            capacity_limit: eventData.capacityLimit,
            parking_info: eventData.parkingInfo,
            event_category: eventData.eventCategory,
            accessibility_info: eventData.accessibilityInfo,
            event_website: eventData.eventWebsite,
            contact_info: eventData.contactInfo,
            allow_plus_ones: eventData.allowPlusOnes,
            max_plus_ones: eventData.maxPlusOnes,
            // event_tags removed - no longer exists
          };
          
          const { data: retryEvent, error: retryError } = await supabase
            .from('events')
            .insert([baseEvent])
            .select()
            .single();
            
          if (retryError) {
            console.error('❌ [EventServiceComplete] Échec du réessai:', retryError);
            throw new Error('Impossible de créer l\'événement: ' + retryError.message);
          }
          
          console.log('✅ [EventServiceComplete] Événement créé avec colonnes de base');
          console.log('  ℹ️ Données supplémentaires stockées dans extra_data');
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
    console.log('📤 [uploadCoverImage] Début upload de l\'image de couverture');
    console.log('  URI:', imageUri.substring(0, 50) + '...');
    
    try {
      // Vérifier que le fichier existe
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      
      if (!fileInfo.exists) {
        console.error('❌ [uploadCoverImage] Le fichier n\'existe pas:', imageUri);
        throw new Error('Image de couverture introuvable');
      }
      
      console.log('📁 [uploadCoverImage] Info fichier:', {
        exists: fileInfo.exists,
        size: fileInfo.size,
      });

      if (fileInfo.size === 0) {
        console.error('❌ [uploadCoverImage] Le fichier est vide');
        throw new Error('Image de couverture vide');
      }

      // Compresser l'image pour optimiser la taille
      let uploadUri = imageUri;
      console.log('🗜️ [uploadCoverImage] Compression de l\'image...');
      
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 1080 } }], // Largeur max 1080px
          { 
            compress: 0.8, // Compression 80%
            format: ImageManipulator.SaveFormat.JPEG 
          }
        );
        
        uploadUri = manipResult.uri;
        
        const compressedInfo = await FileSystem.getInfoAsync(uploadUri);
        if (compressedInfo.exists && fileInfo.size) {
          console.log('✅ [uploadCoverImage] Image compressée:', {
            tailleOriginale: fileInfo.size,
            tailleCompressée: compressedInfo.size,
            reduction: `${Math.round((1 - (compressedInfo.size || 0) / fileInfo.size) * 100)}%`
          });
        }
      } catch (compressionError) {
        console.error('⚠️ [uploadCoverImage] Compression échouée, utilisation de l\'originale:', compressionError);
      }

      // Obtenir la session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Utilisateur non authentifié');
      }

      const fileName = `${userId}/${Date.now()}_cover.jpg`;
      const bucket = 'events';
      
      // Upload avec FileSystem.uploadAsync (méthode recommandée pour React Native)
      const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;
      
      console.log('⬆️ [uploadCoverImage] Upload vers Supabase...');
      console.log('  Bucket:', bucket);
      console.log('  FileName:', fileName);
      
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, uploadUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true' // Permettre l'écrasement si nécessaire
        },
      });

      console.log('📡 [uploadCoverImage] Réponse upload:', {
        status: uploadResult.status,
        body: uploadResult.body?.substring(0, 200)
      });

      if (uploadResult.status !== 200 && uploadResult.status !== 201) {
        console.error('❌ [uploadCoverImage] Upload échoué:', uploadResult.body);
        throw new Error(`Upload échoué avec status ${uploadResult.status}`);
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('✅ [uploadCoverImage] Upload réussi!');
      console.log('🔗 URL publique:', publicUrl);

      return publicUrl;
      
    } catch (error) {
      console.error('❌ [uploadCoverImage] Erreur complète:', error);
      throw error;
    }
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
    console.log('📸 [addPhotos] Upload de', photos.length, 'photos...');
    
    try {
      // Obtenir la session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Utilisateur non authentifié');
      }

      // Traiter chaque photo
      const uploadedPhotos = await Promise.all(
        photos.map(async (photoUri, index) => {
          // Si c'est déjà une URL HTTP, la garder telle quelle
          if (photoUri.startsWith('http')) {
            return { url: photoUri, position: index };
          }

          // Sinon, uploader le fichier local
          try {
            const fileInfo = await FileSystem.getInfoAsync(photoUri);
            
            if (!fileInfo.exists) {
              console.error(`❌ [addPhotos] Photo ${index} introuvable:`, photoUri);
              return null;
            }

            // Compresser l'image
            let uploadUri = photoUri;
            try {
              const manipResult = await ImageManipulator.manipulateAsync(
                photoUri,
                [{ resize: { width: 1080 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
              );
              uploadUri = manipResult.uri;
            } catch (e) {
              console.warn(`⚠️ [addPhotos] Compression échouée pour photo ${index}`);
            }

            const fileName = `${uploadedBy}/${Date.now()}_photo_${index}.jpg`;
            const bucket = 'events';
            const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;
            
            const uploadResult = await FileSystem.uploadAsync(uploadUrl, uploadUri, {
              httpMethod: 'POST',
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
                'Content-Type': 'image/jpeg',
                'x-upsert': 'true'
              },
            });

            if (uploadResult.status !== 200 && uploadResult.status !== 201) {
              console.error(`❌ [addPhotos] Upload échoué pour photo ${index}`);
              return null;
            }

            const { data: { publicUrl } } = supabase.storage
              .from(bucket)
              .getPublicUrl(fileName);

            console.log(`✅ [addPhotos] Photo ${index} uploadée:`, publicUrl);
            return { url: publicUrl, position: index };
            
          } catch (error) {
            console.error(`❌ [addPhotos] Erreur upload photo ${index}:`, error);
            return null;
          }
        })
      );

      // Filtrer les photos réussies
      const successfulPhotos = uploadedPhotos.filter(p => p !== null);
      
      if (successfulPhotos.length === 0) {
        console.warn('⚠️ [addPhotos] Aucune photo uploadée avec succès');
        return;
      }

      // Insérer les données des photos dans la base
      const photosData = successfulPhotos.map((photo) => ({
        event_id: eventId,
        photo_url: photo!.url,
        caption: '',
        uploaded_by: uploadedBy,
        position: photo!.position
      }));

      const { error } = await supabase
        .from('event_photos')
        .insert(photosData);

      if (error && error.code !== '42P01') {
        console.error('❌ [addPhotos] Erreur insertion BD:', error);
        throw error;
      }

      console.log(`✅ [addPhotos] ${successfulPhotos.length} photos ajoutées avec succès`);
      
    } catch (error) {
      console.error('❌ [addPhotos] Erreur générale:', error);
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

  // Méthode pour récupérer un événement par son ID
  static async getEvent(eventId: string) {
    try {
      console.log('📋 [EventServiceComplete] Récupération de l\'événement:', eventId);

      // Récupérer l'événement avec toutes ses relations
      const { data: event, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!events_created_by_fkey(
            id,
            full_name,
            username,
            avatar_url
          ),
          event_costs(
            id,
            amount,
            currency,
            description,
            is_required,
            position
          ),
          event_items(
            id,
            name,
            item_name,
            quantity,
            quantity_needed,
            quantity_assigned,
            position,
            is_brought
          ),
          event_questionnaire(
            id,
            question_text,
            question_type,
            position,
            is_required,
            question_options
          ),
          event_playlists(
            id,
            song_title,
            artist,
            spotify_url,
            spotify_link,
            position,
            playlist_name
          ),
          event_cohosts(
            id,
            user_id,
            status,
            permissions,
            user:profiles!event_cohosts_user_id_fkey(
              id,
              full_name,
              username,
              avatar_url
            )
          ),
          event_photos(
            id,
            photo_url,
            caption,
            uploaded_by,
            position
          ),
          event_cover_stickers(
            id,
            sticker_emoji,
            position_x,
            position_y,
            scale,
            rotation,
            z_index
          )
        `)
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('❌ [EventServiceComplete] Erreur lors de la récupération:', error);
        return { success: false, error: error.message };
      }

      if (!event) {
        console.error('❌ [EventServiceComplete] Événement non trouvé');
        return { success: false, error: 'Event not found' };
      }

      console.log('✅ [EventServiceComplete] Événement récupéré avec succès');
      return { success: true, event };

    } catch (error) {
      console.error('💥 [EventServiceComplete] Erreur inattendue:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
import { supabase } from '@/shared/lib/supabase/client';

// Types pour les événements
export interface EventCoverData {
  eventTitle: string;
  eventSubtitle: string;
  selectedTitleFont: string;
  selectedSubtitleFont: string;
  selectedBackground: string;
  coverImage: string;
  uploadedImage: string;
  placedStickers: any[];
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

export class EventServiceV2 {
  static async createEvent(eventData: CreateEventData) {
    console.log('🚀 [EventServiceV2] ============================================');
    console.log('🚀 [EventServiceV2] DÉBUT CRÉATION ÉVÉNEMENT - SERVICE V2');
    console.log('🚀 [EventServiceV2] ============================================');
    console.log('🕰️ [EventServiceV2] Timestamp:', new Date().toISOString());
    console.log('📋 [EventServiceV2] Données complètes reçues:');
    console.log(JSON.stringify({
      '1_BASE': {
        title: eventData.title || '[VIDE]',
        subtitle: eventData.subtitle || '[VIDE]',
        description: eventData.description || '[VIDE]',
        date: eventData.date.toISOString(),
        location: eventData.location || '[VIDE]',
        isPrivate: eventData.isPrivate
      },
      '2_LOCATION_DETAILS': eventData.locationDetails ? {
        name: eventData.locationDetails.name,
        address: eventData.locationDetails.address,
        city: eventData.locationDetails.city,
        postalCode: eventData.locationDetails.postalCode,
        country: eventData.locationDetails.country,
        hasCoordinates: !!eventData.locationDetails.coordinates
      } : '[AUCUNE]',
      '3_COVER': {
        eventTitle: eventData.coverData.eventTitle || '[VIDE]',
        eventSubtitle: eventData.coverData.eventSubtitle || '[VIDE]',
        titleFont: eventData.coverData.selectedTitleFont || '[DEFAULT]',
        subtitleFont: eventData.coverData.selectedSubtitleFont || '[DEFAULT]',
        background: eventData.coverData.selectedBackground || '[AUCUN]',
        hasUploadedImage: !!eventData.coverData.uploadedImage,
        hasCoverImage: !!eventData.coverData.coverImage,
        stickersCount: eventData.coverData.placedStickers?.length || 0,
        hasTemplate: !!eventData.coverData.selectedTemplate
      },
      '4_EXTRAS': {
        coHostsCount: eventData.coHosts?.length || 0,
        costsCount: eventData.costs?.length || 0,
        photosCount: eventData.eventPhotos?.length || 0,
        questionnaireCount: eventData.questionnaire?.length || 0,
        itemsToBringCount: eventData.itemsToBring?.length || 0,
        hasRsvpDeadline: !!eventData.rsvpDeadline,
        hasPlaylist: !!eventData.playlist || !!eventData.spotifyLink
      }
    }, null, 2));

    try {
      // 1. Obtenir l'utilisateur actuel
      console.log('🔐 [EventServiceV2] Vérification de l\'authentification...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ [EventServiceV2] Erreur auth:', userError);
        throw new Error(`Erreur d'authentification: ${userError.message}`);
      }
      
      if (!user) {
        console.error('❌ [EventServiceV2] Aucun utilisateur connecté');
        throw new Error('Vous devez être connecté pour créer un événement');
      }
      
      console.log('✅ [EventServiceV2] Utilisateur authentifié:', user.id);
      console.log('📧 [EventServiceV2] Email utilisateur:', user.email);

      // 2. Upload de l'image de couverture si nécessaire
      let coverImageUrl = eventData.coverData.coverImage;
      if (eventData.coverData.uploadedImage && eventData.coverData.uploadedImage.startsWith('file://')) {
        console.log('📸 [EventServiceV2] Image locale détectée, upload nécessaire');
        console.log('📸 [EventServiceV2] URI:', eventData.coverData.uploadedImage.substring(0, 100) + '...');
        try {
          coverImageUrl = await this.uploadCoverImage(eventData.coverData.uploadedImage, user.id);
          console.log('✅ [EventServiceV2] Image uploadée avec succès');
          console.log('🔗 [EventServiceV2] URL publique:', coverImageUrl);
        } catch (uploadError) {
          console.error('❌ [EventServiceV2] Erreur upload image:', uploadError);
          console.error('❌ [EventServiceV2] Détails:', {
            message: uploadError instanceof Error ? uploadError.message : String(uploadError),
            type: uploadError instanceof Error ? uploadError.constructor.name : typeof uploadError
          });
          // On continue sans l'image plutôt que de faire échouer toute la création
          console.warn('⚠️ [EventServiceV2] Continuer sans image uploadée');
          console.warn('⚠️ [EventServiceV2] Utilisation de l\'URL existante ou pas d\'image');
        }
      } else if (coverImageUrl) {
        console.log('🔗 [EventServiceV2] Utilisation de l\'URL d\'image existante:', coverImageUrl);
      } else {
        console.log('🎨 [EventServiceV2] Pas d\'image de couverture');
      }

      // 3. Préparer les données pour l'insertion dans la table principale
      console.log('📝 [EventServiceV2] Préparation des données pour Supabase...');
      
      // Déterminer le titre final
      const finalTitle = eventData.title || eventData.coverData.eventTitle || 'Nouvel événement';
      const finalSubtitle = eventData.subtitle || eventData.coverData.eventSubtitle || '';
      
      console.log('📖 [EventServiceV2] Titre final:', finalTitle);
      console.log('📖 [EventServiceV2] Sous-titre final:', finalSubtitle || '[Aucun]');
      
      // Préparer l'objet en fonction du schéma actuel de la table events
      const eventToInsert: any = {
        // Champs de base (migration 20250601000100)
        title: finalTitle,
        description: eventData.description || '',
        date: eventData.date.toISOString(),
        location: eventData.location || eventData.locationDetails?.address || '',
        image_url: coverImageUrl || null,
        tags: [],
        is_private: eventData.isPrivate || false,
        created_by: user.id,
        
        // Champs ajoutés par migration 20250524032402
        cover_bg_color: eventData.coverData.selectedBackground || null,
        cover_font: eventData.coverData.selectedTitleFont || null,
        cover_image: coverImageUrl || null,
        subtitle: finalSubtitle
      };
      
      // Préparer extra_data pour stocker toutes les données supplémentaires
      const extraData = {
        // Données de timing
        start_time: eventData.date.toISOString(),
        end_time: new Date(eventData.date.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        
        // Données de localisation détaillées
        locationDetails: eventData.locationDetails || null,
        
        // Données de couverture complètes
        coverData: {
          ...eventData.coverData,
          uploadedImage: null, // Ne pas stocker l'URI locale
          finalCoverUrl: coverImageUrl
        },
        
        // RSVP
        rsvpDeadline: eventData.rsvpDeadline?.toISOString() || null,
        rsvpReminderEnabled: eventData.rsvpReminderEnabled || false,
        rsvpReminderTiming: eventData.rsvpReminderTiming || null,
        
        // Références aux extras (seront stockés dans des tables séparées si elles existent)
        coHosts: eventData.coHosts || [],
        costs: eventData.costs || [],
        questionnaire: eventData.questionnaire || [],
        itemsToBring: eventData.itemsToBring || [],
        playlist: eventData.playlist || null,
        spotifyLink: eventData.spotifyLink || null,
        
        // Métadonnées
        createdAt: new Date().toISOString(),
        version: 'v2'
      };
      
      // Ajouter extra_data si la colonne existe
      eventToInsert.extra_data = extraData;
      
      console.log('📊 [EventServiceV2] Structure de l\'objet à insérer:');
      console.log('  - Champs de base:', Object.keys(eventToInsert).filter(k => k !== 'extra_data').join(', '));
      console.log('  - Extra data keys:', Object.keys(extraData).join(', '));
      console.log('  - Taille totale:', JSON.stringify(eventToInsert).length, 'caractères');

      console.log('📝 [EventServiceV2] Aperçu des données (tronqué):');
      const preview = JSON.stringify(eventToInsert, null, 2);
      console.log(preview.substring(0, 1000) + (preview.length > 1000 ? '...[TRONQUÉ]' : ''));

      // 4. Insérer l'événement principal
      console.log('💾 [EventServiceV2] ====== INSERTION DANS SUPABASE ======');
      console.log('💾 [EventServiceV2] Table cible: events');
      console.log('💾 [EventServiceV2] Tentative d\'insertion...');
      
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert([eventToInsert])
        .select()
        .single();

      if (insertError) {
        console.error('❌ [EventServiceV2] ====== ERREUR SQL ======');
        console.error('❌ [EventServiceV2] Code:', insertError.code);
        console.error('❌ [EventServiceV2] Message:', insertError.message);
        console.error('❌ [EventServiceV2] Détails:', insertError.details);
        console.error('❌ [EventServiceV2] Hint:', insertError.hint);
        
        // Analyser le type d'erreur pour donner plus d'infos
        if (insertError.code === '42703') {
          console.error('❌ [EventServiceV2] COLONNE INEXISTANTE!');
          console.error('❌ [EventServiceV2] Vérifiez que toutes les colonnes existent dans la table events');
          console.error('❌ [EventServiceV2] Colonnes utilisées:', Object.keys(eventToInsert).join(', '));
        } else if (insertError.code === '23502') {
          console.error('❌ [EventServiceV2] VALEUR NULL NON AUTORISÉE!');
          console.error('❌ [EventServiceV2] Une colonne requise est manquante');
        } else if (insertError.code === '23503') {
          console.error('❌ [EventServiceV2] VIOLATION DE CLÉ ÉTRANGÈRE!');
          console.error('❌ [EventServiceV2] Vérifiez que created_by existe dans profiles');
        }
        
        throw new Error(`Erreur Supabase (${insertError.code}): ${insertError.message}`);
      }

      if (!newEvent) {
        console.error('❌ [EventServiceV2] Aucun événement retourné après insertion');
        throw new Error('Erreur: aucun événement créé');
      }

      console.log('✅ [EventServiceV2] ====== SUCCÈS INSERTION ======');
      console.log('🎯 [EventServiceV2] ID généré:', newEvent.id);
      console.log('📝 [EventServiceV2] Titre:', newEvent.title);
      console.log('📅 [EventServiceV2] Date événement:', newEvent.date);
      console.log('🕒 [EventServiceV2] Créé à:', newEvent.created_at);
      console.log('💾 [EventServiceV2] Données retournées:', Object.keys(newEvent).join(', '));

      // 5. Ajouter le créateur comme participant
      console.log('👤 [EventServiceV2] Ajout du créateur comme participant...');
      console.log('👤 [EventServiceV2] Table: event_participants');
      
      const participantData: any = {
        event_id: newEvent.id,
        user_id: user.id,
        status: 'going'
      };
      
      // Vérifier si on peut ajouter event_created_by (peut-être ajouté par une migration)
      participantData.event_created_by = user.id;
      
      console.log('👤 [EventServiceV2] Données participant:', participantData);
      
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert([participantData]);

      if (participantError) {
        console.error('⚠️ [EventServiceV2] Erreur ajout participant!');
        console.error('⚠️ [EventServiceV2] Code:', participantError.code);
        console.error('⚠️ [EventServiceV2] Message:', participantError.message);
        
        if (participantError.code === '42703') {
          console.warn('⚠️ [EventServiceV2] Colonne manquante, réessai sans event_created_by...');
          delete participantData.event_created_by;
          
          const { error: retryError } = await supabase
            .from('event_participants')
            .insert([participantData]);
            
          if (retryError) {
            console.error('⚠️ [EventServiceV2] Échec du réessai:', retryError.message);
          } else {
            console.log('✅ [EventServiceV2] Participant ajouté après réessai');
          }
        }
      } else {
        console.log('✅ [EventServiceV2] Créateur ajouté comme participant');
      }

      // 6. Gérer tous les extras en parallèle pour optimiser les performances
      console.log('🎯 [EventServiceV2] ====== TRAITEMENT DES EXTRAS ======');
      const extrasPromises = [];
      const extrasStatus: Record<string, string> = {};

      // 6.1 Co-hosts
      if (eventData.coHosts && eventData.coHosts.length > 0) {
        console.log(`👥 [EventServiceV2] ${eventData.coHosts.length} co-hosts à ajouter`);
        eventData.coHosts.forEach((ch, i) => {
          console.log(`  👤 Co-host ${i + 1}: ${ch.name} (${ch.id})`);
        });
        
        extrasPromises.push(
          this.addCoHosts(newEvent.id, eventData.coHosts, user.id)
            .then(() => {
              extrasStatus.coHosts = 'SUCCESS';
              console.log('✅ [EventServiceV2] Co-hosts ajoutés avec succès');
            })
            .catch(err => {
              extrasStatus.coHosts = 'FAILED';
              console.error('❌ [EventServiceV2] Échec ajout co-hosts:', err.message);
            })
        );
      }

      // 6.2 Costs
      if (eventData.costs && eventData.costs.length > 0) {
        console.log(`💰 [EventServiceV2] ${eventData.costs.length} coûts à ajouter`);
        eventData.costs.forEach((cost, i) => {
          console.log(`  💵 Coût ${i + 1}: ${cost.amount} ${cost.currency} - ${cost.description}`);
        });
        
        extrasPromises.push(
          this.addCosts(newEvent.id, eventData.costs)
            .then(() => {
              extrasStatus.costs = 'SUCCESS';
              console.log('✅ [EventServiceV2] Coûts ajoutés avec succès');
            })
            .catch(err => {
              extrasStatus.costs = 'FAILED';
              console.error('❌ [EventServiceV2] Échec ajout coûts:', err.message);
              console.warn('⚠️ [EventServiceV2] La table event_costs n\'existe peut-être pas');
            })
        );
      }

      // 6.3 Photos
      if (eventData.eventPhotos && eventData.eventPhotos.length > 0) {
        console.log(`📷 [EventServiceV2] ${eventData.eventPhotos.length} photos à uploader`);
        
        extrasPromises.push(
          this.uploadEventPhotos(newEvent.id, eventData.eventPhotos)
            .then(() => {
              extrasStatus.photos = 'SUCCESS';
              console.log('✅ [EventServiceV2] Photos uploadées avec succès');
            })
            .catch(err => {
              extrasStatus.photos = 'FAILED';
              console.error('❌ [EventServiceV2] Échec upload photos:', err.message);
            })
        );
      }

      // 6.4 Questionnaire
      if (eventData.questionnaire && eventData.questionnaire.length > 0) {
        console.log(`📋 [EventServiceV2] ${eventData.questionnaire.length} questions à ajouter`);
        eventData.questionnaire.forEach((q, i) => {
          console.log(`  ❓ Question ${i + 1}: ${q.text} (${q.type})`);
        });
        
        extrasPromises.push(
          this.addQuestionnaire(newEvent.id, eventData.questionnaire)
            .then(() => {
              extrasStatus.questionnaire = 'SUCCESS';
              console.log('✅ [EventServiceV2] Questionnaire ajouté avec succès');
            })
            .catch(err => {
              extrasStatus.questionnaire = 'FAILED';
              console.error('❌ [EventServiceV2] Échec ajout questionnaire:', err.message);
              console.warn('⚠️ [EventServiceV2] La table event_questionnaire n\'existe peut-être pas');
            })
        );
      }

      // 6.5 Items to bring
      if (eventData.itemsToBring && eventData.itemsToBring.length > 0) {
        console.log(`🎁 [EventServiceV2] ${eventData.itemsToBring.length} items à apporter`);
        eventData.itemsToBring.forEach((item, i) => {
          console.log(`  📦 Item ${i + 1}: ${item}`);
        });
        
        extrasPromises.push(
          this.addItemsToBring(newEvent.id, eventData.itemsToBring)
            .then(() => {
              extrasStatus.itemsToBring = 'SUCCESS';
              console.log('✅ [EventServiceV2] Items ajoutés avec succès');
            })
            .catch(err => {
              extrasStatus.itemsToBring = 'FAILED';
              console.error('❌ [EventServiceV2] Échec ajout items:', err.message);
              console.warn('⚠️ [EventServiceV2] La table event_items_to_bring n\'existe peut-être pas');
            })
        );
      }

      // 6.6 Playlist
      if (eventData.playlist || eventData.spotifyLink) {
        console.log('🎵 [EventServiceV2] Playlist à ajouter');
        if (eventData.spotifyLink) {
          console.log('  🎵 Lien Spotify:', eventData.spotifyLink);
        }
        
        extrasPromises.push(
          this.addPlaylist(newEvent.id, eventData.playlist, eventData.spotifyLink)
            .then(() => {
              extrasStatus.playlist = 'SUCCESS';
              console.log('✅ [EventServiceV2] Playlist ajoutée avec succès');
            })
            .catch(err => {
              extrasStatus.playlist = 'FAILED';
              console.error('❌ [EventServiceV2] Échec ajout playlist:', err.message);
              console.warn('⚠️ [EventServiceV2] La table event_playlists n\'existe peut-être pas');
            })
        );
      }

      // Attendre que tous les extras soient traités
      if (extrasPromises.length > 0) {
        console.log(`⏳ [EventServiceV2] Traitement de ${extrasPromises.length} extras en parallèle...`);
        await Promise.all(extrasPromises);
        
        console.log('📋 [EventServiceV2] ====== RÉSULTAT DES EXTRAS ======');
        Object.entries(extrasStatus).forEach(([key, status]) => {
          const icon = status === 'SUCCESS' ? '✅' : '❌';
          console.log(`  ${icon} ${key}: ${status}`);
        });
        
        const successCount = Object.values(extrasStatus).filter(s => s === 'SUCCESS').length;
        const failCount = Object.values(extrasStatus).filter(s => s === 'FAILED').length;
        console.log(`📋 [EventServiceV2] Bilan: ${successCount} réussis, ${failCount} échoués`);
      } else {
        console.log('📄 [EventServiceV2] Aucun extra à traiter');
      }

      console.log('🎉 [EventServiceV2] ============================================');
      console.log('🎉 [EventServiceV2] CRÉATION TERMINÉE AVEC SUCCÈS!');
      console.log('🎉 [EventServiceV2] ============================================');
      console.log('🎆 [EventServiceV2] Récapitulatif de l\'événement créé:');
      console.log('  🆔 ID:', newEvent.id);
      console.log('  📝 Titre:', newEvent.title);
      console.log('  📅 Date:', new Date(newEvent.date).toLocaleString());
      console.log('  📍 Lieu:', newEvent.location || 'Non spécifié');
      console.log('  🔒 Privé:', newEvent.is_private ? 'Oui' : 'Non');
      console.log('  🎨 Image:', newEvent.image_url ? 'Oui' : 'Non');
      console.log('  🎯 Extras configurés:', Object.keys(extrasStatus).join(', ') || 'Aucun');
      console.log('🎉 [EventServiceV2] ============================================');
      
      return { success: true, event: newEvent };

    } catch (error) {
      console.error('💥 [EventServiceV2] ============================================');
      console.error('💥 [EventServiceV2] ERREUR FATALE LORS DE LA CRÉATION');
      console.error('💥 [EventServiceV2] ============================================');
      console.error('💥 [EventServiceV2] Timestamp:', new Date().toISOString());
      console.error('💥 [EventServiceV2] Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('💥 [EventServiceV2] Message:', error instanceof Error ? error.message : String(error));
      
      if (error instanceof Error && error.stack) {
        console.error('💥 [EventServiceV2] Stack trace:');
        const stackLines = error.stack.split('\n').slice(0, 10);
        stackLines.forEach(line => console.error('  ', line));
      }
      
      console.error('💥 [EventServiceV2] ============================================');
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Une erreur inconnue est survenue lors de la création de l\'événement');
      }
    }
  }

  // Méthodes auxiliaires pour les extras

  static async uploadCoverImage(imageUri: string, userId: string): Promise<string> {
    console.log('📤 [V2.uploadCoverImage] ====== DÉBUT UPLOAD IMAGE ======');
    console.log('📤 [V2.uploadCoverImage] URI:', imageUri.substring(0, 100) + '...');
    console.log('📤 [V2.uploadCoverImage] User ID:', userId);
    
    try {
      // Utiliser le bucket 'events' qui existe selon les migrations
      const bucketName = 'events';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileName = `${userId}/covers/${timestamp}-${randomId}.jpg`;
      console.log('📤 [V2.uploadCoverImage] Bucket:', bucketName);
      console.log('📤 [V2.uploadCoverImage] Chemin:', fileName);
      
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Erreur fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('📤 [EventServiceV2.uploadCoverImage] Taille du blob:', blob.size, 'bytes');
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: true,
          cacheControl: '3600'
        });

      if (error) {
        console.error('❌ [V2.uploadCoverImage] Erreur Supabase Storage!');
        console.error('❌ [V2.uploadCoverImage] Message:', error.message);
        console.error('❌ [V2.uploadCoverImage] Name:', error.name);
        
        if (error.message?.includes('not found')) {
          console.error('❌ [V2.uploadCoverImage] Le bucket "' + bucketName + '" n\'existe pas!');
          console.log('💡 [V2.uploadCoverImage] Créez le bucket dans Supabase Dashboard');
        }
        
        throw new Error(`Upload échoué: ${error.message}`);
      }

      console.log('✅ [V2.uploadCoverImage] Upload réussi!');
      console.log('📁 [V2.uploadCoverImage] Path:', data.path);

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log('✅ [V2.uploadCoverImage] ====== UPLOAD TERMINÉ ======');
      console.log('🔗 [V2.uploadCoverImage] URL publique:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ [V2.uploadCoverImage] ====== ERREUR UPLOAD ======');
      console.error('❌ [V2.uploadCoverImage] Erreur:', error);
      console.error('❌ [V2.uploadCoverImage] Type:', error instanceof Error ? error.constructor.name : typeof error);
      throw error;
    }
  }

  static async addCoHosts(eventId: string, coHosts: any[], createdBy: string) {
    console.log(`👥 [V2.addCoHosts] Tentative d'ajout de ${coHosts.length} co-hosts`);
    
    try {
      const coHostsToAdd = coHosts.map((coHost, index) => {
        console.log(`  👤 Co-host ${index + 1}: ${coHost.name} (${coHost.id})`);
        
        const participant: any = {
          event_id: eventId,
          user_id: coHost.id,
          status: 'going'
        };
        
        // Ajouter event_created_by si la colonne existe
        participant.event_created_by = createdBy;
        
        return participant;
      });

      console.log('👥 [V2.addCoHosts] Insertion dans event_participants...');
      const { error } = await supabase
        .from('event_participants')
        .insert(coHostsToAdd);

      if (error) {
        console.error('❌ [V2.addCoHosts] Erreur SQL:', error.code, error.message);
        
        if (error.code === '42703') {
          console.warn('⚠️ [V2.addCoHosts] Colonne manquante, réessai sans event_created_by');
          
          const retry = coHostsToAdd.map(ch => ({
            event_id: ch.event_id,
            user_id: ch.user_id,
            status: ch.status
          }));
          
          const { error: retryError } = await supabase
            .from('event_participants')
            .insert(retry);
            
          if (retryError) {
            throw retryError;
          }
          
          console.log('✅ [V2.addCoHosts] Co-hosts ajoutés après réessai');
          return;
        }
        
        throw error;
      }
      
      console.log('✅ [V2.addCoHosts] Co-hosts ajoutés avec succès');
    } catch (error) {
      console.error('❌ [V2.addCoHosts] Erreur fatale:', error);
      throw error;
    }
  }

  static async addCosts(eventId: string, costs: EventCost[]) {
    console.log(`💰 [V2.addCosts] Tentative d'ajout de ${costs.length} coûts`);
    console.warn('⚠️ [V2.addCosts] Note: La table event_costs n\'existe peut-être pas encore');
    
    try {
      const costsToAdd = costs.map((cost, index) => {
        console.log(`  💵 Coût ${index + 1}: ${cost.amount} ${cost.currency} - ${cost.description}`);
        return {
          event_id: eventId,
          amount: parseFloat(cost.amount),
          currency: cost.currency,
          description: cost.description
        };
      });

      const { error } = await supabase
        .from('event_costs')
        .insert(costsToAdd);

      if (error) {
        console.error('❌ [V2.addCosts] Erreur:', error.code, error.message);
        
        if (error.code === '42P01') {
          console.error('❌ [V2.addCosts] La table event_costs n\'existe pas!');
          console.log('💡 [V2.addCosts] Créez la table avec cette structure:');
          console.log('  CREATE TABLE event_costs (');
          console.log('    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
          console.log('    event_id UUID REFERENCES events(id) ON DELETE CASCADE,');
          console.log('    amount DECIMAL(10,2),');
          console.log('    currency VARCHAR(3),');
          console.log('    description TEXT,');
          console.log('    created_at TIMESTAMPTZ DEFAULT NOW()');
          console.log('  );');
        }
        
        throw error;
      }
      
      console.log('✅ [V2.addCosts] Coûts ajoutés avec succès');
    } catch (error) {
      console.error('❌ [V2.addCosts] Échec de l\'ajout des coûts');
      throw error;
    }
  }

  static async uploadEventPhotos(eventId: string, photos: string[]) {
    console.log(`📷 [EventServiceV2.uploadEventPhotos] Upload de ${photos.length} photos...`);
    
    const photosToAdd = [];
    
    for (const [index, photoUri] of photos.entries()) {
      try {
        console.log(`📸 [EventServiceV2.uploadEventPhotos] Upload photo ${index + 1}/${photos.length}`);
        
        const fileName = `event-photos/${eventId}/${Date.now()}-${index}.jpg`;
        const response = await fetch(photoUri);
        const blob = await response.blob();
        
        const { error } = await supabase.storage
          .from('event-images')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (error) {
          console.error(`❌ [EventServiceV2.uploadEventPhotos] Erreur photo ${index + 1}:`, error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        photosToAdd.push({
          event_id: eventId,
          photo_url: publicUrl,
          position: index
        });
        
        console.log(`✅ [EventServiceV2.uploadEventPhotos] Photo ${index + 1} uploadée`);
      } catch (error) {
        console.error(`❌ [EventServiceV2.uploadEventPhotos] Erreur photo ${index + 1}:`, error);
      }
    }

    if (photosToAdd.length > 0) {
      const { error } = await supabase
        .from('event_photos')
        .insert(photosToAdd);

      if (error) {
        console.error('❌ [EventServiceV2.uploadEventPhotos] Erreur insertion:', error);
        throw error;
      }
    }
  }

  static async addQuestionnaire(eventId: string, questions: EventQuestionnaire[]) {
    console.log(`📋 [EventServiceV2.addQuestionnaire] Ajout de ${questions.length} questions...`);
    
    const questionsToAdd = questions.map((question, index) => {
      console.log(`❓ [EventServiceV2.addQuestionnaire] Question ${index + 1}:`, question.text);
      return {
        event_id: eventId,
        question: question.text,
        question_type: question.type || 'text',
        position: index
      };
    });

    const { error } = await supabase
      .from('event_questionnaire')
      .insert(questionsToAdd);

    if (error) {
      console.error('❌ [EventServiceV2.addQuestionnaire] Erreur:', error);
      throw error;
    }
  }

  static async addItemsToBring(eventId: string, items: string[]) {
    console.log(`🎁 [EventServiceV2.addItemsToBring] Ajout de ${items.length} items...`);
    
    const itemsToAdd = items.map((item, index) => {
      console.log(`📦 [EventServiceV2.addItemsToBring] Item ${index + 1}:`, item);
      return {
        event_id: eventId,
        item_name: item
      };
    });

    const { error } = await supabase
      .from('event_items_to_bring')
      .insert(itemsToAdd);

    if (error) {
      console.error('❌ [EventServiceV2.addItemsToBring] Erreur:', error);
      throw error;
    }
  }

  static async addPlaylist(eventId: string, playlist: any, spotifyLink?: string) {
    console.log('🎵 [EventServiceV2.addPlaylist] Ajout playlist...');
    console.log('🔗 [EventServiceV2.addPlaylist] Spotify link:', spotifyLink);
    
    const { error } = await supabase
      .from('event_playlists')
      .insert([{
        event_id: eventId,
        playlist_name: playlist?.name || 'Event Playlist',
        spotify_link: spotifyLink,
        songs: playlist?.songs || []
      }]);

    if (error) {
      console.error('❌ [EventServiceV2.addPlaylist] Erreur:', error);
      throw error;
    }
  }
}
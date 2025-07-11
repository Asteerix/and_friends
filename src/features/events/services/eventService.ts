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

export class EventService {
  static async createEvent(eventData: CreateEventData) {
    console.log('🚀 [EventService] Début de la création d\'événement avec les données:', {
      title: eventData.title,
      subtitle: eventData.subtitle,
      date: eventData.date,
      location: eventData.location,
      isPrivate: eventData.isPrivate,
      hasCoHosts: eventData.coHosts?.length || 0,
      hasCosts: eventData.costs?.length || 0,
      hasPhotos: eventData.eventPhotos?.length || 0,
      hasQuestionnaire: eventData.questionnaire?.length || 0,
      hasRsvpDeadline: !!eventData.rsvpDeadline,
      coverData: eventData.coverData
    });

    try {
      // 1. Obtenir l'utilisateur actuel
      console.log('🔐 [EventService] Récupération de l\'utilisateur authentifié...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ [EventService] Erreur lors de l\'obtention de l\'utilisateur:', userError);
        throw new Error('Utilisateur non authentifié');
      }
      console.log('✅ [EventService] Utilisateur authentifié:', user.id);

      // 2. Upload de l'image de couverture si nécessaire
      let coverImageUrl = null;
      if (eventData.coverData.uploadedImage) {
        console.log('📸 [EventService] Upload de l\'image de couverture...');
        console.log('📸 [EventService] URI de l\'image:', eventData.coverData.uploadedImage);
        coverImageUrl = await this.uploadCoverImage(eventData.coverData.uploadedImage, user.id);
        console.log('✅ [EventService] Image uploadée avec succès:', coverImageUrl);
      }

      // 3. Préparer la localisation pour PostGIS si elle existe
      if (eventData.locationDetails?.coordinates) {
        // PostGIS ne semble pas être activé, on stockera les coordonnées différemment
        console.log('📍 [EventService] Coordonnées de localisation:', eventData.locationDetails.coordinates);
      }

      // 4. Préparer les co-organizers
      const coOrganizerIds = eventData.coHosts?.map(coHost => coHost.id) || [];
      console.log('👥 [EventService] Co-organisateurs IDs:', coOrganizerIds);

      // 5. Préparer les données complètes de couverture
      const fullCoverData = {
        ...eventData.coverData,
        coverImageUrl: coverImageUrl || eventData.coverData.coverImage,
        eventPhotos: eventData.eventPhotos || [],
      };
      console.log('🎨 [EventService] Données de couverture complètes:', fullCoverData);

      // 6. Convertir les coûts en prix si nécessaire
      let eventPrice = null;
      let eventCurrency = 'EUR';
      if (eventData.costs && eventData.costs.length > 0 && eventData.costs[0]) {
        // Prendre le premier coût comme prix principal
        const mainCost = eventData.costs[0];
        eventPrice = parseFloat(mainCost.amount);
        eventCurrency = mainCost.currency || 'EUR';
        console.log('💰 [EventService] Prix de l\'événement:', eventPrice, eventCurrency);
      }

      // 7. Préparer what_to_bring
      const whatToBring = eventData.itemsToBring || [];
      console.log('🎒 [EventService] Items à apporter:', whatToBring);

      // 8. Définir les dates
      const startTime = eventData.date;
      const endTime = new Date(eventData.date);
      endTime.setHours(endTime.getHours() + 3); // Par défaut, 3h de durée
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('⏰ [EventService] Dates:', { startTime, endTime, timezone });

      // 9. Préparer les données pour l'insertion dans la table events actuelle
      // Structure basée sur la migration 20250601000100_create_core_tables.sql
      const eventToInsert: any = {
        title: eventData.title || eventData.coverData.eventTitle || 'Nouvel événement',
        subtitle: eventData.subtitle || eventData.coverData.eventSubtitle,
        description: eventData.description,
        date: startTime.toISOString(),
        location: eventData.locationDetails?.address || eventData.location,
        image_url: coverImageUrl || eventData.coverData.coverImage,
        tags: [], // À implémenter plus tard
        is_private: eventData.isPrivate,
        created_by: user.id,
        // Colonnes ajoutées par migration 20250524032402
        cover_bg_color: eventData.coverData.selectedBackground,
        cover_font: eventData.coverData.selectedTitleFont,
        cover_image: coverImageUrl || eventData.coverData.coverImage,
      };
      
      // Ajouter la colonne extra_data si elle existe (semble être utilisée dans le code existant)
      // Stocker toutes les données supplémentaires ici
      const extraData = {
        coverData: fullCoverData,
        locationDetails: eventData.locationDetails,
        coHosts: eventData.coHosts,
        costs: eventData.costs,
        eventPhotos: eventData.eventPhotos,
        rsvpDeadline: eventData.rsvpDeadline,
        rsvpReminderEnabled: eventData.rsvpReminderEnabled,
        rsvpReminderTiming: eventData.rsvpReminderTiming,
        questionnaire: eventData.questionnaire,
        itemsToBring: eventData.itemsToBring,
        playlist: eventData.playlist,
        spotifyLink: eventData.spotifyLink,
        timezone: timezone,
        endTime: endTime.toISOString(),
        whatToBring: whatToBring,
        price: eventPrice,
        currency: eventCurrency,
        paymentRequired: eventPrice ? true : false,
      };
      
      // Vérifier si la colonne extra_data existe
      console.log('🔍 [EventService] Tentative d\'ajout de extra_data...');
      eventToInsert.extra_data = extraData;

      console.log('📝 [EventService] Données préparées pour l\'insertion (formatées pour Supabase):', JSON.stringify(eventToInsert, null, 2));

      // 10. Insérer l'événement
      console.log('💾 [EventService] Insertion de l\'événement dans la base de données...');
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert([eventToInsert])
        .select()
        .single();

      if (insertError) {
        console.error('❌ [EventService] Erreur lors de l\'insertion de l\'événement:', insertError);
        console.error('❌ [EventService] Détails de l\'erreur:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        throw insertError;
      }

      console.log('✅ [EventService] Événement créé avec succès:', newEvent);
      console.log('🆔 [EventService] ID de l\'événement créé:', newEvent.id);

      // 11. Ajouter le créateur comme participant
      console.log('👤 [EventService] Ajout du créateur comme participant...');
      // Utiliser event_participants (table de la migration actuelle) au lieu de event_attendees
      const participantData: any = {
        event_id: newEvent.id,
        user_id: user.id,
        status: 'going'
      };
      
      // Ajouter event_created_by si la colonne existe (ajoutée dans les logs)
      participantData.event_created_by = user.id;
      
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert([participantData]);

      if (participantError) {
        console.error('⚠️ [EventService] Erreur lors de l\'ajout du créateur comme participant:', participantError);
        console.error('⚠️ [EventService] Détails:', {
          message: participantError.message,
          details: participantError.details,
          hint: participantError.hint,
          code: participantError.code
        });
        // Ne pas faire échouer la création pour ça
      } else {
        console.log('✅ [EventService] Créateur ajouté comme participant avec succès');
      }

      // 12. Gérer les co-hosts
      if (eventData.coHosts && eventData.coHosts.length > 0) {
        console.log('👥 [EventService] Ajout de', eventData.coHosts.length, 'co-hosts...');
        await this.addCoHostsAsParticipants(newEvent.id, eventData.coHosts, user.id);
      }

      // 13. Créer les extras dans des tables séparées
      console.log('🎯 [EventService] Traitement de TOUS les extras...');
      
      try {
        // 13.1 RSVP deadline et rappels
        if (eventData.rsvpDeadline) {
          console.log('📅 [EventService] Configuration RSVP deadline...');
          await this.addRSVPSettings(newEvent.id, eventData.rsvpDeadline, eventData.rsvpReminderEnabled || false, eventData.rsvpReminderTiming || '24h');
        }

        // 13.2 Coûts
        if (eventData.costs && eventData.costs.length > 0) {
          console.log('💰 [EventService] Ajout des coûts...');
          await this.addEventCosts(newEvent.id, eventData.costs);
        }

        // 13.3 Photos supplémentaires
        if (eventData.eventPhotos && eventData.eventPhotos.length > 0) {
          console.log('📷 [EventService] Upload des photos supplémentaires...');
          const photoUrls = await this.uploadEventPhotos(newEvent.id, eventData.eventPhotos);
          await this.addEventPhotos(newEvent.id, photoUrls);
        }

        // 13.4 Questionnaire
        if (eventData.questionnaire && eventData.questionnaire.length > 0) {
          console.log('📋 [EventService] Ajout du questionnaire...');
          await this.addEventQuestionnaire(newEvent.id, eventData.questionnaire);
        }

        // 13.5 Items à apporter
        if (eventData.itemsToBring && eventData.itemsToBring.length > 0) {
          console.log('🎁 [EventService] Ajout des items à apporter...');
          await this.addEventItems(newEvent.id, eventData.itemsToBring);
        }

        // 13.6 Playlist
        if (eventData.playlist || eventData.spotifyLink) {
          console.log('🎵 [EventService] Ajout de la playlist...');
          await this.addEventPlaylist(newEvent.id, eventData.playlist, eventData.spotifyLink);
        }

        // 13.7 Stickers de couverture
        if (eventData.coverData.placedStickers && eventData.coverData.placedStickers.length > 0) {
          console.log('✨ [EventService] Sauvegarde des stickers de couverture...');
          await this.updateEventStickers(newEvent.id, eventData.coverData.placedStickers);
        }

      } catch (extrasError) {
        console.error('⚠️ [EventService] Erreur lors de l\'ajout des extras:', extrasError);
        // On continue malgré l'erreur pour ne pas faire échouer la création principale
      }

      // 14. Créer la conversation pour l'événement
      console.log('💬 [EventService] Création de la conversation pour l\'événement...');
      try {
        await this.createEventConversation(newEvent.id, user.id, eventData);
      } catch (conversationError) {
        console.error('⚠️ [EventService] Erreur lors de la création de la conversation:', conversationError);
        // On continue malgré l'erreur
      }

      console.log('🎉 [EventService] Création d\'événement terminée avec succès!');
      console.log('🎊 [EventService] Résumé final:', {
        eventId: newEvent.id,
        title: newEvent.title,
        startTime: newEvent.start_time,
        privacy: newEvent.privacy,
        attendeesAdded: 1 + (eventData.coHosts?.length || 0)
      });
      
      return { success: true, event: newEvent };

    } catch (error) {
      console.error('💥 [EventService] Erreur fatale lors de la création de l\'événement:', error);
      console.error('💥 [EventService] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  static async uploadCoverImage(imageUri: string, userId: string): Promise<string> {
    try {
      console.log('📤 [EventService] Début de l\'upload de l\'image:', imageUri);
      console.log('📤 [EventService] User ID pour le dossier:', userId);
      
      // Créer un nom de fichier unique
      const timestamp = Date.now();
      const fileName = `event-covers/${userId}/${timestamp}.jpg`;
      console.log('📁 [EventService] Nom du fichier généré:', fileName);
      
      // Convertir l'URI en blob
      console.log('🔄 [EventService] Conversion de l\'URI en blob...');
      const response = await fetch(imageUri);
      const blob = await response.blob();
      console.log('✅ [EventService] Blob créé, taille:', blob.size, 'bytes');
      
      // Vérifier si le bucket existe
      console.log('🪣 [EventService] Upload vers le bucket: event-images');
      
      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '3600'
        });

      if (error) {
        console.error('❌ [EventService] Erreur upload image:', error);
        console.error('❌ [EventService] Détails erreur storage:', {
          message: error.message,
          name: error.name
        });
        
        // Si le bucket n'existe pas, essayer de le créer
        if (error.message?.includes('not found')) {
          console.warn('⚠️ [EventService] Le bucket "event-images" n\'existe peut-être pas');
          console.log('💡 [EventService] Créez le bucket dans Supabase Dashboard > Storage');
        }
        
        throw error;
      }

      console.log('✅ [EventService] Upload réussi, data:', data);

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      console.log('✅ [EventService] Image uploadée avec succès!');
      console.log('🔗 [EventService] URL publique:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ [EventService] Erreur fatale lors de l\'upload de l\'image:', error);
      console.error('❌ [EventService] Type d\'erreur:', error instanceof Error ? error.constructor.name : typeof error);
      
      // Pour le développement, on peut continuer sans l'image
      console.warn('⚠️ [EventService] Continuant sans l\'image de couverture uploadée');
      return imageUri; // Retourner l'URI locale comme fallback
    }
  }

  static async addCoHostsAsParticipants(eventId: string, coHosts: any[], createdBy: string) {
    console.log(`👥 [EventService] Ajout de ${coHosts.length} co-hosts à l'événement ${eventId}`);
    console.log('👥 [EventService] Co-hosts à ajouter:', coHosts.map(ch => ({ id: ch.id, name: ch.name })));
    
    try {
      // Pour chaque co-host, les ajouter comme participants avec statut 'going'
      const coHostsToAdd = coHosts.map(coHost => {
        const participant: any = {
          event_id: eventId,
          user_id: coHost.id,
          status: 'going' // Utiliser 'going' car 'co-host' n'est pas dans l'enum
        };
        
        // Ajouter event_created_by si la colonne existe
        participant.event_created_by = createdBy;
        
        return participant;
      });

      console.log('👥 [EventService] Données des co-hosts préparées pour insertion:', coHostsToAdd);

      const { error } = await supabase
        .from('event_participants')
        .insert(coHostsToAdd);

      if (error) {
        console.error('❌ [EventService] Erreur lors de l\'ajout des co-hosts:', error);
        console.error('❌ [EventService] Détails de l\'erreur:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        // Ne pas faire échouer pour ça, mais logger l'erreur
        return;
      }

      console.log('✅ [EventService] Co-hosts ajoutés avec succès comme participants');
    } catch (error) {
      console.error('❌ [EventService] Erreur fatale lors de l\'ajout des co-hosts:', error);
      // Ne pas faire échouer la création de l'événement pour ça
      console.warn('⚠️ [EventService] Continuant malgré l\'erreur des co-hosts');
    }
  }

  static async uploadEventPhotos(eventId: string, photos: string[]) {
    console.log(`📷 [EventService] Upload de ${photos.length} photos pour l'événement ${eventId}`);
    
    try {
      const uploadedUrls = [];
      
      for (const [index, photoUri] of photos.entries()) {
        console.log(`📤 [EventService] Upload photo ${index + 1}/${photos.length}`);
        
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
          console.error(`❌ [EventService] Erreur upload photo ${index + 1}:`, error);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('event-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        console.log(`✅ [EventService] Photo ${index + 1} uploadée`);
      }

      console.log(`✅ [EventService] ${uploadedUrls.length} photos uploadées avec succès`);
      return uploadedUrls;
    } catch (error) {
      console.error('❌ [EventService] Erreur lors de l\'upload des photos:', error);
      throw error;
    }
  }

  static async updateEvent(eventId: string, updates: Partial<CreateEventData>) {
    console.log('🔄 [EventService] Mise à jour de l\'événement:', eventId, updates);
    
    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          title: updates.title,
          subtitle: updates.subtitle,
          description: updates.description,
          date: updates.date?.toISOString(),
          location: updates.location,
          is_private: updates.isPrivate,
          extra_data: {
            coverData: updates.coverData,
            locationDetails: updates.locationDetails,
            coHosts: updates.coHosts,
            costs: updates.costs,
            eventPhotos: updates.eventPhotos,
            rsvpDeadline: updates.rsvpDeadline,
            rsvpReminderEnabled: updates.rsvpReminderEnabled,
            rsvpReminderTiming: updates.rsvpReminderTiming,
            questionnaire: updates.questionnaire,
            itemsToBring: updates.itemsToBring,
            playlist: updates.playlist,
            spotifyLink: updates.spotifyLink
          }
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('❌ [EventService] Erreur lors de la mise à jour:', error);
        throw error;
      }

      console.log('✅ [EventService] Événement mis à jour avec succès');
      return { success: true, event: data };
    } catch (error) {
      console.error('💥 [EventService] Erreur fatale lors de la mise à jour:', error);
      throw error;
    }
  }

  static async deleteEvent(eventId: string) {
    console.log('🗑️ [EventService] Suppression de l\'événement:', eventId);
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('❌ [EventService] Erreur lors de la suppression:', error);
        throw error;
      }

      console.log('✅ [EventService] Événement supprimé avec succès');
      return { success: true };
    } catch (error) {
      console.error('💥 [EventService] Erreur fatale lors de la suppression:', error);
      throw error;
    }
  }

  static async cancelEvent(eventId: string) {
    console.log('🚫 [EventService] Annulation de l\'événement:', eventId);
    
    try {
      // 1. Récupérer l'événement
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*, chats(id, name)')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        console.error('❌ [EventService] Erreur lors de la récupération de l\'événement:', eventError);
        throw eventError || new Error('Événement non trouvé');
      }

      // 2. Marquer l'événement comme annulé
      const { error: updateError } = await supabase
        .from('events')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (updateError) {
        console.error('❌ [EventService] Erreur lors de l\'annulation:', updateError);
        throw updateError;
      }

      // 3. Mettre à jour le nom de la conversation associée
      if (event.chats && event.chats.length > 0) {
        const chat = event.chats[0];
        const newChatName = `${chat.name} (Annulé)`;
        
        console.log('💬 [EventService] Mise à jour du nom de la conversation:', newChatName);
        
        const { error: chatUpdateError } = await supabase
          .from('chats')
          .update({ name: newChatName })
          .eq('id', chat.id);

        if (chatUpdateError) {
          console.error('⚠️ [EventService] Erreur lors de la mise à jour du chat:', chatUpdateError);
        }

        // 4. Envoyer un message système dans la conversation
        const cancelMessage = {
          chat_id: chat.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          content: 'Cet événement a été annulé. La conversation reste ouverte pour continuer à discuter.',
          type: 'system',
          metadata: {
            event_id: eventId,
            action: 'event_cancelled'
          }
        };

        const { error: messageError } = await supabase
          .from('messages')
          .insert([cancelMessage]);

        if (messageError) {
          console.error('⚠️ [EventService] Erreur lors de l\'envoi du message d\'annulation:', messageError);
        }
      }

      console.log('✅ [EventService] Événement annulé avec succès');
      return { success: true };
    } catch (error) {
      console.error('💥 [EventService] Erreur fatale lors de l\'annulation:', error);
      throw error;
    }
  }

  // ========== MÉTHODES POUR LES EXTRAS ==========

  static async addRSVPSettings(eventId: string, deadline: Date, reminderEnabled: boolean, reminderTiming: string) {
    console.log('⏰ [EventService] Configuration RSVP deadline');
    console.log('  📅 Deadline:', deadline.toISOString());
    console.log('  🔔 Rappel activé:', reminderEnabled);
    console.log('  ⏱️ Timing:', reminderTiming);
    
    try {
      const { error } = await supabase
        .from('event_rsvp_settings')
        .insert([{
          event_id: eventId,
          deadline: deadline.toISOString(),
          reminder_enabled: reminderEnabled,
          reminder_timing: reminderTiming
        }]);

      if (error) {
        console.error('❌ [EventService] Erreur RSVP settings:', error);
        if (error.code === '42P01') {
          console.warn('⚠️ [EventService] Table event_rsvp_settings n\'existe pas');
        }
        throw error;
      }

      console.log('✅ [EventService] RSVP deadline configuré');
    } catch (error) {
      console.error('❌ [EventService] Erreur configuration RSVP:', error);
      throw error;
    }
  }

  static async addEventCosts(eventId: string, costs: EventCost[]) {
    console.log(`💰 [EventService] Ajout de ${costs.length} coûts`);
    
    try {
      const costsToAdd = costs.map((cost, i) => {
        console.log(`  💵 Coût ${i + 1}: ${cost.amount} ${cost.currency} - ${cost.description}`);
        return {
          event_id: eventId,
          amount: parseFloat(cost.amount),
          currency: cost.currency || 'EUR',
          description: cost.description
        };
      });

      const { error } = await supabase
        .from('event_costs')
        .insert(costsToAdd);

      if (error) {
        console.error('❌ [EventService] Erreur ajout coûts:', error);
        throw error;
      }

      console.log('✅ [EventService] Coûts ajoutés');
    } catch (error) {
      console.error('❌ [EventService] Erreur lors de l\'ajout des coûts:', error);
      throw error;
    }
  }

  static async addEventPhotos(eventId: string, photoUrls: string[]) {
    console.log(`📷 [EventService] Enregistrement de ${photoUrls.length} photos en base`);
    
    try {
      const photosToAdd = photoUrls.map((url, i) => ({
        event_id: eventId,
        photo_url: url,
        position: i
      }));

      const { error } = await supabase
        .from('event_photos')
        .insert(photosToAdd);

      if (error) {
        console.error('❌ [EventService] Erreur ajout photos en base:', error);
        throw error;
      }

      console.log('✅ [EventService] Photos enregistrées en base');
    } catch (error) {
      console.error('❌ [EventService] Erreur lors de l\'enregistrement des photos:', error);
      throw error;
    }
  }

  static async addEventQuestionnaire(eventId: string, questions: EventQuestionnaire[]) {
    console.log(`📋 [EventService] Ajout de ${questions.length} questions`);
    
    try {
      const questionsToAdd = questions.map((q, i) => {
        console.log(`  ❓ Question ${i + 1}: ${q.text} (${q.type})`);
        return {
          event_id: eventId,
          question: q.text,
          question_type: q.type || 'text',
          position: i,
          is_required: false
        };
      });

      const { error } = await supabase
        .from('event_questionnaires')
        .insert(questionsToAdd);

      if (error) {
        console.error('❌ [EventService] Erreur ajout questionnaire:', error);
        throw error;
      }

      console.log('✅ [EventService] Questionnaire ajouté');
    } catch (error) {
      console.error('❌ [EventService] Erreur lors de l\'ajout du questionnaire:', error);
      throw error;
    }
  }

  static async addEventItems(eventId: string, items: string[]) {
    console.log(`🎁 [EventService] Ajout de ${items.length} items à apporter`);
    
    try {
      const itemsToAdd = items.map((item, i) => {
        console.log(`  📦 Item ${i + 1}: ${item}`);
        return {
          event_id: eventId,
          name: item,
          quantity: 1
        };
      });

      const { error } = await supabase
        .from('event_items')
        .insert(itemsToAdd);

      if (error) {
        console.error('❌ [EventService] Erreur ajout items:', error);
        throw error;
      }

      console.log('✅ [EventService] Items ajoutés');
    } catch (error) {
      console.error('❌ [EventService] Erreur lors de l\'ajout des items:', error);
      throw error;
    }
  }

  static async addEventPlaylist(eventId: string, playlist: any, spotifyLink?: string) {
    console.log('🎵 [EventService] Ajout de la playlist');
    if (spotifyLink) console.log('  🔗 Spotify:', spotifyLink);
    
    try {
      // Si on a une playlist avec des chansons
      if (playlist && Array.isArray(playlist)) {
        const songsToAdd = playlist.map((song, i) => ({
          event_id: eventId,
          song_title: song.title || song.name || 'Chanson ' + (i + 1),
          artist: song.artist || '',
          spotify_url: song.spotifyUrl || spotifyLink,
          position: i
        }));

        const { error } = await supabase
          .from('event_playlists')
          .insert(songsToAdd);

        if (error) {
          console.error('❌ [EventService] Erreur ajout playlist:', error);
          throw error;
        }
      } else if (spotifyLink) {
        // Si on a juste un lien Spotify
        const { error } = await supabase
          .from('event_playlists')
          .insert([{
            event_id: eventId,
            song_title: 'Playlist Spotify',
            spotify_url: spotifyLink,
            position: 0
          }]);

        if (error) {
          console.error('❌ [EventService] Erreur ajout lien Spotify:', error);
          throw error;
        }
      }

      console.log('✅ [EventService] Playlist ajoutée');
    } catch (error) {
      console.error('❌ [EventService] Erreur lors de l\'ajout de la playlist:', error);
      throw error;
    }
  }

  static async updateEventStickers(eventId: string, stickers: any[]) {
    console.log(`✨ [EventService] Mise à jour des ${stickers.length} stickers`);
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ cover_stickers: stickers })
        .eq('id', eventId);

      if (error) {
        console.error('❌ [EventService] Erreur mise à jour stickers:', error);
        throw error;
      }

      console.log('✅ [EventService] Stickers mis à jour');
    } catch (error) {
      console.error('❌ [EventService] Erreur lors de la mise à jour des stickers:', error);
      throw error;
    }
  }

  static async createEventConversation(eventId: string, creatorId: string, eventData: CreateEventData) {
    console.log('💬 [EventService] Création de la conversation pour l\'événement', eventId);
    
    try {
      // 1. Créer le chat pour l'événement
      const chatName = eventData.title || 'Conversation de l\'événement';
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert([{
          name: chatName,
          is_group: true,
          event_id: eventId,
          created_by: creatorId
        }])
        .select()
        .single();

      if (chatError) {
        console.error('❌ [EventService] Erreur lors de la création du chat:', chatError);
        throw chatError;
      }

      console.log('✅ [EventService] Chat créé avec succès:', chat.id);

      // 2. Ajouter les participants initiaux
      const participants = [];
      
      // Ajouter le créateur comme admin
      participants.push({
        chat_id: chat.id,
        user_id: creatorId,
        is_admin: true
      });

      // Ajouter les co-hosts comme admins
      if (eventData.coHosts && eventData.coHosts.length > 0) {
        console.log('👥 [EventService] Ajout de', eventData.coHosts.length, 'co-hosts comme admins du chat');
        eventData.coHosts.forEach(coHost => {
          participants.push({
            chat_id: chat.id,
            user_id: coHost.id,
            is_admin: true
          });
        });
      }

      // Insérer tous les participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) {
        console.error('❌ [EventService] Erreur lors de l\'ajout des participants au chat:', participantsError);
        throw participantsError;
      }

      console.log('✅ [EventService] Participants ajoutés au chat avec succès');

      // 3. Envoyer un message de bienvenue système
      const welcomeMessage = {
        chat_id: chat.id,
        user_id: creatorId,
        content: `Bienvenue dans la conversation de "${chatName}" ! 🎉`,
        type: 'system',
        metadata: {
          event_id: eventId,
          action: 'chat_created'
        }
      };

      const { error: messageError } = await supabase
        .from('messages')
        .insert([welcomeMessage]);

      if (messageError) {
        console.error('⚠️ [EventService] Erreur lors de l\'envoi du message de bienvenue:', messageError);
        // Ne pas faire échouer pour ça
      }

      console.log('✅ [EventService] Conversation de l\'événement créée avec succès');
      return chat;
    } catch (error) {
      console.error('❌ [EventService] Erreur fatale lors de la création de la conversation:', error);
      throw error;
    }
  }

  static async addParticipantToEventChat(eventId: string, userId: string) {
    console.log('👤 [EventService] Ajout d\'un participant à la conversation de l\'événement');
    
    try {
      // Validation des paramètres
      if (!eventId || !userId) {
        console.error('❌ [EventService] Paramètres invalides:', { eventId, userId });
        throw new Error('Paramètres invalides');
      }

      // 1. Récupérer le chat associé à l'événement
      const { data: chats, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('event_id', eventId);

      if (chatError) {
        console.error('❌ [EventService] Erreur lors de la récupération du chat:', chatError);
        throw chatError;
      }

      if (!chats || chats.length === 0) {
        console.warn('⚠️ [EventService] Aucun chat trouvé pour l\'événement:', eventId);
        // Pas d'erreur critique, l'événement peut ne pas avoir de chat
        return;
      }

      const chat = chats[0];

      // 2. Vérifier si l'utilisateur est déjà dans le chat
      const { data: existingParticipant, error: checkError } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('chat_id', chat.id)
        .eq('user_id', userId)
        .single();

      if (!checkError && existingParticipant) {
        console.log('ℹ️ [EventService] L\'utilisateur est déjà dans le chat');
        return;
      }

      // 3. Ajouter l'utilisateur au chat
      const { error: addError } = await supabase
        .from('chat_participants')
        .insert([{
          chat_id: chat.id,
          user_id: userId,
          is_admin: false
        }]);

      if (addError) {
        console.error('❌ [EventService] Erreur lors de l\'ajout au chat:', addError);
        throw addError;
      }

      // 4. Récupérer les infos de l'utilisateur pour le message système
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', userId)
        .single();

      const userName = userData?.full_name || userData?.username || 'Un participant';

      // 5. Envoyer un message système
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          chat_id: chat.id,
          user_id: userId,
          content: `${userName} a rejoint l'événement`,
          type: 'system',
          metadata: {
            event_id: eventId,
            action: 'participant_joined'
          }
        }]);

      if (messageError) {
        console.error('⚠️ [EventService] Erreur lors de l\'envoi du message système:', messageError);
      }

      console.log('✅ [EventService] Participant ajouté à la conversation avec succès');
    } catch (error) {
      console.error('❌ [EventService] Erreur lors de l\'ajout du participant au chat:', error);
      throw error;
    }
  }

  static async removeParticipantFromEventChat(eventId: string, userId: string) {
    console.log('👤 [EventService] Retrait d\'un participant de la conversation de l\'événement');
    
    try {
      // 1. Récupérer le chat associé à l'événement
      const { data: chats, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('event_id', eventId);

      if (chatError || !chats || chats.length === 0) {
        console.error('❌ [EventService] Aucun chat trouvé pour l\'événement:', eventId);
        return;
      }

      const chat = chats[0];

      // 2. Récupérer les infos de l'utilisateur avant de le retirer
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', userId)
        .single();

      const userName = userData?.full_name || userData?.username || 'Un participant';

      // 3. Retirer l'utilisateur du chat
      const { error: removeError } = await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_id', chat.id)
        .eq('user_id', userId);

      if (removeError) {
        console.error('❌ [EventService] Erreur lors du retrait du chat:', removeError);
        throw removeError;
      }

      // 4. Envoyer un message système
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          chat_id: chat.id,
          user_id: userId,
          content: `${userName} a quitté l'événement`,
          type: 'system',
          metadata: {
            event_id: eventId,
            action: 'participant_left'
          }
        }]);

      if (messageError) {
        console.error('⚠️ [EventService] Erreur lors de l\'envoi du message système:', messageError);
      }

      console.log('✅ [EventService] Participant retiré de la conversation avec succès');
    } catch (error) {
      console.error('❌ [EventService] Erreur lors du retrait du participant du chat:', error);
      throw error;
    }
  }
}
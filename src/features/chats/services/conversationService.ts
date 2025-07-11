import { supabase } from '@/shared/lib/supabase/client';

export interface CreatePrivateChatData {
  userId: string; // ID de l'autre utilisateur
  message?: string; // Message initial optionnel
}

export interface CreateGroupChatData {
  name: string;
  userIds: string[]; // IDs des utilisateurs à ajouter
  description?: string;
}

export interface CreateFriendRequestData {
  recipientId: string; // ID du destinataire
  message?: string; // Message de demande d'ami
}

export interface MessageRequest {
  recipientId: string; // ID du destinataire
  content: string; // Contenu du message
}

export class ConversationService {
  // Créer un chat privé entre deux utilisateurs
  static async createPrivateChat(data: CreatePrivateChatData) {
    console.log('💬 [ConversationService] Création d\'un chat privé avec:', data.userId);
    
    try {
      // 1. Obtenir l'utilisateur actuel
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // 2. Vérifier si un chat privé existe déjà entre ces deux utilisateurs
      const { data: existingChats, error: searchError } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants!inner(user_id)
        `)
        .eq('is_group', false)
        .eq('event_id', null);

      if (searchError) {
        console.error('❌ [ConversationService] Erreur lors de la recherche de chat existant:', searchError);
        throw searchError;
      }

      // Filtrer pour trouver un chat avec exactement ces deux utilisateurs
      const existingChat = existingChats?.find(chat => {
        const participants = chat.chat_participants.map((p: any) => p.user_id);
        return participants.length === 2 && 
               participants.includes(user.id) && 
               participants.includes(data.userId);
      });

      if (existingChat) {
        console.log('✅ [ConversationService] Chat privé existant trouvé:', existingChat.id);
        return { chat: existingChat, isNew: false };
      }

      // 3. Créer un nouveau chat privé
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert([{
          is_group: false,
          created_by: user.id
        }])
        .select()
        .single();

      if (chatError) {
        console.error('❌ [ConversationService] Erreur lors de la création du chat:', chatError);
        throw chatError;
      }

      // 4. Ajouter les deux participants
      const participants = [
        { chat_id: newChat.id, user_id: user.id },
        { chat_id: newChat.id, user_id: data.userId }
      ];

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) {
        console.error('❌ [ConversationService] Erreur lors de l\'ajout des participants:', participantsError);
        throw participantsError;
      }

      // 5. Envoyer un message initial si fourni
      if (data.message) {
        await this.sendMessage(newChat.id, user.id, data.message);
      }

      console.log('✅ [ConversationService] Chat privé créé avec succès');
      return { chat: newChat, isNew: true };
    } catch (error) {
      console.error('💥 [ConversationService] Erreur fatale:', error);
      throw error;
    }
  }

  // Créer un chat de groupe
  static async createGroupChat(data: CreateGroupChatData) {
    console.log('👥 [ConversationService] Création d\'un chat de groupe:', data.name);
    
    try {
      // 1. Obtenir l'utilisateur actuel
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // 2. Créer le chat de groupe
      const { data: groupChat, error: chatError } = await supabase
        .from('chats')
        .insert([{
          name: data.name,
          is_group: true,
          created_by: user.id
        }])
        .select()
        .single();

      if (chatError) {
        console.error('❌ [ConversationService] Erreur lors de la création du groupe:', chatError);
        throw chatError;
      }

      // 3. Ajouter tous les participants (créateur + invités)
      const participants = [
        { chat_id: groupChat.id, user_id: user.id, is_admin: true }, // Créateur est admin
        ...data.userIds.map(userId => ({
          chat_id: groupChat.id,
          user_id: userId,
          is_admin: false
        }))
      ];

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) {
        console.error('❌ [ConversationService] Erreur lors de l\'ajout des participants:', participantsError);
        throw participantsError;
      }

      // 4. Envoyer un message système
      await this.sendSystemMessage(groupChat.id, `${data.name} a été créé`);

      console.log('✅ [ConversationService] Groupe créé avec succès');
      return { chat: groupChat };
    } catch (error) {
      console.error('💥 [ConversationService] Erreur fatale:', error);
      throw error;
    }
  }

  // Envoyer une demande d'ami
  static async sendFriendRequest(data: CreateFriendRequestData) {
    console.log('🤝 [ConversationService] Envoi d\'une demande d\'ami à:', data.recipientId);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier si une demande existe déjà
      const { data: existingRequest, error: checkError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .or(`sender_id.eq.${data.recipientId},recipient_id.eq.${data.recipientId}`)
        .single();

      if (existingRequest && !checkError) {
        console.log('⚠️ [ConversationService] Une demande d\'ami existe déjà');
        return { request: existingRequest, isNew: false };
      }

      // Créer la demande d'ami
      const { data: friendRequest, error: requestError } = await supabase
        .from('friend_requests')
        .insert([{
          sender_id: user.id,
          recipient_id: data.recipientId,
          message: data.message,
          status: 'pending'
        }])
        .select()
        .single();

      if (requestError) {
        console.error('❌ [ConversationService] Erreur lors de la création de la demande:', requestError);
        throw requestError;
      }

      console.log('✅ [ConversationService] Demande d\'ami envoyée');
      return { request: friendRequest, isNew: true };
    } catch (error) {
      console.error('💥 [ConversationService] Erreur fatale:', error);
      throw error;
    }
  }

  // Accepter une demande d'ami
  static async acceptFriendRequest(requestId: string) {
    console.log('✅ [ConversationService] Acceptation de la demande d\'ami:', requestId);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Mettre à jour le statut de la demande
      const { data: request, error: updateError } = await supabase
        .from('friend_requests')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('recipient_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [ConversationService] Erreur lors de l\'acceptation:', updateError);
        throw updateError;
      }

      // Créer automatiquement un chat privé entre les deux utilisateurs
      await this.createPrivateChat({
        userId: request.sender_id,
        message: 'Nous sommes maintenant amis ! 🎉'
      });

      console.log('✅ [ConversationService] Demande d\'ami acceptée et chat créé');
      return { success: true };
    } catch (error) {
      console.error('💥 [ConversationService] Erreur fatale:', error);
      throw error;
    }
  }

  // Envoyer une demande de message (pour les utilisateurs non amis)
  static async sendMessageRequest(data: MessageRequest) {
    console.log('📨 [ConversationService] Envoi d\'une demande de message à:', data.recipientId);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Créer un chat privé temporaire avec statut "pending"
      const { data: pendingChat, error: chatError } = await supabase
        .from('chats')
        .insert([{
          is_group: false,
          created_by: user.id,
          status: 'pending' // Nécessite l'ajout de cette colonne
        }])
        .select()
        .single();

      if (chatError) {
        console.error('❌ [ConversationService] Erreur lors de la création du chat pending:', chatError);
        throw chatError;
      }

      // Ajouter les participants
      const participants = [
        { chat_id: pendingChat.id, user_id: user.id },
        { chat_id: pendingChat.id, user_id: data.recipientId, is_pending: true }
      ];

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) {
        console.error('❌ [ConversationService] Erreur lors de l\'ajout des participants:', participantsError);
        throw participantsError;
      }

      // Envoyer le message
      await this.sendMessage(pendingChat.id, user.id, data.content);

      console.log('✅ [ConversationService] Demande de message envoyée');
      return { chat: pendingChat };
    } catch (error) {
      console.error('💥 [ConversationService] Erreur fatale:', error);
      throw error;
    }
  }

  // Accepter une demande de message
  static async acceptMessageRequest(chatId: string) {
    console.log('✅ [ConversationService] Acceptation de la demande de message:', chatId);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Mettre à jour le statut du chat
      const { error: chatUpdateError } = await supabase
        .from('chats')
        .update({ status: 'active' })
        .eq('id', chatId);

      if (chatUpdateError) {
        console.error('❌ [ConversationService] Erreur lors de la mise à jour du chat:', chatUpdateError);
        throw chatUpdateError;
      }

      // Mettre à jour le participant
      const { error: participantUpdateError } = await supabase
        .from('chat_participants')
        .update({ is_pending: false })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      if (participantUpdateError) {
        console.error('❌ [ConversationService] Erreur lors de la mise à jour du participant:', participantUpdateError);
        throw participantUpdateError;
      }

      // Envoyer un message système
      await this.sendSystemMessage(chatId, 'Demande de message acceptée');

      console.log('✅ [ConversationService] Demande de message acceptée');
      return { success: true };
    } catch (error) {
      console.error('💥 [ConversationService] Erreur fatale:', error);
      throw error;
    }
  }

  // Ajouter des participants à un chat de groupe
  static async addParticipantsToGroup(chatId: string, userIds: string[]) {
    console.log('➕ [ConversationService] Ajout de participants au groupe:', chatId);
    
    try {
      const participants = userIds.map(userId => ({
        chat_id: chatId,
        user_id: userId,
        is_admin: false
      }));

      const { error } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (error) {
        console.error('❌ [ConversationService] Erreur lors de l\'ajout des participants:', error);
        throw error;
      }

      console.log('✅ [ConversationService] Participants ajoutés avec succès');
      return { success: true };
    } catch (error) {
      console.error('💥 [ConversationService] Erreur fatale:', error);
      throw error;
    }
  }

  // Méthodes utilitaires
  private static async sendMessage(chatId: string, userId: string, content: string, type: string = 'text') {
    const { error } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        user_id: userId,
        content: content,
        type: type
      }]);

    if (error) {
      console.error('❌ [ConversationService] Erreur lors de l\'envoi du message:', error);
      throw error;
    }
  }

  private static async sendSystemMessage(chatId: string, content: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await this.sendMessage(chatId, user?.id || '', content, 'system');
  }
}
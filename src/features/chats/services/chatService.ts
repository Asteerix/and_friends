import { supabase } from '@/shared/lib/supabase/client';

export interface CreateChatParams {
  name?: string;
  is_group: boolean;
  participant_ids: string[];
  event_id?: string;
}

export interface AddParticipantsParams {
  chat_id: string;
  user_ids: string[];
}

export interface RemoveParticipantParams {
  chat_id: string;
  user_id: string;
}

export class ChatService {
  // Create a new chat (direct or group)
  static async createChat(params: CreateChatParams) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create the chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: params.name,
          is_group: params.is_group,
          event_id: params.event_id,
          created_by: user.id,
          status: 'active',
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add participants (including the creator)
      const participants = [user.id, ...params.participant_ids].map((id) => ({
        chat_id: chat.id,
        user_id: id,
        is_admin: id === user.id,
      }));

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      // Create a system message for group creation
      if (params.is_group) {
        await supabase.from('messages').insert({
          chat_id: chat.id,
          user_id: user.id,
          message_type: 'system',
          content: `${user.user_metadata?.full_name || 'Someone'} created the group "${params.name || 'Unnamed group'}"`,
          metadata: { action: 'group_created' },
        });
      }

      return { data: chat, error: null };
    } catch (error) {
      console.error('Error creating chat:', error);
      return { data: null, error };
    }
  }

  // Get or create a direct chat between two users
  static async getOrCreateDirectChat(otherUserId: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if a direct chat already exists between these users
      const { data: existingChats } = await supabase
        .from('chat_participants')
        .select(
          `
          chat_id,
          chats!inner (
            id,
            is_group,
            name
          )
        `
        )
        .eq('user_id', user.id)
        .eq('chats.is_group', false);

      // Find if there's a chat with the other user
      for (const participation of existingChats || []) {
        const { data: otherParticipant } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', participation.chat_id)
          .neq('user_id', user.id)
          .single();

        if (otherParticipant?.user_id === otherUserId) {
          return { data: participation.chats, error: null };
        }
      }

      // No existing chat, create a new one
      return await this.createChat({
        is_group: false,
        participant_ids: [otherUserId],
      });
    } catch (error) {
      console.error('Error getting/creating direct chat:', error);
      return { data: null, error };
    }
  }

  // Add participants to a group chat
  static async addParticipants(params: AddParticipantsParams) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user is admin of the chat
      const { data: isAdmin } = await supabase
        .from('chat_participants')
        .select('is_admin')
        .eq('chat_id', params.chat_id)
        .eq('user_id', user.id)
        .single();

      if (!isAdmin?.is_admin) {
        throw new Error('Only admins can add participants');
      }

      // Add new participants
      const participants = params.user_ids.map((id) => ({
        chat_id: params.chat_id,
        user_id: id,
        is_admin: false,
      }));

      const { error } = await supabase.from('chat_participants').insert(participants);

      if (error) throw error;

      // Get user names for system message
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', params.user_ids);

      const names = users?.map((u) => u.full_name).join(', ') || 'users';

      // Create system message
      await supabase.from('messages').insert({
        chat_id: params.chat_id,
        user_id: user.id,
        message_type: 'system',
        content: `${user.user_metadata?.full_name || 'Someone'} added ${names} to the group`,
        metadata: { action: 'participants_added', user_ids: params.user_ids },
      });

      return { success: true, error: null };
    } catch (error) {
      console.error('Error adding participants:', error);
      return { success: false, error };
    }
  }

  // Remove a participant from a group chat
  static async removeParticipant(params: RemoveParticipantParams) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user is admin or removing themselves
      const { data: isAdmin } = await supabase
        .from('chat_participants')
        .select('is_admin')
        .eq('chat_id', params.chat_id)
        .eq('user_id', user.id)
        .single();

      if (!isAdmin?.is_admin && params.user_id !== user.id) {
        throw new Error('Only admins can remove other participants');
      }

      // Remove participant
      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_id', params.chat_id)
        .eq('user_id', params.user_id);

      if (error) throw error;

      // Get removed user's name
      const { data: removedUser } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', params.user_id)
        .single();

      // Create system message
      const isLeaving = params.user_id === user.id;
      await supabase.from('messages').insert({
        chat_id: params.chat_id,
        user_id: user.id,
        message_type: 'system',
        content: isLeaving
          ? `${user.user_metadata?.full_name || 'Someone'} left the group`
          : `${user.user_metadata?.full_name || 'Someone'} removed ${removedUser?.full_name || 'someone'} from the group`,
        metadata: {
          action: isLeaving ? 'participant_left' : 'participant_removed',
          user_id: params.user_id,
        },
      });

      return { success: true, error: null };
    } catch (error) {
      console.error('Error removing participant:', error);
      return { success: false, error };
    }
  }

  // Update chat details (name, etc.)
  static async updateChat(chatId: string, updates: { name?: string }) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user is admin
      const { data: isAdmin } = await supabase
        .from('chat_participants')
        .select('is_admin')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .single();

      if (!isAdmin?.is_admin) {
        throw new Error('Only admins can update chat details');
      }

      const { error } = await supabase.from('chats').update(updates).eq('id', chatId);

      if (error) throw error;

      // Create system message if name was changed
      if (updates.name) {
        await supabase.from('messages').insert({
          chat_id: chatId,
          user_id: user.id,
          message_type: 'system',
          content: `${user.user_metadata?.full_name || 'Someone'} changed the group name to "${updates.name}"`,
          metadata: { action: 'chat_renamed', new_name: updates.name },
        });
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error updating chat:', error);
      return { success: false, error };
    }
  }

  // Search users for adding to chat
  static async searchUsers(query: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error searching users:', error);
      return { data: [], error };
    }
  }

  // Get chat participants with full profiles
  static async getChatParticipants(chatId: string) {
    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select(
          `
          user_id,
          is_admin,
          joined_at,
          profiles:user_id (
            id,
            full_name,
            username,
            avatar_url,
            bio
          )
        `
        )
        .eq('chat_id', chatId);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error getting chat participants:', error);
      return { data: [], error };
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(chatId: string, messageIds: string[]) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get current read_by arrays for all messages
      const { data: messages } = await supabase
        .from('messages')
        .select('id, read_by')
        .in('id', messageIds);

      if (!messages) return { success: true };

      // Update each message's read_by array
      for (const message of messages) {
        const readBy = message.read_by || [];
        if (!readBy.includes(user.id)) {
          readBy.push(user.id);

          await supabase.from('messages').update({ read_by: readBy }).eq('id', message.id);
        }
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return { success: false, error };
    }
  }
}

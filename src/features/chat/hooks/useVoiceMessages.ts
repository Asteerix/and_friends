import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

interface VoiceMessageData {
  uri: string;
  duration: number;
  transcription?: string;
}

export function useVoiceMessages() {
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadVoiceMessage = useCallback(async (
    localUri: string,
    conversationId: string,
    duration: number
  ): Promise<VoiceMessageData | null> => {
    try {
      setIsUploading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Generate unique filename
      const fileName = `${user.id}/${Date.now()}.m4a`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(`${conversationId}/${fileName}`, 
          decode(base64), 
          {
            contentType: 'audio/mp4',
            upsert: false,
          }
        );

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(`${conversationId}/${fileName}`);

      return {
        uri: publicUrl,
        duration,
      };
    } catch (err: any) {
      console.error('Error uploading voice message:', err);
      setError(err.message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const transcribeVoiceMessage = useCallback(async (
    audioUrl: string
  ): Promise<string | null> => {
    try {
      setIsTranscribing(true);
      setError(null);

      // Call Supabase Edge Function for transcription
      const { data, error: transcribeError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioUrl },
      });

      if (transcribeError) throw transcribeError;

      return data.transcription || null;
    } catch (err: any) {
      console.error('Error transcribing voice message:', err);
      setError(err.message);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const sendVoiceMessage = useCallback(async (
    localUri: string,
    duration: number,
    conversationId: string
  ) => {
    try {
      // Upload voice message
      const voiceData = await uploadVoiceMessage(localUri, conversationId, duration);
      if (!voiceData) throw new Error('Failed to upload voice message');

      // Create message in database
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          content: null,
          content_type: 'audio',
          media_urls: [voiceData.uri],
          created_at: new Date().toISOString(),
        });

      if (messageError) throw messageError;

      // Optionally start transcription in background
      transcribeVoiceMessage(voiceData.uri).then(transcription => {
        if (transcription) {
          // Update message with transcription
          // This would be done via a webhook or background job in production
          console.log('Transcription:', transcription);
        }
      });

      return voiceData;
    } catch (err: any) {
      console.error('Error sending voice message:', err);
      setError(err.message);
      return null;
    }
  }, [uploadVoiceMessage, transcribeVoiceMessage]);

  return {
    sendVoiceMessage,
    transcribeVoiceMessage,
    isUploading,
    isTranscribing,
    error,
  };
}

// Helper function to decode base64
function decode(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
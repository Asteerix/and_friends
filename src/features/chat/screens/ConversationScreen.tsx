import { useHeaderHeight } from '@react-navigation/elements';
import { useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BubbleLeft from '@/features/chat/components/BubbleLeft';
import BubbleRight from '@/features/chat/components/BubbleRight';
import HeaderChat from '@/features/chat/components/HeaderChat';
import InputBar from '@/features/chat/components/InputBar';
import LinkCard from '@/features/home/components/LinkCard';
import { useMessagesAdvanced } from '@/hooks/useMessagesAdvanced';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';
import ScribbleDivider from '@/shared/ui/ScribbleDivider';
import ReportModal from '@/features/reports/components/ReportModal';

// import PollBlockLarge from "@/features/chat/components/PollBlockLarge";
// import PollBlockCompact from "@/features/chat/components/PollBlockCompact";
// import { usePollStore } from "@/hooks/usePollStore";
interface ChatInfo {
  id: string;
  name?: string;
  is_group?: boolean;
  participants_count?: number;
}
export default function ConversationScreen() {
  const params = useLocalSearchParams<{ chatId?: string }>();
  const chatId = params?.chatId ?? 'event';
  const { session } = useSession();
  const { messages, sendMessage, loading } = useMessagesAdvanced(chatId);
  // const { getPoll, vote, userVotes } = usePollStore();
  const headerHeight = useHeaderHeight();
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<{ id: string; senderName: string } | null>(
    null
  );

  useEffect(() => {
    if (chatId && chatId !== 'event') {
      void fetchChatInfo();
    } else {
      // Fallback pour les anciens chats mock
      setChatInfo({
        id: chatId,
        name: 'Event Chat',
        is_group: true,
        participants_count: 27,
      });
    }
  }, [chatId]);

  const fetchChatInfo = async () => {
    try {
      const { data: chat, error } = await supabase
        .from('chats')
        .select(
          `
          id,
          name,
          is_group,
          chat_participants (
            user_id,
            profiles (
              full_name,
              avatar_url
            )
          )
        `
        )
        .eq('id', chatId)
        .single();

      if (error) {
        console.error('Error fetching chat info:', error);
        return;
      }

      setChatInfo({
        id: chat.id,
        name: chat.name,
        is_group: chat.is_group,
        participants_count: chat.chat_participants?.length || 0,
      });
    } catch (error) {
      console.error('Error in fetchChatInfo:', error);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!session?.user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour envoyer des messages');
      return;
    }

    await sendMessage(text, 'text');
  };

  const handleReportMessage = (messageId: string, senderName: string) => {
    setSelectedMessage({ id: messageId, senderName });
    setShowReportModal(true);
  };

  // Logique pour déterminer les props du header
  const isGroup = chatInfo?.is_group ?? chatId === 'event';
  const headerProps: React.ComponentProps<typeof HeaderChat> = isGroup
    ? {
        type: 'group',
        title: chatInfo?.name || 'Event',
        subtitle: `${chatInfo?.participants_count || 27} Members`,
      }
    : {
        type: '1to1',
        title: chatInfo?.name || 'Martha Craig',
        subtitle: 'Online',
        avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      };

  // const avatarUrl = isGroup
  //   ? undefined
  //   : "https://randomuser.me/api/portraits/women/44.jpg";

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text>Chargement des messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <HeaderChat {...headerProps} />
      <ScribbleDivider />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          keyExtractor={(item, idx) => item.id || String(idx)}
          renderItem={({ item }) => {
            const isMyMessage = item.is_own_message || item.user_id === session?.user?.id;
            const messageTime = item.created_at
              ? new Date(item.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            switch (item.message_type) {
              case 'text':
                if (isMyMessage) {
                  return <BubbleRight text={item.content} time={messageTime} />;
                } else {
                  return (
                    <BubbleLeft
                      text={item.content}
                      avatarUrl={
                        item.sender?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${item.sender?.full_name || 'U'}&size=40`
                      }
                      time={messageTime}
                      messageId={item.id}
                      senderName={item.sender?.full_name || 'Utilisateur'}
                      onReport={handleReportMessage}
                    />
                  );
                }
              case 'image':
                return <LinkCard meta={item.metadata} />;
              case 'system':
                return (
                  <View style={{ padding: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>
                      {item.content}
                    </Text>
                  </View>
                );
              default:
                return (
                  <BubbleLeft
                    text={item.content}
                    avatarUrl={
                      item.sender?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${item.sender?.full_name || 'U'}&size=40`
                    }
                    time={messageTime}
                    messageId={item.id}
                    senderName={item.sender?.full_name || 'Utilisateur'}
                    onReport={handleReportMessage}
                  />
                );
            }
          }}
          contentContainerStyle={styles.list}
          inverted
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        <InputBar onSend={handleSendMessage} />
      </KeyboardAvoidingView>

      {showReportModal && selectedMessage && (
        <ReportModal
          visible={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setSelectedMessage(null);
          }}
          type="message"
          targetId={selectedMessage.id}
          targetName={`Message de ${selectedMessage.senderName}`}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, paddingBottom: 8 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

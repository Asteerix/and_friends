import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import ConversationScreen from '@/features/chat/screens/ConversationScreen';

export default function ChatConversationRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    // Redirect to the correct route with chatId parameter
    if (params.id) {
      router.replace(`/screens/conversation?chatId=${params.id}`);
    }
  }, [params.id, router]);

  return null;
}

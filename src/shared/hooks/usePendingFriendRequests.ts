import { useEffect, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { pendingFriendRequestsManager } from '@/shared/utils/pendingFriendRequests';
import { Alert } from 'react-native';

export const usePendingFriendRequests = () => {
  const { profile } = useProfile();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    if (profile?.id && !hasProcessed && !isProcessing) {
      processPendingRequests();
    }
  }, [profile?.id, hasProcessed, isProcessing]);

  const processPendingRequests = async () => {
    if (!profile?.id) return;

    setIsProcessing(true);
    try {
      const result = await pendingFriendRequestsManager.processPendingRequests(profile.id);
      
      if (result.sent > 0) {
        Alert.alert(
          'Friend Requests Sent',
          `${result.sent} pending friend request${result.sent > 1 ? 's were' : ' was'} sent successfully!`,
          [{ text: 'OK' }]
        );
      }

      if (result.failed > 0) {
        console.error(`Failed to send ${result.failed} friend requests`);
      }

      setHasProcessed(true);
    } catch (error) {
      console.error('Error processing pending friend requests:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    hasProcessed,
    processPendingRequests,
  };
};
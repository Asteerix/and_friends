import { useEffect, useState } from 'react';
import { offlineSyncManager } from '@/shared/utils/cache/offlineSync';

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState(() => 
    offlineSyncManager.getQueueStatus()
  );

  useEffect(() => {
    const updateStatus = () => {
      setSyncStatus(offlineSyncManager.getQueueStatus());
    };

    // Update status every second while syncing
    const interval = setInterval(updateStatus, 1000);

    // Listen for sync completion
    const unsubscribe = offlineSyncManager.onSyncComplete(updateStatus);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return {
    ...syncStatus,
    syncNow: () => offlineSyncManager.syncWithServer(),
    clearQueue: () => offlineSyncManager.clearQueue(),
  };
}
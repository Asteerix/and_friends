import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useResumableUpload } from '@/shared/hooks/useResumableUpload';
// import { useResumableUploadDebug as useResumableUpload } from '@/shared/hooks/useResumableUploadDebug';

interface UploadContextType {
  uploadQueue: ReturnType<typeof useResumableUpload>['uploadQueue'];
  createUploadTask: ReturnType<typeof useResumableUpload>['createUploadTask'];
  pauseUpload: ReturnType<typeof useResumableUpload>['pauseUpload'];
  unpauseUpload: ReturnType<typeof useResumableUpload>['unpauseUpload'];
  cancelUpload: ReturnType<typeof useResumableUpload>['cancelUpload'];
  retryUpload: ReturnType<typeof useResumableUpload>['retryUpload'];
  getUploadStatus: ReturnType<typeof useResumableUpload>['getUploadStatus'];
  getActiveUploads: ReturnType<typeof useResumableUpload>['getActiveUploads'];
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const uploadHook = useResumableUpload();

  useEffect(() => {
    // Charger la file d'attente au démarrage
    uploadHook.loadUploadQueue();
  }, []);

  return (
    <UploadContext.Provider value={uploadHook}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
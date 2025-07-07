import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { NetworkFallback } from '../ui/NetworkFallback';

interface NetworkError {
  message: string;
  timestamp: number;
  retryAction?: () => Promise<void>;
}

interface NetworkErrorContextType {
  showNetworkError: (error: NetworkError) => void;
  hideNetworkError: () => void;
  currentError: NetworkError | null;
}

const NetworkErrorContext = createContext<NetworkErrorContextType | undefined>(undefined);

export const useNetworkError = () => {
  const context = useContext(NetworkErrorContext);
  if (!context) {
    throw new Error('useNetworkError must be used within NetworkErrorProvider');
  }
  return context;
};

interface NetworkErrorProviderProps {
  children: ReactNode;
}

export const NetworkErrorProvider: React.FC<NetworkErrorProviderProps> = ({ children }) => {
  const [currentError, setCurrentError] = useState<NetworkError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const showNetworkError = useCallback((error: NetworkError) => {
    setCurrentError(error);
  }, []);

  const hideNetworkError = useCallback(() => {
    setCurrentError(null);
    setIsRetrying(false);
  }, []);

  const handleRetry = useCallback(async () => {
    if (currentError?.retryAction) {
      setIsRetrying(true);
      try {
        await currentError.retryAction();
        hideNetworkError();
      } catch (error) {
        console.error('Retry failed:', error);
      } finally {
        setIsRetrying(false);
      }
    }
  }, [currentError, hideNetworkError]);

  return (
    <NetworkErrorContext.Provider value={{ showNetworkError, hideNetworkError, currentError }}>
      {children}
      <Modal
        visible={!!currentError}
        transparent
        animationType="fade"
        onRequestClose={hideNetworkError}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <NetworkFallback
              message={currentError?.message}
              onRetry={currentError?.retryAction ? handleRetry : undefined}
              isRetrying={isRetrying}
              showRetryButton={!!currentError?.retryAction}
            />
          </View>
        </View>
      </Modal>
    </NetworkErrorContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '80%',
  },
});
import React, { useState, useCallback } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { NetworkFallback } from './NetworkFallback';
import { useNetworkError } from '@/shared/providers/NetworkErrorProvider';

export function NetworkErrorModal() {
  const { currentError, hideNetworkError } = useNetworkError();
  const [isRetrying, setIsRetrying] = useState(false);

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
  );
}

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

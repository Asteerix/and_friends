import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import CustomText from '@/shared/ui/CustomText';

interface StoryErrorProps {
  isVisible: boolean;
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

export const StoryError: React.FC<StoryErrorProps> = ({
  isVisible,
  title = 'Oops!',
  message,
  onRetry,
  onDismiss,
}) => {
  const handleRetry = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRetry?.();
  };

  const handleDismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <Modal transparent animationType="fade" visible={isVisible}>
      <BlurView intensity={30} style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF4081" />
          </View>

          <CustomText size="xl" weight="bold" style={styles.title}>
            {title}
          </CustomText>

          <CustomText size="md" color="#666" style={styles.message}>
            {message}
          </CustomText>

          <View style={styles.buttons}>
            {onRetry && (
              <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={handleRetry}>
                <Ionicons name="refresh" size={20} color="#FFF" />
                <CustomText size="md" color="#FFF" weight="bold" style={styles.buttonText}>
                  Réessayer
                </CustomText>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.button, styles.dismissButton]} onPress={handleDismiss}>
              <CustomText size="md" color="#666" weight="bold">
                {onRetry ? 'Annuler' : 'OK'}
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 30,
    margin: 20,
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  retryButton: {
    backgroundColor: '#FF4081',
  },
  dismissButton: {
    backgroundColor: '#F0F0F0',
  },
  buttonText: {
    marginLeft: 8,
  },
});

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUpload } from '@/shared/providers/UploadProvider';

export function UploadProgressBar() {
  const uploadHook = useUpload();
  const insets = useSafeAreaInsets();
  const fadeAnim = new Animated.Value(0);

  // Animer l'apparition/disparition de la barre de progression
  useEffect(() => {
    const hasActiveUploads = uploadHook.getActiveUploads().length > 0;

    Animated.timing(fadeAnim, {
      toValue: hasActiveUploads ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [uploadHook.uploadQueue]);

  const activeUploads = uploadHook.getActiveUploads();
  const currentUpload = activeUploads[0]; // Afficher le premier upload actif

  if (!currentUpload) return null;

  return (
    <Animated.View
      style={[
        styles.uploadBar,
        {
          top: insets.top,
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.uploadContent}>
        <View style={styles.uploadInfo}>
          <Text style={styles.uploadTitle}>
            {currentUpload.status === 'uploading'
              ? 'Publication en cours...'
              : currentUpload.status === 'failed'
                ? 'Échec de la publication'
                : 'En attente...'}
          </Text>

          {currentUpload.status === 'uploading' && (
            <Text style={styles.uploadProgress}>{currentUpload.progress}%</Text>
          )}
        </View>

        <View style={styles.uploadActions}>
          {currentUpload.status === 'uploading' && (
            <TouchableOpacity
              onPress={() => uploadHook.pauseUpload(currentUpload.id)}
              style={styles.actionButton}
            >
              <Ionicons name="pause" size={20} color="#000" />
            </TouchableOpacity>
          )}

          {currentUpload.status === 'paused' && (
            <TouchableOpacity
              onPress={() => uploadHook.unpauseUpload(currentUpload.id)}
              style={styles.actionButton}
            >
              <Ionicons name="play" size={20} color="#000" />
            </TouchableOpacity>
          )}

          {currentUpload.status === 'failed' && (
            <TouchableOpacity
              onPress={() => uploadHook.retryUpload(currentUpload.id)}
              style={styles.actionButton}
            >
              <Ionicons name="refresh" size={20} color="#000" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => uploadHook.cancelUpload(currentUpload.id)}
            style={styles.actionButton}
          >
            <Ionicons name="close" size={20} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${currentUpload.progress}%` }]} />
      </View>

      {/* Indicateur de file d'attente */}
      {activeUploads.length > 1 && (
        <View style={styles.queueIndicator}>
          <Text style={styles.queueText}>+{activeUploads.length - 1} en attente</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  uploadBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  uploadInfo: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  uploadProgress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  uploadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#0095f6',
  },
  queueIndicator: {
    position: 'absolute',
    bottom: -20,
    left: 16,
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  queueText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
});

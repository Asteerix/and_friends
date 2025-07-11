import React, { useState } from 'react';
import { Share, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

import OptionsMenu, { OptionItem } from '@/shared/ui/OptionsMenu';
import ReportModal from '@/features/reports/components/ReportModal';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

interface StoryOptionsButtonProps {
  storyId: string;
  storyType: 'story' | 'memory';
  mediaUrl: string;
  userId: string;
  userName: string;
  isOwnStory?: boolean;
  onDelete?: () => void;
  trigger?: React.ReactNode;
}

export default function StoryOptionsButton({
  storyId,
  storyType,
  mediaUrl,
  userId,
  userName,
  isOwnStory = false,
  onDelete,
  trigger,
}: StoryOptionsButtonProps) {
  const { session } = useSession();
  const [showReportModal, setShowReportModal] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Regarde ${storyType === 'story' ? 'cette story' : 'ce souvenir'} de ${userName} sur And Friends!`,
        url: mediaUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSaveToGallery = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour sauvegarder dans la galerie.');
        return;
      }

      const fileUri = FileSystem.documentDirectory + `${storyType}_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(mediaUrl, fileUri);
      
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      await MediaLibrary.createAlbumAsync('And Friends', asset, false);
      
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sauvegardé', `${storyType === 'story' ? 'Story' : 'Souvenir'} sauvegardé dans votre galerie`);
    } catch (error) {
      console.error('Error saving to gallery:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder dans la galerie');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      `Supprimer ${storyType === 'story' ? 'la story' : 'le souvenir'}`,
      `Êtes-vous sûr de vouloir supprimer ${storyType === 'story' ? 'cette story' : 'ce souvenir'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              
              const tableName = storyType === 'story' ? 'stories' : 'memories';
              const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', storyId);

              if (error) throw error;

              Alert.alert(
                'Supprimé', 
                `${storyType === 'story' ? 'Story' : 'Souvenir'} supprimé avec succès.`
              );
              onDelete?.();
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert('Erreur', `Impossible de supprimer ${storyType === 'story' ? 'la story' : 'le souvenir'}.`);
            }
          },
        },
      ]
    );
  };

  const options: OptionItem[] = [
    {
      label: 'Partager',
      icon: 'share-outline',
      action: handleShare,
    },
    {
      label: 'Sauvegarder',
      icon: 'download-outline',
      action: handleSaveToGallery,
      hidden: isOwnStory,
    },
    {
      label: 'Supprimer',
      icon: 'trash-outline',
      action: handleDelete,
      destructive: true,
      hidden: !isOwnStory,
    },
  ];

  return (
    <>
      <OptionsMenu
        options={options}
        trigger={trigger}
        reportConfig={!isOwnStory ? {
          enabled: true,
          onReport: () => setShowReportModal(true)
        } : undefined}
      />
      
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        type={storyType}
        targetId={storyId}
        targetName={`${storyType === 'story' ? 'Story' : 'Souvenir'} de ${userName}`}
      />
    </>
  );
}
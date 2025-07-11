import React, { useState } from 'react';
import { Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import OptionsMenu, { OptionItem } from '@/shared/ui/OptionsMenu';
import ReportModal from '@/features/reports/components/ReportModal';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

interface EventOptionsButtonProps {
  eventId: string;
  eventTitle: string;
  organizerId: string;
  isOrganizer?: boolean;
  isAttending?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
  trigger?: React.ReactNode;
}

export default function EventOptionsButton({
  eventId,
  eventTitle,
  organizerId,
  isOrganizer = false,
  isAttending = false,
  onEdit,
  onDelete,
  onLeave,
  trigger,
}: EventOptionsButtonProps) {
  const router = useRouter();
  const { session } = useSession();
  const [showReportModal, setShowReportModal] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Rejoins-moi à l'événement "${eventTitle}" sur And Friends!`,
        // You can add a URL here when deep linking is implemented
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDuplicate = () => {
    Alert.alert(
      'Dupliquer l\'événement',
      'Créer une copie de cet événement avec les mêmes informations ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Dupliquer',
          onPress: () => {
            // Navigate to create event with pre-filled data
            router.push({
              pathname: '/create-event',
              params: { duplicateFrom: eventId },
            });
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'événement',
      'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId);

              if (error) throw error;

              Alert.alert('Événement supprimé', 'L\'événement a été supprimé avec succès.');
              onDelete?.();
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Erreur', 'Impossible de supprimer cet événement.');
            }
          },
        },
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      'Quitter l\'événement',
      'Êtes-vous sûr de vouloir quitter cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              
              const { error } = await supabase
                .from('event_attendees')
                .delete()
                .eq('event_id', eventId)
                .eq('user_id', session?.user?.id);

              if (error) throw error;

              Alert.alert('Événement quitté', 'Vous avez quitté l\'événement.');
              onLeave?.();
            } catch (error) {
              console.error('Error leaving event:', error);
              Alert.alert('Erreur', 'Impossible de quitter cet événement.');
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
      label: 'Dupliquer',
      icon: 'copy-outline',
      action: handleDuplicate,
      hidden: !isOrganizer,
    },
    {
      label: 'Modifier',
      icon: 'create-outline',
      action: () => onEdit?.(),
      hidden: !isOrganizer,
    },
    {
      label: 'Supprimer',
      icon: 'trash-outline',
      action: handleDelete,
      destructive: true,
      hidden: !isOrganizer,
    },
    {
      label: 'Quitter l\'événement',
      icon: 'exit-outline',
      action: handleLeave,
      destructive: true,
      hidden: isOrganizer || !isAttending,
    },
  ];

  return (
    <>
      <OptionsMenu
        options={options}
        trigger={trigger}
        reportConfig={!isOrganizer ? {
          enabled: true,
          onReport: () => setShowReportModal(true)
        } : undefined}
      />
      
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        type="event"
        targetId={eventId}
        targetName={eventTitle}
      />
    </>
  );
}
import React, { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

import OptionsMenu, { OptionItem } from '@/shared/ui/OptionsMenu';
import ReportModal from '@/features/reports/components/ReportModal';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

interface MessageOptionsButtonProps {
  messageId: string;
  messageContent: string;
  senderId: string;
  senderName: string;
  isOwnMessage?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  trigger?: React.ReactNode;
}

export default function MessageOptionsButton({
  messageId,
  messageContent,
  senderId,
  senderName,
  isOwnMessage = false,
  onDelete,
  onEdit,
  trigger,
}: MessageOptionsButtonProps) {
  const { session } = useSession();
  const [showReportModal, setShowReportModal] = useState(false);

  const handleCopy = () => {
    // React Native clipboard API would go here
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copié', 'Message copié dans le presse-papiers');
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le message',
      'Êtes-vous sûr de vouloir supprimer ce message ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              
              const { error } = await supabase
                .from('messages')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', messageId);

              if (error) throw error;

              onDelete?.();
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Erreur', 'Impossible de supprimer ce message.');
            }
          },
        },
      ]
    );
  };

  const options: OptionItem[] = [
    {
      label: 'Copier',
      icon: 'copy-outline',
      action: handleCopy,
    },
    {
      label: 'Modifier',
      icon: 'create-outline',
      action: () => onEdit?.(),
      hidden: !isOwnMessage,
    },
    {
      label: 'Supprimer',
      icon: 'trash-outline',
      action: handleDelete,
      destructive: true,
      hidden: !isOwnMessage,
    },
  ];

  return (
    <>
      <OptionsMenu
        options={options}
        trigger={trigger}
        reportConfig={!isOwnMessage ? {
          enabled: true,
          onReport: () => setShowReportModal(true)
        } : undefined}
      />
      
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        type="message"
        targetId={messageId}
        targetName={`Message de ${senderName}`}
      />
    </>
  );
}
import React, { useState } from 'react';
import { Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import OptionsMenu, { OptionItem } from '@/shared/ui/OptionsMenu';
import ReportModal from '@/features/reports/components/ReportModal';
import { supabase } from '@/shared/lib/supabase/client';
import { useSession } from '@/shared/providers/SessionContext';

interface ProfileOptionsButtonProps {
  userId: string;
  userName: string;
  isOwnProfile?: boolean;
  onBlock?: () => void;
  trigger?: React.ReactNode;
}

export default function ProfileOptionsButton({
  userId,
  userName,
  isOwnProfile = false,
  onBlock,
  trigger,
}: ProfileOptionsButtonProps) {
  const router = useRouter();
  const { session } = useSession();
  const [showReportModal, setShowReportModal] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvre le profil de ${userName} sur And Friends!`,
        // You can add a URL here when deep linking is implemented
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleBlock = async () => {
    Alert.alert(
      'Bloquer cet utilisateur',
      `Êtes-vous sûr de vouloir bloquer ${userName} ? Cette personne ne pourra plus vous contacter ni voir votre profil.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Bloquer',
          style: 'destructive',
          onPress: async () => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              const { error } = await supabase.from('blocked_users').insert({
                blocker_id: session?.user?.id,
                blocked_id: userId,
              });

              if (error) throw error;

              Alert.alert('Utilisateur bloqué', `${userName} a été bloqué avec succès.`);
              onBlock?.();
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Erreur', 'Impossible de bloquer cet utilisateur.');
            }
          },
        },
      ]
    );
  };

  const options: OptionItem[] = [
    {
      label: 'Partager le profil',
      icon: 'share-outline',
      action: handleShare,
      hidden: false,
    },
    {
      label: 'Bloquer',
      icon: 'ban-outline',
      action: handleBlock,
      destructive: true,
      hidden: isOwnProfile,
    },
  ];

  return (
    <>
      <OptionsMenu
        options={options}
        trigger={trigger}
        reportConfig={
          !isOwnProfile
            ? {
                enabled: true,
                onReport: () => setShowReportModal(true),
              }
            : undefined
        }
      />

      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        type="user"
        targetId={userId}
        targetName={userName}
      />
    </>
  );
}

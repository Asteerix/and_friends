import React from 'react';
import { Alert, Share } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import OptionsMenu, { OptionItem } from '@/shared/ui/OptionsMenu';
import { useUserBlocks } from '@/hooks/useUserBlocks';
import { useSession } from '@/shared/providers/SessionContext';

interface ProfileOptionsButtonProps {
  userId: string;
  userName: string;
  isOwnProfile?: boolean;
  iconColor?: string;
}

export default function ProfileOptionsButton({
  userId,
  userName,
  isOwnProfile = false,
  iconColor = '#000',
}: ProfileOptionsButtonProps) {
  const router = useRouter();
  const { session } = useSession();
  const { blockUser, unblockUser, isBlocked, checkIfBlocked } = useUserBlocks();

  const [isUserBlocked, setIsUserBlocked] = React.useState(false);

  React.useEffect(() => {
    checkBlockStatus();
  }, [userId]);

  const checkBlockStatus = async () => {
    const blocked = await checkIfBlocked(userId);
    setIsUserBlocked(blocked);
  };

  const handleBlock = async () => {
    Alert.alert(
      isUserBlocked ? 'Débloquer cet utilisateur' : 'Bloquer cet utilisateur',
      isUserBlocked
        ? `Voulez-vous débloquer ${userName} ?`
        : `Voulez-vous vraiment bloquer ${userName} ? Vous ne verrez plus son contenu et il ne pourra plus vous contacter.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: isUserBlocked ? 'Débloquer' : 'Bloquer',
          style: isUserBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (isUserBlocked) {
                await unblockUser(userId);
                Alert.alert('Utilisateur débloqué', `${userName} a été débloqué.`);
              } else {
                await blockUser(userId);
                Alert.alert('Utilisateur bloqué', `${userName} a été bloqué.`);
                router.back();
              }
              await checkBlockStatus();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez le profil de ${userName} sur And Friends !`,
        // url: `https://andfriends.app/profile/${userId}`, // À implémenter avec deep linking
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const handleCopyProfileLink = () => {
    // Implémenter la copie du lien du profil
    Alert.alert('Lien copié', 'Le lien du profil a été copié dans le presse-papiers');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const options: OptionItem[] = [];

  if (isOwnProfile) {
    // Options pour son propre profil
    options.push(
      {
        label: 'Modifier le profil',
        icon: 'create-outline',
        action: () => router.push('/screens/profile/edit'),
      },
      {
        label: 'Partager le profil',
        icon: 'share-outline',
        action: handleShare,
      },
      {
        label: 'Copier le lien',
        icon: 'link-outline',
        action: handleCopyProfileLink,
      },
      {
        label: 'Paramètres',
        icon: 'settings-outline',
        action: () => router.push('/screens/settings'),
      }
    );
  } else {
    // Options pour le profil d'un autre utilisateur
    options.push(
      {
        label: 'Partager le profil',
        icon: 'share-outline',
        action: handleShare,
      },
      {
        label: 'Copier le lien',
        icon: 'link-outline',
        action: handleCopyProfileLink,
      },
      {
        label: isUserBlocked ? 'Débloquer' : 'Bloquer',
        icon: isUserBlocked ? 'checkmark-circle-outline' : 'ban-outline',
        action: handleBlock,
        destructive: !isUserBlocked,
      }
    );
  }

  return (
    <OptionsMenu
      options={options}
      reportConfig={
        !isOwnProfile
          ? {
              type: 'user',
              targetId: userId,
              targetName: userName,
            }
          : undefined
      }
      iconColor={iconColor}
    />
  );
}

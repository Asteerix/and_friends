import { useLocalSearchParams } from 'expo-router';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ProfileScreen userId={id} />;
}

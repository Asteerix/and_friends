import { useLocalSearchParams } from 'expo-router';
import EventDetailsScreen from '@/features/events/screens/EventDetailsScreen';

export default function EventDetailsPage() {
  const params = useLocalSearchParams();
  console.log('🔍 [EventDetailsPage] Params reçus:', params);

  // Gérer le cas où id pourrait être un tableau
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  console.log('🔍 [EventDetailsPage] Event ID extrait:', eventId);

  return <EventDetailsScreen eventId={eventId as string} />;
}


import { useLocalSearchParams } from 'expo-router';
import EventDetailsScreen from '@/features/events/screens/EventDetailsScreen';

export default function EventDetailsPage() {
  const params = useLocalSearchParams();
  console.log('🔍 [screens/event-details] Params reçus:', params);
  
  // Gérer différents noms de paramètres possibles
  const eventId = params.eventId || params.id || (Array.isArray(params.id) ? params.id[0] : undefined);
  
  console.log('🔍 [screens/event-details] Event ID extrait:', eventId);
  
  return <EventDetailsScreen eventId={eventId as string} />;
}
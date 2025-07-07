
import HomeScreen from '@/features/home/screens/HomeScreen';
import { withNetworkFallback } from '@/shared/ui/withNetworkFallback';

export default withNetworkFallback(HomeScreen, {
  customMessage: "Impossible de charger les événements. Vérifie ta connexion internet.",
});
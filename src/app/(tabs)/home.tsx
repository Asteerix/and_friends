import HomeScreen from '@/features/home/screens/HomeScreen';
import { withNetworkFallback } from '@/shared/ui/withNetworkFallback';
import { withSafeScreen } from '@/shared/ui/SafeScreenWrapper';

// Wrap with both safety mechanisms
const NetworkAwareHomeScreen = withNetworkFallback(HomeScreen, {
  customMessage: 'Impossible de charger les événements. Vérifie ta connexion internet.',
  enableOfflineMode: false,
});

export default withSafeScreen(NetworkAwareHomeScreen, {
  screenName: 'Home',
  requiresAuth: true,
});

import { Redirect } from 'expo-router';

export default function Index() {
  // Always start with splash screen
  // The splash screen will handle session checking and navigation
  return <Redirect href="/splash" />;
}

import { useEffect } from "react";
import { Platform, Alert } from "react-native";

export function useSimulatorWarning() {
  useEffect(() => {
    // iOS Simulator (Expo Go)
    if (
      Platform.OS === "ios" &&
      // @ts-ignore
      navigator?.userAgent?.includes("Simulator")
    ) {
      Alert.alert(
        "Limitation du simulateur",
        "Le fast reload/HMR ne fonctionne pas sur le simulateur iOS avec Expo Go. Teste sur un vrai appareil pour une meilleure expérience."
      );
    }
    // Android Emulator (optionnel)
    if (
      Platform.OS === "android" &&
      // @ts-ignore
      navigator?.userAgent?.includes("Android SDK built for x86")
    ) {
      Alert.alert(
        "Limitation de l'émulateur",
        "Certaines fonctionnalités peuvent ne pas marcher sur l'émulateur Android. Teste sur un vrai appareil pour une meilleure expérience."
      );
    }
  }, []);
}

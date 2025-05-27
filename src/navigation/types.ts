export type AuthStackParamList = {
  AuthRouterController: undefined; // Écran de contrôle pour la redirection
  PhoneVerification: undefined;
  CodeVerification: {
    fullPhoneNumber: string; // e.g., +33612345678 (pour affichage et référence)
    phone: string; // e.g., 612345678 (numéro national pour le hook)
    callingCode: string; // e.g., 33 (pour le hook)
    countryCode: string; // e.g., FR (pour le hook)
  };
  NameInput: undefined;
  AvatarPick: undefined;
  ContactsPermission: undefined;
  LocationPermission: undefined;
  AgeInput: undefined;
  PathInput: undefined;
  JamPicker: undefined;
  RestaurantPicker: undefined;
  HobbyPicker: undefined;
  LoadingScreen: undefined; // Écran de chargement final de l'onboarding
};

export type AppScreensParamList = {
  Home: undefined;
  Map: undefined;
  // ... autres écrans de l'application principale
};

export type AppRootStackParamList = {
  InitialSplashOrLoading: undefined;
  AppCore: undefined; // Va rendre soit AuthStack soit AppStackNav
};

export type HomeStackParamList = {
  Home: undefined;
};

export type EventStackParamList = {
  EventDetails: { id: string };
};

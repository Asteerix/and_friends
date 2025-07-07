import { StackScreenProps } from '@react-navigation/stack';

export type AuthStackParamList = {
  PhoneVerification: undefined;
  CodeVerification: {
    phone: string;
    callingCode: string;
    countryCode: string;
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
  Loading: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="phone-verification" />
      <Stack.Screen name="code-verification" />
      <Stack.Screen name="name-input" />
      <Stack.Screen name="avatar-pick" />
      <Stack.Screen name="contacts-permission" />
      <Stack.Screen name="location-permission" />
      <Stack.Screen name="age-input" />
      <Stack.Screen name="path-input" />
      <Stack.Screen name="jam-picker" />
      <Stack.Screen name="restaurant-picker" />
      <Stack.Screen name="hobby-picker" />
      <Stack.Screen name="loading" />
    </Stack>
  );
}
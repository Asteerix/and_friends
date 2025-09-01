import { Tabs, useRouter } from 'expo-router';
import { Platform, TouchableOpacity } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { rs, rf } from '@/shared/utils/responsive';

// SVG components for tab icons
const HomeIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24">
    <Path
      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M9 22V12h6v10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const MemoriesIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24">
    <Rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth="2" fill="none" />
    <Rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth="2" fill="none" />
    <Rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth="2" fill="none" />
    <Rect x="14" y="14" width="7" height="7" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const CreateIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
  </Svg>
);

const CalendarIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24">
    <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" fill="none" />
    <Path
      d="M16 2v4M8 2v4M3 10h18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const ProfileIcon = ({ color }: { color: string }) => (
  <Svg width="24" height="24" viewBox="0 0 24 24">
    <Path
      d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Circle
      cx="12"
      cy="7"
      r="4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#E8F4E8',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? rs(88) : rs(64),
          paddingBottom: Platform.OS === 'ios' ? rs(24) : rs(8),
          paddingTop: rs(8),
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: rf(12),
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
          marginTop: rs(4),
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          title: 'Memories',
          tabBarIcon: ({ color }) => <MemoriesIcon color={color} />,
          tabBarButton: (props) => {
            // Filter out null values from props
            const cleanProps = Object.entries(props).reduce((acc, [key, value]) => {
              if (value !== null) {
                acc[key as keyof typeof props] = value;
              }
              return acc;
            }, {} as any);

            return (
              <TouchableOpacity
                {...cleanProps}
                onPress={() => {
                  router.push('/screens/memories');
                }}
              />
            );
          },
        }}
      />
      <Tabs.Screen
        name="my-events"
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => <CreateIcon color={color} />,
          tabBarLabel: 'Create',
          tabBarButton: (props) => {
            // Filter out null values from props
            const cleanProps = Object.entries(props).reduce((acc, [key, value]) => {
              if (value !== null) {
                acc[key as keyof typeof props] = value;
              }
              return acc;
            }, {} as any);

            return (
              <TouchableOpacity
                {...cleanProps}
                onPress={() => {
                  router.push('/screens/create-event');
                }}
              />
            );
          },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <CalendarIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}

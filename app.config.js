export default {
  expo: {
    scheme: "andfriends",
    name: "& friends",
    slug: "andfriends",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#FF6B6B"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.asteerix.andfriends",
      buildNumber: "7",
      associatedDomains: [
        "applinks:andfriends.app",
        "applinks:*.andfriends.app"
      ],
      infoPlist: {
        NSContactsUsageDescription: "& friends needs access to your contacts to help you find and connect with friends who are already using the app.",
        NSLocationWhenInUseUsageDescription: "& friends uses your location to show you events happening nearby and connect you with friends in your area.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "& friends uses your location to show you events happening nearby and notify you when friends are hosting events near you.",
        NSCameraUsageDescription: "& friends needs access to your camera to take photos for your profile and share memories from events.",
        NSPhotoLibraryUsageDescription: "& friends needs access to your photo library to let you choose photos for your profile and share memories from events.",
        NSCalendarsUsageDescription: "& friends needs access to your calendar to add events you're attending.",
        NSMicrophoneUsageDescription: "& friends needs access to your microphone to record audio messages.",
        NSPhotoLibraryAddUsageDescription: "& friends needs permission to save photos to your photo library.",
        NSUserTrackingUsageDescription: "& friends uses this to provide you with a better experience and show relevant content."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FF6B6B"
      },
      package: "com.amaury_polta.and_friends",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "andfriends.app",
              pathPrefix: "/story"
            },
            {
              scheme: "andfriends"
            }
          ],
          category: [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ],
      permissions: [
        "android.permission.READ_CONTACTS",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_CALENDAR",
        "android.permission.WRITE_CALENDAR",
        "android.permission.RECORD_AUDIO",
        "android.permission.WRITE_CONTACTS",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-localization",
      "expo-web-browser",
      "expo-contacts",
      "expo-location",
      "expo-image-picker",
      "expo-calendar",
      "expo-av",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "& friends uses your location to show you events happening nearby and notify you when friends are hosting events near you."
        }
      ],
      "expo-font",
      "expo-splash-screen"
    ],
    extra: {
      supabaseUrl: "https://rmwgfiwngqciixbgluuq.supabase.co",
      supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtd2dmaXduZ3FjaWl4YmdsdXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNzU2NjMsImV4cCI6MjA2Mjc1MTY2M30.hQfym-9WtseC1stlaLkn4qGa_crkhYF3yjlHY-ei4qo",
      testEmail: process.env.EXPO_PUBLIC_TEST_EMAIL || "test@example.com",
      eas: {
        projectId: "ecce79da-4892-496a-b081-325473306ef1"
      }
    },
    owner: "amaury_polta"
  }
};
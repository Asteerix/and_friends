import { NavigationContainer, StackActions } from "@react-navigation/native";
import {
  createStackNavigator,
  StackNavigationProp,
} from "@react-navigation/stack";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  InteractionManager, // Import InteractionManager
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getDeviceLanguage, t } from "./locales";
import PhoneVerificationScreen from "./screens/auth/01_PhoneVerificationScreen";
import CodeVerificationScreen from "./screens/auth/02_CodeVerificationScreen";
import NameInputScreen from "./screens/auth/03_NameInputScreen";
import AvatarPickScreen from "./screens/auth/04_AvatarPickScreen";
import ContactsPermissionScreen from "./screens/auth/05_ContactsPermissionScreen";
import LocationPermissionScreen from "./screens/auth/06_LocationPermissionScreen";
import AgeInputScreen from "./screens/auth/07_AgeInputScreen";
import PathInputScreen from "./screens/auth/08_PathInputScreen";
import JamPickerScreen from "./screens/auth/09_JamPickerScreen";
import RestaurantPickerScreen from "./screens/auth/10_RestaurantPickerScreen";
import HobbyPickerScreen from "./screens/auth/11_HobbyPickerScreen";
import LoadingScreen from "./screens/auth/12_LoadingScreen";
import HomeScreen from "./screens/HomeScreen";
import { supabase } from "../lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { SessionContext, useSession } from "./lib/SessionContext";
import { useOnboardingStatus } from "./hooks/useOnboardingStatus";
import { useNavigation, useIsFocused } from "@react-navigation/native";
// import AsyncStorage from "@react-native-async-storage/async-storage"; // Non utilisé directement
import {
  AppRootStackParamList,
  AuthStackParamList,
  AppScreensParamList,
} from "./navigation/types";
import AppStackNavigator from "./navigation/AppStackNavigator";
import MapScreen from "./screens/MapScreen";

const { width: W, height: H } = Dimensions.get("window");
const rnd = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

type SplashScreenNavigationProp = StackNavigationProp<
  AppRootStackParamList,
  "InitialSplashOrLoading"
>;

const useShapeAnimation = (
  initialX: number,
  initialY: number,
  initialScale: number = 1,
  initialRotate: number = 0,
  baseOpacity: number = 0.7
) => {
  const animatedValue = useRef(
    new Animated.ValueXY({ x: initialX, y: initialY })
  ).current;
  const scaleValue = useRef(new Animated.Value(initialScale)).current;
  const rotateValue = useRef(new Animated.Value(initialRotate)).current;
  const opacityValue = useRef(new Animated.Value(baseOpacity)).current;

  useEffect(() => {
    const EASE_OUT_SINE = Easing.bezier(0.61, 1, 0.88, 1);
    const D_FADE_IN_OVERALL = 450;
    const D_AMPERSAND_APPEAR_DELAY = 80;
    const D_AMPERSAND_OPACITY = 350;
    const D_AMPERSAND_SPRING_FRICTION = 4.5;
    const D_AMPERSAND_SPRING_TENSION = 50;
    const D_AMPERSAND_PAUSE = 750;
    const D_AMPERSAND_TRANSITION = 650;
    const D_CONTENT_APPEAR = 550;
    const D_CONTENT_DELAY_TAGLINE = 120;
    const D_CONTENT_DELAY_BUTTON = 220;
    const D_BUTTON_EASING_BACK = 1.25;

    Animated.sequence([
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: D_FADE_IN_OVERALL,
        easing: EASE_OUT_SINE,
        useNativeDriver: true,
      }),
      Animated.delay(D_AMPERSAND_APPEAR_DELAY),
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: D_AMPERSAND_OPACITY,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: D_AMPERSAND_SPRING_FRICTION,
          tension: D_AMPERSAND_SPRING_TENSION,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(D_AMPERSAND_PAUSE),
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: D_AMPERSAND_TRANSITION,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue.y, {
          toValue: -H * 0.14,
          duration: D_AMPERSAND_TRANSITION,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0.42,
          duration: D_AMPERSAND_TRANSITION,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: D_CONTENT_APPEAR,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue.y, {
          toValue: 0,
          duration: D_CONTENT_APPEAR,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue.x, {
          toValue: 0,
          duration: D_CONTENT_APPEAR,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue.x, {
          toValue: 0,
          duration: D_CONTENT_APPEAR,
          delay: D_CONTENT_DELAY_TAGLINE,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue.x, {
          toValue: 0,
          duration: D_CONTENT_APPEAR + 100,
          delay: D_CONTENT_DELAY_BUTTON,
          easing: Easing.out(Easing.back(D_BUTTON_EASING_BACK)),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    animatedValue,
    baseOpacity,
    initialRotate,
    initialScale,
    initialX,
    initialY,
    opacityValue,
    rotateValue,
    scaleValue,
  ]);

  const rotateInterpolation = rotateValue.interpolate({
    inputRange: [-360, 360],
    outputRange: ["-360deg", "360deg"],
  });

  return {
    transform: [
      ...animatedValue.getTranslateTransform(),
      { scale: scaleValue },
      { rotate: rotateInterpolation },
    ],
    opacity: opacityValue,
  };
};

interface AnimatedShapeProps {
  color: string;
  initialX: number;
  initialY: number;
  width: number;
  height: number;
  borderRadius: number;
  initialScale?: number;
  initialRotate?: number;
  baseOpacity?: number;
}

const AnimatedShape: React.FC<AnimatedShapeProps> = ({
  color,
  initialX,
  initialY,
  width,
  height,
  borderRadius,
  initialScale,
  initialRotate,
  baseOpacity,
}) => {
  const { transform, opacity: animatedOpacity } = useShapeAnimation(
    initialX,
    initialY,
    initialScale,
    initialRotate,
    baseOpacity
  );
  return (
    <Animated.View
      style={[
        styles.backgroundShape,
        {
          top: 0,
          left: 0,
          width,
          height,
          backgroundColor: color,
          borderRadius,
        },
        { transform, opacity: animatedOpacity },
      ]}
    />
  );
};

const AnimatedBlurredBackground: React.FC = () => {
  const shapesConfig: AnimatedShapeProps[] = [
    {
      color: "#3B82F6",
      initialX: -W * 0.15,
      initialY: -H * 0.25,
      width: W * 1.3,
      height: H * 0.9,
      borderRadius: W * 0.7,
      initialScale: 1.1,
      baseOpacity: 0.7,
      initialRotate: rnd(-4, 4),
    },
    {
      color: "#EC4899",
      initialX: W * 0.25,
      initialY: H * 0.05,
      width: W * 1.1,
      height: H * 0.8,
      borderRadius: W * 0.6,
      initialScale: 0.9,
      baseOpacity: 0.7,
      initialRotate: rnd(-4, 4),
    },
    {
      color: "#F97316",
      initialX: -W * 0.2,
      initialY: H * 0.45,
      width: W * 1.0,
      height: H * 0.65,
      borderRadius: W * 0.5,
      initialScale: 1.0,
      baseOpacity: 0.7,
      initialRotate: rnd(-4, 4),
    },
    {
      color: "#14B8A6",
      initialX: W * 0.35,
      initialY: H * 0.2,
      width: W * 0.9,
      height: H * 0.55,
      borderRadius: W * 0.45,
      initialScale: 1.05,
      baseOpacity: 0.7,
      initialRotate: rnd(-4, 4),
    },
    {
      color: "#A78BFA",
      initialX: W * 0.0,
      initialY: H * 0.6,
      width: W * 0.8,
      height: W * 0.8,
      borderRadius: W * 0.4,
      initialScale: 0.95,
      baseOpacity: 0.7,
      initialRotate: rnd(-4, 4),
    },
    {
      color: "#0F766E",
      initialX: -W * 0.05,
      initialY: H * 0.7,
      width: W * 1.5,
      height: H * 0.45,
      borderRadius: W * 0.25,
      initialScale: 1.0,
      baseOpacity: 0.9,
      initialRotate: rnd(-2, 2),
    },
  ];
  return (
    <View style={styles.absoluteFillContainer} pointerEvents="none">
      {shapesConfig.map((shapeProps, index) => (
        <AnimatedShape key={index} {...shapeProps} />
      ))}
      <BlurView
        intensity={Platform.OS === "ios" ? 90 : 130}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

interface SplashScreenProps {
  navigation: SplashScreenNavigationProp;
  needsAuth?: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation, needsAuth = false }) => {
  const insets = useSafeAreaInsets();
  const overallOpacity = useRef(new Animated.Value(0)).current;
  const ampersandOpacity = useRef(new Animated.Value(0)).current;
  const ampersandScale = useRef(new Animated.Value(0.5)).current;
  const ampersandY = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const appNameY = useRef(new Animated.Value(20)).current;
  const taglineY = useRef(new Animated.Value(20)).current;
  const buttonY = useRef(new Animated.Value(60)).current;
  const [animationsComplete, setAnimationsComplete] = useState(false);
  const navigationPerformedRef = useRef(false);
  const lang = getDeviceLanguage();

  useEffect(() => {
    const EASE_IN_OUT_SINE = Easing.bezier(0.37, 0, 0.63, 1);
    const EASE_OUT_SINE = Easing.bezier(0.61, 1, 0.88, 1);
    const D_FADE_IN_OVERALL = 450;
    const D_AMPERSAND_APPEAR_DELAY = 80;
    const D_AMPERSAND_OPACITY = 350;
    const D_AMPERSAND_SPRING_FRICTION = 4.5;
    const D_AMPERSAND_SPRING_TENSION = 50;
    const D_AMPERSAND_PAUSE = 750;
    const D_AMPERSAND_TRANSITION = 650;
    const D_CONTENT_APPEAR = 550;
    const D_CONTENT_DELAY_TAGLINE = 120;
    const D_CONTENT_DELAY_BUTTON = 220;
    const D_BUTTON_EASING_BACK = 1.25;
    Animated.sequence([
      Animated.timing(overallOpacity, {
        toValue: 1,
        duration: D_FADE_IN_OVERALL,
        easing: EASE_OUT_SINE,
        useNativeDriver: true,
      }),
      Animated.delay(D_AMPERSAND_APPEAR_DELAY),
      Animated.parallel([
        Animated.timing(ampersandOpacity, {
          toValue: 1,
          duration: D_AMPERSAND_OPACITY,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.spring(ampersandScale, {
          toValue: 1,
          friction: D_AMPERSAND_SPRING_FRICTION,
          tension: D_AMPERSAND_SPRING_TENSION,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(D_AMPERSAND_PAUSE),
      Animated.parallel([
        Animated.timing(ampersandY, {
          toValue: -(H * 0.14),
          duration: D_AMPERSAND_TRANSITION,
          easing: EASE_IN_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.timing(ampersandScale, {
          toValue: 0.42,
          duration: D_AMPERSAND_TRANSITION,
          easing: EASE_IN_OUT_SINE,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: D_CONTENT_APPEAR,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.timing(appNameY, {
          toValue: 0,
          duration: D_CONTENT_APPEAR,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.timing(taglineY, {
          toValue: 0,
          duration: D_CONTENT_APPEAR,
          delay: D_CONTENT_DELAY_TAGLINE,
          easing: EASE_OUT_SINE,
          useNativeDriver: true,
        }),
        Animated.timing(buttonY, {
          toValue: 0,
          duration: D_CONTENT_APPEAR + 100,
          delay: D_CONTENT_DELAY_BUTTON,
          easing: Easing.out(Easing.back(D_BUTTON_EASING_BACK)),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => setAnimationsComplete(true));
  }, [
    ampersandOpacity,
    ampersandScale,
    ampersandY,
    appNameY,
    buttonY,
    contentOpacity,
    overallOpacity,
    taglineY,
  ]);

  useEffect(() => {
    if (animationsComplete && !navigationPerformedRef.current) {
      const timer = setTimeout(() => {
        if (!navigationPerformedRef.current) {
          navigationPerformedRef.current = true;
          console.log(`[SplashScreen] 🚀 Navigation automatique: needsAuth=${needsAuth}`);
          navigation.dispatch(StackActions.replace("AppCore"));
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [animationsComplete, navigation, needsAuth]);

  const handleContinuePress = () => {
    if (!navigationPerformedRef.current) {
      navigationPerformedRef.current = true;
      console.log(`[SplashScreen] 🚀 Navigation manuelle: needsAuth=${needsAuth}`);
      navigation.dispatch(StackActions.replace("AppCore"));
    }
  };

  return (
    <Animated.View
      style={[styles.splashContainer, { opacity: overallOpacity }]}
    >
      <AnimatedBlurredBackground />
      <View
        style={[
          styles.foregroundContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Animated.View
          style={[
            styles.ampersandWrapper,
            {
              opacity: ampersandOpacity,
              transform: [
                { translateY: ampersandY },
                { scale: ampersandScale },
              ],
            },
          ]}
        >
          <Text style={styles.ampersandText}>&</Text>
        </Animated.View>
        <Animated.View
          style={[styles.mainContentContainer, { opacity: contentOpacity }]}
        >
          <Animated.Text
            style={[styles.appName, { transform: [{ translateY: appNameY }] }]}
          >
            FRIENDS
          </Animated.Text>
          <Animated.Text
            style={[styles.tagline, { transform: [{ translateY: taglineY }] }]}
          >
            {lang === "fr"
              ? "Plus de doutes.\nDes vrais plans, des vraies personnes,\nque du bon temps."
              : "No more guessing.\nReal plans, real people,\nreal good times."}
          </Animated.Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.buttonWrapper,
            { opacity: contentOpacity, transform: [{ translateY: buttonY }] },
          ]}
        >
          <Pressable
            onPress={handleContinuePress}
            style={({ pressed }) => [
              styles.buttonPressable,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View
              style={[
                styles.button,
                { backgroundColor: "rgba(255, 255, 255, 0.25)" },
              ]}
            >
              <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
                {t("continue", lang).toUpperCase()}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const AppStackNav = createStackNavigator<AppScreensParamList>();
const AppRootStack = createStackNavigator<AppRootStackParamList>();

function GlobalLoadingScreen() {
  return (
    <View style={styles.globalLoadingContainer}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}

// Type guard to check if a string is a key of AuthStackParamList
function isAuthStackKey(
  key: string,
  routeNames: ReadonlyArray<string>
): key is keyof AuthStackParamList {
  return routeNames.includes(key);
}

function AuthRouterController() {
  const navigation = useNavigation<StackNavigationProp<AuthStackParamList>>();
  const { currentStep, loading: onboardingLoading } = useOnboardingStatus();
  const isFocused = useIsFocused();

  useEffect(() => {
    // Using InteractionManager to defer navigation until after interactions/animations are complete.
    // This can help if the navigator isn't fully ready when the screen first mounts.
    // A simple setTimeout(..., 0) can also work.
    const task = InteractionManager.runAfterInteractions(() => {
      console.log(
        `[App.tsx] AuthRouterController: InteractionManager task running. IsFocused: ${isFocused}, OnboardingLoading: ${onboardingLoading}, CurrentStep: ${currentStep}`
      );

      if (!isFocused || onboardingLoading) {
        console.log(
          "[App.tsx] AuthRouterController: Conditions not met for navigation (not focused or onboarding loading inside InteractionManager)."
        );
        return;
      }

      const navState = navigation.getState();
      if (!navState) {
        console.warn(
          "[App.tsx] AuthRouterController: navState is undefined (inside InteractionManager). Cannot proceed."
        );
        return;
      }
      const currentActualRouteName = navState.routes[navState.index]?.name;
      console.log(
        `[App.tsx] AuthRouterController: Current route from navigation.getState() is "${currentActualRouteName}". Route names in this navigator: ${navState.routeNames.join(
          ", "
        )}`
      );

      let targetRoute: keyof AuthStackParamList = "PhoneVerification"; // Default

      if (
        currentStep &&
        isAuthStackKey(
          currentStep,
          navState.routeNames as ReadonlyArray<string>
        )
      ) {
        targetRoute = currentStep;
      } else if (currentStep) {
        console.warn(
          `[App.tsx] AuthRouterController: currentStep "${currentStep}" is not a valid AuthStack route. Defaulting to PhoneVerification.`
        );
      }

      if (currentActualRouteName !== targetRoute) {
        console.log(
          `[App.tsx] AuthRouterController: Attempting RESET from "${currentActualRouteName}" to "${targetRoute}".`
        );
        navigation.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        });
      } else {
        console.log(
          `[App.tsx] AuthRouterController: Already on target route "${targetRoute}". No reset needed.`
        );
      }
    });

    return () => {
      task.cancel(); // Cleanup InteractionManager task
      console.log(
        "[App.tsx] AuthRouterController: useEffect cleanup, InteractionManager task cancelled."
      );
    };
  }, [currentStep, onboardingLoading, isFocused, navigation]);

  return null;
}

function AuthScreens() {
  console.log(
    "[App.tsx] 🔐 AuthScreens RENDU: Rendering AuthStack.Navigator with initialRouteName: AuthRouterController"
  );
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="AuthRouterController"
    >
      <AuthStack.Screen
        name="AuthRouterController"
        component={AuthRouterController}
      />
      <AuthStack.Screen
        name="PhoneVerification"
        component={PhoneVerificationScreen}
      />
      <AuthStack.Screen
        name="CodeVerification"
        component={CodeVerificationScreen}
        options={{ animation: "none" }}
      />
      <AuthStack.Screen
        name="NameInput"
        component={NameInputScreen}
        options={{ animation: "none" }}
      />
      <AuthStack.Screen
        name="AvatarPick"
        component={AvatarPickScreen}
        options={{ animation: "none" }}
      />
      <AuthStack.Screen
        name="ContactsPermission"
        component={ContactsPermissionScreen}
        options={{ animation: "none" }}
      />
      <AuthStack.Screen
        name="LocationPermission"
        component={LocationPermissionScreen}
        options={{ animation: "none" }}
      />
      <AuthStack.Screen
        name="AgeInput"
        component={AgeInputScreen}
        options={{ animation: "none" }}
      />
      <AuthStack.Screen
        name="PathInput"
        component={PathInputScreen}
        options={{ animation: "none" }}
      />
      <AuthStack.Screen
        name="JamPicker"
        component={JamPickerScreen}
        options={{ animation: "none" }}
      />
      <AuthStack.Screen
        name="RestaurantPicker"
        component={RestaurantPickerScreen}
        options={{ animation: "none" }}
      />
      <AuthStack.Screen
        name="HobbyPicker"
        component={HobbyPickerScreen}
        options={{ animation: "none" }}
      />
      <AuthStack.Screen
        name="LoadingScreen"
        component={LoadingScreen}
        options={{ animation: "none" }}
      />
    </AuthStack.Navigator>
  );
}

function AppScreens() {
  console.log("[App.tsx] 📱 AppScreens RENDU: Rendering AppStackNavigator");
  return <AppStackNavigator />;
}

function MainContentDecider() {
  const { session, loading: sessionLoading } = useSession();
  const {
    isComplete: isOnboardingComplete,
    loading: onboardingLoading,
    currentStep,
  } = useOnboardingStatus();

  console.log(
    `[App.tsx] 🔍 MainContentDecider RENDER: sessionLoading=${sessionLoading}, onboardingLoading=${onboardingLoading}, session=${!!session}, session.user=${!!session?.user}, isOnboardingComplete=${isOnboardingComplete}, currentStep=${currentStep}`
  );

  if (sessionLoading || onboardingLoading) {
    console.log(
      `[App.tsx] ⏳ RETOURNE GlobalLoadingScreen: Session: ${sessionLoading}, Onboarding: ${onboardingLoading}`
    );
    return <GlobalLoadingScreen />;
  }

  // PREMIÈRE VÉRIFICATION : Session d'authentification
  if (!session || !session.user) {
    console.log(
      `[App.tsx] 🚫 RETOURNE AuthScreens (pas de session): Session: ${!!session}, User: ${!!session?.user}`
    );
    return <AuthScreens />;
  }

  // DEUXIÈME VÉRIFICATION : Profil d'onboarding
  if (isOnboardingComplete !== true) {
    console.log(
      `[App.tsx] 🚫 RETOURNE AuthScreens (profil incomplet): isComplete=${isOnboardingComplete}, currentStep=${currentStep}`
    );
    return <AuthScreens />;
  }

  // L'utilisateur est authentifié ET son profil est complet
  console.log(
    `[App.tsx] ✅ RETOURNE AppScreens: Utilisateur authentifié avec profil complet.`
  );
  return <AppScreens />;
}

function InitialSplashOrLoadingScreen({
  navigation,
}: {
  navigation: SplashScreenNavigationProp;
}) {
  const { session, loading: sessionLoading } = useSession();
  const { isComplete: isOnboardingComplete, loading: onboardingLoading } = useOnboardingStatus();

  console.log(
    `[App.tsx] 🔍 InitialSplashOrLoadingScreen: sessionLoading=${sessionLoading}, onboardingLoading=${onboardingLoading}, session=${!!session}, user=${!!session?.user}, isOnboardingComplete=${isOnboardingComplete}`
  );

  if (sessionLoading || onboardingLoading) {
    console.log(
      "[App.tsx] ⏳ InitialSplashOrLoadingScreen: Session/Onboarding loading. Showing GlobalLoadingScreen."
    );
    return <GlobalLoadingScreen />;
  }

  // Vérifier si l'utilisateur a besoin d'authentification
  const needsAuth = !session || !session.user || isOnboardingComplete !== true;
  
  console.log(
    `[App.tsx] 🔍 InitialSplashOrLoadingScreen: needsAuth=${needsAuth}`
  );

  console.log(
    "[App.tsx] 🎨 InitialSplashOrLoadingScreen: Session context loaded. Showing SplashScreen."
  );
  return <SplashScreen navigation={navigation} needsAuth={needsAuth} />;
}

export default function App() {
  const [sessionState, setSessionState] = useState<Session | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const justSignedInRef = useRef(false);

  useEffect(() => {
    console.log("[App.tsx] App Mount: Initializing Supabase auth listener.");
    setLoadingState(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        `[App.tsx] onAuthStateChange: Event: ${event}, Session User: ${
          session?.user?.id ?? "null"
        }`
      );

      let newSessionState = session;
      let newLoadingState = loadingState; // Capture current loading state

      if (event === "INITIAL_SESSION") {
        newLoadingState = false;
      } else if (event === "SIGNED_IN") {
        newLoadingState = false;
        justSignedInRef.current = true;
        setTimeout(() => {
          justSignedInRef.current = false;
        }, 1000);
      } else if (event === "SIGNED_OUT") {
        if (justSignedInRef.current) {
          console.warn(
            "[App.tsx] onAuthStateChange: SIGNED_OUT event post SIGNED_IN. Re-verifying."
          );
          const {
            data: { session: reVerifiedSession },
          } = await supabase.auth.getSession();
          if (reVerifiedSession) {
            console.log(
              "[App.tsx] onAuthStateChange: Re-verification found active session."
            );
            newSessionState = reVerifiedSession;
          } else {
            newSessionState = null;
          }
        } else {
          newSessionState = null;
        }
        newLoadingState = false;
      } else if (
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED" ||
        event === "PASSWORD_RECOVERY"
      ) {
        // Session is updated, loading state should only turn false if it was true and we now have a session or know there isn't one
        if (newLoadingState) newLoadingState = false;
      } else {
        // Other events
        if (newLoadingState) newLoadingState = false;
      }

      // Only update state if values have actually changed to prevent unnecessary re-renders
      if (
        sessionState?.user?.id !== newSessionState?.user?.id ||
        sessionState?.access_token !== newSessionState?.access_token
      ) {
        setSessionState(newSessionState);
      }
      if (loadingState !== newLoadingState) {
        setLoadingState(newLoadingState);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSupabaseSession } }) => {
        console.log(
          "[App.tsx] supabase.auth.getSession() on mount: ",
          initialSupabaseSession?.user?.id ?? "No session"
        );
        // This is mostly a fallback or for initial sync if onAuthStateChange is delayed.
        // The main logic for setting session and loading is within onAuthStateChange.
        if (loadingState && !sessionState && initialSupabaseSession) {
          // If still loading, no session yet from onAuthStateChange, but getSession has one.
          // This could indicate INITIAL_SESSION hasn't fired.
          // setSessionState(initialSupabaseSession); // Consider if this is needed or if relying on INITIAL_SESSION is better.
          // setLoadingState(false);
        } else if (loadingState && !sessionState && !initialSupabaseSession) {
          // Still loading, no session from onAuthStateChange, no session from getSession.
          // onAuthStateChange should eventually fire INITIAL_SESSION (even with null session) and set loadingState to false.
        }
      })
      .catch((error) => {
        console.error("[App.tsx] Error in getSession() on mount:", error);
        if (loadingState) setLoadingState(false); // Ensure loading stops on error
      });

    return () => {
      console.log(
        "[App.tsx] App Unmount: Unsubscribing from onAuthStateChange."
      );
      subscription.unsubscribe();
    };
  }, []); // Deliberately empty dependency array for mount/unmount behavior.

  useEffect(() => {
    console.log(
      `[App.tsx] State Change: sessionUser: ${
        sessionState?.user?.id ?? "null"
      }, loading: ${loadingState}`
    );
  }, [sessionState, loadingState]);

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <SessionContext.Provider
        value={{
          session: sessionState,
          loading: loadingState,
          setSession: setSessionState,
        }}
      >
        <NavigationContainer>
          <AppRootStack.Navigator screenOptions={{ headerShown: false }}>
            <AppRootStack.Screen
              name="InitialSplashOrLoading"
              component={InitialSplashOrLoadingScreen}
            />
            <AppRootStack.Screen
              name="AppCore"
              component={MainContentDecider}
            />
          </AppRootStack.Navigator>
        </NavigationContainer>
      </SessionContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  globalLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0EA5E9",
  },
  splashContainer: { flex: 1, backgroundColor: "#0EA5E9" },
  absoluteFillContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundShape: { position: "absolute" },
  foregroundContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ampersandWrapper: { position: "absolute" },
  ampersandText: {
    fontSize: W / 1.8,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 7,
  },
  mainContentContainer: { alignItems: "center", justifyContent: "center" },
  appName: {
    fontFamily: Platform.OS === "ios" ? "Georgia-Bold" : "serif",
    fontSize: W / 8,
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 2.5,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 5,
    marginTop: H * 0.08,
  },
  tagline: {
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: W / 18,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: (W / 18) * 1.55,
    marginTop: H * 0.035,
    paddingHorizontal: W * 0.06,
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  buttonWrapper: {
    position: "absolute",
    bottom: "11%",
    width: "100%",
    alignItems: "center",
  },
  buttonPressable: { borderRadius: W * 0.1 },
  button: {
    paddingVertical: H * 0.022,
    paddingHorizontal: W * 0.2,
    borderRadius: W * 0.1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: W / 22,
    fontWeight: Platform.OS === "ios" ? "500" : "600",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});

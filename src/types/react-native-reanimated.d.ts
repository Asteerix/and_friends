declare module 'react-native-reanimated' {
  // Re-export everything from the main module
  export * from 'react-native-reanimated/lib/typescript/Animated';
  export { default } from 'react-native-reanimated/lib/typescript/Animated';

  // Specific exports that TypeScript might not recognize
  export const useSharedValue: any;
  export const useAnimatedStyle: any;
  export const withTiming: any;
  export const withSequence: any;
  export const Easing: any;
  export const FadeIn: any;
  export const FadeInDown: any;
  export const FadeInUp: any;
  export const SlideInLeft: any;
  export const SlideInRight: any;
  export const SlideInUp: any;
  export const SlideInDown: any;
  export const ZoomIn: any;
  export const interpolate: any;
  export const runOnJS: any;
}

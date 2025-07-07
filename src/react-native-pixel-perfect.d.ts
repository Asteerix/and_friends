declare module 'react-native-pixel-perfect' {
  interface DesignResolution {
    width: number;
    height: number;
  }

  type PerfectSize = (size: number) => number;

  export function create(designResolution: DesignResolution): PerfectSize;
}

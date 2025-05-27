import React from "react";
import Svg, { Path } from "react-native-svg";

// Pour remplacer ce composant par un PNG, importer l'image et utiliser <Image source={require('../assets/scribble.png')} ... />

type Props = {
  width: number;
  height?: number;
  style?: any;
};

export default function Scribble({ width, height = 3, style }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      style={style}
      viewBox={`0 0 ${width} ${height}`}
    >
      <Path
        d={`M0 ${height / 2} Q ${width / 4} ${height}, ${width / 2} ${
          height / 2
        } T ${width} ${height / 2}`}
        stroke="#000"
        strokeWidth={height}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </Svg>
  );
}

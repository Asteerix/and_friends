import React from "react";
import { Image, StyleSheet } from "react-native";

type Props = {
  source: any;
};

export default function HeroImage({ source }: Props) {
  return <Image source={source} style={styles.img} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  img: {
    width: 312,
    height: 312,
    borderRadius: 0,
    marginTop: 24,
    alignSelf: "center",
  },
});

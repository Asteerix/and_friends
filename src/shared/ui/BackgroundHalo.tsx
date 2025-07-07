import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';


const BackgroundHalo: React.FC = () => (
  <LinearGradient
    colors={['#A855F7', '#EC4899', '#F97316', '#14B8A6', '#A78BFA', '#A855F7']}
    locations={[0, 0.2, 0.4, 0.6, 0.8, 1]}
    start={{ x: 0, y: 0.5 }}
    end={{ x: 1, y: 0.5 }}
    style={StyleSheet.absoluteFill}
  />
);

export default BackgroundHalo;

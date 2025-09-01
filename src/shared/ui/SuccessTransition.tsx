import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

interface SuccessTransitionProps {
  isActive: boolean;
  onAnimationComplete: () => void;
  duration?: number; // Durée totale de l'animation (fondu inclus)
}

const SuccessTransition: React.FC<SuccessTransitionProps> = ({
  isActive,
  onAnimationComplete,
  duration = 1100, // Durée par défaut ajustée (plus courte)
}) => {
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const haloScale = useRef(new Animated.Value(0.92)).current;
  const rotationProgress = useRef(new Animated.Value(0)).current;
  const [gradientPoints, setGradientPoints] = useState({
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  });
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const listenerId = rotationProgress.addListener(({ value }) => {
      const angle = value * 2 * Math.PI;
      const xDir = Math.cos(angle);
      const yDir = Math.sin(angle);
      setGradientPoints({
        start: { x: 0.5 - xDir * 0.5, y: 0.5 - yDir * 0.5 },
        end: { x: 0.5 + xDir * 0.5, y: 0.5 + yDir * 0.5 },
      });
    });
    return () => {
      rotationProgress.removeListener(listenerId);
    };
  }, [rotationProgress]);

  useEffect(() => {
    if (isActive) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(haloOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(rotationProgress, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(haloOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShouldRender(false);
            onAnimationComplete?.();
          });
        }, duration - 300);
      });
    }
  }, [
    isActive,
    duration,
    onAnimationComplete,
    haloOpacity,
    haloScale,
    rotationProgress,
    shouldRender,
  ]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        {
          opacity: haloOpacity,
          transform: [{ scale: haloScale }],
        },
      ]}
      pointerEvents="none"
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={<View style={styles.maskElementContainer} />}
      >
        <View style={[StyleSheet.absoluteFill, styles.haloBase]}>
          <LinearGradient
            colors={['#A855F7', '#EC4899', '#F97316', '#14B8A6', '#A78BFA', '#A855F7']} // Boucler sur la première couleur pour une transition douce
            locations={[0, 0.2, 0.4, 0.6, 0.8, 1]} // Ajuster les locations
            start={gradientPoints.start}
            end={gradientPoints.end}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </MaskedView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Le positionnement absoluteFill est appliqué directement
  },
  maskElementContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: Platform.OS === 'ios' ? 12 : 10, // Épaisseur du halo, légèrement réduite pour Android pour éviter les coupures
    borderColor: 'black', // Opaque pour le masque
    borderRadius: Platform.OS === 'ios' ? 38 : 30, // Coins arrondis, ajustés pour Android
  },
  haloBase: {
    // L'ombre est difficile à reproduire fidèlement avec MaskedView et LinearGradient de manière performante.
    // Pour la simplicité et la performance, l'ombre directe est omise ici.
    // Si une ombre est cruciale, elle pourrait être appliquée à l'Animated.View externe,
    // mais elle ne sera pas masquée par la bordure.
  },
});

export default SuccessTransition;

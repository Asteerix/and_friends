import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, SafeAreaView, StatusBar } from 'react-native';
import { create } from 'react-native-pixel-perfect';
import { Feather } from '@expo/vector-icons';
import { BanStatus } from '@/shared/utils/bruteforceProtection';

const designResolution = { width: 375, height: 812 };
const perfectSize = create(designResolution);

interface BannedScreenProps {
  banStatus: BanStatus;
}

const BannedScreen: React.FC<BannedScreenProps> = ({ banStatus }) => {
  const [timeRemaining, setTimeRemaining] = useState(banStatus.timeRemainingSeconds || 0);

  useEffect(() => {
    // Update timer every second
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          // Reload app or navigate away
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#FF3B30" />
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Feather name="alert-octagon" size={perfectSize(80)} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>Accès Temporairement Bloqué</Text>

          <Text style={styles.subtitle}>Trop de tentatives de connexion échouées</Text>

          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              Pour des raisons de sécurité, votre accès a été temporairement suspendu suite à
              plusieurs tentatives de connexion infructueuses.
            </Text>
          </View>

          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Temps restant avant déblocage:</Text>
            <Text style={styles.timer}>{formatTime(timeRemaining)}</Text>
          </View>

          {banStatus.phoneNumber && (
            <View style={styles.phoneContainer}>
              <Text style={styles.phoneLabel}>Numéro concerné:</Text>
              <Text style={styles.phoneNumber}>{banStatus.phoneNumber}</Text>
            </View>
          )}

          <View style={styles.warningContainer}>
            <Feather name="info" size={perfectSize(20)} color="#FFD60A" />
            <Text style={styles.warningText}>
              Les tentatives répétées peuvent entraîner des blocages plus longs
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Si vous pensez qu'il s'agit d'une erreur, veuillez patienter ou contacter le support.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF3B30',
  },
  container: {
    flex: 1,
    backgroundColor: '#FF3B30',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: perfectSize(32),
  },
  iconContainer: {
    marginBottom: perfectSize(32),
    padding: perfectSize(24),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: perfectSize(80),
  },
  title: {
    fontSize: perfectSize(28),
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: perfectSize(12),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  subtitle: {
    fontSize: perfectSize(18),
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: perfectSize(24),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: perfectSize(16),
    padding: perfectSize(20),
    marginBottom: perfectSize(32),
  },
  message: {
    fontSize: perfectSize(16),
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: perfectSize(24),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: perfectSize(24),
  },
  timerLabel: {
    fontSize: perfectSize(14),
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: perfectSize(8),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  timer: {
    fontSize: perfectSize(48),
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-light',
  },
  phoneContainer: {
    alignItems: 'center',
    marginBottom: perfectSize(32),
  },
  phoneLabel: {
    fontSize: perfectSize(14),
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: perfectSize(4),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  phoneNumber: {
    fontSize: perfectSize(16),
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 10, 0.15)',
    borderRadius: perfectSize(12),
    padding: perfectSize(16),
    marginTop: perfectSize(16),
  },
  warningText: {
    flex: 1,
    fontSize: perfectSize(14),
    color: '#FFD60A',
    marginLeft: perfectSize(12),
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  footer: {
    paddingHorizontal: perfectSize(32),
    paddingBottom: perfectSize(48),
  },
  footerText: {
    fontSize: perfectSize(14),
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});

export default BannedScreen;

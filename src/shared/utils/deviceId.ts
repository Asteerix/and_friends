import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = '@device_id';

/**
 * Gets or creates a unique device ID for this installation
 * This ID persists across app sessions but is reset if app is reinstalled
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID
    const existingId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existingId) {
      return existingId;
    }

    // Generate new device ID
    const deviceInfo = [
      Device.deviceName || 'unknown',
      Device.modelName || 'unknown',
      Device.osName || 'unknown',
      Device.osVersion || 'unknown',
      Date.now().toString(),
      Math.random().toString()
    ].join('-');

    // Create a hash of device info for privacy
    const deviceId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      deviceInfo,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    // Store the device ID
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    
    return deviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Fallback to a random ID if there's an error
    const fallbackId = `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, fallbackId);
    } catch (e) {
      // Ignore storage errors
    }
    return fallbackId;
  }
}
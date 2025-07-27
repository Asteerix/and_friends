import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { errorLogger } from './errorLogger';

interface TestFlightLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  context?: any;
}

class TestFlightLogger {
  private static instance: TestFlightLogger;
  private logs: TestFlightLog[] = [];
  private isTestFlight: boolean = false;
  private readonly LOG_KEY = '@testflight_logs';
  private readonly MAX_LOGS = 200;

  private constructor() {
    this.checkIfTestFlight();
    this.loadPersistedLogs();
  }

  static getInstance(): TestFlightLogger {
    if (!TestFlightLogger.instance) {
      TestFlightLogger.instance = new TestFlightLogger();
    }
    return TestFlightLogger.instance;
  }

  private async checkIfTestFlight() {
    try {
      if (Platform.OS === 'ios') {
        // Check if running in TestFlight
        const bundleId = Application.applicationId;
        const isStoreReceipt = await this.hasStoreReceipt();
        const isDebug = __DEV__;
        
        // TestFlight has a store receipt but is not in production
        this.isTestFlight = !isDebug && isStoreReceipt && !Constants.isDevice;
        
        this.log('TestFlight detection', 'info', {
          bundleId,
          isStoreReceipt,
          isDebug,
          isDevice: Constants.isDevice,
          isTestFlight: this.isTestFlight,
          appStoreUrl: Constants.expoConfig?.ios?.appStoreUrl,
          nativeApplicationVersion: Constants.nativeApplicationVersion,
          nativeBuildVersion: Constants.nativeBuildVersion
        });
      }
    } catch (error) {
      errorLogger.log(error as Error, { context: 'TestFlight detection' });
    }
  }

  private async hasStoreReceipt(): Promise<boolean> {
    try {
      // In TestFlight, there's a receipt file
      const { FileSystem } = await import('expo-file-system');
      const receiptPath = `${FileSystem.bundleDirectory}/_MASReceipt/receipt`;
      const info = await FileSystem.getInfoAsync(receiptPath);
      return info.exists;
    } catch {
      return false;
    }
  }

  private async loadPersistedLogs() {
    try {
      const stored = await AsyncStorage.getItem(this.LOG_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load persisted logs:', error);
    }
  }

  private async persistLogs() {
    try {
      await AsyncStorage.setItem(this.LOG_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  log(message: string, level: TestFlightLog['level'] = 'info', context?: any) {
    const log: TestFlightLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    this.logs.push(log);
    
    // Keep logs under limit
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Persist important logs
    if (level === 'error' || this.isTestFlight) {
      this.persistLogs();
    }

    // Console output with TestFlight indicator
    const prefix = this.isTestFlight ? '[TestFlight]' : '[Dev]';
    if (level === 'error') {
      console.error(`${prefix} ${message}`, context);
    } else if (level === 'warning') {
      console.warn(`${prefix} ${message}`, context);
    } else {
      console.log(`${prefix} ${message}`, context);
    }
  }

  async showDebugInfo() {
    if (!this.isTestFlight && !__DEV__) return;

    const deviceInfo = {
      brand: Device.brand,
      deviceName: Device.deviceName,
      deviceYearClass: Device.deviceYearClass,
      isDevice: Device.isDevice,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      totalMemory: Device.totalMemory
    };

    const appInfo = {
      version: Constants.expoConfig?.version,
      nativeApplicationVersion: Constants.nativeApplicationVersion,
      nativeBuildVersion: Constants.nativeBuildVersion,
      isTestFlight: this.isTestFlight
    };

    const recentErrors = this.logs.filter(log => log.level === 'error').slice(-5);

    Alert.alert(
      'Debug Information',
      `App: ${JSON.stringify(appInfo, null, 2)}\n\n` +
      `Device: ${JSON.stringify(deviceInfo, null, 2)}\n\n` +
      `Recent Errors: ${recentErrors.length}`,
      [
        { text: 'Show Logs', onPress: () => this.showLogs() },
        { text: 'Clear Logs', onPress: () => this.clearLogs() },
        { text: 'Close', style: 'cancel' }
      ]
    );
  }

  async showLogs() {
    const recentLogs = this.logs.slice(-20);
    const logText = recentLogs
      .map(log => `[${log.level.toUpperCase()}] ${log.timestamp}\n${log.message}`)
      .join('\n\n');

    Alert.alert(
      'Recent Logs',
      logText || 'No logs available',
      [{ text: 'OK' }]
    );
  }

  async clearLogs() {
    this.logs = [];
    await AsyncStorage.removeItem(this.LOG_KEY);
    this.log('Logs cleared', 'info');
  }

  getLogs(): TestFlightLog[] {
    return [...this.logs];
  }

  getIsTestFlight(): boolean {
    return this.isTestFlight;
  }
}

export const testFlightLogger = TestFlightLogger.getInstance();
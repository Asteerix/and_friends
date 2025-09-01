import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface StartupLog {
  timestamp: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  context?: any;
}

class StartupLogger {
  private logs: StartupLog[] = [];
  private startTime = Date.now();

  async init() {
    this.log('App startup initiated', 'info', {
      platform: Platform.OS,
      version: Constants.expoConfig?.version,
      isDevice: Device.isDevice,
      deviceName: Device.deviceName,
      osVersion: Device.osVersion,
      modelName: Device.modelName,
      brand: Device.brand,
      manufacturer: Device.manufacturer,
    });

    // Check if app crashed last time
    try {
      const lastCrash = await AsyncStorage.getItem('lastAppCrash');
      if (lastCrash) {
        this.log('Previous app crash detected', 'warning', JSON.parse(lastCrash));
        await AsyncStorage.removeItem('lastAppCrash');
      }
    } catch (error) {
      this.log('Failed to check last crash', 'error', error);
    }
  }

  log(message: string, level: StartupLog['level'] = 'info', context?: any) {
    const log: StartupLog = {
      timestamp: new Date().toISOString(),
      message,
      level,
      context,
    };

    this.logs.push(log);

    const elapsed = Date.now() - this.startTime;
    const prefix = `[Startup +${elapsed}ms] [${level.toUpperCase()}]`;

    if (level === 'error') {
      console.error(prefix, message, context);
    } else if (level === 'warning') {
      console.warn(prefix, message, context);
    } else {
      console.log(prefix, message, context);
    }
  }

  async recordCrash(error: Error) {
    try {
      await AsyncStorage.setItem(
        'lastAppCrash',
        JSON.stringify({
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack,
          logs: this.logs,
        })
      );
    } catch (e) {
      console.error('Failed to record crash', e);
    }
  }

  getLogs(): StartupLog[] {
    return [...this.logs];
  }

  getStartupTime(): number {
    return Date.now() - this.startTime;
  }
}

export const startupLogger = new StartupLogger();

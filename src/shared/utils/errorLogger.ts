import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface ErrorLogEntry {
  timestamp: string;
  error: string;
  stack?: string;
  context?: any;
  platform: string;
  version: string;
  buildNumber?: string;
  deviceInfo?: any;
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100;

  log(error: Error | string, context?: any) {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      platform: Platform.OS,
      version: Constants.expoConfig?.version || 'unknown',
      buildNumber: Constants.nativeBuildVersion || undefined,
      deviceInfo: {
        osVersion: Platform.Version,
        isDevice: Constants.isDevice,
        deviceName: Constants.deviceName,
      },
    };

    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // In production, send to crash reporting service
    if (!__DEV__) {
      this.sendToCrashlytics(entry);
    }

    console.error('[ErrorLogger]', entry);
  }

  private sendToCrashlytics(entry: ErrorLogEntry) {
    // Integrate with crash reporting service
    // Example: Sentry, Bugsnag, Firebase Crashlytics
  }

  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  getLogString(): string {
    return this.logs
      .map((log) => `[${log.timestamp}] ${log.error}\n${log.stack || 'No stack trace'}`)
      .join('\n\n');
  }
}

export const errorLogger = new ErrorLogger();

// Global error handler
export function setupGlobalErrorHandler() {
  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    errorLogger.log(error, { isFatal });

    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  // Handle unhandled promise rejections
  if (!__DEV__ && typeof global !== 'undefined' && global.onunhandledrejection !== undefined) {
    const originalRejectionHandler = global.onunhandledrejection;
    global.onunhandledrejection = function (event: PromiseRejectionEvent) {
      errorLogger.log(new Error(`Unhandled promise rejection: ${event.reason}`), {
        type: 'unhandledRejection',
      });
      if (originalRejectionHandler) {
        originalRejectionHandler.call(this, event);
      }
    };
  }
}

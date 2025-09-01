/**
 * Centralized logging utility for the application
 * Replaces direct console usage with environment-aware logging
 */

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  eventId?: string;
  error?: Error;
  [key: string]: unknown;
}

class Logger {
  private static instance: Logger;
  private isDev: boolean;

  private constructor() {
    this.isDev = __DEV__;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  info(message: string, context?: LogContext): void {
    if (this.isDev) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isDev) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      error: error || new Error(message),
      stack: error?.stack,
    };
    if (this.isDev) {
      console.error(this.formatMessage('error', message, errorContext));
    }
    // In production, you might want to send to crash reporting service
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDev) {
      console.log(this.formatMessage('debug', message, context));
    }
  }
}

export const logger = Logger.getInstance();

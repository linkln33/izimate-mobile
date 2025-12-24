/**
 * Centralized logging utility
 * Replaces console.log/error/warn with environment-aware logging
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Get log level from environment or default to INFO in production, DEBUG in development
const getLogLevel = (): LogLevel => {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return process.env.EXPO_PUBLIC_LOG_LEVEL as LogLevel || 'DEBUG';
  }
  return process.env.EXPO_PUBLIC_LOG_LEVEL as LogLevel || 'INFO';
};

const currentLogLevel = getLogLevel();
const logLevelValue = LOG_LEVELS[currentLogLevel];

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= logLevelValue;
};

interface LogContext {
  [key: string]: any;
}

class Logger {
  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (shouldLog('DEBUG')) {
      if (__DEV__) {
        console.log(this.formatMessage('DEBUG', message, context));
      }
    }
  }

  info(message: string, context?: LogContext): void {
    if (shouldLog('INFO')) {
      console.log(this.formatMessage('INFO', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (shouldLog('ERROR')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      };
      console.error(this.formatMessage('ERROR', message, errorContext));
    }
  }

  // Convenience methods for common patterns
  log(message: string, context?: LogContext): void {
    this.info(message, context);
  }

  // Group related logs
  group(label: string): void {
    if (__DEV__ && shouldLog('DEBUG')) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (__DEV__ && shouldLog('DEBUG')) {
      console.groupEnd();
    }
  }

  // Time operations
  time(label: string): void {
    if (__DEV__ && shouldLog('DEBUG')) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (__DEV__ && shouldLog('DEBUG')) {
      console.timeEnd(label);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for convenience
export default logger;


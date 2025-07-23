type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enabled: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;
  private context?: string;

  constructor(context?: string) {
    this.context = context;
    this.config = {
      level: import.meta.env.DEV ? 'debug' : 'info',
      enabled: import.meta.env.VITE_LOG_ENABLED !== 'false',
      includeTimestamp: true,
      includeContext: true,
    };

    // Override with environment variables if present
    const envLevel = import.meta.env.VITE_LOG_LEVEL as LogLevel;
    if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
      this.config.level = envLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): [string, ...any[]] {
    let prefix = '';

    if (this.config.includeTimestamp) {
      prefix += `[${new Date().toISOString()}] `;
    }

    prefix += `[${level.toUpperCase()}]`;

    if (this.config.includeContext && this.context) {
      prefix += ` [${this.context}]`;
    }

    return [`${prefix} ${message}`, ...args];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage('error', message, ...args));
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  createChild(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context;
    const child = new Logger(childContext);
    child.config = { ...this.config };
    return child;
  }
}

// Create and export default logger instance
export const logger = new Logger();

// Export factory function for creating contextual loggers
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Export Logger class for type usage
export type { Logger };

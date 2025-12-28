type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: LogContext;
    component?: string;
    requestId?: string;
    userId?: string;
    duration?: number;
    error?: {
        message: string;
        stack?: string;
        name?: string;
    };
}

interface LoggerConfig {
    level: LogLevel;
    format: 'json' | 'pretty';
    context?: LogContext;
}

interface Timer {
    done: (message?: string, context?: LogContext) => void;
}

class Logger {
    private config: LoggerConfig;
    private persistentContext: LogContext;

    constructor(config?: Partial<LoggerConfig>, persistentContext?: LogContext) {
        const nodeEnv = process.env.NODE_ENV || 'development';
        const logLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';
        const logFormat = process.env.LOG_FORMAT?.toLowerCase() === 'json'
            ? 'json'
            : nodeEnv === 'production' ? 'json' : 'pretty';

        this.config = {
            level: config?.level || logLevel,
            format: config?.format || logFormat,
            context: config?.context || {}
        };
        this.persistentContext = persistentContext || {};
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.config.level);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

    private formatPretty(entry: LogEntry): string {
        const timestamp = new Date(entry.timestamp).toLocaleTimeString();

        // Level colors and emojis
        const levelConfig: Record<LogLevel, { color: string; emoji: string; label: string }> = {
            debug: { color: '\x1b[36m', emoji: '🔍', label: 'DEBUG' },
            info: { color: '\x1b[32m', emoji: 'ℹ️ ', label: 'INFO ' },
            warn: { color: '\x1b[33m', emoji: '⚠️ ', label: 'WARN ' },
            error: { color: '\x1b[31m', emoji: '❌', label: 'ERROR' }
        };

        const reset = '\x1b[0m';
        const gray = '\x1b[90m';
        const { color, emoji, label } = levelConfig[entry.level];

        let output = `${gray}[${timestamp}]${reset} ${color}${emoji} ${label}${reset} ${entry.message}`;

        // Add component if present
        if (entry.component) {
            output += ` ${gray}[${entry.component}]${reset}`;
        }

        // Add duration if present
        if (entry.duration !== undefined) {
            output += ` ${gray}(${entry.duration}ms)${reset}`;
        }

        // Add context
        const contextData = { ...entry.context };
        if (entry.requestId) contextData.requestId = entry.requestId;
        if (entry.userId) contextData.userId = entry.userId;

        if (Object.keys(contextData).length > 0) {
            output += `\n  ${gray}${JSON.stringify(contextData, null, 2).split('\n').join('\n  ')}${reset}`;
        }

        // Add error details
        if (entry.error) {
            output += `\n  ${color}Error: ${entry.error.message}${reset}`;
            if (entry.error.stack) {
                output += `\n  ${gray}${entry.error.stack.split('\n').slice(1).join('\n  ')}${reset}`;
            }
        }

        return output;
    }

    private formatJson(entry: LogEntry): string {
        return JSON.stringify(entry);
    }

    private emit(entry: LogEntry): void {
        if (!this.shouldLog(entry.level)) {
            return;
        }

        const formatted = this.config.format === 'json'
            ? this.formatJson(entry)
            : this.formatPretty(entry);

        switch (entry.level) {
            case 'error':
                console.error(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            case 'debug':
                console.debug(formatted);
                break;
            default:
                console.log(formatted);
                break;
        }
    }

    private serializeError(error: unknown): LogEntry['error'] | undefined {
        if (!error) return undefined;

        if (error instanceof Error) {
            return {
                message: error.message,
                stack: error.stack,
                name: error.name
            };
        }

        if (typeof error === 'string') {
            return { message: error };
        }

        return {
            message: String(error)
        };
    }

    private log(level: LogLevel, message: string, context?: LogContext): void {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context: { ...this.persistentContext, ...this.config.context, ...context }
        };

        // Extract special fields
        if (entry.context) {
            if (entry.context.component) {
                entry.component = String(entry.context.component);
                delete entry.context.component;
            }
            if (entry.context.requestId) {
                entry.requestId = String(entry.context.requestId);
                delete entry.context.requestId;
            }
            if (entry.context.userId) {
                entry.userId = String(entry.context.userId);
                delete entry.context.userId;
            }
            if (entry.context.duration !== undefined) {
                entry.duration = Number(entry.context.duration);
                delete entry.context.duration;
            }
            if (entry.context.error) {
                entry.error = this.serializeError(entry.context.error);
                delete entry.context.error;
            }

            // Clean up empty context
            if (Object.keys(entry.context).length === 0) {
                delete entry.context;
            }
        }

        this.emit(entry);
    }

    /**
     * Log a debug message (lowest priority)
     * Use for detailed diagnostic information
     */
    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    /**
     * Log an informational message
     * Use for general application flow and state changes
     */
    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    /**
     * Log a warning message
     * Use for potentially harmful situations or deprecated features
     */
    warn(message: string, context?: LogContext): void {
        this.log('warn', message, context);
    }

    /**
     * Log an error message (highest priority)
     * Use for error events that might still allow the application to continue
     */
    error(message: string, context?: LogContext): void {
        this.log('error', message, context);
    }

    /**
     * Create a child logger with persistent context
     * Useful for component-specific or request-scoped logging
     */
    child(context: LogContext): Logger {
        return new Logger(this.config, { ...this.persistentContext, ...context });
    }

    /**
     * Start a performance timer
     * Returns a timer object with a done() method to log completion time
     */
    startTimer(): Timer {
        const start = Date.now();
        const parentLogger = this;

        return {
            done(message?: string, context?: LogContext) {
                const duration = Date.now() - start;
                const logMessage = message || 'Operation completed';
                parentLogger.info(logMessage, { ...context, duration });
            }
        };
    }

    /**
     * Measure the execution time of an async function
     */
    async measure<T>(
        operation: string,
        fn: () => Promise<T>,
        context?: LogContext
    ): Promise<T> {
        const timer = this.startTimer();
        try {
            const result = await fn();
            timer.done(`${operation} completed`, context);
            return result;
        } catch (error) {
            const duration = Date.now() - (timer as any).start;
            this.error(`${operation} failed`, { ...context, error, duration });
            throw error;
        }
    }
}

// Default logger instance
export const logger = new Logger();

// Export Logger class
export { Logger };

// Export types for consumers  
export type { LogLevel, LogContext };

// Helper function to create a logger with persistent context
export function createLogger(context: LogContext): Logger {
    return new Logger(undefined, context);
}

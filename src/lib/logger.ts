type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogPayload = {
    level: LogLevel;
    message: string;
    time: string;
    meta?: Record<string, unknown>;
};

function emit(payload: LogPayload) {
    const line = JSON.stringify(payload);
    switch (payload.level) {
        case 'error':
            console.error(line);
            break;
        case 'warn':
            console.warn(line);
            break;
        case 'debug':
            console.debug(line);
            break;
        default:
            console.log(line);
            break;
    }
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    emit({
        level,
        message,
        time: new Date().toISOString(),
        meta
    });
}

export const logger = {
    debug(message: string, meta?: Record<string, unknown>) {
        log('debug', message, meta);
    },
    info(message: string, meta?: Record<string, unknown>) {
        log('info', message, meta);
    },
    warn(message: string, meta?: Record<string, unknown>) {
        log('warn', message, meta);
    },
    error(message: string, meta?: Record<string, unknown>) {
        log('error', message, meta);
    }
};


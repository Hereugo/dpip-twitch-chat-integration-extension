export type LogLevel = 'LOG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
    timestamp: string;
    type: LogLevel;
    message: unknown;
}

export default class Logger {
    private logs: LogEntry[] = [];
    private colors: Record<LogLevel, string> = {
        LOG: 'background: gray; color: white; padding: 2px 4px; border-radius: 4px;',
        INFO: 'background: blue; color: white; padding: 2px 4px; border-radius: 4px;',
        WARN: 'background: orange; color: white; padding: 2px 4px; border-radius: 4px;',
        ERROR: 'background: red; color: white; padding: 2px 4px; border-radius: 4px;',
    };

    log(message: unknown): void {
        this.add('LOG', message);
    }

    info(message: unknown): void {
        this.add('INFO', message);
    }

    warn(message: unknown): void {
        this.add('WARN', message);
    }

    error(message: unknown): void {
        this.add('ERROR', message);
    }

    getLogs(type?: LogLevel): LogEntry[] {
        return type
            ? this.logs.filter((log) => log.type === type)
            : [...this.logs];
    }

    clearLogs(): void {
        this.logs = [];
    }

    private add(type: LogLevel, message: unknown): void {
        const timestamp = new Date().toISOString();
        const entry: LogEntry = { timestamp, type, message };
        this.logs.push(entry);

        const colorStyle = this.colors[type];
        const text = this.stringify(message);

        // styled console output (works in Chromium-based browsers and DevTools)
        // eslint-disable-next-line no-console
        console.log(
            `%c[${timestamp}] [%c${type}%c] ${text}`,
            'color: inherit;',
            colorStyle,
            'color: inherit;'
        );
    }

    private stringify(value: unknown): string {
        if (typeof value === 'string') return value;
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
}

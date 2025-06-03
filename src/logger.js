export default class Logger {
    constructor() {
        this.logs = [];
        this.colors = {
            LOG: 'background: gray; color: white; padding: 2px 4px; border-radius: 4px;',
            INFO: 'background: blue; color: white; padding: 2px 4px; border-radius: 4px;',
            WARN: 'background: orange; color: white; padding: 2px 4px; border-radius: 4px;',
            ERROR: 'background: red; color: white; padding: 2px 4px; border-radius: 4px;',
        };
    }

    log(message) {
        this._addLog('LOG', message);
    }

    info(message) {
        this._addLog('INFO', message);
    }

    warn(message) {
        this._addLog('WARN', message);
    }

    error(message) {
        this._addLog('ERROR', message);
    }

    _addLog(type, message) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, type, message };
        this.logs.push(logEntry);

        const colorStyle =
            this.colors[type] ||
            'background: gray; color: white; padding: 2px 4px; border-radius: 4px;';
        console.log(
            `%c[${timestamp}] [%c${type}%c] ${message}`,
            'color: inherit;',
            colorStyle,
            'color: inherit;'
        );
    }

    getLogs(type = null) {
        if (type) {
            return this.logs.filter((log) => log.type === type.toUpperCase());
        }
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
    }
}

import { ILogEntry, LogLevel } from "./interfaces.js";

export interface ILogger {
    readonly category: string;
    
    write(level: LogLevel, ...data: any[]): void;

    trace(...data: any[]): void;
    info(...data: any[]): void;
    log(...data: any[]): void;
    warn(...data: any[]): void;
    error(...data: any[]): void;
}

export class Logger implements ILogger {
    private static readonly _loggers = new Map<string, Logger>();
    private static readonly _callbacks: { (entry: ILogEntry): void }[] = [];

    /**
     * @internal
     */
    static reset(): void {
        for (let logger of this._loggers.values()) {
            logger._nextEventIndex = 0;
            logger.write(LogLevel.INIT);
        }
    }
    
    static get(category: string): ILogger {
        let logger = this._loggers.get(category);

        if (logger == null) {
            logger = new Logger(category);
            this._loggers.set(category, logger);

            logger.write(LogLevel.INIT);
        }

        return logger;
    }

    static addCallback(callback: { (entry: ILogEntry): void }): void {
        this._callbacks.push(callback);
    }

    readonly category: string;

    private _nextEventIndex = 0;

    private constructor(category: string) {
        this.category = category;
    }

    private static readonly SKIP_STACK_PATTERN = /^(Error$|\s*at Logger\.[a-zA-Z0-9]+)/;
    private static readonly STACK_FRAME_PATTERN = /^\s*at\s(?:[^(]+\()?file:\/\/\/(?<path>.+\.(?:js|ts))(?:\?v=[0-9]+)?:(?<line>[0-9]+):(?<column>[0-9]+)\)?\s*$/;

    static parseSourceLocation(stackFrame: string): { file: string, line: number } {
        const match = stackFrame.match(Logger.STACK_FRAME_PATTERN);

        if (!match) {
            return { file: "", line: -1 }
        }

        return {
            file: match[1],
            line: parseInt(match[2])
        };
    }

    write(level: LogLevel, data?: any[]): number {
        const stackLines = new Error().stack.split("\n");

        while (stackLines.length > 0 && stackLines[0].match(Logger.SKIP_STACK_PATTERN)) {
            stackLines.shift();
        }

        const entry: ILogEntry = {
            category: this.category,
            index: this._nextEventIndex++,
            level: level,
            data: data ?? [],
            stack: stackLines.join("\n"),
            ...Logger.parseSourceLocation(stackLines[0])
        };

        for (let callback of Logger._callbacks) {
            callback(entry);
        }

        return entry.index;
    }

    trace(...data: any[]): number {        
        return this.write(LogLevel.TRACE, data);
    }

    info(...data: any[]): number {
        return this.write(LogLevel.INFO, data);
    }

    log(...data: any[]): number {
        return this.write(LogLevel.LOG, data);
    }

    warn(...data: any[]): number {
        return this.write(LogLevel.WARNING, data);
    }

    error(...data: any[]): number {
        return this.write(LogLevel.ERROR, data);
    }
}

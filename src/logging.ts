import { ILogEntry, LogLevel } from "./interfaces.js";

export interface ILogger {
    readonly category: string;

    addBreakPoint(index: number): void;

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
    private readonly _breakPoints: Set<number> = new Set();

    private constructor(category: string) {
        this.category = category;
    }

    addBreakPoint(index: number | string): void {
        if (typeof index === "string") {
            index = parseInt(index, 16);
        }

        this._breakPoints.add(index);
    }

    write(level: LogLevel, data?: any[]) {
        const entry: ILogEntry = {
            category: this.category,
            index: this._nextEventIndex++,
            level: level,
            data: data ?? []
        };

        for (let callback of Logger._callbacks) {
            callback(entry);
        }

        if (this._breakPoints.has(entry.index)) {
            debugger;
        }
    }

    trace(...data: any[]): void {        
        this.write(LogLevel.TRACE, data);
    }

    info(...data: any[]): void {
        this.write(LogLevel.INFO, data);
    }

    log(...data: any[]): void {
        this.write(LogLevel.LOG, data);
    }

    warn(...data: any[]): void {
        this.write(LogLevel.WARNING, data);
    }

    error(...data: any[]): void {
        this.write(LogLevel.ERROR, data);
    }
}

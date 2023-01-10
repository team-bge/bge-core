import { IPlayerConfig } from "./game";

export class Player {
    private _index: number;
    private _config: IPlayerConfig;

    get index(): number {
        return this._index;
    }

    get name(): string {
        return this._config.name;
    }

    _init(index: number, config: IPlayerConfig): void {
        if (this._config != null) {
            throw new Error("This player has already been initialized.");
        }

        this._index = index;
        this._config = config;
    }
}

import { IGame } from "./game.js";

export class Delay {
    private readonly _game: IGame;

    constructor(game: IGame) {
        this._game = game;
    }

    short(): Promise<void> {
        return this.seconds(1);
    }

    long(): Promise<void>{
        return this.seconds(2);
    }

    seconds(value: number): Promise<void> {
        this._game._dispatchUpdateView();
        return new Promise(resolve => setTimeout(resolve, value * 1000));
    }
}

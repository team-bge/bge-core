import { Game } from "./game.js";
import { IGameResult } from "./interfaces.js";
import { Player } from "./player.js";

export type GameState = Promise<GameStateFunction | IGameResult>;
export type GameStateFunction = { (this: StateMachineGame): Promise<GameStateFunction | IGameResult> };

export abstract class StateMachineGame<TPlayer extends Player = Player> extends Game<TPlayer> {
    abstract get initialState(): GameStateFunction;

    protected override async onRun(): Promise<IGameResult> {
        let state: GameStateFunction | IGameResult = this.initialState;

        while (typeof state === "function") {
            state = await (state.apply(this) as GameState);
        }

        return state;
    }
}

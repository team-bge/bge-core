import { Player } from "./player";

export interface IGameResult {
    winners?: Player[];
}

export class Game {
    async run(): Promise<IGameResult> {
        throw new Error("This game hasn't implemented run()");
    }
    
    static minPlayers(value: number): ClassDecorator {
        return (target: Function) => {
            // TODO
        };
    }
    
    static maxPlayers(value: number): ClassDecorator{
        return (target: Function) => {
            // TODO
        };
    }
}

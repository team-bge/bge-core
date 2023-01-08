import { Player } from "./player";
import { GameView, ViewType } from "./views";

export interface IGameResult {
    winners?: Player[];
}

export class Game {
    async run(): Promise<IGameResult> {
        throw new Error("This game hasn't implemented run()");
    }

    render(player: Player): GameView {
        return {
            table: {
                identity: 1,
                type: ViewType.Table,
                children: [
                    {
                        type: ViewType.Card,
                        identity: 20,

                        cornerRadius: 0.25,
                        front: {
                            url: "hello"
                        },
                        back: {
                            url: "world"
                        },
                        width: 10,
                        height: 6
                    }
                ]
            }
        };
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

import { _currentGame } from "./game";

export class Delay {
    static short(): Promise<void> {
        return this.seconds(1);
    }

    static long(): Promise<void>{
        return this.seconds(2);
    }

    static seconds(value: number): Promise<void> {
        _currentGame._dispatchUpdateView();
        return new Promise(resolve => setTimeout(resolve, value * 1000));
    }
}

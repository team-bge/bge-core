import { Card } from "./card";

export class Deck<T extends Card> {
    add(card: T): Promise<void>;
    add(cards: Iterator<T>): Promise<void>;
    add(value: T | Iterator<T>): Promise<void> {
        throw new Error("Not implemented");
    }

    shuffle(): Promise<void> {
        throw new Error("Not implemented");
    }
}

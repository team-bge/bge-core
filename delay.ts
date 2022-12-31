export class Delay {
    static async short(): Promise<void> {
        await Delay.seconds(1);
    }

    static async long(): Promise<void>{
        await Delay.seconds(2);
    }

    static seconds(value: number): Promise<void> {
        throw new Error("Not implemented");
    }
}

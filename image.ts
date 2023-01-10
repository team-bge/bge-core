import { ImageView } from "./views";

export class Image {
    static simple(url: string): ImageView {
        return {
            url: url
        };
    }
    
    static tile(url: string, rows: number, cols: number, row: number, col: number): ImageView {
        return {
            url: url,
            rows: rows,
            cols: cols,
            row: row,
            col: col
        };
    }
}

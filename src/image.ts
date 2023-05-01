import { ImageView } from "./views.js";

/**
 * Helper methods for specifying simple or tiled images.
 */
export abstract class Image {
    /**
     * Describes an image as a file, by URL.
     * @param url URL of the source image file.
     * @returns Display information used when drawing an image.
     */
    static simple(url: string): ImageView {
        return {
            url: url
        };
    }

    static slice(url: string, minX: number, minY: number, maxX: number, maxY: number): ImageView {
        return {
            url: url,
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY
        };
    }
    
    /**
     * Describes an image as a tile within a larger image atlas file.
     * @param url URL of the source image atlas file.
     * @param rows How many rows of images are in the atlas.
     * @param cols How many columns of images are in the atlas.
     * @param row Row index of the tile, 0 is the ???-most.
     * @param col Column index of the tile, 0 is the left-most.
     * @returns Display information used when drawing an image.
     */
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

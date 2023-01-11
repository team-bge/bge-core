// GENERATED FILE, DO NOT EDIT!
// To update, run "BGE -> Generate TypeScript" in Unity

export type IView =
    | TableView
    | ZoneView
    | CardView
    | DeckView;

export interface GameView {
    table: TableView;
}

export interface TableView extends IContainerView {
    childId?: number;
    type: ViewType.Table;
}

export interface ZoneView extends IOutlinedView, ITransformView, IContainerView {
    childId?: number;
    type: ViewType.Zone;
}

export interface CardView extends ISizedView, IThicknessView, ITransformView, IContainerView {
    childId?: number;
    type: ViewType.Card;
    cornerRadius?: number;
    front?: ImageView;
    back?: ImageView;
}

export interface DeckView extends ISizedView, IOutlinedView, ITransformView {
    childId?: number;
    type: ViewType.Deck;
    topCard?: CardView;
    count: number;
}

export interface IContainerView {
    children?: IView[];
}

export enum ViewType {
    Table = 0,
    Zone = 1,
    Card = 2,
    Deck = 3,
}

export interface IOutlinedView {
    outlineStyle: OutlineStyle;
    label?: string;
}

export interface ITransformView {
    localPosition?: Vector3;
    localRotation?: Vector3;
}

export interface ISizedView {
    width: number;
    height: number;
}

export interface IThicknessView {
    thickness?: number;
}

export interface ImageView {
    url: string;
    rows?: number;
    cols?: number;
    row?: number;
    col?: number;
}

export enum OutlineStyle {
    None = 0,
    Solid = 1,
    SolidFilled = 2,
    Dashed = 3,
}

export interface Vector3 {
    x?: number;
    y?: number;
    z?: number;
}


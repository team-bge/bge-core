// GENERATED FILE, DO NOT EDIT!
// To update, run "BGE -> Generate TypeScript" in Unity

export type IView =
    | TableView
    | ZoneView
    | CardView
    | DeckView
    | HandView;

export interface GameView {
    table: TableView;
    topBar: TopBarView;
    hasPrompts: boolean;
}

export interface TableView extends IContainerView {
    type: ViewType.Table;
    childId?: number;
    containerId?: number;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
}

export interface ZoneView extends ITransformView, IContainerView, ISizedView, IOutlinedView {
    type: ViewType.Zone;
    childId?: number;
    containerId?: number;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
}

export interface CardView extends ITransformView, IContainerView, ISizedView, IThicknessView {
    type: ViewType.Card;
    childId?: number;
    containerId?: number;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    cornerRadius?: number;
    front?: ImageView;
    back?: ImageView;
}

export interface DeckView extends ITransformView, ISizedView, IOutlinedView {
    type: ViewType.Deck;
    childId?: number;
    containerId?: number;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    topCard?: CardView;
    count: number;
}

export interface HandView extends ITransformView, ISizedView, IOutlinedView {
    type: ViewType.Hand;
    childId?: number;
    containerId?: number;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    cards: CardView[];
}

export interface TopBarView {
    format?: string;
    embeds?: TextEmbedView[];
}

export interface IContainerView {
    children?: IView[];
}

export enum ViewType {
    Table = 0,
    Zone = 1,
    Card = 2,
    Deck = 3,
    Hand = 4,
}

export interface Origin {
    containerId: number;
    childId?: number;
    localPosition?: Vector3;
    localRotation?: Vector3;
    delay?: number;
    duration?: number;
}

export interface Prompt {
    kind: PromptKind;
    index: number;
}

export interface ITransformView {
    localPosition?: Vector3;
    localRotation?: Vector3;
}

export interface ISizedView {
    width: number;
    height: number;
}

export interface IOutlinedView {
    outlineStyle: OutlineStyle;
    label?: string;
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
    aspectRatio?: number;
}

export interface TextEmbedView {
    icon?: ImageView;
    label?: string;
    items?: TextEmbedView[];
    color?: Color;
}

export interface Vector3 {
    x?: number;
    y?: number;
    z?: number;
}

export enum PromptKind {
    Click = 0,
}

export enum OutlineStyle {
    None = 0,
    Solid = 1,
    SolidFilled = 2,
    Dashed = 3,
}

export interface Color {
    r?: number;
    g?: number;
    b?: number;
}


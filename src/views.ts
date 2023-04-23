// GENERATED FILE, DO NOT EDIT!
// To update, run "BGE -> Generate TypeScript" in Unity

export type IView =
    | TableView
    | ZoneView
    | CardView
    | DeckView
    | HandView
    | TextView
    | TokenView;

export interface GameView {
    basis: Basis;
    hasPrompts: boolean;
    playerIndex: number;
    players: PlayerView[];
    messages: MessageView[];
    cameras: CameraView[];
    table: TableView;
}

export interface TableView extends IContainerView {
    type: ViewType.TABLE;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
}

export interface ZoneView extends IOutlinedView, ILabelView, IColorView, ITransformView, IContainerView, IRectangularView {
    type: ViewType.ZONE;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
}

export interface CardView extends IColorView, ITransformView, IContainerView, IRectangularView, IThicknessView {
    type: ViewType.CARD;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    cornerRadius?: number;
    sides?: number;
    cutout?: boolean;
    front?: ImageView;
    back?: ImageView;
}

export interface DeckView extends IOutlinedView, ILabelView, ITransformView, IRectangularView {
    type: ViewType.DECK;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    topCard?: CardView;
    count: number;
    showCount: boolean;
}

export interface HandView extends IOutlinedView, ILabelView, ITransformView, IRectangularView {
    type: ViewType.HAND;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    cards: CardView[];
}

export interface TextView extends ILabelView, IColorView, ITransformView {
    type: ViewType.TEXT;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    format?: string;
    embeds?: TextEmbedView[];
    scale?: number;
}

export interface TokenView extends IColorView, ITransformView, IContainerView, IScaledView {
    type: ViewType.TOKEN;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    shape?: ShapeView;
}

export enum Basis {
    Y_UP_Z_FORWARD = 0,
    Y_FORWARD_Z_UP = 1,
}

export interface PlayerView {
    name: string;
    color: ColorView;
    hasPrompts: boolean;
}

export interface MessageView {
    format?: string;
    embeds?: TextEmbedView[];
    prompt?: boolean;
}

export interface CameraView {
    target?: Vector3View;
    pitch?: number;
    yaw?: number;
    zoom?: number;
}

export interface IContainerView {
    children?: IView[];
}

export enum ViewType {
    TABLE = 0,
    ZONE = 1,
    CARD = 2,
    DECK = 3,
    HAND = 4,
    TEXT = 5,
    TOKEN = 6,
}

export interface Origin {
    containerId: number;
    childId?: number;
    localPosition?: Vector3View;
    localRotation?: Vector3View;
    delay?: number;
    duration?: number;
}

export interface Prompt {
    kind: PromptKind;
    index: number;
}

export interface IOutlinedView {
    outlineStyle: OutlineStyle;
    outlineColor?: ColorView;
}

export interface ILabelView {
    label?: string;
}

export interface IColorView {
    color?: ColorView;
}

export interface ITransformView {
    localPosition?: Vector3View;
    localRotation?: Vector3View;
}

export interface IRectangularView {
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
    aspectRatio?: number;
    color?: ColorView;
}

export interface TextEmbedView {
    icon?: ImageView;
    label?: string;
    prompt?: Prompt;
    items?: TextEmbedView[];
    color?: ColorView;
}

export interface IScaledView {
    scale?: number;
}

export interface ShapeView {
    url?: string;
    sides?: number;
    width: number;
    height: number;
    thickness: number;
    cornerRadius: number;
    standing: boolean;
    noSides: boolean;
}

export interface ColorView {
    r?: number;
    g?: number;
    b?: number;
}

export interface Vector3View {
    x?: number;
    y?: number;
    z?: number;
}

export enum PromptKind {
    CLICK = 0,
    TEXT_INPUT = 1,
}

export enum OutlineStyle {
    NONE = 0,
    SOLID = 1,
    SOLID_FILLED = 2,
    DASHED = 3,
}


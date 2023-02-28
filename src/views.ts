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
    table: TableView;
    messages: MessageView[];
    hasPrompts: boolean;
    cameras: CameraView[];
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

export interface ZoneView extends IColorView, ITransformView, IContainerView, IRectangularView, IOutlinedView, ILabelView {
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
    front?: ImageView;
    back?: ImageView;
}

export interface DeckView extends ITransformView, IRectangularView, IOutlinedView, ILabelView {
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

export interface HandView extends ITransformView, IRectangularView, IOutlinedView, ILabelView {
    type: ViewType.HAND;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    cards: CardView[];
}

export interface TextView extends IColorView, ITransformView, ILabelView {
    type: ViewType.TEXT;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    format?: string;
    embeds?: TextEmbedView[];
}

export interface TokenView extends IColorView, ITransformView, IScaledView {
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

export interface IOutlinedView {
    outlineStyle: OutlineStyle;
    outlineColor?: ColorView;
}

export interface ILabelView {
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
    thickness: number;
    standing: boolean;
}

export interface Vector3View {
    x?: number;
    y?: number;
    z?: number;
}

export enum PromptKind {
    CLICK = 0,
}

export interface ColorView {
    r?: number;
    g?: number;
    b?: number;
}

export enum OutlineStyle {
    NONE = 0,
    SOLID = 1,
    SOLID_FILLED = 2,
    DASHED = 3,
}


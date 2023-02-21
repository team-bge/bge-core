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
    table: TableView;
    messages: MessageView[];
    hasPrompts: boolean;
    cameras: CameraView[];
}

export interface TableView extends IContainerView {
    type: ViewType.Table;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
}

export interface ZoneView extends IRectangularView, IOutlinedView, ILabelView, IColorView, ITransformView, IContainerView {
    type: ViewType.Zone;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
}

export interface CardView extends IRectangularView, IThicknessView, IColorView, ITransformView, IContainerView {
    type: ViewType.Card;
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

export interface DeckView extends IRectangularView, IOutlinedView, ILabelView, ITransformView {
    type: ViewType.Deck;
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

export interface HandView extends IRectangularView, IOutlinedView, ILabelView, ITransformView {
    type: ViewType.Hand;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    cards: CardView[];
}

export interface TextView extends ILabelView, IColorView, ITransformView {
    type: ViewType.Text;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
    format?: string;
    embeds?: TextEmbedView[];
}

export interface TokenView extends IScaledView, IColorView, ITransformView {
    type: ViewType.Token;
    childId?: number;
    containerId?: number;
    allowAnimations?: boolean;
    origin?: Origin;
    prompt?: Prompt;
    tempChildren?: IView[];
}

export interface MessageView {
    format?: string;
    embeds?: TextEmbedView[];
    prompt?: boolean;
}

export interface CameraView {
    target?: Vector3;
    pitch?: number;
    yaw?: number;
    zoom?: number;
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
    Text = 5,
    Token = 6,
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

export interface IRectangularView {
    width: number;
    height: number;
}

export interface IOutlinedView {
    outlineStyle: OutlineStyle;
    outlineColor?: Color;
}

export interface ILabelView {
    label?: string;
}

export interface IColorView {
    color?: Color;
}

export interface ITransformView {
    localPosition?: Vector3;
    localRotation?: Vector3;
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
    color?: Color;
}

export interface TextEmbedView {
    icon?: ImageView;
    label?: string;
    prompt?: Prompt;
    items?: TextEmbedView[];
    color?: Color;
}

export interface IScaledView {
    scale?: number;
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


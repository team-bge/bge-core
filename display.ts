export interface IDisplayOptions {
    label?: string;
}

export function display(options?: IDisplayOptions) : PropertyDecorator {
    return (target: any, propertyKey: string | symbol) => {
        console.log(target);
    };
}

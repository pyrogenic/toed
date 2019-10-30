export default function map<TElement, TElementPropName extends keyof TElement>(
    container: Pick<TElement[], "map">, key: TElementPropName): Array<TElement[TElementPropName]> {
    return container.map((e) => e[key]);
}

export type AbortFunction = () => void;

export interface AbortablePromise<T> {
  promise: Promise<T | Error>;
  abort?: AbortFunction;
}

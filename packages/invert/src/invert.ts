export type AllValues<T extends Record<PropertyKey, PropertyKey>> = {
  [P in keyof T]: { key: P; value: T[P] };
}[keyof T];

export type InvertResult<T extends Record<PropertyKey, PropertyKey>> = {
  [P in AllValues<T>['value']]: Extract<AllValues<T>, { value: P }>['key'];
};

export function invert<T extends Record<PropertyKey, PropertyKey>>(
  obj: T,
): InvertResult<T> {
  const retobj = {} as InvertResult<T>;
  // eslint-disable-next-line guard-for-in, no-restricted-syntax
  for (const key in obj) {
    retobj[obj[key]] = key;
  }
  return retobj;
}

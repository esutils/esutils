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
  for (const key in obj) {
    retobj[obj[key]] = key;
  }
  return retobj;
}

export function invertValues<T extends object>(
  obj: T,
): T[keyof T][] {
  const values = [] as T[keyof T][];
  for (const key in obj) {
    values.push(obj[key]);
  }
  return values;
}

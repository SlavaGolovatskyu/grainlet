export const isDefined = (value) => value !== null && value !== undefined;
export const isNullish = (value) => value === null || value === undefined;
export const isString = (value) => typeof value === 'string';
export const isNumber = (value) => typeof value === 'number';
export const isBoolean = (value) => typeof value === 'boolean';
export const isFunction = (value) => typeof value === 'function';
export const isDate = (value) => value instanceof Date;
export const isRegExp = (value) => value instanceof RegExp;
export const isMap = (value) => value instanceof Map;
export const isSet = (value) => value instanceof Set;
export const isTypedArray = (value) =>
  ArrayBuffer.isView(value) && !(value instanceof DataView);

export function isPromiseLike(value) {
  return (
    (value !== null && typeof value === 'object')
    || typeof value === 'function'
  ) && typeof value.then === 'function';
}

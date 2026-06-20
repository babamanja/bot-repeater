export const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

export const isNumber = (value: unknown): boolean => {
  return typeof value === "number";
};
export const isBoolean = (value: unknown): boolean => {
  return typeof value === "boolean";
};
export const isObject = (value: unknown): boolean => {
  return typeof value === "object";
};
export const isArray = (value: unknown): boolean => {
  return Array.isArray(value);
};

export const isType = <T>(
  value: unknown,
  type: (
    | "string"
    | "number"
    | "boolean"
    | "object"
    | "array"
    | "function"
    | "symbol"
    | "undefined"
    | "null"
    | "bigint"
  )[],
): value is T => {
  return type.includes(typeof value);
};

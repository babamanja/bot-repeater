export const isString = (value) => {
    return typeof value === "string";
};
export const isNumber = (value) => {
    return typeof value === "number";
};
export const isBoolean = (value) => {
    return typeof value === "boolean";
};
export const isObject = (value) => {
    return typeof value === "object";
};
export const isArray = (value) => {
    return Array.isArray(value);
};
export const isType = (value, type) => {
    return type.includes(typeof value);
};

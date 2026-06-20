export function getRouteParam(req, name) {
    const value = req.params[name];
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value)) {
        return value[0] ?? "";
    }
    return "";
}
export function getQueryString(req, name) {
    const value = req.query[name];
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value)) {
        const first = value[0];
        return typeof first === "string" ? first : "";
    }
    return "";
}

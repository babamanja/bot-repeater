import type { Request } from "express";

export function getRouteParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return "";
}

export function getQueryString(req: Request, name: string): string {
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

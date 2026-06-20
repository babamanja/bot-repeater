import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/**
 * Axios instance without app interceptors — used for /auth/refresh only,
 * so refresh cannot trigger the 401-retry interceptor (no import cycle).
 * Refresh token is sent only via httpOnly cookie (withCredentials).
 */
export const authBareClient = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

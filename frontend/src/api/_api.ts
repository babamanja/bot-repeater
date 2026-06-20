import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { refreshSession } from "./refreshSessionApi";
import { clearStoredSession, getStoredAuthToken, setStoredSession } from "../userStorage";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

function isAuthRouteNoRefresh(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/signup") ||
    url.includes("/auth/password")
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string }>) => {
    const originalRequest = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRouteNoRefresh(originalRequest.url) &&
      typeof originalRequest.headers?.Authorization === "string" &&
      originalRequest.headers.Authorization.startsWith("Bearer ")
    ) {
      originalRequest._retry = true;
      try {
        const session = await refreshSession();
        setStoredSession({ user: session.user, token: session.token });
        originalRequest.headers.Authorization = `Bearer ${session.token}`;
        return apiClient(originalRequest);
      } catch {
        clearStoredSession();
      }
    }

    const msg = error.response?.data?.error;
    if (typeof msg === "string" && msg.length > 0) {
      return Promise.reject(new Error(msg));
    }
    return Promise.reject(new Error(status != null ? `HTTP ${status}` : error.message));
  },
);

export default apiClient;

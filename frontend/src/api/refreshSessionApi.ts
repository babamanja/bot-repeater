import { trackAnalyticsEvent } from "../analytics";
import type { AuthMethod } from "../analytics/types";
import type { AuthSession } from "../types";
import { authBareClient } from "./authBareClient";

function authMethodFromProviders(providers: AuthSession["providers"]): AuthMethod {
  return providers.password ? "password" : "google";
}

let inFlightRefresh: Promise<AuthSession> | null = null;

/**
 * Exchanges httpOnly refresh cookie for a new access token + user (cookie rotated on server).
 * Never send or store refreshToken in JS — the browser attaches the cookie automatically.
 * Concurrent callers share one in-flight request to avoid rate-limit storms.
 */
export async function refreshSession(): Promise<AuthSession> {
  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  inFlightRefresh = authBareClient
    .post<AuthSession>("/auth/refresh")
    .then(({ data }) => {
      trackAnalyticsEvent("auth_refresh_succeeded", {
        auth_method: authMethodFromProviders(data.providers),
        flow: "refresh",
        result: "success",
      });
      return data;
    })
    .finally(() => {
      inFlightRefresh = null;
    });

  return inFlightRefresh;
}

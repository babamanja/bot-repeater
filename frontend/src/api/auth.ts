import type { AuthSession } from "../types";
import { apiClient } from "./_api";

export { refreshSession } from "./refreshSessionApi";

function clientAppBaseUrl(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.location.origin;
}

export async function createGuestSession(): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>("/auth/guest");
  return data;
}

export async function signUpWithPassword(input: {
  userName: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>("/auth/signup/password", {
    ...input,
    appBaseUrl: clientAppBaseUrl(),
  });
  return data;
}

export async function logInWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>("/auth/login/password", input);
  return data;
}

export async function logInWithGoogle(idToken: string): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>("/auth/login/google", { idToken });
  return data;
}

export async function logOut(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function forgotPassword(email: string): Promise<{ ok: true; resetToken?: string }> {
  const { data } = await apiClient.post<{ ok: true; resetToken?: string }>("/auth/password/forgot", {
    email,
    appBaseUrl: clientAppBaseUrl(),
  });
  return data;
}

export async function verifyEmailWithToken(input: { token: string }): Promise<{ ok: true }> {
  const { data } = await apiClient.post<{ ok: true }>("/auth/email/verify", input);
  return data;
}

export async function resendVerificationEmail(): Promise<{ ok: true }> {
  const { data } = await apiClient.post<{ ok: true }>("/auth/email/resend", {
    appBaseUrl: clientAppBaseUrl(),
  });
  return data;
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<{ ok: true }> {
  const { data } = await apiClient.post<{ ok: true }>("/auth/password/reset", input);
  return data;
}

export async function restoreDeletedAccount(
  input: { email: string; password: string } | { idToken: string },
): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>("/auth/account/restore", input);
  return data;
}

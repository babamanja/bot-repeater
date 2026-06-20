import type { User } from "./types";

type SessionSnapshot = {
  user: User | null;
  token: string | null;
};

let currentUser: User | null = null;
let currentAccessToken: string | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeToSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionSnapshot(): SessionSnapshot {
  return { user: currentUser, token: currentAccessToken };
}

export function setStoredUser(user: User): void {
  currentUser = user;
  notifyListeners();
}

export function setStoredAuthToken(token: string): void {
  const normalized = token.trim();
  currentAccessToken = normalized.length > 0 ? normalized : null;
  notifyListeners();
}

export function setStoredSession(input: { user: User; token: string }): void {
  currentUser = input.user;
  const normalized = input.token.trim();
  currentAccessToken = normalized.length > 0 ? normalized : null;
  notifyListeners();
}

export function getStoredUser(): User | null {
  return currentUser;
}

export function getStoredAuthToken(): string | null {
  return currentAccessToken;
}

export function clearStoredSession(): void {
  currentUser = null;
  currentAccessToken = null;
  notifyListeners();
}

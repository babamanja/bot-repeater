const STORAGE_KEY = "quizbuddy_cookie_consent";
const ACKNOWLEDGED_VALUE = "accepted";

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/** Whether the user has dismissed the cookie usage notice. */
export function hasCookieNoticeAcknowledged(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) === ACKNOWLEDGED_VALUE;
}

export function acknowledgeCookieNotice(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, ACKNOWLEDGED_VALUE);
  notifyListeners();
}

export function subscribeCookieNotice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

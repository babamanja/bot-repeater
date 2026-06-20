import { useEffect, useState } from "react";

import { getSessionSnapshot, subscribeToSession } from "../userStorage";

export function useSession() {
  const [session, setSession] = useState(() => getSessionSnapshot());

  useEffect(() => subscribeToSession(() => setSession(getSessionSnapshot())), []);

  return session;
}

export function isAuthenticatedUser(role: string | undefined, token: string | null): boolean {
  const normalizedRole = (role ?? "").toLowerCase();
  return Boolean(token) && (normalizedRole === "user" || normalizedRole === "admin");
}

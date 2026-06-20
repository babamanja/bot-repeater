import { createGuestSession } from '../../../api/auth'
import { refreshSession } from '../../../api/refreshSessionApi'
import type { AuthSession } from '../../../types'
import { getSessionSnapshot, setStoredSession } from '../../../userStorage'

export async function ensureGuestSession(): Promise<AuthSession> {
  const snapshot = getSessionSnapshot()
  if (snapshot.token && snapshot.user?.isGuest) {
    return {
      token: snapshot.token,
      user: snapshot.user,
      providers: { password: false, google: false },
    }
  }

  try {
    const refreshed = await refreshSession()
    if (refreshed.user.isGuest) {
      setStoredSession({ token: refreshed.token, user: refreshed.user })
      return refreshed
    }
  } catch {
    // Fall through to create a new guest session.
  }

  const session = await createGuestSession()
  setStoredSession({ token: session.token, user: session.user })
  return session
}

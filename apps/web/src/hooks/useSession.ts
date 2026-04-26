import { useEffect, useState } from 'react';
import type { AuthUser, LoginPayload } from '@matflow/shared-types';
import { api } from '../api/client';

const SESSION_STORAGE_KEY = 'bauflow-web-session';
const LEGACY_SESSION_STORAGE_KEY = 'matflow-web-session';

interface SessionState {
  token: string;
  user: AuthUser;
}

export function useSession() {
  const [session, setSession] = useState<SessionState | null>(() => {
    const value = window.localStorage.getItem(SESSION_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_SESSION_STORAGE_KEY);
    return value ? (JSON.parse(value) as SessionState) : null;
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
  }, [session]);

  async function login(payload: LoginPayload) {
    setIsAuthenticating(true);
    try {
      const response = await api.login(payload);
      setSession({
        token: response.accessToken,
        user: response.user,
      });
    } finally {
      setIsAuthenticating(false);
    }
  }

  function logout() {
    setSession(null);
  }

  return {
    session,
    isAuthenticating,
    login,
    logout,
  };
}

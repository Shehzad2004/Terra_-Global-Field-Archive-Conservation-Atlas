import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { UserProfile } from '../types.ts';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncWithBackend = useCallback(async (user: User) => {
    try {
      const token = await user.getIdToken();
      setIdToken(token);
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (err) {
      console.error('Failed to sync profile with backend:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncWithBackend(user);
      } else {
        setIdToken(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [syncWithBackend]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (result.user) {
        await syncWithBackend(result.user);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      setAuthError(err?.message || 'Sign-in was cancelled or failed.');
    }
  };

  const logout = async () => {
    await signOut(auth);
    setIdToken(null);
    setProfile(null);
  };

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      let token = idToken;
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
        setIdToken(token);
      }
      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(url, { ...options, headers });
    },
    [idToken]
  );

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      await syncWithBackend(auth.currentUser);
    }
  }, [syncWithBackend]);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        authError,
        signInWithGoogle,
        logout,
        authFetch,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Persona } from '@/lib/types';
import { personas } from '@/lib/data/personas';

interface AppUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  memberships: {
    id: string;
    role: string;
    org: {
      id: string;
      name: string;
    };
  }[];
}

interface AuthContextType {
  currentPersona: Persona | null;
  appUser: AppUser | null;
  isDemoMode: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (personaId: string) => void;
  logout: () => void;
  switchPersona: (personaId: string) => void;
  continueWithEmail: (email: string) => Promise<{ error?: string; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PERSONA_KEY = 'tallyview_persona';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // Load session user first.
      try {
        const res = await fetch('/api/auth/user');
        const data = await res.json();
        if (data.user) {
          setAppUser(data.user);
          try { localStorage.removeItem(PERSONA_KEY); } catch {}
          setIsLoading(false);
          return;
        }
      } catch {}

      // Fall back to demo persona
      try {
        const stored = localStorage.getItem(PERSONA_KEY);
        if (stored) {
          const persona = personas.find(p => p.id === stored);
          if (persona) setCurrentPersona(persona);
        }
      } catch {}

      setIsLoading(false);
    }

    init();
  }, []);

  // --- Demo persona methods ---

  const login = useCallback((personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      setAppUser(null);
      setCurrentPersona(persona);
      try { localStorage.setItem(PERSONA_KEY, personaId); } catch {}
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentPersona(null);
    try { localStorage.removeItem(PERSONA_KEY); } catch {}
  }, []);

  const switchPersona = useCallback((personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      setCurrentPersona(persona);
      try { localStorage.setItem(PERSONA_KEY, personaId); } catch {}
    }
  }, []);

  const continueWithEmail = useCallback(async (email: string): Promise<{ error?: string; isNewUser?: boolean }> => {
    setCurrentPersona(null);
    try { localStorage.removeItem(PERSONA_KEY); } catch {}

    try {
      const res = await fetch('/api/auth/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { error: data.error || 'Failed to continue with email. Please try again.' };
      }
      const data = await res.json();
      if (!data.user) {
        return { error: 'Failed to continue with email. Please try again.' };
      }
      setAppUser(data.user);
      return { isNewUser: !!data.isNew };
    } catch {
      return { error: 'Network error during account setup. Please try again.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAppUser(null);
    setCurrentPersona(null);
    try { localStorage.removeItem(PERSONA_KEY); } catch {}
  }, []);

  const isDemoMode = currentPersona !== null && appUser === null;
  const isAuthenticated = appUser !== null || currentPersona !== null;

  return (
    <AuthContext.Provider value={{
      currentPersona,
      appUser,
      isDemoMode,
      isAuthenticated,
      isLoading,
      login,
      logout,
      switchPersona,
      continueWithEmail,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

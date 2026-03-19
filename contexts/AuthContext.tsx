'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Persona } from '@/lib/types';
import { personas } from '@/lib/data/personas';
import { createClient } from '@/lib/supabase/client';

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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PERSONA_KEY = 'tallyview_persona';

/** Maps pre-rename persona ids so existing localStorage entries keep working. */
const LEGACY_PERSONA_ID_MAP: Record<string, string> = {
  'sarah-chen': 'katy-alyst',
  'marcus-thompson': 'grant-wishman',
  'jessica-park': 'bill-label',
  'bill-lable': 'bill-label',
};

function normalizePersonaId(personaId: string): string {
  return LEGACY_PERSONA_ID_MAP[personaId] ?? personaId;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const controller = new AbortController();
    let initDone = false;

    async function fetchAppUser(signal: AbortSignal): Promise<AppUser | null> {
      const res = await fetch('/api/auth/user', { signal });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user ?? null;
    }

    async function init() {
      try {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();

        if (supabaseUser && !controller.signal.aborted) {
          const user = await fetchAppUser(controller.signal);
          if (user && !controller.signal.aborted) {
            setAppUser(user);
            try { localStorage.removeItem(PERSONA_KEY); } catch {}
            setIsLoading(false);
            initDone = true;
            return;
          }
        }
      } catch {
        if (controller.signal.aborted) return;
      }

      try {
        const stored = localStorage.getItem(PERSONA_KEY);
        if (stored) {
          const id = normalizePersonaId(stored);
          const persona = personas.find(p => p.id === id);
          if (persona) {
            setCurrentPersona(persona);
            if (id !== stored) {
              try {
                localStorage.setItem(PERSONA_KEY, id);
              } catch {
                /* ignore quota / private mode */
              }
            }
          }
        }
      } catch {}

      initDone = true;
      setIsLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN') {
          if (!initDone) controller.abort();
          const signInController = new AbortController();
          try {
            const user = await fetchAppUser(signInController.signal);
            if (user) {
              setAppUser(user);
              setCurrentPersona(null);
              try { localStorage.removeItem(PERSONA_KEY); } catch {}
            }
          } catch {}
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setAppUser(null);
        }
      },
    );

    return () => {
      controller.abort();
      subscription.unsubscribe();
    };
  }, []);

  // --- Demo persona methods ---

  const login = useCallback((personaId: string) => {
    const id = normalizePersonaId(personaId);
    const persona = personas.find(p => p.id === id);
    if (persona) {
      setAppUser(null);
      setCurrentPersona(persona);
      try {
        localStorage.setItem(PERSONA_KEY, id);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentPersona(null);
    try { localStorage.removeItem(PERSONA_KEY); } catch {}
  }, []);

  const switchPersona = useCallback((personaId: string) => {
    const id = normalizePersonaId(personaId);
    const persona = personas.find(p => p.id === id);
    if (persona) {
      setCurrentPersona(persona);
      try {
        localStorage.setItem(PERSONA_KEY, id);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
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

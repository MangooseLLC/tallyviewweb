'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Persona } from '@/lib/types';
import { personas } from '@/lib/data/personas';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
  sendOtp: (email: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PERSONA_KEY = 'tallyview_persona';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Real auth session exists — clear any stale demo persona
          try { localStorage.removeItem(PERSONA_KEY); } catch {}
          const res = await fetch('/api/auth/user');
          const data = await res.json();
          if (data.user) {
            setAppUser(data.user);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Supabase check failed — fall through to demo
      }

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setAppUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // --- Supabase OTP methods ---

  const sendOtp = useCallback(async (email: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return { error: error.message };
    return {};
  }, [supabase.auth]);

  const verifyOtp = useCallback(async (email: string, code: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    if (error) return { error: error.message };

    // Clear demo state
    setCurrentPersona(null);
    try { localStorage.removeItem(PERSONA_KEY); } catch {}

    // Provision user in Prisma
    const res = await fetch('/api/auth/provision', { method: 'POST' });
    const data = await res.json();
    if (data.user) {
      setAppUser(data.user);
    }

    return {};
  }, [supabase.auth]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAppUser(null);
    setCurrentPersona(null);
    try { localStorage.removeItem(PERSONA_KEY); } catch {}
  }, [supabase.auth]);

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
      sendOtp,
      verifyOtp,
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

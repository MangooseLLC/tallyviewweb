'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Persona } from '@/lib/types';
import { personas } from '@/lib/data/personas';

interface AuthContextType {
  currentPersona: Persona | null;
  login: (personaId: string) => void;
  logout: () => void;
  switchPersona: (personaId: string) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore auth from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tallyview_persona');
      if (stored) {
        const persona = personas.find(p => p.id === stored);
        if (persona) {
          setCurrentPersona(persona);
        }
      }
    } catch {
      // localStorage not available
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      setCurrentPersona(persona);
      try {
        localStorage.setItem('tallyview_persona', personaId);
      } catch {
        // localStorage not available
      }
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentPersona(null);
    try {
      localStorage.removeItem('tallyview_persona');
    } catch {
      // localStorage not available
    }
  }, []);

  const switchPersona = useCallback((personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      setCurrentPersona(persona);
      try {
        localStorage.setItem('tallyview_persona', personaId);
      } catch {
        // localStorage not available
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      currentPersona,
      login,
      logout,
      switchPersona,
      isAuthenticated: currentPersona !== null,
      isLoading,
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

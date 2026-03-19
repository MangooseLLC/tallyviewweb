'use client';

import { useAuth } from '@/contexts/AuthContext';
import { personas } from '@/lib/data/personas';
import { useRouter } from 'next/navigation';
import { Bell, ArrowRightLeft, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { currentPersona, appUser, isDemoMode, switchPersona, logout, signOut } = useAuth();
  const router = useRouter();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setShowSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasIdentity = currentPersona || appUser;
  if (!hasIdentity) return null;

  const roleRoutes: Record<string, string> = {
    nonprofit: '/dashboard',
    foundation: '/foundation/dashboard',
    regulator: '/regulator/dashboard',
    investigator: '/investigator/dashboard',
  };

  const handleSwitch = (personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      switchPersona(personaId);
      setShowSwitcher(false);
      router.push(roleRoutes[persona.role]);
    }
  };

  const handleLogout = async () => {
    if (isDemoMode) {
      logout();
      router.push('/demo');
    } else {
      await signOut();
      router.push('/login');
    }
  };

  // Display info for real auth vs demo mode
  const displayName = isDemoMode
    ? currentPersona!.name
    : appUser?.name || appUser?.email || 'User';
  const displaySubtitle = isDemoMode
    ? `${currentPersona!.title} — ${currentPersona!.organization}`
    : appUser?.memberships?.[0]?.org?.name || '';
  const avatarText = isDemoMode
    ? currentPersona!.avatar
    : (appUser?.name || appUser?.email || 'U').charAt(0).toUpperCase();
  const avatarColor = isDemoMode
    ? currentPersona!.color
    : 'from-brand-gold to-amber-600';

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className={cn(
          'h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold',
          avatarColor
        )}>
          {avatarText}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{displayName}</p>
          {displaySubtitle && (
            <p className="text-[11px] text-gray-500">{displaySubtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Persona switcher — demo mode only */}
        {isDemoMode && (
          <div className="relative" ref={switcherRef}>
            <button
              onClick={() => setShowSwitcher(!showSwitcher)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Switch Persona
            </button>

            {showSwitcher && (
              <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border bg-white shadow-lg z-50">
                <div className="p-2 border-b">
                  <p className="text-xs font-medium text-gray-500 px-2">Switch Demo Persona</p>
                </div>
                <div className="p-2 space-y-1">
                  {personas.map((persona) => (
                    <button
                      key={persona.id}
                      onClick={() => handleSwitch(persona.id)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                        persona.id === currentPersona?.id
                          ? 'bg-gray-100'
                          : 'hover:bg-gray-50'
                      )}
                    >
                      <div className={cn(
                        'h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                        persona.color
                      )}>
                        {persona.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{persona.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{persona.title} — {persona.organization}</p>
                      </div>
                      {persona.id === currentPersona?.id && (
                        <span className="ml-auto text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

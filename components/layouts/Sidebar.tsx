'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS } from '@/lib/utils/constants';
import {
  LayoutDashboard, FileText, BarChart3, ClipboardCheck, AlertTriangle,
  Lock, Settings, Building2, GitCompare, FileBarChart, Map, Search,
  Network, Microscope, Briefcase, Database, ChevronLeft, ChevronRight,
  Link2,
} from 'lucide-react';
import { useState } from 'react';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-4 w-4" />,
  FileText: <FileText className="h-4 w-4" />,
  BarChart3: <BarChart3 className="h-4 w-4" />,
  ClipboardCheck: <ClipboardCheck className="h-4 w-4" />,
  AlertTriangle: <AlertTriangle className="h-4 w-4" />,
  Lock: <Lock className="h-4 w-4" />,
  Settings: <Settings className="h-4 w-4" />,
  Building2: <Building2 className="h-4 w-4" />,
  GitCompare: <GitCompare className="h-4 w-4" />,
  FileBarChart: <FileBarChart className="h-4 w-4" />,
  Map: <Map className="h-4 w-4" />,
  Search: <Search className="h-4 w-4" />,
  Network: <Network className="h-4 w-4" />,
  Microscope: <Microscope className="h-4 w-4" />,
  Briefcase: <Briefcase className="h-4 w-4" />,
  Database: <Database className="h-4 w-4" />,
  Link2: <Link2 className="h-4 w-4" />,
};

function TallyviewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 125" fill="currentColor" className={className}>
      <path d="M83.42 61.4H17.96c-2.402 0-3.203-3.202-1.1-4.303L49.59 39.18c.7-.4 1.5-.4 2.201 0l32.73 17.817c2.102 1.2 1.301 4.403-1.101 4.403m2.402 45.241h-6.506V68.407a2.691 2.691 0 0 0-2.702-2.703H73.81a2.691 2.691 0 0 0-2.702 2.703v38.234H62.9V68.407a2.691 2.691 0 0 0-2.702-2.703h-2.802a2.691 2.691 0 0 0-2.703 2.703v38.234h-8.207V68.407a2.691 2.691 0 0 0-2.703-2.703h-2.802a2.691 2.691 0 0 0-2.703 2.703v38.234h-8.207V68.407a2.691 2.691 0 0 0-2.702-2.703h-2.803a2.691 2.691 0 0 0-2.702 2.703v38.234h-6.506c-.901 0-1.702.8-1.702 1.702v6.706H7.352c-.901 0-1.702.7-1.702 1.701v6.406h90.081v-6.406c0-.9-.8-1.701-1.702-1.701h-6.505v-6.706c0-.901-.701-1.702-1.702-1.702"/>
    </svg>
  );
}

export function Sidebar() {
  const { currentPersona, appUser } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (!currentPersona && !appUser) return null;

  const role = currentPersona?.role ?? 'nonprofit';
  const navItems = NAV_ITEMS[role] || [];

  return (
    <aside className={cn(
      'flex flex-col bg-brand-navy text-white transition-all duration-200',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-white/10">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <TallyviewIcon className="h-5 w-5 text-brand-gold" />
            <div className="h-5 w-px bg-white/20" />
            <span className="font-semibold text-sm text-white">Tallyview</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/">
            <TallyviewIcon className="h-5 w-5 text-brand-gold mx-auto" />
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1 hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-brand-gold/15 text-brand-gold font-medium'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              )}
              title={collapsed ? item.label : undefined}
            >
              {iconMap[item.icon] || <LayoutDashboard className="h-4 w-4" />}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <TallyviewIcon className="h-3.5 w-3.5 text-brand-gold" />
            <span>Powered by Tallyview</span>
          </div>
        </div>
      )}
    </aside>
  );
}

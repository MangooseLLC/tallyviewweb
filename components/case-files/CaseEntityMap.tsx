'use client';

import type { CaseFileEntities } from '@/lib/data/case-files';
import { Building2, Shield, Truck } from 'lucide-react';

interface CaseEntityMapProps {
  entities: CaseFileEntities;
}

export function CaseEntityMap({ entities }: CaseEntityMapProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-3.5 w-3.5 text-brand-gold" />
          <span className="text-xs font-semibold text-brand-gold">Organization</span>
        </div>
        <p className="text-sm text-white">{entities.organization}</p>
      </div>

      {entities.publicAgencies.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-blue-400">Public Agencies</span>
          </div>
          <ul className="space-y-1">
            {entities.publicAgencies.map((agency, i) => (
              <li key={i} className="text-sm text-gray-300">{agency}</li>
            ))}
          </ul>
        </div>
      )}

      {entities.vendors.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-semibold text-red-400">Vendors / Entities</span>
          </div>
          <ul className="space-y-1">
            {entities.vendors.map((vendor, i) => (
              <li key={i} className="text-sm text-gray-300">{vendor}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-1 rounded border border-dashed border-white/10 p-2 text-[10px] text-gray-500">
        {entities.publicAgencies.length + entities.vendors.length + 1} entities across {
          new Set([
            'organization',
            ...entities.publicAgencies.map(() => 'agency'),
            ...entities.vendors.map(() => 'vendor'),
          ]).size
        } types
      </div>
    </div>
  );
}

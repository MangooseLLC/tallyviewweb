'use client';

import { useState } from 'react';
import { getNonprofitById } from '@/lib/data/nonprofits';
import { formatRelativeTime } from '@/lib/utils/formatters';
import {
  Building2,
  Wifi,
  CircleDot,
  Bell,
  RefreshCw,
  Shield,
  Clock,
  Mail,
  Smartphone,
  Globe,
  Database,
} from 'lucide-react';

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

function Toggle({ enabled, onToggle }: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? 'bg-amber-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
          enabled ? 'translate-x-4.5' : 'translate-x-1'
        }`}
        style={{ transform: `translateX(${enabled ? '18px' : '4px'})` }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const org = getNonprofitById('org-bright-futures')!;

  const [notifications, setNotifications] = useState({
    anomalyAlerts: true,
    weeklyDigest: true,
    complianceReminders: true,
    boardReportReady: true,
    syncErrors: true,
    grantDeadlines: false,
  });

  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncFrequency: 'every-6-hours',
    includeHistorical: true,
    classTracking: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSync = (key: keyof typeof syncSettings) => {
    setSyncSettings(prev => ({ ...prev, [key]: !prev[key] as boolean }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your organization and integrations</p>
      </div>

      {/* Organization Info */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-900">Organization Information</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-gray-500">Organization Name</p>
              <p className="text-sm font-medium text-gray-900">{org.name}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">EIN</p>
              <p className="text-sm font-medium text-gray-900">{org.ein}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Executive Director</p>
              <p className="text-sm font-medium text-gray-900">{org.executiveDirector}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Program Area</p>
              <p className="text-sm font-medium text-gray-900">{org.programArea}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[11px] text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">{org.city}, {org.state}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Founded</p>
              <p className="text-sm font-medium text-gray-900">{org.foundedYear}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Annual Budget</p>
              <p className="text-sm font-medium text-gray-900">${(org.annualBudget / 1_000_000).toFixed(1)}M</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Filing Status</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                ✅ {org.filing990Status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounting System */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-900">Connected Accounting System</h3>
        </div>

        <div className="flex items-center justify-between p-4 bg-green-50/50 rounded-lg border border-green-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-white border flex items-center justify-center shadow-sm">
              <Globe className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{org.connectedSystem}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CircleDot className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600 font-medium">Connected &amp; Syncing</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Last sync</p>
            <p className="text-sm font-medium text-gray-700">{formatRelativeTime(org.lastSync)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Database className="h-3 w-3 text-gray-400" />
              <p className="text-[11px] text-gray-500">Transactions Mapped</p>
            </div>
            <p className="text-sm font-semibold text-gray-900">4,847</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3 w-3 text-gray-400" />
              <p className="text-[11px] text-gray-500">Data Accuracy</p>
            </div>
            <p className="text-sm font-semibold text-amber-600">99.2%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <p className="text-[11px] text-gray-500">Sync Frequency</p>
            </div>
            <p className="text-sm font-semibold text-gray-900">Every 6 hours</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white border text-gray-700 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
            Sync Now
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-white border text-gray-700 hover:bg-gray-50 transition-colors">
            View Sync History
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-900">Notification Preferences</h3>
        </div>

        <div className="space-y-0 divide-y">
          {[
            { key: 'anomalyAlerts' as const, label: 'Anomaly Alerts', desc: 'Get notified when new anomalies are detected', icon: <Mail className="h-4 w-4 text-gray-400" /> },
            { key: 'weeklyDigest' as const, label: 'Weekly Digest', desc: 'Summary of financial activity and compliance updates', icon: <Mail className="h-4 w-4 text-gray-400" /> },
            { key: 'complianceReminders' as const, label: 'Compliance Reminders', desc: 'Filing deadlines, renewals, and regulatory updates', icon: <Shield className="h-4 w-4 text-gray-400" /> },
            { key: 'boardReportReady' as const, label: 'Board Report Ready', desc: 'Alert when monthly board report is generated', icon: <Smartphone className="h-4 w-4 text-gray-400" /> },
            { key: 'syncErrors' as const, label: 'Sync Errors', desc: 'Notify if data sync encounters issues', icon: <RefreshCw className="h-4 w-4 text-gray-400" /> },
            { key: 'grantDeadlines' as const, label: 'Grant Deadlines', desc: 'Reminders for upcoming grant utilization deadlines', icon: <Clock className="h-4 w-4 text-gray-400" /> },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                {item.icon}
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
              <Toggle
                enabled={notifications[item.key]}
                onToggle={() => toggleNotification(item.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Data Sync Settings */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-gray-900">Data Sync Settings</h3>
        </div>

        <div className="space-y-0 divide-y">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Automatic Sync</p>
              <p className="text-xs text-gray-500">Automatically sync data from QuickBooks on schedule</p>
            </div>
            <Toggle
              enabled={syncSettings.autoSync as boolean}
              onToggle={() => toggleSync('autoSync')}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Sync Frequency</p>
              <p className="text-xs text-gray-500">How often to pull new data</p>
            </div>
            <select
              value={syncSettings.syncFrequency}
              onChange={(e) => setSyncSettings(prev => ({ ...prev, syncFrequency: e.target.value }))}
              className="text-xs border rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="every-hour">Every hour</option>
              <option value="every-6-hours">Every 6 hours</option>
              <option value="every-12-hours">Every 12 hours</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Include Historical Data</p>
              <p className="text-xs text-gray-500">Sync transactions from before connection date</p>
            </div>
            <Toggle
              enabled={syncSettings.includeHistorical as boolean}
              onToggle={() => toggleSync('includeHistorical')}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Class &amp; Location Tracking</p>
              <p className="text-xs text-gray-500">Sync QuickBooks class and location data for functional expense mapping</p>
            </div>
            <Toggle
              enabled={syncSettings.classTracking as boolean}
              onToggle={() => toggleSync('classTracking')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Settings,
  Bell,
  Shield,
  Users,
  Database,
  Mail,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Globe,
  Clock,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'notifications' | 'integrations'>('portfolio');

  const [riskThresholds, setRiskThresholds] = useState({
    highRisk: 45,
    elevated: 60,
    moderate: 75,
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    highRiskImmediate: true,
    mediumRiskDaily: true,
    lowRiskWeekly: false,
    weeklyDigest: true,
    monthlyReport: true,
    complianceDeadlines: true,
    grantExpirations: true,
  });

  const tabs = [
    { id: 'portfolio' as const, label: 'Portfolio Configuration', icon: Sliders },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'integrations' as const, label: 'Integrations', icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your portfolio monitoring and notification preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Portfolio Configuration */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {/* Risk Thresholds */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">Risk Score Thresholds</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Customize the thresholds that define risk level categories for grantees in your portfolio.
            </p>
            <div className="space-y-4">
              {[
                { label: 'High Risk (below)', key: 'highRisk' as const, color: 'text-red-600', bgColor: 'bg-red-50' },
                { label: 'Elevated Risk (below)', key: 'elevated' as const, color: 'text-orange-600', bgColor: 'bg-orange-50' },
                { label: 'Moderate Risk (below)', key: 'moderate' as const, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
              ].map((threshold) => (
                <div key={threshold.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', threshold.bgColor)}>
                      <span className={cn('text-xs font-bold', threshold.color)}>
                        {riskThresholds[threshold.key]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{threshold.label}</p>
                      <p className="text-xs text-gray-400">Score &lt; {riskThresholds[threshold.key]}</p>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={riskThresholds[threshold.key]}
                    onChange={(e) =>
                      setRiskThresholds({ ...riskThresholds, [threshold.key]: Number(e.target.value) })
                    }
                    className="w-40 accent-amber-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Monitoring Frequency */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">Monitoring Frequency</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: 'Financial Data Sync', value: 'Every 6 hours', status: 'active' },
                { label: 'Risk Score Recalculation', value: 'Daily at 6:00 AM', status: 'active' },
                { label: 'Anomaly Detection', value: 'Continuous', status: 'active' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{item.value}</p>
                  <div className="mt-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-[11px] text-green-600 font-medium">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Program Areas */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">Program Area Focus</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Select which program areas to include in portfolio monitoring.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Youth Services', 'Health', 'Education', 'Environment', 'Arts', 'Housing', 'Community Development', 'Food Security'].map((area) => (
                <button
                  key={area}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <CheckCircle className="inline-block h-3 w-3 mr-1" />
                  {area}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Alert Notifications */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">Alert Notifications</h2>
            </div>
            <div className="space-y-3">
              {[
                { key: 'emailAlerts' as const, label: 'Email Alerts', desc: 'Receive alert notifications via email' },
                { key: 'highRiskImmediate' as const, label: 'High-Risk Immediate Alerts', desc: 'Get notified immediately when a grantee enters high-risk status' },
                { key: 'mediumRiskDaily' as const, label: 'Medium Risk Daily Digest', desc: 'Daily summary of medium-risk alerts' },
                { key: 'lowRiskWeekly' as const, label: 'Low Risk Weekly Summary', desc: 'Weekly rollup of low-risk and informational alerts' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <button
                    onClick={() =>
                      setNotifications({ ...notifications, [item.key]: !notifications[item.key] })
                    }
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                      notifications[item.key] ? 'bg-amber-600' : 'bg-gray-300'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm',
                        notifications[item.key] ? 'translate-x-4.5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Report Notifications */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">Report Notifications</h2>
            </div>
            <div className="space-y-3">
              {[
                { key: 'weeklyDigest' as const, label: 'Weekly Portfolio Digest', desc: 'Summary of portfolio changes every Monday' },
                { key: 'monthlyReport' as const, label: 'Monthly Health Report', desc: 'Comprehensive portfolio analysis on the 1st of each month' },
                { key: 'complianceDeadlines' as const, label: 'Compliance Deadline Reminders', desc: '30-day advance notice of filing deadlines' },
                { key: 'grantExpirations' as const, label: 'Grant Expiration Alerts', desc: '60-day advance notice of grant end dates' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <button
                    onClick={() =>
                      setNotifications({ ...notifications, [item.key]: !notifications[item.key] })
                    }
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                      notifications[item.key] ? 'bg-amber-600' : 'bg-gray-300'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm',
                        notifications[item.key] ? 'translate-x-4.5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notification Recipients */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">Notification Recipients</h2>
            </div>
            <div className="space-y-2">
              {[
                { name: 'Maria Rodriguez', email: 'maria.rodriguez@pnwfoundation.org', role: 'Portfolio Manager' },
                { name: 'James Chen', email: 'j.chen@pnwfoundation.org', role: 'Chief Program Officer' },
                { name: 'Sarah Williams', email: 's.williams@pnwfoundation.org', role: 'Compliance Director' },
              ].map((person) => (
                <div key={person.email} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-600">
                        {person.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{person.name}</p>
                      <p className="text-xs text-gray-400">{person.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                    {person.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">Connected Accounting Systems</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Manage connections to grantee accounting systems for real-time financial data syncing.
            </p>
            <div className="space-y-3">
              {[
                { name: 'QuickBooks Online', orgs: 22, status: 'Connected', lastSync: '2 hours ago' },
                { name: 'Xero', orgs: 7, status: 'Connected', lastSync: '4 hours ago' },
                { name: 'Sage Intacct', orgs: 10, status: 'Connected', lastSync: '1 hour ago' },
                { name: 'NetSuite', orgs: 6, status: 'Connected', lastSync: '3 hours ago' },
                { name: 'FreshBooks', orgs: 5, status: 'Connected', lastSync: '6 hours ago' },
              ].map((system) => (
                <div key={system.name} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Database className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{system.name}</p>
                      <p className="text-xs text-gray-400">{system.orgs} organizations · Last sync: {system.lastSync}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {system.status}
                    </span>
                    <button className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Sources */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-gray-900">External Data Sources</h2>
            </div>
            <div className="space-y-3">
              {[
                { name: 'IRS E-File (990 Data)', status: 'Active', desc: 'Automated 990 filing retrieval and analysis' },
                { name: 'State Registry API', status: 'Active', desc: 'Oregon Secretary of State charitable registration data' },
                { name: 'GuideStar / Candid', status: 'Active', desc: 'Nonprofit profile and financial data enrichment' },
                { name: 'SAM.gov', status: 'Active', desc: 'Federal exclusion and debarment checks' },
              ].map((source) => (
                <div key={source.name} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{source.name}</p>
                    <p className="text-xs text-gray-400">{source.desc}</p>
                  </div>
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-600">
                    {source.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="rounded-md bg-amber-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700 transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
}

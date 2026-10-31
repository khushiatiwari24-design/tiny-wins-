import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  CloudRain,
  Sliders,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Shield,
  Smartphone,
  Eye,
} from 'lucide-react';
import { getSettings, saveSettings, saveSavedRoutes, saveNotifications, DEFAULT_SETTINGS } from '../services/storage';
import { INITIAL_SAVED_ROUTES, DEMO_NOTIFICATIONS } from '../data/demoData';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { UserSettings, TransportMode } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettingsState] = useState<UserSettings>(getSettings());
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettingsState(updated);
    saveSettings(updated);

    if (key === 'theme') {
      if (value === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    triggerToast('Preferences saved successfully');
  };

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all saved routes, recent searches, and demo preferences to default?')) {
      saveSavedRoutes(INITIAL_SAVED_ROUTES);
      saveNotifications(DEMO_NOTIFICATIONS);
      saveSettings(DEFAULT_SETTINGS);
      setSettingsState(DEFAULT_SETTINGS);
      document.documentElement.classList.remove('dark');
      triggerToast('All data reset to initial demo defaults');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      <DemoDataNotice />

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-7 h-7 text-teal-600" />
          <span>Commuter Settings & Simulation Controls</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Customize crowd tolerance thresholds, transit preferences, and simulated weather conditions
        </p>
      </div>

      {/* Visual & Interface Theme */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <h2 className="font-bold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          Interface Appearance
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              Color Theme
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Default is clean Light SaaS theme with high-contrast accessibility
            </div>
          </div>

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => updateSetting('theme', 'light')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                settings.theme === 'light'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Theme</span>
            </button>
            <button
              onClick={() => updateSetting('theme', 'dark')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                settings.theme === 'dark'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500'
              }`}
            >
              <Moon className="w-4 h-4 text-blue-400" />
              <span>Dark Theme</span>
            </button>
          </div>
        </div>
      </section>

      {/* Simulation & Environmental Modifiers */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <CloudRain className="w-5 h-5 text-teal-600" />
          <h2 className="font-bold text-base text-slate-900 dark:text-white">
            Monsoon & Weather Impact Simulator
          </h2>
        </div>

        <div>
          <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 mb-1">
            Weather Severity Multiplier
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Simulates how Mumbai rainfall triggers suburban train slow-zones and redirects passengers to Metro and AC buses.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'normal',
                label: 'Normal Conditions',
                desc: 'Standard timetable and historical passenger density',
              },
              {
                id: 'light_rain',
                label: 'Light Monsoon Drizzle',
                desc: '+10% demand surge & minor road traffic delays',
              },
              {
                id: 'heavy_rain',
                label: 'Heavy Waterlogging Surge',
                desc: '+28% Metro shift, heavy crowding on elevated lines',
              },
            ].map((w) => (
              <button
                key={w.id}
                onClick={() => updateSetting('monsoonMultiplier', w.id as any)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  settings.monsoonMultiplier === w.id
                    ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-1 ring-teal-500'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-xs">{w.label}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                  {w.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Commuter Threshold Preferences */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        <h2 className="font-bold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          Commute Planning Thresholds
        </h2>

        {/* Max crowd threshold slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              Maximum Acceptable Crowd Tolerance
            </span>
            <span className="font-bold text-teal-600 dark:text-teal-400 text-sm">
              {settings.maxCrowdThreshold}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            Journeys predicted above this occupancy will trigger warning badges in results.
          </p>
          <input
            type="range"
            min={40}
            max={95}
            step={5}
            value={settings.maxCrowdThreshold}
            onChange={(e) => updateSetting('maxCrowdThreshold', parseInt(e.target.value, 10))}
            className="w-full accent-teal-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>40% (Seats guaranteed)</span>
            <span>70% (Standing room)</span>
            <span>95% (Dense crush)</span>
          </div>
        </div>

        {/* Walking speed preference */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              Walking Speed during Station Interchange
            </div>
            <div className="text-xs text-slate-500">
              Affects estimated transfer time when switching between lines at Dadar or Andheri
            </div>
          </div>

          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            {[
              { id: 'slow', label: 'Relaxed (3 km/h)' },
              { id: 'moderate', label: 'Normal (4.5 km/h)' },
              { id: 'brisk', label: 'Brisk (6 km/h)' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => updateSetting('walkingSpeed', s.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  settings.walkingSpeed === s.id
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 font-bold shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accessibility default toggle */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              Always Prioritize Step-Free Access
            </div>
            <div className="text-xs text-slate-500">
              Auto-select step-free routing across all future journey searches
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.accessibilityPriority}
              onChange={(e) => updateSetting('accessibilityPriority', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>
      </section>

      {/* Demo Data Management */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            Reset Demo Dataset
          </h2>
          <p className="text-xs text-slate-500">
            Restore sample favorite routes, notifications, and reset custom configurations to default state.
          </p>
        </div>

        <button
          onClick={handleResetData}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-200 dark:border-rose-900 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </section>

      {/* Floating Save Confirmation */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{saveToast}</span>
        </div>
      )}
    </div>
  );
};

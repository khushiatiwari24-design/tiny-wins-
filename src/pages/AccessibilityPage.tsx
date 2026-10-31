import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accessibility as AccessibilityIcon,
  Phone,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Compass,
  ShieldCheck,
  HeartHandshake,
  AlertTriangle,
  Info,
  MapPin,
} from 'lucide-react';
import { MUMBAI_STATIONS } from '../data/routes';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { Station } from '../types';

export const AccessibilityPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'all' | 'step_free' | 'elevator'>('all');
  const [searchStation, setSearchStation] = useState('');

  const filteredStations = MUMBAI_STATIONS.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchStation.toLowerCase()) ||
      s.code.toLowerCase().includes(searchStation.toLowerCase()) ||
      s.zone.toLowerCase().includes(searchStation.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'step_free') {
      return s.accessibility.stepFreeCategory === 'Fully Step-Free';
    }
    if (filterType === 'elevator') {
      return s.accessibility.hasElevator;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <DemoDataNotice />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <AccessibilityIcon className="w-7 h-7 text-teal-600" />
            <span>Accessible Commute & Station Assistance</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Verified step-free access guides, station elevators, and special mobility helplines across Mumbai
          </p>
        </div>

        <button
          onClick={() => navigate('/plan')}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Plan Step-Free Journey</span>
        </button>
      </div>

      {/* Assistance Helpline Contacts Banner */}
      <section className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-teal-800/60 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-2">
              <Phone className="w-3.5 h-3.5" />
              <span>Official Mumbai Transit Assistance Helplines</span>
            </div>
            <h2 className="text-xl font-bold">24x7 Wheelchair & Station Porter Assistance</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Passengers requiring ramp deployment, battery car assistance, or escort through Foot Overbridges (FOBs) can contact railway staff 30 minutes before arrival.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 text-xs font-mono">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <div className="text-[10px] text-teal-300 font-sans font-semibold">Indian Railways Universal</div>
              <div className="text-base font-bold text-white">139 (RailMadad)</div>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <div className="text-[10px] text-teal-300 font-sans font-semibold">Western Railway Care</div>
              <div className="text-base font-bold text-white">022-22005388</div>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <div className="text-[10px] text-teal-300 font-sans font-semibold">Metro One Care</div>
              <div className="text-base font-bold text-white">022-30310901</div>
            </div>
          </div>
        </div>
      </section>

      {/* Commuter Tips for Accessible Travel */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center font-bold mb-3">
            1
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Reserved Coach Positioning
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            On suburban 12-car locals, Divyangjan (accessible) compartments are located right next to the motorman cabin (coach 1 & coach 12) with dedicated boarding ramps.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center font-bold mb-3">
            2
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Avoid Dadar Peak Interchange
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Dadar interchange footbridges experience heavy rush during 08:30–10:30. For step-free East-West connectivity, use the Metro Line 1 elevated skywalk at Andheri.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center font-bold mb-3">
            3
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Metro 100% Level Boarding
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            All Mumbai Metro stations (Line 1, 2A, 7, 3) offer guaranteed tactile paths, wide automated fare gates, platform-to-train level boarding, and lifts on all concourses.
          </p>
        </div>
      </section>

      {/* Station-by-Station Accessibility Audit Table */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">
              Station Accessibility Directory
            </h2>
            <p className="text-xs text-slate-500">
              Audit of step-free facilities, elevators, escalators, and contact numbers
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchStation}
                onChange={(e) => setSearchStation(e.target.value)}
                placeholder="Search station..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('step_free')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterType === 'step_free'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Step-Free Only
              </button>
              <button
                onClick={() => setFilterType('elevator')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  filterType === 'elevator'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Elevators
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Station</th>
                <th className="py-3 px-3">Rating Status</th>
                <th className="py-3 px-3 text-center">Elevators</th>
                <th className="py-3 px-3 text-center">Escalators</th>
                <th className="py-3 px-3 text-center">Tactile Path</th>
                <th className="py-3 px-3 text-center">Accessible WC</th>
                <th className="py-3 px-3">Station Assistance Helpdesk</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredStations.map((station) => (
                <tr key={station.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {station.name} <span className="font-mono text-slate-400 text-[10px]">({station.code})</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{station.zone}</div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        station.accessibility.stepFreeCategory === 'Fully Step-Free'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : station.accessibility.stepFreeCategory === 'Partially Step-Free'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {station.accessibility.stepFreeCategory}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {station.accessibility.hasElevator ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {station.accessibility.hasEscalator ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {station.accessibility.hasTactilePaving ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    {station.accessibility.accessibleRestrooms ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
                    {station.accessibility.assistancePhone}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => navigate(`/plan?origin=${station.id}`)}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      Plan →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

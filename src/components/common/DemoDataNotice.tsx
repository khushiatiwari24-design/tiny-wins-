import React, { useState } from 'react';
import { Sparkles, Info, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface DemoDataNoticeProps {
  className?: string;
  onRefresh?: () => void;
}

export const DemoDataNotice: React.FC<DemoDataNoticeProps> = ({ className = '', onRefresh }) => {
  const [showModal, setShowModal] = useState(false);
  const [timestamp, setTimestamp] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const handleRefresh = () => {
    setTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    if (onRefresh) onRefresh();
  };

  return (
    <>
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400 ${className}`}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            Simulated Predictive Model v2.4
          </span>
          <span className="hidden sm:inline text-slate-400 dark:text-slate-500">•</span>
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
            Generated via historical Mumbai commute priors
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Refreshed: {timestamp}</span>
          <button
            onClick={handleRefresh}
            title="Refresh simulated cache"
            className="p-1 hover:text-teal-600 dark:hover:text-teal-400 transition-colors rounded"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-medium ml-1"
          >
            <Info className="w-3 h-3" />
            <span>Methodology</span>
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3 text-teal-700 dark:text-teal-400 font-semibold text-base">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <h3>How CrowdSense Predictions Are Generated</h3>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <p>
                <strong>Simulated Data Notice:</strong> CrowdSense uses a calibrated synthetic mobility model based on historical passenger demand profiles on Mumbai's Western, Central, and Metro corridors.
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="font-medium text-slate-900 dark:text-slate-100 text-xs">Forecasting Factors:</div>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <li><strong>Diurnal Asymmetry:</strong> Southbound peaks in AM towards Churchgate/CSMT; Northbound peaks in PM towards Borivali/Thane.</li>
                  <li><strong>Mode Capacities:</strong> 12/15-car suburban EMUs, 6-car metro trains, and low-floor electric AC feeder buses.</li>
                  <li><strong>Corridor Frequency:</strong> Headway density directly impacts platform waiting times and boarding surge factors.</li>
                  <li><strong>Monsoon Simulation:</strong> Optional monsoon modifier simulates suburban rain delays and spillover into metro transit.</li>
                </ul>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <span>
                  This application is a predictive prototype for planning departures. It does not replace real-time railway audio announcements or emergency station advisories.
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

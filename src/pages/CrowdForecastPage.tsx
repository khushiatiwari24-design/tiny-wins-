import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Activity,
  Calendar,
  Clock,
  Sparkles,
  Zap,
  Info,
  ShieldCheck,
  TrendingDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Users,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { MUMBAI_ROUTES } from '../data/routes';
import { predictCrowd, generate24HourForecast, getSeverityColor, getSeverityLabel } from '../services/crowdForecast';
import { CrowdBadge } from '../components/common/CrowdBadge';
import { OccupancyBar } from '../components/common/OccupancyBar';
import { ModeIcon } from '../components/common/ModeIcon';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { getSettings } from '../services/storage';

export const CrowdForecastPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const settings = getSettings();

  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    searchParams.get('route') || MUMBAI_ROUTES[0].id
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    searchParams.get('time') || '09:00'
  );
  const [isWeekend, setIsWeekend] = useState<boolean>(false);
  const [explainOpen, setExplainOpen] = useState<boolean>(false);

  const selectedRoute = useMemo(
    () => MUMBAI_ROUTES.find((r) => r.id === selectedRouteId) || MUMBAI_ROUTES[0],
    [selectedRouteId]
  );

  // 24-hour half-hourly forecast series for Recharts
  const forecastSeries = useMemo(() => {
    return generate24HourForecast(selectedRoute, 30, isWeekend, settings.monsoonMultiplier);
  }, [selectedRoute, isWeekend, settings.monsoonMultiplier]);

  // Current selected point prediction
  const currentPrediction = useMemo(() => {
    return predictCrowd(selectedRoute, selectedTime, isWeekend, settings.monsoonMultiplier);
  }, [selectedRoute, selectedTime, isWeekend, settings.monsoonMultiplier]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <DemoDataNotice />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-teal-600" />
            <span>Predictive Crowd Forecast</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Hourly passenger volume curve, confidence intervals, and optimal departure windows
          </p>
        </div>

        <button
          onClick={() =>
            navigate(
              `/plan?origin=${selectedRoute.originStationId}&dest=${selectedRoute.destinationStationId}&time=${selectedTime}`
            )
          }
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <span>Plan with this route</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Corridor & Time Selectors */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-6">
            <label htmlFor="forecast-route-select" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Select Transport Corridor
            </label>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <ModeIcon mode={selectedRoute.mode} />
              </div>
              <select
                id="forecast-route-select"
                aria-label="Select transport corridor"
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
              >
                {MUMBAI_ROUTES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.corridor})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="forecast-departure-time" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Departure Time Marker
            </label>
            <input
              id="forecast-departure-time"
              aria-label="Departure time marker"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Commute Day Type
            </label>
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setIsWeekend(false)}
                className={`py-1.5 rounded-lg transition-all ${
                  !isWeekend
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Weekday
              </button>
              <button
                onClick={() => setIsWeekend(true)}
                className={`py-1.5 rounded-lg transition-all ${
                  isWeekend
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Weekend
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Summary Cards for the Selected Departure Time */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Predicted Occupancy</span>
            <CrowdBadge
              occupancy={currentPrediction.occupancy}
              severity={currentPrediction.severity}
              size="sm"
            />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {currentPrediction.occupancy}%
          </div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            {currentPrediction.label}
          </div>
          <div className="mt-2">
            <OccupancyBar occupancy={currentPrediction.occupancy} severity={currentPrediction.severity} height="h-1.5" />
          </div>
        </div>

        {/* Confidence Card (Distinguished from occupancy) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Forecast Confidence</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
              {currentPrediction.confidenceLabel}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {currentPrediction.confidenceScore}%
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Based on historical sensor proxies & schedule integrity
          </div>
          <div className="mt-2 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
            &plusmn;4% variance window
          </div>
        </div>

        {/* Platform Wait Time Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Est. Platform Wait</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            ~{currentPrediction.estimatedWaitMinutes} <span className="text-sm font-semibold text-slate-500">mins</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Scheduled headway: {selectedRoute.frequencyMinutes.peak} mins
          </div>
          <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
            {currentPrediction.occupancy > 80 ? 'May miss 1 train due to crush' : 'Boarding on first arrival'}
          </div>
        </div>

        {/* Smart Departure Shift Recommendation */}
        {currentPrediction.recommendationDelta && (
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 rounded-2xl p-4 border border-teal-200 dark:border-teal-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-teal-800 dark:text-teal-300 mb-1">
                <span>Optimal Departure Shift</span>
                <Sparkles className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {currentPrediction.recommendationDelta.recommendedTime}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                {currentPrediction.recommendationDelta.reason}
              </p>
            </div>

            <button
              onClick={() => setSelectedTime(currentPrediction.recommendationDelta!.recommendedTime)}
              className="mt-3 py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all self-start flex items-center gap-1"
            >
              <span>Shift to {currentPrediction.recommendationDelta.recommendedTime}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </section>

      {/* Main Interactive Recharts Forecast Visualization */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <span>24-Hour Passenger Density Curve</span>
              <span className="text-xs font-normal text-slate-400">
                (30-minute intervals)
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Interactive timeline showing peak rush periods, standing density, and seating likelihood
            </p>
          </div>

          {/* Severity Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">Comfort (&le;45%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-400">Moderate (46-70%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-slate-600 dark:text-slate-400">Crowded (71-85%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-400">Crush (&gt;85%)</span>
            </span>
          </div>
        </div>

        {/* Area Chart Container */}
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={3}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                ticks={[0, 25, 50, 75, 100]}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-800 space-y-1">
                        <div className="font-bold text-teal-400 flex items-center justify-between gap-4">
                          <span>{d.time} Departure</span>
                          <span className="text-slate-400 font-normal">
                            {isWeekend ? 'Weekend' : 'Weekday'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <span className="text-slate-300">Predicted Load:</span>
                          <span className="font-bold text-base text-white">{d.occupancy}%</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Classification: <span className="text-teal-300 font-semibold">{d.severityLabel}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Highlight Selected Departure Marker */}
              <ReferenceLine
                x={selectedTime}
                stroke="#0f766e"
                strokeWidth={2}
                label={{
                  value: `Selected: ${selectedTime}`,
                  position: 'top',
                  fill: '#0f766e',
                  fontSize: 11,
                  fontWeight: 'bold',
                }}
              />
              {/* Threshold Lines */}
              <ReferenceLine
                y={85}
                stroke="#e11d48"
                strokeDasharray="4 4"
                label={{ value: 'Crush Peak (85%)', fill: '#e11d48', fontSize: 10 }}
              />
              <ReferenceLine
                y={50}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: 'Seated Likelihood (50%)', fill: '#10b981', fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="occupancy"
                stroke="#0d9488"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#forecastAreaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <span>Click on departure times above to update the marker</span>
          <span>Peak hours: AM (08:30–10:30) • PM (17:30–20:30)</span>
        </div>
      </section>

      {/* Expandable "How is this forecast calculated?" Panel */}
      <section className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => setExplainOpen(!explainOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-teal-600" />
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              How is this crowd forecast calculated?
            </span>
          </div>
          {explainOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {explainOpen && (
          <div className="p-5 pt-0 space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-700/60">
            <p className="mt-3">
              The CrowdSense forecasting engine implements a deterministic, multi-variable heuristic model calibrated to Mumbai transit patterns. Calculations are reproducible for identical corridor and time inputs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  1. Temporal & Directional Distribution
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Morning rush factors in Southbound asymmetry (heavy boarding at Borivali, Andheri, Thane towards Fort & Nariman Point). Evening curves invert to favor Northbound dispersal.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  2. Transit Mode Dampening
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  AC locals apply an elasticity damping factor (-18%) due to fare barriers. Metro Line 1 applies rapid-headway clearing (+12% flow rate).
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Notice: All outputs are generated from simulated historical priors for demo purposes and are clearly distinguished from live government ticketing telemetry.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

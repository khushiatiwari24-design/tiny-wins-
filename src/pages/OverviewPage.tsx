import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  TrendingUp,
  Clock,
  ShieldCheck,
  ArrowRight,
  Filter,
  Sparkles,
  Zap,
  Users,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { MUMBAI_ROUTES } from '../data/routes';
import { predictCrowd, generate24HourForecast, getSeverityColor } from '../services/crowdForecast';
import { CrowdBadge } from '../components/common/CrowdBadge';
import { OccupancyBar } from '../components/common/OccupancyBar';
import { MetricCard } from '../components/common/MetricCard';
import { ModeIcon } from '../components/common/ModeIcon';
import { DemoDataNotice } from '../components/common/DemoDataNotice';
import { getSettings } from '../services/storage';
import { Route, TransportMode } from '../types';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const settings = getSettings();

  const [activeModeFilter, setActiveModeFilter] = useState<'all' | TransportMode>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string>(MUMBAI_ROUTES[0].id);
  const [selectedTime, setSelectedTime] = useState<string>('08:45');

  const selectedRoute = useMemo(
    () => MUMBAI_ROUTES.find((r) => r.id === selectedRouteId) || MUMBAI_ROUTES[0],
    [selectedRouteId]
  );

  // Filtered routes for the crowd conditions panel
  const filteredRoutes = useMemo(() => {
    if (activeModeFilter === 'all') return MUMBAI_ROUTES;
    return MUMBAI_ROUTES.filter((r) => r.mode === activeModeFilter);
  }, [activeModeFilter]);

  // Dynamically calculate metrics from the actual dataset for the current time
  const metrics = useMemo(() => {
    const allPredictions = MUMBAI_ROUTES.map((route) =>
      predictCrowd(route, selectedTime, false, settings.monsoonMultiplier)
    );

    const totalRoutes = MUMBAI_ROUTES.length;
    const avgOccupancy = Math.round(
      allPredictions.reduce((acc, p) => acc + p.occupancy, 0) / totalRoutes
    );

    const lowerCrowdOpportunities = allPredictions.filter((p) => p.occupancy <= 65).length;
    const avgWaitMinutes = (
      allPredictions.reduce((acc, p) => acc + p.estimatedWaitMinutes, 0) / totalRoutes
    ).toFixed(1);

    return {
      totalRoutes,
      avgOccupancy,
      lowerCrowdOpportunities,
      avgWaitMinutes,
    };
  }, [selectedTime, settings.monsoonMultiplier]);

  // 24h curve for the selected route
  const hourlyData = useMemo(() => {
    return generate24HourForecast(selectedRoute, 60, false, settings.monsoonMultiplier);
  }, [selectedRoute, settings.monsoonMultiplier]);

  // 3 Smart departure recommendations
  const recommendations = useMemo(() => {
    return [
      {
        id: 'rec-early',
        title: 'Early Bird Advantage',
        route: selectedRoute,
        suggestedTime: '07:30',
        label: 'Pre-Rush Window',
        benefit: 'Avoid Southbound crushing before office surge',
        durationMinutes: selectedRoute.approximateDurationMinutes - 2,
        prediction: predictCrowd(selectedRoute, '07:30', false, settings.monsoonMultiplier),
      },
      {
        id: 'rec-ac',
        title: 'AC Alternate Transition',
        route: MUMBAI_ROUTES.find((r) => r.isAc && r.originStationId === selectedRoute.originStationId) || MUMBAI_ROUTES[1],
        suggestedTime: selectedTime,
        label: 'Climate Controlled',
        benefit: 'Regulated coach boarding with 30% higher seat probability',
        durationMinutes: selectedRoute.approximateDurationMinutes - 3,
        prediction: predictCrowd(
          MUMBAI_ROUTES.find((r) => r.isAc && r.originStationId === selectedRoute.originStationId) || MUMBAI_ROUTES[1],
          selectedTime,
          false,
          settings.monsoonMultiplier
        ),
      },
      {
        id: 'rec-post',
        title: 'Post-Peak Clearance',
        route: selectedRoute,
        suggestedTime: '10:45',
        label: 'Post-Rush Window',
        benefit: 'Major drop in platform dwell times and standing congestion',
        durationMinutes: selectedRoute.approximateDurationMinutes,
        prediction: predictCrowd(selectedRoute, '10:45', false, settings.monsoonMultiplier),
      },
    ];
  }, [selectedRoute, selectedTime, settings.monsoonMultiplier]);

  const currentRoutePrediction = useMemo(() => {
    return predictCrowd(selectedRoute, selectedTime, false, settings.monsoonMultiplier);
  }, [selectedRoute, selectedTime, settings.monsoonMultiplier]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Simulated Status Pill */}
      <DemoDataNotice />

      {/* Hero Welcome Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-700/60 relative overflow-hidden">
        {/* Subtle decorative background blur */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-4 border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mumbai Urban Transit Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Travel smarter. <span className="text-teal-400">Skip the rush.</span>
          </h1>

          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            Predict crowd conditions before you leave. CrowdSense models commuter volume across Mumbai's Western, Central, and Metro corridors to uncover low-congestion departure windows.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/plan')}
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-teal-500/20 hover:scale-[1.02]"
            >
              <Compass className="w-4 h-4" />
              <span>Plan a journey</span>
            </button>

            <button
              onClick={() => navigate('/forecast')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all border border-white/15"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Explore crowd patterns</span>
            </button>
          </div>
        </div>
      </section>

      {/* Key Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monitored Corridors"
          value={metrics.totalRoutes}
          unit="lines"
          icon={<Layers className="w-4 h-4" />}
          changeLabel="100% active"
          changePositive={true}
          tooltip="Real simulated corridors monitored covering Western, Central, Metro 1/3, and BEST Express"
          subtext="Suburban & Metro"
        />

        <MetricCard
          title="Avg Predicted Occupancy"
          value={`${metrics.avgOccupancy}%`}
          icon={<Users className="w-4 h-4" />}
          changeLabel={metrics.avgOccupancy > 75 ? 'Peak Hour Load' : 'Moderate Flow'}
          changePositive={metrics.avgOccupancy <= 70}
          tooltip="Weighted average passenger load across all Mumbai lines at the selected departure time"
          subtext={`At ${selectedTime}`}
        />

        <MetricCard
          title="Lower-Crowd Windows"
          value={metrics.lowerCrowdOpportunities}
          unit="corridors"
          icon={<ShieldCheck className="w-4 h-4" />}
          changeLabel="Seats possible"
          changePositive={true}
          tooltip="Lines operating below 65% capacity threshold at this hour"
          subtext="Under 65% occupancy"
        />

        <MetricCard
          title="Avg Waiting Time"
          value={metrics.avgWaitMinutes}
          unit="mins"
          icon={<Clock className="w-4 h-4" />}
          changeLabel="High frequency"
          changePositive={true}
          tooltip="Estimated average platform wait time based on peak schedule headways"
          subtext="Headway density"
        />
      </section>

      {/* Interactive Main Grid: Conditions Panel & 24h Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Crowd Conditions Panel (7 cols) */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Corridor Crowd Conditions</span>
                <span className="text-xs font-normal text-slate-500">({filteredRoutes.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any corridor to view detailed 24h forecast & departure shift
              </p>
            </div>

            {/* Quick departure time selector for preview */}
            <div className="flex items-center gap-2">
              <label htmlFor="time-preset-select" className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Time:</span>
              </label>
              <select
                id="time-preset-select"
                aria-label="Departure time preset"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="08:45">08:45 (Morning Rush)</option>
                <option value="11:30">11:30 (Mid-Day Calm)</option>
                <option value="14:15">14:15 (Afternoon)</option>
                <option value="18:30">18:30 (Evening Rush)</option>
                <option value="21:15">21:15 (Night Taper)</option>
              </select>
            </div>
          </div>

          {/* Mode Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-3 no-scrollbar border-b border-slate-100 dark:border-slate-800">
            {(
              [
                { label: 'All Modes', value: 'all' },
                { label: 'Fast Trains', value: 'train_fast' },
                { label: 'AC Express', value: 'train_ac' },
                { label: 'Metro Lines', value: 'metro' },
                { label: 'BEST Buses', value: 'bus_ac' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveModeFilter(filter.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeModeFilter === filter.value
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Routes List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1 overflow-y-auto max-h-[460px] pr-1">
            {filteredRoutes.map((route) => {
              const pred = predictCrowd(route, selectedTime, false, settings.monsoonMultiplier);
              const isSelected = route.id === selectedRouteId;

              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`py-3 px-2 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/80'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        <ModeIcon mode={route.mode} showLabel={false} className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {route.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{route.corridor}</span>
                          <span>•</span>
                          <span>{route.approximateDurationMinutes} mins</span>
                          <span>•</span>
                          <span>Next: ~{pred.estimatedWaitMinutes}m</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <CrowdBadge occupancy={pred.occupancy} severity={pred.severity} size="sm" />
                    </div>
                  </div>

                  {/* Compact Occupancy Progress Bar */}
                  <div className="mt-2.5">
                    <OccupancyBar occupancy={pred.occupancy} severity={pred.severity} height="h-1.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Hourly Crowd Trend for Selected Route (5 cols) */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-teal-600 dark:text-teal-400">
                24h Forecast Profile
              </span>
              <button
                onClick={() => navigate(`/forecast?route=${selectedRoute.id}`)}
                className="text-xs font-semibold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1"
              >
                <span>Deep dive</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
              {selectedRoute.name}
            </h3>

            <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Predicted at {selectedTime}
                </div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{currentRoutePrediction.occupancy}%</span>
                  <span className="text-xs font-semibold text-slate-500">occupancy</span>
                </div>
              </div>
              <CrowdBadge
                occupancy={currentRoutePrediction.occupancy}
                severity={currentRoutePrediction.severity}
                size="md"
              />
            </div>

            {/* Recharts Hourly Trend Area Chart */}
            <div className="mt-4 h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="crowdGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    interval={3}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    ticks={[0, 45, 75, 100]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-lg border border-slate-800">
                            <div className="font-bold text-teal-400">{data.time}</div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span>Occupancy:</span>
                              <span className="font-semibold">{data.occupancy}%</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {data.severityLabel}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Visual indication of peak rush hour thresholds */}
                  <ReferenceLine y={80} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Crush Peak', fill: '#f43f5e', fontSize: 9 }} />
                  <ReferenceLine y={45} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Comfort', fill: '#10b981', fontSize: 9 }} />
                  <Area
                    type="monotone"
                    dataKey="occupancy"
                    stroke="#0d9488"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#crowdGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 px-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Comfort (&lt;45%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Moderate (45-70%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Crush (&gt;80%)
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">Want alternate departure timing?</span>
            <button
              onClick={() => navigate(`/plan?origin=${selectedRoute.originStationId}&dest=${selectedRoute.destinationStationId}&time=${selectedTime}`)}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Compare journeys</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </section>
      </div>

      {/* Recommended Departures Section */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">
                Intelligent Departure Recommendations
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Algorithmically calculated departure shifts that significantly reduce crowd density
            </p>
          </div>

          <span className="text-xs bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-full font-semibold border border-teal-200/60">
            Based on {selectedRoute.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((rec) => {
            const crowdDiff = rec.prediction.occupancy - currentRoutePrediction.occupancy;
            const isReduction = crowdDiff < 0;

            return (
              <div
                key={rec.id}
                className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/70 dark:border-slate-700/70 flex flex-col justify-between hover:border-teal-500/50 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {rec.label}
                    </span>
                    <CrowdBadge
                      occupancy={rec.prediction.occupancy}
                      severity={rec.prediction.severity}
                      size="sm"
                    />
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {rec.suggestedTime}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">departure</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {rec.benefit}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs py-2 px-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-slate-500">Crowd Difference:</span>
                    <span
                      className={`font-bold ${
                        isReduction ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600'
                      }`}
                    >
                      {isReduction ? `${crowdDiff}% lower` : 'Comparable load'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Est. Duration: {rec.durationMinutes} mins
                  </span>

                  <button
                    onClick={() =>
                      navigate(
                        `/plan?origin=${rec.route.originStationId}&dest=${rec.route.destinationStationId}&time=${rec.suggestedTime}&mode=${rec.route.mode}`
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Use this time</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

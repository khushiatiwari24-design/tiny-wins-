import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Compass,
  ArrowRightLeft,
  Calendar,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  Accessibility,
  Bookmark,
  Share2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  ShieldCheck,
  TrendingUp,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { MUMBAI_STATIONS } from '../data/routes';
import { searchAndRankJourneys } from '../services/journeyRanking';
import { getSavedRoutes, addSavedRoute, removeSavedRoute, getSettings, addRecentSearch } from '../services/storage';
import { JourneyOption, RankingPriority, TransportMode } from '../types';
import { CrowdBadge } from '../components/common/CrowdBadge';
import { OccupancyBar } from '../components/common/OccupancyBar';
import { ModeIcon } from '../components/common/ModeIcon';
import { DemoDataNotice } from '../components/common/DemoDataNotice';

export const JourneyPlannerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const settings = getSettings();

  // Input states initialized from URL params or defaults
  const [originId, setOriginId] = useState<string>(searchParams.get('origin') || 'borivali');
  const [destinationId, setDestinationId] = useState<string>(searchParams.get('dest') || 'churchgate');
  const [departureDate, setDepartureDate] = useState<string>(
    searchParams.get('date') || new Date().toISOString().split('T')[0]
  );
  const [departureTime, setDepartureTime] = useState<string>(searchParams.get('time') || '08:45');
  const [modeFilter, setModeFilter] = useState<'all' | TransportMode>(
    (searchParams.get('mode') as TransportMode) || 'all'
  );
  const [maxCrowd, setMaxCrowd] = useState<number>(100);
  const [accessibilityPriority, setAccessibilityPriority] = useState<boolean>(false);
  const [rankingPriority, setRankingPriority] = useState<RankingPriority>('balanced');

  // Interactive UI states
  const [expandedJourneyId, setExpandedJourneyId] = useState<string | null>(null);
  const [compareList, setCompareList] = useState<JourneyOption[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [savedRouteIds, setSavedRouteIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync saved route status
  useEffect(() => {
    const saved = getSavedRoutes();
    setSavedRouteIds(saved.map((r) => `${r.originId}-${r.destinationId}`));
  }, []);

  // Validation
  const isSameStation = originId === destinationId;

  // Perform search and ranking
  const journeyResults = useMemo(() => {
    if (isSameStation) return [];

    const isWeekend = (() => {
      const d = new Date(departureDate);
      const day = d.getDay();
      return day === 0 || day === 6;
    })();

    return searchAndRankJourneys({
      originId,
      destinationId,
      departureTime,
      isWeekend,
      modeFilter,
      maxCrowd,
      accessibilityPriority,
      priority: rankingPriority,
      monsoonMultiplier: settings.monsoonMultiplier,
    });
  }, [
    originId,
    destinationId,
    departureTime,
    departureDate,
    modeFilter,
    maxCrowd,
    accessibilityPriority,
    rankingPriority,
    settings.monsoonMultiplier,
    isSameStation,
  ]);

  // Log to recent searches when valid
  useEffect(() => {
    if (!isSameStation) {
      const orig = MUMBAI_STATIONS.find((s) => s.id === originId)?.name || originId;
      const dest = MUMBAI_STATIONS.find((s) => s.id === destinationId)?.name || destinationId;
      addRecentSearch({
        originId,
        destinationId,
        originName: orig,
        destinationName: dest,
      });
    }
  }, [originId, destinationId, isSameStation]);

  const handleSwapStations = () => {
    const temp = originId;
    setOriginId(destinationId);
    setDestinationId(temp);
  };

  const handleSaveRoute = (journey: JourneyOption) => {
    const pairKey = `${originId}-${destinationId}`;
    const isCurrentlySaved = savedRouteIds.includes(pairKey);

    if (isCurrentlySaved) {
      // Find matching saved route ID
      const saved = getSavedRoutes().find((r) => r.originId === originId && r.destinationId === destinationId);
      if (saved) {
        removeSavedRoute(saved.id);
        setSavedRouteIds((prev) => prev.filter((k) => k !== pairKey));
        showToast('Route removed from Saved Routes');
      }
    } else {
      addSavedRoute({
        id: `fav-${Date.now()}`,
        customName: `${journey.origin} ➔ ${journey.destination} (${journey.lineName})`,
        originId,
        destinationId,
        preferredMode: journey.mode,
        preferredTime: departureTime,
        notes: `Saved from planner. Best departure around ${journey.departureTime}`,
        createdAt: new Date().toISOString().split('T')[0],
        frequencyLabel: 'Daily',
      });
      setSavedRouteIds((prev) => [...prev, pairKey]);
      showToast('Route successfully saved to your favorites!');
    }
  };

  const toggleCompare = (journey: JourneyOption) => {
    if (compareList.some((item) => item.id === journey.id)) {
      setCompareList(compareList.filter((item) => item.id !== journey.id));
    } else {
      if (compareList.length >= 3) {
        showToast('You can compare at most 3 journeys at once.');
        return;
      }
      setCompareList([...compareList, journey]);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <DemoDataNotice />

      {/* Page Title & Context */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-teal-600" />
            <span>Journey Planner</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Compare travel corridors, predicted crowd levels, and optimal departure times
          </p>
        </div>

        {compareList.length > 0 && (
          <button
            onClick={() => setCompareModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm animate-bounce"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Compare ({compareList.length}) Selected</span>
          </button>
        )}
      </div>

      {/* Primary Input Card */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Origin Station */}
          <div className="md:col-span-5">
            <label htmlFor="origin-station-select" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Origin Station
            </label>
            <select
              id="origin-station-select"
              aria-label="Origin station"
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              {MUMBAI_STATIONS.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.code}) — {station.zone}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Swap Button */}
          <div className="md:col-span-2 flex justify-center pt-2 md:pt-5">
            <button
              onClick={handleSwapStations}
              title="Swap origin and destination"
              aria-label="Swap origin and destination"
              className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all border border-slate-200 dark:border-slate-700"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Destination Station */}
          <div className="md:col-span-5">
            <label htmlFor="dest-station-select" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Destination Station
            </label>
            <select
              id="dest-station-select"
              aria-label="Destination station"
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              {MUMBAI_STATIONS.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.code}) — {station.zone}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Same Station Error Validation Banner */}
        {isSameStation && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Origin and destination cannot be identical. Please pick distinct origin and destination stations.
            </span>
          </div>
        )}

        {/* Date, Time & Mode Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label htmlFor="travel-date-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Travel Date
            </label>
            <div className="relative">
              <input
                id="travel-date-input"
                aria-label="Travel date"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="departure-time-input" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Departure Time
            </label>
            <input
              id="departure-time-input"
              aria-label="Departure time"
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="transport-mode-select" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Transport Mode
            </label>
            <select
              id="transport-mode-select"
              aria-label="Transport mode"
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Modes (Train, Metro, Bus)</option>
              <option value="train_fast">Fast Trains Only</option>
              <option value="train_slow">Slow Trains Only</option>
              <option value="train_ac">AC Trains Only</option>
              <option value="metro">Metro Lines Only</option>
              <option value="bus_ac">BEST AC Buses</option>
            </select>
          </div>

          <div>
            <label htmlFor="max-crowd-tolerance-select" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              Max Crowd Tolerance
            </label>
            <select
              id="max-crowd-tolerance-select"
              aria-label="Max crowd tolerance"
              value={maxCrowd}
              onChange={(e) => setMaxCrowd(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value={100}>Any Crowd Level</option>
              <option value={75}>Moderate or Lower (&le; 75%)</option>
              <option value={50}>Low Crowd Only (&le; 50%)</option>
            </select>
          </div>
        </div>

        {/* Quick Time Presets & Accessibility Toggle */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-medium mr-1">Time presets:</span>
            {[
              { label: 'Morning Peak (08:45)', time: '08:45' },
              { label: 'Mid-Day (12:30)', time: '12:30' },
              { label: 'Evening Peak (18:30)', time: '18:30' },
              { label: 'Night (21:30)', time: '21:30' },
            ].map((p) => (
              <button
                key={p.time}
                onClick={() => setDepartureTime(p.time)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  departureTime === p.time
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={accessibilityPriority}
              onChange={(e) => setAccessibilityPriority(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Accessibility className="w-3.5 h-3.5 text-teal-600" />
              <span>Prioritize Step-Free / Wheelchair Accessibility</span>
            </span>
          </label>
        </div>
      </section>

      {/* Ranking Strategy Selector */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Rank journeys by:
          </span>
          <div className="inline-flex p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            {[
              { label: 'Balanced', value: 'balanced' },
              { label: 'Least Crowded', value: 'least_crowded' },
              { label: 'Fastest', value: 'fastest' },
              { label: 'Accessible First', value: 'accessible' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setRankingPriority(p.value as RankingPriority)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  rankingPriority === p.value
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{journeyResults.length}</strong> viable departure options
        </div>
      </section>

      {/* Results List */}
      <section className="space-y-4">
        {journeyResults.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="font-bold text-slate-900 dark:text-white">No Direct Options Matching Filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Try adjusting your max crowd tolerance or selecting "All Modes" to view multimodal transfer options.
            </p>
          </div>
        ) : (
          journeyResults.map((journey) => {
            const isExpanded = expandedJourneyId === journey.id;
            const isCompared = compareList.some((item) => item.id === journey.id);
            const pairKey = `${originId}-${destinationId}`;
            const isSaved = savedRouteIds.includes(pairKey);

            return (
              <div
                key={journey.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-xs ${
                  journey.isRecommended
                    ? 'border-teal-400/80 dark:border-teal-600/80 ring-1 ring-teal-500/20'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Recommended Tag */}
                {journey.isRecommended && (
                  <div className="bg-teal-600 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-t-xl flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      <span>Recommended Best Choice • {journey.recommendationReason}</span>
                    </span>
                    <span>Score: {journey.rankingScore.overallScore}/100</span>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Mode & Timing info */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <ModeIcon mode={journey.mode} showLabel={true} />
                        <span className="font-bold text-base text-slate-900 dark:text-white">
                          {journey.name}
                        </span>
                        {journey.transfers > 0 ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {journey.transfers} transfer
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">
                            Direct service
                          </span>
                        )}
                      </div>

                      {/* Timeline summary */}
                      <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{journey.departureTime}</span>
                          <span className="text-slate-400 font-normal">→</span>
                          <span>{journey.arrivalTime}</span>
                        </div>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {journey.durationMinutes} mins travel
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <span className="text-slate-500 text-xs">
                          ~{journey.estimatedWaitMinutes}m platform wait
                        </span>
                      </div>
                    </div>

                    {/* Crowd Severity & Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <CrowdBadge
                          occupancy={journey.prediction.occupancy}
                          severity={journey.prediction.severity}
                          size="md"
                        />
                        <div className="text-[11px] text-slate-400 mt-1">
                          {journey.prediction.seatingProbability}% seat likelihood
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-3">
                        <button
                          onClick={() => handleSaveRoute(journey)}
                          title={isSaved ? 'Remove from Saved' : 'Save this route'}
                          className={`p-2 rounded-xl border text-xs transition-colors ${
                            isSaved
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                        </button>

                        <button
                          onClick={() => toggleCompare(journey)}
                          title="Compare with other options"
                          className={`p-2 rounded-xl border text-xs transition-colors ${
                            isCompared
                              ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 border-teal-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Layers className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() =>
                            navigate(`/forecast?route=${journey.routeId.split('+')[0]}&time=${journey.departureTime}`)
                          }
                          title="View 24h crowd forecast"
                          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Forecast</span>
                        </button>

                        <button
                          onClick={() => setExpandedJourneyId(isExpanded ? null : journey.id)}
                          className="px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-700 dark:text-teal-300 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Hide' : 'Details'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Occupancy bar */}
                  <div className="mt-3">
                    <OccupancyBar
                      occupancy={journey.prediction.occupancy}
                      severity={journey.prediction.severity}
                      height="h-1.5"
                    />
                  </div>

                  {/* Expandable Step-by-Step & "Why this journey?" Panel */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in">
                      {/* Why this journey breakdown card */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            <span>Why This Journey? (Scoring Transparency)</span>
                          </span>
                          <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                            Overall Score: {journey.rankingScore.overallScore}/100
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
                            <div className="text-slate-400 text-[10px]">Crowd Score (35%)</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {journey.rankingScore.crowdScore}/100
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
                            <div className="text-slate-400 text-[10px]">Speed Score (30%)</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {journey.rankingScore.speedScore}/100
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
                            <div className="text-slate-400 text-[10px]">Convenience (20%)</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {journey.rankingScore.convenienceScore}/100
                            </div>
                          </div>
                          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700">
                            <div className="text-slate-400 text-[10px]">Accessibility (15%)</div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {journey.rankingScore.accessibilityScore}/100
                            </div>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 italic">
                          "{journey.recommendationReason}"
                        </p>
                      </div>

                      {/* Coach breakdown for commuters */}
                      <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl border border-teal-100 dark:border-teal-900 text-xs">
                        <span className="font-semibold text-teal-800 dark:text-teal-300 block mb-1.5">
                          Coach-Specific Crowd Estimate:
                        </span>
                        <div className="flex flex-wrap gap-4 text-slate-700 dark:text-slate-300">
                          <div>
                            General Class: <strong>{journey.prediction.coachBreakdown.general}%</strong>
                          </div>
                          <div>
                            First Class: <strong>{journey.prediction.coachBreakdown.firstClass}%</strong>
                          </div>
                          <div>
                            Ladies Coach: <strong>{journey.prediction.coachBreakdown.ladies}%</strong>
                          </div>
                          {journey.prediction.coachBreakdown.acCoach && (
                            <div>
                              AC Coach: <strong>{journey.prediction.coachBreakdown.acCoach}%</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step-by-step route itinerary */}
                      <div className="space-y-2">
                        <span className="font-semibold text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                          Step-by-Step Route Itinerary:
                        </span>
                        <div className="space-y-2 border-l-2 border-teal-500 pl-4 ml-2">
                          {journey.steps.map((step, idx) => (
                            <div key={idx} className="relative">
                              <span className="absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full bg-teal-500" />
                              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                {step.instruction}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>Duration: {step.durationMinutes} mins</span>
                                {step.occupancy && <span>• Crowd load: {step.occupancy}%</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Side-by-Side Journey Comparison Modal */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-600" />
                  <span>Side-by-Side Journey Comparison</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Comparing {compareList.length} candidate options for your commute
                </p>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {compareList.map((j) => (
                <div
                  key={j.id}
                  className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <ModeIcon mode={j.mode} showLabel={true} />
                      <button
                        onClick={() => toggleCompare(j)}
                        className="text-xs text-rose-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                      {j.name}
                    </h4>

                    <div className="mt-3 space-y-2 text-xs divide-y divide-slate-200/60 dark:divide-slate-700/60">
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Timing:</span>
                        <span className="font-semibold">
                          {j.departureTime} → {j.arrivalTime}
                        </span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Duration:</span>
                        <span className="font-semibold">{j.durationMinutes} mins</span>
                      </div>
                      <div className="pt-2 flex justify-between items-center">
                        <span className="text-slate-500">Crowd Load:</span>
                        <CrowdBadge occupancy={j.prediction.occupancy} severity={j.prediction.severity} size="sm" />
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Platform Wait:</span>
                        <span className="font-semibold">~{j.estimatedWaitMinutes} mins</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Seating Chance:</span>
                        <span className="font-semibold">{j.prediction.seatingProbability}%</span>
                      </div>
                      <div className="pt-2 flex justify-between">
                        <span className="text-slate-500">Step-free:</span>
                        <span className="font-semibold">
                          {j.accessibility.stepFreeAccess ? 'Yes' : 'Partial'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCompareModalOpen(false);
                      navigate(`/forecast?route=${j.routeId.split('+')[0]}&time=${j.departureTime}`);
                    }}
                    className="mt-4 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Select this option
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

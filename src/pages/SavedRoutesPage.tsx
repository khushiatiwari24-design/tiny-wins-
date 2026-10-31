import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Plus,
  Trash2,
  TrendingUp,
  Compass,
  Clock,
  Sparkles,
  Edit2,
  Check,
  X,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { getSavedRoutes, removeSavedRoute, addSavedRoute, saveSavedRoutes } from '../services/storage';
import { MUMBAI_STATIONS, MUMBAI_ROUTES } from '../data/routes';
import { predictCrowd } from '../services/crowdForecast';
import { SavedRoute, TransportMode } from '../types';
import { CrowdBadge } from '../components/common/CrowdBadge';
import { OccupancyBar } from '../components/common/OccupancyBar';
import { ModeIcon } from '../components/common/ModeIcon';
import { DemoDataNotice } from '../components/common/DemoDataNotice';

export const SavedRoutesPage: React.FC = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New route form states
  const [newOrigin, setNewOrigin] = useState('borivali');
  const [newDest, setNewDest] = useState('churchgate');
  const [newCustomName, setNewCustomName] = useState('');
  const [newTime, setNewTime] = useState('08:30');
  const [newMode, setNewMode] = useState<TransportMode>('train_fast');
  const [newNotes, setNewNotes] = useState('');

  // Editing notes state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  useEffect(() => {
    setRoutes(getSavedRoutes());
  }, []);

  const handleDelete = (id: string) => {
    const updated = removeSavedRoute(id);
    setRoutes(updated);
  };

  const handleSaveNewRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOrigin === newDest) return;

    const originName = MUMBAI_STATIONS.find((s) => s.id === newOrigin)?.name || newOrigin;
    const destName = MUMBAI_STATIONS.find((s) => s.id === newDest)?.name || newDest;

    const newRoute: SavedRoute = {
      id: `fav-${Date.now()}`,
      customName: newCustomName.trim() || `${originName} ➔ ${destName}`,
      originId: newOrigin,
      destinationId: newDest,
      preferredMode: newMode,
      preferredTime: newTime,
      notes: newNotes.trim() || 'Custom saved commuter preference',
      createdAt: new Date().toISOString().split('T')[0],
      frequencyLabel: 'Daily',
    };

    const updated = addSavedRoute(newRoute);
    setRoutes(updated);
    setShowAddModal(false);
    setNewCustomName('');
    setNewNotes('');
  };

  const handleSaveNotes = (id: string) => {
    const updated = routes.map((r) => (r.id === id ? { ...r, notes: tempNotes } : r));
    setRoutes(updated);
    saveSavedRoutes(updated);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <DemoDataNotice />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Bookmark className="w-7 h-7 text-teal-600 fill-teal-600" />
            <span>Saved Commute Routes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Quickly monitor frequent corridors and check live simulated crowd predictions
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Favorite Route</span>
        </button>
      </div>

      {/* List of Saved Routes */}
      {routes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <Bookmark className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 dark:text-white">No Saved Routes Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Save frequent journeys from the Journey Planner or add your regular office commute above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map((route) => {
            const originStation = MUMBAI_STATIONS.find((s) => s.id === route.originId);
            const destStation = MUMBAI_STATIONS.find((s) => s.id === route.destinationId);

            // Find matching corridor or fallback to first
            const matchingCorridor =
              MUMBAI_ROUTES.find(
                (r) =>
                  r.stops.includes(route.originId) &&
                  r.stops.includes(route.destinationId) &&
                  r.stops.indexOf(route.originId) < r.stops.indexOf(route.destinationId)
              ) || MUMBAI_ROUTES[0];

            const pred = predictCrowd(matchingCorridor, route.preferredTime, false, 'normal');

            return (
              <div
                key={route.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <ModeIcon mode={route.preferredMode as TransportMode} showLabel={false} />
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {route.customName}
                        </h3>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-teal-600" />
                        <span>{originStation?.name || route.originId}</span>
                        <span>➔</span>
                        <span>{destStation?.name || route.destinationId}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(route.id)}
                      title="Remove route"
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Prediction Pill for Preferred Departure */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Usual Departure: {route.preferredTime}</span>
                      </span>
                      <CrowdBadge occupancy={pred.occupancy} severity={pred.severity} size="sm" />
                    </div>

                    <OccupancyBar occupancy={pred.occupancy} severity={pred.severity} height="h-1.5" />

                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                      <span>Est. platform delay: ~{pred.estimatedWaitMinutes}m</span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {pred.seatingProbability}% seat likelihood
                      </span>
                    </div>
                  </div>

                  {/* Notes / Tips area */}
                  <div className="mt-3">
                    {editingId === route.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          className="w-full text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                          placeholder="Add commute note..."
                        />
                        <button
                          onClick={() => handleSaveNotes(route.id)}
                          className="p-1 text-teal-600 hover:bg-teal-50 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-slate-500 italic bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-lg">
                        <span className="truncate max-w-[280px]">"{route.notes}"</span>
                        <button
                          onClick={() => {
                            setEditingId(route.id);
                            setTempNotes(route.notes);
                          }}
                          className="text-slate-400 hover:text-slate-600 ml-1 shrink-0"
                          title="Edit note"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() =>
                      navigate(
                        `/forecast?route=${matchingCorridor.id}&time=${route.preferredTime}`
                      )
                    }
                    className="font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>24h Forecast</span>
                  </button>

                  <button
                    onClick={() =>
                      navigate(
                        `/plan?origin=${route.originId}&dest=${route.destinationId}&time=${route.preferredTime}&mode=${route.preferredMode}`
                      )
                    }
                    className="font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Plan Journey Now</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Saved Route Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-teal-600" />
                <span>Save New Commute Route</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRoute} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Custom Label / Route Name
                </label>
                <input
                  type="text"
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder="e.g. Daily Borivali Office Commute"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Origin Station
                  </label>
                  <select
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-slate-900 dark:text-white"
                  >
                    {MUMBAI_STATIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Destination Station
                  </label>
                  <select
                    value={newDest}
                    onChange={(e) => setNewDest(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-slate-900 dark:text-white"
                  >
                    {MUMBAI_STATIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Preferred Time
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Mode
                  </label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="train_fast">Fast Train</option>
                    <option value="train_slow">Slow Train</option>
                    <option value="train_ac">AC Train</option>
                    <option value="metro">Metro</option>
                    <option value="bus_ac">AC Bus</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Notes (Tips, coach advice, exits)
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Board coach 6 to exit quickly at Dadar FOB"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white h-20"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold"
                >
                  Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

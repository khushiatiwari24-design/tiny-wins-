import React, { useState } from "react";
import { requireSupabase } from "../lib/supabase";

const supabase = requireSupabase();

interface WeeklyReflectionProps {
  stats: {
    completedCount: number;
    consistencyScore: number;
    currentStreak: number;
    productiveHours: string;
    recoveryDays: number;
  };
  onClose: () => void;
  onSaved: () => void;
}

export default function WeeklyReflectionModal({ stats, onClose, onSaved }: WeeklyReflectionProps) {
  const [wentWell, setWentWell] = useState("");
  const [difficulties, setDifficulties] = useState("");
  const [nextFocus, setNextFocus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monday = new Date();
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const weekStartStr = monday.toISOString().split("T")[0];

      await supabase.from("weekly_reflections").upsert({
        user_id: user.id,
        week_start_date: weekStartStr,
        consistency_score: stats.consistencyScore,
        tasks_completed: stats.completedCount,
        recovery_days_used: stats.recoveryDays,
        went_well: wentWell,
        difficulties: difficulties,
        next_week_focus: nextFocus,
      });

      onSaved();
      onClose();
    } catch (err: any) {
      alert("Failed to save reflection: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div>
          <span className="text-xs font-semibold tracking-wider text-purple-400 uppercase">Self-Accountability</span>
          <h2 className="text-xl font-bold text-white mt-1">Your Weekly Reflection</h2>
          <p className="text-xs text-zinc-400 mt-1">Building self-awareness matters more than a mechanical streak count.</p>
        </div>

        {/* Weekly Metric Summary */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-800/40 rounded-xl border border-zinc-800 text-center">
          <div>
            <p className="text-[11px] text-zinc-400">Consistency</p>
            <p className="text-base font-bold text-white mt-0.5">{stats.consistencyScore}%</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-400">Tasks Handled</p>
            <p className="text-base font-bold text-white mt-0.5">{stats.completedCount}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-400">Recoveries</p>
            <p className="text-base font-bold text-amber-400 mt-0.5">{stats.recoveryDays}</p>
          </div>
        </div>

        {/* Questions */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              What worked well this week?
            </label>
            <textarea
              rows={2}
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              placeholder="e.g. Did my study session right after breakfast before opening social media..."
              className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              What broke your momentum or made things difficult?
            </label>
            <textarea
              rows={2}
              value={difficulties}
              onChange={(e) => setDifficulties(e.target.value)}
              placeholder="e.g. Stayed up late on Wednesday, had zero energy on Thursday..."
              className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Single focus commitment for next week:
            </label>
            <input
              type="text"
              value={nextFocus}
              onChange={(e) => setNextFocus(e.target.value)}
              placeholder="e.g. Complete minimum 10 mins of reading before checking messages."
              className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition"
            >
              {submitting ? "Saving..." : "Save Reflection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
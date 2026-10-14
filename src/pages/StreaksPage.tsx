import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { requireSupabase } from "../lib/supabase";
import {
  getCompletedDates,
  calculateActiveStreak,
  calculateBestStreak,
  getReclaimedMinutes,
  getCurrentWeekDays,
  type WeekDayInfo,
} from "../lib/streakUtils";

const supabase = requireSupabase();

export default function StreaksPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [showWeeklyReflection, setShowWeeklyReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState("");

  // Dynamic real-time streak & metrics state
  const [activeStreak, setActiveStreak] = useState<number>(() => {
    return calculateActiveStreak(getCompletedDates());
  });
  const [bestStreak, setBestStreak] = useState<number>(() => {
    return calculateBestStreak(getCompletedDates());
  });
  const [productiveMinutes, setProductiveMinutes] = useState<number>(() => {
    return getReclaimedMinutes();
  });
  const [weekDaysInfo, setWeekDaysInfo] = useState<WeekDayInfo[]>(() => {
    return getCurrentWeekDays(getCompletedDates());
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Update streak and week info with any latest local data
      const dates = getCompletedDates();

      // Check user's streak activity in Supabase
      const { data: activityRows } = await supabase
        .from("streak_activity")
        .select("activity_date, created_at, status")
        .eq("user_id", user.id);

      if (activityRows) {
        for (const row of activityRows) {
          if (row.status === "completed" || row.status === "minimum") {
            if (row.activity_date) dates.add(row.activity_date);
            else if (row.created_at) dates.add(row.created_at.slice(0, 10));
          }
        }
      }

      setActiveStreak(calculateActiveStreak(dates));
      setBestStreak(calculateBestStreak(dates));
      setWeekDaysInfo(getCurrentWeekDays(dates));
      setProductiveMinutes(getReclaimedMinutes());

      const { data, error } = await supabase.rpc("get_my_streak_groups");
      if (error) {
        console.error("RPC error, attempting fallback:", error);
        const { data: membersData } = await supabase
          .from("streak_group_members")
          .select("group_id, streak_groups(*)")
          .eq("user_id", user.id);

        const list =
          membersData
            ?.map((item: any) => item.streak_groups)
            .filter(Boolean) || [];
        setGroups(list);
      } else {
        setGroups(data || []);
      }
    } catch (err) {
      console.error("Error loading streak groups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      const { data, error } = await supabase.rpc("join_streak_by_code", {
        code_input: joinCode.trim(),
      });

      if (error || !data?.success) {
        alert(data?.message || "Invalid invite code or unable to join");
      } else {
        setMessage(`Successfully joined ${data.group_name}!`);
        setShowJoinModal(false);
        setJoinCode("");
        loadData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to join group");
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const { data, error } = await supabase.rpc("create_new_streak_group", {
        group_name: newGroupName.trim(),
        group_desc: newGroupDesc.trim(),
      });

      if (error || !data?.success) {
        alert("Failed to create group: " + (error?.message || ""));
      } else {
        setMessage(`Group "${newGroupName}" created successfully!`);
        setShowCreateModal(false);
        setNewGroupName("");
        setNewGroupDesc("");
        loadData();
      }
    } catch (err: any) {
      alert(err.message || "Failed to create group");
    }
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-8 max-w-6xl mx-auto space-y-5 sm:space-y-6">
      {/* Growth Metrics Top Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-orange-400 uppercase">
              Continuous Evolution
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Growth & Consistency</h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Measure rhythm, recovery, and long-term trajectory rather than perfection.
            </p>
          </div>
          <button
            onClick={() => setShowWeeklyReflection(true)}
            className="self-start sm:self-auto px-4 py-2 text-xs font-medium text-purple-300 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/60 rounded-xl transition flex items-center gap-2 active:scale-95"
          >
            📝 Weekly Reflection
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3.5 sm:p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-xs text-zinc-400">Consistency Score</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-white">
                {Math.round((weekDaysInfo.filter((d) => d.isCompleted).length / 7) * 100)}%
              </span>
              <span className="text-[10px] sm:text-xs font-medium text-emerald-400">
                +{weekDaysInfo.filter((d) => d.isCompleted).length * 10}% this week
              </span>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-xs text-zinc-400">Active Rhythm</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-white">🔥 {activeStreak}d</span>
              <span className="text-[10px] sm:text-xs text-zinc-500">Best: {bestStreak}d</span>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-xs text-zinc-400">Productive Time</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-white">
                {Math.floor(productiveMinutes / 60)}h {productiveMinutes % 60}m
              </span>
              <span className="text-[10px] sm:text-xs text-zinc-500">logged</span>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-xs text-zinc-400">Recovery Shield</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-emerald-400">Available</span>
              <span className="text-[10px] sm:text-xs text-zinc-500">Never miss twice</span>
            </div>
          </div>
        </div>

        {/* Dynamic 7-day week bubbles */}
        <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold text-zinc-300">Current Week Rhythm</p>
            <p className="text-[11px] text-zinc-500">Real-time daily task completion status</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {weekDaysInfo.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold transition-all ${
                    day.isCompleted
                      ? "bg-gradient-to-tr from-amber-400 to-orange-400 text-slate-950 shadow-md shadow-orange-500/30"
                      : day.isToday
                      ? "border-2 border-amber-400 bg-amber-400/20 text-amber-200 ring-2 ring-amber-400/30 font-bold"
                      : "bg-white/5 text-slate-500"
                  }`}
                  title={`${day.dayName} (${day.date}): ${day.isCompleted ? "Completed" : day.isToday ? "Today" : "No task"}`}
                >
                  {day.dayLetter}
                </span>
                <span className="text-[10px] text-zinc-400">{day.dayName}</span>
                {day.isToday && <span className="h-1 w-1 rounded-full bg-amber-400" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showWeeklyReflection && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setShowWeeklyReflection(false)}
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-lg font-bold text-white">📝 Weekly Reflection</h3>
            <p className="text-xs text-zinc-400">
              Celebrate your tiny wins and reflect on your consistency this week.
            </p>
            <textarea
              autoFocus
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="What worked well for your habits this week? What will you tweak next week?"
              rows={4}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWeeklyReflection(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (reflectionText.trim()) {
                    localStorage.setItem("tiny_wins_weekly_reflection", reflectionText.trim());
                    setMessage("Weekly reflection saved successfully!");
                    window.setTimeout(() => setMessage(null), 3500);
                  }
                  setShowWeeklyReflection(false);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium"
              >
                Save Reflection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2.5 sm:gap-3">
        <button onClick={() => setShowJoinModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition">Join with Code</button>
        <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition">+ Create group</button>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-3 bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Join with Code Inline / Modal */}
      {showJoinModal && (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-xl max-w-md">
          <h3 className="text-white font-medium mb-2">
            Enter Invite Code or Group ID
          </h3>
          <form onSubmit={handleJoinByCode} className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. PRODUC356"
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg"
            >
              Join
            </button>
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="px-3 py-2 text-zinc-400 hover:text-white text-sm"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">
              Create New Streak Group
            </h3>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Code Daily"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Consistent daily progress streak."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Groups List */}
      {loading ? (
        <div className="text-gray-400 py-12 text-center text-sm">
          Loading streak groups...
        </div>
      ) : groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => navigate(`/streaks/${group.id}`)}
              className="cursor-pointer p-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl hover:border-purple-500/50 hover:bg-zinc-900 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white capitalize">
                  {group.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700/50">
                  {group.role || "Member"}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {group.description || "Consistent daily progress streak."}
              </p>
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                <span>Code: {group.invite_code || "N/A"}</span>
                <span>Active Streak 🔥</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          <div className="text-2xl mb-2">🔥</div>
          <h3 className="text-white font-medium text-base mb-1">
            Your next streak starts here
          </h3>
          <p className="text-sm text-zinc-500">
            Create a group or use a code to join one.
          </p>
        </div>
      )}
    </div>
  );
}
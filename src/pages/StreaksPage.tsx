import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { requireSupabase } from "../lib/supabase";

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
  const [growthMetrics] = useState({
    this_week_score: 0,
    improvement_delta: 0,
    productive_time_minutes: 0,
  });
  const [activeStreak] = useState(0);
  const [bestStreak] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

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
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Growth Metrics Top Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider text-orange-400 uppercase">
              Continuous Evolution
            </span>
            <h1 className="text-3xl font-bold text-white mt-1">Growth & Consistency</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Measure rhythm, recovery, and long-term trajectory rather than perfection.
            </p>
          </div>
          <button
            onClick={() => setShowWeeklyReflection(true)}
            className="px-4 py-2 text-xs font-medium text-purple-300 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/60 rounded-xl transition flex items-center gap-2"
          >
            📝 Weekly Reflection
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-xs text-zinc-400">Consistency Score</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-white">{growthMetrics.this_week_score}%</span>
              <span className={`text-xs font-medium ${growthMetrics.improvement_delta >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {growthMetrics.improvement_delta >= 0 ? "+" : ""}{growthMetrics.improvement_delta}% vs last week
              </span>
            </div>
          </div>
          <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-xs text-zinc-400">Active Rhythm</p>
            <div className="flex items-baseline gap-2 mt-1"><span className="text-2xl font-bold text-white">🔥 {activeStreak}d</span><span className="text-xs text-zinc-500">Best: {bestStreak}d</span></div>
          </div>
          <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-xs text-zinc-400">Productive Time</p>
            <div className="flex items-baseline gap-2 mt-1"><span className="text-2xl font-bold text-white">{Math.floor(growthMetrics.productive_time_minutes / 60)}h {growthMetrics.productive_time_minutes % 60}m</span><span className="text-xs text-zinc-500">last 30d</span></div>
          </div>
          <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            <p className="text-xs text-zinc-400">Recovery Shield</p>
            <div className="flex items-baseline gap-2 mt-1"><span className="text-2xl font-bold text-emerald-400">Available</span><span className="text-xs text-zinc-500">Never miss twice</span></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
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
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { requireSupabase } from "../lib/supabase";
import StrugglingModal from "../components/StrugglingModal";

const supabase = requireSupabase();

export default function StreakGroupDetailPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const rawId = params.id || params.groupId || params.streakId;
  const pathId = location.pathname.split("/").filter(Boolean).pop();
  const groupId = rawId || pathId;

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [taskInput, setTaskInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [encouragedTaskId, setEncouragedTaskId] = useState<string | null>(null);

  // Struggling modal state
  const [strugglingTask, setStrugglingTask] = useState<any | null>(null);

  const loadData = async () => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // 1. Group info
      const { data: groupData } = await supabase
        .from("streak_groups")
        .select("*")
        .eq("id", groupId)
        .maybeSingle();

      if (groupData) {
        setGroup(groupData);
      }

      // 2. Members with real profiles
      const { data: membersData } = await supabase
        .from("streak_group_members")
        .select(`
          user_id,
          role,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("group_id", groupId);

      if (membersData) {
        const formattedMembers = membersData.map((m: any) => {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          const cleanName =
            profile?.full_name ||
            profile?.email?.split("@")[0] ||
            "Member";

          return {
            user_id: m.user_id,
            role: m.role || "member",
            display_name: cleanName,
            email: profile?.email || "",
          };
        });
        setMembers(formattedMembers);
      }

      // 3. Tasks
      const { data: activities } = await supabase
        .from("streak_activity")
        .select(`
          id,
          description,
          created_at,
          user_id,
          status,
          actual_minutes,
          target_minutes,
          minimum_minutes,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (activities) {
        const formattedTasks = activities.map((t: any) => {
          const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
          return {
            ...t,
            status: t.status || "active",
            target_minutes: t.target_minutes,
            minimum_minutes: t.minimum_minutes,
            author_name:
              profile?.full_name ||
              profile?.email?.split("@")[0] ||
              "Member",
          };
        });
        setTasks(formattedTasks);
      }
    } catch (err: any) {
      console.error("Error loading group:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim() || !currentUserId || !groupId) return;

    try {
      setSubmitting(true);
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("streak_activity").insert({
        group_id: groupId,
        user_id: currentUserId,
        action_type: "task",
        description: taskInput.trim(),
        activity_date: today,
        status: "active",
        target_minutes: 30,
        minimum_minutes: 10,
      });

      if (error) throw error;
      setTaskInput("");
      await loadData();
    } catch (err: any) {
      alert("Error adding task: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Mark task as fully completed
  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("streak_activity")
        .update({
          status: "completed",
          actual_minutes: tasks.find((task) => task.id === taskId)?.target_minutes || 30,
        })
        .eq("id", taskId)
        .eq("user_id", currentUserId);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      alert("Error updating task: " + err.message);
    }
  };

  // Callback from StrugglingModal: "Do the minimum"
  const handleSelectMinimum = async (taskId: string, reducedMinutes: number, reason: string) => {
    try {
      const { error } = await supabase
        .from("streak_activity")
        .update({
          status: "minimum",
          actual_minutes: reducedMinutes,
          struggle_reason: reason,
        })
        .eq("id", taskId);

      if (error) throw error;
      setStrugglingTask(null);
      await loadData();
    } catch (err: any) {
      alert("Error logging minimum effort: " + err.message);
    }
  };

  // Callback from StrugglingModal: "Claim recovery day"
  const handleTakeRecoveryDay = async (taskId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from("streak_activity")
        .update({
          status: "recovery",
          struggle_reason: reason,
        })
        .eq("id", taskId);

      if (error) throw error;
      setStrugglingTask(null);
      await loadData();
    } catch (err: any) {
      alert("Error claiming recovery: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto text-zinc-400 text-sm">
        Loading group dashboard...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-4">
        <button
          onClick={() => navigate("/streaks")}
          className="text-xs text-purple-400 hover:text-purple-300 transition"
        >
          ← Back to Streaks
        </button>
        <p className="text-zinc-400 text-sm">Group not found.</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,.1),transparent_30%)] p-5 lg:p-8">

      {/* Top Header */}
      <div className="glass-panel relative z-10 overflow-hidden rounded-[2rem] border-orange-200/15 bg-[linear-gradient(120deg,rgba(91,35,65,.7),rgba(30,41,79,.55))] p-6 lg:p-8">
        <div className="absolute -right-4 top-5 rotate-3 rounded-sm bg-[#fff1b8] px-4 py-2 text-[11px] font-semibold text-[#6b4050] shadow-lg">Keep showing up ✦</div>
        <button
          onClick={() => navigate("/streaks")}
          className="text-xs text-[#60a5fa] hover:text-[#93c5fd] transition block mb-4"
        >
          ← Back to all streaks
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-semibold text-[#38bdf8] tracking-wider">
              Streak Group
            </span>
            <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#fff1d6] capitalize lg:text-4xl">
              {group.name}
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {group.description || "Daily consistency."}
            </p>
          </div>
          <div className="bg-grid-pattern interactive-card glass-panel rounded-2xl border-orange-200/15 px-4 py-2.5 flex items-center gap-3">
            <span className="text-xs text-zinc-400">Invite Code:</span>
            <span className="text-sm font-mono font-semibold text-[#60a5fa]">
              {group.invite_code || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tasks Feed */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleAddTask}
            className="bg-grid-pattern interactive-card glass-panel rounded-2xl p-5 flex gap-2"
          >
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Post a group task or daily target..."
              className="flex-1 bg-[#0f172a]/70 border border-[#1e293b] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-[#f4728f] to-[#f59e61] text-white shadow-lg shadow-rose-950/30 hover:scale-[1.01] active:scale-[0.99] transition-all text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-300">
              Group Tasks ({tasks.length})
            </h3>
            {tasks.length === 0 ? (
                  <div className="bg-grid-pattern interactive-card glass-panel rounded-2xl p-6 text-center text-zinc-400 text-sm">
                    <div className="text-3xl">🌱</div>
                    <p className="mt-2 font-medium text-slate-200">Ready to begin?</p>
                    <p className="mt-1 text-xs text-slate-500">Post your first group win today.</p>
              </div>
            ) : (
              tasks.map((task) => {
                const isMe = task.user_id === currentUserId;
                const status = task.status || "active";

                return (
                  <div
                    key={task.id}
                    className="bg-grid-pattern interactive-card glass-panel rounded-2xl border-orange-200/10 p-5 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-medium ${
                            status === "completed"
                              ? "line-through text-zinc-500"
                              : status === "minimum"
                              ? "text-emerald-300"
                              : "text-white"
                          }`}
                        >
                          {task.description}
                        </p>
                      </div>

                      <p className="text-xs text-zinc-500 mt-1">
                        Added by{" "}
                        <span
                          className={
                            isMe
                              ? "text-[#60a5fa] font-semibold"
                              : "text-zinc-300"
                          }
                        >
                          {isMe ? "You" : task.author_name || "Member"}
                        </span>{" "}
                        •{" "}
                        {new Date(task.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {(task.target_minutes || task.minimum_minutes) && (
                        <p className="text-xs text-zinc-400 mt-2">
                          Target: <span className="text-zinc-200">{task.target_minutes || 30}m</span>
                          {task.minimum_minutes && (
                            <>
                              {" "}• Minimum: <span className="text-teal-300">{task.minimum_minutes}m</span>
                            </>
                          )}
                        </p>
                      )}
                      {encouragedTaskId === task.id && (
                        <p className="text-xs text-emerald-300 mt-2">
                          Every step counts. Keep going.
                        </p>
                      )}
                    </div>

                    {/* Interactive Action Controls */}
                    <div className="flex items-center gap-2">
                      {status === "active" ? (
                        <>
                          {isMe ? (
                            <>
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                className="text-xs px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition font-medium"
                              >
                                ✓ Complete
                              </button>
                              <button
                                onClick={() => setStrugglingTask(task)}
                                className="text-xs px-2.5 py-1 rounded-lg border border-[#38bdf8]/30 text-[#38bdf8] hover:bg-[#38bdf8]/10 transition flex items-center gap-1"
                                title="Struggling with this task? Start small."
                              >
                                😵 Struggling?
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs px-2.5 py-1 rounded bg-[#1e3a8a]/30 text-[#60a5fa] border border-[#3b82f6]/30 font-medium">
                                Active
                              </span>
                              <button
                                onClick={() => setEncouragedTaskId(task.id)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-[#0f172a]/70 hover:bg-[#1e293b] text-slate-300 border border-[#1e293b] transition"
                              >
                                Encourage
                              </button>
                            </>
                          )}
                        </>
                      ) : status === "completed" ? (
                        <span className="text-xs px-2.5 py-1 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 font-medium">
                          ✓ Completed
                        </span>
                      ) : status === "minimum" ? (
                        <span className="text-xs px-2.5 py-1 rounded bg-[#0f766e]/20 text-emerald-300 border border-emerald-500/30 font-medium">
                          🟢 Minimum Completed ({task.actual_minutes || 10}m)
                        </span>
                      ) : status === "recovery" ? (
                        <span className="text-xs px-2.5 py-1 rounded bg-[#1e3a8a]/30 text-[#93c5fd] border border-[#3b82f6]/30 font-medium">
                          🟡 Recovery Day Shield
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Members List */}
        <div>
          <div className="bg-grid-pattern interactive-card glass-panel rounded-2xl border-orange-200/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Members</h3>
              <span className="text-xs text-zinc-400">{members.length} total</span>
            </div>

            <div className="space-y-3">
              {members.map((mem) => {
                const isMe = mem.user_id === currentUserId;
                const name = mem.display_name || "Member";

                return (
                  <div
                    key={mem.user_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#0f172a]/50 border border-[#1e293b]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2563eb] to-[#38bdf8] p-[2px] shadow-lg shadow-[#1d4ed8]/25">
                        <div className="w-full h-full rounded-full bg-[#080d21] flex items-center justify-center text-xs font-semibold text-white capitalize">
                        {name.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium capitalize">
                          {name}{" "}
                          {isMe && (
                              <span className="text-xs text-[#60a5fa] font-normal">
                              (You)
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-zinc-400 capitalize">
                          {mem.role || "Member"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                      active
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Struggling Micro-Intervention Modal */}
      {strugglingTask && (
        <StrugglingModal
          task={strugglingTask}
          onClose={() => setStrugglingTask(null)}
          onSelectMinimum={handleSelectMinimum}
          onTakeRecoveryDay={handleTakeRecoveryDay}
        />
      )}
    </div>
  );
}
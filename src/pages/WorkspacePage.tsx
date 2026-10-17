import heroBg from "../assets/heropage.jpeg.jpg";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Check,
  Clock3,
  Copy,
  Flame,
  FolderPlus,
  Heart,
  HeartHandshake,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useTasks } from "../hooks/useTasks";
import { useAuth } from "../context/AuthContext";
import TaskList from "../components/tasks/TaskList";
import type { Task, TaskInput } from "../types/task";
import {
  getLocalDateKey,
  getCompletedDates,
  calculateActiveStreak,
  getCurrentWeekDays,
  getReclaimedMinutes,
  formatMinutesToHours,
  recordCompletionToday,
  activateRecoveryShieldToday,
  getRecoveryShieldStatus,
  type WeekDayInfo,
} from "../lib/streakUtils";
import MomentumGraph from "../components/dashboard/MomentumGraph";
import FocusModeWidget from "../components/dashboard/FocusModeWidget";
import ConfettiCelebration from "../components/celebration/ConfettiCelebration";
import StrugglingModal from "../components/StrugglingModal";
import {
  getTodayMotivationalQuote,
  getRandomMotivationalQuote,
  type MotivationalQuote,
} from "../lib/motivationalQuotes";

interface DailyFocus {
  deepWork: string;
  health: string;
  reflection: string;
}

const emptyDailyFocus: DailyFocus = {
  deepWork: "",
  health: "",
  reflection: "",
};

const readDailyFocus = (): DailyFocus => {
  try {
    const stored = localStorage.getItem("tiny_wins_daily_focus");
    if (!stored) return emptyDailyFocus;
    const parsed = JSON.parse(stored) as Partial<DailyFocus>;
    return {
      deepWork: typeof parsed.deepWork === "string" ? parsed.deepWork : "",
      health: typeof parsed.health === "string" ? parsed.health : "",
      reflection:
        typeof parsed.reflection === "string" ? parsed.reflection : "",
    };
  } catch {
    return emptyDailyFocus;
  }
};

const dateKey = (d: Date | number = new Date()) =>
  getLocalDateKey(d);
const niceDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
const Card = ({
  label,
  value,
  icon,
  iconClass,
  progress,
}: {
  label: string;
  value: string | number;
  icon?: string;
  iconClass?: string;
  progress?: number;
}) => (
  <div className="bg-grid-pattern interactive-card glass-panel rounded-2xl p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs uppercase tracking-wider text-zinc-300">{label}</p>
      {icon && (
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl border text-base ${iconClass || "border-white/10 bg-white/5"}`}
        >
          {icon}
        </span>
      )}
    </div>
    <p
      className={`mt-3 text-3xl font-semibold ${label.toLowerCase().includes("streak") ? "text-[#f95d9b]" : "text-white"}`}
    >
      {value}
    </p>
    {progress !== undefined && (
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#38bdf8] to-[#2563eb] transition-all duration-700"
          style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
        />
      </div>
    )}
  </div>
);
export default function WorkspacePage({
  view,
}: {
  view:
    | "dashboard"
    | "day"
    | "upcoming"
    | "completed"
    | "analytics"
    | "streaks"
    | "calendar";
}) {
  const { session } = useAuth();
  const { tasks, categories, projects, loading, error, save, remove, toggle } =
    useTasks(session?.user.id);
  const [selected, setSelected] = useState(dateKey());
  const [completedFilter, setCompletedFilter] = useState("all");
  const [reclaimedMinutes, setReclaimedMinutes] = useState<number>(getReclaimedMinutes);
  const [shieldVersion, setShieldVersion] = useState(0);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  const today = dateKey();
  const list = useMemo(() => {
    if (view === "completed") return tasks.filter((t) => t.completed);
    if (view === "day") return tasks.filter((t) => t.dueDate === today);
    if (view === "upcoming")
      return tasks.filter((t) => t.dueDate >= today && !t.completed);
    if (view === "calendar") return tasks.filter((t) => t.dueDate === selected);
    return tasks.filter((t) => t.dueDate === today);
  }, [tasks, view, selected, today]);

  const completed = tasks.filter((t) => t.completed).length;

  // Real-time automatic streak and daily week calculation
  const completedDates = useMemo(() => getCompletedDates(tasks), [tasks, shieldVersion]);
  const streak = useMemo(() => calculateActiveStreak(completedDates), [completedDates]);
  const weekDaysInfo = useMemo(() => getCurrentWeekDays(completedDates), [completedDates]);

  // Hook toggle to record completion date in real-time
  const handleToggle = async (task: Task) => {
    if (!task.completed) {
      recordCompletionToday();
      const todayTasks = tasks.filter((t) => t.dueDate === today);
      const willBeCompleted = todayTasks.filter((t) => t.completed || t.id === task.id).length;
      if (todayTasks.length > 0 && willBeCompleted === todayTasks.length) {
        setTriggerConfetti(true);
      }
    }
    await toggle(task);
  };

  if (loading)
    return <div className="p-8 text-zinc-500">Loading your workspace…</div>;
  if (view === "dashboard")
    return (
      <Dashboard
        tasks={tasks}
        categories={categories}
        projects={projects}
        streak={streak}
        weekDaysInfo={weekDaysInfo}
        reclaimedMinutes={reclaimedMinutes}
        setReclaimedMinutes={setReclaimedMinutes}
        save={save}
        remove={remove}
        toggle={handleToggle}
        onRefreshShield={() => setShieldVersion((v) => v + 1)}
        triggerConfetti={triggerConfetti}
        setTriggerConfetti={setTriggerConfetti}
      />
    );
  if (view === "analytics")
    return (
      <section className="p-3.5 sm:p-5 lg:p-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white">Analytics</h1>
        <p className="mt-2 text-zinc-500">
          Your real progress, based on completed tasks.
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <Card label="Completed" value={completed} />
          <Card label="Pending" value={tasks.length - completed} />
          <Card
            label="Completion rate"
            value={`${tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%`}
          />
        </div>
        <div className="mt-6">
          <MomentumGraph
            tasks={tasks}
            variant="analytics"
            title="Weekly & Monthly Momentum"
            subtitle="Track habit trajectory, daily completion volume, and zero-day dips."
          />
        </div>
        <div className="mt-6 rounded-2xl border border-white/[.07] bg-white/[.025] p-6">
          <h2 className="font-medium text-white">Category distribution</h2>
          <div className="mt-5 space-y-3">
            {Object.entries(
              tasks.reduce<Record<string, number>>((a, t) => {
                a[t.category] = (a[t.category] || 0) + 1;
                return a;
              }, {}),
            ).map(([category, count]) => (
              <div key={category} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-zinc-400">{category}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-white/[.06]">
                  <div
                    className="h-full rounded bg-violet-400"
                    style={{
                      width: `${tasks.length ? (count / tasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-zinc-500">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  if (view === "streaks")
    return (
      <section className="p-3.5 sm:p-5 lg:p-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white">Streaks</h1>
        <div className="mt-7 grid max-w-xl gap-4 sm:grid-cols-2">
          <Card label="Current activity" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
          <Card
            label="Completed today"
            value={
              weekDaysInfo.find((d) => d.isToday)?.isCompleted
                ? "Yes ✓"
                : "Not yet"
            }
          />
        </div>
        <div className="mt-6 max-w-xl rounded-2xl border border-white/[.07] bg-white/[.025] p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-400">This Week's Activity</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            {weekDaysInfo.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1.5">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full text-xs font-semibold transition-all ${
                    day.isCompleted
                      ? "bg-gradient-to-tr from-amber-400 to-orange-400 text-slate-950 shadow-md shadow-orange-500/30"
                      : day.isToday
                      ? "border-2 border-amber-400 bg-amber-400/15 text-amber-200 ring-2 ring-amber-400/30"
                      : "bg-white/5 text-slate-500"
                  }`}
                  title={`${day.dayName} (${day.date}): ${day.isCompleted ? "Completed" : day.isToday ? "Today" : "No task"}`}
                >
                  {day.dayLetter}
                </span>
                <span className="text-[10px] text-zinc-400">{day.dayName}</span>
                {day.isToday && (
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 text-zinc-500">
          A day counts automatically when you complete at least one tiny win or task.
        </p>
      </section>
    );
  if (view === "calendar")
    return (
      <Calendar
        tasks={tasks}
        categories={categories}
        projects={projects}
        selected={selected}
        setSelected={setSelected}
        list={list}
        save={save}
        remove={remove}
        toggle={toggle}
      />
    );
  const heading =
    view === "day" ? "My Day" : view === "upcoming" ? "Upcoming" : "Completed";
  const filteredList =
    view === "completed"
      ? list.filter(
          (task) =>
            completedFilter === "all" ||
            (completedFilter === "today" &&
              task.updatedAt.slice(0, 10) === today) ||
            (completedFilter === "week" &&
              task.updatedAt >=
                new Date(Date.now() - 7 * 86400000).toISOString()) ||
            (completedFilter === "month" &&
              task.updatedAt.slice(0, 7) === today.slice(0, 7)),
        )
      : list;
  return (
    <section className="p-3.5 sm:p-5 lg:p-8">
      <p className="text-sm text-zinc-500">{niceDate(today)}</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-white">{heading}</h1>
      {view === "completed" && (
        <select
          value={completedFilter}
          onChange={(event) => setCompletedFilter(event.target.value)}
          className="field mt-5 max-w-xs"
        >
          <option value="all">All completed</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
      )}
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-7 max-w-4xl">
        <TaskList
          tasks={filteredList}
          categories={categories}
          projects={projects}
          onSave={save}
          onDelete={remove}
          onToggle={toggle}
          title={heading}
        />
      </div>
    </section>
  );
}
function Dashboard({
  tasks,
  categories,
  projects,
  streak,
  weekDaysInfo,
  reclaimedMinutes,
  setReclaimedMinutes,
  save,
  remove,
  toggle,
  onRefreshShield,
  triggerConfetti,
  setTriggerConfetti,
}: {
  tasks: Task[];
  categories: ReturnType<typeof useTasks>["categories"];
  projects: ReturnType<typeof useTasks>["projects"];
  streak: number;
  weekDaysInfo: WeekDayInfo[];
  reclaimedMinutes: number;
  setReclaimedMinutes: React.Dispatch<React.SetStateAction<number>>;
  save: ReturnType<typeof useTasks>["save"];
  remove: ReturnType<typeof useTasks>["remove"];
  toggle: ReturnType<typeof useTasks>["toggle"];
  onRefreshShield: () => void;
  triggerConfetti: boolean;
  setTriggerConfetti: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const navigate = useNavigate();
  const today = dateKey();
  const todayTasks = tasks.filter((task) => task.dueDate === today);
  const [isAddWinModalOpen, setIsAddWinModalOpen] = useState(false);
  const [winInput, setWinInput] = useState("");
  const [isPlanDayModalOpen, setIsPlanDayModalOpen] = useState(false);
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [dailyFocus, setDailyFocus] = useState<DailyFocus>(readDailyFocus);
  const [deepWorkInput, setDeepWorkInput] = useState("");
  const [healthInput, setHealthInput] = useState("");
  const [reflectionInput, setReflectionInput] = useState("");
  const [completedFocus, setCompletedFocus] = useState<Record<keyof DailyFocus, boolean>>({
    deepWork: false,
    health: false,
    reflection: false,
  });
  const [isSavingWin, setIsSavingWin] = useState(false);

  // Daily Rotating Motivating Thought state
  const [quote, setQuote] = useState<MotivationalQuote>(getTodayMotivationalQuote);
  const [copiedQuote, setCopiedQuote] = useState(false);

  // Recovery Shield state
  const [shieldStatus, setShieldStatus] = useState(getRecoveryShieldStatus);

  // Struggling / Friction Check modal state
  const [isStrugglingModalOpen, setIsStrugglingModalOpen] = useState(false);
  const [strugglingTask, setStrugglingTask] = useState<Task | null>(null);

  const handleNewQuote = () => {
    setQuote(getRandomMotivationalQuote());
  };

  const handleCopyQuote = async () => {
    try {
      await navigator.clipboard.writeText(`"${quote.text}" — ${quote.author}`);
      setCopiedQuote(true);
      setTimeout(() => setCopiedQuote(false), 2000);
    } catch {}
  };

  const handleClaimShield = () => {
    activateRecoveryShieldToday();
    setShieldStatus(getRecoveryShieldStatus());
    onRefreshShield();
  };

  const focusItems: Array<{
    key: keyof DailyFocus;
    label: string;
    accent: string;
  }> = [
    { key: "deepWork", label: "Deep Work / Study", accent: "cyan" },
    { key: "health", label: "Health / Movement", accent: "pink" },
    { key: "reflection", label: "Reflection / Wrap-up", accent: "amber" },
  ];
  const progress = todayTasks.length
    ? Math.round(
        (todayTasks.filter((task) => task.completed).length /
          todayTasks.length) *
          100,
      )
    : 0;
  const openAddTask = () => document.querySelector<HTMLButtonElement>("[data-add-task]")?.click();
  const openAddWinModal = () => setIsAddWinModalOpen(true);
  const openPlanDayModal = () => {
    setDeepWorkInput(dailyFocus.deepWork);
    setHealthInput(dailyFocus.health);
    setReflectionInput(dailyFocus.reflection);
    setIsPlanDayModalOpen(true);
  };
  const saveDailyFocus = () => {
    const nextFocus: DailyFocus = {
      deepWork: deepWorkInput.trim(),
      health: healthInput.trim(),
      reflection: reflectionInput.trim(),
    };
    setDailyFocus(nextFocus);
    localStorage.setItem("tiny_wins_daily_focus", JSON.stringify(nextFocus));
    setCompletedFocus({ deepWork: false, health: false, reflection: false });
    setIsPlanDayModalOpen(false);
  };
  const saveTinyWin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!winInput.trim()) return;
    setIsSavingWin(true);
    try {
      const input: TaskInput = {
        title: winInput.trim(),
        description: "",
        category: "Personal",
        priority: "Medium",
        dueDate: today,
        dueTime: "",
      };
      await save(input);
      setWinInput("");
      setIsAddWinModalOpen(false);
    } finally {
      setIsSavingWin(false);
    }
  };
  const completedCount = todayTasks.filter((task) => task.completed).length;
  const categoryStyles: Record<string, string> = {
    Personal: "bg-orange-400/15 text-orange-300",
    Study: "bg-blue-400/15 text-blue-300",
    Health: "bg-emerald-400/15 text-emerald-300",
    Creative: "bg-rose-400/15 text-rose-300",
  };
  return (
    <section className="p-3.5 sm:p-5 lg:p-8">
      {/* Daily Rotating Motivating Thought Banner */}
      <div className="mb-5 sm:mb-6 rounded-2xl border border-pink-500/25 bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-slate-900/60 p-4 sm:p-5 backdrop-blur-md shadow-lg shadow-pink-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-pink-500/20 text-pink-300 text-sm">
              ✨
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-pink-300">
                Daily Motivating Thought
              </p>
              <p className="text-[11px] text-slate-400">
                Fresh fuel for small steps, consistency, and kindness to yourself
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleNewQuote}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-95"
              title="Get another motivating thought"
            >
              <RefreshCw size={12} />
              <span>New Thought</span>
            </button>
            <button
              type="button"
              onClick={handleCopyQuote}
              className="flex items-center gap-1.5 rounded-lg border border-pink-400/30 bg-pink-500/10 px-2.5 py-1 text-xs font-medium text-pink-200 transition hover:bg-pink-500/20 active:scale-95"
              title="Copy thought to clipboard"
            >
              <Copy size={12} />
              <span>{copiedQuote ? "Copied! ❤️" : "Share / Copy"}</span>
            </button>
          </div>
        </div>
        <div className="mt-3.5 pl-1 sm:pl-2">
          <p className="text-sm sm:text-base font-medium italic text-slate-100 leading-relaxed">
            "{quote.text}"
          </p>
          <p className="mt-1 text-xs text-pink-300/80 font-medium">
            — {quote.author}
          </p>
        </div>
      </div>

      <div
        className="relative flex min-h-[220px] sm:min-h-[280px] md:min-h-[360px] w-full items-end overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 p-4 sm:p-6 md:p-10 shadow-2xl transition-all"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="relative z-10 flex flex-wrap gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button onClick={openAddWinModal} className="flex-1 sm:flex-initial rounded-xl bg-gradient-to-r from-[#f4728f] to-[#f59e61] px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-xl shadow-rose-950/30 transition hover:-translate-y-0.5 active:scale-95 text-center">+ Add a tiny win</button>
          <button onClick={openPlanDayModal} className="flex-1 sm:flex-initial rounded-xl border border-white/30 bg-black/40 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white backdrop-blur transition hover:bg-black/50 active:scale-95 text-center">✨ Plan my day</button>
        </div>
      </div>

      <div className="mt-5 sm:mt-6 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-white">🎯 Today's Top 3 Focus</h2>
            <button onClick={openPlanDayModal} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200">{Object.values(dailyFocus).some(Boolean) ? "Edit" : "+ Add Today's Focus"}</button>
          </div>
          {Object.values(dailyFocus).some(Boolean) ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {focusItems.map(({ key, label, accent }) => (
                <div key={key} className={`rounded-xl border bg-white/[.04] p-4 ${accent === "cyan" ? "border-cyan-400/20" : accent === "pink" ? "border-pink-400/20" : "border-amber-400/20"}`}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => setCompletedFocus((current) => ({ ...current, [key]: !current[key] }))}
                      aria-label={`${completedFocus[key] ? "Mark" : "Complete"} ${label}`}
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${completedFocus[key] ? "border-emerald-300 bg-emerald-300 text-slate-900" : "border-white/20 text-transparent"}`}
                    >
                      {completedFocus[key] && <Check size={13} />}
                    </button>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold uppercase tracking-wider ${accent === "cyan" ? "text-cyan-300" : accent === "pink" ? "text-pink-300" : "text-amber-300"}`}>{label}</p>
                      <p className={`mt-2 break-words text-sm ${completedFocus[key] ? "text-slate-500 line-through" : "text-slate-200"}`}>{dailyFocus[key] || "Not set yet"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <button onClick={openPlanDayModal} className="mt-4 w-full rounded-xl border border-dashed border-white/15 bg-white/[.03] px-4 py-5 text-sm text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-200">Set one to three intentions for today and keep the day clear.</button>
          )}
        </div>

      {isAddWinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setIsAddWinModalOpen(false)}>
          <form onSubmit={saveTinyWin} className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111525]/95 p-5 sm:p-6 shadow-2xl shadow-black/40">
            <p className="text-xs uppercase tracking-[.18em] text-orange-300">A small step</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Add a tiny win</h2>
            <input autoFocus required value={winInput} onChange={(event) => setWinInput(event.target.value)} placeholder="What will you finish today?" className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-orange-300/60" />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsAddWinModalOpen(false)} className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <button disabled={isSavingWin} className="rounded-xl bg-orange-300 px-4 py-2 text-sm font-semibold text-[#3b233a] disabled:opacity-60">{isSavingWin ? "Saving..." : "Save Win"}</button>
            </div>
          </form>
        </div>
      )}

      {isPlanDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setIsPlanDayModalOpen(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111525]/95 p-5 sm:p-6 shadow-2xl shadow-black/40">
            <p className="text-xs uppercase tracking-[.18em] text-cyan-300">{niceDate(today)}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Top 3 Focus</h2>
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-slate-300"><span className="mb-2 block text-xs text-slate-500">1. Deep Work / Study</span><input value={deepWorkInput} onChange={(event) => setDeepWorkInput(event.target.value)} placeholder="Set today's focus" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60" /></label>
              <label className="block text-sm text-slate-300"><span className="mb-2 block text-xs text-slate-500">2. Health / Movement</span><input value={healthInput} onChange={(event) => setHealthInput(event.target.value)} placeholder="Set today's focus" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60" /></label>
              <label className="block text-sm text-slate-300"><span className="mb-2 block text-xs text-slate-500">3. Reflection / Wrap-up</span><input value={reflectionInput} onChange={(event) => setReflectionInput(event.target.value)} placeholder="Set today's focus" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setIsPlanDayModalOpen(false)} className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Close</button><button type="button" onClick={saveDailyFocus} className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-[#10253b]">Save focus</button></div>
          </div>
        </div>
      )}

      {isReflectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setIsReflectionOpen(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111525]/95 p-5 sm:p-6 shadow-2xl shadow-black/40">
            <p className="text-xs uppercase tracking-[.18em] text-cyan-300">Journal & Reflection</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Daily Reflection</h2>
            <p className="mt-1 text-xs text-slate-400">Capture what went well today and clear your mind.</p>
            <textarea
              autoFocus
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="What went well today? What tiny win felt good?"
              rows={5}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 p-3.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-300/60"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsReflectionOpen(false)} className="rounded-xl px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Close</button>
              <button
                type="button"
                onClick={() => {
                  if (reflectionText.trim()) {
                    localStorage.setItem(`tiny_wins_reflection_${today}`, reflectionText.trim());
                  }
                  setIsReflectionOpen(false);
                }}
                className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-[#10253b]"
              >
                Save reflection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 sm:mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="interactive-card glass-panel relative overflow-hidden rounded-2xl bg-[linear-gradient(145deg,rgba(96,165,250,.2),rgba(15,23,42,.7))] p-4 sm:p-5">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Today&apos;s progress</p><span className="text-xl">⚡</span></div>
          <div className="mt-4 sm:mt-5 flex items-center gap-4"><div className="grid h-16 w-16 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#7dd3fc ${progress}%, rgba(255,255,255,.1) 0)` }}><div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-full bg-[#111a38] text-base sm:text-lg font-bold text-white">{progress}%</div></div><p className="text-xs leading-5 text-slate-400">{completedCount} of {todayTasks.length || 0} completed</p></div>
          <div className="mt-4 inline-flex rounded-full bg-sky-300/15 px-3 py-1 text-xs text-sky-200">🌱 You&apos;re doing great!</div>
        </div>
        <div className="interactive-card glass-panel rounded-2xl p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Tiny wins today</p><span className="text-xl">⏱</span></div><p className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold text-white">{completedCount} <span className="text-base sm:text-lg text-slate-500">/ {todayTasks.length || 6}</span></p><div className="mt-4 flex gap-2">{Array.from({ length: 6 }).map((_, index) => <span key={index} className={`h-2.5 w-2.5 rounded-full ${index < completedCount ? "bg-orange-300 shadow-lg shadow-orange-300/50" : "bg-white/10"}`} />)}</div><p className="mt-4 text-xs leading-5 text-slate-400">{Math.max(0, 6 - completedCount)} more and you&apos;ll complete today&apos;s tiny wins! Keep going! 👑</p></div>
        <div className="interactive-card glass-panel rounded-2xl bg-[linear-gradient(145deg,rgba(251,146,60,.16),rgba(15,23,42,.72))] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Current streak</p>
            <span className="animate-pulse text-xl">🔥</span>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline justify-between flex-wrap gap-2">
            <p className="text-2xl sm:text-3xl font-bold text-orange-200">{streak} {streak === 1 ? "day" : "days"}</p>
            {shieldStatus.isShieldedToday ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-0.5" title="Recovery shield is protecting your streak today">
                🛡️ Shield Active
              </span>
            ) : shieldStatus.available ? (
              <button
                type="button"
                onClick={handleClaimShield}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-full px-2.5 py-0.5 transition active:scale-95"
                title="Claim 1-day Recovery Shield to protect your streak"
              >
                <Shield size={11} />
                <span>Shield (1/wk)</span>
              </button>
            ) : (
              <span className="text-[10px] text-slate-500">🛡️ Used this week</span>
            )}
          </div>
          <div className="mt-4 flex gap-1.5 sm:gap-2">
            {weekDaysInfo.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold transition-all ${
                    day.isCompleted
                      ? "bg-gradient-to-tr from-amber-400 to-orange-400 text-slate-950 shadow-md shadow-orange-500/40"
                      : day.isShielded
                      ? "border border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/30 font-bold"
                      : day.isToday
                      ? "border border-amber-400/80 bg-amber-400/15 text-amber-200 ring-2 ring-amber-400/30 font-bold"
                      : "bg-white/5 text-slate-500"
                  }`}
                  title={`${day.dayName} (${day.date}): ${day.isCompleted ? "Completed" : day.isShielded ? "Recovery Shield Active 🛡️" : day.isToday ? "Today" : "No activity"}`}
                >
                  {day.isShielded ? "🛡️" : day.dayLetter}
                </span>
                {day.isToday && <span className="h-1 w-1 rounded-full bg-amber-400" />}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            {weekDaysInfo.find((d) => d.isToday)?.isCompleted
              ? "Today's win completed! Flame burning bright. 🔥"
              : weekDaysInfo.find((d) => d.isToday)?.isShielded
              ? "Recovery Shield active today. Streak preserved! 🛡️"
              : "Complete a win today to keep your streak alive."}
          </p>
        </div>
        <div className="interactive-card glass-panel rounded-2xl bg-[linear-gradient(145deg,rgba(30,41,79,.75),rgba(3,7,18,.8))] p-4 sm:p-5">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Time reclaimed</p><Clock3 className="text-indigo-300" size={18} /></div>
          <p className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold text-white">{formatMinutesToHours(reclaimedMinutes)}</p>
          <div className="mt-3 flex h-12 items-end gap-2">
            {[24, 38, 28, 44, 34, 52, 42].map((height, index) => <span key={index} className="flex-1 rounded-t bg-indigo-300/50" style={{ height: `${height}%` }} />)}
          </div>
          <p className="mt-3 text-xs text-slate-400">More time for what matters.</p>
        </div>
      </div>

      <div className="mt-5 sm:mt-6 grid gap-4 sm:gap-5 xl:grid-cols-[1.25fr_1fr_.8fr]">
        <div className="glass-panel rounded-2xl p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-orange-300">Today&apos;s Tasks</p><h2 className="mt-2 text-xl font-semibold text-white">Make it count</h2></div><span className="text-xs text-slate-500">{completedCount}/{todayTasks.length || 0}</span></div><div className="mt-5 space-y-2">{todayTasks.slice(0, 5).map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.025] p-3"><button onClick={() => void toggle(task)} aria-label={`Mark ${task.title} ${task.completed ? "active" : "complete"}`} className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${task.completed ? "border-emerald-300 bg-emerald-300 text-[#18223b]" : "border-white/20 text-transparent"}`}>{task.completed && <Check size={13} />}</button><span className={`min-w-0 flex-1 truncate text-sm ${task.completed ? "text-slate-500 line-through" : "text-slate-200"}`}>{task.title}</span><span className={`hidden rounded-full px-2 py-1 text-[10px] font-medium sm:inline ${categoryStyles[task.category] || "bg-slate-400/10 text-slate-300"}`}>{task.category}</span><span className="text-[10px] text-slate-500">{task.dueTime || "15m"}</span><Star size={15} className="text-orange-200/70" /></div>)}{!todayTasks.length && <div className="rounded-xl border border-dashed border-orange-200/20 p-6 text-center"><Heart className="mx-auto text-rose-300" size={22} /><p className="mt-2 text-sm text-slate-300">Your first tiny win is waiting.</p><button onClick={openAddTask} className="mt-3 rounded-lg bg-orange-300 px-3 py-2 text-xs font-semibold text-[#3b233a]">Add a win</button></div>}</div><div className="mt-4"><TaskList tasks={todayTasks.slice(0, 3)} categories={categories} projects={projects} onSave={save} onDelete={remove} onToggle={toggle} title="Today's focus" /></div></div>
        
        {/* Real Dynamic Weekly/Monthly Momentum Graph */}
        <MomentumGraph tasks={tasks} variant="dashboard" />

        <div className="space-y-4 sm:space-y-5">
          {/* Functional Focus Mode Widget */}
          <FocusModeWidget
            onSessionComplete={(mins) => {
              setReclaimedMinutes((prev) => prev + mins);
            }}
          />

          {/* Functional Quick Actions */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5">
            <h2 className="font-semibold text-white">Quick actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={openAddWinModal}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.03] px-2 py-3 text-xs text-slate-400 transition hover:border-orange-300/30 hover:text-orange-200 active:scale-95"
              >
                <Plus size={17} className="text-orange-300" />
                <span>New task</span>
              </button>
              <button
                onClick={() => navigate("/projects")}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.03] px-2 py-3 text-xs text-slate-400 transition hover:border-violet-300/30 hover:text-violet-200 active:scale-95"
              >
                <FolderPlus size={17} className="text-violet-300" />
                <span>Projects</span>
              </button>
              <button
                onClick={() => setIsReflectionOpen(true)}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.03] px-2 py-3 text-xs text-slate-400 transition hover:border-cyan-300/30 hover:text-cyan-200 active:scale-95"
              >
                <BookOpen size={17} className="text-cyan-300" />
                <span>Journal</span>
              </button>
              <button
                onClick={() => navigate("/streaks")}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.03] px-2 py-3 text-xs text-slate-400 transition hover:border-rose-300/30 hover:text-rose-200 active:scale-95"
              >
                <Flame size={17} className="text-rose-300" />
                <span>Habit</span>
              </button>
              <button
                onClick={() => {
                  setStrugglingTask(todayTasks.find((t) => !t.completed) || null);
                  setIsStrugglingModalOpen(true);
                }}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-xs font-medium text-amber-200 transition hover:bg-amber-400/20 active:scale-95"
              >
                <HeartHandshake size={15} className="text-amber-300" />
                <span>Struggling with a task? Friction check</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confetti Celebration on completing all tasks */}
      <ConfettiCelebration
        trigger={triggerConfetti}
        onComplete={() => setTriggerConfetti(false)}
      />

      {/* Personalized Struggling / Friction Check Modal */}
      <StrugglingModal
        isOpen={isStrugglingModalOpen}
        onClose={() => setIsStrugglingModalOpen(false)}
        task={strugglingTask}
        onActionComplete={() => {
          onRefreshShield();
        }}
      />
    </section>
  );
}
function Calendar({
  tasks,
  categories,
  projects,
  selected,
  setSelected,
  list,
  save,
  remove,
  toggle,
}: {
  tasks: Task[];
  categories: ReturnType<typeof useTasks>["categories"];
  projects: ReturnType<typeof useTasks>["projects"];
  selected: string;
  setSelected: (d: string) => void;
  list: Task[];
  save: ReturnType<typeof useTasks>["save"];
  remove: ReturnType<typeof useTasks>["remove"];
  toggle: ReturnType<typeof useTasks>["toggle"];
}) {
  const [month, setMonth] = useState(new Date());
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = Array.from(
    {
      length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    },
    (_, i) => i + 1,
  );
  const move = (n: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <section className="p-3.5 sm:p-5 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white">Calendar</h1>
        <div className="flex gap-2">
          <button onClick={() => move(-1)} className="button px-3 py-1.5 text-sm" aria-label="Previous month">
            ←
          </button>
          <button onClick={() => move(1)} className="button px-3 py-1.5 text-sm" aria-label="Next month">
            →
          </button>
        </div>
      </div>
      <h2 className="mt-4 sm:mt-6 text-base sm:text-lg text-zinc-300">
        {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
      </h2>
      <div className="mt-4 grid max-w-3xl grid-cols-7 gap-1 rounded-2xl border border-white/[.07] bg-white/[.025] p-2 sm:p-3">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => (
          <span key={x} className="p-1 sm:p-2 text-center text-[10px] sm:text-xs text-zinc-500 font-medium">
            {x}
          </span>
        ))}
        {Array.from({ length: first.getDay() }).map((_, i) => (
          <span key={`e${i}`} />
        ))}
        {days.map((day) => {
          const d = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const has = tasks.some((t) => t.dueDate === d);
          return (
            <button
              key={d}
              onClick={() => setSelected(d)}
              className={`relative rounded-lg sm:rounded-xl p-1.5 sm:p-3 text-xs sm:text-sm font-medium transition ${selected === d ? "bg-violet-400 text-zinc-950 font-bold" : "text-zinc-300 hover:bg-white/[.06]"}`}
            >
              {day}
              {has && (
                <i className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-300" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-7 max-w-4xl">
        <TaskList
          tasks={list}
          categories={categories}
          projects={projects}
          onSave={save}
          onDelete={remove}
          onToggle={toggle}
          title={niceDate(selected)}
        />
      </div>
    </section>
  );
}

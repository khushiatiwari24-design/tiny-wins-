import heroBg from "../assets/heropage.jpeg.jpg";
import { useMemo, useState } from "react";
import { BookOpen, Check, Clock3, Flame, FolderPlus, Heart, Plus, Star, Timer, TrendingUp } from "lucide-react";
import { useTasks } from "../hooks/useTasks";
import { useAuth } from "../context/AuthContext";
import TaskList from "../components/tasks/TaskList";
import type { Task, TaskInput } from "../types/task";

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
  new Date(d).toLocaleDateString("en-CA");
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
  const streak = [
    ...new Set(
      tasks.filter((t) => t.completed).map((t) => t.updatedAt.slice(0, 10)),
    ),
  ]
    .sort()
    .reduce(
      (count, day, index, dates) =>
        index &&
        dates[index - 1] ===
          dateKey(new Date(`${day}T12:00:00`).getTime() - 86400000)
          ? count + 1
          : 1,
      0,
    );
  if (loading)
    return <div className="p-8 text-zinc-500">Loading your workspace…</div>;
  if (view === "dashboard")
    return (
      <Dashboard
        tasks={tasks}
        categories={categories}
        projects={projects}
        streak={streak}
        save={save}
        remove={remove}
        toggle={toggle}
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
          <Card label="Current activity" value={`${streak} days`} />
          <Card
            label="Completed today"
            value={
              tasks.some(
                (t) => t.completed && t.updatedAt.slice(0, 10) === today,
              )
                ? "Yes"
                : "Not yet"
            }
          />
        </div>
        <p className="mt-6 text-zinc-500">
          A day counts when you complete at least one task.
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
  save,
  remove,
  toggle,
}: {
  tasks: Task[];
  categories: ReturnType<typeof useTasks>["categories"];
  projects: ReturnType<typeof useTasks>["projects"];
  streak: number;
  save: ReturnType<typeof useTasks>["save"];
  remove: ReturnType<typeof useTasks>["remove"];
  toggle: ReturnType<typeof useTasks>["toggle"];
}) {
  const today = dateKey();
  const todayTasks = tasks.filter((task) => task.dueDate === today);
  const [isAddWinModalOpen, setIsAddWinModalOpen] = useState(false);
  const [winInput, setWinInput] = useState("");
  const [isPlanDayModalOpen, setIsPlanDayModalOpen] = useState(false);
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
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const categoryStyles: Record<string, string> = {
    Personal: "bg-orange-400/15 text-orange-300",
    Study: "bg-blue-400/15 text-blue-300",
    Health: "bg-emerald-400/15 text-emerald-300",
    Creative: "bg-rose-400/15 text-rose-300",
  };
  return (
    <section className="p-3.5 sm:p-5 lg:p-8">
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

      <div className="mt-5 sm:mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="interactive-card glass-panel relative overflow-hidden rounded-2xl bg-[linear-gradient(145deg,rgba(96,165,250,.2),rgba(15,23,42,.7))] p-4 sm:p-5">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Today&apos;s progress</p><span className="text-xl">⚡</span></div>
          <div className="mt-4 sm:mt-5 flex items-center gap-4"><div className="grid h-16 w-16 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#7dd3fc ${progress}%, rgba(255,255,255,.1) 0)` }}><div className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-full bg-[#111a38] text-base sm:text-lg font-bold text-white">{progress}%</div></div><p className="text-xs leading-5 text-slate-400">{completedCount} of {todayTasks.length || 0} completed</p></div>
          <div className="mt-4 inline-flex rounded-full bg-sky-300/15 px-3 py-1 text-xs text-sky-200">🌱 You&apos;re doing great!</div>
        </div>
        <div className="interactive-card glass-panel rounded-2xl p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Tiny wins today</p><span className="text-xl">⏱</span></div><p className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold text-white">{completedCount} <span className="text-base sm:text-lg text-slate-500">/ {todayTasks.length || 6}</span></p><div className="mt-4 flex gap-2">{Array.from({ length: 6 }).map((_, index) => <span key={index} className={`h-2.5 w-2.5 rounded-full ${index < completedCount ? "bg-orange-300 shadow-lg shadow-orange-300/50" : "bg-white/10"}`} />)}</div><p className="mt-4 text-xs leading-5 text-slate-400">{Math.max(0, 6 - completedCount)} more and you&apos;ll complete today&apos;s tiny wins! Keep going! 👑</p></div>
        <div className="interactive-card glass-panel rounded-2xl bg-[linear-gradient(145deg,rgba(251,146,60,.16),rgba(15,23,42,.72))] p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Current streak</p><span className="animate-pulse text-xl">🔥</span></div><p className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold text-orange-200">{streak} days</p><div className="mt-4 flex gap-1.5 sm:gap-2">{weekDays.map((day, index) => <span key={`${day}-${index}`} className={`grid h-7 w-7 place-items-center rounded-full text-[10px] ${index < Math.min(streak, 7) ? "bg-orange-300/20 text-orange-200" : "bg-white/5 text-slate-600"}`}>{day}</span>)}</div><p className="mt-4 text-xs text-slate-400">You&apos;re building something incredible.</p></div>
        <div className="interactive-card glass-panel rounded-2xl bg-[linear-gradient(145deg,rgba(30,41,79,.75),rgba(3,7,18,.8))] p-4 sm:p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Time reclaimed</p><Clock3 className="text-indigo-300" size={18} /></div><p className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold text-white">2h 15m</p><div className="mt-3 flex h-12 items-end gap-2">{[24, 38, 28, 44, 34, 52, 42].map((height, index) => <span key={index} className="flex-1 rounded-t bg-indigo-300/50" style={{ height: `${height}%` }} />)}</div><p className="mt-3 text-xs text-slate-400">More time for what matters.</p></div>
      </div>

      <div className="mt-5 sm:mt-6 grid gap-4 sm:gap-5 xl:grid-cols-[1.25fr_1fr_.8fr]">
        <div className="glass-panel rounded-2xl p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.18em] text-orange-300">Today&apos;s Tasks</p><h2 className="mt-2 text-xl font-semibold text-white">Make it count</h2></div><span className="text-xs text-slate-500">{completedCount}/{todayTasks.length || 0}</span></div><div className="mt-5 space-y-2">{todayTasks.slice(0, 5).map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.025] p-3"><button onClick={() => void toggle(task)} aria-label={`Mark ${task.title} ${task.completed ? "active" : "complete"}`} className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${task.completed ? "border-emerald-300 bg-emerald-300 text-[#18223b]" : "border-white/20 text-transparent"}`}>{task.completed && <Check size={13} />}</button><span className={`min-w-0 flex-1 truncate text-sm ${task.completed ? "text-slate-500 line-through" : "text-slate-200"}`}>{task.title}</span><span className={`hidden rounded-full px-2 py-1 text-[10px] font-medium sm:inline ${categoryStyles[task.category] || "bg-slate-400/10 text-slate-300"}`}>{task.category}</span><span className="text-[10px] text-slate-500">{task.dueTime || "15m"}</span><Star size={15} className="text-orange-200/70" /></div>)}{!todayTasks.length && <div className="rounded-xl border border-dashed border-orange-200/20 p-6 text-center"><Heart className="mx-auto text-rose-300" size={22} /><p className="mt-2 text-sm text-slate-300">Your first tiny win is waiting.</p><button onClick={openAddTask} className="mt-3 rounded-lg bg-orange-300 px-3 py-2 text-xs font-semibold text-[#3b233a]">Add a win</button></div>}</div><div className="mt-4"><TaskList tasks={todayTasks.slice(0, 3)} categories={categories} projects={projects} onSave={save} onDelete={remove} onToggle={toggle} title="Today's focus" /></div></div>
        <div className="rounded-2xl bg-[#fffaf1] p-4 sm:p-6 text-[#35415e] shadow-xl shadow-black/10"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#c88766]">Weekly momentum</p><h2 className="mt-2 text-lg sm:text-xl font-semibold">Consistency, softly built.</h2></div><TrendingUp size={20} className="text-[#e39a76]" /></div><div className="mt-6 sm:mt-8 flex h-28 sm:h-32 items-end gap-1.5 sm:gap-3">{[52, 72, 44, 84, 62, 92, 68].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className={`w-full rounded-t-lg ${index === 5 ? "bg-[#e99b7d]" : "bg-[#b9c9dc]"}`} style={{ height: `${height}%` }} /><span className="text-[10px] text-[#8b96aa]">{weekDays[index]}</span></div>)}</div><div className="mt-6 sm:mt-7 grid grid-cols-3 gap-1 sm:gap-2 border-t border-[#eadfce] pt-4 text-center"><div><p className="text-base sm:text-lg font-semibold">6</p><p className="text-[10px] text-[#8b96aa]">Daily goals</p></div><div><p className="text-base sm:text-lg font-semibold">{streak}</p><p className="text-[10px] text-[#8b96aa]">Best streak</p></div><div><p className="text-base sm:text-lg font-semibold text-[#d98065]">+22%</p><p className="text-[10px] text-[#8b96aa]">Consistency</p></div></div><p className="mt-5 sm:mt-7 text-center font-serif text-xs sm:text-sm italic text-[#68748c]">Consistency over perfection. That&apos;s where real progress lives. 💕</p></div>
        <div className="space-y-4 sm:space-y-5"><div className="glass-panel rounded-2xl p-4 sm:p-5"><div className="flex items-center gap-2"><Timer className="text-orange-300" size={18} /><h2 className="font-semibold text-white">Focus mode</h2></div><p className="mt-4 sm:mt-5 text-3xl sm:text-4xl font-semibold text-white">25 <span className="text-base text-slate-500">min</span></p><div className="mt-4 grid grid-cols-3 gap-2">{["25 min", "50 min", "Custom"].map((option) => <button key={option} className="rounded-lg border border-white/10 bg-white/[.04] px-2 py-2 text-[11px] text-slate-300 transition hover:border-orange-300/40 hover:text-orange-200 active:scale-95">{option}</button>)}</div><button className="mt-3 w-full rounded-lg bg-orange-300 py-2.5 text-sm font-semibold text-[#3b233a] shadow-lg shadow-orange-950/20 active:scale-98">Start focus</button></div><div className="glass-panel rounded-2xl p-4 sm:p-5"><h2 className="font-semibold text-white">Quick actions</h2><div className="mt-4 grid grid-cols-2 gap-2">{[[Plus, "New task"], [FolderPlus, "New project"], [BookOpen, "Journal"], [Flame, "Habit"]].map(([Icon, label]) => <button key={label as string} onClick={label === "New task" ? openAddTask : undefined} className="flex flex-col items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.03] px-2 py-3 text-xs text-slate-400 transition hover:border-orange-300/30 hover:text-orange-200 active:scale-95"><Icon size={17} />{label as string}</button>)}</div></div></div>
      </div>
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

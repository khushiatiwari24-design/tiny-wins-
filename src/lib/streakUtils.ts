import type { Task } from "../types/task";

export const getLocalDateKey = (d: Date | number = new Date()): string => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export interface WeekDayInfo {
  date: string;
  dayLetter: string;
  dayName: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isCompleted: boolean;
  isShielded: boolean;
}

const LOCAL_STORAGE_KEY_STREAK_DATES = "tiny_wins_completed_dates";
const LOCAL_STORAGE_KEY_RECLAIMED_TIME = "tiny_wins_reclaimed_minutes";
const LOCAL_STORAGE_KEY_RECOVERY_SHIELDS = "tiny_wins_recovery_shields";

/**
 * Get all dates where Recovery Shield was activated
 */
export const getRecoveryShieldDates = (): Set<string> => {
  const dates = new Set<string>();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RECOVERY_SHIELDS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const d of arr) {
          if (typeof d === "string") dates.add(d);
        }
      }
    }
  } catch (err) {
    console.warn("Could not read recovery shields from localStorage:", err);
  }
  return dates;
};

/**
 * Check if the recovery shield is active today
 */
export const isShieldActiveToday = (): boolean => {
  const today = getLocalDateKey();
  return getRecoveryShieldDates().has(today);
};

/**
 * Get recovery shield weekly status (1 shield per calendar week Mon-Sun)
 */
export const getRecoveryShieldStatus = () => {
  const today = new Date();
  const todayStr = getLocalDateKey(today);
  const shieldDates = getRecoveryShieldDates();

  // Find start of current week (Monday)
  const dayOfWeek = today.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  let usedCountThisWeek = 0;
  for (const dateStr of shieldDates) {
    const d = new Date(`${dateStr}T12:00:00`);
    if (d >= monday && d <= sunday) {
      usedCountThisWeek++;
    }
  }

  const activeToday = shieldDates.has(todayStr);
  const available = usedCountThisWeek === 0 || activeToday;

  // Days until Sunday midnight (weekly reset)
  const daysUntilReset = Math.max(1, 7 - distanceToMonday);

  return {
    available,
    activeToday,
    isShieldedToday: activeToday,
    usedCountThisWeek,
    resetsInDays: daysUntilReset,
    nextResetDate: "Monday",
  };
};

/**
 * Activate the recovery shield for today
 */
export const activateRecoveryShieldToday = (): { success: boolean; message: string } => {
  const today = getLocalDateKey();
  const shieldDates = getRecoveryShieldDates();

  if (shieldDates.has(today)) {
    return { success: true, message: "Recovery Shield is already active for today! Your streak is protected." };
  }

  const status = getRecoveryShieldStatus();
  if (!status.available && !status.activeToday) {
    return {
      success: false,
      message: `Weekly Recovery Shield already used (1/1 this week). Resets in ${status.resetsInDays} days.`,
    };
  }

  try {
    shieldDates.add(today);
    localStorage.setItem(LOCAL_STORAGE_KEY_RECOVERY_SHIELDS, JSON.stringify(Array.from(shieldDates)));
    // Also record in streak dates so streak calculation doesn't drop
    recordCompletionToday();
    return { success: true, message: "🛡️ Recovery Shield active today! Your streak is protected." };
  } catch (err) {
    console.error("Failed to activate recovery shield:", err);
    return { success: false, message: "Could not activate shield right now." };
  }
};

/**
 * Get all dates where at least one task, tiny win, or recovery shield was active
 */
export const getCompletedDates = (tasks: Task[] = []): Set<string> => {
  const dates = new Set<string>();

  // 1. From tasks in props
  for (const t of tasks) {
    if (t.completed) {
      if (t.updatedAt) {
        dates.add(t.updatedAt.slice(0, 10));
      }
      if (t.dueDate) {
        dates.add(t.dueDate);
      }
    }
  }

  // 2. From localStorage backup
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_STREAK_DATES);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const d of arr) {
          if (typeof d === "string") dates.add(d);
        }
      }
    }
  } catch (err) {
    console.warn("Could not read streak dates from localStorage:", err);
  }

  // 3. Include recovery shield dates so streaks never drop on shielded days
  const shieldDates = getRecoveryShieldDates();
  for (const s of shieldDates) {
    dates.add(s);
  }

  return dates;
};

/**
 * Record today as completed in localStorage
 */
export const recordCompletionToday = (): void => {
  try {
    const today = getLocalDateKey();
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_STREAK_DATES);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(today);
    localStorage.setItem(LOCAL_STORAGE_KEY_STREAK_DATES, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn("Could not save streak date to localStorage:", err);
  }
};

/**
 * Calculate active streak leading up to today (or yesterday if today isn't done yet)
 */
export const calculateActiveStreak = (completedDates: Set<string>): number => {
  if (completedDates.size === 0) return 0;

  const today = new Date();
  const todayStr = getLocalDateKey(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateKey(yesterday);

  // If neither today nor yesterday has a completed task, streak is 0
  const todayCompleted = completedDates.has(todayStr);
  const yesterdayCompleted = completedDates.has(yesterdayStr);

  if (!todayCompleted && !yesterdayCompleted) {
    return 0;
  }

  // Start counting backwards
  let count = 0;
  const current = new Date(today);

  // If today is not completed yet, start checking from yesterday
  if (!todayCompleted) {
    current.setDate(current.getDate() - 1);
  }

  while (true) {
    const dateStr = getLocalDateKey(current);
    if (completedDates.has(dateStr)) {
      count++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return count;
};

/**
 * Calculate all-time best streak
 */
export const calculateBestStreak = (completedDates: Set<string>): number => {
  if (completedDates.size === 0) return 0;

  const sorted = Array.from(completedDates).sort();
  let max = 0;
  let current = 0;
  let prevTime: number | null = null;

  for (const dateStr of sorted) {
    const time = new Date(`${dateStr}T12:00:00`).getTime();
    if (prevTime === null) {
      current = 1;
    } else {
      const diffDays = Math.round((time - prevTime) / 86400000);
      if (diffDays === 1) {
        current += 1;
      } else if (diffDays > 1) {
        current = 1;
      }
    }
    if (current > max) max = current;
    prevTime = time;
  }

  return max;
};

/**
 * Returns the current calendar week (Monday to Sunday) with dynamic day highlights
 */
export const getCurrentWeekDays = (completedDates: Set<string>): WeekDayInfo[] => {
  const today = new Date();
  const todayStr = getLocalDateKey(today);
  const shieldDates = getRecoveryShieldDates();

  // Monday is 1, Sunday is 0 -> map Sunday to 7 so Monday is start
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  const distanceToMonday = (dayOfWeek + 6) % 7; // 0 if Mon, 1 if Tue, ..., 6 if Sun

  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);

  const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const week: WeekDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = getLocalDateKey(d);

    week.push({
      date: dateStr,
      dayLetter: dayLetters[i],
      dayName: dayNames[i],
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      isFuture: dateStr > todayStr,
      isCompleted: completedDates.has(dateStr),
      isShielded: shieldDates.has(dateStr),
    });
  }

  return week;
};

/**
 * Reclaimed time tracker (in minutes)
 */
export const getReclaimedMinutes = (): number => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_RECLAIMED_TIME);
    if (raw) {
      const val = parseInt(raw, 10);
      if (!Number.isNaN(val) && val >= 0) return val;
    }
  } catch {
    // fallback
  }
  return 135; // Default 2h 15m
};

export const addReclaimedMinutes = (minutes: number): number => {
  const current = getReclaimedMinutes();
  const next = current + Math.max(0, minutes);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_RECLAIMED_TIME, next.toString());
  } catch {
    // fallback
  }
  return next;
};

export const formatMinutesToHours = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

export interface StreakMilestone {
  id: string;
  days: number;
  title: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

export const STREAK_MILESTONES: Omit<StreakMilestone, "unlocked">[] = [
  { id: "win-1", days: 1, title: "1st Win", icon: "🌱", description: "Completed your first tiny win!" },
  { id: "spark-3", days: 3, title: "3-Day Spark", icon: "🔥", description: "3 days of continuous momentum." },
  { id: "rhythm-7", days: 7, title: "7-Day Rhythm", icon: "⚡", description: "A full week of habit excellence." },
  { id: "momentum-14", days: 14, title: "14-Day Momentum", icon: "🚀", description: "Two straight weeks locked in." },
  { id: "unstoppable-30", days: 30, title: "30-Day Unstoppable", icon: "🏆", description: "1 full month of daily wins!" },
  { id: "titan-50", days: 50, title: "50-Day Titan", icon: "🌟", description: "Half a century of consistent action." },
  { id: "legend-100", days: 100, title: "100-Day Legend", icon: "👑", description: "Mastery of the tiny wins philosophy." },
];

export const getMilestones = (currentStreak: number): StreakMilestone[] => {
  return STREAK_MILESTONES.map((m) => ({
    ...m,
    unlocked: currentStreak >= m.days,
  }));
};


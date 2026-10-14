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
}

const LOCAL_STORAGE_KEY_STREAK_DATES = "tiny_wins_completed_dates";
const LOCAL_STORAGE_KEY_RECLAIMED_TIME = "tiny_wins_reclaimed_minutes";

/**
 * Get all dates where at least one task or tiny win was completed
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

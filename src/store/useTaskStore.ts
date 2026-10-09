import { create } from "zustand";
import type { Task, TaskInput } from "../types/task";

const STORAGE_KEY = "tiny-wins-tasks";

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const nowIso = () => new Date().toISOString();

const normalizeTime = (time: string | undefined) => time?.trim() ?? "";

const createDemoTasks = (): Task[] => {
  const today = getTodayDate();
  const createdAt = nowIso();

  return [
    {
      id: crypto.randomUUID(),
      title: "Finish Tiny Wins dashboard",
      description: "",
      category: "Development",
      priority: "High",
      project: "",
      dueDate: today,
      dueTime: "16:00",
      completed: false,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: crypto.randomUUID(),
      title: "Study Physics",
      description: "",
      category: "Study",
      priority: "Medium",
      project: "",
      dueDate: today,
      dueTime: "19:00",
      completed: false,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: crypto.randomUUID(),
      title: "Morning workout",
      description: "",
      category: "Health",
      priority: "Low",
      project: "",
      dueDate: today,
      dueTime: "08:00",
      completed: true,
      createdAt,
      updatedAt: createdAt,
    },
  ];
};

const sanitizeTask = (task: Partial<Task>): Task => {
  const createdAt = task.createdAt ?? nowIso();

  return {
    id: task.id ? String(task.id) : crypto.randomUUID(),
    title: task.title?.trim() ?? "",
    description: task.description ?? "",
    completed: Boolean(task.completed),
    priority:
      task.priority === "High" || task.priority === "Low"
        ? task.priority
        : "Medium",
    category: task.category?.trim() ?? "Personal",
    project: task.project?.trim() ?? "",
    dueDate: task.dueDate ?? getTodayDate(),
    dueTime: normalizeTime(task.dueTime),
    createdAt,
    updatedAt: task.updatedAt ?? createdAt,
  };
};

const readTasksFromStorage = (): Task[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return null;
    }

    const sanitizedTasks = parsed
      .map((task) => sanitizeTask(task as Partial<Task>))
      .filter((task) => task.title.length > 0);

    return sanitizedTasks;
  } catch {
    return null;
  }
};

const persistTasks = (tasks: Task[]) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

const sortBySchedule = (tasks: Task[]) => {
  return [...tasks].sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }

    if (a.dueTime !== b.dueTime) {
      if (!a.dueTime) {
        return 1;
      }
      if (!b.dueTime) {
        return -1;
      }
      return a.dueTime.localeCompare(b.dueTime);
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
};

const initialTasks = (() => {
  const fromStorage = readTasksFromStorage();
  if (fromStorage) {
    return sortBySchedule(fromStorage);
  }

  const demoTasks = createDemoTasks();
  persistTasks(demoTasks);
  return sortBySchedule(demoTasks);
})();

type TaskStore = {
  tasks: Task[];
  addTask: (input: TaskInput) => void;
  updateTask: (id: string, input: TaskInput) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  toggleTask: (id: string) => void;
};

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: initialTasks,
  addTask: (input) => {
    set((state) => {
      const createdAt = nowIso();
      const nextTasks = sortBySchedule([
        ...state.tasks,
        sanitizeTask({
          ...input,
          id: crypto.randomUUID(),
          title: input.title.trim(),
          description: input.description?.trim() ?? "",
          project: input.project?.trim() ?? "",
          dueTime: normalizeTime(input.dueTime),
          completed: false,
          createdAt,
          updatedAt: createdAt,
        }),
      ]);

      persistTasks(nextTasks);

      return { tasks: nextTasks };
    });
  },
  updateTask: (id, input) => {
    set((state) => {
      const nextTasks = sortBySchedule(
        state.tasks.map((task) =>
          task.id === id
            ? sanitizeTask({
                ...task,
                ...input,
                title: input.title.trim(),
                description: input.description?.trim() ?? "",
                project: input.project?.trim() ?? "",
                dueTime: normalizeTime(input.dueTime),
                updatedAt: nowIso(),
              })
            : task
        )
      );

      persistTasks(nextTasks);

      return { tasks: nextTasks };
    });
  },
  deleteTask: (id) => {
    set((state) => {
      const nextTasks = state.tasks.filter((task) => task.id !== id);
      persistTasks(nextTasks);
      return { tasks: nextTasks };
    });
  },
  duplicateTask: (id) => {
    set((state) => {
      const taskToClone = state.tasks.find((task) => task.id === id);

      if (!taskToClone) {
        return state;
      }

      const createdAt = nowIso();
      const duplicate: Task = {
        ...taskToClone,
        id: crypto.randomUUID(),
        completed: false,
        createdAt,
        updatedAt: createdAt,
      };

      const nextTasks = sortBySchedule([...state.tasks, duplicate]);
      persistTasks(nextTasks);
      return { tasks: nextTasks };
    });
  },
  toggleTask: (id) => {
    set((state) => {
      const nextTasks = sortBySchedule(
        state.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                completed: !task.completed,
                updatedAt: nowIso(),
              }
            : task
        )
      );

      persistTasks(nextTasks);

      return { tasks: nextTasks };
    });
  },
}));

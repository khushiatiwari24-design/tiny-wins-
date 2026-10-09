export const DEFAULT_CATEGORIES = [
  "Personal",
  "Study",
  "Development",
  "Health",
  "Work",
] as const;

export type Priority = "High" | "Medium" | "Low";
export type Category = (typeof DEFAULT_CATEGORIES)[number] | string;

export type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  category: Category;
  project: string;
  projectId?: string;
  ownerId?: string;
  dueDate: string;
  dueTime: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskInput = {
  title: string;
  description?: string;
  priority: Priority;
  category: Category;
  project?: string;
  dueDate: string;
  dueTime?: string;
};

export type CategoryOption = { id: string; name: string; color: string };
export type ProjectOption = { id: string; title: string };

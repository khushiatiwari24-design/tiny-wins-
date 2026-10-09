import { useCallback, useEffect, useRef, useState } from "react";
import type { CategoryOption, ProjectOption, Task, TaskInput } from "../types/task";
import { requireSupabase } from "../lib/supabase";

const mapTask = (row: Record<string, unknown>): Task => { const category = row.categories as { name?: string } | null; const project = row.projects as { title?: string } | null; return { id: String(row.id), title: String(row.title), description: String(row.description ?? ""), completed: Boolean(row.completed), priority: (String(row.priority).replace(/^./, (letter) => letter.toUpperCase()) as Task["priority"]), category: category?.name ?? "Uncategorized", project: project?.title ?? "", projectId: String(row.project_id ?? ""), ownerId: String(row.user_id ?? ""), dueDate: String(row.due_date ?? ""), dueTime: String(row.due_time ?? ""), createdAt: String(row.created_at), updatedAt: String(row.updated_at) }; };
const missingSchemaMessage = "The Supabase database is missing public.tasks. Run tiny-wins/supabase/schema.sql in the Supabase SQL Editor, then reload the app.";
export function useTasks(userId?: string, projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]); const [categories, setCategories] = useState<CategoryOption[]>([]); const [projects, setProjects] = useState<ProjectOption[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const pendingToggles = useRef(new Set<string>());
  const refresh = useCallback(async () => { if (!userId) return; setLoading(true); const db = requireSupabase(); const taskQuery = db.from("tasks").select("*, categories(name), projects(title)"); if (projectId) taskQuery.eq("project_id", projectId); else taskQuery.eq("user_id", userId); const [taskResult, categoryResult, projectResult] = await Promise.all([taskQuery.order("due_date").order("due_time", { nullsFirst: false }), db.from("categories").select("id,name,color").eq("user_id", userId).order("name"), db.from("projects").select("id,title").order("title")]); if (taskResult.error) { console.error("Unable to load tasks", taskResult.error); setError(taskResult.error.code === "PGRST205" ? missingSchemaMessage : `Unable to load tasks: ${taskResult.error.message}`); } else { setError(""); setTasks((taskResult.data ?? []).map((row) => mapTask(row as Record<string, unknown>))); } if (categoryResult.error) console.error("Unable to load categories", categoryResult.error); else setCategories(categoryResult.data ?? []); if (projectResult.error) console.error("Unable to load projects", projectResult.error); else setProjects(projectResult.data ?? []); setLoading(false); }, [projectId, userId]);
  useEffect(() => { void refresh(); }, [refresh]);
  const save = async (input: TaskInput, id?: string) => {
    if (!userId) throw new Error("You must be signed in to save a task.");
    const db = requireSupabase();
    const category = await db.from("categories").select("id").eq("name", input.category).eq("user_id", userId).maybeSingle();
    const payload = { title: input.title, description: input.description || null, priority: input.priority.toLowerCase(), due_date: input.dueDate || null, due_time: input.dueTime || null, category_id: category.data?.id ?? null, project_id: input.project || null };
    const result = id ? await db.from("tasks").update(payload).eq("id", id) : await db.from("tasks").insert({ ...payload, user_id: userId });
    if (result.error) throw new Error(result.error.code === "PGRST205" ? missingSchemaMessage : `Unable to save your task: ${result.error.message}`);
    await refresh();
  };
  const remove = async (id: string) => { const { error: err } = await requireSupabase().from("tasks").delete().eq("id", id); if (err) throw new Error(`Unable to delete your task: ${err.message}`); await refresh(); };
  const toggle = async (task: Task) => { if (pendingToggles.current.has(task.id)) return; pendingToggles.current.add(task.id); const nextCompleted = !task.completed; setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed: nextCompleted } : item)); const { error: err } = await requireSupabase().from("tasks").update({ completed: nextCompleted }).eq("id", task.id).eq("user_id", userId); pendingToggles.current.delete(task.id); if (err) { console.error("Unable to update task", err); setTasks((current) => current.map((item) => item.id === task.id ? task : item)); throw new Error(`Unable to update your task: ${err.message}`); } };
  return { tasks, categories, projects, loading, error, refresh, save, remove, toggle };
}


import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Clock3, X } from "lucide-react";
import type { CategoryOption, Priority, ProjectOption, Task, TaskInput } from "../../types/task";

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type AddTaskModalProps = {
  open: boolean;
  taskToEdit: Task | null;
  onClose: () => void;
  onSubmitTask: (task: TaskInput) => Promise<void>;
  categories: CategoryOption[];
  projects: ProjectOption[];
};

export default function AddTaskModal({
  open,
  taskToEdit,
  onClose,
  onSubmitTask,
  categories,
  projects,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Personal");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [dueDate, setDueDate] = useState(getTodayDate());
  const [dueTime, setDueTime] = useState("");
  const [project, setProject] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditMode = Boolean(taskToEdit);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description);
      setCategory(taskToEdit.category);
      setPriority(taskToEdit.priority);
      setDueDate(taskToEdit.dueDate);
      setDueTime(taskToEdit.dueTime);
      setProject(taskToEdit.projectId ?? "");
      return;
    }

    setTitle("");
    setDescription("");
    setCategory("Personal");
    setPriority("Medium");
    setDueDate(getTodayDate());
    setDueTime("");
    setProject("");
  }, [open, taskToEdit]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const canSubmit = title.trim().length > 0;

  const submitLabel = useMemo(() => {
    return isEditMode ? "Save changes" : "Add Task";
  }, [isEditMode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSaving(true); setError("");
    try { await onSubmitTask({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      dueDate,
      dueTime,
      project,
    }); onClose(); } catch (err: any) { console.error("Task submission failed:", err); setError(err?.message || err?.error_description || "Unable to save your task. Please try again."); } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.form
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#111114] p-5 sm:p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">
                  {isEditMode ? "Edit task" : "New task"}
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  Add a tiny win
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Turn one intention into something you can finish.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-500">
                  Task title
                </label>

                <input required
                  autoFocus
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 transition focus:border-white/[0.18]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-500">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional"
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 transition focus:border-white/[0.18]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-500">
                    Category
                  </label>

                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-zinc-300 outline-none"
                  >
                    {categories.map((option) => (
                      <option key={option.id} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-500">
                    Priority
                  </label>

                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as Priority)}
                    className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-zinc-300 outline-none"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <label className="block text-xs font-medium text-zinc-500">Project
                <select value={project} onChange={(event) => setProject(event.target.value)} className="field mt-2">
                  <option value="">No project</option>
                  {projects.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-500">
                    Date
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                    />

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-10 pr-3 text-sm text-zinc-300 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-500">
                    Time
                  </label>

                  <div className="relative">
                    <Clock3
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                    />

                    <input
                      type="time"
                      value={dueTime}
                      onChange={(event) => setDueTime(event.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-10 pr-3 text-sm text-zinc-300 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {error ? <p role="alert" className="mt-5 text-sm text-red-300">{error}</p> : null}
            <div className="mt-7 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!canSubmit || saving}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Saving…" : submitLabel}
              </button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

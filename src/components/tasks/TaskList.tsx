import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import AddTaskModal from "./AddTaskModal";
import DeleteTaskDialog from "./DeleteTaskDialog";
import TaskItem from "./TaskItem";
import type { CategoryOption, ProjectOption, Task, TaskInput } from "../../types/task";

type Props = { tasks: Task[]; categories: CategoryOption[]; projects: ProjectOption[]; onSave: (input: TaskInput, id?: string) => Promise<void>; onDelete: (id: string) => Promise<void>; onToggle: (task: Task) => Promise<void>; title?: string };
export default function TaskList({ tasks, categories, projects, onSave, onDelete, onToggle, title = "Today's tasks" }: Props) {

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [taskBeingEdited, setTaskBeingEdited] = useState<Task | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);

  const completedCount = useMemo(() => {
    return tasks.filter((task) => task.completed).length;
  }, [tasks]);

  const progress = useMemo(() => {
    return tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);
  }, [completedCount, tasks.length]);

  const closeTaskModal = () => {
    setAddModalOpen(false);
    setTaskBeingEdited(null);
  };

  const openEditModal = (task: Task) => {
    setTaskBeingEdited(task);
    setAddModalOpen(true);
  };

  const handleSubmitTask = (payload: TaskInput) => onSave(payload, taskBeingEdited?.id);

  return (
    <>
      <section className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">
              {title}
            </p>

            <h2 className="mt-2 text-lg font-semibold text-white">Make it count</h2>
          </div>

          <div className="text-right">
            <p className="text-2xl font-semibold text-white">{progress}%</p>

            <p className="text-xs text-zinc-600">
              {completedCount}/{tasks.length} completed
            </p>
          </div>
        </div>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {tasks.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-white/[0.08] p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04]">
              <Sparkles size={14} className="text-zinc-300" />
            </div>

            <p className="mt-4 text-sm text-zinc-400">No tasks yet</p>

            <p className="mt-1 text-xs text-zinc-600">Your tiny wins will appear here.</p>

            <button
              data-add-task
              onClick={() => setAddModalOpen(true)}
              className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              + Add your first task
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-2">
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={(id) => { const task = tasks.find((item) => item.id === id); if (task) void onToggle(task); }}
                  onEdit={openEditModal}
                  onDuplicate={(id) => { const task = tasks.find((item) => item.id === id); if (task) void onSave({ ...task, title: `${task.title} (copy)` }); }}
                  onDelete={setTaskPendingDelete}
                />
              ))}
            </div>

            <button
              onClick={() => setAddModalOpen(true)}
              className="mt-5 flex w-full items-center justify-center rounded-xl border border-dashed border-white/[0.08] py-3 text-sm text-zinc-600 transition hover:border-white/[0.15] hover:text-zinc-300"
            >
              + Add a task
            </button>
          </>
        )}
      </section>

      <AddTaskModal
        open={addModalOpen}
        taskToEdit={taskBeingEdited}
        onClose={closeTaskModal}
        onSubmitTask={handleSubmitTask}
        categories={categories}
        projects={projects}
      />

      <DeleteTaskDialog
        open={Boolean(taskPendingDelete)}
        task={taskPendingDelete}
        onClose={() => setTaskPendingDelete(null)}
        onConfirmDelete={(taskId) => { void onDelete(taskId).then(() => setTaskPendingDelete(null)); }}
      />
    </>
  );
}

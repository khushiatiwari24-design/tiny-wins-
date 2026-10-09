import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Task } from "../../types/task";

type DeleteTaskDialogProps = {
  open: boolean;
  task: Task | null;
  onClose: () => void
  onConfirmDelete: (taskId: string) => void;
};

export default function DeleteTaskDialog({
  open,
  task,
  onClose,
  onConfirmDelete,
}: DeleteTaskDialogProps) {
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

  return (
    <AnimatePresence>
      {open && task ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111114] p-6 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-white">Delete this task?</h3>
            <p className="mt-2 text-sm text-zinc-500">This action cannot be undone.</p>
            <p className="mt-3 text-sm text-zinc-400">“{task.title}”</p>

            <div className="mt-7 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-sm text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => onConfirmDelete(task.id)}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-400"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

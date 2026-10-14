import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Task } from "../../types/task";

type TaskItemProps = {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDuplicate: (id: string) => void;
  onDelete: (task: Task) => void;
};

const priorityStyles = {
  High: "bg-red-400/10 text-red-400",
  Medium: "bg-amber-400/10 text-amber-400",
  Low: "bg-blue-400/10 text-blue-400",
};

export default function TaskItem({
  task,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: TaskItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const displayTime = useMemo(() => {
    if (!task.dueTime) {
      return "";
    }

    const [hourValue, minuteValue] = task.dueTime.split(":");
    const hour = Number(hourValue);
    const minute = Number(minuteValue);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return task.dueTime;
    }

    const period = hour >= 12 ? "PM" : "AM";
    const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${normalizedHour}:${`${minute}`.padStart(2, "0")} ${period}`;
  }, [task.dueTime]);

  return (
    <div
      className={`group flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-4 transition hover:border-white/[0.09] hover:bg-white/[0.03] ${
        task.completed ? "opacity-60" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        aria-label={`Mark ${task.title} as ${
          task.completed ? "incomplete" : "complete"
        }`}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
          task.completed
            ? "border-white bg-white text-black"
            : "border-zinc-700 hover:border-zinc-400"
        }`}
      >
        {task.completed && <Check size={12} strokeWidth={3} />}
      </button>

      {/* Task information */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-medium transition ${
            task.completed
              ? "text-zinc-500 line-through"
              : "text-zinc-200"
          }`}
        >
          {task.title}
        </p>

        <div className="mt-1.5 flex items-center gap-3">
          <span className="text-xs text-zinc-600">
            {task.category}
          </span>

          {displayTime && (
            <span className="flex items-center gap-1 text-xs text-zinc-600">
              <Clock3 size={12} />
              {displayTime}
            </span>
          )}
        </div>

        {task.description ? (
          <p className="mt-1 truncate text-xs text-zinc-600">{task.description}</p>
        ) : null}
      </div>

      {/* Priority */}
      <span
        className={`rounded-md px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[10px] font-medium shrink-0 ${
          priorityStyles[task.priority]
        }`}
      >
        {task.priority}
      </span>

      {/* More */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 sm:text-zinc-600 opacity-100 sm:opacity-0 transition hover:bg-white/[0.08] hover:text-white sm:group-hover:opacity-100 active:scale-95"
          aria-label="Task options"
        >
          <MoreHorizontal size={17} />
        </button>

        {menuOpen ? (
          <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-white/[0.08] bg-[#17171b] p-1.5 shadow-xl">
            <MenuButton
              label="Edit"
              icon={<Pencil size={14} />}
              onClick={() => {
                setMenuOpen(false);
                onEdit(task);
              }}
            />
            <MenuButton
              label="Duplicate"
              icon={<Copy size={14} />}
              onClick={() => {
                setMenuOpen(false);
                onDuplicate(task.id);
              }}
            />
            <MenuButton
              label="Delete"
              icon={<Trash2 size={14} />}
              danger
              onClick={() => {
                setMenuOpen(false);
                onDelete(task);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MenuButton({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
        danger
          ? "text-red-300 hover:bg-red-500/15 hover:text-red-200"
          : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
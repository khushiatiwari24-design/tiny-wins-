import { useState } from "react";
import { Check, Shield, Sparkles, Volume2, X } from "lucide-react";
import { activateRecoveryShieldToday } from "../lib/streakUtils";

interface StrugglingModalProps {
  isOpen?: boolean;
  task?: {
    id: string;
    title?: string;
    description?: string;
    target_minutes?: number;
    minimum_minutes?: number;
  } | null;
  onClose: () => void;
  onSelectMinimum?: (taskId: string, reducedMinutes: number, reason: string) => void;
  onTakeRecoveryDay?: (taskId: string, reason: string) => void;
  onStartSprint?: (minutes: number, withAudio?: boolean) => void;
  onActionComplete?: () => void;
}

interface StruggleConfig {
  id: string;
  label: string;
  advice: string;
  actionPlan: string;
  checklist?: string[];
  primaryBtn: {
    label: string;
    minutes: number;
    withAudio?: boolean;
    type: "sprint" | "microstep";
  };
  secondaryBtn: {
    label: string;
    action: "recovery" | "minimum" | "swap" | "reschedule";
    minutes?: number;
  };
}

const STRUGGLE_CONFIGS: StruggleConfig[] = [
  {
    id: "energy",
    label: "😴 Low energy",
    advice: "Energy follows action, not the other way around. Do the lowest-effort version lying down or sitting comfortably, or take a guilt-free recovery day.",
    actionPlan: "Micro-Step: Just review notes or read 1 single page for 3 minutes without stressing about speed.",
    primaryBtn: {
      label: "⚡ Switch to Low-Energy Mode (3 mins)",
      minutes: 3,
      type: "sprint",
    },
    secondaryBtn: {
      label: "🛡️ Claim Recovery Day (Protect Streak)",
      action: "recovery",
    },
  },
  {
    id: "distracted",
    label: "📱 Distracted",
    advice: "Your brain is craving dopamine. Put your phone in another room for just 10 minutes and turn on Ambient Focus Sound to lock in.",
    actionPlan: "Sprint Checklist:",
    checklist: [
      "Close extra browser tabs & social apps",
      "Put phone face down or in another room",
      "Turn on Rain or Brown Noise in Focus Mode",
    ],
    primaryBtn: {
      label: "🎧 Start 10-Min Distraction-Free Sprint (With Focus Audio)",
      minutes: 10,
      withAudio: true,
      type: "sprint",
    },
    secondaryBtn: {
      label: "Do the Minimum (5 mins)",
      action: "minimum",
      minutes: 5,
    },
  },
  {
    id: "mood",
    label: "🙄 Don't feel like it",
    advice: "You don't need motivation to start; you just need a tiny commitment. Give yourself permission to stop after 2 minutes if you still hate it.",
    actionPlan: "The 2-Minute Rule: Just open the file, book, or editor and write 1 tiny line. 85% of the time, inertia takes over.",
    primaryBtn: {
      label: "🚀 Try the 2-Minute Rule (Quit anytime after 2m)",
      minutes: 2,
      type: "sprint",
    },
    secondaryBtn: {
      label: "Swap with an Easier Tiny Win",
      action: "swap",
    },
  },
  {
    id: "overwhelmed",
    label: "😵 Overwhelmed",
    advice: "It feels huge because you're looking at the whole mountain. Let's hide everything else and break this task into 3 tiny micro-steps.",
    actionPlan: "Interactive 3-Step Micro Ladder:",
    checklist: [
      "Step 1: Open the tools, files, or notebook",
      "Step 2: Do 5 minutes of the core action",
      "Step 3: Wrap up and log your tiny win",
    ],
    primaryBtn: {
      label: "🧩 Break Into 3 Micro-Steps & Do Step 1 Only",
      minutes: 5,
      type: "microstep",
    },
    secondaryBtn: {
      label: "🛡️ Claim Recovery Day (Protect Streak)",
      action: "recovery",
    },
  },
  {
    id: "time",
    label: "⏰ Not enough time",
    advice: "A 5-minute Blitz is 100% better than a zero-day. Keep your streak alive with a rapid speed-run version of this task.",
    actionPlan: "Speed-Run Mode: Strip away perfectionism. Compress the task to its core 20% high-impact action.",
    primaryBtn: {
      label: "⏱️ Start 5-Min Speed Blitz (Counts as Full Win!)",
      minutes: 5,
      type: "sprint",
    },
    secondaryBtn: {
      label: "Reschedule Heavy Part to Tomorrow & Log Micro-Win",
      action: "reschedule",
      minutes: 3,
    },
  },
  {
    id: "clarity",
    label: "🤷 Don't know where to start",
    advice: "Clarity comes from messy action. Don't aim for good—aim for a 'bad first draft' or simply setting up your workspace.",
    actionPlan: "Guided First Step: Open your workspace or notebook and write 3 raw bullet points on what needs to happen.",
    primaryBtn: {
      label: "🧭 Start with a 5-Min Brain Dump / Setup",
      minutes: 5,
      type: "sprint",
    },
    secondaryBtn: {
      label: "Do the Minimum (10 mins)",
      action: "minimum",
      minutes: 10,
    },
  },
];

export default function StrugglingModal({
  isOpen = true,
  task,
  onClose,
  onSelectMinimum,
  onTakeRecoveryDay,
  onStartSprint,
  onActionComplete,
}: StrugglingModalProps) {
  if (isOpen === false) return null;
  const effectiveTask = task || { id: "active-win", title: "Current Tiny Win" };

  const [selectedReason, setSelectedReason] = useState<string>("energy");
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [shieldNotice, setShieldNotice] = useState<string | null>(null);

  const selectedData = STRUGGLE_CONFIGS.find((o) => o.id === selectedReason) || STRUGGLE_CONFIGS[0];

  const toggleCheck = (idx: number) => {
    const key = `${selectedReason}-${idx}`;
    setCheckedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrimaryClick = () => {
    const mins = selectedData.primaryBtn.minutes;
    if (onStartSprint) {
      onStartSprint(mins, selectedData.primaryBtn.withAudio);
    }
    if (onSelectMinimum) {
      onSelectMinimum(effectiveTask.id, mins, selectedData.id);
    }
    onActionComplete?.();
    onClose();
  };

  const handleSecondaryClick = () => {
    if (selectedData.secondaryBtn.action === "recovery") {
      const res = activateRecoveryShieldToday();
      setShieldNotice(res.message);
      if (onTakeRecoveryDay) {
        onTakeRecoveryDay(effectiveTask.id, selectedData.id);
      }
      onActionComplete?.();
      window.setTimeout(() => {
        onClose();
      }, 1600);
    } else if (selectedData.secondaryBtn.action === "minimum" || selectedData.secondaryBtn.action === "reschedule") {
      const mins = selectedData.secondaryBtn.minutes || 5;
      if (onSelectMinimum) {
        onSelectMinimum(effectiveTask.id, mins, `${selectedData.id}-${selectedData.secondaryBtn.action}`);
      }
      onActionComplete?.();
      onClose();
    } else {
      // swap
      if (onSelectMinimum) {
        onSelectMinimum(effectiveTask.id, 2, `${selectedData.id}-swap`);
      }
      onActionComplete?.();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 z-50 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0e1326] border border-white/10 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-violet-400 uppercase bg-violet-400/10 px-2.5 py-0.5 rounded-full border border-violet-400/20">
              <Sparkles size={12} /> Friction Check
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-2">
              What's making this hard right now?
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Task: <span className="text-slate-200 font-medium">"{effectiveTask.title || effectiveTask.description || "Current Tiny Win"}"</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/5 transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* 6 Struggle Reason Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STRUGGLE_CONFIGS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedReason(opt.id)}
              className={`p-2.5 sm:p-3 text-left rounded-xl text-xs font-medium border transition-all duration-200 ${
                selectedReason === opt.id
                  ? "bg-violet-600/25 border-violet-400/60 text-white shadow-lg shadow-violet-900/30 scale-[1.02]"
                  : "bg-white/[.03] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Tailored Solution Card */}
        {selectedData && (
          <div className="p-4 sm:p-5 bg-gradient-to-br from-white/[.04] to-white/[.01] border border-white/10 rounded-2xl space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                Empathetic Diagnosis
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                "{selectedData.advice}"
              </p>
            </div>

            {/* Action Plan / Interactive Checklist */}
            <div className="rounded-xl bg-[#080d21] border border-white/[.07] p-3.5 space-y-2">
              <p className="text-[11px] font-semibold text-slate-300">
                {selectedData.actionPlan}
              </p>

              {selectedData.checklist && (
                <div className="space-y-1.5 pt-1">
                  {selectedData.checklist.map((step, idx) => {
                    const isDone = Boolean(checkedSteps[`${selectedReason}-${idx}`]);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleCheck(idx)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left text-xs transition ${
                          isDone
                            ? "bg-emerald-500/10 text-emerald-300 line-through opacity-80"
                            : "bg-white/[.03] text-slate-300 hover:bg-white/[.06]"
                        }`}
                      >
                        <span
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                            isDone ? "border-emerald-400 bg-emerald-500 text-black" : "border-slate-600 text-transparent"
                          }`}
                        >
                          <Check size={11} strokeWidth={3} />
                        </span>
                        <span className="flex-1">{step}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Shield Notification if activated */}
            {shieldNotice && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
                <Shield size={16} className="text-emerald-400 shrink-0" />
                <span>{shieldNotice}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handlePrimaryClick}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-500 to-cyan-400 hover:from-violet-400 hover:to-cyan-300 text-slate-950 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-cyan-950/30 transition active:scale-98 flex items-center justify-center gap-2"
              >
                {selectedData.primaryBtn.withAudio && <Volume2 size={16} />}
                <span>{selectedData.primaryBtn.label}</span>
              </button>

              <button
                type="button"
                onClick={handleSecondaryClick}
                className="w-full py-2.5 px-4 bg-white/[.05] hover:bg-white/[.09] text-slate-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition active:scale-98"
              >
                {selectedData.secondaryBtn.label}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-1 text-xs text-slate-500">
          <span>Remember: Showing up for 2 minutes keeps the habit alive.</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
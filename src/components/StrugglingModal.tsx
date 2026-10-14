import { useState } from "react";

interface StrugglingModalProps {
  task: {
    id: string;
    description: string;
    target_minutes?: number;
    minimum_minutes?: number;
  };
  onClose: () => void;
  onSelectMinimum: (taskId: string, reducedMinutes: number, reason: string) => void;
  onTakeRecoveryDay: (taskId: string, reason: string) => void;
}

const STRUGGLE_OPTIONS = [
  { id: "energy", label: "😴 Low energy", advice: "Cut the scope down to just 5 minutes. Showing up counts." },
  { id: "distracted", label: "📱 Distracted", advice: "Put phone face down. Set a timer for just 10 minutes of single-tasking." },
  { id: "mood", label: "😐 Don't feel like it", advice: "You don't need motivation to start. Just open the tool or lace your shoes." },
  { id: "overwhelmed", label: "😵 Overwhelmed", advice: "Ignore the end result. Focus exclusively on step 1." },
  { id: "time", label: "⏰ Not enough time", advice: "A 5-minute version keeps the neurological loop alive." },
  { id: "clarity", label: "🤷 Don't know where to start", advice: "Write down 3 tiny steps on paper, then complete only the first." },
];

export default function StrugglingModal({ task, onClose, onSelectMinimum, onTakeRecoveryDay }: StrugglingModalProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const selectedData = STRUGGLE_OPTIONS.find((o) => o.id === selectedReason);
  const minTime = task.minimum_minutes || Math.max(5, Math.floor((task.target_minutes || 30) * 0.2));

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div>
          <span className="text-xs font-semibold tracking-wider text-purple-400 uppercase">Friction Check</span>
          <h3 className="text-lg font-bold text-white mt-1">What's making this hard right now?</h3>
          <p className="text-xs text-zinc-400 mt-1">Consistency is about showing up when conditions aren't ideal.</p>
        </div>

        {/* Reason options */}
        <div className="grid grid-cols-2 gap-2">
          {STRUGGLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedReason(opt.id)}
              className={`p-3 text-left rounded-xl text-xs font-medium border transition ${
                selectedReason === opt.id
                  ? "bg-purple-950/40 border-purple-500 text-purple-200"
                  : "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Practical adaptation */}
        {selectedData && (
          <div className="p-4 bg-zinc-800/40 border border-zinc-700/50 rounded-xl space-y-3">
            <p className="text-xs text-zinc-300 leading-relaxed italic">
              💡 "{selectedData.advice}"
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => onSelectMinimum(task.id, minTime, selectedData.id)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
              >
                Do the Minimum ({minTime} mins)
              </button>
              <button
                onClick={() => onTakeRecoveryDay(task.id, selectedData.id)}
                className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-medium transition"
              >
                Claim a Recovery Day (Protect streak)
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";

const icons = ["🔥", "🌱", "⚡", "🎯", "📚", "🧘", "💪", "✨"];

type CreateGroupModalProps = {
  open: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: { name: string; description: string; icon: string; dailyGoal: number; requiredMembers: number }) => Promise<void>;
};

export default function CreateGroupModal({ open, saving, error, onClose, onSubmit }: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(icons[0]);
  const [dailyGoal, setDailyGoal] = useState(1);
  const [requiredMembers, setRequiredMembers] = useState(2);

  useEffect(() => {
    if (!open) return;
    setName(""); setDescription(""); setIcon(icons[0]); setDailyGoal(1); setRequiredMembers(2);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || saving) return;
    await onSubmit({ name: name.trim(), description: description.trim(), icon, dailyGoal, requiredMembers });
  };

  return <AnimatePresence>{open && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.form initial={{ opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: .98 }} onSubmit={submit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/[.08] bg-[#111114] p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><p className="text-xs font-medium uppercase tracking-[.14em] text-zinc-600">New streak group</p><h2 className="mt-2 text-xl font-semibold text-white">Build momentum together</h2><p className="mt-1 text-sm text-zinc-500">Set a shared rhythm your group can keep.</p></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-white/[.05] hover:text-white" aria-label="Close"><X size={18} /></button></div>
      <div className="mt-6 space-y-5"><label className="block text-xs font-medium text-zinc-500">Group name<input autoFocus required maxLength={80} className="field mt-2" placeholder="Morning momentum" value={name} onChange={event => setName(event.target.value)} /></label><label className="block text-xs font-medium text-zinc-500">Description<textarea rows={3} maxLength={240} className="field mt-2 resize-none" placeholder="What will this group practice together?" value={description} onChange={event => setDescription(event.target.value)} /></label><div><p className="text-xs font-medium text-zinc-500">Choose an icon</p><div className="mt-2 flex flex-wrap gap-2">{icons.map(option => <button key={option} type="button" onClick={() => setIcon(option)} className={`grid h-10 w-10 place-items-center rounded-xl border text-lg transition ${icon === option ? "border-violet-300 bg-violet-300/15" : "border-white/[.08] bg-white/[.03] hover:bg-white/[.08]"}`} aria-label={`Use ${option}`}>{option}</button>)}</div></div><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-medium text-zinc-500">Daily goal<input required min={1} max={100} type="number" className="field mt-2" value={dailyGoal} onChange={event => setDailyGoal(Math.max(1, Number(event.target.value)))} /><span className="mt-1 block text-[11px] text-zinc-600">Wins required each day</span></label><label className="block text-xs font-medium text-zinc-500">Required members<input required min={1} max={100} type="number" className="field mt-2" value={requiredMembers} onChange={event => setRequiredMembers(Math.max(1, Number(event.target.value)))} /><span className="mt-1 block text-[11px] text-zinc-600">Members needed to count</span></label></div></div>
      {error && <p role="alert" className="mt-5 text-sm text-red-300">{error}</p>}<div className="mt-7 flex justify-end gap-2"><button type="button" onClick={onClose} className="button">Cancel</button><button type="submit" disabled={!name.trim() || saving} className="button inline-flex items-center gap-2 bg-violet-400 text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Creating..." : <><Check size={16} /> Create group</>}</button></div>
    </motion.form>
  </motion.div>}</AnimatePresence>;
}

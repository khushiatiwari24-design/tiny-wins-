import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { UserCheck, ShieldCheck, CheckCircle2, AlertCircle, Sparkles, LogOut, Save } from "lucide-react";

export default function SettingsPage() {
  const { profile, session, updateProfile, signOut } = useAuth();

  // Helper to extract the most accurate existing name so input is never blank
  const getInitialName = () => {
    if (profile?.full_name && profile.full_name !== "User" && profile.full_name !== "Tiny Wins user") {
      return profile.full_name;
    }
    const metaName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
    if (metaName) return metaName;
    try {
      const saved = localStorage.getItem("tiny_wins_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) return parsed.name;
      }
    } catch {}
    if (session?.user?.email) {
      return session.user.email.split("@")[0];
    }
    return "Khushi Tiwari";
  };

  const getInitialRole = (): "student" | "teacher" => {
    const rawRole = profile?.role || session?.user?.user_metadata?.role;
    if (rawRole?.toString().toLowerCase() === "teacher") return "teacher";
    try {
      const saved = localStorage.getItem("tiny_wins_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role?.toString().toLowerCase() === "teacher") return "teacher";
      }
    } catch {}
    return "student";
  };

  const [name, setName] = useState(getInitialName);
  const [role, setRole] = useState<"student" | "teacher">(getInitialRole);
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync if profile or session resolves asynchronously
  useEffect(() => {
    if (profile?.full_name && profile.full_name !== "User" && !name) {
      setName(profile.full_name);
    }
    if (profile?.role) {
      setRole(profile.role.toLowerCase() === "teacher" ? "teacher" : "student");
    }
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ text: "Please enter your full name.", isError: true });
      return;
    }

    setSaving(true);
    setMessage(null);

    const roleCapitalized = role === "teacher" ? "Teacher" : "Student";

    try {
      await updateProfile({
        full_name: name.trim(),
        role,
      });

      setSaving(false);
      setMessage({
        text: `✅ Profile & Role updated to ${roleCapitalized}!`,
        isError: false,
      });

      // Clear success banner after 4 seconds
      window.setTimeout(() => {
        setMessage((prev) => (prev?.isError ? prev : null));
      }, 4000);
    } catch (err: any) {
      setSaving(false);
      setMessage({
        text: err?.message || "Failed to update profile. Please try again.",
        isError: true,
      });
    }
  };

  return (
    <section className="p-3.5 sm:p-5 lg:p-8 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <span>Settings</span>
          <span className="rounded-full bg-violet-500/15 border border-violet-500/30 px-2.5 py-0.5 text-xs font-medium text-violet-300">
            Account & Role
          </span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Manage your personal profile, teacher/student role, and workspace preferences.
        </p>
      </div>

      <form
        onSubmit={save}
        className="mt-6 rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-7 shadow-xl shadow-black/40 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2 pb-4 border-b border-white/5">
          <Sparkles className="text-violet-400" size={18} />
          <h2 className="font-semibold text-white text-base">Your Profile</h2>
        </div>

        {/* Full Name Field (Pre-filled and editable) */}
        <div className="mt-5">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Full name
          </label>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 transition"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Morgan"
          />
        </div>

        {/* Email Field (Read-only) */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Email address
          </label>
          <input
            className="w-full rounded-xl border border-white/5 bg-white/[.02] px-3.5 py-2.5 text-sm text-slate-400 opacity-60 cursor-not-allowed"
            value={profile?.email || session?.user?.email || "user@tinywins.app"}
            disabled
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Email is managed by Supabase authentication and cannot be changed here.
          </p>
        </div>

        {/* Interactive Role Switcher */}
        <div className="mt-6 pt-5 border-t border-white/5">
          <label className="block text-xs font-medium text-slate-300 mb-2.5">
            Account Role
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 border text-sm font-medium transition ${
                role === "student"
                  ? "border-violet-500/80 bg-violet-600/25 text-violet-200 shadow-md shadow-violet-600/20 ring-1 ring-violet-500/50"
                  : "border-white/10 bg-white/[.02] text-slate-400 hover:text-slate-200 hover:bg-white/[.05]"
              }`}
            >
              <UserCheck size={16} />
              <span>🎓 Student</span>
            </button>

            <button
              type="button"
              onClick={() => setRole("teacher")}
              className={`flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 border text-sm font-medium transition ${
                role === "teacher"
                  ? "border-indigo-500/80 bg-indigo-600/25 text-indigo-200 shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500/50"
                  : "border-white/10 bg-white/[.02] text-slate-400 hover:text-slate-200 hover:bg-white/[.05]"
              }`}
            >
              <ShieldCheck size={16} />
              <span>👩‍🏫 Teacher</span>
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-white/5 bg-white/[.02] p-3 text-xs text-slate-400">
            {role === "teacher" ? (
              <p className="text-indigo-200/90 leading-relaxed">
                <strong className="text-indigo-300">👩‍🏫 Teacher Mode:</strong> Unlocks creating new classrooms, sharing join codes with students, uploading protected study notes/materials, and managing classroom members.
              </p>
            ) : (
              <p className="text-violet-200/90 leading-relaxed">
                <strong className="text-violet-300">🎓 Student Mode:</strong> Allows joining classes using teacher join codes, viewing protected class study notes, and tracking daily wins and focus streaks.
              </p>
            )}
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`mt-5 rounded-xl border p-3.5 text-xs sm:text-sm flex items-center gap-2.5 transition animate-fadeIn ${
              message.isError
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {message.isError ? (
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 flex items-center gap-2 active:scale-98"
          >
            <Save size={15} />
            <span>{saving ? "Saving changes..." : "Save profile"}</span>
          </button>
        </div>
      </form>

      {/* Logout button */}
      <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Log out of Tiny Wins</h3>
          <p className="text-xs text-slate-500">Sign out of your active session on this device.</p>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
        >
          <LogOut size={14} />
          <span>Log out</span>
        </button>
      </div>
    </section>
  );
}

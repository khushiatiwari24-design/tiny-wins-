import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { requireSupabase } from "../lib/supabase";

export default function SettingsPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.full_name || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage("");
    const { error } = await requireSupabase()
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", profile.id);
    setSaving(false);
    setMessage(error ? "Unable to update your profile." : "Profile saved.");
    if (!error) void refreshProfile();
  };

  return (
    <section className="p-3.5 sm:p-5 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-semibold text-white">Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">Manage your profile and account settings.</p>

      <form onSubmit={save} className="mt-6 max-w-xl rounded-2xl border border-white/[.07] bg-white/[.025] p-4 sm:p-6">
        <h2 className="font-medium text-white">Profile</h2>

        <label className="mt-4 block text-sm text-zinc-400">
          Full name
          <input
            className="field mt-2"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="mt-4 block text-sm text-zinc-400">
          Email
          <input
            className="field mt-2 opacity-60 cursor-not-allowed"
            value={profile?.email || ""}
            disabled
          />
        </label>

        <p className="mt-4 text-xs sm:text-sm capitalize text-zinc-500">
          Role: <span className="text-zinc-300 font-medium">{profile?.role || "Student"}</span>
        </p>

        {message && (
          <p className="mt-4 rounded-xl border border-violet-300/20 bg-violet-300/10 px-4 py-2.5 text-xs sm:text-sm text-violet-200">
            {message}
          </p>
        )}

        <button disabled={saving} className="button mt-5 bg-violet-400 text-zinc-950 font-medium disabled:opacity-50">
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      <button
        onClick={() => void signOut()}
        className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs sm:text-sm font-medium text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
      >
        Log out
      </button>
    </section>
  );
}

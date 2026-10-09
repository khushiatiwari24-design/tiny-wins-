import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { requireSupabase, supabase } from "../lib/supabase";

export type Profile = { id: string; full_name: string; email: string; role: "teacher" | "student" };
type AuthValue = { session: Session | null; profile: Profile | null; loading: boolean; refreshProfile: () => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshProfile = async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("id, full_name, email, role").eq("id", user.id).single();
    setProfile(data as Profile | null);
  };
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => subscription.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (session) void refreshProfile(); else setProfile(null); }, [session]);
  const signOut = async () => { await requireSupabase().auth.signOut(); };
  return <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth must be inside AuthProvider"); return value; }

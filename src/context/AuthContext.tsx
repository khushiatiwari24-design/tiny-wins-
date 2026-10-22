import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { requireSupabase, supabase } from "../lib/supabase";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: "teacher" | "student";
};

export type LocalUserData = {
  id?: string;
  name?: string;
  full_name?: string;
  email: string;
  role?: "teacher" | "student" | "Teacher" | "Student" | string;
};

type AuthValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  setLocalUser: (userData: LocalUserData) => void;
  updateProfile: (updated: {
    full_name: string;
    role: "teacher" | "student" | "Teacher" | "Student";
  }) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function createSyntheticSession(user: LocalUserData): Session {
  const name = user.name || user.full_name || user.email.split("@")[0] || "User";
  const normalizedRole = user.role?.toString().toLowerCase() === "teacher" ? "teacher" : "student";
  const userId = user.id || crypto.randomUUID();

  const syntheticUser: User = {
    id: userId,
    app_metadata: {},
    user_metadata: {
      full_name: name,
      name: name,
      role: normalizedRole === "teacher" ? "Teacher" : "Student",
    },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: user.email,
    phone: "",
    role: "authenticated",
    updated_at: new Date().toISOString(),
  };

  return {
    access_token: "local-synthetic-token",
    refresh_token: "local-synthetic-refresh",
    expires_in: 3600 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
    token_type: "bearer",
    user: syntheticUser,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const setLocalUser = useCallback((userData: LocalUserData) => {
    const normalizedId = userData.id || crypto.randomUUID();
    const normalizedRole = userData.role?.toString().toLowerCase() === "teacher" ? "teacher" : "student";
    const name = userData.name || userData.full_name || userData.email.split("@")[0] || "User";
    const storedUser = {
      id: normalizedId,
      name,
      email: userData.email,
      role: normalizedRole === "teacher" ? "Teacher" : "Student",
    };
    try {
      localStorage.setItem("tiny_wins_user", JSON.stringify(storedUser));
      const prof: Profile = {
        id: normalizedId,
        full_name: name,
        email: userData.email,
        role: normalizedRole,
      };
      localStorage.setItem("tiny_wins_profile", JSON.stringify(prof));
      setProfile(prof);
    } catch (e) {
      console.warn("Could not save local user to localStorage:", e);
    }
    const synthetic = createSyntheticSession(storedUser);
    setSession(synthetic);
  }, []);

  const updateProfile = useCallback(
    async (updated: {
      full_name: string;
      role: "teacher" | "student" | "Teacher" | "Student";
    }) => {
      const normRole = updated.role.toLowerCase() === "teacher" ? "teacher" : "student";
      const capitalizedRole = normRole === "teacher" ? "Teacher" : "Student";
      const name = updated.full_name.trim();

      // 1. Immediately update React state for profile
      setProfile((prev) => {
        const id = prev?.id || session?.user?.id || "local-user";
        const email = prev?.email || session?.user?.email || "";
        return {
          id,
          email,
          full_name: name,
          role: normRole,
        };
      });

      // 2. Immediately update React state for session
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          user: {
            ...prev.user,
            user_metadata: {
              ...prev.user.user_metadata,
              full_name: name,
              name,
              role: capitalizedRole,
            },
          },
        };
      });

      // 3. Immediately sync localStorage
      try {
        const currentLocal = localStorage.getItem("tiny_wins_user");
        const parsed = currentLocal ? JSON.parse(currentLocal) : {};
        const updatedLocal = {
          ...parsed,
          id: parsed.id || session?.user?.id || crypto.randomUUID(),
          name,
          email: parsed.email || session?.user?.email || "",
          role: capitalizedRole,
        };
        localStorage.setItem("tiny_wins_user", JSON.stringify(updatedLocal));

        localStorage.setItem(
          "tiny_wins_profile",
          JSON.stringify({
            id: updatedLocal.id,
            full_name: name,
            email: updatedLocal.email,
            role: normRole,
          })
        );
      } catch (e) {
        console.warn("Could not sync local user storage:", e);
      }

      // 4. Update Supabase Auth metadata and profiles table asynchronously
      if (supabase) {
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: name,
              role: capitalizedRole,
            },
          });
        } catch (e) {
          console.warn("Supabase auth updateUser notice:", e);
        }

        const userId = session?.user?.id;
        if (userId) {
          try {
            await supabase.from("profiles").upsert({
              id: userId,
              full_name: name,
              email: session?.user?.email,
              role: normRole,
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("Supabase profiles upsert notice:", e);
          }
        }
      }
    },
    [session]
  );

  const refreshProfile = useCallback(async () => {
    // 1. Try Supabase getUser() if configured and not a local synthetic session
    if (supabase && session?.user && !session.access_token.startsWith("local-synthetic")) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Safe query with maybeSingle() instead of .single() to prevent crash if row is missing
          const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email, role")
            .eq("id", user.id)
            .maybeSingle();

          if (data && !error) {
            const prof: Profile = {
              id: data.id,
              full_name: data.full_name || user.user_metadata?.full_name || "User",
              email: data.email || user.email || "",
              role: data.role?.toLowerCase() === "teacher" ? "teacher" : "student",
            };
            setProfile(prof);
            localStorage.setItem("tiny_wins_profile", JSON.stringify(prof));
            return;
          }

          // Fallback to user_metadata
          const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
          const metaRole = user.user_metadata?.role;
          const prof: Profile = {
            id: user.id,
            full_name: metaName || user.email?.split("@")[0] || "User",
            email: user.email || "",
            role: metaRole?.toLowerCase() === "teacher" ? "teacher" : "student",
          };
          setProfile(prof);
          localStorage.setItem("tiny_wins_profile", JSON.stringify(prof));

          // Safe non-blocking try/catch upsert into profiles
          try {
            await supabase.from("profiles").upsert({
              id: user.id,
              full_name: prof.full_name,
              email: prof.email,
              role: prof.role,
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("Non-blocking profile upsert notice:", e);
          }
          return;
        }
      } catch (err) {
        console.warn("Could not fetch remote profile:", err);
      }
    }

    // 2. Fallback to localStorage
    try {
      const savedProfile = localStorage.getItem("tiny_wins_profile") || localStorage.getItem("tiny_wins_user");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile({
          id: parsed.id || session?.user?.id || "local-user",
          full_name: parsed.full_name || parsed.name || "User",
          email: parsed.email || session?.user?.email || "",
          role: parsed.role?.toLowerCase() === "teacher" ? "teacher" : "student",
        });
        return;
      }
    } catch {
      // Ignore
    }

    // 3. Fallback from current session user object
    if (session?.user) {
      setProfile({
        id: session.user.id,
        full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
        email: session.user.email || "",
        role: session.user.user_metadata?.role?.toLowerCase() === "teacher" ? "teacher" : "student",
      });
    } else {
      setProfile(null);
    }
  }, [session]);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    const loadLocalSession = () => {
      try {
        const saved = localStorage.getItem("tiny_wins_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.email) {
            const synthetic = createSyntheticSession(parsed);
            if (isMounted) {
              setSession(synthetic);
              setProfile({
                id: parsed.id || synthetic.user.id,
                full_name: parsed.name || parsed.full_name || "User",
                email: parsed.email,
                role: parsed.role?.toLowerCase() === "teacher" ? "teacher" : "student",
              });
            }
            return true;
          }
        }
      } catch {
        // Ignore
      }
      return false;
    };

    if (!supabase) {
      loadLocalSession();
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        if (data.session) {
          setSession(data.session);
        } else {
          loadLocalSession();
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        loadLocalSession();
        setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!isMounted) return;
      if (next) {
        setSession(next);
      } else {
        const found = loadLocalSession();
        if (!found) {
          setSession(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Update profile when session changes
  useEffect(() => {
    if (session) {
      void refreshProfile();
    } else {
      setProfile(null);
    }
  }, [session, refreshProfile]);

  const signOut = async () => {
    try {
      localStorage.removeItem("tiny_wins_user");
      localStorage.removeItem("tiny_wins_profile");
    } catch {}
    setSession(null);
    setProfile(null);
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Sign out warning:", err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        refreshProfile,
        signOut,
        setLocalUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AuthProvider");
  return value;
}

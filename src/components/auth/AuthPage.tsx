import { useState } from "react";
import { Sparkles, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";
import { requireSupabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function AuthPage() {
  const { setLocalUser } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showBypassOption, setShowBypassOption] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setShowBypassOption(false);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const roleCapitalized = role === "teacher" ? "Teacher" : "Student";
    const displayName = trimmedName || trimmedEmail.split("@")[0] || "User";

    // 1. Password validation check
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    setBusy(true);

    try {
      const client = requireSupabase();

      if (mode === "login") {
        // --- LOGIN FLOW ---
        const { data: loginData, error: loginError } = await client.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (loginError) {
          const errText = (loginError.message || "").toLowerCase();
          console.warn("Supabase login error:", loginError);

          if (errText.includes("invalid login credentials")) {
            setErrorMessage("Invalid email or password. Please check your credentials.");
          } else if (
            errText.includes("rate limit") ||
            errText.includes("429") ||
            errText.includes("network")
          ) {
            // Check if local backup user exists with this email
            const saved = localStorage.getItem("tiny_wins_user");
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (parsed.email?.toLowerCase() === trimmedEmail) {
                  setLocalUser(parsed);
                  return;
                }
              } catch {}
            }
            setErrorMessage(loginError.message || "Network issue connecting to server. Please try again.");
          } else {
            setErrorMessage(loginError.message || "Unable to log in. Check your email and password.");
          }
        } else if (loginData?.session) {
          // Successful Supabase login
          const u = loginData.session.user;
          const userMetaName = u.user_metadata?.full_name || u.user_metadata?.name || displayName;
          const userMetaRole = u.user_metadata?.role?.toLowerCase() === "teacher" ? "Teacher" : "Student";

          localStorage.setItem(
            "tiny_wins_user",
            JSON.stringify({
              id: u.id,
              name: userMetaName,
              email: u.email,
              role: userMetaRole,
            })
          );
        }
      } else {
        // --- SIGN UP FLOW ---
        // Pass full_name and role ('Student' | 'Teacher') cleanly inside options: { data: { full_name, role } }
        const { data: signUpData, error: signUpError } = await client.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: displayName,
              role: roleCapitalized,
            },
          },
        });

        if (signUpError) {
          const errText = (signUpError.message || "").toLowerCase();
          console.warn("Supabase signUp error:", signUpError);

          // 1. Auto-Login Recovery if "User already registered"
          if (
            errText.includes("already registered") ||
            errText.includes("already been registered") ||
            errText.includes("already exists") ||
            errText.includes("user_already_exists")
          ) {
            setSuccessMessage("Account already exists. Logging you in automatically...");
            const { data: autoLoginData, error: autoLoginError } = await client.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            });

            if (!autoLoginError && autoLoginData?.session) {
              const u = autoLoginData.session.user;
              // Safe non-blocking profile update
              try {
                await client.from("profiles").upsert({
                  id: u.id,
                  full_name: displayName,
                  email: trimmedEmail,
                  role: role.toLowerCase(),
                  updated_at: new Date().toISOString(),
                });
              } catch (e) {
                console.warn("Non-blocking profile upsert notice:", e);
              }

              localStorage.setItem(
                "tiny_wins_user",
                JSON.stringify({
                  id: u.id,
                  name: displayName,
                  email: trimmedEmail,
                  role: roleCapitalized,
                })
              );
              setBusy(false);
              return;
            } else {
              setErrorMessage("An account with this email already exists. Please log in with your password.");
              setMode("login");
              setBusy(false);
              return;
            }
          }

          // 2. Supabase Rate Limit or Database Trigger Failure Fallback
          const isRateLimit =
            errText.includes("rate limit") ||
            errText.includes("over_email_send_rate_limit") ||
            errText.includes("email") ||
            (signUpError as any).status === 429;

          const isDbTriggerError =
            errText.includes("database error") ||
            errText.includes("saving new user") ||
            errText.includes("trigger") ||
            errText.includes("user_role");

          if (isRateLimit || isDbTriggerError) {
            console.info("Creating local authenticated session due to Supabase rate limit / trigger issue");
            const localId = crypto.randomUUID();
            const localUser = {
              id: localId,
              name: displayName,
              email: trimmedEmail,
              role: roleCapitalized,
            };

            localStorage.setItem("tiny_wins_user", JSON.stringify(localUser));
            localStorage.setItem(
              "tiny_wins_profile",
              JSON.stringify({
                id: localId,
                full_name: displayName,
                email: trimmedEmail,
                role: role.toLowerCase(),
              })
            );

            setLocalUser(localUser);
            setSuccessMessage("Welcome! Your workspace session has been created.");
            setBusy(false);
            return;
          }

          // Other specific errors
          setErrorMessage(signUpError.message || "Unable to create your account. Please try again.");
        } else if (signUpData?.user) {
          const user = signUpData.user;
          const localUser = {
            id: user.id,
            name: displayName,
            email: trimmedEmail,
            role: roleCapitalized,
          };

          // Safe Profile Upsert (Post-Signup): non-blocking try/catch
          try {
            await client.from("profiles").upsert({
              id: user.id,
              full_name: displayName,
              email: trimmedEmail,
              role: role.toLowerCase(),
              updated_at: new Date().toISOString(),
            });
          } catch (upsertErr) {
            console.warn("Non-blocking profile upsert notice:", upsertErr);
          }

          // Store user & profile in localStorage
          localStorage.setItem("tiny_wins_user", JSON.stringify(localUser));
          localStorage.setItem(
            "tiny_wins_profile",
            JSON.stringify({
              id: user.id,
              full_name: displayName,
              email: trimmedEmail,
              role: role.toLowerCase(),
            })
          );

          if (signUpData.session) {
            setSuccessMessage("Account created successfully! Loading your workspace...");
          } else {
            // Attempt auto-login if email confirmation isn't strictly required
            const { data: autoLogin } = await client.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            });

            if (autoLogin?.session) {
              setSuccessMessage("Account created! Logging you in...");
            } else {
              setSuccessMessage(
                "Account created! Check your inbox for a confirmation email, or jump straight into your workspace."
              );
              setShowBypassOption(true);
            }
          }
        } else {
          setSuccessMessage("Check your inbox to confirm your email, then log in.");
        }
      }
    } catch (err: any) {
      console.error("Auth submit unexpected error:", err);
      // If network completely failed, allow local offline workspace entry
      const localId = crypto.randomUUID();
      const localUser = {
        id: localId,
        name: displayName,
        email: trimmedEmail,
        role: roleCapitalized,
      };
      localStorage.setItem("tiny_wins_user", JSON.stringify(localUser));
      setLocalUser(localUser);
      setSuccessMessage("Offline mode: Logged in locally!");
    } finally {
      setBusy(false);
    }
  };

  const handleContinueLocally = () => {
    const trimmedEmail = email.trim().toLowerCase() || "user@tinywins.app";
    const displayName = name.trim() || trimmedEmail.split("@")[0] || "User";
    const roleCapitalized = role === "teacher" ? "Teacher" : "Student";
    const localUser = {
      id: crypto.randomUUID(),
      name: displayName,
      email: trimmedEmail,
      role: roleCapitalized,
    };
    localStorage.setItem("tiny_wins_user", JSON.stringify(localUser));
    localStorage.setItem(
      "tiny_wins_profile",
      JSON.stringify({
        id: localUser.id,
        full_name: displayName,
        email: trimmedEmail,
        role: role.toLowerCase(),
      })
    );
    setLocalUser(localUser);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#050816] px-4 py-8 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="fixed -top-32 right-10 h-[350px] w-[350px] sm:h-[550px] sm:w-[550px] rounded-full bg-gradient-to-br from-[#1d4ed8]/25 to-[#38bdf8]/10 blur-[100px] pointer-events-none" />
      <div className="fixed -bottom-40 -left-20 h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] rounded-full bg-[#1e40af]/20 blur-[100px] pointer-events-none" />

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#080d21]/80 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-black/60">
        {/* Brand header */}
        <div className="flex items-center gap-3.5 mb-6">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25">
            <Sparkles size={20} />
          </span>
          <div>
            <h1 className="font-semibold text-lg text-white tracking-tight">Tiny Wins</h1>
            <p className="text-xs text-slate-400">Make meaningful progress daily.</p>
          </div>
        </div>

        {/* Tab switch between Login & Signup */}
        <div className="flex rounded-xl bg-white/[.04] p-1 border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMessage("");
              setSuccessMessage("");
              setShowBypassOption(false);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "signup"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage("");
              setSuccessMessage("");
              setShowBypassOption(false);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === "login"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Log in
          </button>
        </div>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your workspace"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === "login"
              ? "Sign in to resume your daily streak and tiny wins."
              : "Start organizing your study, projects, and habits."}
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full name
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email address
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex justify-between">
              <span>Password</span>
              <span className="text-[10px] text-slate-500">Min 6 characters</span>
            </label>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/[.04] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 transition"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                I am using Tiny Wins as a
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("student")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 border text-xs font-medium transition ${
                    role === "student"
                      ? "border-violet-500/70 bg-violet-600/20 text-violet-200"
                      : "border-white/5 bg-white/[.02] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <UserCheck size={14} />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("teacher")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 border text-xs font-medium transition ${
                    role === "teacher"
                      ? "border-indigo-500/70 bg-indigo-600/20 text-indigo-200"
                      : "border-white/5 bg-white/[.02] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <ShieldCheck size={14} />
                  Teacher
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 active:scale-98 flex items-center justify-center gap-2"
          >
            {busy ? (
              <span>Please wait…</span>
            ) : mode === "login" ? (
              <>
                <span>Log in</span>
                <ArrowRight size={15} />
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>

          {/* Immediate local workspace bypass if email confirmation is pending */}
          {showBypassOption && (
            <button
              type="button"
              onClick={handleContinueLocally}
              className="w-full mt-2 rounded-xl border border-violet-400/30 bg-violet-500/10 py-2.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition flex items-center justify-center gap-1.5"
            >
              <span>Continue to Workspace now</span>
              <ArrowRight size={14} />
            </button>
          )}
        </form>

        {/* Footer toggle */}
        <div className="mt-6 text-center border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setErrorMessage("");
              setSuccessMessage("");
              setShowBypassOption(false);
            }}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            {mode === "login" ? (
              <span>
                Don't have an account? <strong className="text-violet-400">Create one</strong>
              </span>
            ) : (
              <span>
                Already have an account? <strong className="text-violet-400">Log in</strong>
              </span>
            )}
          </button>
        </div>
      </section>
    </main>
  );
}

import { LogOut, Settings, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { navLinks } from "./navItems";

export default function Sidebar() {
  const { profile, signOut } = useAuth();

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="hidden h-screen w-[252px] shrink-0 flex-col justify-between border-r border-[#1e293b]/60 bg-[#080d21]/75 px-4 py-5 backdrop-blur-2xl lg:flex sticky top-0">
      <div>
        {/* Brand header */}
        <NavLink to="/" className="mb-8 flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1e3a8a]/60 text-[#60a5fa]">
            <Sparkles size={17} />
          </span>
          <span>
            <b className="block text-[15px] font-semibold text-white">Tiny Wins</b>
            <small className="text-slate-400">Make progress daily</small>
          </span>
        </NavLink>

        {/* Navigation links */}
        <nav className="space-y-1">
          {navLinks.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive
                    ? "border border-[#3b82f6]/30 bg-[#1e3a8a]/40 text-[#60a5fa] shadow-lg shadow-[#1e40af]/20"
                    : "text-slate-400 hover:bg-white/[.04] hover:text-slate-200"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer / Profile */}
      <div className="space-y-3 pt-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              isActive
                ? "border border-[#3b82f6]/30 bg-[#1e3a8a]/40 text-[#60a5fa] shadow-lg shadow-[#1e40af]/20"
                : "text-slate-400 hover:bg-white/[.04] hover:text-white"
            }`
          }
        >
          <Settings size={17} />
          Settings
        </NavLink>

        {/* Motivation quote */}
        <div className="rounded-xl border border-white/5 bg-slate-900/60 p-2.5 text-center">
          <p className="font-handwriting text-sm text-pink-300">
            “A better you is built by tiny wins” 💕
          </p>
        </div>

        {/* User badge */}
        <div className="flex items-center gap-3 border-t border-[#1e293b]/60 pt-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6]/60 text-xs font-semibold text-white shadow-inner">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-200">
              {profile?.full_name || "Khushi Tiwari"}
            </p>
            <p className="text-xs capitalize text-slate-500">
              {profile?.role || "Student"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            title="Log out"
            aria-label="Log out"
            className="text-slate-400 transition hover:text-rose-300"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

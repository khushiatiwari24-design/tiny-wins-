import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Settings, Sparkles, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { navLinks } from "./navItems";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { profile, signOut } = useAuth();

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Close drawer on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="relative flex h-full w-[290px] max-w-[85vw] flex-col justify-between border-r border-[#1e293b]/70 bg-[#080d21] p-5 shadow-2xl overflow-y-auto"
          >
            <div>
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <NavLink
                  to="/"
                  onClick={onClose}
                  className="flex items-center gap-3 px-1"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1e3a8a]/60 text-[#60a5fa]">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <b className="block text-base font-semibold text-white">
                      Tiny Wins
                    </b>
                    <small className="text-xs text-slate-400">
                      Make progress daily
                    </small>
                  </div>
                </NavLink>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[.06] hover:text-white"
                  aria-label="Close navigation menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1">
                {navLinks.map(({ label, to, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? "border border-[#3b82f6]/30 bg-[#1e3a8a]/40 text-[#60a5fa] shadow-md shadow-[#1e40af]/20"
                          : "text-slate-400 hover:bg-white/[.04] hover:text-slate-200"
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}

                <NavLink
                  to="/settings"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "border border-[#3b82f6]/30 bg-[#1e3a8a]/40 text-[#60a5fa] shadow-md shadow-[#1e40af]/20"
                        : "text-slate-400 hover:bg-white/[.04] hover:text-slate-200"
                    }`
                  }
                >
                  <Settings size={18} />
                  Settings
                </NavLink>
              </nav>
            </div>

            {/* Profile & Motivational Card */}
            <div className="mt-6 space-y-3 border-t border-[#1e293b]/60 pt-4">
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-3">
                <p className="font-handwriting text-center text-sm text-pink-300">
                  “A better you is built by tiny wins” 💕
                </p>
              </div>

              <div className="flex items-center gap-3 px-1">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6]/60 text-xs font-semibold text-white shadow-inner">
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
                  onClick={() => {
                    onClose();
                    void signOut();
                  }}
                  title="Log out"
                  aria-label="Log out"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

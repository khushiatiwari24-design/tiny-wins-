import { NavLink } from "react-router-dom";
import { CalendarDays, Flame, Home, ListTodo, Menu } from "lucide-react";

interface BottomNavProps {
  onOpenMenu: () => void;
}

const quickNav = [
  { label: "Dashboard", to: "/", icon: Home, end: true },
  { label: "My Day", to: "/my-day", icon: ListTodo, end: false },
  { label: "Calendar", to: "/calendar", icon: CalendarDays, end: false },
  { label: "Streaks", to: "/streaks", icon: Flame, end: false },
];

export default function BottomNav({ onOpenMenu }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-[#1e293b]/80 bg-[#080d21]/95 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] backdrop-blur-2xl lg:hidden shadow-[0_-8px_20px_rgba(0,0,0,0.45)]">
      {quickNav.map(({ label, to, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 py-1 transition ${
              isActive
                ? "text-[#60a5fa]"
                : "text-slate-400 hover:text-slate-200"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                  isActive
                    ? "bg-[#1e3a8a]/50 text-[#60a5fa] shadow-sm shadow-[#1e40af]/30"
                    : ""
                }`}
              >
                <Icon size={19} />
              </div>
              <span className="text-[10px] font-medium tracking-tight">
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}

      {/* Menu button to open the full drawer */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-400 hover:text-slate-200 transition"
        aria-label="Open full menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-xl">
          <Menu size={19} />
        </div>
        <span className="text-[10px] font-medium tracking-tight">Menu</span>
      </button>
    </nav>
  );
}

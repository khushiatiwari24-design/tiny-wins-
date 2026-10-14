import { Menu, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface TopbarProps {
  onOpenMenu?: () => void;
}

export default function Topbar({ onOpenMenu }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 lg:h-[72px] items-center justify-between border-b border-white/[.06] bg-[#050816]/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      {/* Mobile brand logo */}
      <Link to="/" className="flex items-center gap-2.5 lg:hidden">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#1e3a8a]/60 text-[#60a5fa] shadow-sm">
          <Sparkles size={16} />
        </span>
        <div className="flex flex-col">
          <b className="text-sm font-semibold text-white">Tiny Wins</b>
          <span className="text-[10px] text-slate-400 -mt-0.5">Focus daily</span>
        </div>
      </Link>

      {/* Desktop tagline */}
      <p className="hidden text-xs sm:text-sm text-slate-400 sm:block">
        One focused action at a time.
      </p>

      {/* Mobile hamburger menu toggle */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/[.06] hover:text-white active:scale-95 lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu size={22} />
      </button>
    </header>
  );
}

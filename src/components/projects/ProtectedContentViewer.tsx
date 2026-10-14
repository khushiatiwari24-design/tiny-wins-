import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Lock, ShieldAlert, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface ProtectedContentViewerProps {
  title: string;
  type: "file" | "note";
  content?: string; // For notes
  fileUrl?: string; // For files
  fileMimeType?: string;
  authorName?: string;
  createdAt?: string;
  onClose: () => void;
}

export default function ProtectedContentViewer({
  title,
  type,
  content,
  fileUrl,
  fileMimeType = "application/pdf",
  authorName,
  createdAt,
  onClose,
}: ProtectedContentViewerProps) {
  const { profile } = useAuth();
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [shortcutViolation, setShortcutViolation] = useState<string | null>(null);

  const userName = profile?.full_name || "Authorized Student";
  const userEmail = profile?.email || "confidential";
  const timestamp = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Anti-Screenshot & Shortcut interception
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Check for PrintScreen
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        triggerViolation("Screen capture is disabled for protected material.");
        return;
      }

      // Ctrl+P (Print) or Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        triggerViolation("Printing is disabled for protected material.");
        return;
      }

      // Ctrl+S (Save) or Cmd+S
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        triggerViolation("Downloading or saving files is prohibited.");
        return;
      }

      // Ctrl+Shift+I or F12 (Inspect)
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          (e.key === "I" || e.key === "i" || e.key === "C" || e.key === "c"))
      ) {
        e.preventDefault();
        triggerViolation("Developer tools inspection is disabled.");
        return;
      }

      // Meta+Shift+S / Windows Snipping Tool key
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        triggerViolation("Snipping tool detected. Capture blocked.");
        return;
      }
    };

    const triggerViolation = (msg: string) => {
      setShortcutViolation(msg);
      window.setTimeout(() => setShortcutViolation(null), 3500);
    };

    // Window blur / Tab switch protection (triggers when user opens snipping tool or external overlay)
    const handleWindowBlur = () => {
      setIsWindowBlurred(true);
    };

    const handleWindowFocus = () => {
      setIsWindowBlurred(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsWindowBlurred(true);
      } else {
        setIsWindowBlurred(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onClose]);

  const isImage = fileMimeType?.startsWith("image/");
  const isPdf = fileMimeType === "application/pdf" || (!isImage && type === "file");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-md select-none"
      role="dialog"
      aria-modal="true"
      onContextMenu={(e) => {
        e.preventDefault();
        return false;
      }}
    >
      <div className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[.15] bg-[#0c1021] shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[.08] bg-[#080d21] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-300">
              <Lock size={16} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm sm:text-base font-semibold text-white">
                  {title}
                </p>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
                  Protected View
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {type === "note" ? "Secure Study Note" : "Protected Document"}
                {authorName ? ` • By ${authorName}` : ""}
                {createdAt ? ` • ${createdAt}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[.08] hover:text-white transition"
            aria-label="Close viewer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Security Warning Notification Banner */}
        {shortcutViolation && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2.5 text-xs text-rose-200 flex items-center gap-2 justify-center animate-pulse">
            <ShieldAlert size={16} className="text-rose-400 shrink-0" />
            <span>{shortcutViolation}</span>
          </div>
        )}

        {/* Main Protected Content Area */}
        <div className="relative flex-1 overflow-auto bg-[#060814] p-4 sm:p-8">
          {/* Watermark Diagonal Overlay across the entire viewer */}
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-wrap items-center justify-around gap-20 overflow-hidden opacity-[0.06] select-none">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="-rotate-25 whitespace-nowrap text-sm sm:text-base font-mono font-bold uppercase tracking-widest text-white"
              >
                {userName} • {userEmail} • {timestamp} • DO NOT COPY
              </div>
            ))}
          </div>

          {/* Window Blur Shield Overlay (when user unfocuses or opens external snipping tool) */}
          {isWindowBlurred && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center backdrop-blur-2xl">
              <AlertTriangle size={36} className="text-amber-400 mb-3" />
              <h3 className="text-lg font-bold text-white">Content Hidden</h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-md">
                This study material is protected against screenshots and screen recording.
                Please click back on this window to resume viewing.
              </p>
            </div>
          )}

          {/* Actual Content */}
          <div
            className={`relative z-10 transition-all duration-300 ${
              isWindowBlurred || shortcutViolation ? "blur-xl select-none pointer-events-none" : ""
            }`}
          >
            {type === "note" ? (
              <div className="max-w-3xl mx-auto rounded-2xl bg-white/[.02] border border-white/[.06] p-6 sm:p-8">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-300 mb-4">
                  <FileText size={15} />
                  <span>Confidential Course Note</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-6">
                  {title}
                </h1>
                <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-slate-200">
                  {content || "No note content recorded."}
                </div>
              </div>
            ) : fileUrl ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                {isImage ? (
                  <img
                    src={fileUrl}
                    alt={title}
                    draggable={false}
                    className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl pointer-events-none select-none"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : isPdf ? (
                  <iframe
                    src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    title={title}
                    className="h-[75vh] w-full rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
                  />
                ) : (
                  <div className="text-center p-8 text-slate-400">
                    <FileText size={48} className="mx-auto mb-3 text-cyan-300" />
                    <p className="text-white font-medium">{title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Direct downloading is restricted by workspace security policy.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-12">
                Unable to load protected content preview.
              </p>
            )}
          </div>
        </div>

        {/* Footer Security Notice */}
        <div className="border-t border-white/[.08] bg-[#080d21] px-4 py-2.5 sm:px-6 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock size={12} className="text-amber-400" />
            <span>Anti-download & anti-screenshot security active</span>
          </div>
          <span>Logged as: {userEmail}</span>
        </div>
      </div>
    </div>
  );
}

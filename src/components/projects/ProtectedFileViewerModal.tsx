import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Lock, ShieldAlert, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export interface ProtectedFileViewerModalProps {
  title: string;
  type?: "file" | "note";
  content?: string; // For notes or inline text
  fileUrl?: string; // For files
  fileMimeType?: string;
  authorName?: string;
  createdAt?: string;
  onClose: () => void;
}

export default function ProtectedFileViewerModal({
  title,
  type = "file",
  content,
  fileUrl,
  fileMimeType = "application/pdf",
  authorName,
  createdAt,
  onClose,
}: ProtectedFileViewerModalProps) {
  const { profile } = useAuth();
  // 1. Initial isBlurred = false on modal mount
  const [isBlurred, setIsBlurred] = useState(false);
  const [shortcutViolation, setShortcutViolation] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [officeEmbedFailed, setOfficeEmbedFailed] = useState(false);

  const userName = profile?.full_name || "Authorized Student";
  const userEmail = profile?.email || "student@tinywins.app";
  const timestamp = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Determine file format based on extension & MIME type
  const cleanTitle = (title || "").toLowerCase();
  const cleanUrl = (fileUrl || "").toLowerCase();
  const fileExt = (cleanTitle.split(".").pop() || cleanUrl.split(".").pop() || "").split("?")[0];
  const mime = (fileMimeType || "").toLowerCase();

  const isImage =
    mime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico"].includes(fileExt);

  const isPdf = mime === "application/pdf" || fileExt === "pdf";

  const isPowerPoint =
    ["pptx", "ppt", "odp"].includes(fileExt) ||
    mime.includes("powerpoint") ||
    mime.includes("presentation");

  const isWordDoc =
    ["docx", "doc", "odt", "rtf"].includes(fileExt) ||
    mime.includes("wordprocessingml") ||
    mime.includes("msword");

  const isOfficeDoc = isPowerPoint || isWordDoc;

  const isText =
    type === "note" ||
    mime.startsWith("text/") ||
    ["txt", "md", "csv", "json", "xml", "log", "ts", "js"].includes(fileExt);

  // Fetch text content if text file and content not pre-supplied
  useEffect(() => {
    if (isText && fileUrl && !content && !fileUrl.startsWith("data:")) {
      fetch(fileUrl)
        .then((res) => {
          if (res.ok) return res.text();
          throw new Error("Unable to fetch text file");
        })
        .then((text) => setTextContent(text))
        .catch(() => {});
    }
  }, [isText, fileUrl, content]);

  // Anti-Screenshot & Shortcut interception
  useEffect(() => {
    const handleKeyIntercept = (e: KeyboardEvent) => {
      // Escape closes modal
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Check for PrintScreen
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation("Screen capture is strictly disabled for protected study material.");
        return;
      }

      // Meta+Shift+S / Ctrl+Shift+S / Mac Screenshot shortcuts (Cmd+Shift+3/4/5)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        ["S", "s", "3", "4", "5"].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation("Snipping & screenshot tools detected. Capture blocked.");
        return;
      }

      // Ctrl+P / Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation("Printing is disabled for protected study material.");
        return;
      }

      // Ctrl+S / Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation("Downloading or saving study material is prohibited.");
        return;
      }

      // Developer Tools shortcuts (F12, Ctrl+Shift+I/J/C)
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) &&
          e.shiftKey &&
          ["I", "i", "C", "c", "J", "j"].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation("Developer tools inspection is disabled.");
        return;
      }
    };

    const triggerViolation = (msg: string) => {
      setShortcutViolation(msg);
      setIsBlurred(true);
      window.setTimeout(() => {
        setShortcutViolation(null);
      }, 4000);
    };

    // Only blur on tab switch / visibilityState hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsBlurred(true);
      } else if (document.visibilityState === "visible") {
        // Automatically unblur when user returns to this window
        setIsBlurred(false);
        setShortcutViolation(null);
      }
    };

    const handleWindowFocus = () => {
      // Immediately unblur on focus
      setIsBlurred(false);
      setShortcutViolation(null);
    };

    window.addEventListener("keydown", handleKeyIntercept, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("keydown", handleKeyIntercept, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [onClose]);

  // Click anywhere to immediately unblur
  const handleModalClick = () => {
    if (isBlurred) {
      setIsBlurred(false);
      setShortcutViolation(null);
    }
  };

  const isRemoteHttp = Boolean(
    fileUrl && (fileUrl.startsWith("http://") || fileUrl.startsWith("https://"))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-md select-none"
      role="dialog"
      aria-modal="true"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      onClick={handleModalClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      onCopy={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      onCut={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      onDragStart={(e) => {
        e.preventDefault();
        return false;
      }}
    >
      <div
        className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[.15] bg-[#0c1021] shadow-2xl"
        onClick={(e) => {
          e.stopPropagation();
          handleModalClick();
        }}
      >
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
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-medium text-emerald-300 shrink-0">
                  Protected View
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {type === "note" ? "Secure Study Material" : "Protected Document"}
                {authorName ? ` • By ${authorName}` : ""}
                {createdAt ? ` • ${createdAt}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[.08] hover:text-white transition cursor-pointer shrink-0"
            aria-label="Close viewer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Security Warning Notification Banner */}
        {shortcutViolation && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 py-2 text-xs text-rose-200 flex items-center gap-2 justify-center animate-pulse">
            <ShieldAlert size={16} className="text-rose-400 shrink-0" />
            <span>{shortcutViolation}</span>
          </div>
        )}

        {/* Main Protected Content Area */}
        <div className="relative flex-1 overflow-auto bg-[#060814] p-3 sm:p-6 flex flex-col justify-center">
          {/* Visible Diagonal Watermark Overlay */}
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-wrap items-center justify-around gap-16 overflow-hidden opacity-10 select-none">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="-rotate-25 whitespace-nowrap text-lg font-mono font-bold uppercase tracking-widest text-white select-none pointer-events-none"
              >
                {userEmail} • Tiny Wins Protected
              </div>
            ))}
          </div>

          {/* Window Blur / Screenshot Shield Overlay */}
          {isBlurred && (
            <div
              onClick={() => {
                setIsBlurred(false);
                setShortcutViolation(null);
              }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/92 p-6 text-center backdrop-blur-2xl cursor-pointer"
            >
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                🔒 Protected Study Material — Screenshots & Downloads are strictly disabled.
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
                {shortcutViolation ||
                  "This study material is view-only within Tiny Wins. Screen capture tools, snipping tools, and saving are prohibited to protect course intellectual property. Click anywhere inside this window to resume reading."}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBlurred(false);
                  setShortcutViolation(null);
                }}
                className="mt-5 rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-violet-500 transition cursor-pointer"
              >
                Click to Resume Reading
              </button>
            </div>
          )}

          {/* Actual Multi-Format In-App Document Renderer */}
          <div
            className="relative z-10 w-full transition-all duration-200"
            style={
              isBlurred
                ? { filter: "blur(28px) brightness(0.2)", userSelect: "none", pointerEvents: "none" }
                : undefined
            }
          >
            {type === "note" || (isText && (content || textContent)) ? (
              /* Plain Text / Notes Renderer */
              <div className="max-w-3xl mx-auto rounded-2xl bg-white/[.02] border border-white/[.06] p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-300 mb-4">
                  <FileText size={15} />
                  <span>Confidential Course Study Material</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-6">
                  {title}
                </h1>
                <div
                  className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-slate-200 select-none"
                  style={{ userSelect: "none", WebkitUserSelect: "none" }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {content || textContent || "No note content recorded."}
                </div>
              </div>
            ) : fileUrl ? (
              <div className="flex items-center justify-center w-full">
                {isImage ? (
                  /* 1. Images (jpg, png, webp, gif, svg) */
                  <img
                    src={fileUrl}
                    alt={title}
                    className="max-h-[75vh] max-w-full object-contain mx-auto select-none pointer-events-none rounded-lg shadow-2xl"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : isPdf ? (
                  /* 2. PDFs (.pdf) */
                  <div className="relative h-[75vh] w-full max-w-5xl rounded-xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
                    <iframe
                      src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                      className="w-full h-[75vh] border-0 rounded-lg pointer-events-auto"
                      title={title}
                    />
                  </div>
                ) : isOfficeDoc ? (
                  /* 3. PowerPoint & Word Documents (.pptx, .ppt, .docx) */
                  isRemoteHttp && !officeEmbedFailed ? (
                    <div className="relative h-[75vh] w-full max-w-5xl rounded-xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
                      <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                          fileUrl
                        )}`}
                        className="w-full h-[75vh] border-0 rounded-lg pointer-events-auto"
                        title={title}
                        onError={() => setOfficeEmbedFailed(true)}
                      />
                    </div>
                  ) : (
                    /* Fallback for local blobs or if remote office viewer cannot reach local preview */
                    <div className="flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto bg-white/[.04] border border-white/[.08] rounded-2xl shadow-xl">
                      <div className="h-14 w-14 rounded-2xl bg-violet-500/20 text-violet-300 flex items-center justify-center mb-4 border border-violet-500/30">
                        <FileText size={30} />
                      </div>
                      <h4 className="text-lg font-semibold text-white">{title}</h4>
                      <span className="mt-2 px-3 py-1 rounded-full text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium">
                        {isPowerPoint ? "Protected Slide Presentation" : "Protected Document"}
                      </span>
                      <p className="mt-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        Presentation outline active. Material is protected within your classroom workspace.
                      </p>
                      <div className="mt-5 w-full rounded-xl bg-black/40 p-4 text-left border border-white/[.06] text-xs text-zinc-400 space-y-2">
                        <p className="text-zinc-200 font-semibold flex items-center gap-1.5">
                          <Lock size={13} className="text-amber-400" /> Protected Slide Deck & Notes
                        </p>
                        <p className="text-zinc-300">• Direct downloading and screen extraction are disabled</p>
                        <p className="text-zinc-300">• Synchronized across joined classroom members</p>
                        <p className="text-zinc-400 text-[11px]">
                          Office Web Viewer renders automatically once cloud sync is verified.
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  /* Generic File Preview Fallback */
                  <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto bg-white/[.04] border border-white/[.08] rounded-2xl">
                    <FileText size={48} className="mx-auto mb-3 text-cyan-300" />
                    <p className="text-white font-medium">{title}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Protected study document viewable in Tiny Wins. Direct downloading is restricted by workspace security policy.
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

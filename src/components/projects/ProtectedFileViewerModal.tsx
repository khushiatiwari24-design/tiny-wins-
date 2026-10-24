import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Lock, ShieldAlert, Trash2, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export interface ProtectedFileViewerModalProps {
  title: string;
  type?: "file" | "note";
  content?: string; // For notes or inline text
  fileUrl?: string; // For files
  fileMimeType?: string;
  fileSize?: number;
  authorName?: string;
  createdAt?: string;
  onClose: () => void;
  onDelete?: () => void;
}

export default function ProtectedFileViewerModal({
  title,
  type = "file",
  content,
  fileUrl,
  fileMimeType = "application/pdf",
  fileSize,
  authorName,
  createdAt,
  onClose,
  onDelete,
}: ProtectedFileViewerModalProps) {
  const { profile } = useAuth();
  const [isBlurred, setIsBlurred] = useState(false);
  const [shortcutViolation, setShortcutViolation] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [officeEmbedFailed, setOfficeEmbedFailed] = useState(false);
  const [isCorrupted, setIsCorrupted] = useState(false);

  const userEmail = profile?.email || "student@tinywins.app";

  const fileName = title || "Document";
  const url = fileUrl || "";
  const mime = (fileMimeType || "").toLowerCase();

  // 1. Detect empty, invalid or corrupted URL strings
  const isUrlCorruptedString =
    url.includes("NoSuchBucket") ||
    url.includes("Bucket not found") ||
    url.includes("statusCode") ||
    url.startsWith('{"statusCode"');

  const isEmptyOrUnavailable =
    fileSize === 0 ||
    !url ||
    url.trim() === "" ||
    url === "null" ||
    url === "undefined" ||
    isUrlCorruptedString ||
    isCorrupted;

  // Check remote HTTP URLs on mount to catch 404 / NoSuchBucket responses before rendering
  useEffect(() => {
    if (!url) return;
    if (url.startsWith("data:")) {
      setIsCorrupted(false);
      return;
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      fetch(url)
        .then(async (res) => {
          if (!res.ok) {
            setIsCorrupted(true);
            return;
          }
          const text = await res.text();
          if (
            text &&
            (text.includes("NoSuchBucket") ||
              text.includes("Bucket not found") ||
              text.includes('"statusCode":404') ||
              text.includes('"statusCode":"404"'))
          ) {
            setIsCorrupted(true);
          }
        })
        .catch(() => {});
    }
  }, [url]);

  // 2. Multi-Format Detection
  const isImage =
    mime.includes("image") ||
    url.startsWith("data:image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName) ||
    /\.(jpg|jpeg|png|webp|gif|svg)/i.test(url);

  const isPdf =
    url.startsWith("data:application/pdf") ||
    url.includes(".pdf") ||
    mime.includes("pdf") ||
    /\.pdf$/i.test(fileName);

  const isOfficeDoc =
    /\.(ppt|pptx|doc|docx)$/i.test(fileName) ||
    /\.(ppt|pptx|doc|docx)/i.test(url) ||
    mime.includes("powerpoint") ||
    mime.includes("presentation") ||
    mime.includes("wordprocessingml") ||
    mime.includes("msword");

  const isPowerPoint =
    /\.(ppt|pptx)$/i.test(fileName) ||
    /\.(ppt|pptx)/i.test(url) ||
    mime.includes("powerpoint") ||
    mime.includes("presentation");

  const isText =
    type === "note" ||
    mime.includes("text") ||
    /\.(txt|md|markdown|json|csv|log)$/i.test(fileName);

  // Fetch text content if text file and content not pre-supplied
  useEffect(() => {
    if (isText && url && !content && !url.startsWith("data:")) {
      fetch(url)
        .then((res) => {
          if (res.ok) return res.text();
          throw new Error("Unable to fetch text file");
        })
        .then((text) => setTextContent(text))
        .catch(() => {});
    }
  }, [isText, url, content]);

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
        setIsBlurred(false);
        setShortcutViolation(null);
      }
    };

    const handleWindowFocus = () => {
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

  const handleModalClick = () => {
    if (isBlurred) {
      setIsBlurred(false);
      setShortcutViolation(null);
    }
  };

  const isRemoteHttp = Boolean(
    url && (url.startsWith("http://") || url.startsWith("https://"))
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
                  {fileName}
                </p>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-medium text-emerald-300 shrink-0">
                  Protected View
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {type === "note" ? "Secure Study Material" : "Protected Document"}
                {authorName ? ` • By ${authorName}` : ""}
                {createdAt ? ` • ${createdAt}` : ""}
                {fileSize !== undefined && fileSize > 0 ? ` • ${(fileSize / 1024).toFixed(1)} KB` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="flex h-9 items-center gap-1.5 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer text-xs font-medium"
                title="Delete this file"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[.08] hover:text-white transition cursor-pointer shrink-0"
              aria-label="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
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
                  "This study material is view-only within Tiny Wins. Click anywhere inside this window to resume reading."}
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

          {/* Real Active Document Viewport */}
          <div
            className="relative z-10 w-full h-full flex items-center justify-center transition-all duration-200"
            style={
              isBlurred
                ? { filter: "blur(28px) brightness(0.2)", userSelect: "none", pointerEvents: "none" }
                : undefined
            }
          >
            {isEmptyOrUnavailable ? (
              /* Clean Alert Card for Corrupted / NoSuchBucket / 404 / 0 Bytes */
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto bg-white/[.04] border border-rose-500/30 rounded-2xl shadow-xl">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  <AlertTriangle size={32} />
                </div>
                <h4 className="text-lg font-semibold text-white">{fileName}</h4>
                <p className="mt-2 text-xs sm:text-sm text-rose-200/90 leading-relaxed">
                  This file is unavailable or corrupted (storage bucket not found or session expired). Please delete it and upload a fresh copy.
                </p>
                <div className="mt-5 flex items-center gap-3">
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete();
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-rose-500 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                      Delete Corrupted File
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/[.08] border border-white/[.12] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[.12] transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : isPdf ? (
              /* PDF Viewport via <embed> (Rock-solid for Base64 Data URLs and native PDF engines) */
              <embed
                src={url}
                type="application/pdf"
                className="w-full h-[75vh] rounded-lg bg-white"
              />
            ) : isImage ? (
              /* Image Viewport */
              <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                <img
                  src={url}
                  alt={fileName}
                  className="max-h-[75vh] max-w-full object-contain mx-auto select-none pointer-events-none"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            ) : isOfficeDoc ? (
              /* Office Viewport */
              isRemoteHttp && !officeEmbedFailed ? (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
                  className="w-full h-[75vh] border-0 rounded-lg bg-white pointer-events-auto"
                  title={fileName}
                  onError={() => setOfficeEmbedFailed(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto bg-white/[.04] border border-white/[.08] rounded-2xl shadow-xl">
                  <div className="h-14 w-14 rounded-2xl bg-violet-500/20 text-violet-300 flex items-center justify-center mb-4 border border-violet-500/30">
                    <FileText size={30} />
                  </div>
                  <h4 className="text-lg font-semibold text-white">{fileName}</h4>
                  <span className="mt-2 px-3 py-1 rounded-full text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium">
                    {isPowerPoint ? "Protected Slide Presentation" : "Protected Document"}
                  </span>
                  <p className="mt-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    Presentation outline active. Slide deck and document outline are secured within your classroom workspace.
                  </p>
                </div>
              )
            ) : isText ? (
              /* Formatted Markdown / Notes Reader */
              <div className="max-w-3xl mx-auto w-full rounded-2xl bg-white/[.02] border border-white/[.06] p-6 sm:p-8 shadow-xl max-h-[75vh] overflow-auto">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-cyan-300 mb-4">
                  <FileText size={15} />
                  <span>Confidential Course Study Material</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-6">
                  {fileName}
                </h1>
                <div
                  className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed text-slate-200 select-none"
                  style={{ userSelect: "none", WebkitUserSelect: "none" }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {content || textContent || "No text content recorded."}
                </div>
              </div>
            ) : (
              /* Fallback Viewer */
              <embed
                src={url}
                className="w-full h-[75vh] rounded-lg bg-white"
              />
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

import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Lock, ShieldAlert, Trash2, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export interface FileData {
  id?: string | null;
  name?: string;
  url?: string;
  type?: string;
  size?: number;
  uploader_name?: string;
  created_at?: string;
}

export interface ProtectedFileViewerModalProps {
  file?: FileData;
  title?: string;
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

/**
 * High-performance Base64 to Binary Blob conversion utility.
 * Prevents Chromium/Opera from blacking/whiting out on giant data URLs.
 */
function dataURLtoBlob(dataurl: string): Blob | null {
  try {
    const parts = dataurl.split(",");
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
    const binaryString = atob(parts[1]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch (err) {
    console.error("Failed to convert base64 to blob:", err);
    return null;
  }
}

export default function ProtectedFileViewerModal(props: ProtectedFileViewerModalProps) {
  const {
    file: propFile,
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
  } = props;

  const { profile } = useAuth();
  const [isBlurred, setIsBlurred] = useState(false);
  const [shortcutViolation, setShortcutViolation] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCorrupted, setIsCorrupted] = useState<boolean>(false);

  const userEmail = profile?.email || "student@tinywins.app";

  // Normalize file data across individual props or file object
  const file: FileData = propFile || {
    name: title || "Document",
    url: fileUrl,
    type: fileMimeType,
    size: fileSize,
    uploader_name: authorName,
    created_at: createdAt,
  };

  const fileName = file.name || "Document";
  const rawUrl = file.url || "";
  const mime = (file.type || "").toLowerCase();

  // Detect corrupted strings or 404 NoSuchBucket payloads
  const isUrlCorruptedString =
    rawUrl.includes("NoSuchBucket") ||
    rawUrl.includes("Bucket not found") ||
    rawUrl.includes("statusCode") ||
    rawUrl.startsWith('{"statusCode"');

  // Convert Base64 data URLs to Native Blob Object URLs on mount
  useEffect(() => {
    if (!rawUrl || isUrlCorruptedString) {
      setRenderUrl("");
      setIsLoading(false);
      setIsCorrupted(Boolean(isUrlCorruptedString));
      return;
    }

    setIsLoading(true);
    setIsCorrupted(false);

    // If Base64 data URL, convert to native Blob URL to avoid browser string limits
    if (rawUrl.startsWith("data:")) {
      const blob = dataURLtoBlob(rawUrl);
      if (blob) {
        const objUrl = URL.createObjectURL(blob);
        setRenderUrl(objUrl);
        setIsLoading(false);
        return () => {
          URL.revokeObjectURL(objUrl);
        };
      }
    }

    // Check remote HTTP URLs for 404 / NoSuchBucket error responses
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      fetch(rawUrl)
        .then(async (res) => {
          if (!res.ok) {
            setIsCorrupted(true);
            setIsLoading(false);
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
            setIsLoading(false);
            return;
          }
          setRenderUrl(rawUrl);
          setIsLoading(false);
        })
        .catch(() => {
          setRenderUrl(rawUrl);
          setIsLoading(false);
        });
      return;
    }

    setRenderUrl(rawUrl);
    setIsLoading(false);
  }, [rawUrl, isUrlCorruptedString]);

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

    // Auto blur when tab is hidden or window loses focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsBlurred(true);
      } else if (document.visibilityState === "visible") {
        setIsBlurred(false);
        setShortcutViolation(null);
      }
    };

    const handleWindowBlur = () => {
      setIsBlurred(true);
    };

    // Auto unblur as soon as user returns or window regains focus
    const handleWindowFocus = () => {
      setIsBlurred(false);
      setShortcutViolation(null);
    };

    window.addEventListener("keydown", handleKeyIntercept, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("keydown", handleKeyIntercept, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [onClose]);

  // Click anywhere inside modal immediately unblurs so it never stays stuck
  const handleModalClick = () => {
    if (isBlurred) {
      setIsBlurred(false);
      setShortcutViolation(null);
    }
  };

  const isImageFile =
    mime.includes("image") ||
    rawUrl.startsWith("data:image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName) ||
    /\.(jpg|jpeg|png|webp|gif|svg)/i.test(rawUrl);

  const isCorruptedOrEmpty =
    isCorrupted ||
    isUrlCorruptedString ||
    (!isLoading && !renderUrl && !content) ||
    file.size === 0;

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
                {file.uploader_name ? ` • By ${file.uploader_name}` : ""}
                {file.created_at ? ` • ${new Date(file.created_at).toLocaleDateString()}` : ""}
                {file.size !== undefined && file.size > 0
                  ? ` • ${(file.size / 1024).toFixed(1)} KB`
                  : ""}
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
                <span className="hidden sm:inline">Delete File</span>
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
          {/* Subtle Diagonal Watermark Overlay */}
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-wrap items-center justify-around gap-16 overflow-hidden opacity-10 select-none">
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                className="-rotate-25 whitespace-nowrap text-lg font-mono font-bold uppercase tracking-widest text-white select-none pointer-events-none"
              >
                Logged as: {userEmail} • TINY WINS PROTECTED
              </div>
            ))}
          </div>

          {/* Window Blur / Screenshot Shield Overlay (Clicking anywhere immediately unblurs) */}
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
            {type === "note" || content ? (
              /* Protected Note / Inline Text Viewer */
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
                  {content}
                </div>
              </div>
            ) : isCorruptedOrEmpty ? (
              /* Clean Alert Card for Corrupted / Empty / NoSuchBucket files */
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto bg-white/[.04] border border-rose-500/30 rounded-2xl shadow-xl">
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  <AlertTriangle size={32} />
                </div>
                <h4 className="text-lg font-semibold text-white">{fileName}</h4>
                <p className="mt-2 text-xs sm:text-sm text-rose-200/90 leading-relaxed">
                  This file is unavailable or corrupted (storage session expired or bucket not found). Please delete it and upload a fresh copy.
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
            ) : (
              /* Robust Multi-Page Document Container with Native Object & Embed Fallback */
              <div className="w-full h-[75vh] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center relative select-none">
                {isLoading ? (
                  <div className="text-slate-400 text-sm flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
                    Preparing document...
                  </div>
                ) : renderUrl ? (
                  isImageFile ? (
                    <img
                      src={renderUrl}
                      alt={fileName}
                      className="max-h-[75vh] max-w-full object-contain mx-auto pointer-events-none select-none"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  ) : (
                    <object
                      data={`${renderUrl}#toolbar=0&navpanes=0`}
                      type="application/pdf"
                      className="w-full h-full border-0 rounded-lg bg-white"
                    >
                      <embed
                        src={`${renderUrl}#toolbar=0&navpanes=0`}
                        type="application/pdf"
                        className="w-full h-full border-0 rounded-lg bg-white"
                      />
                    </object>
                  )
                ) : (
                  <div className="text-amber-400 text-sm">Document could not be displayed.</div>
                )}
              </div>
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

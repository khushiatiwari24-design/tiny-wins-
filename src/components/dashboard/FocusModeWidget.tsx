import { useState, useEffect, useRef } from "react";
import { Headphones, Pause, Play, RotateCcw, Timer, Volume2 } from "lucide-react";
import { addReclaimedMinutes } from "../../lib/streakUtils";
import {
  focusAudio,
  FOCUS_AUDIO_TRACKS,
  type FocusAudioType,
} from "../../lib/focusAudioEngine";

interface FocusModeWidgetProps {
  onSessionComplete?: (addedMinutes: number) => void;
}

export type AmbientSoundType = FocusAudioType;

export default function FocusModeWidget({ onSessionComplete }: FocusModeWidgetProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | "custom">(25);
  const [customInput, setCustomInput] = useState<string>("15");
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Timer state
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Ambient & Study Music state (standalone + timer sync)
  const [activeTrack, setActiveTrack] = useState<FocusAudioType>(() => focusAudio.getCurrentTrack());
  const [volume, setVolume] = useState<number>(() => focusAudio.getVolume());

  const intervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Instant Playback on click (Preview & Standalone listening)
  const handleSelectTrack = (trackId: FocusAudioType) => {
    if (trackId === "off" || trackId === activeTrack) {
      focusAudio.stop();
      setActiveTrack("off");
    } else {
      focusAudio.play(trackId);
      setActiveTrack(trackId);
    }
  };

  // Live Volume Controller
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    focusAudio.setVolume(newVol);
  };

  // Sync state if audio stops externally
  useEffect(() => {
    return () => {
      // Keep audio playing if user is in standalone focus or cleans up on unmount
    };
  }, []);

  // Play audio chime using Web Audio API on session completion
  const playChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.6); // G5

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // Ignore audio policy errors
    }
  };

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Timer complete!
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setIsRunning(false);
            setIsCompleted(true);
            playChime();
            addReclaimedMinutes(durationMinutes);
            onSessionComplete?.(durationMinutes);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, durationMinutes, onSessionComplete]);

  // Select a preset duration
  const handleSelectPreset = (minutes: number) => {
    setIsCustomOpen(false);
    setSelectedPreset(minutes);
    setDurationMinutes(minutes);
    setSecondsRemaining(minutes * 60);
    setIsRunning(false);
    setIsCompleted(false);
  };

  // Select custom duration
  const handleOpenCustom = () => {
    setSelectedPreset("custom");
    setIsCustomOpen(true);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customInput, 10);
    if (!Number.isNaN(val) && val >= 1 && val <= 180) {
      setDurationMinutes(val);
      setSecondsRemaining(val * 60);
      setIsCustomOpen(false);
      setIsRunning(false);
      setIsCompleted(false);
    }
  };

  // Timer controls
  const handleStart = () => {
    setIsCompleted(false);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining(durationMinutes * 60);
    setIsCompleted(false);
  };

  // Formatting MM:SS
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const totalSeconds = durationMinutes * 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="text-orange-300" size={18} />
          <h2 className="font-semibold text-white">Focus mode</h2>
        </div>
        {isRunning && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        )}
      </div>

      {/* Countdown Display */}
      <div className="mt-4 flex items-baseline justify-between">
        <p className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white">
          {timeFormatted}
        </p>
        <span className="text-xs text-slate-400 font-medium">
          {durationMinutes} min session
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Preset Buttons */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleSelectPreset(25)}
          className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
            selectedPreset === 25 && !isCustomOpen
              ? "border-orange-300/60 bg-orange-400/20 text-orange-200"
              : "border-white/10 bg-white/[.04] text-slate-300 hover:border-orange-300/40 hover:text-orange-200"
          }`}
        >
          25 min
        </button>
        <button
          type="button"
          onClick={() => handleSelectPreset(50)}
          className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
            selectedPreset === 50 && !isCustomOpen
              ? "border-orange-300/60 bg-orange-400/20 text-orange-200"
              : "border-white/10 bg-white/[.04] text-slate-300 hover:border-orange-300/40 hover:text-orange-200"
          }`}
        >
          50 min
        </button>
        <button
          type="button"
          onClick={handleOpenCustom}
          className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
            isCustomOpen
              ? "border-orange-300/60 bg-orange-400/20 text-orange-200"
              : "border-white/10 bg-white/[.04] text-slate-300 hover:border-orange-300/40 hover:text-orange-200"
          }`}
        >
          Custom
        </button>
      </div>

      {/* Inline Custom Input */}
      {isCustomOpen && (
        <form onSubmit={handleApplyCustom} className="mt-3 flex gap-2">
          <input
            type="number"
            min={1}
            max={180}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Minutes"
            className="field py-1.5 px-3 text-xs flex-1"
            autoFocus
          />
          <button
            type="submit"
            className="rounded-lg bg-orange-300 px-3 py-1.5 text-xs font-semibold text-[#3b233a] hover:bg-orange-200"
          >
            Set
          </button>
        </form>
      )}

      {/* Action Controls */}
      <div className="mt-4 flex gap-2">
        {!isRunning ? (
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 rounded-xl bg-orange-300 py-2.5 text-sm font-semibold text-[#3b233a] shadow-lg shadow-orange-950/20 transition hover:bg-orange-200 active:scale-98 flex items-center justify-center gap-2"
          >
            <Play size={15} fill="currentColor" />
            {secondsRemaining < totalSeconds ? "Resume" : "Start focus"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            className="flex-1 rounded-xl bg-amber-400/20 border border-amber-400/40 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/30 active:scale-98 flex items-center justify-center gap-2"
          >
            <Pause size={15} fill="currentColor" />
            Pause
          </button>
        )}

        <button
          type="button"
          onClick={handleReset}
          title="Reset timer"
          className="rounded-xl border border-white/10 bg-white/[.04] px-3 text-slate-400 hover:bg-white/[.08] hover:text-white transition"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Ambient & Study Music Section */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-2.5">
          <span className="flex items-center gap-1.5 font-medium">
            <Headphones size={13} className="text-orange-300" />
            Ambient & Study Music
          </span>
          {activeTrack !== "off" ? (
            <span className="flex items-center gap-1.5 text-[10px] text-orange-200 font-medium">
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-orange-400 rounded-full animate-bounce h-2" style={{ animationDuration: '0.8s', animationDelay: '0ms' }} />
                <span className="w-0.5 bg-orange-300 rounded-full animate-bounce h-3" style={{ animationDuration: '0.8s', animationDelay: '150ms' }} />
                <span className="w-0.5 bg-amber-300 rounded-full animate-bounce h-1.5" style={{ animationDuration: '0.8s', animationDelay: '300ms' }} />
              </span>
              <span>Playing {FOCUS_AUDIO_TRACKS.find((t) => t.id === activeTrack)?.label}</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">Click to listen</span>
          )}
        </div>

        {/* Tracks Grid (Responsive 4-col + 3-col) */}
        <div className="grid grid-cols-4 gap-1.5">
          {FOCUS_AUDIO_TRACKS.map((item) => {
            const isSelected = activeTrack === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTrack(item.id)}
                title={item.description}
                className={`rounded-xl py-2 px-1 text-[11px] font-medium transition flex flex-col items-center justify-center gap-0.5 border text-center ${
                  isSelected
                    ? "border-orange-300/70 bg-gradient-to-b from-orange-400/25 to-amber-500/15 text-orange-200 shadow-sm shadow-orange-500/15"
                    : "border-white/5 bg-white/[.02] text-slate-400 hover:text-slate-200 hover:bg-white/[.05]"
                }`}
              >
                <span className="text-sm leading-none">{item.icon}</span>
                <span className="truncate max-w-full text-[10px] leading-tight font-medium mt-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Volume Slider Controller (0% - 100%) */}
        <div className="mt-3 flex items-center gap-2.5 px-1 py-1 rounded-lg bg-white/[.02] border border-white/5">
          <Volume2 size={13} className="text-slate-400 shrink-0 ml-1" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-orange-300 h-1 bg-white/10 rounded-lg cursor-pointer"
            title="Adjust volume"
          />
          <span className="text-[10px] font-mono text-slate-400 w-8 text-right shrink-0 mr-1">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {/* Completion Toast Notification */}
      {isCompleted && (
        <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2.5 text-center text-xs text-emerald-300 flex items-center justify-center gap-2">
          <Volume2 size={14} />
          <span>Focus session complete! +{durationMinutes}m reclaimed. 🎉</span>
        </div>
      )}
    </div>
  );
}

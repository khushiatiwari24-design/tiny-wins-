import { useState, useEffect, useRef } from "react";
import { Headphones, Pause, Play, RotateCcw, Timer, Volume2 } from "lucide-react";
import { addReclaimedMinutes } from "../../lib/streakUtils";

interface FocusModeWidgetProps {
  onSessionComplete?: (addedMinutes: number) => void;
}

export type AmbientSoundType = "off" | "rain" | "cafe" | "brown";

export default function FocusModeWidget({ onSessionComplete }: FocusModeWidgetProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | "custom">(25);
  const [customInput, setCustomInput] = useState<string>("15");
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Timer state
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Ambient focus sound state
  const [ambientType, setAmbientType] = useState<AmbientSoundType>("off");
  const [volume, setVolume] = useState<number>(0.6);

  const intervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  // Stop ambient sound
  const stopAmbient = () => {
    if (ambientSourceRef.current) {
      try {
        ambientSourceRef.current.stop();
        ambientSourceRef.current.disconnect();
      } catch {}
      ambientSourceRef.current = null;
    }
  };

  // Create noise buffers using Web Audio API (zero external network requests)
  const createNoiseBuffer = (ctx: AudioContext, type: "rain" | "cafe" | "brown") => {
    const bufferSize = ctx.sampleRate * 4; // 4 seconds loop
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      if (type === "rain") {
        // Soft rain: pink-filtered noise with subtle droplet variations
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99 * b0 + white * 0.05;
          b1 = 0.95 * b1 + white * 0.1;
          b2 = 0.85 * b2 + white * 0.2;
          const droplet = Math.random() > 0.998 ? Math.random() * 0.25 : 0;
          data[i] = (b0 + b1 + b2) * 0.22 + droplet;
        }
      } else if (type === "cafe") {
        // Warm cafe / pink noise (Paul Kellet algorithm)
        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        let b3 = 0;
        let b4 = 0;
        let b5 = 0;
        let b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09;
          b6 = white * 0.115926;
        }
      } else if (type === "brown") {
        // Deep brown noise (1/f^2) - low-frequency rumble for ADHD focus
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 1.8;
        }
      }
    }
    return buffer;
  };

  // Start ambient audio
  const startAmbient = (type: AmbientSoundType, vol: number) => {
    stopAmbient();
    if (type === "off") return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const buffer = createNoiseBuffer(ctx, type);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(vol * 0.25, ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.start();
      ambientSourceRef.current = source;
      ambientGainRef.current = gainNode;
    } catch {
      // AudioContext could be blocked by browser policy until interaction
    }
  };

  // Sync ambient sound with isRunning and ambientType
  useEffect(() => {
    if (isRunning && ambientType !== "off") {
      startAmbient(ambientType, volume);
    } else {
      stopAmbient();
    }
    return () => {
      stopAmbient();
    };
  }, [isRunning, ambientType]);

  // Sync volume dynamically
  useEffect(() => {
    if (ambientGainRef.current && audioCtxRef.current) {
      ambientGainRef.current.gain.setValueAtTime(
        volume * 0.25,
        audioCtxRef.current.currentTime
      );
    }
  }, [volume]);

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

      {/* Ambient Sound Selector */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Headphones size={13} className="text-orange-300" />
            Ambient focus sound
          </span>
          {ambientType !== "off" && (
            <span className="text-[10px] text-orange-200/90 font-medium">
              {isRunning ? "Active 🔊" : "On timer start"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { id: "off" as const, label: "Off", icon: "🔇" },
            { id: "rain" as const, label: "Rain", icon: "🌧️" },
            { id: "cafe" as const, label: "Cafe", icon: "☕" },
            { id: "brown" as const, label: "Brown", icon: "🌊" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAmbientType(item.id)}
              className={`rounded-lg py-1.5 text-[11px] font-medium transition flex flex-col items-center gap-0.5 border ${
                ambientType === item.id
                  ? "border-orange-300/60 bg-orange-400/20 text-orange-200 shadow-sm"
                  : "border-white/5 bg-white/[.02] text-slate-400 hover:text-slate-200 hover:bg-white/[.05]"
              }`}
            >
              <span className="text-xs">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {ambientType !== "off" && (
          <div className="mt-2.5 flex items-center gap-2 px-1">
            <Volume2 size={12} className="text-slate-400 shrink-0" />
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-orange-300 h-1 bg-white/10 rounded-lg cursor-pointer"
              title="Ambient Volume"
            />
            <span className="text-[10px] text-slate-400 w-7 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}
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

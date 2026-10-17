import { useEffect, useRef } from "react";

interface ConfettiCelebrationProps {
  active?: boolean;
  trigger?: boolean;
  onComplete?: () => void;
  durationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  tilt: number;
  tiltAngle: number;
  tiltAngleIncrement: number;
  alpha: number;
}

const COLORS = [
  "#f43f5e", // Rose
  "#8b5cf6", // Violet
  "#38bdf8", // Sky blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#a855f7", // Purple
  "#3b82f6", // Blue
  "#facc15", // Yellow
];

export default function ConfettiCelebration({
  active,
  trigger,
  onComplete,
  durationMs = 3200,
}: ConfettiCelebrationProps) {
  const isTriggered = active ?? trigger ?? false;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isTriggered) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particleCount = Math.min(100, Math.floor(width / 14));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * 200,
        y: height * 0.4 + (Math.random() - 0.5) * 80,
        w: Math.random() * 8 + 6,
        h: Math.random() * 5 + 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: Math.random() * -12 - 4,
        tilt: Math.random() * 10 - 10,
        tiltAngle: 0,
        tiltAngleIncrement: Math.random() * 0.08 + 0.04,
        alpha: 1,
      });
    }

    let animationFrameId: number;
    const startTime = Date.now();

    const render = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / durationMs;

      ctx.clearRect(0, 0, width, height);

      let anyAlive = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28; // Gravity
        p.vx *= 0.99; // Air resistance
        p.tiltAngle += p.tiltAngleIncrement;
        p.tilt = Math.sin(p.tiltAngle) * 15;

        // Fade out in the last 40% of duration
        if (progress > 0.6) {
          p.alpha = Math.max(0, 1 - (progress - 0.6) / 0.4);
        }

        if (p.alpha > 0 && p.y < height + 50) {
          anyAlive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.translate(p.x + p.tilt, p.y);
          ctx.rotate(p.tiltAngle);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      if (elapsed < durationMs && anyAlive) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
        onComplete?.();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, durationMs, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      style={{ pointerEvents: "none" }}
    />
  );
}

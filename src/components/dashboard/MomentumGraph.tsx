import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import type { Task } from "../../types/task";
import {
  getLocalDateKey,
  getCompletedDates,
  calculateBestStreak,
} from "../../lib/streakUtils";

interface MomentumGraphProps {
  tasks: Task[];
  variant?: "dashboard" | "analytics";
  title?: string;
  subtitle?: string;
}

interface DataPoint {
  date: string;
  dayLabel: string;
  fullDateLabel: string;
  totalTasks: number;
  completedTasks: number;
  percentage: number;
}

export default function MomentumGraph({
  tasks,
  variant = "dashboard",
  title = "Weekly momentum",
  subtitle = "Consistency, softly built.",
}: MomentumGraphProps) {
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly">("weekly");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const completedDates = useMemo(() => getCompletedDates(tasks), [tasks]);
  const bestStreak = useMemo(() => calculateBestStreak(completedDates), [completedDates]);

  // Generate data points based on timeframe
  const dataPoints: DataPoint[] = useMemo(() => {
    const today = new Date();
    const points: DataPoint[] = [];

    if (timeframe === "weekly") {
      // Current week Monday through Sunday
      const dayOfWeek = today.getDay();
      const distanceToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distanceToMonday);

      const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = getLocalDateKey(d);

        // Find tasks for this day
        const dayTasks = tasks.filter(
          (t) => t.dueDate === dateStr || t.updatedAt?.slice(0, 10) === dateStr
        );
        const completed = dayTasks.filter((t) => t.completed).length;

        // If tasks exist, calculate real %; if extra completions recorded, scale gracefully
        let pct = 0;
        if (dayTasks.length > 0) {
          pct = Math.round((completed / dayTasks.length) * 100);
        } else if (completedDates.has(dateStr)) {
          pct = 100;
        }

        points.push({
          date: dateStr,
          dayLabel: dayLetters[i],
          fullDateLabel: `${dayNames[i]}, ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
          totalTasks: dayTasks.length || (completed > 0 ? completed : 0),
          completedTasks: completed || (completedDates.has(dateStr) ? 1 : 0),
          percentage: pct,
        });
      }
    } else {
      // Last 30 days trailing to today
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = getLocalDateKey(d);

        const dayTasks = tasks.filter(
          (t) => t.dueDate === dateStr || t.updatedAt?.slice(0, 10) === dateStr
        );
        const completed = dayTasks.filter((t) => t.completed).length;

        let pct = 0;
        if (dayTasks.length > 0) {
          pct = Math.round((completed / dayTasks.length) * 100);
        } else if (completedDates.has(dateStr)) {
          pct = 100;
        }

        points.push({
          date: dateStr,
          dayLabel: i % 5 === 0 ? d.getDate().toString() : "·",
          fullDateLabel: d.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          totalTasks: dayTasks.length || (completed > 0 ? completed : 0),
          completedTasks: completed || (completedDates.has(dateStr) ? 1 : 0),
          percentage: pct,
        });
      }
    }

    return points;
  }, [timeframe, tasks, completedDates]);

  // Bottom stats calculations
  const totalCompletedInPeriod = useMemo(
    () => dataPoints.reduce((acc, p) => acc + p.completedTasks, 0),
    [dataPoints]
  );

  const daysWithCompletions = useMemo(
    () => dataPoints.filter((p) => p.completedTasks > 0).length,
    [dataPoints]
  );

  const consistencyRate = useMemo(() => {
    if (dataPoints.length === 0) return 0;
    return Math.round((daysWithCompletions / dataPoints.length) * 100);
  }, [daysWithCompletions, dataPoints.length]);

  // SVG Chart Geometry
  const svgWidth = 400;
  const svgHeight = 120;
  const paddingX = 16;
  const paddingY = 14;

  const pointsCoordinates = useMemo(() => {
    const usableWidth = svgWidth - paddingX * 2;
    const usableHeight = svgHeight - paddingY * 2;

    return dataPoints.map((dp, i) => {
      const x =
        paddingX +
        (dataPoints.length === 1 ? usableWidth / 2 : (i / (dataPoints.length - 1)) * usableWidth);
      // y=0 is at top, so invert: 100% -> paddingY, 0% -> svgHeight - paddingY
      const y =
        svgHeight - paddingY - (dp.percentage / 100) * usableHeight;
      return { x, y, dp };
    });
  }, [dataPoints, svgWidth, svgHeight, paddingX, paddingY]);

  // Generate SVG path for smooth line
  const linePath = useMemo(() => {
    if (pointsCoordinates.length === 0) return "";
    return pointsCoordinates.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      // Smooth cubic bezier or direct line
      const prev = pointsCoordinates[i - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, "");
  }, [pointsCoordinates]);

  // Generate SVG path for filled area underneath
  const areaPath = useMemo(() => {
    if (pointsCoordinates.length === 0) return "";
    const first = pointsCoordinates[0];
    const last = pointsCoordinates[pointsCoordinates.length - 1];
    const bottomY = svgHeight - paddingY;
    return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [linePath, pointsCoordinates, svgHeight, paddingY]);

  const isDashboard = variant === "dashboard";

  return (
    <div
      className={`rounded-2xl transition-all ${
        isDashboard
          ? "bg-[#fffaf1] p-4 sm:p-6 text-[#35415e] shadow-xl shadow-black/10 border border-[#eadfce]/70"
          : "border border-white/[.08] bg-white/[.03] p-4 sm:p-6 text-slate-100"
      }`}
    >
      {/* Header & Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p
              className={`text-xs font-semibold uppercase tracking-[.18em] ${
                isDashboard ? "text-[#c88766]" : "text-cyan-300"
              }`}
            >
              {title}
            </p>
            <TrendingUp
              size={16}
              className={isDashboard ? "text-[#e39a76]" : "text-cyan-400"}
            />
          </div>
          <h2
            className={`mt-1 text-lg sm:text-xl font-semibold ${
              isDashboard ? "text-[#2a344d]" : "text-white"
            }`}
          >
            {subtitle}
          </h2>
        </div>

        {/* View Switcher: Weekly vs Monthly */}
        <div
          className={`flex rounded-xl p-1 text-xs font-semibold ${
            isDashboard
              ? "bg-[#ede2d2] text-[#6b5a4d]"
              : "border border-white/10 bg-white/5 text-slate-400"
          }`}
        >
          <button
            type="button"
            onClick={() => setTimeframe("weekly")}
            className={`rounded-lg px-2.5 py-1 transition ${
              timeframe === "weekly"
                ? isDashboard
                  ? "bg-white text-[#d98065] shadow-sm"
                  : "bg-white/15 text-white shadow-sm"
                : "hover:text-black/80"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setTimeframe("monthly")}
            className={`rounded-lg px-2.5 py-1 transition ${
              timeframe === "monthly"
                ? isDashboard
                  ? "bg-white text-[#d98065] shadow-sm"
                  : "bg-white/15 text-white shadow-sm"
                : "hover:text-black/80"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Interactive Graph Section */}
      <div className="relative mt-5">
        {/* Hover Tooltip display */}
        {hoveredIndex !== null && pointsCoordinates[hoveredIndex] && (
          <div
            className={`pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[11px] font-semibold shadow-md transition-all ${
              isDashboard
                ? "bg-[#2d3748] text-white"
                : "border border-cyan-400/40 bg-[#0f172a] text-cyan-200"
            }`}
          >
            {pointsCoordinates[hoveredIndex].dp.fullDateLabel}:{" "}
            <span className="text-emerald-300 font-bold">
              {pointsCoordinates[hoveredIndex].dp.completedTasks} wins
            </span>{" "}
            ({pointsCoordinates[hoveredIndex].dp.percentage}%)
          </div>
        )}

        {/* SVG Area & Line Chart */}
        <div className="w-full overflow-hidden rounded-xl">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-28 sm:h-36 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id={`momentumGrad-${variant}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={isDashboard ? "#f59e0b" : "#38bdf8"}
                  stopOpacity="0.38"
                />
                <stop
                  offset="100%"
                  stopColor={isDashboard ? "#f97316" : "#1d4ed8"}
                  stopOpacity="0.0"
                />
              </linearGradient>
            </defs>

            {/* Zero Baseline guide */}
            <line
              x1={paddingX}
              y1={svgHeight - paddingY}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY}
              stroke={isDashboard ? "rgba(217,128,101,0.2)" : "rgba(255,255,255,0.08)"}
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Filled Area */}
            <path
              d={areaPath}
              fill={`url(#momentumGrad-${variant})`}
              className="transition-all duration-500 ease-out"
            />

            {/* Stroke Line */}
            <path
              d={linePath}
              fill="none"
              stroke={isDashboard ? "#e98b68" : "#38bdf8"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-500 ease-out"
            />

            {/* Data Points / Interaction dots */}
            {pointsCoordinates.map((pt, idx) => (
              <g
                key={pt.dp.date}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={() => setHoveredIndex(idx)}
              >
                {/* Hit area */}
                <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />
                {/* Visual Dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIndex === idx ? "5" : pt.dp.completedTasks > 0 ? "3.5" : "2"}
                  fill={
                    pt.dp.completedTasks > 0
                      ? isDashboard
                        ? "#d98065"
                        : "#38bdf8"
                      : isDashboard
                      ? "#b9c9dc"
                      : "#475569"
                  }
                  stroke={isDashboard ? "#ffffff" : "#080d21"}
                  strokeWidth={hoveredIndex === idx ? "2.5" : "1.5"}
                  className="transition-all duration-200"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* X-Axis Day Labels */}
        <div className="mt-2 flex items-center justify-between px-1">
          {dataPoints.map((dp, i) => (
            <span
              key={`${dp.date}-${i}`}
              className={`text-center text-[10px] font-medium transition ${
                hoveredIndex === i
                  ? isDashboard
                    ? "font-bold text-[#d98065]"
                    : "font-bold text-cyan-300"
                  : isDashboard
                  ? "text-[#8b96aa]"
                  : "text-slate-500"
              }`}
              style={{
                width: `${100 / dataPoints.length}%`,
              }}
            >
              {dp.dayLabel}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Summary Stats */}
      <div
        className={`mt-6 grid grid-cols-3 gap-2 border-t pt-4 text-center ${
          isDashboard ? "border-[#eadfce]" : "border-white/10"
        }`}
      >
        <div>
          <p
            className={`text-base sm:text-lg font-bold ${
              isDashboard ? "text-[#2a344d]" : "text-white"
            }`}
          >
            {totalCompletedInPeriod}
          </p>
          <p
            className={`text-[10px] uppercase tracking-wider ${
              isDashboard ? "text-[#8b96aa]" : "text-slate-400"
            }`}
          >
            Wins logged
          </p>
        </div>

        <div>
          <p
            className={`text-base sm:text-lg font-bold ${
              isDashboard ? "text-[#2a344d]" : "text-white"
            }`}
          >
            {bestStreak}d
          </p>
          <p
            className={`text-[10px] uppercase tracking-wider ${
              isDashboard ? "text-[#8b96aa]" : "text-slate-400"
            }`}
          >
            Best streak
          </p>
        </div>

        <div>
          <p
            className={`text-base sm:text-lg font-bold ${
              isDashboard ? "text-[#d98065]" : "text-emerald-400"
            }`}
          >
            {consistencyRate}%
          </p>
          <p
            className={`text-[10px] uppercase tracking-wider ${
              isDashboard ? "text-[#8b96aa]" : "text-slate-400"
            }`}
          >
            Consistency
          </p>
        </div>
      </div>

      {isDashboard && (
        <p className="mt-4 text-center font-serif text-xs sm:text-sm italic text-[#68748c]">
          Consistency over perfection. That&apos;s where real progress lives. 💕
        </p>
      )}
    </div>
  );
}

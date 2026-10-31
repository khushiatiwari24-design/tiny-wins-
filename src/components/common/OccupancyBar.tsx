import React from 'react';
import { CrowdSeverity } from '../../types';

interface OccupancyBarProps {
  occupancy: number;
  severity: CrowdSeverity;
  height?: string;
  showLabels?: boolean;
}

export const OccupancyBar: React.FC<OccupancyBarProps> = ({
  occupancy,
  severity,
  height = 'h-2',
  showLabels = false,
}) => {
  let barGradient = 'from-emerald-500 to-teal-500';
  if (severity === 'moderate') {
    barGradient = 'from-amber-400 to-amber-500';
  } else if (severity === 'high') {
    barGradient = 'from-orange-500 to-orange-600';
  } else if (severity === 'very_high') {
    barGradient = 'from-rose-500 to-red-600';
  }

  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>Capacity load</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{occupancy}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden ${height} relative border border-slate-200/50 dark:border-slate-700/50`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(5, occupancy))}%` }}
        />
      </div>
    </div>
  );
};

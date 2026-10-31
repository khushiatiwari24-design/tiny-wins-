import React from 'react';
import { HelpCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  changeLabel?: string;
  changePositive?: boolean;
  icon: React.ReactNode;
  tooltip: string;
  subtext?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  changeLabel,
  changePositive,
  icon,
  tooltip,
  subtext,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          <div
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help transition-colors"
            title={tooltip}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400">
            {icon}
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{unit}</span>}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        {changeLabel && (
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              changePositive
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {changeLabel}
          </span>
        )}
        {subtext && <span className="text-slate-500 dark:text-slate-400">{subtext}</span>}
      </div>
    </div>
  );
};

import React from 'react';
import { Train, Zap, ShieldAlert, Bus, CableCar, Radio } from 'lucide-react';
import { TransportMode } from '../../types';

interface ModeIconProps {
  mode: TransportMode;
  className?: string;
  showLabel?: boolean;
}

export const ModeIcon: React.FC<ModeIconProps> = ({ mode, className = 'w-4 h-4', showLabel = false }) => {
  let icon = <Train className={className} />;
  let label = 'Train';
  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  switch (mode) {
    case 'train_fast':
      icon = <Train className={className} />;
      label = 'Fast Local';
      badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60';
      break;
    case 'train_slow':
      icon = <Train className={className} />;
      label = 'Slow Local';
      badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60';
      break;
    case 'train_ac':
      icon = <Zap className={className} />;
      label = 'AC Local';
      badgeColor = 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200/60';
      break;
    case 'metro':
      icon = <Radio className={className} />;
      label = 'Metro';
      badgeColor = 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200/60';
      break;
    case 'bus_ac':
      icon = <Bus className={className} />;
      label = 'AC Bus';
      badgeColor = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/60';
      break;
    case 'bus_regular':
      icon = <Bus className={className} />;
      label = 'BEST Bus';
      badgeColor = 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200/60';
      break;
  }

  if (showLabel) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${badgeColor}`}>
        {icon}
        <span>{label}</span>
      </span>
    );
  }

  return icon;
};

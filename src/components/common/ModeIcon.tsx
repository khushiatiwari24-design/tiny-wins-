import React from 'react';
import { Train, Zap, Bus, Radio, Bike, Car, Shuffle } from 'lucide-react';
import { TransportMode } from '../../types';

interface ModeIconProps {
  mode: TransportMode;
  className?: string;
  showLabel?: boolean;
  busNumber?: string;
}

export const ModeIcon: React.FC<ModeIconProps> = ({
  mode,
  className = 'w-4 h-4',
  showLabel = false,
  busNumber,
}) => {
  let icon = <Train className={className} />;
  let label = 'Train';
  let badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60';

  switch (mode) {
    case 'train_fast':
      icon = <Train className={className} />;
      label = 'Fast Local';
      badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60';
      break;
    case 'train_slow':
      icon = <Train className={className} />;
      label = 'Slow Local';
      badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60';
      break;
    case 'train_ac':
      icon = <Zap className={className} />;
      label = 'AC Local';
      badgeColor = 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-800/60';
      break;
    case 'metro':
      icon = <Radio className={className} />;
      label = 'Metro Line';
      badgeColor = 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/60';
      break;
    case 'bus':
    case 'bus_ac':
    case 'bus_regular':
      icon = <Bus className={className} />;
      label = busNumber ? `Bus ${busNumber}` : 'BEST Bus';
      badgeColor = 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200/60 dark:border-orange-800/60';
      break;
    case 'bike':
      icon = <Bike className={className} />;
      label = 'Bike / 2-Wheeler';
      badgeColor = 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60';
      break;
    case 'car':
      icon = <Car className={className} />;
      label = 'Car / Cab';
      badgeColor = 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60';
      break;
    case 'multimodal':
      icon = <Shuffle className={className} />;
      label = 'Multi-Modal';
      badgeColor = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60';
      break;
  }

  if (showLabel) {
    if ((mode === 'bus' || mode === 'bus_ac' || mode === 'bus_regular') && busNumber) {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${badgeColor}`}>
          {icon}
          <span className="font-bold text-orange-800 dark:text-orange-200 tracking-wide bg-orange-200/60 dark:bg-orange-900/60 px-1.5 py-0.2 rounded text-[11px]">
            {busNumber}
          </span>
          <span>{mode === 'bus_ac' ? 'AC Bus' : 'BEST Bus'}</span>
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${badgeColor}`}>
        {icon}
        <span>{label}</span>
      </span>
    );
  }

  return icon;
};

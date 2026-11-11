import React from 'react';
import { Users, AlertTriangle, ShieldCheck, Flame, Car } from 'lucide-react';
import { CrowdSeverity } from '../../types';
import { getSeverityColor } from '../../services/crowdForecast';

interface CrowdBadgeProps {
  occupancy: number;
  severity: CrowdSeverity;
  size?: 'sm' | 'md' | 'lg';
  showPercent?: boolean;
  isRoadMode?: boolean;
  customLabel?: string;
}

export const CrowdBadge: React.FC<CrowdBadgeProps> = ({
  occupancy,
  severity,
  size = 'md',
  showPercent = true,
  isRoadMode = false,
  customLabel,
}) => {
  const colors = getSeverityColor(severity);

  let icon = <Users className="w-3.5 h-3.5" />;
  let label = 'Low Crowd';

  if (isRoadMode) {
    icon = <Car className="w-3.5 h-3.5 text-current" />;
    if (severity === 'low') {
      label = 'Low Traffic';
    } else if (severity === 'moderate') {
      label = 'Moderate Flow';
    } else if (severity === 'high') {
      label = 'Heavy Traffic';
    } else {
      label = 'Severe Gridlock';
    }
  } else {
    if (severity === 'low') {
      icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      label = 'Low Crowd';
    } else if (severity === 'moderate') {
      icon = <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      label = 'Moderate';
    } else if (severity === 'high') {
      icon = <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
      label = 'High Crowd';
    } else {
      icon = <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
      label = 'Crush Load';
    }
  }

  if (customLabel) {
    label = customLabel;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]}`}
    >
      <span className={`w-2 h-2 rounded-full ${colors.indicator} animate-pulse`} />
      {icon}
      <span>{label}</span>
      {showPercent && (
        <span className="opacity-90 font-semibold pl-0.5 border-l border-current/20 ml-0.5">
          {occupancy}%
        </span>
      )}
    </span>
  );
};

import { Route, CrowdPrediction, CrowdSeverity, CoachBreakdown } from '../types';

export function getSeverity(occupancy: number): CrowdSeverity {
  if (occupancy <= 45) return 'low';
  if (occupancy <= 70) return 'moderate';
  if (occupancy <= 85) return 'high';
  return 'very_high';
}

export function getSeverityLabel(severity: CrowdSeverity, isRoadMode = false): string {
  if (isRoadMode) {
    switch (severity) {
      case 'low':
        return 'Smooth Traffic (Fast commute)';
      case 'moderate':
        return 'Moderate Flow (Minor delay)';
      case 'high':
        return 'Heavy Congestion (Bottlenecks)';
      case 'very_high':
        return 'Severe Gridlock (Long delays)';
    }
  }
  switch (severity) {
    case 'low':
      return 'Comfortable (Seats likely)';
    case 'moderate':
      return 'Moderate (Standing room)';
    case 'high':
      return 'Crowded (Packed coaches)';
    case 'very_high':
      return 'Severe (Super-dense crush)';
  }
}

export function getSeverityColor(severity: CrowdSeverity): {
  bg: string;
  text: string;
  border: string;
  indicator: string;
} {
  switch (severity) {
    case 'low':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        indicator: 'bg-emerald-500',
      };
    case 'moderate':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        indicator: 'bg-amber-500',
      };
    case 'high':
      return {
        bg: 'bg-orange-50 dark:bg-orange-950/40',
        text: 'text-orange-700 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-800',
        indicator: 'bg-orange-500',
      };
    case 'very_high':
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-700 dark:text-rose-300',
        border: 'border-rose-200 dark:border-rose-800',
        indicator: 'bg-rose-600',
      };
  }
}

/**
 * Deterministic, explainable crowd forecast algorithm
 * Takes route, departure date/time, and simulation modifier (e.g. monsoon multiplier)
 */
export function predictCrowd(
  route: Route,
  timeString: string, // "HH:mm" (24h)
  isWeekend: boolean = false,
  monsoonMultiplier: 'normal' | 'light_rain' | 'heavy_rain' = 'normal'
): CrowdPrediction {
  const [hourStr, minStr] = timeString.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr || '0', 10);
  const timeDecimal = hour + minute / 60;

  const isRoad = route.mode === 'car' || route.mode === 'bike';

  // 1. Time-of-day curve (Gaussian peaks for AM 8:30-10:15 and PM 17:30-20:00)
  const amPeakDist = Math.abs(timeDecimal - 9.25);
  const pmPeakDist = Math.abs(timeDecimal - 18.5);

  let amFactor = Math.max(0, 1 - Math.pow(amPeakDist / 2.0, 2));
  let pmFactor = Math.max(0, 1 - Math.pow(pmPeakDist / 2.2, 2));

  // Directional asymmetry in Mumbai
  const isSouthbound =
    route.destinationStationId === 'churchgate' ||
    route.destinationStationId === 'csmt' ||
    route.destinationStationId === 'bkc';

  const isNorthbound =
    route.destinationStationId === 'borivali' ||
    route.destinationStationId === 'thane' ||
    route.destinationStationId === 'kalyan';

  if (isSouthbound) {
    amFactor *= 1.15;
    pmFactor *= 0.75;
  } else if (isNorthbound) {
    amFactor *= 0.75;
    pmFactor *= 1.2;
  }

  // Base diurnal demand profile
  let diurnalMultiplier = 0.25;
  if (timeDecimal >= 5 && timeDecimal < 7) {
    diurnalMultiplier = 0.35 + (timeDecimal - 5) * 0.15;
  } else if (timeDecimal >= 7 && timeDecimal < 11.5) {
    diurnalMultiplier = 0.65 + amFactor * 0.45;
  } else if (timeDecimal >= 11.5 && timeDecimal < 16.5) {
    diurnalMultiplier = 0.48;
  } else if (timeDecimal >= 16.5 && timeDecimal < 21.5) {
    diurnalMultiplier = 0.65 + pmFactor * 0.45;
  } else if (timeDecimal >= 21.5 && timeDecimal <= 24) {
    diurnalMultiplier = 0.6 - (timeDecimal - 21.5) * 0.14;
  } else {
    diurnalMultiplier = 0.15;
  }

  // Weekend reduction
  if (isWeekend) {
    diurnalMultiplier = diurnalMultiplier * 0.68 + 0.12;
  }

  // Weather / monsoon modifier
  let weatherMultiplier = 1.0;
  if (monsoonMultiplier === 'light_rain') {
    weatherMultiplier = isRoad ? 1.18 : 1.1;
  } else if (monsoonMultiplier === 'heavy_rain') {
    if (route.mode === 'car') {
      weatherMultiplier = 1.38;
    } else if (route.mode === 'bike') {
      weatherMultiplier = 1.42;
    } else if (route.mode === 'metro') {
      weatherMultiplier = 1.28;
    } else if (route.mode === 'bus_ac' || route.mode === 'bus_regular' || route.mode === 'bus') {
      weatherMultiplier = 1.25;
    } else {
      weatherMultiplier = 1.22;
    }
  }

  // Mode modifier
  let modeFactor = 1.0;
  if (route.mode === 'train_ac') modeFactor = 0.82;
  if (route.mode === 'bus_ac') modeFactor = 0.74;
  if (route.mode === 'metro') modeFactor = 0.88;
  if (route.mode === 'train_fast') modeFactor = 1.08;
  if (route.mode === 'car') modeFactor = 1.15;
  if (route.mode === 'bike') modeFactor = 0.86;
  if (route.mode === 'bus' || route.mode === 'bus_regular') modeFactor = 0.94;
  if (route.mode === 'multimodal') modeFactor = 0.80;

  // Calculate raw occupancy / congestion percentage
  let occupancy = Math.round(route.baselineOccupancy * (diurnalMultiplier / 0.85) * modeFactor * weatherMultiplier);
  occupancy = Math.max(12, Math.min(99, occupancy));

  const severity = getSeverity(occupancy);

  // Confidence calculation
  const isNight = timeDecimal < 5.5 || timeDecimal > 23.5;
  let confidenceScore = isNight ? 82 : isWeekend ? 88 : 95;
  if (monsoonMultiplier === 'heavy_rain') confidenceScore -= 6;
  const confidenceLabel = confidenceScore >= 90 ? 'High' : confidenceScore >= 80 ? 'Moderate' : 'Provisional';

  // Seating probability (or on-time reliability for road)
  let seatingProb = Math.max(4, Math.round(100 - occupancy * 1.15));
  if (route.mode === 'train_ac' || route.mode === 'bus_ac') seatingProb = Math.min(92, seatingProb + 25);
  if (route.mode === 'metro') seatingProb = Math.max(15, Math.round((100 - occupancy) * 0.7));
  if (isRoad) {
    seatingProb = Math.max(30, Math.min(98, Math.round(105 - occupancy * 0.72)));
  }

  // Wait time / traffic delay calculation
  let estimatedWaitMinutes = 0;
  if (isRoad) {
    const baseDelay = route.mode === 'car' ? 8 : 4;
    estimatedWaitMinutes = Math.max(2, Math.round(baseDelay * (occupancy / 50) * (weatherMultiplier > 1 ? 1.3 : 1)));
  } else {
    const baseFreq = (timeDecimal >= 7.5 && timeDecimal <= 10.5) || (timeDecimal >= 17 && timeDecimal <= 20.5)
      ? route.frequencyMinutes.peak
      : route.frequencyMinutes.offPeak;

    let waitMultiplier = 1.0;
    if (occupancy > 85) waitMultiplier = 1.6;
    else if (occupancy > 75) waitMultiplier = 1.25;

    estimatedWaitMinutes = Math.max(2, Math.round(baseFreq * 0.6 * waitMultiplier));
  }

  // Coach breakdown
  const coachBreakdown: CoachBreakdown = {
    general: Math.min(99, Math.round(occupancy * 1.12)),
    firstClass: Math.max(15, Math.round(occupancy * 0.78)),
    ladies: Math.max(20, Math.round(occupancy * 0.82)),
    acCoach: route.isAc ? Math.max(18, Math.round(occupancy * 0.85)) : undefined,
  };

  // Calculate optimal alternative recommendation
  let deltaMinutes = 30;
  if (timeDecimal >= 8 && timeDecimal <= 9.75) {
    deltaMinutes = -35;
  } else if (timeDecimal > 9.75 && timeDecimal <= 11) {
    deltaMinutes = 40;
  } else if (timeDecimal >= 17 && timeDecimal <= 19.25) {
    deltaMinutes = -40;
  } else if (timeDecimal > 19.25 && timeDecimal <= 20.5) {
    deltaMinutes = 35;
  } else {
    deltaMinutes = 25;
  }

  const recHour = Math.floor((timeDecimal * 60 + deltaMinutes) / 60) % 24;
  const recMin = Math.round((timeDecimal * 60 + deltaMinutes) % 60);
  const recommendedTime = `${String(Math.max(0, recHour)).padStart(2, '0')}:${String(Math.abs(recMin)).padStart(2, '0')}`;

  const recPrediction = predictCrowdRaw(route, recommendedTime, isWeekend, monsoonMultiplier);
  const occupancyDelta = recPrediction - occupancy;

  return {
    occupancy,
    severity,
    label: getSeverityLabel(severity, isRoad),
    confidenceScore,
    confidenceLabel,
    estimatedWaitMinutes,
    seatingProbability: seatingProb,
    coachBreakdown,
    recommendationDelta: {
      recommendedTime,
      occupancyDelta,
      waitTimeDelta: occupancyDelta < 0 ? -2 : 0,
      reason: isRoad
        ? occupancyDelta <= -12
          ? `Departing at ${recommendedTime} bypasses peak highway congestion by ${Math.abs(occupancyDelta)}%`
          : `At ${recommendedTime}, traffic signals and flyovers are clearer with minimal delays`
        : occupancyDelta <= -15
          ? `Departing at ${recommendedTime} reduces crowd occupancy by ${Math.abs(occupancyDelta)}%`
          : `At ${recommendedTime}, platform congestion is lower with smoother boarding`,
    },
  };
}

/**
 * Raw deterministic occupancy calculation for 24-hour charts
 */
export function predictCrowdRaw(
  route: Route,
  timeString: string,
  isWeekend: boolean = false,
  monsoonMultiplier: 'normal' | 'light_rain' | 'heavy_rain' = 'normal'
): number {
  const [hourStr, minStr] = timeString.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr || '0', 10);
  const timeDecimal = hour + minute / 60;

  const isRoad = route.mode === 'car' || route.mode === 'bike';

  const amPeakDist = Math.abs(timeDecimal - 9.25);
  const pmPeakDist = Math.abs(timeDecimal - 18.5);

  let amFactor = Math.max(0, 1 - Math.pow(amPeakDist / 2.0, 2));
  let pmFactor = Math.max(0, 1 - Math.pow(pmPeakDist / 2.2, 2));

  const isSouthbound =
    route.destinationStationId === 'churchgate' ||
    route.destinationStationId === 'csmt' ||
    route.destinationStationId === 'bkc';

  const isNorthbound =
    route.destinationStationId === 'borivali' ||
    route.destinationStationId === 'thane' ||
    route.destinationStationId === 'kalyan';

  if (isSouthbound) {
    amFactor *= 1.15;
    pmFactor *= 0.75;
  } else if (isNorthbound) {
    amFactor *= 0.75;
    pmFactor *= 1.2;
  }

  let diurnal = 0.25;
  if (timeDecimal >= 5 && timeDecimal < 7) {
    diurnal = 0.35 + (timeDecimal - 5) * 0.15;
  } else if (timeDecimal >= 7 && timeDecimal < 11.5) {
    diurnal = 0.65 + amFactor * 0.45;
  } else if (timeDecimal >= 11.5 && timeDecimal < 16.5) {
    diurnal = 0.48;
  } else if (timeDecimal >= 16.5 && timeDecimal < 21.5) {
    diurnal = 0.65 + pmFactor * 0.45;
  } else if (timeDecimal >= 21.5 && timeDecimal <= 24) {
    diurnal = 0.6 - (timeDecimal - 21.5) * 0.14;
  } else {
    diurnal = 0.15;
  }

  if (isWeekend) diurnal = diurnal * 0.68 + 0.12;

  let weather = 1.0;
  if (monsoonMultiplier === 'light_rain') weather = isRoad ? 1.18 : 1.1;
  if (monsoonMultiplier === 'heavy_rain') {
    if (route.mode === 'car') weather = 1.38;
    else if (route.mode === 'bike') weather = 1.42;
    else if (route.mode === 'metro') weather = 1.28;
    else weather = 1.22;
  }

  let modeFactor = 1.0;
  if (route.mode === 'train_ac') modeFactor = 0.82;
  if (route.mode === 'bus_ac') modeFactor = 0.74;
  if (route.mode === 'metro') modeFactor = 0.88;
  if (route.mode === 'train_fast') modeFactor = 1.08;
  if (route.mode === 'car') modeFactor = 1.15;
  if (route.mode === 'bike') modeFactor = 0.86;
  if (route.mode === 'bus' || route.mode === 'bus_regular') modeFactor = 0.94;
  if (route.mode === 'multimodal') modeFactor = 0.80;

  const raw = Math.round(route.baselineOccupancy * (diurnal / 0.85) * modeFactor * weather);
  return Math.max(12, Math.min(99, raw));
}

/**
 * Generates 24-hour time series dataset for Recharts
 */
export function generate24HourForecast(
  route: Route,
  intervalMinutes: number = 30,
  isWeekend: boolean = false,
  monsoonMultiplier: 'normal' | 'light_rain' | 'heavy_rain' = 'normal'
) {
  const points = [];
  const totalSlots = (24 * 60) / intervalMinutes;
  const isRoad = route.mode === 'car' || route.mode === 'bike';

  for (let i = 0; i < totalSlots; i++) {
    const totalMinutes = i * intervalMinutes;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const occupancy = predictCrowdRaw(route, timeStr, isWeekend, monsoonMultiplier);
    const severity = getSeverity(occupancy);

    points.push({
      time: timeStr,
      hour,
      minute,
      occupancy,
      severity,
      severityLabel: getSeverityLabel(severity, isRoad),
      comfortThreshold: 50,
      peakThreshold: 80,
    });
  }

  return points;
}

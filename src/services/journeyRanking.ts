import { MUMBAI_ROUTES, MUMBAI_STATIONS } from '../data/routes';
import { JourneyOption, RankingPriority, TransportMode } from '../types';
import { predictCrowd } from './crowdForecast';

interface SearchParams {
  originId: string;
  destinationId: string;
  departureTime: string; // "HH:mm"
  isWeekend?: boolean;
  modeFilter?: 'all' | TransportMode;
  maxCrowd?: number; // e.g. 50, 75, 100
  accessibilityPriority?: boolean;
  priority?: RankingPriority;
  monsoonMultiplier?: 'normal' | 'light_rain' | 'heavy_rain';
}

function getStation(id: string) {
  return MUMBAI_STATIONS.find((s) => s.id === id);
}

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
  let totalMin = h * 60 + m + minutesToAdd;
  if (totalMin < 0) totalMin += 24 * 60;
  totalMin = totalMin % (24 * 60);
  const newH = Math.floor(totalMin / 60);
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export function searchAndRankJourneys(params: SearchParams): JourneyOption[] {
  const {
    originId,
    destinationId,
    departureTime,
    isWeekend = false,
    modeFilter = 'all',
    maxCrowd = 100,
    accessibilityPriority = false,
    priority = 'balanced',
    monsoonMultiplier = 'normal',
  } = params;

  const originStation = getStation(originId);
  const destStation = getStation(destinationId);

  if (!originStation || !destStation) return [];

  const candidates: JourneyOption[] = [];

  // 1. Direct matching routes where both origin and destination are served
  const directRoutes = MUMBAI_ROUTES.filter((route) => {
    const originIdx = route.stops.indexOf(originId);
    const destIdx = route.stops.indexOf(destinationId);
    return originIdx !== -1 && destIdx !== -1 && originIdx < destIdx;
  });

  // Generate candidates from direct routes
  directRoutes.forEach((route, idx) => {
    // Generate 2 departure time variations (e.g. at selected time and +8 mins later)
    const departureOffsets = [0, route.frequencyMinutes.peak + 3];

    departureOffsets.forEach((offset, subIdx) => {
      const depTime = addMinutesToTime(departureTime, offset);
      const prediction = predictCrowd(route, depTime, isWeekend, monsoonMultiplier);

      const duration = route.approximateDurationMinutes;
      const arrTime = addMinutesToTime(depTime, duration);

      const crowdScore = Math.max(0, 100 - prediction.occupancy);
      const speedScore = Math.max(10, Math.round(100 - duration * 1.1));
      const convenienceScore = Math.max(10, Math.round(100 - prediction.estimatedWaitMinutes * 3));
      const accessibilityScore = Math.round(route.accessibilityRating * 20);

      const overallScore = Math.round(
        crowdScore * 0.35 + speedScore * 0.3 + convenienceScore * 0.2 + accessibilityScore * 0.15
      );

      let reason = 'Balanced travel time and predicted passenger load.';
      if (prediction.occupancy <= 45) {
        reason = 'Comfortable departure with high probability of finding seats.';
      } else if (duration <= 35) {
        reason = 'Fastest direct connection on the corridor.';
      } else if (route.isAc) {
        reason = 'Air-conditioned transit with moderated crowd density.';
      }

      const wheelchairAccessible =
        route.accessibilityRating >= 4.0 &&
        originStation.accessibility.hasRamp &&
        destStation.accessibility.hasRamp;

      candidates.push({
        id: `journey-direct-${route.id}-${offset}`,
        routeId: route.id,
        name: route.name,
        mode: route.mode,
        lineName: route.lineName,
        origin: originStation.name,
        destination: destStation.name,
        departureTime: depTime,
        arrivalTime: arrTime,
        durationMinutes: duration,
        estimatedWaitMinutes: prediction.estimatedWaitMinutes,
        prediction,
        transfers: 0,
        intermediateStopsCount: Math.max(1, route.stops.indexOf(destinationId) - route.stops.indexOf(originId) - 1),
        steps: [
          {
            type: 'transit',
            instruction: `Board ${route.name} from Platform ${route.mode.includes('train') ? '2 or 3' : 'Bay 1'}`,
            durationMinutes: duration,
            line: route.lineName,
            mode: route.mode,
            occupancy: prediction.occupancy,
            severity: prediction.severity,
          },
          {
            type: 'walk',
            instruction: `Arrive at ${destStation.name} (${destStation.accessibility.stepFreeCategory})`,
            durationMinutes: 3,
          },
        ],
        accessibility: {
          wheelchairAccessible,
          stepFreeAccess: originStation.accessibility.hasElevator && destStation.accessibility.hasElevator,
          lowFloorVehicle: route.isAc || route.mode === 'metro',
          elevatorAvailable: originStation.accessibility.hasElevator,
        },
        rankingScore: {
          overallScore,
          crowdScore,
          speedScore,
          convenienceScore,
          accessibilityScore,
        },
        recommendationReason: reason,
        isRecommended: false,
      });
    });
  });

  // 2. Multimodal Transfer Routes (if direct routes are few or as smart alternatives)
  // Mumbai Key Interchanges: Dadar (WR-CR), Andheri (WR-Metro 1), Ghatkopar (CR-Metro 1), Kurla (CR-Harbour)
  if (candidates.length < 5) {
    const interchanges = ['andheri', 'dadar', 'ghatkopar', 'kurla', 'bkc'];

    for (const transferId of interchanges) {
      if (transferId === originId || transferId === destinationId) continue;
      const transferStation = getStation(transferId);
      if (!transferStation) continue;

      const leg1Routes = MUMBAI_ROUTES.filter(
        (r) => r.stops.includes(originId) && r.stops.includes(transferId) && r.stops.indexOf(originId) < r.stops.indexOf(transferId)
      );
      const leg2Routes = MUMBAI_ROUTES.filter(
        (r) => r.stops.includes(transferId) && r.stops.includes(destinationId) && r.stops.indexOf(transferId) < r.stops.indexOf(destinationId)
      );

      if (leg1Routes.length > 0 && leg2Routes.length > 0) {
        const leg1 = leg1Routes[0];
        const leg2 = leg2Routes[0];

        const pred1 = predictCrowd(leg1, departureTime, isWeekend, monsoonMultiplier);
        const leg1Dur = Math.round(leg1.approximateDurationMinutes * 0.6);
        const transferWait = 6;
        const leg2DepTime = addMinutesToTime(departureTime, leg1Dur + transferWait);
        const pred2 = predictCrowd(leg2, leg2DepTime, isWeekend, monsoonMultiplier);

        const totalDur = leg1Dur + transferWait + Math.round(leg2.approximateDurationMinutes * 0.65);
        const avgOcc = Math.round((pred1.occupancy + pred2.occupancy) / 2);
        const compositePred = {
          ...pred1,
          occupancy: avgOcc,
          estimatedWaitMinutes: pred1.estimatedWaitMinutes + 3,
        };

        const crowdScore = Math.max(0, 100 - avgOcc);
        const speedScore = Math.max(10, Math.round(100 - totalDur * 1.1));
        const convenienceScore = 65; // transfer penalty
        const accessibilityScore = Math.round(
          ((leg1.accessibilityRating + leg2.accessibilityRating) / 2) * 20
        );

        const overallScore = Math.round(
          crowdScore * 0.35 + speedScore * 0.3 + convenienceScore * 0.2 + accessibilityScore * 0.15
        );

        candidates.push({
          id: `journey-transfer-${transferId}-${leg1.id}-${leg2.id}`,
          routeId: `${leg1.id}+${leg2.id}`,
          name: `${leg1.lineName} + ${leg2.lineName} via ${transferStation.name}`,
          mode: leg1.mode,
          lineName: `${leg1.lineName} ➔ ${leg2.lineName}`,
          origin: originStation.name,
          destination: destStation.name,
          departureTime,
          arrivalTime: addMinutesToTime(departureTime, totalDur),
          durationMinutes: totalDur,
          estimatedWaitMinutes: pred1.estimatedWaitMinutes + 4,
          prediction: compositePred,
          transfers: 1,
          intermediateStopsCount: 6,
          steps: [
            {
              type: 'transit',
              instruction: `Take ${leg1.name} to ${transferStation.name}`,
              durationMinutes: leg1Dur,
              mode: leg1.mode,
              occupancy: pred1.occupancy,
              severity: pred1.severity,
            },
            {
              type: 'transfer',
              instruction: `Interchange at ${transferStation.name} (${transferStation.accessibility.stepFreeCategory})`,
              durationMinutes: transferWait,
            },
            {
              type: 'transit',
              instruction: `Board ${leg2.name} towards ${destStation.name}`,
              durationMinutes: Math.round(leg2.approximateDurationMinutes * 0.65),
              mode: leg2.mode,
              occupancy: pred2.occupancy,
              severity: pred2.severity,
            },
          ],
          accessibility: {
            wheelchairAccessible:
              leg1.accessibilityRating >= 4.0 &&
              leg2.accessibilityRating >= 4.0 &&
              transferStation.accessibility.hasElevator,
            stepFreeAccess: transferStation.accessibility.hasElevator,
            lowFloorVehicle: leg1.isAc || leg2.isAc,
            elevatorAvailable: transferStation.accessibility.hasElevator,
          },
          rankingScore: {
            overallScore,
            crowdScore,
            speedScore,
            convenienceScore,
            accessibilityScore,
          },
          recommendationReason: `Smart interchange via ${transferStation.name} avoiding heavy bottlenecks.`,
          isRecommended: false,
        });

        if (candidates.length >= 6) break;
      }
    }
  }

  // Fallback synthetic candidate if no strict direct or 1-transfer was indexed for this specific pair
  if (candidates.length === 0) {
    const estDuration = Math.round(25 + Math.random() * 25);
    const mockRoute = MUMBAI_ROUTES[0];
    const pred = predictCrowd(mockRoute, departureTime, isWeekend, monsoonMultiplier);

    candidates.push({
      id: `journey-sim-${originId}-${destinationId}-1`,
      routeId: 'sim_metro_link',
      name: `Suburban Transit (${originStation.name} ➔ ${destStation.name})`,
      mode: 'train_fast',
      lineName: 'Mumbai Urban Transit Corridor',
      origin: originStation.name,
      destination: destStation.name,
      departureTime,
      arrivalTime: addMinutesToTime(departureTime, estDuration),
      durationMinutes: estDuration,
      estimatedWaitMinutes: pred.estimatedWaitMinutes,
      prediction: pred,
      transfers: 1,
      intermediateStopsCount: 4,
      steps: [
        {
          type: 'transit',
          instruction: `Depart from ${originStation.name} Main Line`,
          durationMinutes: Math.round(estDuration * 0.5),
          mode: 'train_fast',
          occupancy: pred.occupancy,
          severity: pred.severity,
        },
        {
          type: 'transfer',
          instruction: 'Cross-platform interchange via FOB with elevator access',
          durationMinutes: 5,
        },
        {
          type: 'transit',
          instruction: `Arrive at ${destStation.name}`,
          durationMinutes: Math.round(estDuration * 0.4),
          mode: 'metro',
          occupancy: Math.max(20, pred.occupancy - 15),
          severity: 'moderate',
        },
      ],
      accessibility: {
        wheelchairAccessible: true,
        stepFreeAccess: true,
        lowFloorVehicle: true,
        elevatorAvailable: true,
      },
      rankingScore: {
        overallScore: 84,
        crowdScore: 78,
        speedScore: 82,
        convenienceScore: 75,
        accessibilityScore: 85,
      },
      recommendationReason: 'Simulated urban link optimized for lowest transit duration.',
      isRecommended: true,
    });
  }

  // Filter by mode if specified
  let filtered = candidates;
  if (modeFilter !== 'all') {
    filtered = filtered.filter((c) => c.mode === modeFilter);
    if (filtered.length === 0) filtered = candidates; // graceful fallback
  }

  // Filter by crowd threshold if specified
  if (maxCrowd < 100) {
    const crowdFiltered = filtered.filter((c) => c.prediction.occupancy <= maxCrowd);
    if (crowdFiltered.length > 0) filtered = crowdFiltered;
  }

  // Filter or prioritize accessibility if requested
  if (accessibilityPriority) {
    filtered.sort((a, b) => b.rankingScore.accessibilityScore - a.rankingScore.accessibilityScore);
  }

  // Sorting according to selected priority
  filtered.sort((a, b) => {
    switch (priority) {
      case 'least_crowded':
        return a.prediction.occupancy - b.prediction.occupancy;
      case 'fastest':
        return a.durationMinutes - b.durationMinutes;
      case 'accessible':
        return b.rankingScore.accessibilityScore - a.rankingScore.accessibilityScore;
      case 'balanced':
      default:
        return b.rankingScore.overallScore - a.rankingScore.overallScore;
    }
  });

  // Mark top option as recommended
  if (filtered.length > 0) {
    filtered[0].isRecommended = true;
  }

  return filtered;
}

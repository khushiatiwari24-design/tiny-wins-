import { MUMBAI_ROUTES, MUMBAI_STATIONS } from '../data/routes';
import {
  JourneyOption,
  RankingPriority,
  TransportMode,
  Station,
  Route,
  BusSeatingInfo,
  CrowdPrediction,
} from '../types';
import { predictCrowd, getSeverity, getSeverityLabel } from './crowdForecast';

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

function getStation(id: string): Station | undefined {
  return MUMBAI_STATIONS.find((s) => s.id === id);
}

function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
  let totalMin = h * 60 + m + Math.round(minutesToAdd);
  if (totalMin < 0) totalMin += 24 * 60;
  totalMin = totalMin % (24 * 60);
  const newH = Math.floor(totalMin / 60);
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Haversine distance calculator between Mumbai stations
function getDistanceKm(s1: Station, s2: Station): number {
  const R = 6371;
  const dLat = ((s2.coordinates.lat - s1.coordinates.lat) * Math.PI) / 180;
  const dLng = ((s2.coordinates.lng - s1.coordinates.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((s1.coordinates.lat * Math.PI) / 180) *
      Math.cos((s2.coordinates.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straight = R * c;
  return Math.max(3.2, Math.round(straight * 1.32 * 10) / 10);
}

// Authentic BEST bus matcher for Mumbai corridors
function getBestBusDetails(origin: Station, dest: Station) {
  const o = origin.id;
  const d = dest.id;

  if ((o === 'borivali' && (d === 'churchgate' || d === 'marine_lines' || d === 'mumbai_central' || d === 'dadar')) ||
      (d === 'borivali' && (o === 'churchgate' || o === 'marine_lines' || o === 'mumbai_central' || o === 'dadar'))) {
    return {
      busNumber: 'C-40 Express',
      busType: 'Express AC' as const,
      boardingStop: `${origin.name} Station East (BEST Depot Bay 2)`,
      destinationStop: `${dest.name} Asiad Circle / Plaza`,
      frequencyText: 'Every 8-12 mins',
      fareInr: 45,
      via: 'Western Express Highway (WEH) Bus Lane via Bandra Reclamation',
    };
  }

  if ((o === 'andheri' && d === 'ghatkopar') || (d === 'andheri' && o === 'ghatkopar')) {
    return {
      busNumber: '340 Ltd',
      busType: 'Regular Non-AC' as const,
      boardingStop: `${origin.name} Station East Bus Bay`,
      destinationStop: `${dest.name} Railway Interchange Stop`,
      frequencyText: 'Every 6-9 mins',
      fareInr: 15,
      via: 'Andheri-Kurla Road via Saki Naka Junction',
    };
  }

  if ((o === 'thane' && (d === 'csmt' || d === 'dadar' || d === 'ghatkopar')) ||
      (d === 'thane' && (o === 'csmt' || o === 'dadar' || o === 'ghatkopar'))) {
    return {
      busNumber: 'C-305 Express',
      busType: 'Express AC' as const,
      boardingStop: `${origin.name} Chendani Koliwada Depot`,
      destinationStop: `${dest.name} General Post Office / TT Circle`,
      frequencyText: 'Every 12-15 mins',
      fareInr: 55,
      via: 'Eastern Express Highway (EEH) & Amar Mahal Flyover',
    };
  }

  if ((o === 'bkc' || d === 'bkc') && (o === 'kurla' || d === 'kurla')) {
    return {
      busNumber: '310 Feeder',
      busType: 'Regular Non-AC' as const,
      boardingStop: `${origin.name} West Station Bay 1`,
      destinationStop: `${dest.name} Diamond Bourse Plaza`,
      frequencyText: 'Every 3-5 mins',
      fareInr: 10,
      via: 'Kurla-BKC Elevated Link Corridor',
    };
  }

  if ((o === 'bkc' || d === 'bkc') && (o === 'bandra' || d === 'bandra')) {
    return {
      busNumber: 'A-217',
      busType: 'AC Electric' as const,
      boardingStop: `${origin.name} East Depot Bay 4`,
      destinationStop: `${dest.name} G-Block Commercial Hub`,
      frequencyText: 'Every 5-8 mins',
      fareInr: 20,
      via: 'Kalanagar Flyover & BKC Connector',
    };
  }

  if ((o === 'vashi' || d === 'vashi') && (o === 'kurla' || d === 'kurla' || o === 'bandra' || d === 'bandra')) {
    return {
      busNumber: 'C-505',
      busType: 'Express AC' as const,
      boardingStop: `${origin.name} Highway Bus Plaza`,
      destinationStop: `${dest.name} Central Bus Depot`,
      frequencyText: 'Every 12-16 mins',
      fareInr: 40,
      via: 'Sion-Panvel Expressway & Mankhurd Flyover',
    };
  }

  if ((o === 'thane' || d === 'thane') && (o === 'bkc' || d === 'bkc')) {
    return {
      busNumber: 'S-101 Chalo',
      busType: 'Chalo Luxury AC' as const,
      boardingStop: `${origin.name} Teen Hath Naka Bus Bay`,
      destinationStop: `${dest.name} ICICI Tower BKC`,
      frequencyText: 'Every 10-15 mins',
      fareInr: 75,
      via: 'EEH & Santacruz-Chembur Link Road (SCLR)',
    };
  }

  if ((o === 'borivali' || d === 'borivali') && (o === 'andheri' || d === 'andheri')) {
    return {
      busNumber: '203 Regular',
      busType: 'Regular Non-AC' as const,
      boardingStop: `${origin.name} Station West Depot`,
      destinationStop: `${dest.name} SV Road Depot`,
      frequencyText: 'Every 7-10 mins',
      fareInr: 20,
      via: 'SV Road & Link Road Corridor',
    };
  }

  // Default well-known Mumbai bus service
  return {
    busNumber: 'A-180 (AC)',
    busType: 'AC Electric' as const,
    boardingStop: `${origin.name} Station BEST Stand`,
    destinationStop: `${dest.name} Municipal Bus Bay`,
    frequencyText: 'Every 8-12 mins',
    fareInr: 30,
    via: 'Arterial City Corridor & Flyover Route',
  };
}

// Road corridor and bottleneck analyzer
function getRoadCorridorInfo(origin: Station, dest: Station, distanceKm: number) {
  const oZone = origin.zone;
  const dZone = dest.zone;

  let highway = 'Western Express Highway (WEH)';
  let bottlenecks: string[] = ['Kalanagar Junction Slowdown (+5m)'];
  let tollInr = 0;

  if (oZone === 'Western Suburbs' && dZone === 'South Mumbai') {
    highway = 'WEH & Coastal Road / Sea Link';
    bottlenecks = ['Goregaon-Jogeshwari Flyover Bottleneck (+8m)', 'Worli Seaface Merge (+6m)'];
    tollInr = 85;
  } else if (origin.id === 'andheri' && dest.id === 'ghatkopar') {
    highway = 'Andheri-Ghatkopar Link Road & JVLR';
    bottlenecks = ['Marol Naka Signal Queue (+7m)', 'Asalpha Junction Slowdown (+4m)'];
  } else if (oZone === 'Thane' || dZone === 'Thane' || oZone === 'Central Suburbs') {
    highway = 'Eastern Express Highway (EEH) & Eastern Freeway';
    bottlenecks = ['Chedda Nagar Junction Delay (+9m)', 'Amar Mahal Flyover Merge (+5m)'];
  } else if (origin.id === 'vashi' || dest.id === 'vashi') {
    highway = 'Sion-Panvel Expressway & Eastern Freeway';
    bottlenecks = ['Vashi Creek Bridge Toll Queue (+7m)', 'Sion Circle Slowdown (+6m)'];
    tollInr = 45;
  } else {
    highway = 'SV Road & City Arterial Highway';
    bottlenecks = ['Bandra SV Road Junction Delay (+6m)'];
  }

  return { highway, bottlenecks, tollInr };
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
  const distanceKm = getDistanceKm(originStation, destStation);

  // Time calculations
  const [hourStr, minStr] = departureTime.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr || '0', 10);
  const timeDecimal = hour + minute / 60;
  const isPeak =
    (timeDecimal >= 8.25 && timeDecimal <= 10.75) ||
    (timeDecimal >= 17.5 && timeDecimal <= 20.5);

  // Helper mock route for calculations
  const makeMockRoute = (id: string, name: string, mode: TransportMode, baseOcc: number, duration: number, isAc = false): Route => ({
    id,
    name,
    lineName: name,
    corridor: `${originStation.name} – ${destStation.name} Corridor`,
    mode,
    originStationId: originStation.id,
    destinationStationId: destStation.id,
    stops: [originStation.id, destStation.id],
    approximateDurationMinutes: duration,
    frequencyMinutes: { peak: 4, offPeak: 9 },
    baselineOccupancy: baseOcc,
    accessibilityRating: isAc ? 4.5 : 3.5,
    isAc,
    fareInr: 20,
    operatesFrom: '04:00',
    operatesTo: '01:30',
    carbonSavedKg: 3.5,
  });

  // ==========================================
  // 1. FAST TRAIN OPTION (train_fast)
  // ==========================================
  {
    const directFast = MUMBAI_ROUTES.find(
      (r) =>
        r.mode === 'train_fast' &&
        r.stops.includes(originId) &&
        r.stops.includes(destinationId) &&
        r.stops.indexOf(originId) < r.stops.indexOf(destinationId)
    );

    const dur = directFast
      ? directFast.approximateDurationMinutes
      : Math.max(16, Math.round(distanceKm * 1.25));
    const mockR = directFast || makeMockRoute(`train_fast_${originId}_${destIdSafe(destStation.id)}`, 'Western/Central Fast Local', 'train_fast', 84, dur);
    const pred = predictCrowd(mockR, departureTime, isWeekend, monsoonMultiplier);
    const arrTime = addMinutesToTime(departureTime, dur);

    candidates.push({
      id: `opt-train-fast-${originId}-${destinationId}`,
      routeId: mockR.id,
      name: directFast ? directFast.name : `Fast Suburban Local (${originStation.name} ➔ ${destStation.name})`,
      mode: 'train_fast',
      lineName: directFast ? directFast.lineName : 'Suburban Fast Arterial',
      origin: originStation.name,
      destination: destStation.name,
      departureTime,
      arrivalTime: arrTime,
      durationMinutes: dur,
      estimatedWaitMinutes: pred.estimatedWaitMinutes,
      prediction: pred,
      transfers: directFast ? 0 : 1,
      intermediateStopsCount: Math.max(2, Math.round(dur / 9)),
      steps: [
        {
          type: 'transit',
          instruction: `Board Fast Suburban Local from Platform ${originStation.platforms > 4 ? '3 or 4 (Fast Line)' : '1'}`,
          durationMinutes: dur,
          mode: 'train_fast',
          occupancy: pred.occupancy,
          severity: pred.severity,
        },
        {
          type: 'walk',
          instruction: `Arrive at ${destStation.name} (${destStation.accessibility.stepFreeCategory})`,
          durationMinutes: 3,
        },
      ],
      accessibility: {
        wheelchairAccessible: originStation.accessibility.hasRamp && destStation.accessibility.hasRamp,
        stepFreeAccess: originStation.accessibility.hasElevator && destStation.accessibility.hasElevator,
        lowFloorVehicle: false,
        elevatorAvailable: originStation.accessibility.hasElevator,
      },
      rankingScore: {
        overallScore: Math.round((100 - pred.occupancy) * 0.35 + Math.max(10, 100 - dur * 1.1) * 0.3 + 80 * 0.2 + 65 * 0.15),
        crowdScore: Math.max(0, 100 - pred.occupancy),
        speedScore: Math.max(10, Math.round(100 - dur * 1.1)),
        convenienceScore: 82,
        accessibilityScore: 65,
      },
      recommendationReason: 'High-speed arterial suburban connection skipping minor stations.',
      isRecommended: false,
    });
  }

  // ==========================================
  // 2. SLOW TRAIN OPTION (train_slow)
  // ==========================================
  {
    const directSlow = MUMBAI_ROUTES.find(
      (r) =>
        r.mode === 'train_slow' &&
        r.stops.includes(originId) &&
        r.stops.includes(destinationId) &&
        r.stops.indexOf(originId) < r.stops.indexOf(destinationId)
    );

    const dur = directSlow
      ? directSlow.approximateDurationMinutes
      : Math.max(22, Math.round(distanceKm * 1.65));
    const mockR = directSlow || makeMockRoute(`train_slow_${originId}_${destIdSafe(destStation.id)}`, 'Suburban Slow Local (All-Stops)', 'train_slow', 68, dur);
    const pred = predictCrowd(mockR, departureTime, isWeekend, monsoonMultiplier);
    const arrTime = addMinutesToTime(departureTime, dur);

    candidates.push({
      id: `opt-train-slow-${originId}-${destinationId}`,
      routeId: mockR.id,
      name: directSlow ? directSlow.name : `Slow Suburban Local (${originStation.name} ➔ ${destStation.name})`,
      mode: 'train_slow',
      lineName: directSlow ? directSlow.lineName : 'Suburban Slow Line',
      origin: originStation.name,
      destination: destStation.name,
      departureTime,
      arrivalTime: arrTime,
      durationMinutes: dur,
      estimatedWaitMinutes: pred.estimatedWaitMinutes,
      prediction: pred,
      transfers: directSlow ? 0 : 1,
      intermediateStopsCount: Math.max(4, Math.round(dur / 5)),
      steps: [
        {
          type: 'transit',
          instruction: `Board Slow Local (All-Stops) from Platform ${originStation.platforms > 2 ? '1 or 2' : '1'}`,
          durationMinutes: dur,
          mode: 'train_slow',
          occupancy: pred.occupancy,
          severity: pred.severity,
        },
        {
          type: 'walk',
          instruction: `Alight at ${destStation.name} with ramp access`,
          durationMinutes: 3,
        },
      ],
      accessibility: {
        wheelchairAccessible: originStation.accessibility.hasRamp && destStation.accessibility.hasRamp,
        stepFreeAccess: originStation.accessibility.hasElevator && destStation.accessibility.hasElevator,
        lowFloorVehicle: false,
        elevatorAvailable: originStation.accessibility.hasElevator,
      },
      rankingScore: {
        overallScore: Math.round((100 - pred.occupancy) * 0.35 + Math.max(10, 100 - dur * 1.1) * 0.3 + 75 * 0.2 + 60 * 0.15),
        crowdScore: Math.max(0, 100 - pred.occupancy),
        speedScore: Math.max(10, Math.round(100 - dur * 1.1)),
        convenienceScore: 78,
        accessibilityScore: 60,
      },
      recommendationReason: 'All-stops local service with frequent halts and predictable boarding.',
      isRecommended: false,
    });
  }

  // ==========================================
  // 3. AC TRAIN OPTION (train_ac)
  // ==========================================
  {
    const directAc = MUMBAI_ROUTES.find(
      (r) =>
        r.mode === 'train_ac' &&
        r.stops.includes(originId) &&
        r.stops.includes(destinationId) &&
        r.stops.indexOf(originId) < r.stops.indexOf(destinationId)
    );

    const dur = directAc
      ? directAc.approximateDurationMinutes
      : Math.max(15, Math.round(distanceKm * 1.22));
    const mockR = directAc || makeMockRoute(`train_ac_${originId}_${destIdSafe(destStation.id)}`, 'Suburban AC Fast Local', 'train_ac', 60, dur, true);
    const pred = predictCrowd(mockR, departureTime, isWeekend, monsoonMultiplier);
    const arrTime = addMinutesToTime(departureTime, dur);

    candidates.push({
      id: `opt-train-ac-${originId}-${destinationId}`,
      routeId: mockR.id,
      name: directAc ? directAc.name : `AC Fast Express Local (${originStation.name} ➔ ${destStation.name})`,
      mode: 'train_ac',
      lineName: directAc ? directAc.lineName : 'AC Suburban Fleet',
      origin: originStation.name,
      destination: destStation.name,
      departureTime,
      arrivalTime: arrTime,
      durationMinutes: dur,
      estimatedWaitMinutes: Math.max(4, pred.estimatedWaitMinutes + 2),
      prediction: pred,
      transfers: directAc ? 0 : 1,
      intermediateStopsCount: Math.max(2, Math.round(dur / 9)),
      steps: [
        {
          type: 'transit',
          instruction: `Board Air-Conditioned Suburban Train from Fast Platform (Coach vestibule)`,
          durationMinutes: dur,
          mode: 'train_ac',
          occupancy: pred.occupancy,
          severity: pred.severity,
        },
        {
          type: 'walk',
          instruction: `Alight at ${destStation.name} with escalator access to concourse`,
          durationMinutes: 3,
        },
      ],
      accessibility: {
        wheelchairAccessible: true,
        stepFreeAccess: originStation.accessibility.hasElevator && destStation.accessibility.hasElevator,
        lowFloorVehicle: true,
        elevatorAvailable: originStation.accessibility.hasElevator,
      },
      rankingScore: {
        overallScore: Math.round((100 - pred.occupancy) * 0.35 + Math.max(10, 100 - dur * 1.1) * 0.3 + 85 * 0.2 + 88 * 0.15),
        crowdScore: Math.max(0, 100 - pred.occupancy),
        speedScore: Math.max(10, Math.round(100 - dur * 1.1)),
        convenienceScore: 85,
        accessibilityScore: 88,
      },
      recommendationReason: 'Climate-controlled vestibule with automatic closed doors & lower crush density.',
      isRecommended: false,
    });
  }

  // ==========================================
  // 4. METRO LINE OPTION (metro)
  // ==========================================
  {
    const directMetro = MUMBAI_ROUTES.find(
      (r) =>
        r.mode === 'metro' &&
        r.stops.includes(originId) &&
        r.stops.includes(destinationId) &&
        r.stops.indexOf(originId) < r.stops.indexOf(destinationId)
    );

    const dur = directMetro
      ? directMetro.approximateDurationMinutes
      : Math.max(18, Math.round(distanceKm * 1.45));
    const mockR = directMetro || makeMockRoute(`metro_${originId}_${destIdSafe(destStation.id)}`, 'Mumbai Metro Network', 'metro', 54, dur, true);
    const pred = predictCrowd(mockR, departureTime, isWeekend, monsoonMultiplier);
    const arrTime = addMinutesToTime(departureTime, dur);

    candidates.push({
      id: `opt-metro-${originId}-${destinationId}`,
      routeId: mockR.id,
      name: directMetro ? directMetro.name : `Metro Network Line (${originStation.name} ➔ ${destStation.name})`,
      mode: 'metro',
      lineName: directMetro ? directMetro.lineName : 'Mumbai Metro Authority',
      origin: originStation.name,
      destination: destStation.name,
      departureTime,
      arrivalTime: arrTime,
      durationMinutes: dur,
      estimatedWaitMinutes: 3,
      prediction: pred,
      transfers: directMetro ? 0 : 1,
      intermediateStopsCount: Math.max(2, Math.round(dur / 4.5)),
      steps: [
        {
          type: 'transit',
          instruction: `Enter via Concourse Gates & board Metro train from Platform 1 (Level Boarding)`,
          durationMinutes: dur,
          mode: 'metro',
          occupancy: pred.occupancy,
          severity: pred.severity,
        },
        {
          type: 'walk',
          instruction: `Exit via dedicated step-free skywalk / elevator to street level`,
          durationMinutes: 2,
        },
      ],
      accessibility: {
        wheelchairAccessible: true,
        stepFreeAccess: true,
        lowFloorVehicle: true,
        elevatorAvailable: true,
      },
      rankingScore: {
        overallScore: Math.round((100 - pred.occupancy) * 0.35 + Math.max(10, 100 - dur * 1.1) * 0.3 + 92 * 0.2 + 96 * 0.15),
        crowdScore: Math.max(0, 100 - pred.occupancy),
        speedScore: Math.max(10, Math.round(100 - dur * 1.1)),
        convenienceScore: 92,
        accessibilityScore: 96,
      },
      recommendationReason: '100% step-free accessibility with high frequency & CBTC automation.',
      isRecommended: false,
    });
  }

  // ==========================================
  // 5. BEST BUS WITH ROUTE NUMBER (bus_ac / bus)
  // ==========================================
  {
    const busDetails = getBestBusDetails(originStation, destStation);
    const busDur = Math.max(24, Math.round(distanceKm * (isPeak ? 2.5 : 1.9)));
    const mockR = makeMockRoute(`bus_${busDetails.busNumber}_${originId}`, `BEST Bus ${busDetails.busNumber}`, 'bus_ac', 58, busDur, true);
    const pred = predictCrowd(mockR, departureTime, isWeekend, monsoonMultiplier);
    const arrTime = addMinutesToTime(departureTime, busDur);

    const seatsAvail = pred.occupancy <= 50 ? 14 : pred.occupancy <= 75 ? 5 : 0;
    const standingInfo: BusSeatingInfo = {
      seatsAvailable: seatsAvail,
      standingRoom:
        seatsAvail > 0
          ? 'Seats Available'
          : pred.occupancy <= 85
          ? 'Ample Standing'
          : 'Dense Standing',
    };

    candidates.push({
      id: `opt-bus-${busDetails.busNumber.replace(/\s+/g, '_')}-${originId}`,
      routeId: `bus_${busDetails.busNumber.toLowerCase()}`,
      name: `BEST Bus ${busDetails.busNumber}`,
      mode: 'bus_ac',
      lineName: `BEST ${busDetails.busType}`,
      origin: originStation.name,
      destination: destStation.name,
      departureTime,
      arrivalTime: arrTime,
      durationMinutes: busDur,
      estimatedWaitMinutes: Math.max(5, Math.round(pred.estimatedWaitMinutes * 1.4)),
      prediction: pred,
      transfers: 0,
      intermediateStopsCount: Math.max(5, Math.round(distanceKm * 0.8)),
      busNumber: busDetails.busNumber,
      busType: busDetails.busType,
      boardingStop: busDetails.boardingStop,
      destinationStop: busDetails.destinationStop,
      frequencyText: busDetails.frequencyText,
      busSeatingAvailability: standingInfo,
      steps: [
        {
          type: 'walk',
          instruction: `Walk 3 mins to ${busDetails.boardingStop}`,
          durationMinutes: 3,
        },
        {
          type: 'transit',
          instruction: `Board BEST Bus ${busDetails.busNumber} (${busDetails.busType}) via ${busDetails.via}`,
          durationMinutes: busDur - 5,
          mode: 'bus_ac',
          busNumber: busDetails.busNumber,
          occupancy: pred.occupancy,
          severity: pred.severity,
        },
        {
          type: 'walk',
          instruction: `Alight at ${busDetails.destinationStop}`,
          durationMinutes: 2,
        },
      ],
      accessibility: {
        wheelchairAccessible: true,
        stepFreeAccess: true,
        lowFloorVehicle: true,
        elevatorAvailable: false,
      },
      rankingScore: {
        overallScore: Math.round((100 - pred.occupancy) * 0.35 + Math.max(10, 100 - busDur * 1.1) * 0.3 + 74 * 0.2 + 82 * 0.15),
        crowdScore: Math.max(0, 100 - pred.occupancy),
        speedScore: Math.max(10, Math.round(100 - busDur * 1.1)),
        convenienceScore: 76,
        accessibilityScore: 82,
      },
      recommendationReason: `Direct city transit via ${busDetails.busNumber} with low-floor boarding & AC comfort.`,
      isRecommended: false,
    });
  }

  // ==========================================
  // 6. BIKE / TWO-WHEELER (bike)
  // ==========================================
  {
    const roadInfo = getRoadCorridorInfo(originStation, destStation, distanceKm);
    // Bikes can filter lanes during peak traffic, maintaining 28-36 km/h
    const bikeSpeed = isPeak ? 26 : 38;
    const bikeDur = Math.max(14, Math.round((distanceKm / bikeSpeed) * 60));
    const mockR = makeMockRoute(`bike_${originId}_${destStation.id}`, 'Bike Two-Wheeler Route', 'bike', 52, bikeDur);
    const pred = predictCrowd(mockR, departureTime, isWeekend, monsoonMultiplier);
    const arrTime = addMinutesToTime(departureTime, bikeDur);

    const trafficLev = pred.occupancy <= 45 ? 'Low Traffic' : pred.occupancy <= 72 ? 'Moderate Flow' : 'Heavy Congestion';

    candidates.push({
      id: `opt-bike-${originId}-${destinationId}`,
      routeId: `bike_${originId}_${destStation.id}`,
      name: `Bike / Two-Wheeler (${originStation.name} ➔ ${destStation.name})`,
      mode: 'bike',
      lineName: 'Two-Wheeler Road Network',
      origin: originStation.name,
      destination: destStation.name,
      departureTime,
      arrivalTime: arrTime,
      durationMinutes: bikeDur,
      estimatedWaitMinutes: isPeak ? 4 : 2, // Traffic buffer / signal delays
      prediction: pred,
      transfers: 0,
      intermediateStopsCount: 0,
      isRoadMode: true,
      trafficCongestion: pred.occupancy,
      trafficLevel: trafficLev as any,
      activeBottlenecks: roadInfo.bottlenecks,
      travelReliability: pred.seatingProbability, // On-time reliability %
      steps: [
        {
          type: 'ride',
          instruction: `Start two-wheeler ride from ${originStation.name} designated parking bay`,
          durationMinutes: 2,
          mode: 'bike',
        },
        {
          type: 'ride',
          instruction: `Navigate via ${roadInfo.highway} (${distanceKm} km) with agile lane filtering`,
          durationMinutes: bikeDur - 4,
          mode: 'bike',
          roadName: roadInfo.highway,
          occupancy: pred.occupancy,
          severity: pred.severity,
        },
        {
          type: 'ride',
          instruction: `Arrive and park at ${destStation.name} dedicated 2-wheeler bay`,
          durationMinutes: 2,
          mode: 'bike',
        },
      ],
      accessibility: {
        wheelchairAccessible: false,
        stepFreeAccess: false,
        lowFloorVehicle: false,
        elevatorAvailable: false,
      },
      rankingScore: {
        overallScore: Math.round((100 - pred.occupancy) * 0.35 + Math.max(10, 100 - bikeDur * 1.1) * 0.3 + 88 * 0.2 + 30 * 0.15),
        crowdScore: Math.max(0, 100 - pred.occupancy),
        speedScore: Math.max(10, Math.round(100 - bikeDur * 1.1)),
        convenienceScore: 88,
        accessibilityScore: 30,
      },
      recommendationReason: 'Agile two-wheeler transit filtering through traffic gridlocks with minimal signal delays.',
      isRecommended: false,
    });
  }

  // ==========================================
  // 7. CAR / CAB (car)
  // ==========================================
  {
    const roadInfo = getRoadCorridorInfo(originStation, destStation, distanceKm);
    // Cars face heavier gridlock at peak flyover bottlenecks
    const carSpeed = isPeak ? 20 : 34;
    const carDur = Math.max(18, Math.round((distanceKm / carSpeed) * 60));
    const mockR = makeMockRoute(`car_${originId}_${destStation.id}`, 'Car / Cab Express Route', 'car', 65, carDur);
    const pred = predictCrowd(mockR, departureTime, isWeekend, monsoonMultiplier);
    const arrTime = addMinutesToTime(departureTime, carDur);

    const trafficLev =
      pred.occupancy <= 45
        ? 'Low Traffic'
        : pred.occupancy <= 72
        ? 'Moderate Flow'
        : pred.occupancy <= 86
        ? 'Heavy Congestion'
        : 'Severe Gridlock';

    candidates.push({
      id: `opt-car-${originId}-${destinationId}`,
      routeId: `car_${originId}_${destStation.id}`,
      name: `Car / Cab (${originStation.name} ➔ ${destStation.name})`,
      mode: 'car',
      lineName: 'Mumbai Highway Arterial',
      origin: originStation.name,
      destination: destStation.name,
      departureTime,
      arrivalTime: arrTime,
      durationMinutes: carDur,
      estimatedWaitMinutes: isPeak ? 9 : 4, // Traffic delay buffer
      prediction: pred,
      transfers: 0,
      intermediateStopsCount: 0,
      isRoadMode: true,
      trafficCongestion: pred.occupancy,
      trafficLevel: trafficLev as any,
      activeBottlenecks: roadInfo.bottlenecks,
      travelReliability: pred.seatingProbability,
      tollCostInr: roadInfo.tollInr,
      steps: [
        {
          type: 'drive',
          instruction: `Board Cab / vehicle at ${originStation.name} passenger drop/pickup lane`,
          durationMinutes: 3,
          mode: 'car',
        },
        {
          type: 'drive',
          instruction: `Drive via ${roadInfo.highway} (${distanceKm} km)${roadInfo.tollInr > 0 ? ` [₹${roadInfo.tollInr} Toll corridor]` : ''}`,
          durationMinutes: carDur - 6,
          mode: 'car',
          roadName: roadInfo.highway,
          occupancy: pred.occupancy,
          severity: pred.severity,
        },
        {
          type: 'drive',
          instruction: `Arrive at ${destStation.name} entrance curb`,
          durationMinutes: 3,
          mode: 'car',
        },
      ],
      accessibility: {
        wheelchairAccessible: true,
        stepFreeAccess: true,
        lowFloorVehicle: true,
        elevatorAvailable: false,
      },
      rankingScore: {
        overallScore: Math.round((100 - pred.occupancy) * 0.35 + Math.max(10, 100 - carDur * 1.1) * 0.3 + 82 * 0.2 + 85 * 0.15),
        crowdScore: Math.max(0, 100 - pred.occupancy),
        speedScore: Math.max(10, Math.round(100 - carDur * 1.1)),
        convenienceScore: 84,
        accessibilityScore: 85,
      },
      recommendationReason: `Door-to-door AC climate-controlled private ride${roadInfo.tollInr > 0 ? ' via fast toll bypass' : ''}.`,
      isRecommended: false,
    });
  }

  // ==========================================
  // 8. MULTI-MODAL COMBINATION (multimodal)
  // ==========================================
  {
    const busDetails = getBestBusDetails(originStation, destStation);
    const multiDur = Math.max(20, Math.round(distanceKm * 1.35));
    const mockR = makeMockRoute(`multi_${originId}_${destStation.id}`, 'Multi-Modal Combined Service', 'multimodal', 48, multiDur);
    const pred = predictCrowd(mockR, departureTime, isWeekend, monsoonMultiplier);
    const arrTime = addMinutesToTime(departureTime, multiDur);

    candidates.push({
      id: `opt-multi-${originId}-${destinationId}`,
      routeId: `multi_${originId}_${destStation.id}`,
      name: `Multi-Modal: Feeder Bus ${busDetails.busNumber} + Fast Local`,
      mode: 'multimodal',
      lineName: 'Intermodal Transfer Corridor',
      origin: originStation.name,
      destination: destStation.name,
      departureTime,
      arrivalTime: arrTime,
      durationMinutes: multiDur,
      estimatedWaitMinutes: 5,
      prediction: pred,
      transfers: 1,
      intermediateStopsCount: 4,
      steps: [
        {
          type: 'transit',
          instruction: `Take BEST Feeder ${busDetails.busNumber} to major railway hub`,
          durationMinutes: Math.round(multiDur * 0.35),
          mode: 'bus_ac',
          busNumber: busDetails.busNumber,
          occupancy: Math.max(20, pred.occupancy - 10),
          severity: 'low',
        },
        {
          type: 'transfer',
          instruction: 'Fast 4-min cross-platform interchange with escalator access',
          durationMinutes: 4,
        },
        {
          type: 'transit',
          instruction: `Board Fast Suburban Local connecting to ${destStation.name}`,
          durationMinutes: Math.round(multiDur * 0.55),
          mode: 'train_fast',
          occupancy: pred.occupancy,
          severity: pred.severity,
        },
      ],
      accessibility: {
        wheelchairAccessible: true,
        stepFreeAccess: originStation.accessibility.hasElevator && destStation.accessibility.hasElevator,
        lowFloorVehicle: true,
        elevatorAvailable: true,
      },
      rankingScore: {
        overallScore: Math.round((100 - pred.occupancy) * 0.35 + Math.max(10, 100 - multiDur * 1.1) * 0.3 + 86 * 0.2 + 82 * 0.15),
        crowdScore: Math.max(0, 100 - pred.occupancy),
        speedScore: Math.max(10, Math.round(100 - multiDur * 1.1)),
        convenienceScore: 86,
        accessibilityScore: 82,
      },
      recommendationReason: 'Smart multi-modal link avoiding road bottleneck delays with high seating chance.',
      isRecommended: false,
    });
  }

  // Mark whether each journey exceeds the user's max crowd tolerance
  candidates.forEach((c) => {
    c.exceedsCrowdThreshold = c.prediction.occupancy > maxCrowd;
  });

  // Filter by mode if specific mode selected
  let results = candidates;
  if (modeFilter !== 'all') {
    if (modeFilter === 'bus' || modeFilter === 'bus_ac' || modeFilter === 'bus_regular') {
      results = candidates.filter((c) => c.mode === 'bus_ac' || c.mode === 'bus_regular' || c.mode === 'bus');
    } else {
      results = candidates.filter((c) => c.mode === modeFilter);
    }
    // Fallback if no specific match
    if (results.length === 0) results = candidates;
  }

  // Sorting logic based on selected priority
  // If maxCrowd < 100, compliant options are prioritized first, then non-compliant options follow with warning badges
  results.sort((a, b) => {
    if (maxCrowd < 100) {
      if (a.exceedsCrowdThreshold && !b.exceedsCrowdThreshold) return 1;
      if (!a.exceedsCrowdThreshold && b.exceedsCrowdThreshold) return -1;
    }

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

  // Top compliant journey is recommended
  if (results.length > 0) {
    results[0].isRecommended = true;
  }

  return results;
}

function destIdSafe(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '_');
}

export type TransportMode =
  | 'train_fast'
  | 'train_slow'
  | 'train_ac'
  | 'metro'
  | 'bus'
  | 'bus_ac'
  | 'bus_regular'
  | 'bike'
  | 'car'
  | 'multimodal';

export type CrowdSeverity = 'low' | 'moderate' | 'high' | 'very_high';

export interface CoachBreakdown {
  general: number;
  firstClass: number;
  ladies: number;
  acCoach?: number;
}

export interface RecommendationDelta {
  recommendedTime: string;
  occupancyDelta: number; // Negative means less crowded
  waitTimeDelta: number;
  reason: string;
}

export interface CrowdPrediction {
  occupancy: number; // 0 to 100 (For road: traffic congestion %)
  severity: CrowdSeverity;
  label: string;
  confidenceScore: number; // e.g. 94%
  confidenceLabel: 'High' | 'Moderate' | 'Provisional';
  estimatedWaitMinutes: number;
  seatingProbability: number; // 0 to 100 (For road: on-time reliability %)
  coachBreakdown: CoachBreakdown;
  recommendationDelta?: RecommendationDelta;
}

export interface StationAccessibility {
  hasElevator: boolean;
  hasRamp: boolean;
  hasTactilePaving: boolean;
  hasWheelchairAssistance: boolean;
  hasEscalator: boolean;
  accessibleRestrooms: boolean;
  assistancePhone: string;
  stepFreeCategory: 'Fully Step-Free' | 'Partially Step-Free' | 'Assisted Only';
}

export interface Station {
  id: string;
  name: string;
  code: string;
  lines: string[];
  zone: 'South Mumbai' | 'Western Suburbs' | 'Central Suburbs' | 'Navi Mumbai' | 'Thane';
  accessibility: StationAccessibility;
  interchangeWith: string[];
  platforms: number;
  coordinates: { lat: number; lng: number };
}

export interface Route {
  id: string;
  name: string;
  lineName: string;
  corridor: string;
  mode: TransportMode;
  originStationId: string;
  destinationStationId: string;
  stops: string[]; // station IDs in sequence
  approximateDurationMinutes: number;
  frequencyMinutes: {
    peak: number;
    offPeak: number;
  };
  baselineOccupancy: number; // 0-100 base load
  accessibilityRating: number; // 1-5
  isAc: boolean;
  fareInr: number;
  operatesFrom: string;
  operatesTo: string;
  carbonSavedKg: number;
  busNumber?: string;
}

export interface JourneyStep {
  type: 'walk' | 'transit' | 'transfer' | 'drive' | 'ride';
  instruction: string;
  durationMinutes: number;
  platform?: string;
  line?: string;
  mode?: TransportMode;
  occupancy?: number;
  severity?: CrowdSeverity;
  busNumber?: string;
  roadName?: string;
}

export interface BusSeatingInfo {
  seatsAvailable: number;
  standingRoom: 'Ample Standing' | 'Limited Standing' | 'Dense Standing' | 'Seats Available';
}

export interface JourneyOption {
  id: string;
  routeId: string;
  name: string;
  mode: TransportMode;
  lineName: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  estimatedWaitMinutes: number; // Transit platform/stop wait, or Road traffic delay
  prediction: CrowdPrediction;
  transfers: number;
  intermediateStopsCount: number;
  steps: JourneyStep[];
  accessibility: {
    wheelchairAccessible: boolean;
    stepFreeAccess: boolean;
    lowFloorVehicle: boolean;
    elevatorAvailable: boolean;
  };
  rankingScore: {
    overallScore: number; // 0 to 100
    crowdScore: number;
    speedScore: number;
    convenienceScore: number;
    accessibilityScore: number;
  };
  recommendationReason: string;
  isRecommended: boolean;

  // BEST Bus specific fields
  busNumber?: string;
  busType?: 'AC Electric' | 'Express AC' | 'Regular Non-AC' | 'Chalo Luxury AC';
  boardingStop?: string;
  destinationStop?: string;
  frequencyText?: string;
  busSeatingAvailability?: BusSeatingInfo;

  // Road mode specific fields (Car / Bike)
  isRoadMode?: boolean;
  trafficCongestion?: number;
  trafficLevel?: 'Low Traffic' | 'Moderate Flow' | 'Heavy Congestion' | 'Severe Gridlock';
  activeBottlenecks?: string[];
  travelReliability?: number;
  tollCostInr?: number;

  // Exceeds user crowd tolerance flag
  exceedsCrowdThreshold?: boolean;
}

export interface SavedRoute {
  id: string;
  customName: string;
  originId: string;
  destinationId: string;
  preferredMode: string;
  preferredTime: string;
  notes: string;
  createdAt: string;
  frequencyLabel: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'advisory' | 'tip';
  time: string;
  corridor: string;
  unread: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  defaultCity: string;
  preferredMode: 'all' | TransportMode;
  maxCrowdThreshold: number;
  walkingSpeed: 'slow' | 'moderate' | 'brisk';
  accessibilityPriority: boolean;
  monsoonMultiplier: 'normal' | 'light_rain' | 'heavy_rain';
  notificationsEnabled: boolean;
}

export type RankingPriority = 'balanced' | 'least_crowded' | 'fastest' | 'accessible';

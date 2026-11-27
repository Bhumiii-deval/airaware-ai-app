export type AqiCategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export type DataSourceType = 'live' | 'demo';

export interface PollutantReading {
  key: 'pm25' | 'pm10' | 'no2' | 'so2' | 'o3' | 'co';
  label: string;
  formula: string;
  value: number | null;
  unit: string;
  subIndex: number | null;
  whoGuideline24h?: string;
  summary: string;
}

export interface HourlyPoint {
  time: string;
  hourLabel: string;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  aqi: number;
}

export interface AirQualityData {
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  observedLocalTime?: string;
  fetchedAt?: string;
  timezone: string;
  sourceType: DataSourceType;
  sourceName: string;
  demoNotice?: string;
  scenarioId?: string;
  aqi: number;
  category: AqiCategory;
  dominantPollutant: string;
  usAqi?: number | null;
  europeanAqi?: number | null;
  pollutants: PollutantReading[];
  hourly: HourlyPoint[];
}

export interface UserProfile {
  city: string;
  familySize: number;
  lifestyle: 'Active Outdoor' | 'Balanced Urban' | 'Mostly Indoors' | 'Work From Home';
  commuteType: 'Petrol/Diesel Car' | 'Two-Wheeler' | 'Public Transit' | 'Cycling / Walking' | 'Carpool / EV' | 'No Daily Commute';
  outdoorActivities: string[];
  vulnerableGroups: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  dataContextLabel?: string;
}

export interface SmartDailyRoutine {
  generatedAt: string;
  aqiObservedAt?: string;
  city: string;
  aqiAtGeneration: number;
  categoryAtGeneration: AqiCategory;
  sourceType: DataSourceType;
  summary: string;
  bestOutdoorWindow: {
    timeRange: string;
    reason: string;
    cautionLevel: 'Low' | 'Moderate' | 'High' | 'Avoid Outdoor';
  };
  exerciseGuidance: {
    recommendation: string;
    intensity: string;
    indoorAlternative: string;
  };
  commutePlan: {
    primarySuggestion: string;
    protectionTip: string;
    emissionSavingsNote: string;
  };
  childrenPrecautions: {
    schoolCommute: string;
    outdoorPlay: string;
    classroomTip: string;
  };
  elderlyGuidance: {
    morningEveningAdvice: string;
    indoorComfort: string;
    symptomWatch: string;
  };
  lowEmissionHabits: string[];
  emergencyAlert: string | null;
}

export type ActiveSection =
  | 'dashboard'
  | 'assistant'
  | 'routine'
  | 'indoor'
  | 'eco'
  | 'education'
  | 'profile';

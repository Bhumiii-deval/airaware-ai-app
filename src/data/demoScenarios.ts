import type { AirQualityData, HourlyPoint } from '../types/airQuality.ts';
import { buildPollutantList, computeOverallAqi, getAqiCategory } from '../lib/aqiUtils.ts';

interface DemoScenarioSeed {
  id: string;
  label: string;
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  description: string;
  current: {
    pm25: number;
    pm10: number;
    no2: number;
    so2: number;
    o3: number;
    coMg: number;
  };
  hourlyProfile: number[]; // 24 multipliers for realistic diurnal curve
}

const DEMO_SEEDS: DemoScenarioSeed[] = [
  {
    id: 'delhi-winter-smog',
    label: 'Severe Winter Smog (New Delhi Demo)',
    city: 'New Delhi',
    region: 'Delhi NCR',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    description: 'Simulated severe winter temperature-inversion smog scenario for testing emergency guidance.',
    current: { pm25: 292, pm10: 418, no2: 96, so2: 24, o3: 32, coMg: 2.8 },
    hourlyProfile: [
      1.18, 1.22, 1.25, 1.24, 1.2, 1.16, 1.12, 1.08, 1.0, 0.9, 0.78, 0.7,
      0.66, 0.64, 0.67, 0.74, 0.85, 0.96, 1.05, 1.12, 1.16, 1.19, 1.2, 1.18,
    ],
  },
  {
    id: 'lucknow-very-poor',
    label: 'Very Poor Winter Haze (Lucknow Demo)',
    city: 'Lucknow',
    region: 'Uttar Pradesh',
    country: 'India',
    latitude: 26.8467,
    longitude: 80.9462,
    timezone: 'Asia/Kolkata',
    description: 'Simulated late-autumn haze with elevated fine particulates and morning mist.',
    current: { pm25: 178, pm10: 274, no2: 64, so2: 18, o3: 41, coMg: 1.9 },
    hourlyProfile: [
      1.12, 1.15, 1.16, 1.14, 1.1, 1.08, 1.05, 1.0, 0.92, 0.84, 0.75, 0.7,
      0.68, 0.67, 0.71, 0.78, 0.86, 0.95, 1.04, 1.08, 1.1, 1.12, 1.13, 1.12,
    ],
  },
  {
    id: 'bengaluru-moderate',
    label: 'Moderate Urban Traffic (Bengaluru Demo)',
    city: 'Bengaluru',
    region: 'Karnataka',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
    description: 'Simulated typical weekday urban air quality influenced by rush-hour traffic and road dust.',
    current: { pm25: 68, pm10: 122, no2: 52, so2: 11, o3: 64, coMg: 1.1 },
    hourlyProfile: [
      0.85, 0.82, 0.8, 0.78, 0.8, 0.88, 0.98, 1.12, 1.18, 1.06, 0.94, 0.86,
      0.82, 0.8, 0.84, 0.92, 1.04, 1.16, 1.2, 1.12, 1.02, 0.94, 0.9, 0.87,
    ],
  },
  {
    id: 'kochi-good',
    label: 'Good Coastal Breeze (Kochi Demo)',
    city: 'Kochi',
    region: 'Kerala',
    country: 'India',
    latitude: 9.9312,
    longitude: 76.2673,
    timezone: 'Asia/Kolkata',
    description: 'Simulated clean coastal dispersion scenario with low particulate concentrations.',
    current: { pm25: 21, pm10: 38, no2: 18, so2: 7, o3: 44, coMg: 0.42 },
    hourlyProfile: [
      0.92, 0.9, 0.88, 0.86, 0.88, 0.94, 1.02, 1.08, 1.04, 0.96, 0.9, 0.86,
      0.85, 0.86, 0.9, 0.96, 1.02, 1.08, 1.06, 1.0, 0.96, 0.94, 0.93, 0.92,
    ],
  },
];

export const DEMO_SCENARIO_OPTIONS = DEMO_SEEDS.map((s) => ({
  id: s.id,
  label: s.label,
  city: s.city,
  description: s.description,
}));

export function buildDemoAirQuality(scenarioId: string, reasonNotice?: string): AirQualityData {
  const seed = DEMO_SEEDS.find((s) => s.id === scenarioId) ?? DEMO_SEEDS[0];
  const { aqi, dominantPollutant } = computeOverallAqi(seed.current);
  const category = getAqiCategory(aqi);

  const now = new Date();
  const baseDate = now.toISOString().slice(0, 10);

  const hourly: HourlyPoint[] = seed.hourlyProfile.map((mult, hour) => {
    const pm25 = Number((seed.current.pm25 * mult).toFixed(1));
    const pm10 = Number((seed.current.pm10 * mult).toFixed(1));
    const no2 = Number((seed.current.no2 * mult).toFixed(1));
    const o3 = Number((seed.current.o3 * (hour >= 11 && hour <= 16 ? 1.25 : 0.85)).toFixed(1));
    const hourAqi = computeOverallAqi({ pm25, pm10, no2, o3 }).aqi;
    const hh = String(hour).padStart(2, '0');
    return {
      time: `${baseDate}T${hh}:00`,
      hourLabel: `${hh}:00`,
      pm25,
      pm10,
      no2,
      o3,
      aqi: hourAqi,
    };
  });

  return {
    city: seed.city,
    region: seed.region,
    country: seed.country,
    latitude: seed.latitude,
    longitude: seed.longitude,
    observedAt: now.toISOString(),
    observedLocalTime: now.toISOString(),
    fetchedAt: now.toISOString(),
    timezone: seed.timezone,
    sourceType: 'demo',
    sourceName: 'Simulated Sample Scenario (Demo Mode)',
    demoNotice:
      reasonNotice ??
      `You are viewing simulated sample data (${seed.label}). These readings are representative teaching values, not live sensor measurements.`,
    scenarioId: seed.id,
    aqi,
    category,
    dominantPollutant,
    usAqi: null,
    europeanAqi: null,
    pollutants: buildPollutantList(seed.current),
    hourly,
  };
}

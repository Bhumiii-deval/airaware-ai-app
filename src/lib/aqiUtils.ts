import type { AqiCategory, PollutantReading } from '../types/airQuality.ts';

export interface AqiCategoryMeta {
  category: AqiCategory;
  range: string;
  min: number;
  max: number;
  textColor: string;
  accentBg: string;
  softBg: string;
  borderColor: string;
  barColor: string;
  healthSummary: string;
  generalPopulation: string;
  sensitiveGroups: string;
  maskGuidance: string;
  isEmergency: boolean;
}

export const AQI_CATEGORIES: AqiCategoryMeta[] = [
  {
    category: 'Good',
    range: '0 – 50',
    min: 0,
    max: 50,
    textColor: 'text-emerald-800',
    accentBg: 'bg-emerald-600',
    softBg: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200',
    barColor: '#059669',
    healthSummary: 'Minimal health impact. Air is clean and well-dispersed.',
    generalPopulation: 'Ideal conditions for outdoor exercise, walking, and natural cross-ventilation. Still check current AQI before prolonged outdoor activity.',
    sensitiveGroups: 'Generally comfortable, though children, older adults, and people with asthma or lung/heart conditions should still avoid congested roadsides, carry prescribed reliever medication, and rest if any discomfort starts.',
    maskGuidance: 'Not generally required, though sensitive individuals may carry an N95 mask near heavy traffic or dusty roads.',
    isEmergency: false,
  },
  {
    category: 'Satisfactory',
    range: '51 – 100',
    min: 51,
    max: 100,
    textColor: 'text-lime-800',
    accentBg: 'bg-lime-600',
    softBg: 'bg-lime-50/70',
    borderColor: 'border-lime-200',
    barColor: '#65a30d',
    healthSummary: 'Minor breathing discomfort possible for unusually sensitive people.',
    generalPopulation: 'Comfortable for outdoor routines and opening windows. Check current AQI before strenuous outdoor exercise.',
    sensitiveGroups: 'People with asthma, COPD, allergies, children, and older adults should pace outdoor exertion, stay away from traffic exhaust, keep prescribed inhalers nearby, and move indoors if coughing or irritation begins.',
    maskGuidance: 'Optional for most; sensitive individuals near heavy traffic or construction dust should consider a fitted N95 mask.',
    isEmergency: false,
  },
  {
    category: 'Moderate',
    range: '101 – 200',
    min: 101,
    max: 200,
    textColor: 'text-amber-800',
    accentBg: 'bg-amber-600',
    softBg: 'bg-amber-50/70',
    borderColor: 'border-amber-200',
    barColor: '#d97706',
    healthSummary: 'Breathing discomfort possible for people with lung/heart disease, children, and older adults.',
    generalPopulation: 'Check current AQI right before going outside; choose routes away from congested arterial roads and reduce intense roadside workouts.',
    sensitiveGroups: 'Limit prolonged vigorous outdoor exertion; keep prescribed reliever medication accessible and pause activity if irritation starts.',
    maskGuidance: 'Well-fitted N95/FFP2 recommended along high-traffic corridors or for sensitive groups.',
    isEmergency: false,
  },
  {
    category: 'Poor',
    range: '201 – 300',
    min: 201,
    max: 300,
    textColor: 'text-orange-800',
    accentBg: 'bg-orange-600',
    softBg: 'bg-orange-50/70',
    borderColor: 'border-orange-200',
    barColor: '#ea580c',
    healthSummary: 'Breathing discomfort likely on prolonged exposure; heightened risk for heart and respiratory conditions.',
    generalPopulation: 'Move vigorous workouts indoors. Check current live AQI before any outdoor activity and shorten time outside when readings remain elevated.',
    sensitiveGroups: 'Children, seniors, and expectant mothers should avoid outdoor exercise and wear certified N95 masks outdoors.',
    maskGuidance: 'Wear a properly sealed N95/KN95/FFP2 respirator for outdoor commutes.',
    isEmergency: false,
  },
  {
    category: 'Very Poor',
    range: '301 – 400',
    min: 301,
    max: 400,
    textColor: 'text-red-800',
    accentBg: 'bg-red-600',
    softBg: 'bg-red-50/70',
    borderColor: 'border-red-200',
    barColor: '#dc2626',
    healthSummary: 'Respiratory illness risk on prolonged exposure. Significant health impact for families and vulnerable groups.',
    generalPopulation: 'Avoid all outdoor exercise. Keep windows sealed during high-haze hours and run HEPA filtration indoors.',
    sensitiveGroups: 'Remain indoors as much as possible. Cancel outdoor school sports and morning walks for seniors.',
    maskGuidance: 'Mandatory well-sealed N95/FFP2 mask whenever stepping outdoors; cloth and surgical masks are insufficient for PM2.5.',
    isEmergency: true,
  },
  {
    category: 'Severe',
    range: '401 – 500+',
    min: 401,
    max: 600,
    textColor: 'text-rose-950',
    accentBg: 'bg-rose-900',
    softBg: 'bg-rose-50',
    borderColor: 'border-rose-300',
    barColor: '#881337',
    healthSummary: 'Hazardous air emergency affecting healthy people and seriously impacting those with existing respiratory or cardiac conditions.',
    generalPopulation: 'Stay indoors. Postpone non-essential travel, seal door/window drafts, and keep indoor air strictly smoke-free.',
    sensitiveGroups: 'High-risk emergency. Follow local public health advisories, keep emergency medical contacts ready, and seek prompt medical care for acute breathlessness or chest discomfort.',
    maskGuidance: 'Strict N95/FFP2 respirator required even for brief outdoor exposure.',
    isEmergency: true,
  },
];

export function getAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function getAqiMeta(aqiOrCategory: number | AqiCategory): AqiCategoryMeta {
  const category = typeof aqiOrCategory === 'number' ? getAqiCategory(aqiOrCategory) : aqiOrCategory;
  return AQI_CATEGORIES.find((item) => item.category === category) ?? AQI_CATEGORIES[2];
}

// Official Indian CPCB National Air Quality Index (NAQI) linear breakpoint interpolation.
// Units: PM2.5, PM10, NO2, SO2, O3 in ug/m3; CO in mg/m3.
type Breakpoint = [number, number, number, number]; // [C_low, C_high, I_low, I_high]

const BREAKPOINTS: Record<string, Breakpoint[]> = {
  pm25: [
    [0, 30, 0, 50],
    [30, 60, 51, 100],
    [60, 90, 101, 200],
    [90, 120, 201, 300],
    [120, 250, 301, 400],
    [250, 500, 401, 500],
  ],
  pm10: [
    [0, 50, 0, 50],
    [50, 100, 51, 100],
    [100, 250, 101, 200],
    [250, 350, 201, 300],
    [350, 430, 301, 400],
    [430, 700, 401, 500],
  ],
  no2: [
    [0, 40, 0, 50],
    [40, 80, 51, 100],
    [80, 180, 101, 200],
    [180, 280, 201, 300],
    [280, 400, 301, 400],
    [400, 600, 401, 500],
  ],
  so2: [
    [0, 40, 0, 50],
    [40, 80, 51, 100],
    [80, 380, 101, 200],
    [380, 800, 201, 300],
    [800, 1600, 301, 400],
    [1600, 2400, 401, 500],
  ],
  o3: [
    [0, 50, 0, 50],
    [50, 100, 51, 100],
    [100, 168, 101, 200],
    [168, 208, 201, 300],
    [208, 748, 301, 400],
    [748, 1000, 401, 500],
  ],
  co: [
    [0, 1.0, 0, 50],
    [1.0, 2.0, 51, 100],
    [2.0, 10.0, 101, 200],
    [10.0, 17.0, 201, 300],
    [17.0, 34.0, 301, 400],
    [34.0, 50.0, 401, 500],
  ],
};

export function computeSubIndex(
  pollutant: keyof typeof BREAKPOINTS,
  concentration: number | null | undefined
): number | null {
  if (concentration === null || concentration === undefined || Number.isNaN(concentration) || concentration < 0) {
    return null;
  }
  const table = BREAKPOINTS[pollutant];
  for (const [cLow, cHigh, iLow, iHigh] of table) {
    if (concentration <= cHigh) {
      const ratio = (concentration - cLow) / Math.max(cHigh - cLow, 0.0001);
      return Math.round(iLow + ratio * (iHigh - iLow));
    }
  }
  const last = table[table.length - 1];
  const slope = (last[3] - last[2]) / Math.max(last[1] - last[0], 0.0001);
  return Math.min(500, Math.round(last[3] + (concentration - last[1]) * slope));
}

export function computeOverallAqi(readings: {
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  so2?: number | null;
  o3?: number | null;
  coMg?: number | null;
}): { aqi: number; dominantPollutant: string; subIndices: Record<string, number | null> } {
  const subIndices: Record<string, number | null> = {
    pm25: computeSubIndex('pm25', readings.pm25),
    pm10: computeSubIndex('pm10', readings.pm10),
    no2: computeSubIndex('no2', readings.no2),
    so2: computeSubIndex('so2', readings.so2),
    o3: computeSubIndex('o3', readings.o3),
    co: computeSubIndex('co', readings.coMg),
  };

  const labelMap: Record<string, string> = {
    pm25: 'PM2.5',
    pm10: 'PM10',
    no2: 'NO₂',
    so2: 'SO₂',
    o3: 'O₃',
    co: 'CO',
  };

  let maxIndex = 0;
  let dominant = 'PM2.5';

  for (const [key, val] of Object.entries(subIndices)) {
    if (val !== null && val >= maxIndex) {
      maxIndex = val;
      dominant = labelMap[key] ?? key;
    }
  }

  return {
    aqi: maxIndex,
    dominantPollutant: dominant,
    subIndices,
  };
}

export function buildPollutantList(values: {
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
  o3: number | null;
  coMg: number | null;
}): PollutantReading[] {
  return [
    {
      key: 'pm25',
      label: 'Fine Particulate Matter',
      formula: 'PM2.5',
      value: values.pm25 !== null ? Number(values.pm25.toFixed(1)) : null,
      unit: 'µg/m³',
      subIndex: computeSubIndex('pm25', values.pm25),
      whoGuideline24h: '15 µg/m³ (WHO 24h)',
      summary: 'Particles ≤2.5 µm that penetrate deep into alveoli and enter the bloodstream.',
    },
    {
      key: 'pm10',
      label: 'Coarse Particulate Matter',
      formula: 'PM10',
      value: values.pm10 !== null ? Number(values.pm10.toFixed(1)) : null,
      unit: 'µg/m³',
      subIndex: computeSubIndex('pm10', values.pm10),
      whoGuideline24h: '45 µg/m³ (WHO 24h)',
      summary: 'Road dust, construction debris, and pollen ≤10 µm affecting upper airways.',
    },
    {
      key: 'no2',
      label: 'Nitrogen Dioxide',
      formula: 'NO₂',
      value: values.no2 !== null ? Number(values.no2.toFixed(1)) : null,
      unit: 'µg/m³',
      subIndex: computeSubIndex('no2', values.no2),
      whoGuideline24h: '25 µg/m³ (WHO 24h)',
      summary: 'Traffic exhaust gas that inflames airways and fuels urban smog formation.',
    },
    {
      key: 'o3',
      label: 'Ground-Level Ozone',
      formula: 'O₃',
      value: values.o3 !== null ? Number(values.o3.toFixed(1)) : null,
      unit: 'µg/m³',
      subIndex: computeSubIndex('o3', values.o3),
      whoGuideline24h: '100 µg/m³ (WHO 8h)',
      summary: 'Formed when sunlight reacts with vehicle emissions; peaks on sunny afternoons.',
    },
    {
      key: 'so2',
      label: 'Sulphur Dioxide',
      formula: 'SO₂',
      value: values.so2 !== null ? Number(values.so2.toFixed(1)) : null,
      unit: 'µg/m³',
      subIndex: computeSubIndex('so2', values.so2),
      whoGuideline24h: '40 µg/m³ (WHO 24h)',
      summary: 'Released by coal power plants, industrial boilers, and high-sulphur fuels.',
    },
    {
      key: 'co',
      label: 'Carbon Monoxide',
      formula: 'CO',
      value: values.coMg !== null ? Number(values.coMg.toFixed(2)) : null,
      unit: 'mg/m³',
      subIndex: computeSubIndex('co', values.coMg),
      whoGuideline24h: '4 mg/m³ (WHO 24h)',
      summary: 'Colourless gas from incomplete combustion in traffic jams and unvented stoves.',
    },
  ];
}

export interface DataFreshnessInfo {
  isOutdated: boolean;
  ageMinutes: number | null;
  ageLabel: string;
  formattedTimestamp: string;
}

/**
 * Evaluates whether live AQI data is outdated (> 90 minutes old) based on a valid ISO timestamp.
 */
export function getDataFreshness(
  observedAt: string | undefined,
  sourceType: 'live' | 'demo',
  nowMs: number = Date.now(),
  staleThresholdMinutes = 90
): DataFreshnessInfo {
  if (!observedAt) {
    return {
      isOutdated: sourceType === 'live',
      ageMinutes: null,
      ageLabel: 'Timestamp unavailable',
      formattedTimestamp: 'Timestamp unavailable',
    };
  }

  const parsedMs = Date.parse(observedAt);
  if (Number.isNaN(parsedMs)) {
    return {
      isOutdated: sourceType === 'live',
      ageMinutes: null,
      ageLabel: 'Unverified timestamp',
      formattedTimestamp: observedAt,
    };
  }

  const formattedTimestamp = new Date(parsedMs).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const diffMinutes = Math.max(0, Math.round((nowMs - parsedMs) / 60000));
  let ageLabel: string;
  if (diffMinutes < 2) {
    ageLabel = 'Just updated';
  } else if (diffMinutes < 60) {
    ageLabel = `${diffMinutes} min ago`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const remMins = diffMinutes % 60;
    ageLabel = remMins > 0 ? `${hours}h ${remMins}m ago` : `${hours}h ago`;
  }

  return {
    isOutdated: sourceType === 'live' && diffMinutes > staleThresholdMinutes,
    ageMinutes: diffMinutes,
    ageLabel,
    formattedTimestamp,
  };
}

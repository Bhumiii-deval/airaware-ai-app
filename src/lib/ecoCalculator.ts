export type CommuteModeId =
  | 'petrol_car'
  | 'motorbike'
  | 'carpool_3'
  | 'public_bus'
  | 'metro_rail'
  | 'cycling'
  | 'walking';

export interface CommuteModeSpec {
  id: CommuteModeId;
  label: string;
  shortLabel: string;
  /** Grams of CO2e per passenger-kilometer (well-to-wheel urban average) */
  co2GramsPerKm: number;
  /** Milligrams of exhaust + non-exhaust PM2.5 proxy per passenger-kilometer */
  pm25MgPerKm: number;
  /** Milligrams of NOx per passenger-kilometer */
  noxMgPerKm: number;
  /** Approximate direct travel fuel/fare cost in USD per km for comparison transparency */
  basisNote: string;
}

/**
 * Transparent emission factors derived from DEFRA 2024 / IPCC / IEA urban mobility benchmarks.
 * All figures are passenger-km averages and clearly documented in the UI as estimates.
 */
export const COMMUTE_MODES: Record<CommuteModeId, CommuteModeSpec> = {
  petrol_car: {
    id: 'petrol_car',
    label: 'Solo Petrol/Diesel Car',
    shortLabel: 'Solo Car',
    co2GramsPerKm: 171,
    pm25MgPerKm: 18,
    noxMgPerKm: 190,
    basisNote: 'Average medium urban passenger car, 1 occupant (171 g CO₂e/p-km; includes tailpipe + tire/brake wear).',
  },
  motorbike: {
    id: 'motorbike',
    label: 'Petrol Two-Wheeler / Scooter',
    shortLabel: 'Two-Wheeler',
    co2GramsPerKm: 84,
    pm25MgPerKm: 14,
    noxMgPerKm: 115,
    basisNote: '110–150cc commuter motorcycle/scooter, 1 occupant (84 g CO₂e/p-km).',
  },
  carpool_3: {
    id: 'carpool_3',
    label: 'Carpooling (3 Riders)',
    shortLabel: 'Carpool (3x)',
    co2GramsPerKm: 57,
    pm25MgPerKm: 6,
    noxMgPerKm: 63,
    basisNote: 'Shared passenger car dividing per-vehicle emissions across 3 riders (57 g CO₂e/p-km).',
  },
  public_bus: {
    id: 'public_bus',
    label: 'City Public Bus (CNG / Modern Diesel)',
    shortLabel: 'Public Bus',
    co2GramsPerKm: 42,
    pm25MgPerKm: 4.5,
    noxMgPerKm: 45,
    basisNote: 'Urban bus at ~40% average occupancy (42 g CO₂e/p-km).',
  },
  metro_rail: {
    id: 'metro_rail',
    label: 'Urban Metro / Electric Rail',
    shortLabel: 'Metro Rail',
    co2GramsPerKm: 28,
    pm25MgPerKm: 1.8,
    noxMgPerKm: 12,
    basisNote: 'Grid-powered urban metro rail; zero tailpipe street emissions (28 g CO₂e/p-km grid lifecycle).',
  },
  cycling: {
    id: 'cycling',
    label: 'Cycling',
    shortLabel: 'Cycling',
    co2GramsPerKm: 0,
    pm25MgPerKm: 0,
    noxMgPerKm: 0,
    basisNote: 'Zero direct tailpipe CO₂, NOx, or exhaust particulate emissions.',
  },
  walking: {
    id: 'walking',
    label: 'Walking',
    shortLabel: 'Walking',
    co2GramsPerKm: 0,
    pm25MgPerKm: 0,
    noxMgPerKm: 0,
    basisNote: 'Zero direct emissions. Best suited for shorter trips when AQI is Good to Moderate.',
  },
};

export interface EcoImpactCalculation {
  annualKm: number;
  baselineCo2Kg: number;
  targetCo2Kg: number;
  co2SavedKg: number;
  percentCo2Reduction: number;
  pm25AvoidedGrams: number;
  noxAvoidedGrams: number;
  equivalentTreeYears: number;
  community100FamiliesCo2Tons: number;
}

export function calculateEcoImpact(params: {
  fromMode: CommuteModeId;
  toMode: CommuteModeId;
  roundTripKm: number;
  daysPerWeek: number;
  weeksPerYear?: number;
}): EcoImpactCalculation {
  const weeks = params.weeksPerYear ?? 48;
  const annualKm = Math.max(0, params.roundTripKm) * Math.max(0, params.daysPerWeek) * weeks;

  const fromSpec = COMMUTE_MODES[params.fromMode];
  const toSpec = COMMUTE_MODES[params.toMode];

  const baselineCo2Kg = (annualKm * fromSpec.co2GramsPerKm) / 1000;
  const targetCo2Kg = (annualKm * toSpec.co2GramsPerKm) / 1000;
  const co2SavedKg = Math.max(0, baselineCo2Kg - targetCo2Kg);
  const percentCo2Reduction = baselineCo2Kg > 0 ? Math.round((co2SavedKg / baselineCo2Kg) * 100) : 0;

  const pm25AvoidedGrams = Math.max(0, (annualKm * (fromSpec.pm25MgPerKm - toSpec.pm25MgPerKm)) / 1000);
  const noxAvoidedGrams = Math.max(0, (annualKm * (fromSpec.noxMgPerKm - toSpec.noxMgPerKm)) / 1000);

  // Conservative urban mature tree sequestration assumption: ~21 kg CO2 / tree / year
  const equivalentTreeYears = co2SavedKg / 21;
  const community100FamiliesCo2Tons = (co2SavedKg * 100) / 1000;

  return {
    annualKm: Math.round(annualKm),
    baselineCo2Kg: Number(baselineCo2Kg.toFixed(1)),
    targetCo2Kg: Number(targetCo2Kg.toFixed(1)),
    co2SavedKg: Number(co2SavedKg.toFixed(1)),
    percentCo2Reduction,
    pm25AvoidedGrams: Number(pm25AvoidedGrams.toFixed(1)),
    noxAvoidedGrams: Number(noxAvoidedGrams.toFixed(1)),
    equivalentTreeYears: Number(equivalentTreeYears.toFixed(1)),
    community100FamiliesCo2Tons: Number(community100FamiliesCo2Tons.toFixed(1)),
  };
}

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Info, Leaf, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  calculateEcoImpact,
  COMMUTE_MODES,
  type CommuteModeId,
} from '../lib/ecoCalculator';
import type { AirQualityData } from '../types/airQuality';
import { getDataFreshness } from '../lib/aqiUtils';

interface EcoImpactViewProps {
  airQuality: AirQualityData | null;
  nowMs: number;
  defaultCommuteLabel?: string;
}

function mapProfileCommuteToId(label?: string): CommuteModeId {
  if (!label) return 'petrol_car';
  if (label.includes('Two-Wheeler')) return 'motorbike';
  if (label.includes('Carpool')) return 'carpool_3';
  if (label.includes('Public')) return 'public_bus';
  if (label.includes('Cycling')) return 'cycling';
  return 'petrol_car';
}

const MODE_ORDER: CommuteModeId[] = [
  'petrol_car',
  'motorbike',
  'carpool_3',
  'public_bus',
  'metro_rail',
  'cycling',
  'walking',
];

export function EcoImpactView({ airQuality, nowMs, defaultCommuteLabel }: EcoImpactViewProps) {
  const initialFrom = mapProfileCommuteToId(defaultCommuteLabel);
  const [fromMode, setFromMode] = useState<CommuteModeId>(
    initialFrom === 'cycling' || initialFrom === 'walking' ? 'petrol_car' : initialFrom
  );
  const [toMode, setToMode] = useState<CommuteModeId>('metro_rail');
  const [roundTripKm, setRoundTripKm] = useState<number>(18);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);
  const [showMethodology, setShowMethodology] = useState<boolean>(false);

  const impact = useMemo(
    () =>
      calculateEcoImpact({
        fromMode,
        toMode,
        roundTripKm,
        daysPerWeek,
        weeksPerYear: 48,
      }),
    [fromMode, toMode, roundTripKm, daysPerWeek]
  );

  const comparisonData = useMemo(() => {
    const annualKm = roundTripKm * daysPerWeek * 48;
    return MODE_ORDER.map((id) => {
      const spec = COMMUTE_MODES[id];
      const annualCo2Kg = Number(((annualKm * spec.co2GramsPerKm) / 1000).toFixed(1));
      return {
        id,
        name: spec.shortLabel,
        annualCo2Kg,
        isFrom: id === fromMode,
        isTo: id === toMode,
      };
    });
  }, [roundTripKm, daysPerWeek, fromMode, toMode]);

  const freshness = airQuality
    ? getDataFreshness(airQuality.observedAt, airQuality.sourceType, nowMs)
    : null;

  const isActiveMobilitySelected = toMode === 'cycling' || toMode === 'walking';
  const highAqiActiveMobilityNote =
    airQuality &&
    airQuality.aqi >= 201 &&
    isActiveMobilitySelected;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Eco Impact Tracker
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Estimate how switching everyday commutes to public transport, carpooling, cycling, or walking reduces greenhouse gas and local tailpipe air pollution. All figures are transparent estimates based on published passenger-kilometer averages.
        </p>
      </section>

      {/* Interactive Simulator Controls + Summary KPIs */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Controls */}
        <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Configure Your Commute Shift
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="from-mode-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current Commute Mode
              </label>
              <select
                id="from-mode-select"
                value={fromMode}
                onChange={(e) => setFromMode(e.target.value as CommuteModeId)}
                className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900"
              >
                {MODE_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {COMMUTE_MODES[id].label} ({COMMUTE_MODES[id].co2GramsPerKm} g CO₂e/km)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="to-mode-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Low-Emission Alternative
              </label>
              <select
                id="to-mode-select"
                value={toMode}
                onChange={(e) => setToMode(e.target.value as CommuteModeId)}
                className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900"
              >
                {MODE_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {COMMUTE_MODES[id].label} ({COMMUTE_MODES[id].co2GramsPerKm} g CO₂e/km)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="distance-range" className="font-semibold text-slate-700">
                  Daily Round-Trip Distance
                </label>
                <span className="font-mono font-semibold text-teal-800 tabular-nums">
                  {roundTripKm} km / day
                </span>
              </div>
              <input
                id="distance-range"
                type="range"
                min={2}
                max={80}
                step={1}
                value={roundTripKm}
                onChange={(e) => setRoundTripKm(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                <span>2 km</span>
                <span>40 km</span>
                <span>80 km</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label htmlFor="days-range" className="font-semibold text-slate-700">
                  Commute Days per Week
                </label>
                <span className="font-mono font-semibold text-teal-800 tabular-nums">
                  {daysPerWeek} days / week
                </span>
              </div>
              <input
                id="days-range"
                type="range"
                min={1}
                max={7}
                step={1}
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
              <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
                <span>1 day</span>
                <span>5 days</span>
                <span>7 days</span>
              </div>
            </div>
          </div>

          {highAqiActiveMobilityNote && freshness && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950 leading-relaxed">
              <strong>Health-First Note for {airQuality.city}:</strong>{' '}
              {airQuality.sourceType === 'live' ? 'Live API' : 'Demo'} reading is {airQuality.aqi} ({airQuality.category}), observed{' '}
              <span className="font-mono">{freshness.formattedTimestamp}</span>
              {freshness.isOutdated ? ` (outdated — ${freshness.ageLabel})` : ''}. On Poor to Severe smog days, prioritize enclosed metro/public transit over strenuous cycling or long roadside walks, wear a snug N95 mask outdoors, and check current AQI right before heading out.
            </div>
          )}

          {!highAqiActiveMobilityNote && isActiveMobilitySelected && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3.5 text-xs text-slate-700 leading-relaxed">
              <strong>Pre-Commute Air Check:</strong> Always check current local AQI right before cycling or walking. Even when AQI improves, children, older adults, and people with asthma should avoid congested roadsides and pause if breathing feels uncomfortable.
            </div>
          )}
        </div>

        {/* Right Impact Results */}
        <div className="xl:col-span-7 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <span>Estimated Annual Reduction (48 Commuting Weeks)</span>
              </h2>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {impact.annualKm.toLocaleString()} km / year
              </span>
            </div>

            {impact.co2SavedKg > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 py-4 border-y border-slate-100">
                <div>
                  <div className="text-xs text-slate-500">Estimated CO₂e Saved</div>
                  <div className="font-mono text-3xl font-semibold text-emerald-700 tabular-nums mt-1">
                    {impact.co2SavedKg.toLocaleString()}
                    <span className="ml-1 text-xs font-sans font-normal text-slate-500">kg/yr</span>
                  </div>
                  <div className="text-xs text-emerald-800 font-medium mt-0.5 tabular-nums">
                    −{impact.percentCo2Reduction}% vs {COMMUTE_MODES[fromMode].shortLabel}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Local PM2.5 Avoided</div>
                  <div className="font-mono text-3xl font-semibold text-teal-800 tabular-nums mt-1">
                    {impact.pm25AvoidedGrams}
                    <span className="ml-1 text-xs font-sans font-normal text-slate-500">g/yr</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Exhaust &amp; wear proxy
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">NOx Smog Precursor Avoided</div>
                  <div className="font-mono text-3xl font-semibold text-sky-700 tabular-nums mt-1">
                    {impact.noxAvoidedGrams}
                    <span className="ml-1 text-xs font-sans font-normal text-slate-500">g/yr</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ≈ {impact.equivalentTreeYears} mature tree-yrs CO₂
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                The selected alternative has equal or higher per-kilometer emissions than your current mode. Choose public transit, carpooling, cycling, or walking to see estimated savings.
              </div>
            )}

            {/* Community Multiplier */}
            <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-4 flex items-start gap-3">
              <Users className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-sm text-slate-800 leading-relaxed">
                <strong className="font-semibold text-slate-900">Neighborhood Scale Effect: </strong>
                If 100 families in your community made this exact commute shift, it would avoid an estimated{' '}
                <strong className="font-mono tabular-nums text-emerald-800">
                  {impact.community100FamiliesCo2Tons} metric tons of CO₂e
                </strong>{' '}
                and{' '}
                <strong className="font-mono tabular-nums text-emerald-800">
                  {((impact.pm25AvoidedGrams * 100) / 1000).toFixed(2)} kg of local PM2.5
                </strong>{' '}
                every year.
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Clearly Identified Estimate: Actual savings depend on vehicle age, fuel type, local electricity grid mix (for metro rail), and transit occupancy.
            </span>
          </p>
        </div>
      </section>

      {/* Mode Comparison Bar Chart */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Annual Emissions Across All Commute Modes ({impact.annualKm.toLocaleString()} km/yr)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparing estimated annual kg CO₂e for your exact trip distance. Highlighted: your current mode (slate) and chosen low-emission alternative (teal).
            </p>
          </div>
        </div>

        <div className="h-64 w-full" aria-label="Commute mode emissions bar chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#475569' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                unit=" kg"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="annualCo2Kg" name="Estimated Annual CO₂e (kg)" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {comparisonData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={
                      entry.isTo
                        ? '#0d9488'
                        : entry.isFrom
                          ? '#475569'
                          : '#cbd5e1'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Transparent Methodology & Assumptions Accordion */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMethodology((prev) => !prev)}
          aria-expanded={showMethodology}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors"
        >
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Transparent Calculation Formulas &amp; Emission Assumptions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review the exact passenger-kilometer factors and tree-equivalence basis used above.
            </p>
          </div>
          {showMethodology ? (
            <ChevronUp className="h-5 w-5 text-slate-500 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-500 shrink-0" aria-hidden="true" />
          )}
        </button>

        {showMethodology && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4">
            <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <p>
                <strong className="text-slate-900">Annual Distance Formula:</strong>{' '}
                <span className="font-mono">Round-Trip km × Commute Days/Week × 48 Working Weeks/Year</span>.
              </p>
              <p>
                <strong className="text-slate-900">Tree-Year Equivalence:</strong> Conservative average sequestration of{' '}
                <span className="font-mono">21 kg CO₂ / mature urban tree / year</span> (European Environment Agency / US Forest Service benchmark).
              </p>
              <p>
                <strong className="text-slate-900">Emission Factor Sources:</strong> Harmonized urban passenger-km benchmarks adapted from DEFRA 2024 Greenhouse Gas Conversion Factors, IEA Transport Intensity datasets, and EEA urban PM/NOx emission inventories.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">CO₂e (g/p-km)</th>
                    <th className="py-2.5 px-3 text-right">PM2.5 (mg/p-km)</th>
                    <th className="py-2.5 px-3 text-right">NOx (mg/p-km)</th>
                    <th className="py-2.5 px-3">Assumption Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODE_ORDER.map((id) => {
                    const m = COMMUTE_MODES[id];
                    return (
                      <tr key={id}>
                        <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">{m.label}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">{m.co2GramsPerKm}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">{m.pm25MgPerKm}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">{m.noxMgPerKm}</td>
                        <td className="py-2.5 px-3 text-slate-600">{m.basisNote}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

import { useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckSquare,
  Flower2,
  Home,
  Info,
  Square,
  Wind,
} from 'lucide-react';
import type { AirQualityData } from '../types/airQuality';
import { INDOOR_GUIDE_SECTIONS } from '../data/educationalContent';
import { getAqiMeta, getDataFreshness } from '../lib/aqiUtils';

interface IndoorGuideViewProps {
  airQuality: AirQualityData | null;
  nowMs: number;
  onRefreshAirQuality: () => void;
  onOpenDashboard: () => void;
}

const HOME_CHECKLIST = [
  'Kitchen exhaust fan or ducted chimney runs during every high-heat cooking session',
  'No incense sticks, dhoop, candles, mosquito coils, or indoor smoking during Poor–Severe AQI',
  'Wet mopping or damp cloth dusting used instead of dry sweeping',
  'Window and exterior door gaps checked for drafts ahead of winter inversion nights',
  'AC intake switched to Recirculate mode on high-pollution days',
  'HEPA purifier pre-filter mesh vacuumed within the past 2 weeks (if owned)',
];

export function IndoorGuideView({
  airQuality,
  nowMs,
  onRefreshAirQuality,
  onOpenDashboard,
}: IndoorGuideViewProps) {
  const [selectedGuideId, setSelectedGuideId] = useState<string>('all');
  const [unitSystem, setUnitSystem] = useState<'ft' | 'm'>('ft');
  const [roomLength, setRoomLength] = useState<number>(14);
  const [roomWidth, setRoomWidth] = useState<number>(12);
  const [ceilingHeight, setCeilingHeight] = useState<number>(9.5);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Calculate room volume in cubic meters and required CADR (m³/h) for 4.8 air changes per hour (ACH)
  const lengthM = unitSystem === 'ft' ? roomLength * 0.3048 : roomLength;
  const widthM = unitSystem === 'ft' ? roomWidth * 0.3048 : roomWidth;
  const heightM = unitSystem === 'ft' ? ceilingHeight * 0.3048 : ceilingHeight;
  const floorAreaSqM = Math.max(1, lengthM * widthM);
  const floorAreaSqFt = floorAreaSqM * 10.7639;
  const volumeM3 = Math.max(5, floorAreaSqM * heightM);

  // Standard clean-air target: 4.8 ACH (AHAM) for PM2.5 removal during winter smog
  const recommendedCadrM3h = Math.ceil((volumeM3 * 4.8) / 10) * 10;
  const recommendedCadrCfm = Math.round(recommendedCadrM3h * 0.5886);

  const visibleSections =
    selectedGuideId === 'all'
      ? INDOOR_GUIDE_SECTIONS
      : INDOOR_GUIDE_SECTIONS.filter((s) => s.id === selectedGuideId);

  const aqiMeta = airQuality ? getAqiMeta(airQuality.aqi) : null;
  const freshness = airQuality
    ? getDataFreshness(airQuality.observedAt, airQuality.sourceType, nowMs)
    : null;

  const lowestHourly =
    airQuality?.hourly && airQuality.hourly.length > 0
      ? airQuality.hourly.reduce((best, cur) => (cur.aqi < best.aqi ? cur : best), airQuality.hourly[0])
      : null;

  const getVentilationRecommendation = () => {
    if (!airQuality || !freshness) {
      return {
        status: 'Enter Your City to Check Live AQI First',
        advice: 'AirAware AI never assumes your location. Enter your city on the Air Dashboard to see timestamped AQI readings and tailored ventilation advice.',
      };
    }
    const sourceLabel = airQuality.sourceType === 'live' ? 'Live API' : 'Demo scenario';
    const locationStamp = `${airQuality.city} (${sourceLabel}, observed ${freshness.formattedTimestamp})`;

    if (airQuality.aqi <= 100) {
      return {
        status: 'Generally Safe for Natural Cross-Ventilation',
        advice: `Based on ${airQuality.aqi} NAQI (${airQuality.category}) in ${locationStamp}, opening opposite windows helps refresh indoor air naturally at zero cost. People with asthma or pollen/dust sensitivities should still avoid opening roadside windows and check current AQI before outdoor activities.`,
      };
    }
    if (airQuality.aqi <= 200) {
      const windowNote = lowestHourly
        ? `Modeled hourly data estimates the lowest reading around ${lowestHourly.hourLabel} (NAQI ${lowestHourly.aqi})—forecasts are estimates, not guarantees, so re-check current AQI before opening windows.`
        : 'Check current live AQI before briefly opening windows.';
      return {
        status: 'Brief Data-Timed Ventilation Only',
        advice: `Based on ${airQuality.aqi} NAQI (${airQuality.category}) in ${locationStamp}, keep roadside windows closed and ventilate briefly only when actual local AQI drops. ${windowNote}`,
      };
    }
    return {
      status: 'Keep Windows Closed & Reduce Indoor Sources',
      advice: `Based on ${airQuality.aqi} NAQI (${airQuality.category}) in ${locationStamp}, keep windows and balcony doors shut, block door drafts with a rolled cotton towel, run a kitchen exhaust fan while cooking, avoid incense/coils, and use a HEPA purifier if available.`,
    };
  };

  const ventGuidance = getVentilationRecommendation();
  const completedCount = HOME_CHECKLIST.filter((item) => checkedItems[item]).length;

  return (
    <div className="space-y-8">
      {/* Header & Dynamic Outdoor-Linked Ventilation Banner */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Indoor Air Quality Guide
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Practical, affordable, evidence-based ways to keep indoor air breathable—even when winter smog traps pollution outside.
          </p>
        </div>

        {airQuality && freshness?.isOutdated && (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-950"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Live AQI data for <strong>{airQuality.city}</strong> is outdated ({freshness.ageLabel}, observed {freshness.formattedTimestamp}). Refresh before deciding whether to open windows.
              </span>
            </div>
            <button
              type="button"
              onClick={onRefreshAirQuality}
              className="px-3 py-1.5 rounded-md bg-amber-900 text-white font-semibold hover:bg-amber-950 whitespace-nowrap shrink-0 self-start sm:self-auto"
            >
              Refresh Live AQI
            </button>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Wind className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900">
                Ventilation Status: {ventGuidance.status}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{ventGuidance.advice}</p>
            </div>
          </div>
          {airQuality && aqiMeta && freshness ? (
            <div className="text-left sm:text-right shrink-0">
              <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                {airQuality.aqi} NAQI
              </div>
              <div className={`text-xs font-medium ${aqiMeta.textColor}`}>
                {airQuality.city} · {airQuality.sourceType === 'live' ? 'Live API' : 'Demo'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 tabular-nums mt-0.5">
                {freshness.formattedTimestamp}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenDashboard}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 whitespace-nowrap shrink-0 self-start"
            >
              Enter City
            </button>
          )}
        </div>
      </section>

      {/* Interactive Filter Tabs + Guide Sections */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Core Indoor Protection Practices
          </h2>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg" role="tablist" aria-label="Filter indoor topics">
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'ventilation', label: 'Ventilation' },
              { id: 'kitchen', label: 'Kitchen Exhaust' },
              { id: 'smoke', label: 'Smoke Prevention' },
              { id: 'hepa', label: 'HEPA Purifiers' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selectedGuideId === tab.id}
                onClick={() => setSelectedGuideId(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-[34px] ${
                  selectedGuideId === tab.id
                    ? 'bg-white text-teal-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleSections.map((section) => (
            <article
              key={section.id}
              className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    {section.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{section.subtitle}</p>
                </div>

                <div className="rounded-lg bg-teal-50/60 border border-teal-100 p-3.5 text-xs text-teal-950 leading-relaxed">
                  <strong className="font-semibold">Key Principle: </strong>
                  {section.keyRule}
                </div>

                <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5 leading-relaxed">
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-900">Common mistake to avoid: </strong>
                {section.avoid}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Interactive HEPA CADR Sizing Calculator + Home Readiness Checklist */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* HEPA Room CADR Calculator */}
        <div className="xl:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-teal-700" aria-hidden="true" />
                <span>HEPA Purifier Sizing Estimator (CADR)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Estimate the minimum Clean Air Delivery Rate needed for 4.8 air changes per hour (ACH).
              </p>
            </div>

            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start">
              <button
                type="button"
                onClick={() => {
                  if (unitSystem !== 'ft') {
                    setUnitSystem('ft');
                    setRoomLength(Number((roomLength * 3.28084).toFixed(1)));
                    setRoomWidth(Number((roomWidth * 3.28084).toFixed(1)));
                    setCeilingHeight(Number((ceilingHeight * 3.28084).toFixed(1)));
                  }
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                  unitSystem === 'ft' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Feet (ft)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (unitSystem !== 'm') {
                    setUnitSystem('m');
                    setRoomLength(Number((roomLength * 0.3048).toFixed(1)));
                    setRoomWidth(Number((roomWidth * 0.3048).toFixed(1)));
                    setCeilingHeight(Number((ceilingHeight * 0.3048).toFixed(1)));
                  }
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                  unitSystem === 'm' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Meters (m)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="room-length" className="block text-xs font-medium text-slate-700 mb-1.5">
                Room Length ({unitSystem})
              </label>
              <input
                id="room-length"
                type="number"
                min={unitSystem === 'ft' ? 5 : 1.5}
                max={unitSystem === 'ft' ? 60 : 20}
                step={0.5}
                value={roomLength}
                onChange={(e) => setRoomLength(Math.max(1, Number(e.target.value) || 0))}
                className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="room-width" className="block text-xs font-medium text-slate-700 mb-1.5">
                Room Width ({unitSystem})
              </label>
              <input
                id="room-width"
                type="number"
                min={unitSystem === 'ft' ? 5 : 1.5}
                max={unitSystem === 'ft' ? 60 : 20}
                step={0.5}
                value={roomWidth}
                onChange={(e) => setRoomWidth(Math.max(1, Number(e.target.value) || 0))}
                className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="room-height" className="block text-xs font-medium text-slate-700 mb-1.5">
                Ceiling Height ({unitSystem})
              </label>
              <input
                id="room-height"
                type="number"
                min={unitSystem === 'ft' ? 7 : 2.1}
                max={unitSystem === 'ft' ? 20 : 6}
                step={0.5}
                value={ceilingHeight}
                onChange={(e) => setCeilingHeight(Math.max(2, Number(e.target.value) || 0))}
                className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm font-mono tabular-nums text-slate-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-slate-500">Recommended CADR</div>
              <div className="font-mono text-2xl font-semibold text-teal-800 tabular-nums mt-0.5">
                {recommendedCadrM3h} <span className="text-xs font-sans font-normal text-slate-500">m³/h</span>
              </div>
              <div className="text-xs font-mono text-slate-500 tabular-nums">
                ≈ {recommendedCadrCfm} CFM
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Floor Area</div>
              <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
                {Math.round(floorAreaSqFt)} <span className="text-xs font-sans font-normal text-slate-500">sq ft</span>
              </div>
              <div className="text-xs font-mono text-slate-500 tabular-nums">
                {floorAreaSqM.toFixed(1)} m²
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Room Volume</div>
              <div className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-0.5">
                {volumeM3.toFixed(1)} <span className="text-xs font-sans font-normal text-slate-500">m³</span>
              </div>
              <div className="text-xs text-slate-500">Target: 4.8 ACH</div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Formula: <span className="font-mono">CADR (m³/h) = Room Volume (m³) × 4.8 ACH</span>. Choosing a slightly higher-CADR purifier lets you run it on a quieter medium speed overnight while still achieving safe filtration.
            </span>
          </p>
        </div>

        {/* Interactive Home Readiness Checklist */}
        <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
              <Home className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>Home Clean-Air Audit</span>
            </h2>
            <span className="font-mono text-xs font-semibold text-teal-800 tabular-nums">
              {completedCount}/{HOME_CHECKLIST.length} ready
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-teal-700 transition-all duration-300"
              style={{ width: `${(completedCount / HOME_CHECKLIST.length) * 100}%` }}
            />
          </div>

          <ul className="space-y-2 pt-1">
            {HOME_CHECKLIST.map((item) => {
              const checked = Boolean(checkedItems[item]);
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }))}
                    aria-pressed={checked}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left text-xs sm:text-sm transition-colors ${
                      checked ? 'bg-emerald-50/70 text-emerald-950' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {checked ? (
                      <CheckSquare className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <span className="leading-snug">{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Science-Based Section: Honest Limitations of Indoor Plants */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 sm:p-7 space-y-4">
        <div className="flex items-start gap-3">
          <Flower2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Understanding the Real Limitations of Indoor Plants
            </h2>
            <p className="text-sm text-slate-600">
              Houseplants improve visual calm and comfort, but they are not a substitute for ventilation or HEPA filtration during urban smog.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-sm">
          <div className="space-y-1.5">
            <h3 className="font-semibold text-slate-900">What the 1989 NASA Study Actually Tested</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              The widely cited 1989 NASA study measured trace volatile organic compounds (VOCs) inside tiny, airtight space-station laboratory chambers over 24 hours—not real living rooms with normal air exchange or heavy PM2.5 smog.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-semibold text-slate-900">Why Plants Cannot Clear PM2.5 Smog</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              A 2019 Drexel University peer-reviewed synthesis (Cummings &amp; Waring) found that natural room ventilation removes VOCs 100× to 1,000× faster than potted plants. You would need 100+ plants per square meter to match a single True HEPA air purifier, and plants do not mechanically filter fine PM2.5 aerosols.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-semibold text-slate-900">How to Enjoy Plants Safely</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Keep indoor plants for biophilic wellbeing, but rely on source control (exhaust fans, zero indoor smoke) and certified True HEPA filtration for health protection. Avoid overwatering soil, which can encourage indoor mold spores.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

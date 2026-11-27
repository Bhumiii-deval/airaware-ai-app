import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Compass,
  Info,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ActiveSection, AirQualityData, UserProfile } from '../types/airQuality';
import { AQI_CATEGORIES, getAqiMeta, getDataFreshness } from '../lib/aqiUtils';
import { DEMO_SCENARIO_OPTIONS } from '../data/demoScenarios';
import { searchCities, type CitySearchResult } from '../lib/api';
import { EmergencyBanner } from './EmergencyBanner';

interface DashboardViewProps {
  airQuality: AirQualityData | null;
  loading: boolean;
  error: string | null;
  profile: UserProfile;
  nowMs: number;
  onSearchLiveCity: (params: {
    city: string;
    lat?: number;
    lon?: number;
    region?: string;
    country?: string;
  }) => void;
  onSelectDemoScenario: (scenarioId: string) => void;
  onRefresh: () => void;
  onNavigate: (section: ActiveSection) => void;
}

const QUICK_CITIES = ['New Delhi', 'Mumbai', 'Bengaluru', 'Kolkata', 'London', 'Singapore'];

export function DashboardView({
  airQuality,
  loading,
  error,
  profile,
  nowMs,
  onSearchLiveCity,
  onSelectDemoScenario,
  onRefresh,
  onNavigate,
}: DashboardViewProps) {
  const [cityInput, setCityInput] = useState(profile.city);
  const [inputError, setInputError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [chartMetric, setChartMetric] = useState<'aqi' | 'pm'>('aqi');
  const [dataModeTab, setDataModeTab] = useState<'live' | 'demo'>(
    airQuality?.sourceType === 'demo' ? 'demo' : 'live'
  );

  useEffect(() => {
    setCityInput(profile.city);
  }, [profile.city]);

  useEffect(() => {
    if (airQuality?.sourceType) {
      setDataModeTab(airQuality.sourceType);
    }
  }, [airQuality?.sourceType]);

  // Debounced live city autocomplete
  useEffect(() => {
    const trimmed = cityInput.trim();
    if (dataModeTab !== 'live' || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchCities(trimmed);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [cityInput, dataModeTab]);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = cityInput.trim();
    if (trimmed.length < 2) {
      setInputError('Please enter at least 2 characters for a city name.');
      return;
    }
    if (trimmed.length > 80) {
      setInputError('City name is too long.');
      return;
    }
    setInputError(null);
    setShowSuggestions(false);
    onSearchLiveCity({ city: trimmed });
  };

  const aqiMeta = airQuality ? getAqiMeta(airQuality.aqi) : null;
  const freshness = airQuality
    ? getDataFreshness(airQuality.observedAt, airQuality.sourceType, nowMs)
    : null;

  const subIndexChartData = (airQuality?.pollutants ?? [])
    .filter((p) => p.subIndex !== null)
    .map((p) => ({
      name: p.formula,
      subIndex: p.subIndex ?? 0,
      value: p.value,
      unit: p.unit,
      color: getAqiMeta(p.subIndex ?? 0).barColor,
    }));

  return (
    <div className="space-y-8">
      {/* Search & Data Source Selector Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Urban Air Quality Overview
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Check live modeled pollutant concentrations or explore realistic demo smog scenarios.
            </p>
          </div>

          {/* Interactive mode switch: Live vs Sample Demo Scenarios */}
          <div
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start lg:self-auto"
            role="tablist"
            aria-label="Data source mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={dataModeTab === 'live'}
              onClick={() => {
                setDataModeTab('live');
                if (airQuality?.sourceType === 'demo' && profile.city.trim()) {
                  onSearchLiveCity({ city: profile.city });
                }
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap min-h-[36px] ${
                dataModeTab === 'live'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live City Lookup
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dataModeTab === 'demo'}
              onClick={() => {
                setDataModeTab('demo');
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap min-h-[36px] ${
                dataModeTab === 'demo'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sample Demo Scenarios
            </button>
          </div>
        </div>

        {dataModeTab === 'live' ? (
          <div className="space-y-3">
            <form onSubmit={handleSubmitSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <label htmlFor="city-search-input" className="sr-only">
                  Enter city or location
                </label>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="city-search-input"
                  type="text"
                  value={cityInput}
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    setInputError(null);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  placeholder="Enter any city worldwide (e.g., New Delhi, Pune, Tokyo, London)..."
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600"
                  autoComplete="off"
                />

                {showSuggestions && suggestions.length > 0 && (
                  <ul
                    role="listbox"
                    aria-label="Matching cities"
                    className="absolute z-20 mt-1.5 w-full rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden divide-y divide-slate-100"
                  >
                    {suggestions.map((loc) => (
                      <li key={`${loc.name}-${loc.latitude}-${loc.longitude}`}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCityInput(loc.name);
                            setShowSuggestions(false);
                            onSearchLiveCity({
                              city: loc.name,
                              lat: loc.latitude,
                              lon: loc.longitude,
                              region: loc.region,
                              country: loc.country,
                            });
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="font-medium text-slate-900">{loc.name}</span>
                          <span className="text-xs text-slate-500 truncate">
                            {[loc.region, loc.country].filter(Boolean).join(', ')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="min-h-[44px] px-5 py-2.5 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                {loading ? 'Checking…' : 'Check Air Quality'}
              </button>

              <button
                type="button"
                onClick={onRefresh}
                disabled={loading || !airQuality}
                className="min-h-[44px] px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                aria-label="Refresh readings"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>Refresh</span>
              </button>
            </form>

            {inputError && (
              <p className="text-xs text-red-700" role="alert">
                {inputError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 pt-1">
              <span className="font-medium text-slate-500">Example cities to explore:</span>
              {QUICK_CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setCityInput(city);
                    setInputError(null);
                    onSearchLiveCity({ city });
                  }}
                  className="text-teal-700 hover:text-teal-900 hover:underline font-medium py-1 whitespace-nowrap"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Demo scenarios use representative simulated readings so you can test severe winter smog alerts, routine recommendations, and AI guidance even offline.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DEMO_SCENARIO_OPTIONS.map((scenario) => {
                const isSelected = airQuality?.sourceType === 'demo' && airQuality?.scenarioId === scenario.id;
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => onSelectDemoScenario(scenario.id)}
                    className={`p-3.5 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50/70'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{scenario.city}</div>
                    <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{scenario.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Error State */}
      {error && (
        <section
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900">Unable to load live readings</h2>
              <p className="text-sm text-slate-700">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 whitespace-nowrap min-h-[40px]"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => {
                setDataModeTab('demo');
                onSelectDemoScenario('delhi-winter-smog');
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 whitespace-nowrap min-h-[40px]"
            >
              Load Sample Demo
            </button>
          </div>
        </section>
      )}

      {/* Loading Skeleton */}
      {loading && !airQuality && (
        <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading air quality data">
          <div className="h-56 rounded-xl border border-slate-200 bg-slate-100/70" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 rounded-xl border border-slate-200 bg-slate-100/70" />
            <div className="h-72 rounded-xl border border-slate-200 bg-slate-100/70" />
          </div>
        </div>
      )}

      {/* Location Prompt State — Never Assume User's Location */}
      {!loading && !airQuality && !error && (
        <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-8 sm:p-10 space-y-5">
          <div className="flex items-start gap-3.5 max-w-2xl">
            <MapPin className="h-6 w-6 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Where are you checking air quality today?
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                AirAware AI never assumes your location. Enter your city above to load live air quality readings with timestamps, or switch to Sample Demo Scenarios to test severe winter smog guidance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => document.getElementById('city-search-input')?.focus()}
              className="min-h-[42px] px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors whitespace-nowrap"
            >
              Enter My City
            </button>
            <button
              type="button"
              onClick={() => {
                setDataModeTab('demo');
                onSelectDemoScenario('delhi-winter-smog');
              }}
              className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Explore Demo Smog Scenario
            </button>
          </div>
        </section>
      )}

      {/* Populated Air Quality Dashboard */}
      {airQuality && aqiMeta && freshness && (
        <>
          {/* Outdated Live Data Warning Banner */}
          {freshness.isOutdated && (
            <section
              role="alert"
              className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-amber-950">
                    Live Air Quality Data May Be Outdated ({freshness.ageLabel})
                  </h2>
                  <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
                    Last recorded at <strong className="font-mono">{freshness.formattedTimestamp}</strong>. Urban air quality can shift quickly with wind and traffic—please refresh and verify current AQI before starting outdoor activities.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-amber-900 text-white text-xs font-semibold hover:bg-amber-950 transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>Refresh Live Data</span>
              </button>
            </section>
          )}

          {/* Clear Provenance Banner: Live vs Demo + Explicit Timestamp */}
          <div
            className={`rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs ${
              airQuality.sourceType === 'live'
                ? 'border-sky-200 bg-sky-50/60 text-slate-700'
                : 'border-amber-200 bg-amber-50/70 text-amber-950'
            }`}
          >
            <div className="flex items-start sm:items-center gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0 text-slate-600" aria-hidden="true" />
              <span>
                <strong className="font-semibold">
                  {airQuality.sourceType === 'live' ? 'Live API Data: ' : 'Demo Data Notice: '}
                </strong>
                {airQuality.sourceType === 'live'
                  ? `${airQuality.sourceName} · Observed ${freshness.formattedTimestamp} (${freshness.ageLabel})`
                  : `${airQuality.demoNotice} · Timestamp: ${freshness.formattedTimestamp}`}
              </span>
            </div>
            <span className="font-mono text-slate-500 whitespace-nowrap tabular-nums">
              {airQuality.latitude.toFixed(2)}°, {airQuality.longitude.toFixed(2)}°
            </span>
          </div>

          {/* Emergency Advisory when AQI >= 301 */}
          <EmergencyBanner
            airQuality={airQuality}
            onOpenIndoorGuide={() => onNavigate('indoor')}
          />

          {/* Dominant Focal Anchor: Primary AQI Score + Health Implications */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Left 5 columns: AQI Hero Metric */}
              <div className={`lg:col-span-5 p-6 sm:p-7 ${aqiMeta.softBg} flex flex-col justify-between gap-6`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="font-medium truncate">
                      {[airQuality.city, airQuality.region, airQuality.country].filter(Boolean).join(', ')}
                    </span>
                    <span className="whitespace-nowrap font-medium">
                      {airQuality.sourceType === 'live' ? 'Live API Reading' : 'Simulated Demo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono tabular-nums">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                    <span>
                      Observed: {freshness.formattedTimestamp} ({freshness.ageLabel})
                    </span>
                  </div>

                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-6xl sm:text-7xl font-semibold tracking-tight text-slate-900 tabular-nums">
                      {airQuality.aqi}
                    </span>
                    <div>
                      <div className={`font-display text-xl font-bold ${aqiMeta.textColor}`}>
                        {airQuality.category}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Indian NAQI Scale (0–500)
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-800 leading-relaxed">
                    {aqiMeta.healthSummary} Check current AQI again right before starting outdoor activities.
                  </p>
                </div>

                {/* 6-Band Visual Scale Bar */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Dominant pollutant: <strong className="text-slate-900">{airQuality.dominantPollutant}</strong></span>
                    {airQuality.usAqi !== null && airQuality.usAqi !== undefined && (
                      <span className="font-mono tabular-nums">US AQI: {Math.round(airQuality.usAqi)}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-6 gap-1" aria-label="Air quality 6-band scale">
                    {AQI_CATEGORIES.map((band) => {
                      const active = band.category === airQuality.category;
                      return (
                        <div key={band.category} className="space-y-1">
                          <div
                            className={`h-2 rounded-xs transition-opacity ${
                              active ? 'opacity-100 ring-2 ring-slate-900/30 ring-offset-1' : 'opacity-35'
                            }`}
                            style={{ backgroundColor: band.barColor }}
                          />
                          <div
                            className={`text-[10px] truncate ${
                              active ? 'font-semibold text-slate-900' : 'text-slate-500'
                            }`}
                          >
                            {band.category}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right 7 columns: Health Implications & Action Links */}
              <div className="lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between gap-6 bg-white">
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold text-slate-900">
                      Health Implications & Protection
                    </h2>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      Household of {profile.familySize}
                    </span>
                  </div>

                  <dl className="divide-y divide-slate-100 text-sm">
                    <div className="py-3 first:pt-0 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
                      <dt className="sm:col-span-4 font-medium text-slate-600">General Public</dt>
                      <dd className="sm:col-span-8 text-slate-900 leading-relaxed">
                        {aqiMeta.generalPopulation}
                      </dd>
                    </div>
                    <div className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
                      <dt className="sm:col-span-4 font-medium text-slate-600">Sensitive Groups</dt>
                      <dd className="sm:col-span-8 text-slate-900 leading-relaxed">
                        {aqiMeta.sensitiveGroups}
                      </dd>
                    </div>
                    <div className="py-3 last:pb-0 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
                      <dt className="sm:col-span-4 font-medium text-slate-600">Mask Guidance</dt>
                      <dd className="sm:col-span-8 text-slate-900 leading-relaxed flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{aqiMeta.maskGuidance}</span>
                      </dd>
                    </div>
                  </dl>

                  {airQuality.aqi <= 100 && (
                    <div className="rounded-lg border border-teal-100 bg-teal-50/50 px-3.5 py-2.5 text-xs text-teal-950 leading-relaxed">
                      <strong className="font-semibold">Sensitive-Group Reminder Even as AQI Improves: </strong>
                      Children, older adults, and people with asthma or heart/lung conditions should still avoid busy roadside exhaust, carry prescribed inhalers, and re-check current AQI right before outdoor activities.
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('routine')}
                    className="min-h-[42px] px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>Build Smart Daily Routine</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('assistant')}
                    className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    Ask AI Assistant
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('indoor')}
                    className="min-h-[42px] px-3 py-2 text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline whitespace-nowrap"
                  >
                    Indoor Air Guide
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Charts Row: 24-Hour Trend + Pollutant Sub-Index Breakdown */}
          <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* 24-Hour Trend Chart */}
            <div className="xl:col-span-7 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    24-Hour Modeled Trend (Forecast Estimate — Not Guaranteed)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hourly forecasts are estimates that can change quickly with wind, weather, or traffic. Always check current AQI right before going outside.
                  </p>
                </div>

                <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setChartMetric('aqi')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      chartMetric === 'aqi' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    NAQI Trend
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric('pm')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      chartMetric === 'pm' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    PM2.5 & PM10
                  </button>
                </div>
              </div>

              <div className="h-64 w-full" aria-label="24 hour air quality chart">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMetric === 'aqi' ? (
                    <AreaChart data={airQuality.hourly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="hourLabel"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        interval={3}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="aqi"
                        name="Estimated NAQI"
                        stroke="#0f766e"
                        strokeWidth={2}
                        fill="url(#aqiGradient)"
                      />
                    </AreaChart>
                  ) : (
                    <AreaChart data={airQuality.hourly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="hourLabel"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        interval={3}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pm10"
                        name="Estimated PM10 (µg/m³)"
                        stroke="#0284c7"
                        fill="#0284c7"
                        fillOpacity={0.12}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="pm25"
                        name="Estimated PM2.5 (µg/m³)"
                        stroke="#0f766e"
                        fill="#0f766e"
                        fillOpacity={0.22}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pollutant Sub-Index Comparison */}
            <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Pollutant Sub-Index Breakdown
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Highest individual pollutant sub-index sets the overall NAQI score.
                </p>
              </div>

              <div className="h-64 w-full" aria-label="Pollutant sub-index bar chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subIndexChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="subIndex" name="NAQI Sub-Index" radius={[4, 4, 0, 0]} maxBarSize={42}>
                      {subIndexChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Detailed Pollutant Data Table */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Measured Pollutant Concentrations
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compared against World Health Organization (WHO 2021) air quality guideline benchmarks.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{airQuality.timezone}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-6">Pollutant</th>
                    <th className="py-3 px-4 text-right">Concentration</th>
                    <th className="py-3 px-4 text-right">Sub-Index</th>
                    <th className="py-3 px-4">WHO Reference</th>
                    <th className="py-3 px-6">Health Relevance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {airQuality.pollutants.map((pollutant) => {
                    const pMeta = pollutant.subIndex !== null ? getAqiMeta(pollutant.subIndex) : null;
                    return (
                      <tr key={pollutant.key} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{pollutant.formula}</div>
                          <div className="text-xs text-slate-500">{pollutant.label}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap text-slate-900">
                          {pollutant.value !== null ? (
                            <>
                              <span className="font-semibold">{pollutant.value}</span>
                              <span className="ml-1 text-xs text-slate-500">{pollutant.unit}</span>
                            </>
                          ) : (
                            <span className="text-slate-400">Unavailable</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {pollutant.subIndex !== null && pMeta ? (
                            <div className="inline-flex flex-col items-end">
                              <span className="font-mono font-semibold tabular-nums text-slate-900">
                                {pollutant.subIndex}
                              </span>
                              <span className={`text-xs font-medium ${pMeta.textColor}`}>
                                {pMeta.category}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                          {pollutant.whoGuideline24h}
                        </td>
                        <td className="py-3.5 px-6 text-xs text-slate-600 min-w-[240px] leading-relaxed">
                          {pollutant.summary}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

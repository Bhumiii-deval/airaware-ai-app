import { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bike,
  CheckSquare,
  Clock,
  HeartPulse,
  MapPin,
  RefreshCw,
  School,
  Sparkles,
  Square,
  TrainFront,
} from 'lucide-react';
import type { AirQualityData, SmartDailyRoutine, UserProfile } from '../types/airQuality';
import { generateSmartDailyRoutine } from '../lib/api';
import { getAqiMeta, getDataFreshness } from '../lib/aqiUtils';
import { EmergencyBanner } from './EmergencyBanner';

interface RoutineViewProps {
  airQuality: AirQualityData | null;
  profile: UserProfile;
  nowMs: number;
  routine: SmartDailyRoutine | null;
  onUpdateRoutine: (routine: SmartDailyRoutine) => void;
  onOpenIndoorGuide: () => void;
  onOpenProfile: () => void;
  onOpenDashboard: () => void;
  onRefreshAirQuality: () => void;
}

export function RoutineView({
  airQuality,
  profile,
  nowMs,
  routine,
  onUpdateRoutine,
  onOpenIndoorGuide,
  onOpenProfile,
  onOpenDashboard,
  onRefreshAirQuality,
}: RoutineViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedHabits, setCheckedHabits] = useState<Record<string, boolean>>({});
  const freshness = airQuality
    ? getDataFreshness(airQuality.observedAt, airQuality.sourceType, nowMs)
    : null;

  const handleGenerate = async () => {
    if (!airQuality || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateSmartDailyRoutine({ airQuality, profile });
      onUpdateRoutine(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to generate routine right now.');
    } finally {
      setLoading(false);
    }
  };

  const toggleHabit = (habit: string) => {
    setCheckedHabits((prev) => ({ ...prev, [habit]: !prev[habit] }));
  };

  const aqiMeta = airQuality ? getAqiMeta(airQuality.aqi) : null;
  const isStale =
    routine &&
    airQuality &&
    (routine.city !== airQuality.city || routine.aqiAtGeneration !== airQuality.aqi);

  // Determine the lowest-AQI hourly window mathematically from available hourly forecast
  const lowestHourPoint =
    airQuality?.hourly && airQuality.hourly.length > 0
      ? airQuality.hourly.reduce((best, cur) => (cur.aqi < best.aqi ? cur : best), airQuality.hourly[0])
      : null;

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Smart Daily Routine Planner
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Personalized outdoor timing, exercise modifications, school and elderly care, and low-emission commuting powered by Gemini AI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenProfile}
              className="min-h-[42px] px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Adjust Household Profile
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!airQuality || loading}
              className="min-h-[42px] px-5 py-2 text-sm font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Generating Plan…</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span>{routine ? 'Regenerate AI Routine' : 'Generate AI Routine'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {airQuality && aqiMeta && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
            <span>
              Active city: <strong className="text-slate-900">{airQuality.city}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Current NAQI:{' '}
              <strong className={`font-mono tabular-nums ${aqiMeta.textColor}`}>
                {airQuality.aqi} ({airQuality.category})
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Source: <strong>{airQuality.sourceType === 'live' ? 'Live API' : 'Demo Scenario'}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Observed:{' '}
              <strong className="font-mono tabular-nums text-slate-800">
                {new Date(airQuality.observedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </strong>
            </span>
            {lowestHourPoint && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Lowest forecast estimate (not guaranteed):{' '}
                  <strong className="font-mono tabular-nums text-slate-900">
                    {lowestHourPoint.hourLabel} (est. NAQI {lowestHourPoint.aqi})
                  </strong>
                </span>
              </>
            )}
          </div>
        )}
      </section>

      {airQuality && freshness?.isOutdated && (
        <section
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Live AQI data for <strong>{airQuality.city}</strong> is outdated ({freshness.ageLabel}, observed {freshness.formattedTimestamp}). Refresh before generating your daily routine.
            </span>
          </div>
          <button
            type="button"
            onClick={onRefreshAirQuality}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-amber-900 text-white text-xs font-semibold hover:bg-amber-950 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            Refresh Live AQI
          </button>
        </section>
      )}

      {airQuality && (
        <EmergencyBanner airQuality={airQuality} onOpenIndoorGuide={onOpenIndoorGuide} />
      )}

      {isStale && (
        <div className="rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-700">
          <span>
            Your city or AQI changed since this routine was generated ({routine.city}, NAQI {routine.aqiAtGeneration}).
          </span>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="font-semibold text-teal-800 hover:underline whitespace-nowrap text-left"
          >
            Update routine for {airQuality?.city}
          </button>
        </div>
      )}

      {error && (
        <section
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-red-950">Could not generate AI daily routine</h2>
              <p className="text-sm text-red-800 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 whitespace-nowrap"
          >
            Retry Generation
          </button>
        </section>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse" aria-busy="true">
          <div className="md:col-span-2 h-28 rounded-xl border border-slate-200 bg-slate-100/70" />
          <div className="h-44 rounded-xl border border-slate-200 bg-slate-100/70" />
          <div className="h-44 rounded-xl border border-slate-200 bg-slate-100/70" />
          <div className="h-44 rounded-xl border border-slate-200 bg-slate-100/70" />
          <div className="h-44 rounded-xl border border-slate-200 bg-slate-100/70" />
        </div>
      )}

      {/* Empty / Ready to Generate State */}
      {!loading && !routine && !airQuality && (
        <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8 space-y-4">
          <div className="flex items-start gap-3 max-w-2xl">
            <MapPin className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1.5">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Enter your city first to build a personalized routine
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                AirAware AI never assumes your location or invents AQI numbers. Select your city (or a sample demo scenario) on the Air Dashboard, then return here to generate your daily routine.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="min-h-[42px] px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors whitespace-nowrap"
          >
            Go to Air Dashboard to Enter City
          </button>
        </section>
      )}

      {!loading && !routine && airQuality && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Ready to build your personalized daily schedule for {airQuality.city}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Click <strong>Generate AI Routine</strong> above to combine {airQuality.city}’s modeled 24-hour pollution curve (estimates, not guaranteed) with your household profile ({profile.familySize} members, {profile.commuteType}, {profile.vulnerableGroups.length > 0 ? profile.vulnerableGroups.join(', ') : 'general household'}).
            </p>
          </div>

          {aqiMeta && (
            <div className="pt-5 border-t border-slate-200 space-y-3">
              <div className="text-xs font-semibold text-slate-500">
                Standard Evidence-Based Baseline for {airQuality.category} Air (Before AI Personalization)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">Estimated Forecast Window (Not Guaranteed)</div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {airQuality.aqi >= 301
                      ? 'Avoid outdoor activity; stay indoors and wear a snug N95 mask if stepping out cannot be avoided.'
                      : lowestHourPoint
                        ? `Modeled hourly data estimates the lowest reading around ${lowestHourPoint.hourLabel} (NAQI ${lowestHourPoint.aqi}). Check current AQI right before going outside.`
                        : 'Hourly data is unavailable; check current live AQI before stepping outside rather than relying on fixed hours.'}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">Masks & Commute</div>
                  <p className="text-slate-600 text-xs leading-relaxed">{aqiMeta.maskGuidance}</p>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">Sensitive Household Care</div>
                  <p className="text-slate-600 text-xs leading-relaxed">{aqiMeta.sensitiveGroups}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* AI-Generated Routine Content */}
      {!loading && routine && (
        <div className="space-y-6">
          {/* Executive Summary */}
          <section className="rounded-xl border border-slate-200 bg-teal-50/40 p-6 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span className="font-semibold text-teal-900">
                Personalized Plan for {routine.city} · NAQI {routine.aqiAtGeneration} ({routine.categoryAtGeneration})
              </span>
              <span className="font-mono tabular-nums">
                AQI observed{' '}
                {getDataFreshness(
                  routine.aqiObservedAt ?? airQuality?.observedAt,
                  routine.sourceType,
                  nowMs
                ).formattedTimestamp}
                {' · '}
                {routine.sourceType === 'live' ? 'Live API data' : 'Demo scenario'}
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-800 leading-relaxed">{routine.summary}</p>
          </section>

          {/* Structured Routine Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Best Estimated Outdoor Window */}
            <article className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  <span>Estimated Outdoor Window (Not Guaranteed)</span>
                </h2>
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Caution: {routine.bestOutdoorWindow.cautionLevel}
                </span>
              </div>
              <div className="font-mono text-lg font-semibold text-teal-800 tabular-nums">
                {routine.bestOutdoorWindow.timeRange}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{routine.bestOutdoorWindow.reason}</p>
              <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                Forecasts can shift with wind and traffic—always check current AQI right before heading outdoors.
              </p>
            </article>

            {/* 2. Exercise Recommendations */}
            <article className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Bike className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  <span>Exercise & Fitness Guidance</span>
                </h2>
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                  {routine.exerciseGuidance.intensity}
                </span>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed">{routine.exerciseGuidance.recommendation}</p>
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                <strong className="text-slate-800">Indoor option:</strong> {routine.exerciseGuidance.indoorAlternative}
              </div>
            </article>

            {/* 3. Commuting Alternatives */}
            <article className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
              <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                <TrainFront className="h-4 w-4 text-teal-700" aria-hidden="true" />
                <span>Commuting & Mobility Plan</span>
              </h2>
              <p className="text-sm text-slate-800 leading-relaxed">{routine.commutePlan.primarySuggestion}</p>
              <dl className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div>
                  <dt className="inline font-semibold text-slate-800">Exposure protection: </dt>
                  <dd className="inline">{routine.commutePlan.protectionTip}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-800">Lower-emission impact: </dt>
                  <dd className="inline">{routine.commutePlan.emissionSavingsNote}</dd>
                </div>
              </dl>
            </article>

            {/* 4. School-Going Children's Precautions */}
            <article className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
              <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                <School className="h-4 w-4 text-teal-700" aria-hidden="true" />
                <span>School-Going Children’s Precautions</span>
              </h2>
              <dl className="space-y-2 text-sm text-slate-700">
                <div>
                  <dt className="text-xs font-semibold text-slate-500">School Commute</dt>
                  <dd className="mt-0.5 leading-relaxed">{routine.childrenPrecautions.schoolCommute}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">Outdoor Play & Sports</dt>
                  <dd className="mt-0.5 leading-relaxed">{routine.childrenPrecautions.outdoorPlay}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">Hydration & Classroom Care</dt>
                  <dd className="mt-0.5 leading-relaxed">{routine.childrenPrecautions.classroomTip}</dd>
                </div>
              </dl>
            </article>

            {/* 5. Elderly Household Members */}
            <article className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
              <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-teal-700" aria-hidden="true" />
                <span>Suggestions for Elderly Members</span>
              </h2>
              <dl className="space-y-2 text-sm text-slate-700">
                <div>
                  <dt className="text-xs font-semibold text-slate-500">Morning & Evening Timing</dt>
                  <dd className="mt-0.5 leading-relaxed">{routine.elderlyGuidance.morningEveningAdvice}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">Indoor Comfort</dt>
                  <dd className="mt-0.5 leading-relaxed">{routine.elderlyGuidance.indoorComfort}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-slate-500">When to Seek Medical Care</dt>
                  <dd className="mt-0.5 leading-relaxed">{routine.elderlyGuidance.symptomWatch}</dd>
                </div>
              </dl>
            </article>

            {/* 6. Low-Emission Daily Choices Checklist */}
            <article className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Low-Emission Lifestyle Choices Today
              </h2>
              <p className="text-xs text-slate-500">
                Check off actions your household plans to follow today.
              </p>
              <ul className="space-y-2 pt-1">
                {routine.lowEmissionHabits.map((habit) => {
                  const checked = Boolean(checkedHabits[habit]);
                  return (
                    <li key={habit}>
                      <button
                        type="button"
                        onClick={() => toggleHabit(habit)}
                        aria-pressed={checked}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left text-sm transition-colors ${
                          checked
                            ? 'bg-emerald-50/80 text-emerald-950'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                        )}
                        <span className={checked ? 'line-through text-slate-600' : ''}>{habit}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          </div>
        </div>
      )}
    </div>
  );
}

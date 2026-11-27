import { AlertTriangle, PhoneCall } from 'lucide-react';
import type { AirQualityData } from '../types/airQuality';

interface EmergencyBannerProps {
  airQuality: AirQualityData;
  onOpenIndoorGuide: () => void;
}

export function EmergencyBanner({ airQuality, onOpenIndoorGuide }: EmergencyBannerProps) {
  if (airQuality.aqi < 301) return null;

  const isSevere = airQuality.aqi >= 401;

  return (
    <section
      role="alert"
      aria-live="assertive"
      className={`rounded-xl border p-5 ${
        isSevere
          ? 'bg-rose-50 border-rose-300 text-rose-950'
          : 'bg-red-50/80 border-red-200 text-red-950'
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3.5 max-w-3xl">
          <AlertTriangle
            className={`h-5 w-5 shrink-0 mt-0.5 ${isSevere ? 'text-rose-800' : 'text-red-700'}`}
            aria-hidden="true"
          />
          <div className="space-y-1.5">
            <h2 className="font-display text-base font-semibold">
              {isSevere
                ? `Hazardous Air Quality Advisory — Severe (${airQuality.aqi} NAQI)`
                : `High-Risk Air Quality Advisory — Very Poor (${airQuality.aqi} NAQI)`}
            </h2>
            <p className="text-sm leading-relaxed text-slate-800">
              {isSevere
                ? 'Air pollution is at emergency levels. Stay indoors, avoid all outdoor exertion, seal window drafts, keep indoor spaces smoke-free, and wear a snug N95/FFP2 respirator if essential travel cannot be avoided.'
                : 'Prolonged outdoor exposure poses serious respiratory risk, especially for children, older adults, and people with asthma or heart conditions. Move workouts indoors and use a well-fitted N95/FFP2 mask outside.'}
            </p>
            <p className="text-xs text-slate-700 flex items-center gap-1.5 pt-1">
              <PhoneCall className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Seek immediate medical help if anyone experiences severe shortness of breath, chest tightness, dizziness, or persistent wheezing.
                {airQuality.sourceType === 'demo' ? ' (Shown for active demo scenario.)' : ''}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenIndoorGuide}
          className="shrink-0 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap min-h-[40px]"
        >
          Indoor Protection Steps
        </button>
      </div>
    </section>
  );
}

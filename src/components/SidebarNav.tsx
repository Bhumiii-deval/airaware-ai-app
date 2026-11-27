import {
  Activity,
  BookOpen,
  CalendarClock,
  Home,
  Leaf,
  MessageSquareText,
  SlidersHorizontal,
  Wind,
  X,
} from 'lucide-react';
import type { ActiveSection, AirQualityData } from '../types/airQuality';
import { getAqiMeta, getDataFreshness } from '../lib/aqiUtils';

interface SidebarNavProps {
  activeSection: ActiveSection;
  onSelect: (section: ActiveSection) => void;
  airQuality: AirQualityData | null;
  nowMs: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const NAV_ITEMS: {
  id: ActiveSection;
  label: string;
  description: string;
  icon: typeof Activity;
}[] = [
  { id: 'dashboard', label: 'Air Dashboard', description: 'Live AQI & pollutants', icon: Activity },
  { id: 'assistant', label: 'AI Assistant', description: 'Ask AirAware AI', icon: MessageSquareText },
  { id: 'routine', label: 'Daily Routine', description: 'Smart family plan', icon: CalendarClock },
  { id: 'indoor', label: 'Indoor Guide', description: 'Ventilation & HEPA', icon: Home },
  { id: 'eco', label: 'Eco Impact', description: 'Commute emissions', icon: Leaf },
  { id: 'education', label: 'Pollution Learn', description: 'AQI, PM2.5 & smog', icon: BookOpen },
  { id: 'profile', label: 'Personalize', description: 'Household profile', icon: SlidersHorizontal },
];

export function SidebarNav({
  activeSection,
  onSelect,
  airQuality,
  nowMs,
  mobileOpen,
  onCloseMobile,
}: SidebarNavProps) {
  const aqiMeta = airQuality ? getAqiMeta(airQuality.aqi) : null;

  const navContent = (
    <div className="flex h-full flex-col bg-slate-50/70 border-r border-slate-200">
      {/* Brand header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => {
            onSelect('dashboard');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left focus-visible:rounded-md"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white shrink-0">
            <Wind className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              AirAware AI
            </div>
            <div className="text-xs text-slate-500 whitespace-nowrap">
              Breathe Better. Live Smarter.
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-colors min-h-[44px] ${
                isActive
                  ? 'bg-teal-700 text-white font-medium'
                  : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${isActive ? 'text-teal-100' : 'text-slate-500'}`}
                aria-hidden="true"
              />
              <span className="text-sm whitespace-nowrap truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active city telemetry summary at bottom of sidebar */}
      <div className="p-4 border-t border-slate-200 bg-white">
        {airQuality && aqiMeta ? (() => {
          const freshness = getDataFreshness(airQuality.observedAt, airQuality.sourceType, nowMs);
          return (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-slate-600 truncate">
                  {airQuality.city}
                </span>
                <span className={`text-xs font-semibold ${aqiMeta.textColor} whitespace-nowrap`}>
                  {airQuality.category}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                  {airQuality.aqi}
                  <span className="ml-1 text-xs font-sans font-normal text-slate-500">NAQI</span>
                </span>
                <span className={`text-xs ${freshness.isOutdated ? 'text-amber-800 font-semibold' : 'text-slate-500'}`}>
                  {freshness.isOutdated ? 'Outdated' : airQuality.sourceType === 'live' ? 'Live API' : 'Demo'}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(6, (airQuality.aqi / 500) * 100))}%`,
                    backgroundColor: aqiMeta.barColor,
                  }}
                />
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate tabular-nums">
                {freshness.formattedTimestamp}
              </div>
            </div>
          );
        })() : (
          <p className="text-xs text-slate-500 leading-relaxed">
            No city selected yet. Enter your city on the dashboard to view live AQI.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {navContent}
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}

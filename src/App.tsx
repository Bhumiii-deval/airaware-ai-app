import { useCallback, useEffect, useState } from 'react';
import { Menu, MessageSquareText } from 'lucide-react';
import type {
  ActiveSection,
  AirQualityData,
  ChatMessage,
  SmartDailyRoutine,
  UserProfile,
} from './types/airQuality';
import { fetchDemoAirQuality, fetchLiveAirQuality } from './lib/api';
import { getDataFreshness } from './lib/aqiUtils';
import { NAV_ITEMS, SidebarNav } from './components/SidebarNav';
import { DashboardView } from './components/DashboardView';
import { AssistantView } from './components/AssistantView';
import { RoutineView } from './components/RoutineView';
import { IndoorGuideView } from './components/IndoorGuideView';
import { EcoImpactView } from './components/EcoImpactView';
import { EducationView } from './components/EducationView';
import { ProfileView } from './components/ProfileView';

const PROFILE_STORAGE_KEY = 'airaware_ai_user_profile_v1';

const DEFAULT_PROFILE: UserProfile = {
  city: '',
  familySize: 4,
  lifestyle: 'Balanced Urban',
  commuteType: 'Petrol/Diesel Car',
  outdoorActivities: ['Morning Walk', 'Children’s Playground'],
  vulnerableGroups: ['School-Going Children (5–17 yrs)', 'Older Adults (60+ yrs)'],
};

function loadInitialProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      city: typeof parsed.city === 'string' ? parsed.city.trim() : DEFAULT_PROFILE.city,
      familySize:
        typeof parsed.familySize === 'number' && parsed.familySize >= 1 && parsed.familySize <= 15
          ? parsed.familySize
          : DEFAULT_PROFILE.familySize,
      lifestyle: parsed.lifestyle ?? DEFAULT_PROFILE.lifestyle,
      commuteType: parsed.commuteType ?? DEFAULT_PROFILE.commuteType,
      outdoorActivities: Array.isArray(parsed.outdoorActivities)
        ? parsed.outdoorActivities
        : DEFAULT_PROFILE.outdoorActivities,
      vulnerableGroups: Array.isArray(parsed.vulnerableGroups)
        ? parsed.vulnerableGroups
        : DEFAULT_PROFILE.vulnerableGroups,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => loadInitialProfile());

  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [aqLoading, setAqLoading] = useState<boolean>(() => Boolean(loadInitialProfile().city));
  const [aqError, setAqError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<{
    mode: 'live' | 'demo';
    city?: string;
    lat?: number;
    lon?: number;
    region?: string;
    country?: string;
    scenarioId?: string;
  }>(() => ({ mode: 'live', city: loadInitialProfile().city || undefined }));

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [dailyRoutine, setDailyRoutine] = useState<SmartDailyRoutine | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadLiveCity = useCallback(
    async (params: {
      city: string;
      lat?: number;
      lon?: number;
      region?: string;
      country?: string;
    }) => {
      setAqLoading(true);
      setAqError(null);
      setLastQuery({ mode: 'live', ...params });
      try {
        const data = await fetchLiveAirQuality(params);
        setAirQuality(data);
      } catch (err: unknown) {
        setAqError(
          err instanceof Error
            ? err.message
            : 'Live air quality data could not be loaded right now.'
        );
      } finally {
        setAqLoading(false);
      }
    },
    []
  );

  const loadDemoScenario = useCallback(async (scenarioId: string) => {
    setAqLoading(true);
    setAqError(null);
    setLastQuery({ mode: 'demo', scenarioId });
    try {
      const data = await fetchDemoAirQuality(scenarioId);
      setAirQuality(data);
    } catch (err: unknown) {
      setAqError(err instanceof Error ? err.message : 'Unable to load sample demo scenario.');
    } finally {
      setAqLoading(false);
    }
  }, []);

  // Only auto-fetch live air quality if the user previously saved a city (never assume a location)
  useEffect(() => {
    if (profile.city.trim()) {
      void loadLiveCity({ city: profile.city });
    }
    // Only run once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshAirQuality = () => {
    if (lastQuery.mode === 'demo' && lastQuery.scenarioId) {
      void loadDemoScenario(lastQuery.scenarioId);
    } else if (lastQuery.city || profile.city.trim()) {
      void loadLiveCity({
        city: lastQuery.city || profile.city,
        lat: lastQuery.lat,
        lon: lastQuery.lon,
        region: lastQuery.region,
        country: lastQuery.country,
      });
    }
  };

  const handleSaveProfile = (next: UserProfile, fetchNewCity: boolean) => {
    setProfile(next);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
    if (fetchNewCity && next.city.trim()) {
      void loadLiveCity({ city: next.city });
    }
  };

  const handleResetProfile = () => {
    setProfile(DEFAULT_PROFILE);
    setAirQuality(null);
    setAqError(null);
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const currentNavItem = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0];
  const headerFreshness = airQuality
    ? getDataFreshness(airQuality.observedAt, airQuality.sourceType, nowMs)
    : null;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex">
      {/* Persistent Desktop Sidebar + Mobile Drawer */}
      <SidebarNav
        activeSection={activeSection}
        onSelect={setActiveSection}
        airQuality={airQuality}
        nowMs={nowMs}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-display font-bold text-slate-900 whitespace-nowrap lg:hidden">
                AirAware AI
              </span>
              <span className="hidden lg:inline text-slate-500 whitespace-nowrap">AirAware AI</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="font-medium text-slate-900 truncate">{currentNavItem.label}</span>
              {airQuality && headerFreshness ? (
                <span className="hidden md:inline text-xs text-slate-500 truncate">
                  · {airQuality.city} ({airQuality.sourceType === 'live' ? 'Live' : 'Demo'} ·{' '}
                  <span className="font-mono tabular-nums">{headerFreshness.formattedTimestamp}</span>
                  {headerFreshness.isOutdated ? (
                    <span className="text-amber-800 font-semibold"> · Outdated</span>
                  ) : null}
                  )
                </span>
              ) : (
                <span className="hidden md:inline text-xs text-slate-400 truncate">
                  · No location selected
                </span>
              )}
            </nav>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection(activeSection === 'assistant' ? 'dashboard' : 'assistant')}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-teal-700 text-white text-xs sm:text-sm font-semibold hover:bg-teal-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <MessageSquareText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{activeSection === 'assistant' ? 'View Dashboard' : 'Ask AirAware AI'}</span>
            </button>
          </div>
        </header>

        {/* Active View Content */}
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {activeSection === 'dashboard' && (
            <DashboardView
              airQuality={airQuality}
              loading={aqLoading}
              error={aqError}
              profile={profile}
              nowMs={nowMs}
              onSearchLiveCity={loadLiveCity}
              onSelectDemoScenario={loadDemoScenario}
              onRefresh={handleRefreshAirQuality}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'assistant' && (
            <AssistantView
              airQuality={airQuality}
              profile={profile}
              nowMs={nowMs}
              messages={chatMessages}
              onUpdateMessages={setChatMessages}
              onOpenIndoorGuide={() => setActiveSection('indoor')}
              onOpenProfile={() => setActiveSection('profile')}
              onOpenDashboard={() => setActiveSection('dashboard')}
              onRefreshAirQuality={handleRefreshAirQuality}
            />
          )}

          {activeSection === 'routine' && (
            <RoutineView
              airQuality={airQuality}
              profile={profile}
              nowMs={nowMs}
              routine={dailyRoutine}
              onUpdateRoutine={setDailyRoutine}
              onOpenIndoorGuide={() => setActiveSection('indoor')}
              onOpenProfile={() => setActiveSection('profile')}
              onOpenDashboard={() => setActiveSection('dashboard')}
              onRefreshAirQuality={handleRefreshAirQuality}
            />
          )}

          {activeSection === 'indoor' && (
            <IndoorGuideView
              airQuality={airQuality}
              nowMs={nowMs}
              onRefreshAirQuality={handleRefreshAirQuality}
              onOpenDashboard={() => setActiveSection('dashboard')}
            />
          )}

          {activeSection === 'eco' && (
            <EcoImpactView
              airQuality={airQuality}
              nowMs={nowMs}
              defaultCommuteLabel={profile.commuteType}
            />
          )}

          {activeSection === 'education' && <EducationView />}

          {activeSection === 'profile' && (
            <ProfileView
              key={`${profile.city}-${profile.familySize}-${profile.lifestyle}-${profile.commuteType}`}
              profile={profile}
              onSaveProfile={handleSaveProfile}
              onResetProfile={handleResetProfile}
            />
          )}
        </main>

        {/* Quiet Footer */}
        <footer className="border-t border-slate-200 bg-slate-50/50 px-4 sm:px-6 lg:px-8 py-5 mt-8">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
            <div>
              <strong className="font-semibold text-slate-700">AirAware AI</strong> · Breathe Better. Live Smarter.
            </div>
            <div>
              Informational air quality guidance only — not a substitute for professional medical diagnosis or emergency care.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

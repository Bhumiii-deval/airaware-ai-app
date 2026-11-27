import { useState } from 'react';
import { CheckCircle2, RotateCcw, Save } from 'lucide-react';
import type { UserProfile } from '../types/airQuality';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (next: UserProfile, fetchNewCity: boolean) => void;
  onResetProfile: () => void;
}

const LIFESTYLE_OPTIONS: UserProfile['lifestyle'][] = [
  'Active Outdoor',
  'Balanced Urban',
  'Mostly Indoors',
  'Work From Home',
];

const COMMUTE_OPTIONS: UserProfile['commuteType'][] = [
  'Petrol/Diesel Car',
  'Two-Wheeler',
  'Public Transit',
  'Cycling / Walking',
  'Carpool / EV',
  'No Daily Commute',
];

const OUTDOOR_ACTIVITIES = [
  'Morning Walk',
  'Evening Walk',
  'Running / Jogging',
  'Cycling',
  'Children’s Playground',
  'Outdoor Team Sports',
  'Gardening',
];

const VULNERABLE_GROUPS = [
  'Infants & Toddlers (<5 yrs)',
  'School-Going Children (5–17 yrs)',
  'Older Adults (60+ yrs)',
  'Pregnant Members',
  'Asthma / Respiratory Sensitivity',
  'Heart / Cardiovascular Sensitivity',
];

export function ProfileView({
  profile,
  onSaveProfile,
  onResetProfile,
}: ProfileViewProps) {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const toggleArrayItem = (field: 'outdoorActivities' | 'vulnerableGroups', item: string) => {
    setSavedNotice(false);
    setDraft((prev) => {
      const exists = prev[field].includes(item);
      return {
        ...prev,
        [field]: exists ? prev[field].filter((v) => v !== item) : [...prev[field], item],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedCity = draft.city.trim();
    if (cleanedCity.length > 0 && (cleanedCity.length < 2 || cleanedCity.length > 80)) {
      setValidationError('Please enter a valid city name (2–80 characters), or leave it blank to enter your location later.');
      return;
    }
    if (draft.familySize < 1 || draft.familySize > 15) {
      setValidationError('Family size must be between 1 and 15.');
      return;
    }

    setValidationError(null);
    const cityChanged = cleanedCity.toLowerCase() !== profile.city.trim().toLowerCase();
    onSaveProfile({ ...draft, city: cleanedCity }, cityChanged && cleanedCity.length >= 2);
    setSavedNotice(true);
  };

  const handleReset = () => {
    onResetProfile();
    setSavedNotice(false);
    setValidationError(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Household Personalization
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">
          Tailor AirAware AI recommendations across the Dashboard, AI Assistant, Smart Daily Routine, and Eco Impact Tracker. Saved locally in your browser—no account required.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 space-y-8">
        {/* Section 1: Location & Household */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="profile-city" className="block text-sm font-semibold text-slate-900 mb-1.5">
              Home City or Location
            </label>
            <input
              id="profile-city"
              type="text"
              value={draft.city}
              onChange={(e) => {
                setSavedNotice(false);
                setDraft((prev) => ({ ...prev, city: e.target.value }));
              }}
              placeholder="e.g., New Delhi, Bengaluru, Mumbai"
              className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3.5 text-sm text-slate-900"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Saving a new city automatically refreshes your dashboard readings.
            </p>
          </div>

          <div>
            <label htmlFor="profile-family-size" className="block text-sm font-semibold text-slate-900 mb-1.5">
              Household Family Size
            </label>
            <input
              id="profile-family-size"
              type="number"
              min={1}
              max={15}
              value={draft.familySize}
              onChange={(e) => {
                setSavedNotice(false);
                setDraft((prev) => ({ ...prev, familySize: Math.max(1, Number(e.target.value) || 1) }));
              }}
              className="w-full min-h-[44px] rounded-lg border border-slate-300 px-3.5 text-sm font-mono tabular-nums text-slate-900"
            />
          </div>
        </div>

        {/* Section 2: Lifestyle & Commute */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="block text-sm font-semibold text-slate-900 mb-2">Daily Lifestyle</span>
            <div className="grid grid-cols-2 gap-2.5">
              {LIFESTYLE_OPTIONS.map((option) => {
                const selected = draft.lifestyle === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSavedNotice(false);
                      setDraft((prev) => ({ ...prev, lifestyle: option }));
                    }}
                    aria-pressed={selected}
                    className={`min-h-[42px] px-3.5 py-2 rounded-lg border text-xs sm:text-sm font-medium text-left transition-colors ${
                      selected
                        ? 'border-teal-700 bg-teal-50/70 text-teal-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="profile-commute" className="block text-sm font-semibold text-slate-900 mb-2">
              Primary Daily Commute Type
            </label>
            <select
              id="profile-commute"
              value={draft.commuteType}
              onChange={(e) => {
                setSavedNotice(false);
                setDraft((prev) => ({ ...prev, commuteType: e.target.value as UserProfile['commuteType'] }));
              }}
              className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900"
            >
              {COMMUTE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">
              Used by the AI Assistant, Daily Routine planner, and Eco Impact Tracker.
            </p>
          </div>
        </div>

        {/* Section 3: Outdoor Activities */}
        <div className="pt-6 border-t border-slate-200 space-y-3">
          <div>
            <span className="block text-sm font-semibold text-slate-900">Outdoor Activity Preferences</span>
            <p className="text-xs text-slate-500 mt-0.5">Select activities your family normally enjoys outdoors.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {OUTDOOR_ACTIVITIES.map((activity) => {
              const checked = draft.outdoorActivities.includes(activity);
              return (
                <label
                  key={activity}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${
                    checked
                      ? 'border-teal-700 bg-teal-50/60 text-teal-950 font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArrayItem('outdoorActivities', activity)}
                    className="h-4 w-4 rounded accent-teal-700"
                  />
                  <span>{activity}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Section 4: Vulnerable Age Groups */}
        <div className="pt-6 border-t border-slate-200 space-y-3">
          <div>
            <span className="block text-sm font-semibold text-slate-900">
              Relevant Vulnerable Age Groups &amp; Sensitivities
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Helps AirAware AI prioritize protective guidance for children, seniors, and sensitive lungs.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {VULNERABLE_GROUPS.map((group) => {
              const checked = draft.vulnerableGroups.includes(group);
              return (
                <label
                  key={group}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer text-sm transition-colors ${
                    checked
                      ? 'border-teal-700 bg-teal-50/60 text-teal-950 font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArrayItem('vulnerableGroups', group)}
                    className="h-4 w-4 rounded accent-teal-700"
                  />
                  <span>{group}</span>
                </label>
              );
            })}
          </div>
        </div>

        {validationError && (
          <p className="text-sm text-red-700" role="alert">
            {validationError}
          </p>
        )}

        {savedNotice && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>Household preferences saved. Your AI Assistant and Daily Routine will use this profile.</span>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[42px] px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="submit"
            className="min-h-[42px] px-5 py-2.5 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, Loader2, MapPin, RefreshCw, RotateCcw, Send, ShieldAlert } from 'lucide-react';
import type { AirQualityData, ChatMessage, UserProfile } from '../types/airQuality';
import { sendAssistantMessage } from '../lib/api';
import { getAqiMeta, getDataFreshness } from '../lib/aqiUtils';
import { EmergencyBanner } from './EmergencyBanner';

interface AssistantViewProps {
  airQuality: AirQualityData | null;
  profile: UserProfile;
  nowMs: number;
  messages: ChatMessage[];
  onUpdateMessages: (next: ChatMessage[]) => void;
  onOpenIndoorGuide: () => void;
  onOpenProfile: () => void;
  onOpenDashboard: () => void;
  onRefreshAirQuality: () => void;
}

function renderFormattedText(text: string) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  return blocks.map((block, bIdx) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const elements: ReactNode[] = [];
    let currentBullets: string[] = [];

    const flushBullets = (keyPrefix: string) => {
      if (currentBullets.length > 0) {
        elements.push(
          <ul key={`${keyPrefix}-ul`} className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed">
            {currentBullets.map((item, idx) => (
              <li key={idx}>{renderInlineBold(item)}</li>
            ))}
          </ul>
        );
        currentBullets = [];
      }
    };

    lines.forEach((line, lIdx) => {
      if (/^#{1,4}\s+/.test(line)) {
        flushBullets(`${bIdx}-${lIdx}`);
        elements.push(
          <h3 key={`${bIdx}-${lIdx}-h`} className="font-display text-sm font-semibold text-slate-900 pt-1">
            {renderInlineBold(line.replace(/^#{1,4}\s+/, ''))}
          </h3>
        );
      } else if (/^[-*•]\s+/.test(line)) {
        currentBullets.push(line.replace(/^[-*•]\s+/, ''));
      } else {
        flushBullets(`${bIdx}-${lIdx}`);
        elements.push(
          <p key={`${bIdx}-${lIdx}-p`} className="text-sm leading-relaxed">
            {renderInlineBold(line)}
          </p>
        );
      }
    });

    flushBullets(`${bIdx}-end`);

    return (
      <div key={bIdx} className="space-y-1.5">
        {elements}
      </div>
    );
  });
}

function renderInlineBold(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function AssistantView({
  airQuality,
  profile,
  nowMs,
  messages,
  onUpdateMessages,
  onOpenIndoorGuide,
  onOpenProfile,
  onOpenDashboard,
  onRefreshAirQuality,
}: AssistantViewProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedPrompt, setFailedPrompt] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const freshness = airQuality
    ? getDataFreshness(airQuality.observedAt, airQuality.sourceType, nowMs)
    : null;

  const suggestedPrompts = [
    airQuality
      ? `At ${airQuality.aqi} NAQI (${airQuality.category}) in ${airQuality.city}, is it safe for our family to walk outdoors today?`
      : 'What precautions should a family with children and seniors take before going outdoors?',
    'What specific precautions should school-going children, elderly people, and people with asthma take today?',
    'What are affordable ways to keep indoor air cleaner without expensive gadgets?',
    `How can I reduce my commute exposure and emissions as a ${profile.commuteType.toLowerCase()} commuter?`,
  ];

  const handleSend = async (promptOverride?: string) => {
    const trimmed = (promptOverride ?? input).trim();
    if (!trimmed || sending) return;
    if (trimmed.length > 1500) {
      setError('Please keep questions under 1,500 characters.');
      return;
    }

    setError(null);
    setFailedPrompt(null);
    const previousMessages = messages;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...previousMessages, userMessage];
    onUpdateMessages(nextMessages);
    if (!promptOverride) setInput('');
    setSending(true);

    try {
      const response = await sendAssistantMessage({
        message: trimmed,
        history: previousMessages,
        airQuality,
        profile,
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: response.timestamp,
        dataContextLabel: airQuality && freshness
          ? `${airQuality.city} · ${airQuality.aqi} NAQI (${airQuality.sourceType === 'live' ? 'Live API' : 'Demo'}) · Observed ${freshness.formattedTimestamp}`
          : 'No city loaded (general guidance)',
      };

      onUpdateMessages([...nextMessages, assistantMsg]);
    } catch (err: unknown) {
      // Roll back the unanswered user turn so conversation history stays valid, and offer 1-click retry
      onUpdateMessages(previousMessages);
      setFailedPrompt(trimmed);
      if (!promptOverride) setInput(trimmed);
      setError(err instanceof Error ? err.message : 'Unable to reach AirAware AI right now.');
    } finally {
      setSending(false);
    }
  };

  const aqiMeta = airQuality ? getAqiMeta(airQuality.aqi) : null;

  return (
    <div className="space-y-6">
      {/* Header & Active Context Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              AI Air Quality Assistant
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Ask practical questions about urban smog, masks, home ventilation, and family precautions tailored to your current context.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenProfile}
              className="min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Edit Profile
            </button>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onUpdateMessages([]);
                  setError(null);
                }}
                className="min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Unboxed Context Metadata Line */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
          {airQuality && aqiMeta ? (
            <>
              <span>
                City: <strong className="text-slate-900">{airQuality.city}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                AQI:{' '}
                <strong className={`font-mono tabular-nums ${aqiMeta.textColor}`}>
                  {airQuality.aqi} ({airQuality.category})
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Source: <strong className="text-slate-800">{airQuality.sourceType === 'live' ? 'Live API' : 'Demo Scenario'}</strong>
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
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          <span>
            Household: <strong className="text-slate-800">{profile.familySize}</strong> · {profile.lifestyle} · {profile.commuteType}
          </span>
          {profile.vulnerableGroups.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Priority care: <strong className="text-slate-800">{profile.vulnerableGroups.join(', ')}</strong>
              </span>
            </>
          )}
        </div>
      </section>

      {!airQuality && (
        <section className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2.5 text-sm text-slate-800">
            <MapPin className="h-4 w-4 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              No city is loaded yet. Enter your city on the Dashboard—or mention your city in your question—so AirAware AI can give accurate local guidance.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            Select City
          </button>
        </section>
      )}

      {airQuality && freshness?.isOutdated && (
        <section
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Live AQI data for <strong>{airQuality.city}</strong> is outdated ({freshness.ageLabel}, observed {freshness.formattedTimestamp}). Refresh before relying on it for outdoor plans.
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

      {/* Chat Workspace */}
      <section className="rounded-xl border border-slate-200 bg-white flex flex-col min-h-[480px] max-h-[680px]">
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="py-6 space-y-6">
              <div className="max-w-xl space-y-2">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  {airQuality
                    ? `Start with a question tailored to ${airQuality.city}`
                    : 'Ask AirAware AI (mention your city for local AQI guidance)'}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  AirAware AI grounds answers in your active air quality readings and household profile without diagnosing medical conditions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={sending}
                    onClick={() => handleSend(prompt)}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-teal-50/60 hover:border-teal-200 text-left text-sm text-slate-800 transition-colors leading-snug"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-xl px-4 py-3.5 space-y-2 ${
                      msg.role === 'user'
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-50 border border-slate-200 text-slate-800'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-between gap-4 text-[11px] ${
                        msg.role === 'user' ? 'text-teal-100' : 'text-slate-500'
                      }`}
                    >
                      <span className="font-semibold">
                        {msg.role === 'user' ? 'You' : 'AirAware AI'}
                      </span>
                      <span className="font-mono tabular-nums">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {msg.role === 'user' ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-2.5">{renderFormattedText(msg.content)}</div>
                    )}

                    {msg.dataContextLabel && (
                      <div className="pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                        Context: {msg.dataContextLabel}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start" aria-live="polite" aria-busy="true">
                  <div className="rounded-xl border border-teal-200/80 bg-teal-50/50 px-4 py-3 text-sm text-slate-700 flex items-center gap-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-700 shrink-0" aria-hidden="true" />
                    <span>
                      Generating personalized guidance
                      {airQuality?.city ? (
                        <>
                          {' '}for <strong>{airQuality.city}</strong>
                        </>
                      ) : null}
                      …
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Error Display with 1-Click Retry */}
        {error && (
          <div
            role="alert"
            className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-red-900"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span className="leading-relaxed">{error}</span>
            </div>
            {failedPrompt && (
              <button
                type="button"
                disabled={sending}
                onClick={() => handleSend(failedPrompt)}
                className="self-start sm:self-auto px-3 py-1.5 rounded-md bg-slate-900 text-white font-semibold hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry Question</span>
              </button>
            )}
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50/50 rounded-b-xl space-y-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <label htmlFor="assistant-message-input" className="sr-only">
              Ask AirAware AI a question about air quality
            </label>
            <input
              id="assistant-message-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about outdoor safety, winter smog, children’s school commute, masks, or indoor air…"
              disabled={sending}
              maxLength={1500}
              className="flex-1 min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="min-h-[44px] px-5 py-2.5 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>{sending ? 'Sending…' : 'Ask Assistant'}</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
            <span>
              Accuracy &amp; Health Notice: AirAware AI uses your live API (or demo) readings without inventing numbers and never provides medical diagnoses. If you share your own AQI monitor reading, it will distinguish that from live API data. Seek professional medical help promptly for persistent coughing, wheezing, chest tightness, dizziness, or trouble breathing.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}

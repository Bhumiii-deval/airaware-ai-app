import type { AirQualityData, ChatMessage, SmartDailyRoutine, UserProfile } from '../types/airQuality';

export interface CitySearchResult {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface ApiErrorPayload {
  error?: string;
  code?: string;
}

/**
 * Safe JSON fetch wrapper that validates HTTP status, Content-Type header,
 * and raw payload before parsing JSON so HTML error/fallback pages never trigger
 * raw SyntaxError crashes ("Unexpected token '<'").
 */
async function fetchJsonSafely<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 20000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('The request timed out. Please check your connection and try again.');
    }
    throw new Error('Unable to connect to the AirAware AI server. Please check your connection and retry.');
  } finally {
    clearTimeout(timer);
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  const rawText = await response.text();
  const trimmed = rawText.trim();
  const looksLikeHtml =
    contentType.includes('text/html') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html');

  if (looksLikeHtml || !contentType.includes('application/json')) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error(
        `The server is temporarily unavailable (HTTP ${response.status}). Please wait a moment and try again.`
      );
    }
    if (response.status === 404) {
      throw new Error('The requested API service was not found. Please refresh the page and try again.');
    }
    throw new Error(
      'The backend API returned an unexpected non-JSON response. Please refresh the page or try again in a moment.'
    );
  }

  let parsed: unknown;
  try {
    parsed = trimmed ? JSON.parse(trimmed) : {};
  } catch {
    throw new Error('The server returned unreadable data. Please try again.');
  }

  if (!response.ok) {
    const errPayload = (parsed && typeof parsed === 'object' ? parsed : {}) as ApiErrorPayload;
    throw new Error(
      errPayload.error || `Request failed with status ${response.status}. Please try again.`
    );
  }

  return parsed as T;
}

export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const data = await fetchJsonSafely<{ results?: CitySearchResult[] }>(
    `/api/cities/search?q=${encodeURIComponent(query)}`,
    { method: 'GET' },
    10000
  );
  return Array.isArray(data.results) ? data.results : [];
}

export async function fetchLiveAirQuality(params: {
  city: string;
  lat?: number;
  lon?: number;
  region?: string;
  country?: string;
}): Promise<AirQualityData> {
  const qs = new URLSearchParams({ mode: 'live', city: params.city });
  if (params.lat !== undefined && params.lon !== undefined) {
    qs.set('lat', String(params.lat));
    qs.set('lon', String(params.lon));
  }
  if (params.region) qs.set('region', params.region);
  if (params.country) qs.set('country', params.country);

  const data = await fetchJsonSafely<AirQualityData>(
    `/api/air-quality?${qs.toString()}`,
    { method: 'GET' },
    15000
  );

  if (!data || typeof data.aqi !== 'number' || !Array.isArray(data.pollutants)) {
    throw new Error('Received incomplete air quality data. Please try again.');
  }
  return data;
}

export async function fetchDemoAirQuality(scenarioId: string): Promise<AirQualityData> {
  const data = await fetchJsonSafely<AirQualityData>(
    `/api/air-quality?mode=demo&scenario=${encodeURIComponent(scenarioId)}`,
    { method: 'GET' },
    10000
  );

  if (!data || typeof data.aqi !== 'number' || !Array.isArray(data.pollutants)) {
    throw new Error('Unable to load the selected demo scenario.');
  }
  return data;
}

export async function sendAssistantMessage(params: {
  message: string;
  history: ChatMessage[];
  airQuality: AirQualityData | null;
  profile: UserProfile;
}): Promise<{ reply: string; timestamp: string }> {
  const data = await fetchJsonSafely<{ reply?: string; timestamp?: string }>(
    '/api/ai/chat',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: params.message,
        history: params.history.map((m) => ({ role: m.role, content: m.content })),
        airQuality: params.airQuality,
        profile: params.profile,
      }),
    },
    45000
  );

  if (!data || typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new Error('AirAware AI returned an empty response. Please try asking again.');
  }

  return {
    reply: data.reply,
    timestamp: data.timestamp || new Date().toISOString(),
  };
}

export async function generateSmartDailyRoutine(params: {
  airQuality: AirQualityData;
  profile: UserProfile;
}): Promise<SmartDailyRoutine> {
  const data = await fetchJsonSafely<SmartDailyRoutine>(
    '/api/ai/routine',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        airQuality: params.airQuality,
        profile: params.profile,
      }),
    },
    40000
  );

  if (!data || typeof data.summary !== 'string' || !data.bestOutdoorWindow) {
    throw new Error('Received an incomplete daily routine. Please try generating again.');
  }

  return data;
}

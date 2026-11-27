import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { buildPollutantList, computeOverallAqi, getAqiCategory } from './src/lib/aqiUtils.ts';
import { buildDemoAirQuality } from './src/data/demoScenarios.ts';
import type { AirQualityData, HourlyPoint, UserProfile } from './src/types/airQuality.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveServerPort(): number {
  const portFlagIndex = process.argv.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portFlagIndex !== -1 && process.argv[portFlagIndex + 1]) {
    const parsed = Number(process.argv[portFlagIndex + 1]);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  const inlineFlag = process.argv.find((arg) => arg.startsWith('--port='));
  if (inlineFlag) {
    const parsed = Number(inlineFlag.split('=')[1]);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  if (process.env.NODE_ENV === 'production' && process.env.PORT) {
    const parsed = Number(process.env.PORT);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

const PORT = resolveServerPort();
const GEMINI_CHAT_MODEL = 'gemini-4-hydrogen';
const GEMINI_ROUTINE_MODEL = 'gemini-3.1-flash-lite';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    const contentType = res.headers.get('content-type') ?? '';
    const rawBody = await res.text();

    if (!res.ok) {
      throw new Error(`UPSTREAM_HTTP_${res.status}`);
    }

    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error(`UPSTREAM_NON_JSON:${contentType || 'unknown'}`);
    }

    try {
      return JSON.parse(rawBody);
    } catch {
      throw new Error('UPSTREAM_INVALID_JSON');
    }
  } finally {
    clearTimeout(timer);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('GEMINI_API_KEY_MISSING') ||
        msg.includes('API_KEY_INVALID') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('TIMEOUT') ||
        msg.includes('400') ||
        msg.includes('403')
      ) {
        throw err;
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  throw lastError;
}

// NOTE: Avoid HTTP 403, 502, 503, 504 on API JSON responses because reverse proxies
// with `proxy_intercept_errors on` replace those status codes with HTML error/warmup pages.
// Use JSON-safe HTTP status codes: 400, 401, 404, 408, 429, 500.
function formatGeminiError(err: unknown): { status: number; message: string; code: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY_MISSING')) {
    return {
      status: 500,
      code: 'API_KEY_MISSING',
      message: 'Gemini AI service is not configured on the server. Please check the API key in Settings > Secrets.',
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 401,
      code: 'API_KEY_INVALID',
      message: 'Gemini API key was rejected. Please verify the API key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      message: 'The AI service is currently rate-limited. Please wait a moment and try again.',
    };
  }
  if (raw.includes('TIMEOUT')) {
    return {
      status: 408,
      code: 'AI_TIMEOUT',
      message: 'The AI assistant took too long to respond. Please try submitting your question again.',
    };
  }
  if (raw.includes('INVALID_ROUTINE_JSON')) {
    return {
      status: 500,
      code: 'AI_MALFORMED_OUTPUT',
      message: 'The AI service returned an incomplete routine format. Please try generating again.',
    };
  }
  return {
    status: 500,
    code: 'AI_UPSTREAM_ERROR',
    message: 'Unable to reach the Gemini AI assistant right now. Please try again in a few moments.',
  };
}

interface GeoResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

interface OpenMeteoAirQualityResponse {
  timezone?: string;
  utc_offset_seconds?: number;
  current?: {
    time?: string;
    pm10?: number | null;
    pm2_5?: number | null;
    carbon_monoxide?: number | null;
    nitrogen_dioxide?: number | null;
    sulphur_dioxide?: number | null;
    ozone?: number | null;
    us_aqi?: number | null;
    european_aqi?: number | null;
  };
  hourly?: {
    time?: string[];
    pm2_5?: (number | null)[];
    pm10?: (number | null)[];
    nitrogen_dioxide?: (number | null)[];
    ozone?: (number | null)[];
  };
}

function toSafeNumber(val: unknown): number | null {
  return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

/**
 * Converts Open-Meteo local wall-clock timestamp (e.g. "2026-11-27T00:30") plus
 * utc_offset_seconds into an exact UTC ISO-8601 string for accurate cross-timezone age checks.
 */
function parseOpenMeteoTimestampToIso(localTime: string | undefined, utcOffsetSeconds: number | undefined): string {
  if (!localTime) return new Date().toISOString();
  const match = localTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    const parsed = Date.parse(localTime);
    return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
  }
  const [, y, mo, d, h, mi, s] = match;
  const offsetMs = typeof utcOffsetSeconds === 'number' && Number.isFinite(utcOffsetSeconds) ? utcOffsetSeconds * 1000 : 0;
  const utcMs = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? '0')) - offsetMs;
  return new Date(utcMs).toISOString();
}

function stripJsonCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function startServer() {
  const app = express();

  // Dedicated API router guarantees every /api/* route always responds with JSON
  const apiRouter = express.Router();

  apiRouter.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    res.type('application/json');
    next();
  });

  apiRouter.use(express.json({ limit: '1mb' }));

  // Health check
  apiRouter.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'AirAware AI' });
  });

  // City search suggestions via Open-Meteo Geocoding
  apiRouter.get('/cities/search', async (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2 || q.length > 80) {
      res.status(400).json({ error: 'Please enter between 2 and 80 characters for a city name.', results: [] });
      return;
    }

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;
      const data = (await fetchJsonWithTimeout(geoUrl, 6000)) as { results?: GeoResult[] };
      const results = (data.results ?? []).map((item) => ({
        name: item.name,
        region: item.admin1 ?? '',
        country: item.country ?? '',
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone ?? 'UTC',
      }));
      res.json({ results });
    } catch {
      res.status(500).json({
        error: 'Live city lookup is temporarily unreachable. You can still select a demo scenario below.',
        results: [],
      });
    }
  });

  // Live air quality endpoint (Open-Meteo Geocoding + Air Quality API) or explicit demo scenario
  apiRouter.get('/air-quality', async (req: Request, res: Response) => {
    const mode = typeof req.query.mode === 'string' ? req.query.mode : 'live';
    const scenario = typeof req.query.scenario === 'string' ? req.query.scenario : 'delhi-winter-smog';

    if (mode === 'demo') {
      const demo = buildDemoAirQuality(scenario);
      res.json(demo);
      return;
    }

    const cityQuery = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const latParam = req.query.lat !== undefined ? Number(req.query.lat) : null;
    const lonParam = req.query.lon !== undefined ? Number(req.query.lon) : null;

    if (!cityQuery && (latParam === null || lonParam === null || Number.isNaN(latParam) || Number.isNaN(lonParam))) {
      res.status(400).json({ error: 'Please provide a valid city name or geographic coordinates.' });
      return;
    }

    if (cityQuery.length > 80) {
      res.status(400).json({ error: 'City name must be 80 characters or fewer.' });
      return;
    }

    try {
      let location: GeoResult;

      if (latParam !== null && lonParam !== null && !Number.isNaN(latParam) && !Number.isNaN(lonParam)) {
        location = {
          name: cityQuery || 'Selected Location',
          admin1: typeof req.query.region === 'string' ? req.query.region : '',
          country: typeof req.query.country === 'string' ? req.query.country : '',
          latitude: latParam,
          longitude: lonParam,
          timezone: 'auto',
        };
      } else {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`;
        const geoJson = (await fetchJsonWithTimeout(geoUrl, 7000)) as { results?: GeoResult[] };
        if (!geoJson.results || geoJson.results.length === 0) {
          res.status(404).json({
            error: `We could not find "${cityQuery}". Check the spelling or try a nearby major city.`,
          });
          return;
        }
        location = geoJson.results[0];
      }

      const aqUrl =
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${encodeURIComponent(String(location.latitude))}` +
        `&longitude=${encodeURIComponent(String(location.longitude))}` +
        `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,european_aqi` +
        `&hourly=pm2_5,pm10,nitrogen_dioxide,ozone` +
        `&forecast_days=1&timezone=auto`;

      const aqJson = (await fetchJsonWithTimeout(aqUrl, 8000)) as OpenMeteoAirQualityResponse;
      const cur = aqJson.current;

      if (!cur) {
        throw new Error('NO_CURRENT_DATA');
      }

      const pm25 = toSafeNumber(cur.pm2_5);
      const pm10 = toSafeNumber(cur.pm10);
      const no2 = toSafeNumber(cur.nitrogen_dioxide);
      const so2 = toSafeNumber(cur.sulphur_dioxide);
      const o3 = toSafeNumber(cur.ozone);
      // Open-Meteo carbon_monoxide is in µg/m³; convert to mg/m³ for NAQI breakpoints
      const coUg = toSafeNumber(cur.carbon_monoxide);
      const coMg = coUg !== null ? coUg / 1000 : null;

      const { aqi, dominantPollutant } = computeOverallAqi({
        pm25,
        pm10,
        no2,
        so2,
        o3,
        coMg,
      });

      const hourlyTimes = aqJson.hourly?.time ?? [];
      const hourlyPm25 = aqJson.hourly?.pm2_5 ?? [];
      const hourlyPm10 = aqJson.hourly?.pm10 ?? [];
      const hourlyNo2 = aqJson.hourly?.nitrogen_dioxide ?? [];
      const hourlyO3 = aqJson.hourly?.ozone ?? [];

      const hourly: HourlyPoint[] = hourlyTimes.slice(0, 24).map((t, idx) => {
        const hPm25 = toSafeNumber(hourlyPm25[idx]) ?? 0;
        const hPm10 = toSafeNumber(hourlyPm10[idx]) ?? 0;
        const hNo2 = toSafeNumber(hourlyNo2[idx]) ?? 0;
        const hO3 = toSafeNumber(hourlyO3[idx]) ?? 0;
        const hourAqi = computeOverallAqi({
          pm25: hPm25,
          pm10: hPm10,
          no2: hNo2,
          o3: hO3,
        }).aqi;
        const hourPart = t.includes('T') ? t.split('T')[1].slice(0, 5) : `${String(idx).padStart(2, '0')}:00`;
        return {
          time: t,
          hourLabel: hourPart,
          pm25: Number(hPm25.toFixed(1)),
          pm10: Number(hPm10.toFixed(1)),
          no2: Number(hNo2.toFixed(1)),
          o3: Number(hO3.toFixed(1)),
          aqi: hourAqi,
        };
      });

      const observedAtIso = parseOpenMeteoTimestampToIso(cur.time, aqJson.utc_offset_seconds);

      const payload: AirQualityData = {
        city: location.name,
        region: location.admin1 ?? '',
        country: location.country ?? '',
        latitude: Number(location.latitude.toFixed(4)),
        longitude: Number(location.longitude.toFixed(4)),
        observedAt: observedAtIso,
        observedLocalTime: cur.time ?? observedAtIso,
        fetchedAt: new Date().toISOString(),
        timezone: aqJson.timezone ?? location.timezone ?? 'UTC',
        sourceType: 'live',
        sourceName: 'Open-Meteo Air Quality API (CAMS / Global Model Assimilation)',
        aqi,
        category: getAqiCategory(aqi),
        dominantPollutant,
        usAqi: toSafeNumber(cur.us_aqi),
        europeanAqi: toSafeNumber(cur.european_aqi),
        pollutants: buildPollutantList({ pm25, pm10, no2, so2, o3, coMg }),
        hourly,
      };

      res.json(payload);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({
        error:
          'Live air quality data could not be retrieved right now. You can retry or switch to a clearly labelled sample demo scenario.',
        detail: errMsg,
      });
    }
  });

  // AI Air Quality Assistant endpoint
  apiRouter.post('/ai/chat', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      message?: unknown;
      history?: unknown;
      airQuality?: AirQualityData | null;
      profile?: UserProfile | null;
    };

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 1500) {
      res.status(400).json({ error: 'Please enter a question between 1 and 1,500 characters.' });
      return;
    }

    const safeHistory = Array.isArray(body.history)
      ? body.history
          .slice(-8)
          .filter(
            (m): m is { role: 'user' | 'assistant'; content: string } =>
              typeof m === 'object' &&
              m !== null &&
              ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
              typeof (m as { content?: unknown }).content === 'string'
          )
      : [];

    const aq = body.airQuality;
    const profile = body.profile;

    const pollutantLines = aq?.pollutants
      ? aq.pollutants
          .map((p) => `${p.formula}: ${p.value !== null ? `${p.value} ${p.unit}` : 'Unavailable'}`)
          .join(', ')
      : 'No active readings loaded';

    const hourlyLines =
      aq?.hourly && aq.hourly.length > 0
        ? aq.hourly
            .filter((_, idx) => idx % 2 === 0)
            .map((h) => `${h.hourLabel}: NAQI ${h.aqi} (PM2.5 ${h.pm25} µg/m³)`)
            .join(' | ')
        : 'No hourly forecast data available';

    const locationLabel = aq
      ? [aq.city, aq.region, aq.country].filter(Boolean).join(', ')
      : profile?.city?.trim() || '';

    const hasKnownLocation = Boolean(locationLabel);
    const observedMs = aq?.observedAt ? Date.parse(aq.observedAt) : NaN;
    const ageMinutes =
      aq?.sourceType === 'live' && !Number.isNaN(observedMs)
        ? Math.max(0, Math.round((Date.now() - observedMs) / 60000))
        : null;
    const isLiveOutdated = ageMinutes !== null && ageMinutes > 90;

    const contextBlock = [
      `ACTIVE APP AIR QUALITY CONTEXT:`,
      `- Location: ${hasKnownLocation ? locationLabel : 'UNAVAILABLE (User has not selected or entered a city yet)'}`,
      aq
        ? `- Data Source Type: ${
            aq.sourceType === 'live'
              ? `LIVE API DATA (${aq.sourceName})`
              : `SIMULATED DEMO DATA (${aq.sourceName}) — NOT live sensor data`
          }`
        : '- Data Source Type: No API data loaded',
      aq
        ? `- Observation Timestamp (UTC): ${aq.observedAt} | Local time: ${aq.observedLocalTime ?? aq.observedAt} (Timezone: ${aq.timezone})`
        : '- Observation Timestamp: Unavailable',
      ageMinutes !== null
        ? `- Live Data Freshness: ${ageMinutes} minutes old${isLiveOutdated ? ' — WARNING: OUTDATED (>90 minutes old). Clearly warn the user and advise refreshing.' : ' (Current)'}`
        : '',
      aq ? `- Overall NAQI: ${aq.aqi} (${aq.category}), Dominant Pollutant: ${aq.dominantPollutant}` : '- Overall NAQI: Unavailable',
      aq ? `- Pollutant Readings: ${pollutantLines}` : '',
      aq ? `- Modeled Hourly Forecast (${aq.sourceType === 'live' ? 'Live API estimate — NOT guaranteed' : 'Demo'}): ${hourlyLines}` : '',
      '',
      `USER HOUSEHOLD PROFILE:`,
      profile
        ? `- Family Size: ${profile.familySize} | Lifestyle: ${profile.lifestyle} | Daily Commute: ${profile.commuteType}`
        : '- Default urban household',
      profile?.outdoorActivities?.length
        ? `- Outdoor Activities: ${profile.outdoorActivities.join(', ')}`
        : '- Outdoor Activities: General walking',
      profile?.vulnerableGroups?.length
        ? `- Vulnerable Household Members: ${profile.vulnerableGroups.join(', ')}`
        : '- Vulnerable Household Members: None specified',
    ]
      .filter(Boolean)
      .join('\n');

    const systemInstruction = `You are AirAware AI, a helpful Urban Air Quality Assistant ("Breathe Better. Live Smarter.").

MANDATORY ACCURACY, LOCATION & DATA VALIDATION RULES (FOLLOW STRICTLY):
1. NEVER assume the user's location. If Location is UNAVAILABLE above and the user did not mention a city in their message, politely ask for their city or location first while offering only general, non-location-specific guidance.
2. NEVER invent or guess AQI, PM2.5, PM10, or other pollutant values. Only quote numbers explicitly present in the context above or stated by the user.
3. ALWAYS clearly distinguish between **user-provided AQI/readings**, **Live API AQI**, and **Simulated Demo Data**.
4. ALWAYS mention the exact **location** and **observation timestamp** whenever citing live API air quality data.
5. If Live Data Freshness indicates **OUTDATED (>90 minutes old)**, clearly warn the user that the live reading may be outdated and recommend refreshing or checking current conditions.
6. NEVER suggest fixed pollution clock timings without actual hourly data, and NEVER present hourly forecasts as guaranteed conditions—explicitly note that forecasts are estimates that can change with wind, weather, or traffic.
7. ALWAYS recommend checking **current AQI right before starting outdoor activities**.
8. Even when AQI improves or is in the Good/Satisfactory range, still provide thoughtful precautions for **children, elderly people, and people with respiratory conditions** (such as avoiding heavy traffic roadsides, keeping prescribed reliever inhalers handy, and resting if any irritation starts).
9. Give **affordable, practical everyday recommendations** in **simple language** (wet mopping, damp towel draft blockers, kitchen exhaust, avoiding indoor incense/coils).
10. Recommend a properly fitted **N95 mask** whenever outdoor exposure is unavoidable in polluted air (noting cloth/surgical masks do not reliably filter PM2.5).
11. NEVER provide a medical diagnosis or prescribe medications, and clearly explain **when professional medical help is needed** (persistent coughing, wheezing, chest tightness/pain, shortness of breath, dizziness, bluish lips, or worsening asthma—seek urgent emergency care immediately for severe breathing trouble).

Keep responses well-structured, concise (about 140–240 words unless more detail is requested), empathetic, and directly grounded in the provided context.

${contextBlock}`;

    try {
      const ai = getGeminiClient();

      // Normalize history so roles strictly alternate user -> model and start with user
      const normalizedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
      for (const item of safeHistory) {
        const mappedRole = item.role === 'assistant' ? 'model' : 'user';
        const trimmedContent = item.content.trim();
        if (!trimmedContent) continue;
        if (normalizedHistory.length === 0 && mappedRole !== 'user') continue;
        const last = normalizedHistory[normalizedHistory.length - 1];
        if (last && last.role === mappedRole) {
          last.parts[0].text = `${last.parts[0].text}\n\n${trimmedContent}`;
        } else {
          normalizedHistory.push({ role: mappedRole, parts: [{ text: trimmedContent }] });
        }
      }
      // If history ends on a user turn (e.g. after a previous failed turn), drop the trailing orphan user turn
      if (normalizedHistory.length > 0 && normalizedHistory[normalizedHistory.length - 1].role === 'user') {
        normalizedHistory.pop();
      }

      const contents = [
        ...normalizedHistory.slice(-6),
        {
          role: 'user' as const,
          parts: [{ text: message }],
        },
      ];

      let usedModel = GEMINI_CHAT_MODEL;
      let response;
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: GEMINI_CHAT_MODEL,
            contents,
            config: {
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          }),
          15000,
          'GEMINI_CHAT'
        );
      } catch (primaryErr: unknown) {
        const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
        const isAuthOrConfigErr =
          msg.includes('GEMINI_API_KEY_MISSING') ||
          msg.includes('API_KEY_INVALID') ||
          msg.includes('PERMISSION_DENIED') ||
          msg.includes('403');
        if (isAuthOrConfigErr) {
          throw primaryErr;
        }
        // Automatic real Gemini fallback model if primary model stalls or returns transient upstream error
        usedModel = GEMINI_ROUTINE_MODEL;
        response = await withTimeout(
          ai.models.generateContent({
            model: GEMINI_ROUTINE_MODEL,
            contents,
            config: {
              systemInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            },
          }),
          20000,
          'GEMINI_CHAT_FALLBACK'
        );
      }

      const reply = response.text?.trim();
      if (!reply) {
        throw new Error('EMPTY_MODEL_RESPONSE');
      }

      res.json({
        reply,
        model: usedModel,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  // Smart Daily Routine generator via Gemini Structured Output (fast flash-lite model prevents proxy timeouts)
  apiRouter.post('/ai/routine', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      airQuality?: AirQualityData | null;
      profile?: UserProfile | null;
    };

    const aq = body.airQuality;
    const profile = body.profile;

    if (!aq || typeof aq.aqi !== 'number') {
      res.status(400).json({ error: 'Valid air quality context is required to generate a daily routine.' });
      return;
    }

    const hourlySummary = (aq.hourly ?? [])
      .filter((_, idx) => idx % 2 === 0)
      .map((h) => `${h.hourLabel}: NAQI ${h.aqi} (PM2.5 ${h.pm25} µg/m³)`)
      .join(' | ');

    const fullLocation = [aq.city, aq.region, aq.country].filter(Boolean).join(', ');
    const lowestHourlyPoint =
      aq.hourly && aq.hourly.length > 0
        ? aq.hourly.reduce((best, cur) => (cur.aqi < best.aqi ? cur : best), aq.hourly[0])
        : null;
    const routineObservedMs = aq.observedAt ? Date.parse(aq.observedAt) : NaN;
    const routineAgeMinutes =
      aq.sourceType === 'live' && !Number.isNaN(routineObservedMs)
        ? Math.max(0, Math.round((Date.now() - routineObservedMs) / 60000))
        : null;
    const isRoutineDataOutdated = routineAgeMinutes !== null && routineAgeMinutes > 90;

    const prompt = `Create a practical, affordable, personalized Smart Daily Routine for a household based strictly on the provided air quality data and profile.

AIR QUALITY CONTEXT:
- Location: ${fullLocation}
- Data Source: ${aq.sourceType === 'live' ? `LIVE API DATA (${aq.sourceName})` : `SIMULATED DEMO DATA (${aq.sourceName})`}
- Observation Timestamp (UTC): ${aq.observedAt} | Local time: ${aq.observedLocalTime ?? aq.observedAt} (Timezone: ${aq.timezone})
- Live Data Freshness: ${routineAgeMinutes !== null ? `${routineAgeMinutes} minutes old${isRoutineDataOutdated ? ' — OUTDATED (>90 min)' : ''}` : 'Demo data'}
- Current NAQI: ${aq.aqi} (${aq.category})
- Dominant Pollutant: ${aq.dominantPollutant}
- Modeled Hourly Forecast Available (estimates only, NOT guaranteed): ${hourlySummary || 'None available'}

HOUSEHOLD PROFILE:
- Family Size: ${profile?.familySize ?? 3}
- Lifestyle: ${profile?.lifestyle ?? 'Balanced Urban'}
- Daily Commute: ${profile?.commuteType ?? 'Public Transit'}
- Outdoor Activities: ${profile?.outdoorActivities?.join(', ') || 'Walking'}
- Vulnerable Groups: ${profile?.vulnerableGroups?.join(', ') || 'General family'}

MANDATORY ACCURACY, LOCATION & DATA VALIDATION RULES:
1. Never invent AQI, PM2.5, or pollutant values, and never assume a different location.
2. In the summary, explicitly mention the location (${fullLocation}), whether the reading is Live API data or Demo data, the observation timestamp (${aq.observedLocalTime ?? aq.observedAt}), and warn clearly if the live data is outdated.
3. Never suggest fixed pollution clock timings (like "early morning" or "evening") unless directly shown in the provided hourly forecast above, and NEVER present forecasts as guaranteed conditions—in bestOutdoorWindow, cite only hours from the provided hourly data (if available) labeled as an estimate and explicitly advise checking current AQI right before outdoor activities.
4. Give affordable, practical recommendations suitable for everyday families (wet mopping, sealing drafts with a towel, exhaust fan while cooking, avoiding indoor smoke). Do not suggest indoor plants as an effective PM2.5 cleaner (plants have negligible effect on particulate pollution compared to ventilation/filtration).
5. Consider children, elderly people, and people with respiratory conditions (such as asthma) EVEN when AQI improves or is Good/Satisfactory (e.g., avoid roadside exhaust, keep prescribed inhalers ready, stop if discomfort begins).
6. Use simple, plain language and never provide a medical diagnosis.
7. Recommend a properly fitted N95 mask whenever outdoor exposure is unavoidable in polluted air.
8. Clearly explain in symptomWatch when professional medical help is needed (persistent cough, wheezing, chest tightness, shortness of breath, dizziness, or worsening asthma symptoms).
9. Populate emergencyAlert with concise urgent safety guidance if AQI >= 301, otherwise return an empty string "".`;

    try {
      const ai = getGeminiClient();

      const response = await withRetry(() =>
        withTimeout(
          ai.models.generateContent({
            model: GEMINI_ROUTINE_MODEL,
            contents: prompt,
            config: {
              systemInstruction:
                'You are AirAware AI, an urban air quality planner. Output strictly valid JSON matching the requested schema. Use simple language, never invent AQI values or present forecasts as guarantees, always advise checking current AQI before outdoor activities, protect sensitive groups even when AQI improves, give affordable practical advice, never diagnose medical conditions, recommend N95 masks when outdoor exposure is unavoidable, and clearly state when to seek medical help.',
              responseMimeType: 'application/json',
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: { type: Type.STRING },
                  bestOutdoorWindow: {
                    type: Type.OBJECT,
                    properties: {
                      timeRange: { type: Type.STRING },
                      reason: { type: Type.STRING },
                      cautionLevel: { type: Type.STRING },
                    },
                    required: ['timeRange', 'reason', 'cautionLevel'],
                  },
                  exerciseGuidance: {
                    type: Type.OBJECT,
                    properties: {
                      recommendation: { type: Type.STRING },
                      intensity: { type: Type.STRING },
                      indoorAlternative: { type: Type.STRING },
                    },
                    required: ['recommendation', 'intensity', 'indoorAlternative'],
                  },
                  commutePlan: {
                    type: Type.OBJECT,
                    properties: {
                      primarySuggestion: { type: Type.STRING },
                      protectionTip: { type: Type.STRING },
                      emissionSavingsNote: { type: Type.STRING },
                    },
                    required: ['primarySuggestion', 'protectionTip', 'emissionSavingsNote'],
                  },
                  childrenPrecautions: {
                    type: Type.OBJECT,
                    properties: {
                      schoolCommute: { type: Type.STRING },
                      outdoorPlay: { type: Type.STRING },
                      classroomTip: { type: Type.STRING },
                    },
                    required: ['schoolCommute', 'outdoorPlay', 'classroomTip'],
                  },
                  elderlyGuidance: {
                    type: Type.OBJECT,
                    properties: {
                      morningEveningAdvice: { type: Type.STRING },
                      indoorComfort: { type: Type.STRING },
                      symptomWatch: { type: Type.STRING },
                    },
                    required: ['morningEveningAdvice', 'indoorComfort', 'symptomWatch'],
                  },
                  lowEmissionHabits: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  emergencyAlert: { type: Type.STRING },
                },
                required: [
                  'summary',
                  'bestOutdoorWindow',
                  'exerciseGuidance',
                  'commutePlan',
                  'childrenPrecautions',
                  'elderlyGuidance',
                  'lowEmissionHabits',
                  'emergencyAlert',
                ],
              },
            },
          }),
          30000,
          'GEMINI_ROUTINE'
        )
      );

      const rawText = stripJsonCodeFences(response.text ?? '');
      let parsed: {
        summary?: string;
        bestOutdoorWindow?: { timeRange?: string; reason?: string; cautionLevel?: string };
        exerciseGuidance?: { recommendation?: string; intensity?: string; indoorAlternative?: string };
        commutePlan?: { primarySuggestion?: string; protectionTip?: string; emissionSavingsNote?: string };
        childrenPrecautions?: { schoolCommute?: string; outdoorPlay?: string; classroomTip?: string };
        elderlyGuidance?: { morningEveningAdvice?: string; indoorComfort?: string; symptomWatch?: string };
        lowEmissionHabits?: string[];
        emergencyAlert?: string;
      };

      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new Error('INVALID_ROUTINE_JSON');
      }

      if (!parsed || typeof parsed.summary !== 'string' || !parsed.bestOutdoorWindow) {
        throw new Error('INVALID_ROUTINE_JSON');
      }

      const allowedCaution = ['Low', 'Moderate', 'High', 'Avoid Outdoor'] as const;
      const rawCaution = parsed.bestOutdoorWindow.cautionLevel ?? '';
      const normalizedCaution = allowedCaution.includes(rawCaution as (typeof allowedCaution)[number])
        ? (rawCaution as (typeof allowedCaution)[number])
        : aq.aqi >= 301
          ? 'Avoid Outdoor'
          : aq.aqi >= 201
            ? 'High'
            : aq.aqi >= 101
              ? 'Moderate'
              : 'Low';

      res.json({
        generatedAt: new Date().toISOString(),
        aqiObservedAt: aq.observedAt,
        city: aq.city,
        aqiAtGeneration: aq.aqi,
        categoryAtGeneration: aq.category,
        sourceType: aq.sourceType,
        summary: parsed.summary,
        bestOutdoorWindow: {
          timeRange:
            parsed.bestOutdoorWindow.timeRange ||
            (lowestHourlyPoint
              ? `Around ${lowestHourlyPoint.hourLabel} (NAQI ${lowestHourlyPoint.aqi} in forecast)`
              : 'Check live hourly AQI before heading outdoors'),
          reason:
            parsed.bestOutdoorWindow.reason ||
            'Choose outdoor timing based on actual hourly readings rather than fixed clock times.',
          cautionLevel: normalizedCaution,
        },
        exerciseGuidance: {
          recommendation: parsed.exerciseGuidance?.recommendation || 'Adjust activity based on current local AQI.',
          intensity: parsed.exerciseGuidance?.intensity || 'Light to moderate',
          indoorAlternative: parsed.exerciseGuidance?.indoorAlternative || 'Simple indoor stretching, yoga, or walking inside a closed room.',
        },
        commutePlan: {
          primarySuggestion: parsed.commutePlan?.primarySuggestion || 'Use shared public transit or combine errands when practical.',
          protectionTip:
            parsed.commutePlan?.protectionTip ||
            'Wear a snug N95 mask whenever outdoor exposure is unavoidable in polluted air.',
          emissionSavingsNote: parsed.commutePlan?.emissionSavingsNote || 'Shared transit and shorter trips reduce street-level exhaust.',
        },
        childrenPrecautions: {
          schoolCommute:
            parsed.childrenPrecautions?.schoolCommute ||
            'Use a well-fitted kid-sized N95 mask on polluted days and limit roadside waiting.',
          outdoorPlay:
            parsed.childrenPrecautions?.outdoorPlay ||
            'Move active play indoors when air quality is Poor or worse, especially for children with asthma.',
          classroomTip:
            parsed.childrenPrecautions?.classroomTip ||
            'Keep children hydrated and ensure prescribed reliever inhalers are kept accessible if needed.',
        },
        elderlyGuidance: {
          morningEveningAdvice:
            parsed.elderlyGuidance?.morningEveningAdvice ||
            'Check live AQI before stepping out rather than following a fixed walk schedule.',
          indoorComfort:
            parsed.elderlyGuidance?.indoorComfort ||
            'Keep indoor air smoke-free, seal door drafts with a towel, and use wet mopping instead of dry sweeping.',
          symptomWatch:
            parsed.elderlyGuidance?.symptomWatch ||
            'Seek professional medical help promptly for persistent coughing, wheezing, chest tightness, dizziness, or shortness of breath.',
        },
        lowEmissionHabits: Array.isArray(parsed.lowEmissionHabits) ? parsed.lowEmissionHabits.slice(0, 5) : [],
        emergencyAlert: parsed.emergencyAlert?.trim() ? parsed.emergencyAlert.trim() : null,
      });
    } catch (err: unknown) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  // Catch-all 404 JSON handler for any unmatched /api/* route (prevents falling through to HTML SPA)
  apiRouter.use((req: Request, res: Response) => {
    res.status(404).json({
      error: `API endpoint "${req.method} /api${req.path}" was not found.`,
      code: 'API_ROUTE_NOT_FOUND',
    });
  });

  // Express JSON error middleware for malformed request bodies, payload limits, or unexpected API errors
  apiRouter.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const errorObj = err as { status?: number; type?: string; message?: string };
    if (errorObj?.type === 'entity.parse.failed') {
      res.status(400).json({
        error: 'The request contained malformed JSON.',
        code: 'INVALID_REQUEST_JSON',
      });
      return;
    }
    if (errorObj?.type === 'entity.too.large') {
      res.status(413).json({
        error: 'The request payload is too large.',
        code: 'PAYLOAD_TOO_LARGE',
      });
      return;
    }
    const status = typeof errorObj?.status === 'number' && errorObj.status >= 400 ? errorObj.status : 500;
    res.status(status).json({
      error: 'An unexpected server error occurred while processing your API request.',
      code: 'INTERNAL_API_ERROR',
    });
  });

  // Mount API router BEFORE Vite middlewares and SPA static fallback
  app.use('/api', apiRouter);

  // Frontend Vite middleware (dev) or static dist serving (production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'API endpoint not found.', code: 'API_ROUTE_NOT_FOUND' });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AirAware AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AirAware AI server:', err);
  process.exit(1);
});

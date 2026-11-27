import { useState } from 'react';
import { BookOpen, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { AQI_CATEGORIES } from '../lib/aqiUtils';
import { POLLUTION_EDUCATION_TOPICS } from '../data/educationalContent';
import type { AqiCategory } from '../types/airQuality';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Why is PM2.5 considered more hazardous to deep lung health than PM10?',
    options: [
      'PM2.5 particles are larger and block the nose immediately',
      'PM2.5 particles are ≤2.5 µm wide and can reach deep alveoli and enter the bloodstream',
      'PM2.5 only appears in coastal cities during summer rain',
    ],
    correctIndex: 1,
    explanation:
      'PM2.5 is roughly 30× finer than a human hair, allowing it to bypass upper airway filtration and reach deep lung tissue.',
  },
  {
    id: 'q2',
    question: 'Why can winter smog feel heavier during calm, cool inversion conditions?',
    options: [
      'Cold ground air gets trapped under warmer air aloft (temperature inversion), holding pollutants near street level until wind or warming breaks it up',
      'Sunlight destroys oxygen during winter mornings',
      'Trees release PM2.5 dust during winter',
    ],
    correctIndex: 0,
    explanation:
      'Temperature inversion acts like a lid over the city. Exact cleaner hours vary with wind and weather, so always check live hourly AQI data rather than relying on fixed clock times.',
  },
  {
    id: 'q3',
    question: 'Which mask type reliably filters fine PM2.5 particles during Poor to Severe smog?',
    options: [
      'A loose cotton scarf or single-layer cloth mask',
      'A properly sealed N95, KN95, or FFP2 respirator',
      'No mask is needed once visibility looks clear',
    ],
    correctIndex: 1,
    explanation:
      'Certified electrostatic melt-blown N95/FFP2 respirators fitted snugly over the nose bridge filter ≥95% of fine particles.',
  },
];

export function EducationView() {
  const [selectedBand, setSelectedBand] = useState<AqiCategory>('Moderate');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(POLLUTION_EDUCATION_TOPICS[0].id);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const activeBandMeta = AQI_CATEGORIES.find((c) => c.category === selectedBand) ?? AQI_CATEGORIES[2];
  const activeTopic =
    POLLUTION_EDUCATION_TOPICS.find((t) => t.id === selectedTopicId) ?? POLLUTION_EDUCATION_TOPICS[0];

  const answeredCount = Object.keys(answers).length;
  const score = QUIZ_QUESTIONS.filter((q) => answers[q.id] === q.correctIndex).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Urban Air Pollution Education
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Clear, jargon-free explanations of AQI categories, fine vs coarse particulates, winter temperature inversion, and urban emission sources.
        </p>
      </section>

      {/* Interactive 6-Category AQI Scale Explorer */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Interactive 6-Category Air Quality Index (NAQI) Explorer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select any category below to inspect its numerical range, health implications, and recommended mask precautions.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5" role="tablist" aria-label="AQI categories">
          {AQI_CATEGORIES.map((band) => {
            const isSelected = band.category === selectedBand;
            return (
              <button
                key={band.category}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedBand(band.category)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? `${band.softBg} ${band.borderColor} ring-1 ring-slate-900/15`
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className="h-1.5 w-full rounded-full mb-2.5"
                  style={{ backgroundColor: band.barColor }}
                />
                <div className="text-sm font-semibold text-slate-900">{band.category}</div>
                <div className="font-mono text-xs text-slate-500 tabular-nums mt-0.5">
                  {band.range}
                </div>
              </button>
            );
          })}
        </div>

        <div className={`rounded-lg border p-5 ${activeBandMeta.softBg} ${activeBandMeta.borderColor} space-y-3`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className={`font-display text-lg font-bold ${activeBandMeta.textColor}`}>
              {activeBandMeta.category} ({activeBandMeta.range} NAQI)
            </h3>
            <span className="text-xs font-medium text-slate-600">
              {activeBandMeta.isEmergency ? 'Emergency Advisory Band' : 'Standard Advisory Band'}
            </span>
          </div>
          <p className="text-sm text-slate-900 font-medium">{activeBandMeta.healthSummary}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-slate-700 leading-relaxed">
            <div>
              <div className="font-semibold text-slate-900 mb-1">General Public</div>
              <p>{activeBandMeta.generalPopulation}</p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-1">Children, Seniors &amp; Sensitive Groups</div>
              <p>{activeBandMeta.sensitiveGroups}</p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 mb-1">Mask Protection</div>
              <p>{activeBandMeta.maskGuidance}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Concept Modules + Visual Particle Size Comparison */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Topic Selector & Reader */}
        <div className="xl:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg" role="tablist" aria-label="Pollution education topics">
            {POLLUTION_EDUCATION_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                role="tab"
                aria-selected={selectedTopicId === topic.id}
                onClick={() => setSelectedTopicId(topic.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-[36px] ${
                  selectedTopicId === topic.id
                    ? 'bg-white text-teal-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {topic.id === 'aqi'
                  ? 'AQI Explained'
                  : topic.id === 'pm25-pm10'
                    ? 'PM2.5 vs PM10'
                    : topic.id === 'winter-smog'
                      ? 'Winter Smog'
                      : 'Pollution Sources'}
              </button>
            ))}
          </div>

          <article className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-teal-700 shrink-0" aria-hidden="true" />
                <span>{activeTopic.title}</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">{activeTopic.subtitle}</p>
            </div>

            <p className="text-sm sm:text-base text-slate-800 leading-relaxed">
              {activeTopic.summary}
            </p>

            <ul className="space-y-2.5 list-disc pl-5 text-sm text-slate-700 leading-relaxed">
              {activeTopic.keyFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>

            <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-4 text-sm text-teal-950">
              <strong className="font-semibold">Family Takeaway: </strong>
              {activeTopic.practicalTakeaway}
            </div>
          </article>
        </div>

        {/* Scientific Scale Diagram: Human Hair vs PM10 vs PM2.5 */}
        <div className="xl:col-span-4 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-5">
          <div className="space-y-1">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Particle Size Scale Comparison
            </h2>
            <p className="text-xs text-slate-500">
              Relative cross-section diameter in micrometers (µm).
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-4">
            <svg
              viewBox="0 0 260 190"
              className="w-full max-w-[260px] h-auto"
              role="img"
              aria-label="Diagram comparing 60 micrometer human hair cross-section with 10 micrometer PM10 and 2.5 micrometer PM2.5 particles"
            >
              {/* Human Hair Cross-Section (~60 µm -> radius 72px) */}
              <circle cx="96" cy="95" r="72" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
              <text x="96" y="88" textAnchor="middle" fill="#334155" fontSize="12" fontWeight="600">
                Human Hair
              </text>
              <text x="96" y="106" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="monospace">
                50–70 µm
              </text>

              {/* PM10 (~10 µm -> radius 12px) */}
              <circle cx="204" cy="70" r="12" fill="#0284c7" />
              <text x="204" y="48" textAnchor="middle" fill="#0369a1" fontSize="11" fontWeight="600">
                PM10 (≤10 µm)
              </text>
              <text x="204" y="96" textAnchor="middle" fill="#64748b" fontSize="10">
                Dust &amp; pollen
              </text>

              {/* PM2.5 (~2.5 µm -> radius 3.5px) */}
              <circle cx="204" cy="134" r="3.5" fill="#dc2626" />
              <text x="204" y="122" textAnchor="middle" fill="#b91c1c" fontSize="11" fontWeight="600">
                PM2.5 (≤2.5 µm)
              </text>
              <text x="204" y="152" textAnchor="middle" fill="#64748b" fontSize="10">
                Smoke &amp; exhaust
              </text>
            </svg>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
            Nearly <strong className="font-mono text-slate-900">25–30</strong> PM2.5 particles can sit side-by-side across the width of a single strand of human hair.
          </div>
        </div>
      </section>

      {/* Interactive 3-Question Knowledge Check */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-teal-700" aria-hidden="true" />
              <span>Quick Family Air-Safety Check</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Test your understanding of smog science and everyday protection.
            </p>
          </div>
          {answeredCount > 0 && (
            <span className="font-mono text-xs font-semibold text-teal-800 tabular-nums">
              Score: {score}/{QUIZ_QUESTIONS.length}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {QUIZ_QUESTIONS.map((q, qIdx) => {
            const picked = answers[q.id];
            const hasAnswered = picked !== undefined;
            const isCorrect = picked === q.correctIndex;

            return (
              <div key={q.id} className="rounded-lg border border-slate-200 p-4 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-900 leading-snug">
                    {qIdx + 1}. {q.question}
                  </div>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const selected = picked === optIdx;
                      let stateClass = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700';
                      if (hasAnswered) {
                        if (optIdx === q.correctIndex) {
                          stateClass = 'border-emerald-300 bg-emerald-50 text-emerald-950 font-medium';
                        } else if (selected) {
                          stateClass = 'border-red-300 bg-red-50 text-red-950';
                        }
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs leading-snug transition-colors ${stateClass}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {hasAnswered && (
                  <div className="pt-3 border-t border-slate-100 text-xs flex items-start gap-2 text-slate-700 leading-relaxed">
                    {isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <span>{q.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

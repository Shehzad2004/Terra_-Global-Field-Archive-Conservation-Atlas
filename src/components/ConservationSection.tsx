import React, { useState } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';
import { ConservationArticle } from '../types.ts';

interface ConservationSectionProps {
  articles: ConservationArticle[];
  loading: boolean;
}

const PILLARS = [
  'All',
  'Citizen Science',
  'Supporting Reserves',
  'Sustainable Habits',
  'Policy & Restoration',
];

export const ConservationSection: React.FC<ConservationSectionProps> = ({
  articles,
  loading,
}) => {
  const [selectedPillar, setSelectedPillar] = useState('All');
  const [activeArticle, setActiveArticle] = useState<ConservationArticle | null>(null);

  const filtered =
    selectedPillar === 'All'
      ? articles
      : articles.filter((a) => a.pillar === selectedPillar);

  const featured = activeArticle || filtered[0] || null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="border-b border-[#D6CEBE] pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-[#57534E]">
            04. Curatorial Field Dispatches &amp; Protocols
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-medium text-[#1C1917]">
            Conservation Practice &amp; Stewardship
          </h1>
          <p className="text-base text-[#44403C] max-w-2xl leading-relaxed">
            Evidence-backed monographs on citizen bioacoustics, Indigenous-governed wildlife
            corridors, trophic marine restoration, and high-leverage sustainable habits.
          </p>
        </div>

        {/* Pillar Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EBE6DF] rounded-lg border border-[#D6CEBE]">
          {PILLARS.map((pillar) => (
            <button
              key={pillar}
              type="button"
              onClick={() => {
                setSelectedPillar(pillar);
                setActiveArticle(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedPillar === pillar
                  ? 'bg-[#1B3B2B] text-[#F7F4EE]'
                  : 'text-[#44403C] hover:text-[#1C1917]'
              }`}
            >
              {pillar}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-[#57534E]">
          Loading conservation monographs...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left 70%: Asymmetric Editorial Reading Canvas */}
          {featured && (
            <article className="lg:col-span-8 bg-[#EBE6DF]/45 border border-[#D6CEBE] rounded-2xl p-6 sm:p-10 space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                <span className="font-semibold text-[#1B3B2B]">{featured.pillar}</span>
                <span aria-hidden="true">·</span>
                <span>Published {featured.publishedAt}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{featured.readTimeMinutes} min read</span>
              </div>

              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917] leading-tight">
                {featured.title}
              </h2>

              <p className="font-editorial italic text-xl text-[#44403C] leading-relaxed">
                {featured.subtitle}
              </p>

              <div className="py-4 border-y border-[#D6CEBE] flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-[#57534E]">By </span>
                  <span className="font-semibold text-[#1C1917]">{featured.authorName}</span>
                  <span className="text-[#57534E]"> · {featured.authorRole}</span>
                </div>
                <div className="font-mono-tabular text-[#1B3B2B] font-medium">
                  Empirical Benchmark: {featured.impactMetric}
                </div>
              </div>

              {/* Long-Form Prose with Drop Cap */}
              <div className="space-y-4 text-base text-[#292524] leading-relaxed max-w-prose">
                {featured.content.split('\n\n').map((paragraph, index) => (
                  <p
                    key={index}
                    className={
                      index === 0
                        ? 'first-letter:text-5xl first-letter:font-editorial first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-[#1B3B2B]'
                        : 'whitespace-pre-line'
                    }
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          )}

          {/* Right 30%: Monograph Index & Quantitative Proof Callouts */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="text-xs uppercase tracking-widest text-[#57534E] font-semibold">
              Monograph Directory ({filtered.length})
            </div>

            <div className="space-y-4">
              {filtered.map((art, idx) => {
                const isCurrent = featured?.id === art.id;
                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => setActiveArticle(art)}
                    className={`w-full text-left p-5 rounded-xl border transition-colors ${
                      isCurrent
                        ? 'bg-[#1B3B2B] text-[#F7F4EE] border-[#1B3B2B]'
                        : 'bg-[#EBE6DF]/60 text-[#1C1917] border-[#D6CEBE] hover:bg-[#EBE6DF]'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 text-xs mb-1.5 ${
                        isCurrent ? 'text-[#D6CEBE]' : 'text-[#57534E]'
                      }`}
                    >
                      <span className="font-mono-tabular">0{idx + 1}.</span>
                      <span>{art.pillar}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{art.readTimeMinutes} min</span>
                    </div>
                    <h3 className="font-editorial text-xl font-semibold leading-snug mb-2">
                      {art.title}
                    </h3>
                    <p
                      className={`text-xs leading-relaxed line-clamp-2 ${
                        isCurrent ? 'text-[#E6E1D6]' : 'text-[#44403C]'
                      }`}
                    >
                      {art.summary}
                    </p>
                    <div
                      className={`mt-3 pt-2.5 border-t text-[11px] font-mono-tabular flex items-center justify-between ${
                        isCurrent
                          ? 'border-[#2C523E] text-[#F7F4EE]'
                          : 'border-[#D6CEBE] text-[#1B3B2B]'
                      }`}
                    >
                      <span className="truncate max-w-[220px]">{art.impactMetric}</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Citizen Science Field Pledge Box */}
            <div className="p-6 rounded-xl bg-[#2A211B] text-[#F7F4EE] space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#D6CEBE]">
                <BookOpen className="w-4 h-4 text-[#C85A32]" />
                <span>Ethical Field Photography Charter</span>
              </div>
              <p className="font-editorial text-xl italic text-[#F7F4EE] leading-snug">
                “No photograph is worth the disturbance of a nesting bird, denning carnivore,
                or fragile biological soil crust.”
              </p>
              <p className="text-xs text-[#D6CEBE]/80 leading-relaxed">
                All uploads to Terra adhere to IUCN ethical wildlife observation distances and
                suppress exact nest coordinates for Critically Endangered taxa when flagged by
                curators.
              </p>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};

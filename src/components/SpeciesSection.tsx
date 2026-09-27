import React, { useState } from 'react';
import { Search, Globe, ArrowUpRight, RefreshCw } from 'lucide-react';
import { CONTINENTS, IUCN_LABELS, SpeciesItem } from '../types.ts';
import { MediaImage } from './MediaImage.tsx';
import { CONTINENT_CENTERS } from './InteractiveMap.tsx';

interface SpeciesSectionProps {
  speciesList: SpeciesItem[];
  loading: boolean;
  selectedKingdom: string;
  onSelectKingdom: (k: string) => void;
  selectedStatus: string;
  onSelectStatus: (s: string) => void;
  selectedContinent: string;
  onSelectContinent: (c: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLiveLookup: (taxonQuery: string) => Promise<void>;
}

const KINGDOMS = [
  { id: 'All', label: 'All Lifeforms' },
  { id: 'Animalia', label: 'Animals (Mammals & Fauna)' },
  { id: 'Aves', label: 'Birds (Avian Life)' },
  { id: 'Plantae', label: 'Ancient Trees & Unique Plants' },
  { id: 'Marine', label: 'Aquatic Animals & Marine Life' },
];

const STATUS_FILTERS = ['All', 'CR', 'EN', 'VU', 'NT', 'EW', 'EX'];

export const SpeciesSection: React.FC<SpeciesSectionProps> = ({
  speciesList,
  loading,
  selectedKingdom,
  onSelectKingdom,
  selectedStatus,
  onSelectStatus,
  selectedContinent,
  onSelectContinent,
  searchQuery,
  onSearchChange,
  onLiveLookup,
}) => {
  const [liveInput, setLiveInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const activeRealmInfo = CONTINENT_CENTERS.find((r) => r.name === selectedContinent);

  const handleLiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveInput.trim()) return;
    setLookingUp(true);
    setLookupFeedback(null);
    try {
      await onLiveLookup(liveInput.trim());
      setLookupFeedback(
        `Indexed "${liveInput.trim()}" from live biodiversity records into PostgreSQL.`
      );
      setLiveInput('');
    } catch (err: any) {
      setLookupFeedback(err?.message || 'Live lookup failed.');
    } finally {
      setLookingUp(false);
    }
  };

  const formatLifeformLabel = (kingdom: string) => {
    switch (kingdom) {
      case 'Animalia':
        return 'Terrestrial Animal';
      case 'Aves':
        return 'Bird (Aves)';
      case 'Plantae':
        return 'Ancient Tree / Unique Plant';
      case 'Marine':
        return 'Aquatic / Marine Animal';
      default:
        return kingdom;
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
      {/* Institutional Section Header */}
      <div className="border-b border-[#D6CEBE] pb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-7 space-y-3">
          <div className="text-xs uppercase tracking-widest text-[#57534E]">
            03. IUCN Red List &amp; Biogeographic Monograph
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-medium text-[#1C1917] leading-tight">
            Famous, Unique &amp; Endangered Nature Ledger
          </h1>
          <p className="text-base text-[#44403C] max-w-2xl leading-relaxed">
            An archival registry of iconic terrestrial mammals, rare birds, millennial trees,
            living-fossil plants, and freshwater/marine aquatic animals across Earth’s seven
            biogeographic realms.
          </p>
        </div>

        {/* Live IUCN / Biodiversity API Query Box */}
        <div className="lg:col-span-5 bg-[#EBE6DF] p-5 rounded-xl border border-[#D6CEBE]">
          <div className="flex items-center justify-between text-xs text-[#57534E] mb-2">
            <span className="font-semibold text-[#1C1917]">
              Live Biodiversity &amp; IUCN Taxon Importer
            </span>
            <Globe className="w-3.5 h-3.5 text-[#1B3B2B]" />
          </div>
          <p className="text-xs text-[#57534E] mb-3 leading-relaxed">
            Fetch real-time taxonomic &amp; conservation status records for any binomial or
            common name (e.g., <em>Gorilla beringei</em>, <em>Dracaena cinnabari</em>) and
            persist to PostgreSQL.
          </p>
          <form onSubmit={handleLiveSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              placeholder="Enter species (e.g. Pongo abelii)..."
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-[#F7F4EE] border border-[#D6CEBE] text-[#1C1917]"
            />
            <button
              type="submit"
              disabled={lookingUp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1B3B2B] text-[#F7F4EE] text-xs font-medium hover:bg-[#142C20] transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${lookingUp ? 'animate-spin' : ''}`} />
              <span>{lookingUp ? 'Querying...' : 'Sync Taxon'}</span>
            </button>
          </form>
          {lookupFeedback && (
            <p className="mt-2 text-xs text-[#1B3B2B] font-medium">{lookupFeedback}</p>
          )}
        </div>
      </div>

      {/* Interactive Biogeographic Realm Bar */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-[#57534E] font-semibold">
            Select Biogeographic Realm
          </div>
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#EBE6DF] rounded-xl border border-[#D6CEBE]">
            {CONTINENTS.map((cont) => {
              const realmMeta = CONTINENT_CENTERS.find((r) => r.name === cont);
              return (
                <button
                  key={cont}
                  type="button"
                  onClick={() => onSelectContinent(cont)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    selectedContinent === cont
                      ? 'bg-[#1B3B2B] text-[#F7F4EE]'
                      : 'text-[#44403C] hover:text-[#1C1917] hover:bg-[#E2DDD3]'
                  }`}
                >
                  {cont === 'All'
                    ? 'All 7 Biogeographic Realms'
                    : `${cont} · ${realmMeta?.realmTitle.replace(' Biogeographic Realm', '').replace(' Realms', '')}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Biogeographic Realm Dossier Banner */}
        {activeRealmInfo && (
          <div className="p-6 rounded-xl bg-[#EBE6DF]/70 border border-[#D6CEBE] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D6CEBE] pb-3">
              <div>
                <div className="text-xs text-[#1B3B2B] font-semibold uppercase tracking-wider">
                  {activeRealmInfo.realmTitle}
                </div>
                <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                  Famous &amp; Unique Nature of {activeRealmInfo.name}
                </h2>
              </div>
              <p className="text-xs text-[#57534E] max-w-md">
                {activeRealmInfo.biomeSummary}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-[#57534E] font-semibold mb-0.5">
                  Terrestrial Animals
                </div>
                <div className="text-[#1C1917] font-medium">
                  {activeRealmInfo.famousHighlights.animals}
                </div>
              </div>
              <div>
                <div className="text-[#57534E] font-semibold mb-0.5">
                  Iconic Birds (Aves)
                </div>
                <div className="text-[#1C1917] font-medium">
                  {activeRealmInfo.famousHighlights.birds}
                </div>
              </div>
              <div>
                <div className="text-[#57534E] font-semibold mb-0.5">
                  Ancient Trees &amp; Unique Plants
                </div>
                <div className="text-[#1C1917] font-medium">
                  {activeRealmInfo.famousHighlights.treesAndPlants}
                </div>
              </div>
              <div>
                <div className="text-[#57534E] font-semibold mb-0.5">
                  Aquatic &amp; Marine Animals
                </div>
                <div className="text-[#1C1917] font-medium">
                  {activeRealmInfo.famousHighlights.aquaticLife}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Kingdom / Lifeform Segmented Bar */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EBE6DF] rounded-lg border border-[#D6CEBE]">
            {KINGDOMS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => onSelectKingdom(k.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedKingdom === k.id
                    ? 'bg-[#1B3B2B] text-[#F7F4EE]'
                    : 'text-[#44403C] hover:text-[#1C1917]'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search animal, bird, tree, aquatic..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg bg-[#EBE6DF] border border-[#D6CEBE] text-[#1C1917] focus:outline-none focus:border-[#1B3B2B]"
            />
          </div>
        </div>

        {/* IUCN Category Selector */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-[#57534E] mr-1">IUCN Red List Status:</span>
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onSelectStatus(st)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedStatus === st
                  ? 'bg-[#C85A32] text-[#F7F4EE]'
                  : 'bg-[#EBE6DF] text-[#44403C] hover:text-[#1C1917]'
              }`}
            >
              {st === 'All' ? 'All Categories' : IUCN_LABELS[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Species Catalog Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-[#57534E]">
          Loading taxonomic records from PostgreSQL...
        </div>
      ) : speciesList.length === 0 ? (
        <div className="py-16 text-center border border-[#D6CEBE] rounded-xl bg-[#EBE6DF]/40">
          <p className="font-editorial text-2xl text-[#1C1917]">
            No species match your current filter criteria
          </p>
          <p className="mt-1 text-xs text-[#57534E]">
            Reset filters or use the Live Taxon Importer above to add a new species.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {speciesList.map((item) => {
            const statusMeta = IUCN_LABELS[item.iucnStatus] || {
              label: `${item.iucnStatus} · Assessed`,
              full: item.iucnStatus,
              tone: 'text-[#1B3B2B]',
            };
            const isExpanded = expandedId === item.id;

            return (
              <article
                key={item.id}
                className="bg-[#EBE6DF]/55 border border-[#D6CEBE] rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[16/9] w-full overflow-hidden bg-[#1C1917]">
                    <MediaImage
                      src={item.imageUrl}
                      alt={`${item.commonName} (${item.scientificName})`}
                      subtitle={item.scientificName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Zero-Pill Metadata Line */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                      <span className={`font-semibold ${statusMeta.tone}`}>
                        {statusMeta.label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#1B3B2B]">
                        {formatLifeformLabel(item.kingdom)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.continent}</span>
                      <span aria-hidden="true">·</span>
                      <span>Trend: {item.populationTrend}</span>
                    </div>

                    <div>
                      <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                        {item.commonName}
                      </h2>
                      <p className="font-editorial italic text-lg text-[#57534E]">
                        {item.scientificName}
                      </p>
                    </div>

                    <p className="text-sm text-[#292524] leading-relaxed">
                      {item.description}
                    </p>

                    {/* Structured Definition List (Museum Accession Style) */}
                    <dl className="pt-3 border-t border-[#D6CEBE] space-y-2.5 text-xs">
                      <div className="grid grid-cols-12 gap-2">
                        <dt className="col-span-4 text-[#57534E] font-medium">
                          Population Status
                        </dt>
                        <dd className="col-span-8 font-mono-tabular text-[#1C1917] font-medium">
                          {item.populationEstimate}
                        </dd>
                      </div>
                      <div className="grid grid-cols-12 gap-2">
                        <dt className="col-span-4 text-[#57534E] font-medium">
                          Biogeographic Habitat
                        </dt>
                        <dd className="col-span-8 text-[#292524] leading-relaxed">
                          {item.habitat}
                        </dd>
                      </div>
                      {isExpanded && (
                        <div className="grid grid-cols-12 gap-2">
                          <dt className="col-span-4 text-[#57534E] font-medium">
                            Documented Threats
                          </dt>
                          <dd className="col-span-8 text-[#9A3412] leading-relaxed">
                            {item.threats}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Actionable Conservation Footer */}
                <div className="px-6 py-4 bg-[#E6E1D6] border-t border-[#D6CEBE] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#1B3B2B]">
                      Direct Citizen Conservation Action
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#1C1917] hover:text-[#C85A32]"
                    >
                      <span>{isExpanded ? 'Hide Threats' : 'Inspect Threats'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-[#292524] leading-relaxed">
                    {item.conservationActions}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

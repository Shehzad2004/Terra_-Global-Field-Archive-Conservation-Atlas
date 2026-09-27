import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { PostItem, SpeciesItem } from '../types.ts';

export interface BiogeographicRealmInfo {
  name: string;
  realmTitle: string;
  lat: number;
  lng: number;
  zoom: number;
  biomeSummary: string;
  famousHighlights: {
    animals: string;
    birds: string;
    treesAndPlants: string;
    aquaticLife: string;
  };
}

export const CONTINENT_CENTERS: BiogeographicRealmInfo[] = [
  {
    name: 'North America',
    realmTitle: 'Nearctic Biogeographic Realm',
    lat: 44.0,
    lng: -105.0,
    zoom: 3,
    biomeSummary:
      'Temperate coastal rainforests, Sierra Nevada mixed-conifer groves, North Pacific kelp canyons, and cordilleran peaks.',
    famousHighlights: {
      animals: 'Spirit Bear (Kermode Bear), North American Wolverine',
      birds: 'California Condor, Spotted Owl',
      treesAndPlants: 'Giant Sequoia, Coast Redwood, Bristlecone Pine',
      aquaticLife: 'Pacific Sea Otter, Vaquita Porpoise, Giant Bladder Kelp',
    },
  },
  {
    name: 'South America',
    realmTitle: 'Neotropical Biogeographic Realm',
    lat: -14.0,
    lng: -60.0,
    zoom: 3,
    biomeSummary:
      'Amazonian varzea floodplains, Neotropical cloud forests, Araucaria moist highlands, and Andean paramo.',
    famousHighlights: {
      animals: 'Golden Lion Tamarin, Jaguar, Giant Anteater',
      birds: 'Harpy Eagle, Andean Condor, Resplendent Quetzal',
      treesAndPlants: 'Paraná Pine (Candelabra Tree), Amazon Giant Water Lily (Victoria amazonica)',
      aquaticLife: 'Amazon Pink River Dolphin (Boto), Arapaima',
    },
  },
  {
    name: 'Europe',
    realmTitle: 'Western Palearctic Biogeographic Realm',
    lat: 48.5,
    lng: 12.0,
    zoom: 4,
    biomeSummary:
      'Mediterranean cork-oak dehesas, Dolomitic limestone massifs, Cantabrian deciduous forests, and Aegean karst archipelagos.',
    famousHighlights: {
      animals: 'Iberian Lynx, European Bison (Wisent)',
      birds: 'Cantabrian Capercaillie, Bearded Vulture (Lammergeier)',
      treesAndPlants: 'Bosnian Heldreich’s Pine (1,075-yr Adonis Tree), Ancient Olive Groves',
      aquaticLife: 'Mediterranean Monk Seal, Posidonia Oceanica Seagrass Meadows',
    },
  },
  {
    name: 'Africa',
    realmTitle: 'Afrotropical Biogeographic Realm',
    lat: 2.0,
    lng: 21.0,
    zoom: 3,
    biomeSummary:
      'Hyper-arid Namib coastal fog desert, Sudd papyrus wetlands, Rift Valley savannahs, and Afromontane cloud forests.',
    famousHighlights: {
      animals: 'Black Rhinoceros, Mountain Gorilla, Okapi',
      birds: 'Shoebill Stork, Secretarybird, Grey Crowned Crane',
      treesAndPlants: 'African Baobab (Tree of Life), Welwitschia (1,500-yr Living Fossil), Wood’s Cycad',
      aquaticLife: 'African Penguin, Lake Tanganyika Endemic Cichlids, West African Manatee',
    },
  },
  {
    name: 'Asia',
    realmTitle: 'Indomalayan & Eastern Palearctic Realms',
    lat: 34.0,
    lng: 98.0,
    zoom: 3,
    biomeSummary:
      'Primorye Korean-pine forests, Himalayan bamboo understories, Yangtze riverine lakes, and Sundaland dipterocarp rainforests.',
    famousHighlights: {
      animals: 'Amur Leopard, Himalayan Red Panda, Sumatran Orangutan',
      birds: 'Philippine Eagle, Spoon-Billed Sandpiper',
      treesAndPlants: 'Wild Maidenhair Tree (Ginkgo biloba), Giant Padma (Rafflesia arnoldii)',
      aquaticLife: 'Yangtze Finless Porpoise, Mekong Giant Catfish',
    },
  },
  {
    name: 'Oceania',
    realmTitle: 'Australasian Biogeographic Realm',
    lat: -25.0,
    lng: 140.0,
    zoom: 4,
    biomeSummary:
      'Blue Mountains sandstone slot canyons, Gondwanan podocarp island sanctuaries, temperate kelp reefs, and eucalyptus woodlands.',
    famousHighlights: {
      animals: 'Duck-Billed Platypus, Tasmanian Devil, Thylacine (Historical)',
      birds: 'Kākāpō (Flightless Nocturnal Parrot), Southern Cassowary',
      treesAndPlants: 'Wollemi Pine (Jurassic Dinosaur Tree), Kauri (Agathis australis)',
      aquaticLife: 'Leafy Seadragon, Weedy Seadragon, Giant Cuttlefish',
    },
  },
  {
    name: 'Antarctica',
    realmTitle: 'Antarctic Biogeographic Realm',
    lat: -68.0,
    lng: 0.0,
    zoom: 3,
    biomeSummary:
      'Circumpolar pelagic krill upwelling zones, seasonal fast sea-ice shelves, and ice-free Antarctic Peninsula coastal oases.',
    famousHighlights: {
      animals: 'Weddell Seal, Ross Seal, Leopard Seal',
      birds: 'Emperor Penguin, Wandering Albatross, Snow Petrel',
      treesAndPlants: 'Antarctic Hair Grass (Deschampsia antarctica), Antarctic Pearlwort',
      aquaticLife: 'Antarctic Blue Whale, Colossal Squid, Antarctic Krill',
    },
  },
];

// Geotagged coordinates for Famous & Unique Species Landmarks on the World Atlas
export const FAMOUS_SPECIES_COORDINATES: Record<string, [number, number]> = {
  'Sequoiadendron giganteum': [36.5647, -118.7734], // Giant Forest, Sequoia NP
  'Enhydra lutris': [36.8125, -121.7865], // Monterey Bay / Elkhorn Slough
  'Ursus americanus kermodei': [52.8333, -128.8667], // Princess Royal Island, BC
  'Phocoena sinus': [31.0852, -114.5812], // Northern Gulf of California
  'Gymnogyps californianus': [36.2419, -121.7825], // Big Sur / Ventana
  'Inia geoffrensis': [-3.119, -60.0217], // Rio Negro / Amazon Confluence
  'Harpia harpyja': [-4.2512, -55.9881], // Tapajós National Forest, Amazonia
  'Victoria amazonica': [-3.3522, -64.7114], // Mamirauá Flooded Forest Reserve
  'Araucaria angustifolia': [-27.8167, -50.3261], // Santa Catarina Highlands
  'Adansonia digitata': [-20.2869, 44.2858], // Avenue of the Baobabs / Savannah
  'Welwitschia mirabilis': [-22.6692, 15.0289], // Welwitschia Plains, Namib
  'Balaeniceps rex': [7.9631, 30.8524], // Sudd Papyrus Wetlands
  'Diceros bicornis': [-19.1667, 15.9167], // Etosha / Kunene
  'Encephalartos woodii': [-28.8333, 31.7167], // Ngoye Forest, South Africa
  'Lynx pardinus': [37.0428, -6.4342], // Doñana & Sierra Morena, Spain
  'Monachus monachus': [39.3167, 24.1833], // Alonissos Marine Park, Aegean Sea
  'Pinus heldreichii': [39.9125, 29.152], // Pindus / Pollino Alpine Ridge
  'Tetrao urogallus cantabricus': [43.0333, -6.4667], // Muniellos / Cantabrian Range
  'Neophocaena asiaeorientalis': [29.2167, 116.1833], // Poyang Lake / Yangtze
  'Pithecophaga jefferyi': [6.9875, 125.2708], // Mount Apo, Mindanao
  'Ginkgo biloba': [30.3256, 119.4431], // Tianmushan Biosphere Reserve
  'Panthera pardus orientalis': [43.1865, 131.4821], // Land of the Leopard
  'Ailurus fulgens': [27.0389, 87.9264], // Ilam / Kangchenjunga Bamboo Corridor
  'Rafflesia arnoldii': [-3.7928, 102.2608], // Bengkulu Rainforest, Sumatra
  'Phycodurus eques': [-35.6122, 138.6228], // Rapid Bay / Kangaroo Island, South Australia
  'Ornithorhynchus anatinus': [-41.4545, 145.9707], // Tasmanian Riparian Streams
  'Wollemia nobilis': [-32.8528, 150.4125], // Wollemi National Park, Blue Mountains
  'Strigops habroptila': [-46.7667, 167.65], // Whenua Hou (Codfish Island), NZ
  'Thylacinus cynocephalus': [-42.8821, 147.3272], // Hobart / Tasmanian Woodlands
  'Aptenodytes forsteri': [-75.5, -40.0], // Weddell Sea Ice Shelf
  'Deschampsia antarctica': [-64.7742, -64.0531], // Palmer Archipelago, Antarctic Peninsula
  'Balaenoptera musculus': [-62.15, -58.45], // Southern Ocean Krill Convergence
};

export function inferContinentFromLatLng(lat: number, lng: number): string {
  if (lat < -55) return 'Antarctica';
  if (lat >= 12 && lng >= -170 && lng <= -30) return 'North America';
  if (lat < 12 && lng >= -95 && lng <= -30) return 'South America';
  if (lat >= 35 && lng > -25 && lng <= 45) return 'Europe';
  if (lat < 35 && lat >= -38 && lng >= -20 && lng <= 55) return 'Africa';
  if (lat < -8 && lng > 110 && lng <= 180) return 'Oceania';
  return 'Asia';
}

type BasemapStyle = 'topo' | 'satellite' | 'osm';
type OverlayFilter = 'all' | 'species' | 'posts';

const BASEMAP_CONFIGS: Record<
  BasemapStyle,
  { label: string; url: string; attribution: string; maxZoom: number }
> = {
  topo: {
    label: 'Topographic Atlas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; National Geographic, USGS, UNEP-WCMC',
    maxZoom: 18,
  },
  satellite: {
    label: 'Earth Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Earthstar Geographics, USDA, USGS',
    maxZoom: 18,
  },
  osm: {
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

interface ExplorerMapProps {
  posts: PostItem[];
  speciesList?: SpeciesItem[];
  selectedContinent: string;
  onSelectContinent: (continent: string) => void;
  onSelectCountry: (country: string) => void;
  onOpenPost: (post: PostItem) => void;
  onInspectSpecies?: (species: SpeciesItem) => void;
}

export const ExplorerMap: React.FC<ExplorerMapProps> = ({
  posts,
  speciesList = [],
  selectedContinent,
  onSelectContinent,
  onSelectCountry,
  onOpenPost,
  onInspectSpecies,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [basemap, setBasemap] = useState<BasemapStyle>('topo');
  const [overlayMode, setOverlayMode] = useState<OverlayFilter>('all');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [22, 10],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      scrollWheelZoom: true,
      worldCopyJump: true,
    });

    const initialConfig = BASEMAP_CONFIGS.topo;
    const tileLayer = L.tileLayer(initialConfig.url, {
      attribution: initialConfig.attribution,
      maxZoom: initialConfig.maxZoom,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    tileLayerRef.current = tileLayer;
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const cfg = BASEMAP_CONFIGS[basemap];
    const nextLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
    nextLayer.bringToBack();
    tileLayerRef.current = nextLayer;
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Render Continental Biogeographic Realm Nodes
    CONTINENT_CENTERS.forEach((cont) => {
      const postCount = posts.filter((p) => p.continent === cont.name).length;
      const spCount = speciesList.filter((s) => s.continent === cont.name).length;
      const isSelected = selectedContinent === cont.name;

      const circle = L.circleMarker([cont.lat, cont.lng], {
        radius: isSelected ? 24 : 17,
        color: isSelected ? '#C85A32' : '#1B3B2B',
        weight: isSelected ? 2.5 : 1.5,
        fillColor: isSelected ? '#C85A32' : '#1B3B2B',
        fillOpacity: isSelected ? 0.3 : 0.16,
      });

      circle.bindTooltip(
        `${cont.name} (${cont.realmTitle}) · ${spCount} Unique Taxa · ${postCount} Field Dispatches`,
        {
          direction: 'top',
          offset: [0, -12],
        }
      );

      circle.on('click', () => {
        onSelectContinent(cont.name);
      });

      circle.addTo(group);
    });

    // 2. Render Geotagged Field Observation Pins (Clay-Orange)
    if (overlayMode === 'all' || overlayMode === 'posts') {
      posts.forEach((post) => {
        if (typeof post.latitude !== 'number' || typeof post.longitude !== 'number') return;

        const pinHtml = `
          <div style="
            width: 14px;
            height: 14px;
            border-radius: 9999px;
            background-color: #C85A32;
            border: 2px solid #F7F4EE;
            box-shadow: 0 2px 6px rgba(28,25,23,0.45);
          "></div>
        `;

        const icon = L.divIcon({
          html: pinHtml,
          className: 'terra-field-pin',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([post.latitude, post.longitude], { icon });

        const popupContainer = document.createElement('div');
        popupContainer.style.minWidth = '210px';
        popupContainer.innerHTML = `
          <div style="padding: 4px 2px;">
            <div style="font-size: 11px; color: #57534E; margin-bottom: 3px;">
              Field Dispatch · ${post.continent} · ${post.category}
            </div>
            <div style="font-family: Georgia, serif; font-size: 15px; font-weight: 600; color: #1C1917; line-height: 1.25; margin-bottom: 6px;">
              ${post.title}
            </div>
            <div style="font-family: monospace; font-size: 11px; color: #78716C; margin-bottom: 8px;">
              ${post.latitude.toFixed(4)}°, ${post.longitude.toFixed(4)}°
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" data-action="open" style="
                background: #1B3B2B;
                color: #F7F4EE;
                border: none;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
              ">Inspect Entry</button>
              <button type="button" data-action="country" style="
                background: #EBE6DF;
                color: #1C1917;
                border: 1px solid #D6CEBE;
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
              ">Filter ${post.country}</button>
            </div>
          </div>
        `;

        const openBtn = popupContainer.querySelector('[data-action="open"]');
        openBtn?.addEventListener('click', () => {
          onOpenPost(post);
        });

        const countryBtn = popupContainer.querySelector('[data-action="country"]');
        countryBtn?.addEventListener('click', () => {
          onSelectContinent(post.continent);
          onSelectCountry(post.country);
        });

        marker.bindPopup(popupContainer);
        marker.addTo(group);
      });
    }

    // 3. Render Famous & Unique Flora / Fauna / Aquatic Landmarks (Deep Moss Green Diamonds)
    if (overlayMode === 'all' || overlayMode === 'species') {
      speciesList.forEach((sp) => {
        if (selectedContinent !== 'All' && sp.continent !== selectedContinent) return;
        const coords = FAMOUS_SPECIES_COORDINATES[sp.scientificName];
        if (!coords) return;

        const pinHtml = `
          <div style="
            width: 14px;
            height: 14px;
            transform: rotate(45deg);
            background-color: #1B3B2B;
            border: 2px solid #F7F4EE;
            box-shadow: 0 2px 6px rgba(28,25,23,0.5);
          "></div>
        `;

        const icon = L.divIcon({
          html: pinHtml,
          className: 'terra-species-pin',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker(coords, { icon });

        const popupContainer = document.createElement('div');
        popupContainer.style.minWidth = '220px';
        popupContainer.innerHTML = `
          <div style="padding: 4px 2px;">
            <div style="font-size: 11px; color: #1B3B2B; font-weight: 600; margin-bottom: 2px;">
              Unique ${sp.kingdom} · IUCN ${sp.iucnStatus}
            </div>
            <div style="font-family: Georgia, serif; font-size: 16px; font-weight: 600; color: #1C1917; line-height: 1.2;">
              ${sp.commonName}
            </div>
            <div style="font-family: Georgia, serif; font-style: italic; font-size: 12px; color: #57534E; margin-bottom: 6px;">
              ${sp.scientificName}
            </div>
            <div style="font-size: 11px; color: #44403C; line-height: 1.4; margin-bottom: 8px;">
              ${sp.description.slice(0, 120)}...
            </div>
            <button type="button" data-action="inspect-species" style="
              background: #C85A32;
              color: #F7F4EE;
              border: none;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
            ">Inspect Taxon Dossier</button>
          </div>
        `;

        const inspectBtn = popupContainer.querySelector('[data-action="inspect-species"]');
        inspectBtn?.addEventListener('click', () => {
          if (onInspectSpecies) {
            onInspectSpecies(sp);
          }
        });

        marker.bindPopup(popupContainer);
        marker.addTo(group);
      });
    }
  }, [
    posts,
    speciesList,
    selectedContinent,
    overlayMode,
    onSelectContinent,
    onSelectCountry,
    onOpenPost,
    onInspectSpecies,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedContinent === 'All') {
      map.flyTo([22, 10], 2, { duration: 0.8 });
    } else {
      const target = CONTINENT_CENTERS.find((c) => c.name === selectedContinent);
      if (target) {
        map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.8 });
      }
    }
  }, [selectedContinent]);

  return (
    <div className="relative w-full h-[460px] lg:h-[540px] rounded-xl overflow-hidden border border-[#D6CEBE]">
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Top-Left Map Legend & Marker Layer Filter */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg bg-[#F7F4EE]/95 border border-[#D6CEBE] shadow-md text-[11px]">
        <button
          type="button"
          onClick={() => setOverlayMode('all')}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            overlayMode === 'all'
              ? 'bg-[#1C1917] text-[#F7F4EE]'
              : 'text-[#44403C] hover:text-[#1C1917]'
          }`}
        >
          All Markers
        </button>
        <button
          type="button"
          onClick={() => setOverlayMode('species')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
            overlayMode === 'species'
              ? 'bg-[#1B3B2B] text-[#F7F4EE]'
              : 'text-[#44403C] hover:text-[#1C1917]'
          }`}
        >
          <span className="w-2.5 h-2.5 bg-[#1B3B2B] border border-[#F7F4EE] rotate-45 inline-block" />
          <span>Unique Flora &amp; Fauna ({speciesList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setOverlayMode('posts')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
            overlayMode === 'posts'
              ? 'bg-[#C85A32] text-[#F7F4EE]'
              : 'text-[#44403C] hover:text-[#1C1917]'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32] border border-[#F7F4EE] inline-block" />
          <span>Field Dispatches ({posts.length})</span>
        </button>
      </div>

      {/* Top-Right Basemap Layer Switcher */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1 p-1 rounded-lg bg-[#F7F4EE]/95 border border-[#D6CEBE] shadow-md">
        {(Object.keys(BASEMAP_CONFIGS) as BasemapStyle[]).map((styleKey) => (
          <button
            key={styleKey}
            type="button"
            onClick={() => setBasemap(styleKey)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
              basemap === styleKey
                ? 'bg-[#1B3B2B] text-[#F7F4EE]'
                : 'text-[#44403C] hover:text-[#1C1917]'
            }`}
          >
            {BASEMAP_CONFIGS[styleKey].label}
          </button>
        ))}
      </div>
    </div>
  );
};

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onChangeCoordinates: (lat: number, lng: number, inferredContinent: string) => void;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude,
  longitude,
  onChangeCoordinates,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude || 36.6182, longitude || -121.9015],
      zoom: 3,
      scrollWheelZoom: true,
    });

    L.tileLayer(BASEMAP_CONFIGS.topo.url, {
      attribution: BASEMAP_CONFIGS.topo.attribution,
      maxZoom: BASEMAP_CONFIGS.topo.maxZoom,
    }).addTo(map);

    const pinIcon = L.divIcon({
      html: `<div style="width:16px;height:16px;border-radius:9999px;background:#C85A32;border:2.5px solid #F7F4EE;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
      className: 'terra-picker-pin',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const marker = L.marker([latitude, longitude], { icon: pinIcon }).addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(4));
      const lng = Number(e.latlng.lng.toFixed(4));
      marker.setLatLng([lat, lng]);
      const inferred = inferContinentFromLatLng(lat, lng);
      onChangeCoordinates(lat, lng, inferred);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }, [latitude, longitude]);

  return (
    <div className="w-full h-56 rounded-lg overflow-hidden border border-[#D6CEBE]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

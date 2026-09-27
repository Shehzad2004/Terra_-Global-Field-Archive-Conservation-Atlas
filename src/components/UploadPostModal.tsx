import React, { useState } from 'react';
import { X, Upload, Navigation, Compass } from 'lucide-react';
import { CATEGORIES, CONTINENTS } from '../types.ts';
import { LocationPickerMap, inferContinentFromLatLng } from './InteractiveMap.tsx';

interface UploadPostModalProps {
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    description: string;
    mediaUrl: string;
    mediaType: 'photo' | 'video';
    latitude: number;
    longitude: number;
    locationName: string;
    continent: string;
    country: string;
    category: string;
    cameraExif: string;
  }) => Promise<void>;
}

const CURATED_PRESETS = [
  {
    label: 'Pacific Temperate Rainforest',
    url: '/src/assets/images/terra_hero_forest_1790430384043.jpg',
  },
  {
    label: 'Monterey Giant Kelp Canopy',
    url: '/src/assets/images/terra_ocean_kelp_1790430401192.jpg',
  },
  {
    label: 'Dolomites Alpine Alpenglow',
    url: '/src/assets/images/terra_mountain_peaks_1790430414677.jpg',
  },
  {
    label: 'Namib Ochre Sand Dunes',
    url: '/src/assets/images/terra_desert_dunes_1790430429610.jpg',
  },
  {
    label: 'Primorye Amur Leopard',
    url: '/src/assets/images/terra_wildlife_leopard_1790430448156.jpg',
  },
];

export const UploadPostModal: React.FC<UploadPostModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState(CURATED_PRESETS[0].url);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [latitude, setLatitude] = useState<number>(47.8609);
  const [longitude, setLongitude] = useState<number>(-123.9348);
  const [locationName, setLocationName] = useState('Olympic Biosphere Reserve');
  const [continent, setContinent] = useState<string>('North America');
  const [country, setCountry] = useState('United States');
  const [category, setCategory] = useState<string>('Forest');
  const [cameraExif, setCameraExif] = useState('Leica SL2 · 35mm f/2.8 · ISO 160');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      setMediaType('video');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMediaUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // Optimize image via offscreen canvas for fast storage and rendering
    setMediaType('photo');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.84);
        setMediaUrl(compressedDataUrl);
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        setLatitude(lat);
        setLongitude(lng);
        setContinent(inferContinentFromLatLng(lat, lng));
      },
      () => {
        // Ignore geolocation denial silently
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !country.trim()) {
      setError('Please complete the title, field notes, and country tag.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        mediaUrl,
        mediaType,
        latitude,
        longitude,
        locationName: locationName.trim() || `${country.trim()}, ${continent}`,
        continent,
        country: country.trim(),
        category,
        cameraExif: cameraExif.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to publish observation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl bg-[#F7F4EE] border border-[#D6CEBE] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#D6CEBE] flex items-center justify-between bg-[#EBE6DF]">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#1B3B2B]" />
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              Log Field Observation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#57534E] hover:text-[#1C1917] hover:bg-[#D6CEBE]/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
          {error && (
            <div className="p-3 rounded-lg bg-[#9A3412]/10 border border-[#9A3412] text-[#9A3412] text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Observation Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Dawn Mist Over Old-Growth Sitka Spruce Canopy"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#D6CEBE] text-[#1C1917]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Ecological Field Notes & Description
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe species behavior, habitat structure, weather conditions, and conservation context..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#D6CEBE] text-[#1C1917]"
              />
            </div>

            {/* Media Upload or Selection */}
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                Nature Photo or Short Video Clip
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B3B2B] text-[#F7F4EE] text-xs font-medium cursor-pointer hover:bg-[#142C20] transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo / Short Video</span>
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <select
                  value={
                    CURATED_PRESETS.some((p) => p.url === mediaUrl) ? mediaUrl : ''
                  }
                  onChange={(e) => {
                    if (e.target.value) {
                      setMediaType('photo');
                      setMediaUrl(e.target.value);
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-white border border-[#D6CEBE] text-xs text-[#1C1917]"
                >
                  <option value="">Or select archival field plate...</option>
                  {CURATED_PRESETS.map((p) => (
                    <option key={p.label} value={p.url}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category, Continent, Country */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Biome Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#D6CEBE] text-[#1C1917]"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Continent
              </label>
              <select
                value={continent}
                onChange={(e) => setContinent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#D6CEBE] text-[#1C1917]"
              >
                {CONTINENTS.filter((c) => c !== 'All').map((cont) => (
                  <option key={cont} value={cont}>
                    {cont}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Country / Territory Tag
              </label>
              <input
                type="text"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g., United States, Namibia, Italy"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#D6CEBE] text-[#1C1917]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Specific Reserve or Location Name
              </label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g., Hoh River Valley, Olympic Peninsula"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#D6CEBE] text-[#1C1917]"
              />
            </div>

            {/* Interactive Map Picker for Exact Lat/Lng */}
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E]">
                  Exact Coordinates (Click Map to Pinpoint Lat/Lng)
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  className="inline-flex items-center gap-1 text-xs text-[#1B3B2B] font-medium hover:underline"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Use Current GPS</span>
                </button>
              </div>

              <LocationPickerMap
                latitude={latitude}
                longitude={longitude}
                onChangeCoordinates={(lat, lng, inferredCont) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setContinent(inferredCont);
                }}
              />

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="block text-[11px] text-[#57534E] mb-1">Latitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md bg-white border border-[#D6CEBE] font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-[#57534E] mb-1">Longitude</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-md bg-white border border-[#D6CEBE] font-mono-tabular text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-1.5">
                Optical & Camera EXIF Metadata (Optional)
              </label>
              <input
                type="text"
                value={cameraExif}
                onChange={(e) => setCameraExif(e.target.value)}
                placeholder="e.g., Leica SL2 · 35mm Summicron f/2.8 · ISO 160"
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#D6CEBE] font-mono-tabular text-xs text-[#1C1917]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#D6CEBE] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#57534E] hover:bg-[#EBE6DF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-[#C85A32] text-[#F7F4EE] text-xs font-medium hover:bg-[#B04B25] transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {submitting ? 'Publishing to Archive...' : 'Publish Field Observation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

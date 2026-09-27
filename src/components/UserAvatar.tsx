import React, { useState } from 'react';
import { Upload, Check, Leaf } from 'lucide-react';

export interface NatureAvatarOption {
  id: string;
  label: string;
  biome: string;
  url: string;
}

export const NATURE_AVATARS: NatureAvatarOption[] = [
  {
    id: 'botanical-fern',
    label: 'Coastal Sword Fern',
    biome: 'Botanical Monograph',
    url: '/src/assets/images/avatar_botanical_fern_1790431457091.jpg',
  },
  {
    id: 'arctic-owl',
    label: 'Boreal Snowy Owl',
    biome: 'Avian Field Plate',
    url: '/src/assets/images/avatar_arctic_owl_1790431475410.jpg',
  },
  {
    id: 'sea-turtle',
    label: 'Pelagic Green Turtle',
    biome: 'Marine Monograph',
    url: '/src/assets/images/avatar_sea_turtle_1790431493206.jpg',
  },
  {
    id: 'amur-leopard',
    label: 'Primorye Amur Leopard',
    biome: 'Temperate Wildlife',
    url: '/src/assets/images/terra_wildlife_leopard_1790430448156.jpg',
  },
  {
    id: 'sitka-canopy',
    label: 'Sitka Spruce Canopy',
    biome: 'Old-Growth Forest',
    url: '/src/assets/images/terra_hero_forest_1790430384043.jpg',
  },
  {
    id: 'giant-kelp',
    label: 'Monterey Kelp Forest',
    biome: 'Pelagic Ocean',
    url: '/src/assets/images/terra_ocean_kelp_1790430401192.jpg',
  },
  {
    id: 'dolomite-peaks',
    label: 'Dolomite Alpenglow',
    biome: 'Alpine Massif',
    url: '/src/assets/images/terra_mountain_peaks_1790430414677.jpg',
  },
  {
    id: 'namib-dunes',
    label: 'Namib Ochre Dunes',
    biome: 'Arid Erg',
    url: '/src/assets/images/terra_desert_dunes_1790430429610.jpg',
  },
];

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 'sm',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  const initials = (name || 'FN')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const sizeClass = SIZE_CLASSES[size];

  if (!src || failed) {
    return (
      <div
        title={name}
        className={`inline-flex items-center justify-center rounded-full bg-[#1B3B2B] text-[#F7F4EE] border border-[#D6CEBE] font-editorial font-semibold shrink-0 select-none overflow-hidden ${sizeClass} ${className}`}
      >
        {initials || <Leaf className="w-3.5 h-3.5 text-[#D6CEBE]" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      title={name}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`rounded-full object-cover border border-[#D6CEBE] bg-[#1B3B2B] shrink-0 ${sizeClass} ${className}`}
    />
  );
};

interface AvatarPickerPanelProps {
  currentAvatarUrl: string | null | undefined;
  displayName: string;
  onSelectAvatar: (newAvatarUrl: string) => void;
  saving?: boolean;
}

export const AvatarPickerPanel: React.FC<AvatarPickerPanelProps> = ({
  currentAvatarUrl,
  displayName,
  onSelectAvatar,
  saving = false,
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Center-crop and resize to 256x256 square for crisp, fast avatar storage
        const canvas = document.createElement('canvas');
        const targetSize = 256;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          onSelectAvatar(dataUrl);
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D6CEBE]">
        <div className="flex items-center gap-4">
          <UserAvatar src={currentAvatarUrl} name={displayName} size="lg" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#57534E]">
              Active Naturalist Emblem
            </div>
            <p className="text-xs text-[#44403C] mt-0.5">
              Displayed on your profile dossier and alongside all your field observations and
              threaded comments.
            </p>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B3B2B] text-[#F7F4EE] text-xs font-medium cursor-pointer hover:bg-[#142C20] transition-colors whitespace-nowrap self-start sm:self-center">
          <Upload className="w-3.5 h-3.5" />
          <span>{saving ? 'Updating...' : 'Upload Custom Photo'}</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={saving}
            className="hidden"
          />
        </label>
      </div>

      {uploadError && (
        <div className="text-xs text-[#9A3412] font-medium">{uploadError}</div>
      )}

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-[#57534E] mb-2.5">
          Or Select a Pre-Defined Nature Emblem
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {NATURE_AVATARS.map((option) => {
            const isSelected = currentAvatarUrl === option.url;
            return (
              <button
                key={option.id}
                type="button"
                disabled={saving}
                onClick={() => onSelectAvatar(option.url)}
                className={`group flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'bg-[#1B3B2B] text-[#F7F4EE] border-[#1B3B2B]'
                    : 'bg-[#F7F4EE] text-[#1C1917] border-[#D6CEBE] hover:bg-[#E6E1D6]'
                }`}
              >
                <div className="relative shrink-0">
                  <UserAvatar src={option.url} name={option.label} size="md" />
                  {isSelected && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#C85A32] text-[#F7F4EE] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{option.label}</div>
                  <div
                    className={`text-[11px] truncate ${
                      isSelected ? 'text-[#D6CEBE]' : 'text-[#57534E]'
                    }`}
                  >
                    {option.biome}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Compass } from 'lucide-react';

interface MediaImageProps {
  src: string | null | undefined;
  alt: string;
  mediaType?: 'photo' | 'video' | string;
  className?: string;
  subtitle?: string;
}

export const MediaImage: React.FC<MediaImageProps> = ({
  src,
  alt,
  mediaType = 'photo',
  className = 'w-full h-full object-cover',
  subtitle,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1B3B2B] via-[#24382C] to-[#2A211B] text-[#F7F4EE] p-6 text-center select-none ${className}`}
      >
        <Compass className="w-8 h-8 text-[#D6CEBE]/70 mb-2 stroke-[1.25]" />
        <p className="font-editorial text-lg italic tracking-wide text-[#F7F4EE]/90 line-clamp-2 max-w-xs">
          {alt}
        </p>
        {subtitle && (
          <span className="mt-1 text-[11px] font-mono-tabular text-[#D6CEBE]/70">
            {subtitle}
          </span>
        )}
      </div>
    );
  }

  if (mediaType === 'video' || src.startsWith('data:video/') || src.endsWith('.mp4') || src.endsWith('.webm')) {
    return (
      <video
        src={src}
        className={className}
        controls
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

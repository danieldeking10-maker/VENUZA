import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface VenueMapProps {
  venueName: string;
  city: string;
  region: string;
  country: string;
  address: string;
  mapX: number;
  mapY: number;
  lat: number;
  lng: number;
  editable?: boolean;
  onPinChange?: (next: { mapX: number; mapY: number; lat: number; lng: number }) => void;
}

export const VenueMap: React.FC<VenueMapProps> = ({
  venueName,
  city,
  region,
  country,
  address,
  mapX,
  mapY,
  lat,
  lng,
  editable = false,
  onPinChange,
}) => {
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editable || !onPinChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.max(8, Math.min(92, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.max(12, Math.min(88, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    const nextLat = Number((lat + (50 - yPct) * 0.002).toFixed(4));
    const nextLng = Number((lng + (xPct - 50) * 0.002).toFixed(4));
    onPinChange({ mapX: xPct, mapY: yPct, lat: nextLat, lng: nextLng });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0f27] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-[#121432]">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Navigation className="h-4 w-4 text-[#f5c04a]" />
          <span>{editable ? 'Click map to position venue pin' : `${city}, ${region}`}</span>
        </div>
        <span className="font-mono-num text-xs text-[#848ab0]">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
      </div>

      <div
        onClick={handleMapClick}
        role={editable ? 'button' : 'region'}
        tabIndex={editable ? 0 : undefined}
        aria-label={editable ? 'Interactive venue map pin selector' : `Map showing ${venueName}`}
        className={`relative h-56 w-full select-none overflow-hidden bg-[#0a0c20] ${
          editable ? 'cursor-crosshair' : ''
        }`}
      >
        {/* Architectural Urban Grid & Coastline SVG */}
        <svg viewBox="0 0 600 280" preserveAspectRatio="xMidYMid slice" className="h-full w-full block">
          <defs>
            <pattern id="venuza-map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(124,92,255,0.14)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="600" height="280" fill="#090b1e" />
          <rect width="600" height="280" fill="url(#venuza-map-grid)" />

          {/* Urban Blocks & Parkland */}
          <rect x="40" y="30" width="110" height="75" rx="6" fill="#121638" />
          <rect x="180" y="30" width="145" height="65" rx="6" fill="#10203a" />
          <rect x="360" y="25" width="180" height="80" rx="6" fill="#121638" />
          <rect x="70" y="140" width="130" height="90" rx="6" fill="#121638" />
          <rect x="240" y="135" width="120" height="95" rx="6" fill="#15193d" />
          <rect x="400" y="145" width="150" height="85" rx="6" fill="#10203a" />

          {/* Major Arterials */}
          <path d="M 0 118 L 600 118" stroke="rgba(245,192,74,0.22)" strokeWidth="4" />
          <path d="M 218 0 L 218 280" stroke="rgba(255,255,255,0.14)" strokeWidth="3" />
          <path d="M 380 0 L 380 280" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
          <path d="M 0 230 Q 300 190 600 245" fill="none" stroke="rgba(124,92,255,0.3)" strokeWidth="3" />

          {/* District Labels */}
          <text x="52" y="72" fill="rgba(197,202,227,0.35)" fontSize="10" fontFamily="sans-serif">
            BUSINESS DISTRICT
          </text>
          <text x="410" y="192" fill="rgba(197,202,227,0.35)" fontSize="10" fontFamily="sans-serif">
            BOTANICAL RESERVE
          </text>
        </svg>

        {/* Exact Location Pin */}
        <div
          style={{ left: `${mapX}%`, top: `${mapY}%` }}
          className="absolute -translate-x-1/2 -translate-y-full transition-transform duration-150"
        >
          <div className="flex flex-col items-center">
            <div className="mb-1.5 whitespace-nowrap rounded-lg border border-[#f5c04a]/50 bg-[#0a0b1e]/95 px-2.5 py-1 text-xs font-medium text-white shadow-lg">
              {venueName || 'Venue Pin'}
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5c04a] text-[#0a0b1e] shadow-lg shadow-[#f5c04a]/30">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs text-[#c5cae3] border-t border-white/10">
        <span className="truncate">{address}</span>
        <span className="shrink-0 text-[#848ab0]">{country}</span>
      </div>
    </div>
  );
};

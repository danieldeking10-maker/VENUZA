import React, { useState } from 'react';
import type { VenueVisualTheme } from '../types/venuza';

interface VenueVisualProps {
  src: string;
  theme: VenueVisualTheme;
  angle: 'interior' | 'exterior' | 'surroundings';
  venueName: string;
  className?: string;
}

const THEME_PALETTES: Record<
  VenueVisualTheme,
  { bg1: string; bg2: string; accent: string; secondary: string; warm: string }
> = {
  grand_ballroom: {
    bg1: '#0e102b',
    bg2: '#1f1638',
    accent: '#f5c04a',
    secondary: '#7c5cff',
    warm: '#ffdf8e',
  },
  glass_pavilion: {
    bg1: '#0a1428',
    bg2: '#152544',
    accent: '#f5c04a',
    secondary: '#56c2ff',
    warm: '#ffe8a8',
  },
  auditorium_stage: {
    bg1: '#140c24',
    bg2: '#26143b',
    accent: '#f5c04a',
    secondary: '#a07cff',
    warm: '#ffd07b',
  },
  rooftop_terrace: {
    bg1: '#0d1026',
    bg2: '#251a3f',
    accent: '#f5c04a',
    secondary: '#9378ff',
    warm: '#ffbe5c',
  },
  courtyard_garden: {
    bg1: '#0b1824',
    bg2: '#172b38',
    accent: '#f5c04a',
    secondary: '#4fd1a5',
    warm: '#ffe49e',
  },
};

export const VenueVisual: React.FC<VenueVisualProps> = ({
  src,
  theme,
  angle,
  venueName,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const isRealImage =
    !imgError &&
    Boolean(src) &&
    !src.startsWith('preset:') &&
    (src.startsWith('data:image') || src.startsWith('http') || src.startsWith('/'));

  if (isRealImage) {
    return (
      <div className={`relative overflow-hidden bg-[#121432] ${className}`}>
        <img
          src={src}
          alt={`${venueName} — ${angle}`}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0b1e]/80 via-[#0a0b1e]/20 to-transparent"
        />
      </div>
    );
  }

  const p = THEME_PALETTES[theme] || THEME_PALETTES.grand_ballroom;
  const uid = `${theme}-${angle}`.replace(/[^a-z0-9]/gi, '');

  return (
    <div
      className={`relative overflow-hidden select-none bg-[#0a0b1e] ${className}`}
      role="img"
      aria-label={`${venueName} architectural ${angle} view`}
    >
      <svg
        viewBox="0 0 800 500"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full block"
      >
        <defs>
          <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.bg1} />
            <stop offset="65%" stopColor={p.bg2} />
            <stop offset="100%" stopColor="#080919" />
          </linearGradient>
          <radialGradient id={`glow-${uid}`} cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor={p.accent} stopOpacity="0.42" />
            <stop offset="55%" stopColor={p.secondary} stopOpacity="0.16" />
            <stop offset="100%" stopColor={p.bg1} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`beam-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.warm} stopOpacity="0.45" />
            <stop offset="100%" stopColor={p.accent} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`floor-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16193b" />
            <stop offset="100%" stopColor="#070815" />
          </linearGradient>
        </defs>

        <rect width="800" height="500" fill={`url(#sky-${uid})`} />
        <rect width="800" height="500" fill={`url(#glow-${uid})`} />

        {angle === 'interior' && (
          <>
            {/* Ceiling arches / acoustic ribs */}
            <path
              d="M 40 160 Q 400 -20 760 160"
              fill="none"
              stroke={p.accent}
              strokeOpacity="0.28"
              strokeWidth="2"
            />
            <path
              d="M 100 185 Q 400 20 700 185"
              fill="none"
              stroke={p.secondary}
              strokeOpacity="0.25"
              strokeWidth="1.5"
            />
            {/* Stage Spotlight Beams */}
            <polygon points="240,0 130,360 340,360" fill={`url(#beam-${uid})`} />
            <polygon points="560,0 460,360 670,360" fill={`url(#beam-${uid})`} />
            <polygon points="400,0 260,375 540,375" fill={`url(#beam-${uid})`} />

            {/* Architectural Hall Columns */}
            {[95, 195, 605, 705].map((x) => (
              <g key={x}>
                <rect x={x} y="90" width="22" height="270" fill="#141738" stroke={p.accent} strokeOpacity="0.2" />
                <rect x={x + 6} y="100" width="2" height="250" fill={p.accent} fillOpacity="0.35" />
              </g>
            ))}

            {/* Stage Platform & Backdrop */}
            <rect x="235" y="255" width="330" height="90" rx="4" fill="#101331" stroke={p.secondary} strokeOpacity="0.35" />
            <rect x="260" y="270" width="280" height="58" rx="2" fill="#090b20" stroke={p.accent} strokeOpacity="0.45" />
            <ellipse cx="400" cy="355" rx="210" ry="20" fill="#1d214d" stroke={p.accent} strokeOpacity="0.4" />

            {/* Reflective Stage Floor */}
            <rect x="0" y="355" width="800" height="145" fill={`url(#floor-${uid})`} />
            <ellipse cx="400" cy="400" rx="260" ry="38" fill={p.accent} fillOpacity="0.1" />

            {/* Banquet / Auditorium Seating Silhouettes */}
            {[170, 260, 350, 450, 540, 630].map((cx, i) => (
              <g key={cx} opacity={0.85}>
                <ellipse cx={cx} cy={415 + (i % 2) * 14} rx="24" ry="8" fill="#191d45" stroke={p.accent} strokeOpacity="0.3" />
                <circle cx={cx} cy={407 + (i % 2) * 14} r="3" fill={p.warm} fillOpacity="0.8" />
              </g>
            ))}

            {/* Chandelier / Rig Halo */}
            <ellipse cx="400" cy="95" rx="115" ry="18" fill="none" stroke={p.accent} strokeWidth="2.5" strokeOpacity="0.8" />
            <ellipse cx="400" cy="95" rx="75" ry="10" fill="none" stroke={p.warm} strokeWidth="1.5" strokeOpacity="0.7" />
          </>
        )}

        {angle === 'exterior' && (
          <>
            {/* Horizon City Silhouette */}
            <rect x="0" y="295" width="800" height="205" fill="#090b1d" />
            {[40, 110, 610, 690].map((x, idx) => (
              <rect
                key={x}
                x={x}
                y={195 + idx * 12}
                width="65"
                height="130"
                fill="#111433"
                stroke="#ffffff"
                strokeOpacity="0.06"
              />
            ))}
            {/* Architectural Glass & Bronze Pavilion Facade */}
            <polygon points="150,335 190,155 610,155 650,335" fill="#13183d" stroke={p.accent} strokeOpacity="0.45" strokeWidth="2" />
            <rect x="195" y="175" width="410" height="160" fill="#181e4a" />
            {/* Glowing Glass Bays */}
            {[215, 295, 375, 455, 535].map((x) => (
              <g key={x}>
                <rect x={x} y="190" width="58" height="138" rx="3" fill={p.warm} fillOpacity="0.22" stroke={p.accent} strokeOpacity="0.55" />
                <line x1={x + 29} y1="190" x2={x + 29} y2="328" stroke="#0a0b1e" strokeOpacity="0.5" strokeWidth="2" />
              </g>
            ))}
            {/* Cantilevered Roof Canopy */}
            <polygon points="130,170 670,170 640,145 160,145" fill="#1f2556" stroke={p.accent} strokeOpacity="0.7" />
            {/* Arrival Reflecting Pool & Plaza */}
            <rect x="0" y="335" width="800" height="165" fill={`url(#floor-${uid})`} />
            <polygon points="220,365 580,365 650,475 150,475" fill="#0d1736" stroke={p.secondary} strokeOpacity="0.35" />
            <ellipse cx="400" cy="410" rx="150" ry="18" fill={p.accent} fillOpacity="0.16" />
          </>
        )}

        {angle === 'surroundings' && (
          <>
            {/* Aerial / Courtyard Surroundings */}
            <rect x="0" y="250" width="800" height="250" fill="#0b1229" />
            {/* Landscaped Palm / Botanical Clusters */}
            {[110, 165, 635, 690].map((x, idx) => (
              <g key={x}>
                <circle cx={x} cy={270 + (idx % 2) * 20} r="46" fill="#132c3d" stroke={p.secondary} strokeOpacity="0.35" />
                <circle cx={x - 10} cy={262 + (idx % 2) * 20} r="28" fill="#193d4f" />
              </g>
            ))}
            {/* Stone Promenade & Valet Drive */}
            <path d="M 0 390 Q 400 320 800 390 L 800 500 L 0 500 Z" fill="#141838" stroke={p.accent} strokeOpacity="0.3" />
            <path d="M 140 345 L 660 345 L 610 185 L 190 185 Z" fill="#161b42" stroke={p.accent} strokeOpacity="0.45" />
            {/* Illuminated Courtyard Ring */}
            <ellipse cx="400" cy="395" rx="185" ry="44" fill="none" stroke={p.accent} strokeWidth="2" strokeOpacity="0.55" />
            <circle cx="400" cy="395" r="14" fill={p.accent} fillOpacity="0.85" />
            {/* Ambient Sky Stars */}
            {[80, 180, 310, 490, 620, 730].map((x, i) => (
              <circle key={x} cx={x} cy={55 + (i * 19) % 70} r="1.5" fill="#ffffff" fillOpacity="0.55" />
            ))}
          </>
        )}
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0b1e]/75 via-transparent to-transparent"
      />
    </div>
  );
};

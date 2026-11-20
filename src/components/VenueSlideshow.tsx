import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Images,
  Maximize2,
  Pause,
  Play,
  X,
} from 'lucide-react';
import type { VenuePhoto, VenueVisualTheme } from '../types/venuza';
import { VenueVisual } from './VenueVisual';

interface VenueSlideshowProps {
  photos: VenuePhoto[];
  theme: VenueVisualTheme;
  venueName: string;
  variant?: 'detail' | 'card';
  initialIndex?: number;
  className?: string;
}

const SLIDE_INTERVAL_MS = 5500;
const FORMAL_EASE = [0.22, 1, 0.36, 1] as const;

export const VenueSlideshow: React.FC<VenueSlideshowProps> = ({
  photos,
  theme,
  venueName,
  variant = 'detail',
  initialIndex = 0,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const safePhotos = photos.length > 0
    ? photos
    : [
        {
          id: 'fallback-interior',
          url: `preset:${theme}:interior`,
          angle: 'interior' as const,
          caption: `${venueName} — Main Event Hall`,
        },
      ];

  const isMulti = safePhotos.length > 1;
  const [index, setIndex] = useState<number>(() =>
    Math.min(Math.max(0, initialIndex), safePhotos.length - 1),
  );
  const [direction, setDirection] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(variant === 'detail');
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  // Clamp index if photo array shrinks
  useEffect(() => {
    if (index >= safePhotos.length) {
      setIndex(0);
    }
  }, [index, safePhotos.length]);

  const goTo = useCallback(
    (nextIndex: number, dir?: number) => {
      if (!isMulti) return;
      const wrapped = ((nextIndex % safePhotos.length) + safePhotos.length) % safePhotos.length;
      setDirection(dir ?? (nextIndex >= index ? 1 : -1));
      setIndex(wrapped);
    },
    [index, isMulti, safePhotos.length],
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      goTo(index + 1, 1);
    },
    [goTo, index],
  );

  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      goTo(index - 1, -1);
    },
    [goTo, index],
  );

  // Auto-advance timer in formal detail mode (or when card is hovered)
  const shouldAutoAdvance =
    isMulti &&
    !prefersReducedMotion &&
    ((variant === 'detail' && isPlaying && !isHovered && !lightboxOpen) ||
      (variant === 'card' && isHovered));

  useEffect(() => {
    if (!shouldAutoAdvance) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % safePhotos.length);
    }, variant === 'card' ? 3200 : SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [shouldAutoAdvance, safePhotos.length, variant]);

  // Keyboard support inside lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, handleNext, handlePrev]);

  const activePhoto = safePhotos[index] || safePhotos[0];
  const slideVariants = {
    enter: (dir: number) =>
      prefersReducedMotion
        ? { opacity: 0 }
        : {
            opacity: 0,
            x: dir > 0 ? 44 : -44,
            scale: 1.035,
          },
    center: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: prefersReducedMotion
        ? { duration: 0.2 }
        : {
            opacity: { duration: 0.5, ease: FORMAL_EASE },
            x: { duration: 0.65, ease: FORMAL_EASE },
            scale: { duration: 0.8, ease: FORMAL_EASE },
          },
    },
    exit: (dir: number) =>
      prefersReducedMotion
        ? { opacity: 0 }
        : {
            opacity: 0,
            x: dir > 0 ? -44 : 44,
            scale: 0.985,
            transition: { duration: 0.45, ease: FORMAL_EASE },
          },
  };

  // ============================================================================
  // CARD VARIANT (Compact Discovery Grid Slideshow / Single Preview)
  // ============================================================================
  if (variant === 'card') {
    return (
      <div
        className={`relative overflow-hidden bg-[#0B0F19] ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activePhoto.id || index}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 h-full w-full"
          >
            <VenueVisual
              src={activePhoto.url}
              theme={theme}
              angle={activePhoto.angle}
              venueName={venueName}
              className="h-full w-full"
            />
          </motion.div>
        </AnimatePresence>

        {/* Top-Right Photo Count / Slideshow Indicator */}
        {isMulti && (
          <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0F19]/85 px-2.5 py-1 text-[11px] font-medium text-white">
            <Images className="h-3 w-3 text-[#F59E0B]" />
            <span className="font-mono-num">
              {String(index + 1).padStart(2, '0')}/{String(safePhotos.length).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Interactive Left / Right Arrows + Segmented Progress on Multi-Photo Cards */}
        {isMulti && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label={`Previous photo of ${venueName}`}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#0B0F19]/80 text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={`Next photo of ${venueName}`}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#0B0F19]/80 text-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:border-[#F59E0B] hover:text-[#F59E0B] transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between gap-2">
              <span className="truncate rounded-md bg-[#0B0F19]/80 px-2 py-0.5 text-[10px] font-medium capitalize text-[#FBBF24] border border-white/10">
                {activePhoto.angle}
              </span>
              <div className="flex items-center gap-1">
                {safePhotos.map((photo, idx) => (
                  <button
                    key={photo.id || idx}
                    type="button"
                    aria-label={`View slide ${idx + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      goTo(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === index
                        ? 'w-5 bg-[#F59E0B]'
                        : 'w-1.5 bg-white/40 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ============================================================================
  // DETAIL VARIANT (Single Showcase Frame OR Formally Animated Slideshow)
  // ============================================================================
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#121432] overflow-hidden ${className}`}>
      {/* Primary Stage Frame */}
      <div
        tabIndex={isMulti ? 0 : undefined}
        onKeyDown={(e) => {
          if (!isMulti) return;
          if (e.key === 'ArrowRight') handleNext();
          else if (e.key === 'ArrowLeft') handlePrev();
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-roledescription={isMulti ? 'carousel' : undefined}
        aria-label={`${venueName} photography showcase`}
        className="relative h-64 sm:h-96 w-full overflow-hidden bg-[#0B0F19] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]"
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={activePhoto.id || index}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag={isMulti ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_event, info) => {
              if (!isMulti) return;
              if (info.offset.x < -50) handleNext();
              else if (info.offset.x > 50) handlePrev();
            }}
            className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
          >
            <VenueVisual
              src={activePhoto.url}
              theme={theme}
              angle={activePhoto.angle}
              venueName={venueName}
              className="h-full w-full"
            />
          </motion.div>
        </AnimatePresence>

        {/* Top Formal Metadata & Controls Bar */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-[#0B0F19]/85 via-[#0B0F19]/40 to-transparent p-3.5 sm:p-4">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0B0F19]/85 px-3 py-1.5 text-xs">
            {isMulti && (
              <>
                <span className="font-mono-num font-bold text-[#F59E0B]">
                  {String(index + 1).padStart(2, '0')} / {String(safePhotos.length).padStart(2, '0')}
                </span>
                <span className="text-white/30" aria-hidden="true">
                  |
                </span>
              </>
            )}
            <span className="capitalize font-medium text-white">{activePhoto.angle}</span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            {isMulti && !prefersReducedMotion && (
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
                className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0B0F19]/85 px-2.5 text-xs font-medium text-white hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Autoplay'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="Expand gallery view"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-white/15 bg-[#0B0F19]/85 text-white hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Left / Right Formal Navigation Arrows (Multi-Photo Only) */}
        {isMulti && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/20 bg-[#0B0F19]/85 text-white hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors shadow-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/20 bg-[#0B0F19]/85 text-white hover:border-[#F59E0B] hover:text-[#F59E0B] transition-colors shadow-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Bottom Architectural Caption + Animated Gold Progress Bar */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#0B0F19]/95 via-[#0B0F19]/65 to-transparent px-4 pt-8 pb-3.5">
          <div className="flex items-end justify-between gap-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={activePhoto.caption || activePhoto.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: FORMAL_EASE }}
                className="font-display text-sm sm:text-base font-semibold text-white"
              >
                {activePhoto.caption || `${venueName} — ${activePhoto.angle}`}
              </motion.p>
            </AnimatePresence>

            {isMulti && (
              <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
                {safePhotos.map((p, idx) => (
                  <button
                    key={p.id || idx}
                    type="button"
                    aria-label={`Jump to slide ${idx + 1}`}
                    onClick={() => goTo(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === index ? 'w-6 bg-[#F59E0B]' : 'w-2 bg-white/35 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Animated Autoplay Progress Line */}
          {shouldAutoAdvance && (
            <div className="mt-2.5 h-[2px] w-full overflow-hidden rounded-full bg-white/15">
              <motion.div
                key={`progress-${index}-${isPlaying}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: SLIDE_INTERVAL_MS / 1000, ease: 'linear' }}
                style={{ transformOrigin: 'left center' }}
                className="h-full w-full bg-[#F59E0B]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Formal Thumbnail Filmstrip (Only shown when 2 or more pictures exist) */}
      {isMulti && (
        <div className="border-t border-white/10 bg-[#0d0f27] p-3">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-0.5">
            {safePhotos.map((photo, idx) => {
              const active = idx === index;
              return (
                <button
                  key={photo.id || idx}
                  type="button"
                  onClick={() => goTo(idx)}
                  aria-label={`Select photo ${idx + 1}: ${photo.caption || photo.angle}`}
                  className={`group relative shrink-0 w-24 sm:w-28 rounded-xl overflow-hidden border transition-all text-left ${
                    active
                      ? 'border-[#F59E0B] ring-1 ring-[#F59E0B]/60'
                      : 'border-white/10 opacity-70 hover:opacity-100 hover:border-white/30'
                  }`}
                >
                  <VenueVisual
                    src={photo.url}
                    theme={theme}
                    angle={photo.angle}
                    venueName={venueName}
                    className="h-14 w-full"
                  />
                  <div className="bg-[#0B0F19]/95 px-2 py-1 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-medium capitalize text-[#c5cae3] truncate">
                      {photo.angle}
                    </span>
                    <span
                      className={`font-mono-num text-[10px] ${
                        active ? 'text-[#F59E0B] font-bold' : 'text-[#848ab0]'
                      }`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Formal Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${venueName} full gallery`}
            className="fixed inset-0 z-50 flex flex-col justify-between bg-[#060811]/95 p-4 sm:p-8"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F59E0B]">
                  {venueName}
                </p>
                <p className="text-sm font-medium text-white mt-0.5">
                  {activePhoto.caption || `${venueName} — ${activePhoto.angle}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isMulti && (
                  <span className="font-mono-num text-xs text-[#c5cae3]">
                    {String(index + 1).padStart(2, '0')} / {String(safePhotos.length).padStart(2, '0')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Close fullscreen gallery"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white hover:border-[#F59E0B] hover:text-[#F59E0B]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative my-4 flex-1 flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F19]">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={`lb-${activePhoto.id || index}`}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="h-full w-full"
                >
                  <VenueVisual
                    src={activePhoto.url}
                    theme={theme}
                    angle={activePhoto.angle}
                    venueName={venueName}
                    className="h-full w-full"
                  />
                </motion.div>
              </AnimatePresence>

              {isMulti && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous photo"
                    className="absolute left-4 top-1/2 -translate-y-1/2 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full border border-white/20 bg-[#0B0F19]/85 text-white hover:border-[#F59E0B] hover:text-[#F59E0B]"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next photo"
                    className="absolute right-4 top-1/2 -translate-y-1/2 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full border border-white/20 bg-[#0B0F19]/85 text-white hover:border-[#F59E0B] hover:text-[#F59E0B]"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {isMulti && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
                {safePhotos.map((p, idx) => (
                  <button
                    key={`lb-thumb-${p.id || idx}`}
                    type="button"
                    onClick={() => goTo(idx)}
                    className={`h-14 w-20 shrink-0 rounded-lg overflow-hidden border transition-all ${
                      idx === index
                        ? 'border-[#F59E0B] ring-1 ring-[#F59E0B]'
                        : 'border-white/15 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <VenueVisual
                      src={p.url}
                      theme={theme}
                      angle={p.angle}
                      venueName={venueName}
                      className="h-full w-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

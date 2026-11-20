import type { Venue, VenueImages, VenuePhoto } from '../types/venuza';

const DEFAULT_CAPTIONS: Record<'interior' | 'exterior' | 'surroundings', string> = {
  interior: 'Main Event Hall & Stage Perspective',
  exterior: 'Grand Architectural Facade & Arrival',
  surroundings: 'Courtyard Grounds & Surrounding Precinct',
};

export function normalizeVenuePhotos(venue: Pick<Venue, 'name' | 'images'>): VenuePhoto[] {
  if (Array.isArray(venue.images?.gallery) && venue.images.gallery.length > 0) {
    return venue.images.gallery.filter((p) => Boolean(p?.url));
  }

  const list: VenuePhoto[] = [];
  const angles: Array<'interior' | 'exterior' | 'surroundings'> = [
    'interior',
    'exterior',
    'surroundings',
  ];

  for (const angle of angles) {
    const url = venue.images?.[angle];
    if (url && !list.some((item) => item.url === url)) {
      list.push({
        id: `${angle}-default`,
        url,
        angle,
        caption: `${venue.name} — ${DEFAULT_CAPTIONS[angle]}`,
      });
    }
  }

  return list;
}

export function buildVenueImagesFromPhotos(
  photos: VenuePhoto[],
  fallbackTheme: string,
): VenueImages {
  const clean = photos.filter((p) => Boolean(p.url));
  const firstInterior = clean.find((p) => p.angle === 'interior')?.url || clean[0]?.url;
  const firstExterior =
    clean.find((p) => p.angle === 'exterior')?.url || clean[1]?.url || firstInterior;
  const firstSurroundings =
    clean.find((p) => p.angle === 'surroundings')?.url ||
    clean[2]?.url ||
    firstExterior ||
    firstInterior;

  return {
    interior: firstInterior || `preset:${fallbackTheme}:interior`,
    exterior: firstExterior || `preset:${fallbackTheme}:exterior`,
    surroundings: firstSurroundings || `preset:${fallbackTheme}:surroundings`,
    gallery: clean,
  };
}

export function readAndCompressImageFile(file: File, maxDimension = 1440): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        reject(new Error(`Empty image data for ${file.name}`));
        return;
      }

      // Skip canvas re-encoding for SVGs or small images under 350KB
      if (file.type === 'image/svg+xml' || dataUrl.length < 480_000) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.84));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

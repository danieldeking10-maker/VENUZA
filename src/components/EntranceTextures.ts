import * as THREE from 'three';

export interface PbrTextureSet {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  anisotropy = 4,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

// Deterministic pseudo-random helper for repeatable architectural textures
function seededNoise(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Real-life Ashlar Slate / Granite Plaza Pavers with Mortar Seams & Damp Rain Sheen Patches
 */
export function createPlazaStoneTextures(repeat = 9): PbrTextureSet {
  const size = 512;
  const rand = seededNoise(4021);

  const [colorC, colorCtx] = makeCanvas(size);
  const [roughC, roughCtx] = makeCanvas(size);
  const [bumpC, bumpCtx] = makeCanvas(size);

  // Base slate stone
  colorCtx.fillStyle = '#181e2c';
  colorCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#8c8c8c'; // ~0.55 base roughness
  roughCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#b0b0b0';
  bumpCtx.fillRect(0, 0, size, size);

  const rows = 4;
  const cols = 4;
  const rowH = size / rows;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    const rowOffset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + rowOffset;
      const y = r * rowH;
      const toneShift = Math.floor((rand() - 0.5) * 14);
      const baseR = 24 + toneShift;
      const baseG = 30 + toneShift;
      const baseB = 44 + Math.floor(toneShift * 1.15);

      colorCtx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
      colorCtx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      const slabRough = 115 + Math.floor(rand() * 55);
      roughCtx.fillStyle = `rgb(${slabRough},${slabRough},${slabRough})`;
      roughCtx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      const slabBump = 175 + Math.floor(rand() * 35);
      bumpCtx.fillStyle = `rgb(${slabBump},${slabBump},${slabBump})`;
      bumpCtx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

      // Mortar joints
      colorCtx.strokeStyle = '#0c1018';
      colorCtx.lineWidth = 4;
      colorCtx.strokeRect(x, y, colW, rowH);

      roughCtx.strokeStyle = '#e0e0e0';
      roughCtx.lineWidth = 4;
      roughCtx.strokeRect(x, y, colW, rowH);

      bumpCtx.strokeStyle = '#383838';
      bumpCtx.lineWidth = 4;
      bumpCtx.strokeRect(x, y, colW, rowH);
    }
  }

  // Fine stone grain speckles
  for (let i = 0; i < 4500; i++) {
    const gx = rand() * size;
    const gy = rand() * size;
    const bright = rand() > 0.5;
    colorCtx.fillStyle = bright ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.08)';
    colorCtx.fillRect(gx, gy, 2, 2);
    bumpCtx.fillStyle = bright ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    bumpCtx.fillRect(gx, gy, 2, 2);
  }

  // Realistic evening rainwater sheen / damp patches (lower roughness, slightly darker stone)
  for (let p = 0; p < 5; p++) {
    const px = rand() * size;
    const py = rand() * size;
    const pr = 55 + rand() * 85;
    const rGrad = roughCtx.createRadialGradient(px, py, 6, px, py, pr);
    rGrad.addColorStop(0, 'rgba(20, 20, 20, 0.85)'); // Glossy damp puddle
    rGrad.addColorStop(0.65, 'rgba(45, 45, 45, 0.45)');
    rGrad.addColorStop(1, 'rgba(140, 140, 140, 0)');
    roughCtx.fillStyle = rGrad;
    roughCtx.beginPath();
    roughCtx.arc(px, py, pr, 0, Math.PI * 2);
    roughCtx.fill();

    const cGrad = colorCtx.createRadialGradient(px, py, 6, px, py, pr);
    cGrad.addColorStop(0, 'rgba(6, 9, 15, 0.42)');
    cGrad.addColorStop(1, 'rgba(6, 9, 15, 0)');
    colorCtx.fillStyle = cGrad;
    colorCtx.beginPath();
    colorCtx.arc(px, py, pr, 0, Math.PI * 2);
    colorCtx.fill();
  }

  const map = configureTexture(colorC, true, repeat, repeat);
  const roughnessMap = configureTexture(roughC, false, repeat, repeat);
  const bumpMap = configureTexture(bumpC, false, repeat, repeat);

  return {
    map,
    roughnessMap,
    bumpMap,
    dispose: () => {
      map.dispose();
      roughnessMap.dispose();
      bumpMap.dispose();
    },
  };
}

/**
 * Veined Dark Architectural Marble for Foyer Floor, Columns & Stone Facade
 */
export function createMarbleTextures(
  baseHex = '#141926',
  veinRgba = 'rgba(235, 195, 118, 0.24)',
  repeatX = 2,
  repeatY = 2,
): PbrTextureSet {
  const size = 512;
  const rand = seededNoise(8812);

  const [colorC, colorCtx] = makeCanvas(size);
  const [roughC, roughCtx] = makeCanvas(size);
  const [bumpC, bumpCtx] = makeCanvas(size);

  colorCtx.fillStyle = baseHex;
  colorCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = '#363636'; // Polished stone (~0.21 roughness)
  roughCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#888888';
  bumpCtx.fillRect(0, 0, size, size);

  // Clouded mineral depth
  for (let i = 0; i < 18; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 60 + rand() * 110;
    const g = colorCtx.createRadialGradient(cx, cy, 4, cx, cy, r);
    g.addColorStop(0, rand() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    colorCtx.fillStyle = g;
    colorCtx.fillRect(0, 0, size, size);
  }

  // Organic calcite/gold veins
  for (let v = 0; v < 14; v++) {
    let x = rand() * size;
    let y = rand() * size;
    colorCtx.beginPath();
    colorCtx.moveTo(x, y);
    roughCtx.beginPath();
    roughCtx.moveTo(x, y);
    bumpCtx.beginPath();
    bumpCtx.moveTo(x, y);

    const steps = 16;
    const angleBase = rand() * Math.PI * 2;
    for (let s = 0; s < steps; s++) {
      const a = angleBase + (rand() - 0.5) * 1.1;
      x += Math.cos(a) * 28;
      y += Math.sin(a) * 28;
      colorCtx.lineTo(x, y);
      roughCtx.lineTo(x, y);
      bumpCtx.lineTo(x, y);
    }

    const w = 0.8 + rand() * 2.1;
    colorCtx.strokeStyle = veinRgba;
    colorCtx.lineWidth = w;
    colorCtx.stroke();

    roughCtx.strokeStyle = 'rgba(95,95,95,0.45)';
    roughCtx.lineWidth = w;
    roughCtx.stroke();

    bumpCtx.strokeStyle = 'rgba(110,110,110,0.4)';
    bumpCtx.lineWidth = w;
    bumpCtx.stroke();
  }

  const map = configureTexture(colorC, true, repeatX, repeatY);
  const roughnessMap = configureTexture(roughC, false, repeatX, repeatY);
  const bumpMap = configureTexture(bumpC, false, repeatX, repeatY);

  return {
    map,
    roughnessMap,
    bumpMap,
    dispose: () => {
      map.dispose();
      roughnessMap.dispose();
      bumpMap.dispose();
    },
  };
}

/**
 * Woven Ceremonial Carpet Texture with Gold Border Trim
 */
export function createCarpetTextures(repeatY = 3): PbrTextureSet {
  const size = 256;
  const rand = seededNoise(992);

  const [colorC, colorCtx] = makeCanvas(size);
  const [roughC, roughCtx] = makeCanvas(size);
  const [bumpC, bumpCtx] = makeCanvas(size);

  colorCtx.fillStyle = '#581227';
  colorCtx.fillRect(0, 0, size, size);

  // Subtle double gold woven borders along left & right edges
  colorCtx.fillStyle = '#d49a33';
  colorCtx.fillRect(8, 0, 5, size);
  colorCtx.fillRect(17, 0, 2, size);
  colorCtx.fillRect(size - 13, 0, 5, size);
  colorCtx.fillRect(size - 19, 0, 2, size);

  roughCtx.fillStyle = '#d8d8d8'; // Soft velvet/wool diffuse roughness
  roughCtx.fillRect(0, 0, size, size);
  bumpCtx.fillStyle = '#808080';
  bumpCtx.fillRect(0, 0, size, size);

  // Fine fabric weave micro-fibers
  for (let i = 0; i < 4000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    colorCtx.fillStyle = rand() > 0.5 ? 'rgba(255,220,230,0.04)' : 'rgba(20,0,8,0.12)';
    colorCtx.fillRect(x, y, 2, 1);
    bumpCtx.fillStyle = rand() > 0.5 ? 'rgba(220,220,220,0.22)' : 'rgba(50,50,50,0.22)';
    bumpCtx.fillRect(x, y, 2, 1);
  }

  const map = configureTexture(colorC, true, 1, repeatY);
  const roughnessMap = configureTexture(roughC, false, 1, repeatY);
  const bumpMap = configureTexture(bumpC, false, 1, repeatY);

  return {
    map,
    roughnessMap,
    bumpMap,
    dispose: () => {
      map.dispose();
      roughnessMap.dispose();
      bumpMap.dispose();
    },
  };
}

/**
 * Realistic Warm Architectural Curtain-Wall Glass Interior Reflection/Depth Texture
 */
export function createCurtainWallTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Deep interior ambient base
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0e1628');
  bg.addColorStop(0.35, '#2b2114');
  bg.addColorStop(0.75, '#473013');
  bg.addColorStop(1, '#121521');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Warm interior mezzanine ceiling cove glow
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.28, 12, w * 0.5, h * 0.36, 170);
  glow.addColorStop(0, 'rgba(255, 224, 150, 0.72)');
  glow.addColorStop(0.45, 'rgba(245, 158, 11, 0.35)');
  glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Interior mezzanine floor slab & railing silhouette
  ctx.fillStyle = 'rgba(10, 14, 24, 0.85)';
  ctx.fillRect(0, h * 0.48, w, 18);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.32)';
  ctx.fillRect(0, h * 0.45, w, 3);

  // Interior vertical structural fins
  ctx.fillStyle = 'rgba(10, 13, 22, 0.65)';
  ctx.fillRect(w * 0.22, 0, 10, h);
  ctx.fillRect(w * 0.74, 0, 10, h);

  // Subtle exterior sky reflection sheen across glass
  const refl = ctx.createLinearGradient(0, 0, w, h);
  refl.addColorStop(0, 'rgba(148, 179, 255, 0.14)');
  refl.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
  refl.addColorStop(1, 'rgba(124, 92, 255, 0.08)');
  ctx.fillStyle = refl;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Architectural "VENUZA" Illuminated Channel-Letter Marquee Sign Texture
 */
export function createMarqueeSignTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);

  // Subtle warm halo behind letters
  const halo = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 420);
  halo.addColorStop(0, 'rgba(245, 158, 11, 0.24)');
  halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 112px "Outfit", system-ui, sans-serif';
  ctx.shadowColor = 'rgba(251, 191, 36, 0.85)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#FEF3C7';
  ctx.fillText('V E N U Z A', w / 2, h / 2 - 8);

  ctx.shadowBlur = 8;
  ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillStyle = '#F59E0B';
  ctx.fillText('GRAND EVENT PAVILION', w / 2, h / 2 + 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Distant Night City Skyline Silhouette Texture with Warm Office/Hotel Windows
 */
export function createCitySkylineTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const rand = seededNoise(5150);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, w, h);

  let x = 0;
  while (x < w) {
    const bw = 28 + Math.floor(rand() * 48);
    const bh = 65 + Math.floor(rand() * 175);
    const by = h - bh;

    ctx.fillStyle = '#090d18';
    ctx.fillRect(x, by, bw - 2, bh);

    // Subtle rooftop accent beacon or crown
    if (bh > 175 && rand() > 0.45) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.fillRect(x + bw * 0.5 - 2, by - 5, 4, 4);
    }

    // Lit architectural windows
    for (let wy = by + 10; wy < h - 14; wy += 12) {
      for (let wx = x + 6; wx < x + bw - 9; wx += 9) {
        if (rand() > 0.62) {
          ctx.fillStyle =
            rand() > 0.25 ? 'rgba(253, 224, 155, 0.55)' : 'rgba(165, 180, 252, 0.35)';
          ctx.fillRect(wx, wy, 4, 5);
        }
      }
    }
    x += bw;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Realistic Soft Radial Contact Shadow / Light Pool Texture
 */
export function createRadialGlowTexture(innerRgba: string, outerRgba: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  g.addColorStop(0, innerRgba);
  g.addColorStop(1, outerRgba);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

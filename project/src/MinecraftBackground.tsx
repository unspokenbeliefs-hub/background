import { useEffect, useRef } from 'react';

interface Firefly {
  x: number; y: number;
  baseX: number; baseY: number;
  vx: number; vy: number;
  opacity: number; opDir: number;
  size: number; phase: number;
}

// All tree definitions – varied height, type, block size, position
type TreeType = 'oak' | 'birch' | 'spruce' | 'darkoak';

interface TreeDef {
  xf: number;
  type: TreeType;
  trunkH: number;
  canopyR: number;
  bp: number;
  swayAmp: number;
  swayPhase: number;
}

const TREES: TreeDef[] = [
  { xf: 0.02,  type: 'spruce',  trunkH: 13, canopyR: 2, bp: 13, swayAmp: 1.2, swayPhase: 0.0 },
  { xf: 0.10,  type: 'birch',   trunkH: 9,  canopyR: 2, bp: 14, swayAmp: 2.0, swayPhase: 1.1 },
  { xf: 0.19,  type: 'oak',     trunkH: 6,  canopyR: 3, bp: 20, swayAmp: 1.4, swayPhase: 2.5 },
  { xf: 0.30,  type: 'darkoak', trunkH: 5,  canopyR: 3, bp: 22, swayAmp: 0.9, swayPhase: 0.7 },
  { xf: 0.41,  type: 'spruce',  trunkH: 16, canopyR: 2, bp: 14, swayAmp: 0.7, swayPhase: 1.9 },
  { xf: 0.50,  type: 'oak',     trunkH: 7,  canopyR: 4, bp: 22, swayAmp: 1.0, swayPhase: 3.3 },
  { xf: 0.60,  type: 'birch',   trunkH: 10, canopyR: 2, bp: 13, swayAmp: 1.9, swayPhase: 0.4 },
  { xf: 0.69,  type: 'darkoak', trunkH: 6,  canopyR: 4, bp: 24, swayAmp: 0.8, swayPhase: 2.2 },
  { xf: 0.79,  type: 'oak',     trunkH: 7,  canopyR: 3, bp: 18, swayAmp: 1.5, swayPhase: 1.5 },
  { xf: 0.88,  type: 'spruce',  trunkH: 14, canopyR: 2, bp: 12, swayAmp: 1.1, swayPhase: 0.8 },
  { xf: 0.96,  type: 'birch',   trunkH: 8,  canopyR: 2, bp: 13, swayAmp: 2.3, swayPhase: 3.0 },
];

// ── Seeded pseudo-random for deterministic textures ───────────────────────────
function hash(n: number): number {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function hash2(n: number, m: number): number {
  return hash(n * 73.3 + m * 29.7 + 5.1);
}
function hashRange(n: number, min: number, max: number): number {
  return min + hash(n) * (max - min);
}
function hashRange2(n: number, m: number, min: number, max: number): number {
  return min + hash2(n, m) * (max - min);
}

// ── Draw helpers ─────────────────────────────────────────────────────────────

function block(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  base: string, hi: string, lo: string
) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = hi;
  ctx.fillRect(x, y, w, Math.max(2, h * 0.15));
  ctx.fillStyle = lo;
  ctx.fillRect(x, y + h - Math.max(2, h * 0.15), w, Math.max(2, h * 0.15));
  ctx.fillRect(x, y, Math.max(2, w * 0.12), h);
}

function drawBarkTexture(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  baseColor: string, darkColor: string,
  seed: number
) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = darkColor;
  const grooveCount = Math.max(2, Math.floor(w / 4));
  for (let i = 0; i < grooveCount; i++) {
    const s = seed + i * 17.3;
    const gx = x + hashRange(s, 0, w);
    const gw = hashRange(s + 1, 1, 2.5);
    const gh = hashRange(s + 2, h * 0.2, h * 0.8);
    const gy = y + hashRange(s + 3, 0, h - gh);
    ctx.fillRect(gx, gy, gw, gh);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y, w, Math.max(2, h * 0.12));
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x, y + h - Math.max(2, h * 0.15), w, Math.max(2, h * 0.15));
  ctx.fillRect(x, y, Math.max(2, w * 0.10), h);
}

function drawBirchTexture(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  isDark: boolean,
  seed: number
) {
  const base = isDark ? '#b0b0a0' : '#e8e4d8';
  const shadow = isDark ? '#6e6e60' : '#a8a498';
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = shadow;
  const ringY = y + hashRange(seed, 0, h * 0.7);
  ctx.fillRect(x, ringY, w, Math.max(1, h * 0.08));
  ctx.fillRect(x + w * 0.1, ringY + hashRange(seed + 1, 0, 6), w * 0.3, Math.max(1, h * 0.05));

  ctx.fillStyle = '#5a5548';
  const knotSize = hashRange(seed + 2, 1, 3);
  ctx.fillRect(x + hashRange(seed + 3, 0, w * 0.8), y + hashRange(seed + 4, 0, h * 0.8), knotSize, knotSize);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, w, Math.max(1, h * 0.08));
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x, y + h - Math.max(1, h * 0.12), w, Math.max(1, h * 0.12));
  ctx.fillRect(x, y, Math.max(1, w * 0.08), h);
}

function drawLeafBlock(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  base: string, hi: string, lo: string,
  sway: number, depth: number,
  seed: number
) {
  const sx = Math.round(x + sway * depth);
  const sy = Math.round(y);
  const s = Math.round(size);

  ctx.fillStyle = base;
  ctx.fillRect(sx, sy, s, s);

  ctx.fillStyle = hi;
  ctx.fillRect(sx, sy, s, Math.max(2, s * 0.18));
  ctx.fillStyle = lo;
  ctx.fillRect(sx, sy + s - Math.max(2, s * 0.22), s, Math.max(2, s * 0.22));
  ctx.fillRect(sx, sy, Math.max(2, s * 0.14), s);

  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(sx + s * 0.3, sy + s * 0.3, Math.max(1, s * 0.12), Math.max(1, s * 0.12));
  ctx.fillRect(sx + s * 0.6, sy + s * 0.5, Math.max(1, s * 0.08), Math.max(1, s * 0.08));

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(sx + s * 0.2, sy + s * 0.2, s * 0.6, 1);
}

// ── Tree draw functions ───────────────────────────────────────────────────────

function drawOak(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, trunkH: number, canopyR: number, bp: number, sway: number,
  seed: number
) {
  const tx = Math.round(cx - bp / 2);

  for (let i = 0; i < trunkH; i++) {
    drawBarkTexture(ctx, tx, groundY - (i + 1) * bp, bp, bp, '#6b3d11', '#3d2008', seed + i * 3.1);
  }

  if (trunkH > 5) {
    const branchY = groundY - (trunkH - 1) * bp;
    const dir = cx > window.innerWidth * 0.5 ? -1 : 1;
    ctx.fillStyle = '#5a3310';
    ctx.fillRect(cx + dir * bp * 0.3, branchY, dir * bp * 0.8, bp * 0.3);
    ctx.fillStyle = '#4a2a0a';
    ctx.fillRect(cx + dir * bp * 0.5, branchY - bp * 0.3, dir * bp * 0.5, bp * 0.3);
  }

  const topY = groundY - trunkH * bp;
  const layerDefs = [
    { dy: 0,       r: canopyR },
    { dy: -bp,     r: canopyR },
    { dy: -bp * 2, r: canopyR - 1 },
    { dy: -bp * 3, r: Math.max(0, canopyR - 2) },
  ];

  for (const { dy, r } of layerDefs) {
    if (r < 0) continue;
    for (let dx = -r; dx <= r; dx++) {
      if (r >= 3 && Math.abs(dx) === r && dy === 0) continue;
      const leafSway = sway * (0.6 + Math.abs(dx) / Math.max(1, r) * 0.4);
      const lx = Math.round(cx + dx * bp - bp / 2 + leafSway);
      const ly = topY + dy;
      const shade = (Math.abs(dx) + Math.abs(dy / bp)) % 2 === 0;
      drawLeafBlock(ctx, lx, ly - bp, bp,
        shade ? '#2d7d32' : '#388e3c',
        shade ? '#43a047' : '#4caf50',
        shade ? '#1b5e20' : '#2e7d32',
        leafSway, 0.5, seed + dx * 7 + dy * 0.5);
    }
  }
}

function drawBirch(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, trunkH: number, canopyR: number, bp: number, sway: number,
  seed: number
) {
  const tx = Math.round(cx - bp / 2);
  for (let i = 0; i < trunkH; i++) {
    const ring = i % 3 === 1;
    drawBirchTexture(ctx, tx, groundY - (i + 1) * bp, bp, bp, ring, seed + i * 2.1);
  }

  const topY = groundY - trunkH * bp;
  const layerDefs = [
    { dy: 0,       r: canopyR },
    { dy: -bp,     r: canopyR },
    { dy: -bp * 2, r: canopyR },
    { dy: -bp * 3, r: canopyR - 1 },
    { dy: -bp * 4, r: Math.max(0, canopyR - 1) },
  ];

  for (const { dy, r } of layerDefs) {
    if (r < 0) continue;
    for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) === r && r > 1) continue;
      const leafSway = sway * (0.5 + Math.abs(dx) * 0.15);
      const lx = Math.round(cx + dx * bp - bp / 2 + leafSway);
      const ly = topY + dy;
      const shade = Math.abs(dx) % 2 === 0;
      drawLeafBlock(ctx, lx, ly - bp, bp,
        shade ? '#558b2f' : '#689f38',
        shade ? '#7cb342' : '#8bc34a',
        shade ? '#33691e' : '#3e7b1e',
        leafSway, 0.4, seed + dx * 5 + dy * 0.3);
    }
  }
}

function drawSpruce(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, trunkH: number, _r: number, bp: number, sway: number,
  seed: number
) {
  const tx = Math.round(cx - bp / 2);

  for (let i = 0; i < trunkH; i++) {
    drawBarkTexture(ctx, tx, groundY - (i + 1) * bp, bp, bp, '#4a2c0a', '#2a1504', seed + i * 4.2);
  }

  const topY = groundY - trunkH * bp;
  const tiers = Math.round(trunkH * 0.65);
  const tierH = bp * 1.5;

  for (let tier = 0; tier < tiers; tier++) {
    const r = tier;
    const ty = topY - (tiers - tier) * tierH;
    for (let dx = -r; dx <= r; dx++) {
      const leafSway = sway * (0.3 + Math.abs(dx) * 0.12) * (1 - tier / tiers);
      const lx = Math.round(cx + dx * bp - bp / 2 + leafSway);
      const shade = (tier + Math.abs(dx)) % 2 === 0;
      const depth = tier / tiers;
      drawLeafBlock(ctx, lx, ty, bp,
        shade ? '#1b5e20' : '#145214',
        shade ? '#2e7d32' : '#1e6b22',
        shade ? '#0d3010' : '#082008',
        leafSway, depth, seed + tier * 11 + dx * 3);
    }

    if (tier > 1 && tier < tiers - 2) {
      const dir = tier % 2 === 0 ? 1 : -1;
      const tierSway = sway * 0.3 * (1 - tier / tiers);
      const bx = Math.round(cx + dir * r * bp + tierSway);
      const by = ty + bp;
      ctx.fillStyle = '#1b5e20';
      ctx.fillRect(bx, by, bp * 0.4, bp * 1.2);
      ctx.fillStyle = '#0d3010';
      ctx.fillRect(bx, by + bp * 1.0, bp * 0.4, bp * 0.2);
    }
  }
}

function drawDarkOak(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, trunkH: number, canopyR: number, bp: number, sway: number,
  seed: number
) {
  const tw = bp * 2;
  const tx = Math.round(cx - tw / 2);

  for (let i = 0; i < trunkH; i++) {
    ctx.fillStyle = '#2c1a08';
    ctx.fillRect(tx, groundY - (i + 1) * bp, tw, bp);

    ctx.fillStyle = '#1a0d04';
    const patches = Math.floor(hashRange(seed + i * 5.3, 1, 4));
    for (let p = 0; p < patches; p++) {
      const s = seed + i * 5.3 + p * 7.1;
      const px = tx + hashRange(s, 0, tw * 0.8);
      const py = groundY - (i + 1) * bp + hashRange(s + 1, 0, bp * 0.7);
      ctx.fillRect(px, py, hashRange(s + 2, 2, 6), hashRange(s + 3, 1, 4));
    }

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(tx, groundY - (i + 1) * bp, tw, Math.max(2, bp * 0.1));
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(tx, groundY - i * bp - Math.max(2, bp * 0.15), tw, Math.max(2, bp * 0.15));
    ctx.fillRect(tx, groundY - (i + 1) * bp, Math.max(2, tw * 0.08), bp);
  }

  ctx.fillStyle = '#2c1a08';
  ctx.fillRect(tx - bp * 0.4, groundY - bp * 0.3, bp * 0.5, bp * 0.3);
  ctx.fillRect(tx + tw - bp * 0.1, groundY - bp * 0.25, bp * 0.5, bp * 0.25);

  const topY = groundY - trunkH * bp;
  const layerDefs = [
    { dy: 0,       r: canopyR },
    { dy: -bp,     r: canopyR },
    { dy: -bp * 2, r: canopyR - 1 },
    { dy: -bp * 3, r: Math.max(1, canopyR - 2) },
  ];

  for (const { dy, r } of layerDefs) {
    if (r < 0) continue;
    for (let dx = -r; dx <= r; dx++) {
      const leafSway = sway * (0.5 + Math.abs(dx) * 0.1);
      const lx = Math.round(cx + dx * bp - bp / 2 + leafSway);
      const ly = topY + dy;
      const shade = (Math.abs(dx) + Math.abs(dy / bp)) % 3;
      const bases = ['#1a3d1a', '#1e4a1e', '#153015'];
      const his   = ['#2d5a2d', '#336633', '#22481e'];
      const los   = ['#0d200d', '#0a1a0a', '#080f08'];
      drawLeafBlock(ctx, lx, ly - bp, bp, bases[shade], his[shade], los[shade], leafSway, 0.5, seed + dx * 9 + dy * 0.7);
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MinecraftBackground() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef<number>(0);
  const firefliesRef = useRef<Firefly[]>([]);
  const timeRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const W = canvas.width;
    const H = canvas.height;

    // Fireflies – pre-positioned, gentle drift, no side wrapping
    const treeBand = { top: H * 0.35, bot: H * 0.92 };
    firefliesRef.current = Array.from({ length: 28 }, (_, i) => {
      const baseX = hashRange(i * 13.1 + 7, 0, W);
      const baseY = hashRange(i * 17.7 + 3, treeBand.top, treeBand.bot);
      return {
        x: baseX,
        y: baseY,
        baseX,
        baseY,
        vx: (hashRange(i * 23.3, 0.1, 0.3)) * (hashRange(i * 31.1, 0, 1) > 0.5 ? 1 : -1),
        vy: (hashRange(i * 29.7, 0.05, 0.15)) * (hashRange(i * 37.5, 0, 1) > 0.5 ? 1 : -1),
        opacity: hashRange(i * 41.3, 0.15, 0.85),
        opDir: hashRange(i * 47.1, 0, 1) > 0.5 ? 1 : -1,
        size: hashRange(i * 53.9, 1.2, 2.8),
        phase: hashRange(i * 61.2, 0, Math.PI * 2),
      };
    });

    // Fixed star positions
    const STARS = Array.from({ length: 90 }, (_, i) => ({
      x: hashRange(i * 7.1 + 2, 0, 1),
      y: hashRange(i * 11.3 + 5, 0, 0.58),
      size: hashRange(i * 13.7, 0.5, 2),
      phase: hashRange(i * 19.1, 0, Math.PI * 2),
      bright: hashRange(i * 23.9, 0.45, 1),
    }));

    // Deterministic grass blades
    const BP = 18;
    const grassBlades: Array<{ gx: number; bx: number; bw: number; bh: number }> = [];
    for (let gx = 0; gx < W; gx += BP) {
      const bladeCount = Math.floor(hashRange(gx * 0.1, 1, 4));
      for (let b = 0; b < bladeCount; b++) {
        const s = gx * 0.1 + b * 7.3;
        grassBlades.push({
          gx,
          bx: gx + hashRange(s, 0, BP),
          bw: hashRange(s + 1, 1, 2.5),
          bh: hashRange(s + 2, 2, 5),
        });
      }
    }

    // Deterministic dirt pebbles
    const pebbles: Array<{ x: number; y: number; w: number; h: number; color: string; hiW: number }> = [];
    const pebbleCount = Math.floor(W / 40) + 5;
    for (let i = 0; i < pebbleCount; i++) {
      const s = i * 31.1 + 11;
      const px = hashRange(s, 0, W);
      const py = hashRange(s + 1, 0, H - H * 0.80 - BP);
      const pSize = hashRange(s + 2, 2, 6);
      pebbles.push({
        x: px,
        y: H * 0.80 + BP + py,
        w: pSize,
        h: pSize * 0.8,
        color: hashRange(s + 3, 0, 1) > 0.5 ? '#6b4428' : '#8b6344',
        hiW: Math.max(1, pSize * 0.15),
      });
    }

    // Deterministic dirt roots
    const roots: Array<{ x: number; y1: number; y2: number; x2: number; x3: number }> = [];
    const rootCount = Math.floor(W / 120) + 2;
    for (let i = 0; i < rootCount; i++) {
      const s = i * 41.7 + 3;
      const rx = hashRange(s, 0, W);
      const ry = hashRange(s + 1, 0, (H - H * 0.80 - BP) * 0.4);
      roots.push({
        x: rx,
        y1: H * 0.80 + BP,
        y2: H * 0.80 + BP + ry,
        x2: rx + (hashRange(s + 2, 0, 1) - 0.5) * 30,
        x3: rx + (hashRange(s + 3, 0, 1) - 0.5) * 40,
      });
    }

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      timeRef.current += 0.006;
      const t = timeRef.current;

      const groundY = Math.floor(H * 0.80);

      // ── Sky ──────────────────────────────────────────────────────────────
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      skyGrad.addColorStop(0,   '#020c03');
      skyGrad.addColorStop(0.5, '#041206');
      skyGrad.addColorStop(1,   '#071a08');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, groundY);

      // Stars
      ctx.save();
      for (const s of STARS) {
        const twinkle = (Math.sin(t * 0.8 + s.phase) + 1) * 0.5;
        ctx.globalAlpha = s.bright * (0.45 + twinkle * 0.55);
        ctx.fillStyle = '#c8f0c8';
        ctx.fillRect(s.x * W, s.y * H, s.size, s.size);
      }
      ctx.restore();

      // Moon
      const moonX = W * 0.82;
      const moonY = H * 0.13;
      const moonR = 22;
      ctx.save();
      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR * 5);
      moonGlow.addColorStop(0, 'rgba(160,240,180,0.14)');
      moonGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d4eedc';
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a8ccb0';
      ctx.beginPath(); ctx.arc(moonX - 8, moonY + 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX + 7, moonY - 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX + 2, moonY + 9, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(moonX - 6, moonY - 7, moonR * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // ── Ground ──────────────────────────────────────────────────────────
      // Grass top row
      for (let gx = 0; gx < W; gx += BP) {
        block(ctx, gx, groundY, BP, BP, '#2e7d32', '#43a047', '#1b5e20');
      }
      // Deterministic grass blades
      for (const b of grassBlades) {
        ctx.fillStyle = '#43a047';
        ctx.fillRect(b.bx, groundY - b.bh, b.bw, b.bh);
      }

      // Dirt body
      const dirtGrad = ctx.createLinearGradient(0, groundY + BP, 0, H);
      dirtGrad.addColorStop(0,   '#4e2c0e');
      dirtGrad.addColorStop(0.3, '#3a1f08');
      dirtGrad.addColorStop(1,   '#1a0d04');
      ctx.fillStyle = dirtGrad;
      ctx.fillRect(0, groundY + BP, W, H - groundY - BP);

      // Dirt pebbles
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (const p of pebbles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(p.x, p.y, p.w, p.hiW);
      }
      ctx.restore();

      // Dirt roots
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#2e1a0a';
      ctx.lineWidth = 2;
      for (const r of roots) {
        ctx.beginPath();
        ctx.moveTo(r.x, r.y1);
        ctx.lineTo(r.x2, r.y2);
        ctx.lineTo(r.x3, r.y2 + Math.abs(r.x3 - r.x2) * 0.3);
        ctx.stroke();
      }
      ctx.restore();

      // Dirt grid lines
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#7a5020';
      ctx.lineWidth = 0.6;
      for (let gx = 0; gx < W; gx += BP) {
        ctx.beginPath(); ctx.moveTo(gx, groundY + BP); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (let gy = groundY + BP; gy < H; gy += BP) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }
      ctx.restore();

      // ── Trees ──────────────────────────────────────────────────────────
      for (let ti = 0; ti < TREES.length; ti++) {
        const def = TREES[ti];
        const cx   = Math.floor(W * def.xf);
        const sway = Math.sin(t * 0.35 + def.swayPhase) * def.swayAmp;
        const seed = def.xf * 1000 + def.type.length * 3;
        switch (def.type) {
          case 'oak':     drawOak(ctx, cx, groundY, def.trunkH, def.canopyR, def.bp, sway, seed);     break;
          case 'birch':   drawBirch(ctx, cx, groundY, def.trunkH, def.canopyR, def.bp, sway, seed);   break;
          case 'spruce':  drawSpruce(ctx, cx, groundY, def.trunkH, def.canopyR, def.bp, sway, seed);  break;
          case 'darkoak': drawDarkOak(ctx, cx, groundY, def.trunkH, def.canopyR, def.bp, sway, seed); break;
        }
      }

      // ── Fireflies – gentle drift, stay in bounds, no side wrapping ─────
      const treeBandDyn = { top: groundY * 0.35, bot: groundY * 0.92 };
      for (let fi = 0; fi < firefliesRef.current.length; fi++) {
        const ff = firefliesRef.current[fi];
        // Gentle drift around base position
        ff.x = ff.baseX + Math.sin(t * 0.4 + ff.phase) * 40;
        ff.y = ff.baseY + Math.sin(t * 0.3 + ff.phase * 1.7) * 20;
        // Clamp to treeline band
        ff.x = Math.max(20, Math.min(W - 20, ff.x));
        ff.y = Math.max(treeBandDyn.top, Math.min(treeBandDyn.bot, ff.y));

        ff.opacity += ff.opDir * 0.008;
        if (ff.opacity >= 0.95) { ff.opacity = 0.95; ff.opDir = -1; }
        if (ff.opacity <= 0.10) { ff.opacity = 0.10; ff.opDir =  1; }

        const pulse  = (Math.sin(t * 1.2 + ff.phase) + 1) * 0.5;
        const radius = ff.size * 7 * (1 + pulse * 0.6);

        const glow = ctx.createRadialGradient(ff.x, ff.y, 0, ff.x, ff.y, radius);
        glow.addColorStop(0,   `rgba(120,255,70,${ff.opacity * 0.9})`);
        glow.addColorStop(0.3, `rgba(50,200,30,${ff.opacity * 0.4})`);
        glow.addColorStop(1,   'rgba(20,100,10,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ff.x, ff.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(200,255,160,${ff.opacity})`;
        ctx.beginPath();
        ctx.arc(ff.x, ff.y, ff.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Ground mist ─────────────────────────────────────────────────────
      const mistGrad = ctx.createLinearGradient(0, groundY - 50, 0, groundY + BP);
      mistGrad.addColorStop(0, 'rgba(10,40,10,0)');
      mistGrad.addColorStop(1, `rgba(10,40,10,${0.07 + Math.sin(t * 0.25) * 0.02})`);
      ctx.fillStyle = mistGrad;
      ctx.fillRect(0, groundY - 50, W, 50 + BP);

      // ── Vignette ────────────────────────────────────────────────────────
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.88);
      vig.addColorStop(0,   'rgba(0,0,0,0)');
      vig.addColorStop(0.65, 'rgba(0,0,0,0.2)');
      vig.addColorStop(1,   'rgba(0,0,0,0.85)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        display: 'block', zIndex: 0,
      }}
    />
  );
}

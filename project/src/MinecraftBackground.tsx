import { useEffect, useRef } from 'react';

interface Firefly {
  x: number; y: number;
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
  bp: number;        // block pixel size
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

// ── Draw helpers ─────────────────────────────────────────────────────────────

function block(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  base: string, hi: string, lo: string
) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  // Top highlight
  ctx.fillStyle = hi;
  ctx.fillRect(x, y, w, Math.max(2, h * 0.15));
  // Bottom + left shadow
  ctx.fillStyle = lo;
  ctx.fillRect(x, y + h - Math.max(2, h * 0.15), w, Math.max(2, h * 0.15));
  ctx.fillRect(x, y, Math.max(2, w * 0.12), h);
}

function drawBarkTexture(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  baseColor: string, darkColor: string
) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, w, h);

  // Add subtle bark grooves
  ctx.fillStyle = darkColor;
  const grooveCount = Math.max(2, Math.floor(w / 4));
  for (let i = 0; i < grooveCount; i++) {
    const gx = x + Math.random() * w;
    const gw = Math.random() * 2 + 1;
    const gh = Math.random() * h * 0.6 + h * 0.2;
    const gy = y + Math.random() * (h - gh);
    ctx.fillRect(gx, gy, gw, gh);
  }

  // Top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y, w, Math.max(2, h * 0.12));
  // Bottom shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x, y + h - Math.max(2, h * 0.15), w, Math.max(2, h * 0.15));
  ctx.fillRect(x, y, Math.max(2, w * 0.10), h);
}

function drawBirchTexture(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  isDark: boolean
) {
  const base = isDark ? '#b0b0a0' : '#e8e4d8';
  const shadow = isDark ? '#6e6e60' : '#a8a498';
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);

  // Birch horizontal bark rings
  ctx.fillStyle = shadow;
  const ringY = y + Math.random() * h * 0.7;
  ctx.fillRect(x, ringY, w, Math.max(1, h * 0.08));
  ctx.fillRect(x + w * 0.1, ringY + Math.random() * 6, w * 0.3, Math.max(1, h * 0.05));

  // Small dark knots
  ctx.fillStyle = '#5a5548';
  const knotSize = Math.random() * 2 + 1;
  ctx.fillRect(x + Math.random() * w * 0.8, y + Math.random() * h * 0.8, knotSize, knotSize);

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
  sway: number, depth: number
) {
  const sx = Math.round(x + sway * depth);
  const sy = Math.round(y);
  const s = Math.round(size);

  ctx.fillStyle = base;
  ctx.fillRect(sx, sy, s, s);

  // Inner depth shading
  ctx.fillStyle = hi;
  ctx.fillRect(sx, sy, s, Math.max(2, s * 0.18));
  ctx.fillStyle = lo;
  ctx.fillRect(sx, sy + s - Math.max(2, s * 0.22), s, Math.max(2, s * 0.22));
  ctx.fillRect(sx, sy, Math.max(2, s * 0.14), s);

  // Tiny leaf texture dots
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(sx + s * 0.3, sy + s * 0.3, Math.max(1, s * 0.12), Math.max(1, s * 0.12));
  ctx.fillRect(sx + s * 0.6, sy + s * 0.5, Math.max(1, s * 0.08), Math.max(1, s * 0.08));

  // Subtle highlight edge
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(sx + s * 0.2, sy + s * 0.2, s * 0.6, 1);
}

// ── Tree draw functions ───────────────────────────────────────────────────────

function drawOak(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, trunkH: number, canopyR: number, bp: number, sway: number
) {
  const tx = Math.round(cx - bp / 2);

  // Trunk with bark texture
  for (let i = 0; i < trunkH; i++) {
    drawBarkTexture(ctx, tx, groundY - (i + 1) * bp, bp, bp,
      '#6b3d11', '#3d2008');
  }

  // Small branches on the trunk
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
        leafSway, 0.5);
    }
  }
}

function drawBirch(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, trunkH: number, canopyR: number, bp: number, sway: number
) {
  const tx = Math.round(cx - bp / 2);
  for (let i = 0; i < trunkH; i++) {
    const ring = i % 3 === 1;
    drawBirchTexture(ctx, tx, groundY - (i + 1) * bp, bp, bp, ring);
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
        leafSway, 0.4);
    }
  }
}

function drawSpruce(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, trunkH: number, _r: number, bp: number, sway: number
) {
  const tx = Math.round(cx - bp / 2);

  // Trunk with darker bark
  for (let i = 0; i < trunkH; i++) {
    drawBarkTexture(ctx, tx, groundY - (i + 1) * bp, bp, bp,
      '#4a2c0a', '#2a1504');
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
        leafSway, depth);
    }

    // Add downward hanging branches for lower tiers
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
  cx: number, groundY: number, trunkH: number, canopyR: number, bp: number, sway: number
) {
  const tw = bp * 2;
  const tx = Math.round(cx - tw / 2);

  // Wide trunk with rough texture
  for (let i = 0; i < trunkH; i++) {
    ctx.fillStyle = '#2c1a08';
    ctx.fillRect(tx, groundY - (i + 1) * bp, tw, bp);

    // Dark oak bark texture – irregular patches
    ctx.fillStyle = '#1a0d04';
    const patches = Math.floor(Math.random() * 3) + 1;
    for (let p = 0; p < patches; p++) {
      const px = tx + Math.random() * tw * 0.8;
      const py = groundY - (i + 1) * bp + Math.random() * bp * 0.7;
      ctx.fillRect(px, py, Math.random() * 4 + 2, Math.random() * 3 + 1);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(tx, groundY - (i + 1) * bp, tw, Math.max(2, bp * 0.1));
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(tx, groundY - i * bp - Math.max(2, bp * 0.15), tw, Math.max(2, bp * 0.15));
    ctx.fillRect(tx, groundY - (i + 1) * bp, Math.max(2, tw * 0.08), bp);
  }

  // Roots at base
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
      drawLeafBlock(ctx, lx, ly - bp, bp, bases[shade], his[shade], los[shade], leafSway, 0.5);
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

    // Fireflies – stay near the treeline, not in open sky
    firefliesRef.current = Array.from({ length: 28 }, () => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight * 0.45 + Math.random() * window.innerHeight * 0.3,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.2,
      opacity: Math.random(),
      opDir: Math.random() > 0.5 ? 1 : -1,
      size: Math.random() * 2 + 1.2,
      phase: Math.random() * Math.PI * 2,
    }));

    // Fixed star positions
    const STARS = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.58,
      size: Math.random() * 1.5 + 0.5,
      phase: Math.random() * Math.PI * 2,
      bright: 0.45 + Math.random() * 0.55,
    }));

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      timeRef.current += 0.012;
      const t = timeRef.current;

      const groundY = Math.floor(H * 0.80);

      // ── Sky ──────────────────────────────────────────────────────────────
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      skyGrad.addColorStop(0,   '#020c03');
      skyGrad.addColorStop(0.5, '#041206');
      skyGrad.addColorStop(1,   '#071a08');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, groundY);

      // Stars – pixelated small rects, they twinkle
      ctx.save();
      for (const s of STARS) {
        const twinkle = (Math.sin(t * 1.6 + s.phase) + 1) * 0.5;
        ctx.globalAlpha = s.bright * (0.45 + twinkle * 0.55);
        ctx.fillStyle = '#c8f0c8';
        ctx.fillRect(s.x * W, s.y * H, s.size, s.size);
      }
      ctx.restore();

      // Moon – circle, not a square
      const moonX = W * 0.82;
      const moonY = H * 0.13;
      const moonR = 22;
      ctx.save();
      // soft glow behind moon
      const moonGlow = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR * 5);
      moonGlow.addColorStop(0, 'rgba(160,240,180,0.14)');
      moonGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR * 5, 0, Math.PI * 2);
      ctx.fill();
      // Moon disc (circle)
      ctx.fillStyle = '#d4eedc';
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();
      // Craters (small circles)
      ctx.fillStyle = '#a8ccb0';
      ctx.beginPath(); ctx.arc(moonX - 8, moonY + 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX + 7, moonY - 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX + 2, moonY + 9, 4, 0, Math.PI * 2); ctx.fill();
      // Moon highlight
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(moonX - 6, moonY - 7, moonR * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // ── Ground ──────────────────────────────────────────────────────────
      const BP = 18; // ground block size
      // Grass top row with more detail
      for (let gx = 0; gx < W; gx += BP) {
        block(ctx, gx, groundY, BP, BP, '#2e7d32', '#43a047', '#1b5e20');
        // Add grass blade tips
        ctx.fillStyle = '#43a047';
        const bladeCount = Math.floor(Math.random() * 3) + 1;
        for (let b = 0; b < bladeCount; b++) {
          const bx = gx + Math.random() * BP;
          ctx.fillRect(bx, groundY - Math.random() * 4 - 1, Math.random() * 2 + 1, Math.random() * 3 + 2);
        }
      }

      // Dirt body with more detail
      const dirtGrad = ctx.createLinearGradient(0, groundY + BP, 0, H);
      dirtGrad.addColorStop(0,   '#4e2c0e');
      dirtGrad.addColorStop(0.3, '#3a1f08');
      dirtGrad.addColorStop(1,   '#1a0d04');
      ctx.fillStyle = dirtGrad;
      ctx.fillRect(0, groundY + BP, W, H - groundY - BP);

      // Dirt pebbles and stones
      ctx.save();
      ctx.globalAlpha = 0.5;
      const pebbleCount = Math.floor(W / 40) + 5;
      for (let i = 0; i < pebbleCount; i++) {
        const px = Math.random() * W;
        const py = groundY + BP + Math.random() * (H - groundY - BP);
        const pSize = Math.random() * 4 + 2;
        const shade = Math.random();
        ctx.fillStyle = shade > 0.5 ? '#6b4428' : '#8b6344';
        ctx.fillRect(px, py, pSize, pSize * 0.8);
        // Pebble highlight
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(px, py, pSize, Math.max(1, pSize * 0.15));
      }
      ctx.restore();

      // Dirt roots
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#2e1a0a';
      ctx.lineWidth = 2;
      for (let i = 0; i < Math.floor(W / 120) + 2; i++) {
        const rx = Math.random() * W;
        const ry = groundY + BP + Math.random() * (H - groundY - BP) * 0.4;
        ctx.beginPath();
        ctx.moveTo(rx, groundY + BP);
        ctx.lineTo(rx + (Math.random() - 0.5) * 30, ry);
        ctx.lineTo(rx + (Math.random() - 0.5) * 40, ry + Math.random() * 20);
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
      for (const def of TREES) {
        const cx   = Math.floor(W * def.xf);
        const sway = Math.sin(t * 0.75 + def.swayPhase) * def.swayAmp;
        switch (def.type) {
          case 'oak':     drawOak(ctx, cx, groundY, def.trunkH, def.canopyR, def.bp, sway);     break;
          case 'birch':   drawBirch(ctx, cx, groundY, def.trunkH, def.canopyR, def.bp, sway);   break;
          case 'spruce':  drawSpruce(ctx, cx, groundY, def.trunkH, def.canopyR, def.bp, sway);  break;
          case 'darkoak': drawDarkOak(ctx, cx, groundY, def.trunkH, def.canopyR, def.bp, sway); break;
        }
      }

      // ── Fireflies – stay near treeline, not in sky ─────────────────────
      const treeBand = { top: groundY * 0.35, bot: groundY * 0.92 };
      for (const ff of firefliesRef.current) {
        ff.x += ff.vx;
        ff.y += ff.vy;
        ff.opacity += ff.opDir * 0.016;
        if (ff.opacity >= 1)    { ff.opacity = 1;    ff.opDir = -1; }
        if (ff.opacity <= 0.05) { ff.opacity = 0.05; ff.opDir =  1; }
        // Wrap horizontally
        if (ff.x < -10) ff.x = W + 10;
        if (ff.x > W + 10) ff.x = -10;
        // Bounce vertically within treeline band
        if (ff.y < treeBand.top) { ff.y = treeBand.top; ff.vy = Math.abs(ff.vy); }
        if (ff.y > treeBand.bot) { ff.y = treeBand.bot; ff.vy = -Math.abs(ff.vy); }

        const pulse  = (Math.sin(t * 2.6 + ff.phase) + 1) * 0.5;
        const radius = ff.size * 7 * (1 + pulse * 0.6);

        const glow = ctx.createRadialGradient(ff.x, ff.y, 0, ff.x, ff.y, radius);
        glow.addColorStop(0,   `rgba(120,255,70,${ff.opacity * 0.9})`);
        glow.addColorStop(0.3, `rgba(50,200,30,${ff.opacity * 0.4})`);
        glow.addColorStop(1,   'rgba(20,100,10,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ff.x, ff.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `rgba(200,255,160,${ff.opacity})`;
        ctx.beginPath();
        ctx.arc(ff.x, ff.y, ff.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Ground mist ─────────────────────────────────────────────────────
      const mistGrad = ctx.createLinearGradient(0, groundY - 50, 0, groundY + BP);
      mistGrad.addColorStop(0, 'rgba(10,40,10,0)');
      mistGrad.addColorStop(1, `rgba(10,40,10,${0.07 + Math.sin(t * 0.35) * 0.02})`);
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

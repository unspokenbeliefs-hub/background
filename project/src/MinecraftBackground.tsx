import { useEffect, useRef } from 'react';

interface Leaf {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  rotation: number; rotSpeed: number;
  opacity: number;
  color: string;
  life: number; maxLife: number;
}

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

// Leaf colors per tree type
const LEAF_COLORS: Record<TreeType, string[]> = {
  oak:     ['#2e7d32', '#388e3c', '#1b5e20', '#43a047'],
  birch:   ['#558b2f', '#689f38', '#7cb342', '#33691e'],
  spruce:  ['#1b5e20', '#145214', '#1e6b22', '#0d3010'],
  darkoak: ['#1a3d1a', '#1e4a1e', '#153015', '#2d5a2d'],
};

// Returns the Y of the canopy top for leaf spawning
function getCanopyTopY(def: TreeDef, groundY: number): number {
  const topY = groundY - def.trunkH * def.bp;
  if (def.type === 'spruce') {
    return topY - def.trunkH * 0.55 * def.bp * 1.5;
  }
  return topY - (def.canopyR + 1) * def.bp;
}

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

// ── Tree draw functions ───────────────────────────────────────────────────────

function drawOak(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, trunkH: number, canopyR: number, bp: number, sway: number
) {
  const tx = Math.round(cx - bp / 2);
  for (let i = 0; i < trunkH; i++) {
    block(ctx, tx, groundY - (i + 1) * bp, bp, bp, '#6b3d11', '#8b5a2b', '#3d2008');
  }
  const topY = groundY - trunkH * bp;
  // 4 layers – bottom widest, progressively narrower
  const layerDefs = [
    { dy: 0,       r: canopyR },
    { dy: -bp,     r: canopyR },
    { dy: -bp * 2, r: canopyR - 1 },
    { dy: -bp * 3, r: Math.max(0, canopyR - 2) },
  ];
  for (const { dy, r } of layerDefs) {
    if (r < 0) continue;
    for (let dx = -r; dx <= r; dx++) {
      // Round the bottom corners only on wide layers
      if (r >= 3 && Math.abs(dx) === r && dy === 0) continue;
      const leafSway = sway * (0.6 + Math.abs(dx) / r * 0.4);
      const lx = Math.round(cx + dx * bp - bp / 2 + leafSway);
      const ly = topY + dy;
      const shade = (Math.abs(dx) + Math.abs(dy / bp)) % 2 === 0;
      block(ctx, lx, ly - bp, bp, bp,
        shade ? '#2d7d32' : '#388e3c',
        shade ? '#43a047' : '#4caf50',
        shade ? '#1b5e20' : '#2e7d32'
      );
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
    block(ctx, tx, groundY - (i + 1) * bp, bp, bp,
      ring ? '#9e9e8e' : '#d4d0c4',
      ring ? '#b0b0a0' : '#e8e4d8',
      ring ? '#6e6e60' : '#a8a498'
    );
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
      block(ctx, lx, ly - bp, bp, bp,
        shade ? '#558b2f' : '#689f38',
        shade ? '#7cb342' : '#8bc34a',
        shade ? '#33691e' : '#3e7b1e'
      );
    }
  }
}

function drawSpruce(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, trunkH: number, _r: number, bp: number, sway: number
) {
  const tx = Math.round(cx - bp / 2);
  for (let i = 0; i < trunkH; i++) {
    block(ctx, tx, groundY - (i + 1) * bp, bp, bp, '#4a2c0a', '#6b4015', '#2a1504');
  }
  const topY = groundY - trunkH * bp;
  // Triangular tiers from top down
  const tiers = Math.round(trunkH * 0.65);
  const tierH = bp * 1.5;
  for (let tier = 0; tier < tiers; tier++) {
    const r = tier; // each tier adds one block width
    const ty = topY - (tiers - tier) * tierH;
    for (let dx = -r; dx <= r; dx++) {
      const leafSway = sway * (0.3 + Math.abs(dx) * 0.12) * (1 - tier / tiers);
      const lx = Math.round(cx + dx * bp - bp / 2 + leafSway);
      const shade = (tier + Math.abs(dx)) % 2 === 0;
      block(ctx, lx, ty, bp, bp,
        shade ? '#1b5e20' : '#145214',
        shade ? '#2e7d32' : '#1e6b22',
        shade ? '#0d3010' : '#082008'
      );
    }
  }
}

function drawDarkOak(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, trunkH: number, canopyR: number, bp: number, sway: number
) {
  // Wide 2-block trunk
  const tw = bp * 2;
  const tx = Math.round(cx - tw / 2);
  for (let i = 0; i < trunkH; i++) {
    block(ctx, tx, groundY - (i + 1) * bp, tw, bp, '#2c1a08', '#4a2c10', '#160c04');
  }
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
      block(ctx, lx, ly - bp, bp, bp, bases[shade], his[shade], los[shade]);
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MinecraftBackground() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef<number>(0);
  const leavesRef    = useRef<Leaf[]>([]);
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

    const spawnLeaf = (originX: number, originY: number, type: TreeType) => {
      const palette = LEAF_COLORS[type];
      const color   = palette[Math.floor(Math.random() * palette.length)];
      leavesRef.current.push({
        x: originX + (Math.random() - 0.5) * 40,
        y: originY + Math.random() * 20,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.35 + Math.random() * 0.65,
        size: 6 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.07,
        opacity: 0.75 + Math.random() * 0.25,
        color,
        life: 0,
        maxLife: 300 + Math.random() * 250,
      });
    };

    let frame = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      timeRef.current += 0.012;
      const t = timeRef.current;
      frame++;

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
      // Grass top row
      for (let gx = 0; gx < W; gx += BP) {
        block(ctx, gx, groundY, BP, BP, '#2e7d32', '#43a047', '#1b5e20');
      }
      // Dirt body
      const dirtGrad = ctx.createLinearGradient(0, groundY + BP, 0, H);
      dirtGrad.addColorStop(0,   '#4e2c0e');
      dirtGrad.addColorStop(0.3, '#3a1f08');
      dirtGrad.addColorStop(1,   '#1a0d04');
      ctx.fillStyle = dirtGrad;
      ctx.fillRect(0, groundY + BP, W, H - groundY - BP);
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

        // Subtle canopy glow
        const canopyY = getCanopyTopY(def, groundY) + def.canopyR * def.bp;
        const glowR   = def.canopyR * def.bp * 2.2;
        const cGlow   = ctx.createRadialGradient(cx, canopyY, 0, cx, canopyY, glowR);
        cGlow.addColorStop(0, `rgba(30,120,30,0.07)`);
        cGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cGlow;
        ctx.beginPath();
        ctx.arc(cx, canopyY, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Leaves – spawn from tree canopies ──────────────────────────────
      if (frame % 7 === 0 && leavesRef.current.length < 75) {
        const def  = TREES[Math.floor(Math.random() * TREES.length)];
        const cx   = W * def.xf;
        const topY = getCanopyTopY(def, groundY);
        spawnLeaf(cx, topY, def.type);
      }

      leavesRef.current = leavesRef.current.filter((leaf) => {
        leaf.life++;
        if (leaf.life > leaf.maxLife || leaf.y > H + 20) return false;

        // Wind drift
        leaf.vx += Math.sin(t * 1.4 + leaf.y * 0.01) * 0.025;
        leaf.x  += leaf.vx;
        leaf.y  += leaf.vy;
        leaf.rotation += leaf.rotSpeed;

        const fade =
          leaf.life < 20               ? leaf.life / 20 :
          leaf.life > leaf.maxLife - 30 ? (leaf.maxLife - leaf.life) / 30 : 1;

        ctx.save();
        ctx.globalAlpha = leaf.opacity * fade;
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.rotation);
        const s = leaf.size;
        // Pixel leaf – single square with highlight + border
        ctx.fillStyle = leaf.color;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.fillStyle = 'rgba(120,220,120,0.45)';
        ctx.fillRect(-s / 2, -s / 2, s, 2);
        ctx.strokeStyle = 'rgba(0,30,0,0.4)';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(-s / 2, -s / 2, s, s);
        ctx.restore();
        return true;
      });

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

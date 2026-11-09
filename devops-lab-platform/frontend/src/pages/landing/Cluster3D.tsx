import React, { useEffect, useRef } from 'react';

/* 3D k8s cluster rendered on a 2D canvas: manual perspective projection, no
 * three.js. Auto-rotates, drag to spin, colors follow the active theme, and
 * it freezes to a single static frame under prefers-reduced-motion. */

interface Vec3 { x: number; y: number; z: number }

interface Node {
  pos: Vec3;
  r: number;            // screen radius at depth 1
  kind: 'cp' | 'worker' | 'pod' | 'ambient';
  label?: string;
  twinkle?: number;     // ambient twinkle phase
  phase?: number;       // per-node bob phase
}

const rot = (p: Vec3, ax: number, ay: number): Vec3 => {
  // rotate around X then Y
  const cy = Math.cos(ay), sy = Math.sin(ay);
  const cx = Math.cos(ax), sx = Math.sin(ax);
  const y1 = p.y * cy - p.z * sy;
  const z1 = p.y * sy + p.z * cy;
  const x2 = p.x * cx - y1 * sx;
  const y2 = p.x * sx + y1 * cx;
  return { x: x2, y: y2, z: z1 };
};

const buildNodes = (): { nodes: Node[]; edges: [number, number][] } => {
  const nodes: Node[] = [];
  const edges: [number, number][] = [];

  nodes.push({ pos: { x: 0, y: 0.85, z: 0 }, r: 26, kind: 'cp', label: 'k3s', phase: 0 });
  const cpIdx = 0;

  const workerIdx: number[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const pos = { x: Math.cos(a) * 0.82, y: -0.08, z: Math.sin(a) * 0.82 };
    workerIdx.push(nodes.length);
    nodes.push({ pos, r: 16, kind: 'worker', label: `worker-${i + 1}`, phase: i * 1.1 });
    edges.push([cpIdx, nodes.length - 1]);
  }

  workerIdx.forEach((wi) => {
    for (let j = 0; j < 4; j++) {
      const a = (j / 4) * Math.PI * 2 + wi * 1.3;
      const base = nodes[wi].pos;
      const pos = {
        x: base.x * 1.18 + Math.cos(a) * 0.22,
        y: base.y - 0.62 - (j % 2) * 0.12,
        z: base.z * 1.18 + Math.sin(a) * 0.22,
      };
      nodes.push({ pos, r: 5, kind: 'pod', phase: j * 0.9 + wi });
      edges.push([wi, nodes.length - 1]);
    }
  });

  // ambient particles on an outer shell
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 42; i++) {
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    nodes.push({
      pos: { x: Math.sin(ph) * Math.cos(th) * 1.3, y: Math.cos(ph) * 1.05, z: Math.sin(ph) * Math.sin(th) * 1.3 },
      r: 1.6 + rnd() * 1.4,
      kind: 'ambient',
      twinkle: rnd() * Math.PI * 2,
    });
  }
  return { nodes, edges };
};

/** Pulses = data flowing control-plane → workers → pods. Each edge carries a
 *  packet whose phase advances with time; drawn as a small glowing dot. */
const PULSES: { edge: number; phase: number; speed: number }[] = [];
const seedPulses = (edgeCount: number) => {
  if (PULSES.length) return;
  let seed = 13;
  const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  for (let e = 0; e < edgeCount; e++) {
    const count = 1 + Math.floor(rnd() * 2);
    for (let k = 0; k < count; k++) {
      PULSES.push({ edge: e, phase: rnd(), speed: 0.14 + rnd() * 0.12 });
    }
  }
};

const Cluster3D: React.FC<{ className?: string; interactive?: boolean }> = ({
  className = '',
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { nodes, edges } = buildNodes();
    seedPulses(edges.length);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let css = getComputedStyle(document.documentElement);
    const var3 = (name: string, fallback: string) => (css.getPropertyValue(name).trim() || fallback);
    const color = (name: string, alpha: number, fallback = '148 163 184') =>
      `rgb(${var3(name, fallback)} / ${alpha})`;

    const themeObs = new MutationObserver(() => { css = getComputedStyle(document.documentElement); });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    let rotY = 0.6, rotX = -0.28;
    let velY = reduced ? 0 : 0.0042;   // base auto-spin
    let dragging = false, lastX = 0, lastY = 0;
    let raf = 0;
    let inView = !reduced && !document.hidden;
    let t = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width, h = rect.height;
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * 0.42;
      const fov = 3.4;

      ctx.clearRect(0, 0, w, h);
      const wob = reduced ? 0 : Math.sin(t) * 0.05;

      // per-node vertical drift: pods bob quickest, workers gently, cp barely
      const lifted = (n: Node): Vec3 => {
        if (reduced) return n.pos;
        const amp = n.kind === 'pod' ? 0.05 : n.kind === 'worker' ? 0.022 : 0.012;
        return { ...n.pos, y: n.pos.y + Math.sin(t * (n.kind === 'pod' ? 2.1 : 1.2) + (n.phase ?? 0)) * amp };
      };

      const project = (p: Vec3) => {
        const q = rot(p, rotX + wob * 0.4, rotY);
        const persp = fov / (fov + q.z);
        return { sx: cx + q.x * persp * R, sy: cy - q.y * persp * R, persp, front: q.z < 0.15 };
      };

      // edges first — endpoints kept so packets can travel along them
      const projected = nodes.map((n) => project(lifted(n)));
      edges.forEach(([a, b], ei) => {
        const pa = projected[a], pb = projected[b];
        const grad = ctx.createLinearGradient(pa.sx, pa.sy, pb.sx, pb.sy);
        grad.addColorStop(0, color('--c-primary', 0.5 * pa.persp));
        grad.addColorStop(1, color('--c-accent', 0.35 * pb.persp));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      });

      // data packets riding the edges (deploys rolling out to pods)
      if (!reduced) {
        for (const pulse of PULSES) {
          const [a, b] = edges[pulse.edge];
          const pa = projected[a], pb = projected[b];
          const k = (t * pulse.speed + pulse.phase) % 1;
          const px = pa.sx + (pb.sx - pa.sx) * k;
          const py = pa.sy + (pb.sy - pa.sy) * k;
          const pk = pa.persp + (pb.persp - pa.persp) * k;
          ctx.fillStyle = color('--c-accent', 0.85 * pk);
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1.2, 2.1 * pk), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // back-to-front for nodes
      const order = nodes
        .map((n, i) => ({ n, i, q: rot(lifted(n), rotX + wob * 0.4, rotY) }))
        .sort((a, b) => b.q.z - a.q.z);

      order.forEach(({ n, i, q }) => {
        const persp = fov / (fov + q.z);
        const sx = projected[i].sx;
        const sy = projected[i].sy;
        const r = n.r * persp;

        if (n.kind === 'ambient') {
          const tw = reduced ? 0.5 : 0.35 + 0.3 * Math.sin(t * 1.6 + (n.twinkle ?? 0));
          ctx.fillStyle = color('--c-muted', tw * persp);
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(0.5, r), 0, Math.PI * 2);
          ctx.fill();
          return;
        }

        if (n.kind === 'pod') {
          const pulse = reduced ? 0.9 : 0.65 + 0.3 * Math.sin(t * 2 + sx * 0.05);
          ctx.fillStyle = color('--c-success', pulse * persp);
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(1.5, r), 0, Math.PI * 2);
          ctx.fill();
          return;
        }

        // cp / worker: rounded card whose size is measured from its label so
        // the text always sits centered inside the element (no overflow)
        const alpha = 0.35 + 0.65 * persp;

        if (n.kind === 'cp') {
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.2);
          glow.addColorStop(0, color('--c-primary', (reduced ? 0.14 : 0.1 + 0.06 * Math.sin(t * 1.4)) * alpha));
          glow.addColorStop(1, color('--c-primary', 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        const fontPx = Math.max(8, (n.kind === 'cp' ? 10.5 : 9.5) * persp);
        ctx.font = `700 ${fontPx}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = n.label ?? '';
        const textW = label ? ctx.measureText(label).width : 0;
        const wRect = Math.max(r * 1.7, textW + r * 0.95);
        const hRect = Math.max(r * 1.15, fontPx * 1.9);

        ctx.fillStyle = color('--c-surface-2', Math.min(1, 0.9 * persp), '30 41 59');
        const rad = Math.min(10, r * 0.5);
        ctx.beginPath();
        ctx.roundRect(sx - wRect / 2, sy - hRect / 2, wRect, hRect, rad);
        ctx.fill();
        ctx.strokeStyle = color(n.kind === 'cp' ? '--c-primary-strong' : '--c-border', 0.8 * alpha, '51 65 85');
        ctx.lineWidth = 1.4;
        ctx.stroke();

        if (label && q.z < 0.9) {
          ctx.fillStyle = color(n.kind === 'cp' ? '--c-primary-strong' : '--c-muted', alpha, '165 180 252');
          ctx.fillText(label, sx, sy);
        }
      });
    };

    const tick = () => {
      t += 0.016;
      rotY += velY;
      if (!dragging) velY += ((reduced ? 0 : 0.0042) - velY) * 0.02; // ease back to base spin
      draw();
      if (inView) raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!inView && !reduced) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const stop = () => { cancelAnimationFrame(raf); };

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && !document.hidden;
      if (inView) start(); else if (!reduced) stop();
    }, { threshold: 0.05 });
    io.observe(canvas);

    const vis = () => {
      inView = !document.hidden;
      if (inView) start(); else stop();
    };
    document.addEventListener('visibilitychange', vis);

    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(canvas);

    const onDown = (e: PointerEvent) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      rotY += dx * 0.006;
      rotX = Math.max(-1.1, Math.min(0.5, rotX + dy * 0.004));
      velY = dx * 0.0011;
      if (reduced) draw();
    };
    const onUp = () => { dragging = false; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    resize();
    if (reduced) { draw(); } else { inView = !document.hidden; start(); }

    return () => {
      stop();
      io.disconnect(); ro.disconnect(); themeObs.disconnect();
      document.removeEventListener('visibilitychange', vis);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        aria-hidden="true"
      />
      {interactive && (
        <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-widest text-muted/70">
          drag to rotate the cluster
        </p>
      )}
    </div>
  );
};

export default Cluster3D;

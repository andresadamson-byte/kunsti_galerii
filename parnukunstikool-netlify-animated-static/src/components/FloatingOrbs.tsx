import { useEffect, useRef } from "react";

type Orb = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  collides: boolean;
};

const COLORS = [
  "#ffb347",
  "#ff7e5f",
  "#feb47b",
  "#ffd166",
  "#f9c74f",
  "#ef8354",
  "#f4a261",
  "#e76f51",
];

const ORB_COUNT = 18;
const COLLIDE_RATIO = 0.2;

export default function FloatingOrbs() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbsRef = useRef<Orb[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // initialize orbs
    const orbs: Orb[] = [];
    for (let i = 0; i < ORB_COUNT; i++) {
      const r = 10 + Math.random() * 190;
      orbs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: 0.15 + Math.random() * 0.35, // slow downward
        r,
        color: COLORS[i % COLORS.length],
        collides: i < Math.round(ORB_COUNT * COLLIDE_RATIO),
      });
    }
    orbsRef.current = orbs;

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };
    const onLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);

    const tick = () => {
      const orbs = orbsRef.current;
      const mouse = mouseRef.current;

      // physics
      for (const o of orbs) {
        o.x += o.vx;
        o.y += o.vy;

        // cursor repulsion ~10% bounce
        if (mouse.active) {
          const dx = o.x - mouse.x;
          const dy = o.y - mouse.y;
          const dist2 = dx * dx + dy * dy;
          const range = o.r + 140;
          if (dist2 < range * range && dist2 > 0.0001) {
            const dist = Math.sqrt(dist2);
            const force = (1 - dist / range) * 0.1;
            o.vx += (dx / dist) * force;
            o.vy += (dy / dist) * force;
          }
        }

        // wrap around: when fully past bottom, re-enter from top
        if (o.y - o.r > height) {
          o.y = -o.r;
          o.x = Math.random() * width;
        }
        if (o.x + o.r < 0) o.x = width + o.r;
        if (o.x - o.r > width) o.x = -o.r;

        // damping toward base downward drift
        o.vx *= 0.985;
        o.vy = o.vy * 0.99 + 0.25 * 0.01; // gentle pull to ~0.25 baseline
        if (o.vy < 0.1) o.vy = 0.1;
      }

      // collisions among the ~20% subset
      const colliders = orbs.filter((o) => o.collides);
      for (let i = 0; i < colliders.length; i++) {
        for (let j = i + 1; j < colliders.length; j++) {
          const a = colliders[i];
          const b = colliders[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.r * 0.7 + b.r * 0.7;
          if (dist < minDist && dist > 0.0001) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minDist - dist) * 0.5;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
            // simple elastic exchange along normal
            const va = a.vx * nx + a.vy * ny;
            const vb = b.vx * nx + b.vy * ny;
            const diff = vb - va;
            a.vx += diff * nx;
            a.vy += diff * ny;
            b.vx -= diff * nx;
            b.vy -= diff * ny;
          }
        }
      }

      // render — solid vector-like discs
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = 0.13;
      for (const o of orbs) {
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  shape: "circle" | "rect" | "diamond";
}

const COLORS = [
  "hsl(199, 89%, 48%)",  // primary
  "hsl(142, 71%, 45%)",  // quality green
  "hsl(37, 90%, 55%)",   // scraper amber
  "hsl(199, 89%, 68%)",  // light primary
  "hsl(142, 71%, 65%)",  // light green
];

export function ConsensusConfetti({ trigger }: { trigger: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  const spawnParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const particles: Particle[] = [];
    const cx = canvas.width / 2;

    for (let i = 0; i < 80; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 2 + Math.random() * 6;
      particles.push({
        x: cx,
        y: canvas.height * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        maxLife: 60 + Math.random() * 40,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 3 + Math.random() * 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        shape: (["circle", "rect", "diamond"] as const)[Math.floor(Math.random() * 3)],
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    spawnParticles();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;
      let alive = false;

      for (const p of particles) {
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) continue;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.min(p.life * 2, 1);
        ctx.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "rect") {
          ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.7, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.7, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      if (alive) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [trigger, spawnParticles]);

  if (!trigger) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

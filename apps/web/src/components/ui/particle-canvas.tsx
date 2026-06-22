'use client';

import { useEffect, useRef, useState } from 'react';

export function ParticleCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current || !active) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      angle: number;
      speed: number;
      distance: number;
    }

    const particles: Particle[] = [];
    const centerX = width / 2;
    const centerY = height / 2;

    // Create orbital particle count relative to screen area
    const particleCount = Math.min(Math.floor((width * height) / 18000), 90);

    for (let i = 0; i < particleCount; i++) {
      const distance = Math.random() * (Math.min(width, height) * 0.5) + 40;
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 0.06 + 0.015) * (Math.random() < 0.5 ? 1 : -1);

      // Choose color based on theme palettes (violet, cyan, soft white)
      const rand = Math.random();
      let color = '255, 255, 255'; // White star
      if (rand < 0.4) {
        color = '108, 99, 255'; // Violet theme glow
      } else if (rand < 0.8) {
        color = '0, 210, 255'; // Cyan theme glow
      }

      particles.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.8 + 0.6,
        color,
        alpha: Math.random() * 0.5 + 0.15,
        angle,
        speed: speed / 150, // orbit rotation speed
        distance,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let mouseX = centerX;
    let mouseY = centerY;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const currentCenterX = width / 2;
      const currentCenterY = height / 2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Increment angle for orbital rotation
        p.angle += p.speed;

        // Base coordinates from center
        let targetX = currentCenterX + Math.cos(p.angle) * p.distance;
        let targetY = currentCenterY + Math.sin(p.angle) * p.distance;

        // Add drifting velocity offsets
        p.x += p.vx;
        p.y += p.vy;

        // Smoothly pull particle toward orbital target
        p.x += (targetX - p.x) * 0.05;
        p.y += (targetY - p.y) * 0.05;

        // Mouse interaction: attract particles slightly when cursor is close
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 220) {
          const force = (220 - dist) / 220;
          p.x += (dx / dist) * force * 4;
          p.y += (dy / dist) * force * 4;
        }

        // Draw glowing particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.shadowBlur = p.size * 3;
        ctx.shadowColor = `rgb(${p.color})`;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for lines

        // Draw subtle connector webs
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const ldx = p.x - p2.x;
          const ldy = p.y - p2.y;
          const ldist = Math.sqrt(ldx * ldx + ldy * ldy);

          if (ldist < 95) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = ((95 - ldist) / 95) * 0.09;
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mounted, active]);

  if (!mounted || !active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] w-full h-full block"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

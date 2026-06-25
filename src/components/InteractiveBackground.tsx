import React, { useEffect, useRef } from 'react';
import { ThemeColors, isStyleColor } from '../types';

interface NetworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface InteractiveBackgroundProps {
  themeColors?: ThemeColors;
}

export default function InteractiveBackground({ themeColors }: InteractiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

  // Keep theme ref to avoid re-triggering useEffect on every theme change, keeping animation seamless
  const themeRef = useRef(themeColors);
  useEffect(() => {
    themeRef.current = themeColors;
  }, [themeColors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Create a beautiful, subtle set of floating network nodes
    const particleCount = 45;
    const particles: NetworkParticle[] = [];

    const initParticles = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: 1 + Math.random() * 1.5,
        });
      }
    };

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      // Resolve colors on every frame based on the latest theme state
      const colors = themeRef.current;
      let bg = '#09090b';
      let gridLine = 'rgba(39, 39, 42, 0.15)';
      let gridIntersection = 'rgba(63, 63, 70, 0.35)';
      let glowColorStart = 'rgba(99, 102, 241, 0.06)';
      let glowColorMid = 'rgba(99, 102, 241, 0.02)';
      let particleColor = 'rgba(129, 140, 248, 0.25)';
      let connectionColor = 'rgba(129, 140, 248, 0.12)';

      if (colors) {
        // Resolve background
        if (isStyleColor(colors.bg)) {
          bg = colors.bg;
        } else if (colors.bg.includes('light') || colors.bg.includes('fcfdfd') || (colors.name && colors.name.toLowerCase().includes('белая'))) {
          bg = '#fcfdfd';
        } else {
          bg = '#09090b';
        }

        // Resolve grid lines/dots color
        if (colors.grid) {
          if (isStyleColor(colors.grid)) {
            gridLine = colors.grid;
            gridIntersection = colors.grid;
          } else {
            gridLine = colors.grid;
            gridIntersection = colors.grid;
          }
        }

        // Helper to convert hex to rgba
        const hexToRgba = (hexStr: string, alpha: number) => {
          let hex = hexStr.replace('#', '').trim();
          if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
          }
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          if (isNaN(r) || isNaN(g) || isNaN(b)) {
            return `rgba(99, 102, 241, ${alpha})`;
          }
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // Resolve accent hex for particles, glow and connections
        let accentHex = '#6366f1';
        if (colors.accent) {
          if (isStyleColor(colors.accent)) {
            accentHex = colors.accent;
          } else if (colors.accent.includes('slate-900') || colors.accent.includes('slate-950')) {
            accentHex = '#0f172a';
          } else if (colors.accent.includes('zinc-300')) {
            accentHex = '#a1a1aa';
          }
        }

        glowColorStart = hexToRgba(accentHex, 0.08);
        glowColorMid = hexToRgba(accentHex, 0.02);
        particleColor = hexToRgba(accentHex, 0.35);
        connectionColor = hexToRgba(accentHex, 0.18);
      }

      // Clean background color
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const mX = mouseRef.current.x;
      const mY = mouseRef.current.y;

      // 1. DRAW SUBTLE ACCENT GRID ON THE BACKGROUND
      const gridSize = 64;
      ctx.strokeStyle = gridLine.includes('rgba') ? gridLine : `${gridLine}22`; // Ensure subtle opacity if hex
      ctx.lineWidth = 0.5;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw elegant tiny intersections (plus marks)
      ctx.fillStyle = gridIntersection.includes('rgba') ? gridIntersection : `${gridIntersection}44`;
      for (let x = gridSize; x < width; x += gridSize * 2) {
        for (let y = gridSize; y < height; y += gridSize * 2) {
          ctx.fillRect(x - 2, y, 5, 0.5);
          ctx.fillRect(x, y - 2, 0.5, 5);
        }
      }

      // 2. DRAW LUXURIOUS MOUSE LIGHT GLOW
      if (mX !== null && mY !== null) {
        const glowRadius = 240;
        const radialGlow = ctx.createRadialGradient(mX, mY, 10, mX, mY, glowRadius);
        radialGlow.addColorStop(0, glowColorStart);
        radialGlow.addColorStop(0.5, glowColorMid);
        radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(mX, mY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. UPDATE & DRAW NETWORK PARTICLES & CONNECTOR MESH
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Slowly float particles
        p.x += p.vx;
        p.y += p.vy;

        // Bounce back from walls with a soft pad
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Keep inside bounds just in case of viewport shrink
        p.x = Math.max(0, Math.min(width, p.x));
        p.y = Math.max(0, Math.min(height, p.y));

        // Interaction with mouse: gently attract or push
        if (mX !== null && mY !== null) {
          const dx = p.x - mX;
          const dy = p.y - mY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const force = (1.0 - dist / 180) * 0.15;
            p.x -= (dx / dist) * force;
            p.y -= (dy / dist) * force;
          }
        }

        // Draw particle dot
        ctx.fillStyle = particleColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Check proximity to other particles and draw fine connecting lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const alpha = (1.0 - dist / 130);
            let currentAlpha = 0.12;
            if (connectionColor.includes('rgba')) {
              const match = connectionColor.match(/[\d.]+\)$/);
              if (match) {
                currentAlpha = parseFloat(match[0]) || 0.12;
              }
            }
            ctx.strokeStyle = connectionColor.includes('rgba') 
              ? connectionColor.replace(/[\d.]+\)$/, `${(alpha * currentAlpha).toFixed(3)})`)
              : `${connectionColor}22`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
    />
  );
}

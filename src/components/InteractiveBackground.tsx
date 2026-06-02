import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  
  // Organic slow wandering parameters
  driftX: number;
  driftY: number;
  driftAngle: number;
  driftSpeed: number;
  driftRadius: number;

  size: number;
  color: string;
  alpha: number;
}

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const activeHoverRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Handle high density displays properly
    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      // Balance density based on viewport dimensions
      const count = Math.min(220, Math.floor((width * height) / 8000));
      
      const colors = [
        'rgba(99, 102, 241, opacity)',  // Indigo
        'rgba(168, 85, 247, opacity)',  // Purple
        'rgba(59, 130, 246, opacity)',  // Blue
        'rgba(192, 132, 252, opacity)', // Soft Violet
        'rgba(147, 51, 234, opacity)',  // Deep Purple
        'rgba(129, 140, 248, opacity)', // Light Indigo
      ];

      for (let i = 0; i < count; i++) {
        const rx = Math.random() * width;
        const ry = Math.random() * height;
        
        // Pick particle color with random basic opacity scale
        const alpha = 0.2 + Math.random() * 0.65;
        const colorTemplate = colors[Math.floor(Math.random() * colors.length)];
        const color = colorTemplate.replace('opacity', alpha.toString());

        particles.push({
          x: rx,
          y: ry,
          vx: 0,
          vy: 0,
          homeX: rx,
          homeY: ry,
          
          driftX: 0,
          driftY: 0,
          driftAngle: Math.random() * Math.PI * 2,
          driftSpeed: 0.005 + Math.random() * 0.012,
          driftRadius: 5 + Math.random() * 20,

          size: 0.7 + Math.random() * 1.5,
          color,
          alpha,
        });
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      activeHoverRef.current = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
      activeHoverRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Physics parameters
    const influenceRadius = 260; // Field of impact around the cursor
    const pullStrength = 0.38;   // Strong premium magnetic warping effect
    const springForce = 0.055;    // Spring force returning particle to equilibrium
    const friction = 0.81;       // High inertial damping for smooth motion

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const mX = mouseRef.current.x;
      const mY = mouseRef.current.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Organic passive wandering
        p.driftAngle += p.driftSpeed;
        p.driftX = Math.cos(p.driftAngle) * p.driftRadius;
        p.driftY = Math.sin(p.driftAngle) * p.driftRadius;

        // Our target destination is home + continuous wander drift
        let targetX = p.homeX + p.driftX;
        let targetY = p.homeY + p.driftY;

        // 2. Cursor gravitational attraction distortion
        if (mX !== null && mY !== null) {
          const dx = mX - targetX;
          const dy = mY - targetY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < influenceRadius) {
            // Stronger pull as cursor gets closer, mapped to smooth curve
            const ratio = (1.0 - dist / influenceRadius);
            const pullFactor = Math.pow(ratio, 2.0); // clean gravity dropoff
            
            // Deflect the target towards the cursor
            targetX += dx * pullFactor * pullStrength;
            targetY += dy * pullFactor * pullStrength;
          }
        }

        // 3. Apply physics with Inertia
        const forceX = (targetX - p.x) * springForce;
        const forceY = (targetY - p.y) * springForce;

        p.vx += forceX;
        p.vy += forceY;
        p.vx *= friction;
        p.vy *= friction;

        p.x += p.vx;
        p.y += p.vy;

        // 4. Render gorgeous glowing point
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // 5. Connect nearest neighbors for premium neural network nodes, very faintly
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 65) {
            const alphaLine = (1.0 - dist / 65) * 0.045 * Math.min(p.alpha, p2.alpha);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${alphaLine})`;
            ctx.lineWidth = 0.5;
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

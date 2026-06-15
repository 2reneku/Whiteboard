import React, { useEffect, useRef } from 'react';

interface TelemetryNode {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
  life: number; // 0 to 1
  maxLife: number;
  scale: number;
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

    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Telemetry node repository (pings and packet nodes that fade in/out)
    let pings: TelemetryNode[] = [];
    let radarAngle = 0;
    let scanlineY = 0;

    const labels = [
      'IPv4: 185.220.101.44',
      'GEO: 55.7558° N, 37.6173° E',
      'MAC: 00:1A:2B:3C:4D:5E',
      'PORT_STATUS: LISTENING',
      'DNS: tor-exit.relay.net',
      'PING OK: MS 42',
      'WHOIS: AS200021 SecureNet',
      'Subdomain detected: api.internal.org',
      'SSL Expiry Check: PASS',
      'BSSID: 80:2a:a8:c2:41:90',
      'PACKET RECVD: 512B',
      'GEO: 48.8566° N, 2.3522° E',
      'GEO: 51.5074° N, 0.1278° W',
    ];

    const sublabels = [
      'SYS_UPTIME: 1044h',
      'SEC_LEVEL: COMPROMISED',
      'OS_DETECT: Linux x86_64',
      'NODE_ROUTER: ACTIVE',
      'SERVICE: HTTPS (443)',
      'METADATA_EXTRACTED',
      'CIPHER: TLS_AES_256_GCM',
    ];

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
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

    const spawnPing = () => {
      if (pings.length > 12) return;
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      
      const label = labels[Math.floor(Math.random() * labels.length)];
      const sub = sublabels[Math.floor(Math.random() * sublabels.length)];
      
      pings.push({
        id: Math.random().toString(),
        x: rx,
        y: ry,
        label,
        sub,
        life: 1.0,
        maxLife: 200 + Math.random() * 300, // frames
        scale: 0.8 + Math.random() * 0.4,
      });
    };

    // Pre-populate some pings
    for (let k = 0; k < 6; k++) {
      spawnPing();
      pings[k].life = Math.random(); // random progress
    }

    const animate = () => {
      // Very slight backdrop persistent paint to clear
      ctx.fillStyle = '#09090b'; // Matching high-tech zinc-950
      ctx.fillRect(0, 0, width, height);

      // ────────────────────────────────────────────────────────
      // 1. DRAW TACTICAL GRID LINES
      // ────────────────────────────────────────────────────────
      const gridSize = 80;
      const mX = mouseRef.current.x;
      const mY = mouseRef.current.y;

      ctx.strokeStyle = 'rgba(39, 39, 42, 0.18)'; // Zinc-800 equivalent with very low opacity
      ctx.lineWidth = 0.5;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        for (let y = 0; y < height; y += 15) {
          // Add nice cyber-distortion near the cursor
          let drawX = x;
          if (mX !== null && mY !== null) {
            const dx = x - mX;
            const dy = y - mY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 220) {
              const force = (1.0 - dist / 220) * 8;
              drawX += dx > 0 ? force : -force;
            }
          }
          if (y === 0) ctx.moveTo(drawX, y);
          else ctx.lineTo(drawX, y);
        }
        ctx.stroke();
      }

      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        for (let x = 0; x < width; x += 15) {
          let drawY = y;
          if (mX !== null && mY !== null) {
            const dx = x - mX;
            const dy = y - mY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 220) {
              const force = (1.0 - dist / 220) * 8;
              drawY += dy > 0 ? force : -force;
            }
          }
          if (x === 0) ctx.moveTo(x, drawY);
          else ctx.lineTo(x, drawY);
        }
        ctx.stroke();
      }

      // Add small micro crosses/plus indicators on grid intersections
      ctx.fillStyle = 'rgba(63, 63, 70, 0.45)'; // Zinc-700
      for (let x = gridSize; x < width; x += gridSize * 2) {
        for (let y = gridSize; y < height; y += gridSize * 2) {
          // Draw tiny tactical '+' 4px wide
          ctx.fillRect(x - 2, y, 5, 0.5);
          ctx.fillRect(x, y - 2, 0.5, 5);
        }
      }

      // ────────────────────────────────────────────────────────
      // 2. RADAR ROTATING DEEP RADAR SWEEPER
      // ────────────────────────────────────────────────────────
      const radarX = width / 2;
      const radarY = height / 2;
      const radarRadius = Math.max(width, height) * 0.45;

      radarAngle += 0.0035;

      ctx.save();
      ctx.translate(radarX, radarY);
      
      // Draw static radar range circles (thin & dashed)
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.03)'; // soft indigo
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, radarRadius * 0.3, 0, Math.PI * 2);
      ctx.arc(0, 0, radarRadius * 0.6, 0, Math.PI * 2);
      ctx.arc(0, 0, radarRadius * 0.9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dashed lines

      // Draw sweeping sector
      const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, radarRadius);
      gradient.addColorStop(0, 'rgba(129, 140, 248, 0.04)');
      gradient.addColorStop(0.5, 'rgba(129, 140, 248, 0.015)');
      gradient.addColorStop(1, 'rgba(129, 140, 248, 0.0)');

      // Custom swept arc sector
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radarRadius, radarAngle, radarAngle + 0.38, false);
      ctx.lineTo(0, 0);
      ctx.fill();

      // Sharp line at leading edge of sweep with micro glowing line
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(radarAngle + 0.38) * radarRadius, Math.sin(radarAngle + 0.38) * radarRadius);
      ctx.stroke();

      ctx.restore();

      // ────────────────────────────────────────────────────────
      // 3. CURSOR SONAR / INTERACTIVE GLOW RING
      // ────────────────────────────────────────────────────────
      if (mX !== null && mY !== null) {
        // Draw interactive concentric target reticle
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)'; // glowing indigo
        ctx.lineWidth = 0.5;
        
        // Inner circle
        ctx.beginPath();
        ctx.arc(mX, mY, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Outer corner crop marks
        const size = 6;
        const off = 16;
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.lineWidth = 0.8;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(mX - off, mY - off + size);
        ctx.lineTo(mX - off, mY - off);
        ctx.lineTo(mX - off + size, mY - off);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(mX + off, mY - off + size);
        ctx.lineTo(mX + off, mY - off);
        ctx.lineTo(mX + off - size, mY - off);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(mX - off, mY + off - size);
        ctx.lineTo(mX - off, mY + off);
        ctx.lineTo(mX - off + size, mY + off);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(mX + off, mY + off - size);
        ctx.lineTo(mX + off, mY + off);
        ctx.lineTo(mX + off - size, mY + off);
        ctx.stroke();

        // Little coordinate string printed under cursor
        ctx.fillStyle = 'rgba(99, 102, 241, 0.45)';
        ctx.font = '6.5px "JetBrains Mono", monospace';
        ctx.fillText(`LOC: ${Math.floor(mX)}, ${Math.floor(mY)}`, mX + 22, mY + 3);
      }

      // Chance to spawn telemetry nodes
      if (Math.random() < 0.007) {
        spawnPing();
      }

      // ────────────────────────────────────────────────────────
      // 4. DRAW SYSTEM TELEMETRY NODES (PINGS & PACKETS)
      // ────────────────────────────────────────────────────────
      pings = pings.filter(p => {
        p.life -= 1 / p.maxLife;
        if (p.life <= 0) return false;

        const alpha = Math.sin(p.life * Math.PI) * 0.45; // custom bell curve transition
        const size = p.scale * 3.5;

        // Draw crosshair indicator
        ctx.strokeStyle = `rgba(129, 140, 248, ${alpha})`;
        ctx.lineWidth = 0.5;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(129, 140, 248, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fill();

        // Concentric expand sonar ripple rings
        const rippleRad = (1.0 - p.life) * 45;
        ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.4 * (1.0 - p.life)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rippleRad, 0, Math.PI * 2);
        ctx.stroke();

        // Draw HUD lines and tags
        ctx.strokeStyle = `rgba(129, 140, 248, ${alpha * 0.4})`;
        ctx.beginPath();
        ctx.moveTo(p.x + size, p.y - size);
        ctx.lineTo(p.x + size + 10, p.y - size - 10);
        ctx.lineTo(p.x + size + 90, p.y - size - 10);
        ctx.stroke();

        // Text telemetry logs
        ctx.fillStyle = `rgba(165, 180, 252, ${alpha * 0.9})`; // Indigo text
        ctx.font = '7px "JetBrains Mono", monospace';
        ctx.fillText(p.label, p.x + size + 14, p.y - size - 16);

        ctx.fillStyle = `rgba(161, 161, 170, ${alpha * 0.65})`; // Zinc dark subtext
        ctx.font = '6px "JetBrains Mono", monospace';
        ctx.fillText(p.sub, p.x + size + 14, p.y - size - 6);

        return true;
      });

      // ────────────────────────────────────────────────────────
      // 5. SUBTLE SCANLINE OVERLAY EFFECT
      // ────────────────────────────────────────────────────────
      scanlineY = (scanlineY + 1.2) % height;
      
      // Moving CRT laser scanline
      const scanGradient = ctx.createLinearGradient(0, scanlineY - 45, 0, scanlineY + 45);
      scanGradient.addColorStop(0, 'rgba(129, 140, 248, 0.0)');
      scanGradient.addColorStop(0.5, 'rgba(129, 140, 248, 0.012)');
      scanGradient.addColorStop(1, 'rgba(129, 140, 248, 0.0)');
      
      ctx.fillStyle = scanGradient;
      ctx.fillRect(0, scanlineY - 45, width, 90);

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

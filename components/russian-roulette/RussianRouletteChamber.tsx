'use client';

import React, { useEffect, useRef } from 'react';

interface RussianRouletteChamberProps {
  currentChamber: number; // 0 to 5
  isSpinning: boolean;
  lastResult: 'blank' | 'discharge' | 'timeout' | null;
  size?: number;
}

export const RussianRouletteChamber: React.FC<RussianRouletteChamberProps> = ({
  currentChamber,
  isSpinning,
  lastResult,
  size = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = (currentChamber * 60 * Math.PI) / 180;
    let targetRotation = rotation;
    let spinSpeed = isSpinning ? 0.35 : 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = canvas.width * 0.42;

      if (isSpinning) {
        rotation += spinSpeed;
        spinSpeed = Math.max(0.02, spinSpeed * 0.985);
      } else {
        // Smoothly interpolate to target chamber rotation
        targetRotation = (currentChamber * 60 * Math.PI) / 180;
        const diff = targetRotation - rotation;
        rotation += diff * 0.12;
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      // Outer cyber cylinder rim
      const gradOuter = ctx.createRadialGradient(0, 0, radius * 0.6, 0, 0, radius);
      gradOuter.addColorStop(0, '#121217');
      gradOuter.addColorStop(0.7, '#1e1e28');
      gradOuter.addColorStop(1, '#0b0b0f');

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradOuter;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#2d2d3d';
      ctx.stroke();

      // Outer ticks
      for (let i = 0; i < 24; i++) {
        const angle = (i * 15 * Math.PI) / 180;
        const x1 = Math.cos(angle) * (radius - 2);
        const y1 = Math.sin(angle) * (radius - 2);
        const x2 = Math.cos(angle) * (radius - (i % 4 === 0 ? 10 : 5));
        const y2 = Math.sin(angle) * (radius - (i % 4 === 0 ? 10 : 5));

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = i % 4 === 0 ? 2 : 1;
        ctx.stroke();
      }

      // Draw 6 Chambers
      const chamberRadius = radius * 0.22;
      const chamberDistance = radius * 0.6;

      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 * Math.PI) / 180;
        const chX = Math.cos(angle) * chamberDistance;
        const chY = Math.sin(angle) * chamberDistance;

        const isCurrentChamber = i === currentChamber;

        // Chamber hole background
        ctx.beginPath();
        ctx.arc(chX, chY, chamberRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#07070a';
        ctx.fill();
        ctx.lineWidth = 2.5;

        if (isCurrentChamber && lastResult === 'discharge') {
          ctx.strokeStyle = '#ef4444'; // Red flash
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 15;
        } else if (isCurrentChamber && lastResult === 'blank') {
          ctx.strokeStyle = '#10b981'; // Green blank click
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 10;
        } else if (isCurrentChamber) {
          ctx.strokeStyle = '#f59e0b'; // Amber active
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(chX, chY, chamberRadius * 0.45, 0, Math.PI * 2);
        if (isCurrentChamber && lastResult === 'discharge') {
          ctx.fillStyle = '#f87171';
        } else if (isCurrentChamber && lastResult === 'blank') {
          ctx.fillStyle = '#34d399';
        } else if (isCurrentChamber) {
          ctx.fillStyle = '#fbbf24';
        } else {
          ctx.fillStyle = '#1c1c24';
        }
        ctx.fill();

        // Chamber index label
        ctx.save();
        ctx.fillStyle = isCurrentChamber ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), chX, chY);
        ctx.restore();
      }

      // Center pivot cap
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = '#181822';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3b3b4f';
      ctx.stroke();

      // Center hex screw
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();

      ctx.restore();

      // Top firing pin indicator (stationary arrow)
      ctx.save();
      ctx.translate(cx, cy - radius - 6);
      ctx.beginPath();
      ctx.moveTo(-7, -8);
      ctx.lineTo(7, -8);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentChamber, isSpinning, lastResult]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: `${size}px`, maxWidth: '100%', height: 'auto', aspectRatio: '1 / 1' }}
        className="drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
      />
    </div>
  );
};

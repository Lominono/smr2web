'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { sound } from '@/lib/audio';
import { RotateCcw, Coins, Trophy, Zap, AlertTriangle, Share2, Target, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AngryCableGameProps {
  userCoins: number;
  onUpdateCoins: (delta: number) => void;
  onBroadcastWin: (game: 'angry', multiplier: number, winAmount: number) => void;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  hp: number;
  maxHp: number;
  type: 'server' | 'crate' | 'multiplier_2x' | 'multiplier_5x' | 'multiplier_10x' | 'jackpot_25x' | 'jackpot_50x' | 'tnt';
  destroyed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export const AngryCableGame: React.FC<AngryCableGameProps> = ({
  userCoins,
  onUpdateCoins,
  onBroadcastWin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [bet, setBet] = useState<number>(100);
  const [gameState, setGameState] = useState<'aiming' | 'flying' | 'resolved'>('aiming');
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [hasBoosted, setHasBoosted] = useState<boolean>(false);
  const [lastWin, setLastWin] = useState<{ amount: number; multiplier: number; comboBonus?: boolean } | null>(null);
  const [bragged, setBragged] = useState(false);

  // Logical coordinate space
  const LOGICAL_WIDTH = 840;
  const LOGICAL_HEIGHT = 420;
  const groundY = 380;
  const slingshotAnchor = { x: 130, y: groundY - 80 };
  const maxPullRadius = 85;

  const isDraggingRef = useRef(false);
  const dragPosRef = useRef({ x: slingshotAnchor.x, y: slingshotAnchor.y });

  const projectileRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    active: boolean;
    hasLanded: boolean;
    restTimer: number;
  }>({
    x: slingshotAnchor.x,
    y: slingshotAnchor.y,
    vx: 0,
    vy: 0,
    radius: 13,
    active: false,
    hasLanded: false,
    restTimer: 0,
  });

  const blocksRef = useRef<Block[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const shakeRef = useRef(0);
  const slowMoRef = useRef(0);
  const hitMultipliersRef = useRef<number[]>([]);

  const resetLevel = useCallback((targetLevel?: number) => {
    const lvl = targetLevel !== undefined ? targetLevel : currentLevel;
    const blocks: Block[] = [];
    const baseStartX = 510;

    if (lvl === 1) {
      // Nivel 1: Bastidor Central
      blocks.push({ x: baseStartX, y: groundY - 42, w: 72, h: 42, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
      blocks.push({ x: baseStartX, y: groundY - 84, w: 72, h: 42, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
      blocks.push({ x: baseStartX + 12, y: groundY - 126, w: 48, h: 42, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_2x', destroyed: false });

      const col2X = baseStartX + 96;
      blocks.push({ x: col2X, y: groundY - 45, w: 46, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'crate', destroyed: false });
      blocks.push({ x: col2X, y: groundY - 90, w: 46, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'tnt', destroyed: false });
      blocks.push({ x: col2X, y: groundY - 135, w: 46, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_5x', destroyed: false });

      const col3X = baseStartX + 162;
      blocks.push({ x: col3X, y: groundY - 42, w: 72, h: 42, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
      blocks.push({ x: col3X, y: groundY - 84, w: 72, h: 42, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
      blocks.push({ x: col3X + 12, y: groundY - 128, w: 48, h: 44, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_10x', destroyed: false });

      blocks.push({ x: baseStartX + 36, y: groundY - 168, w: 146, h: 18, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'crate', destroyed: false });
      blocks.push({ x: baseStartX + 84, y: groundY - 220, w: 50, h: 52, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'jackpot_25x', destroyed: false });
    } else if (lvl === 2) {
      // Nivel 2: Puente Cortafuegos de Doble Bastión
      const leftX = baseStartX - 30;
      blocks.push({ x: leftX, y: groundY - 45, w: 60, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
      blocks.push({ x: leftX, y: groundY - 90, w: 60, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_5x', destroyed: false });
      blocks.push({ x: leftX + 8, y: groundY - 135, w: 44, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'tnt', destroyed: false });

      const midX = leftX + 88;
      blocks.push({ x: midX, y: groundY - 45, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'tnt', destroyed: false });
      blocks.push({ x: midX, y: groundY - 90, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_2x', destroyed: false });

      const rightX = leftX + 160;
      blocks.push({ x: rightX, y: groundY - 45, w: 60, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
      blocks.push({ x: rightX, y: groundY - 90, w: 60, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
      blocks.push({ x: rightX + 6, y: groundY - 135, w: 48, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_10x', destroyed: false });

      blocks.push({ x: leftX + 10, y: groundY - 170, w: 195, h: 18, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'crate', destroyed: false });
      blocks.push({ x: leftX + 82, y: groundY - 222, w: 52, h: 52, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'jackpot_25x', destroyed: false });
    } else {
      // Nivel 3: Fortaleza SysAdmin (Bóveda Suprema x50)
      const start = baseStartX - 45;
      blocks.push({ x: start, y: groundY - 44, w: 54, h: 44, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
      blocks.push({ x: start, y: groundY - 88, w: 54, h: 44, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_5x', destroyed: false });
      blocks.push({ x: start + 5, y: groundY - 132, w: 44, h: 44, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'tnt', destroyed: false });

      const c2 = start + 78;
      blocks.push({ x: c2, y: groundY - 45, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'tnt', destroyed: false });
      blocks.push({ x: c2, y: groundY - 90, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_10x', destroyed: false });
      blocks.push({ x: c2, y: groundY - 135, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'tnt', destroyed: false });

      const c3 = start + 148;
      blocks.push({ x: c3, y: groundY - 44, w: 54, h: 44, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
      blocks.push({ x: c3, y: groundY - 88, w: 54, h: 44, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
      blocks.push({ x: c3, y: groundY - 132, w: 54, h: 44, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_10x', destroyed: false });

      blocks.push({ x: start + 8, y: groundY - 165, w: 184, h: 18, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'crate', destroyed: false });
      blocks.push({ x: start + 38, y: groundY - 198, w: 124, h: 18, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'crate', destroyed: false });
      blocks.push({ x: start + 72, y: groundY - 254, w: 56, h: 56, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'jackpot_50x', destroyed: false });
    }

    blocksRef.current = blocks;
    hitMultipliersRef.current = [];
    particlesRef.current = [];
    floatingTextsRef.current = [];
    shakeRef.current = 0;
    slowMoRef.current = 0;

    projectileRef.current = {
      x: slingshotAnchor.x,
      y: slingshotAnchor.y,
      vx: 0,
      vy: 0,
      radius: 13,
      active: false,
      hasLanded: false,
      restTimer: 0,
    };

    dragPosRef.current = { x: slingshotAnchor.x, y: slingshotAnchor.y };
    setGameState('aiming');
    setHasBoosted(false);
    setLastWin(null);
    setBragged(false);
  }, [currentLevel, slingshotAnchor.x, slingshotAnchor.y]);

  useEffect(() => {
    resetLevel();
  }, [resetLevel]);

  // High-DPI canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      
      // Ensure canvas internal resolution matches display aspect ratio
      const rect = canvas.getBoundingClientRect();
      const targetWidth = Math.floor(rect.width * dpr);
      const targetHeight = Math.floor((rect.width * (LOGICAL_HEIGHT / LOGICAL_WIDTH)) * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      ctx.save();
      const scaleX = canvas.width / LOGICAL_WIDTH;
      const scaleY = canvas.height / LOGICAL_HEIGHT;
      ctx.scale(scaleX, scaleY);

      let timeStep = 1;
      if (slowMoRef.current > 0) {
        timeStep = 0.28;
        slowMoRef.current--;
      }

      let offsetX = 0;
      let offsetY = 0;
      if (shakeRef.current > 0) {
        offsetX = (Math.random() - 0.5) * shakeRef.current;
        offsetY = (Math.random() - 0.5) * shakeRef.current;
        shakeRef.current *= 0.88;
        if (shakeRef.current < 0.3) shakeRef.current = 0;
      }

      ctx.translate(offsetX, offsetY);

      // 1. Solid matte graphite background
      ctx.fillStyle = '#0a0a0d';
      ctx.fillRect(-20, -20, LOGICAL_WIDTH + 40, LOGICAL_HEIGHT + 40);

      // 2. Precision technical grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      for (let x = 0; x < LOGICAL_WIDTH; x += 35) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, LOGICAL_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < LOGICAL_HEIGHT; y += 35) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LOGICAL_WIDTH, y);
        ctx.stroke();
      }

      // Ground plane
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(LOGICAL_WIDTH, groundY);
      ctx.stroke();

      // Slingshot fork structure
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(slingshotAnchor.x, groundY);
      ctx.lineTo(slingshotAnchor.x, slingshotAnchor.y + 18);
      ctx.lineTo(slingshotAnchor.x - 14, slingshotAnchor.y - 12);
      ctx.moveTo(slingshotAnchor.x, slingshotAnchor.y + 18);
      ctx.lineTo(slingshotAnchor.x + 14, slingshotAnchor.y - 12);
      ctx.stroke();

      const proj = projectileRef.current;

      // Slingshot Bands & Aiming
      if (!proj.active && !proj.hasLanded) {
        const pullPos = isDraggingRef.current ? dragPosRef.current : slingshotAnchor;

        // Dynamic tension color
        const pullDist = Math.sqrt((pullPos.x - slingshotAnchor.x) ** 2 + (pullPos.y - slingshotAnchor.y) ** 2);
        const tensionRatio = Math.min(pullDist / maxPullRadius, 1);
        const bandColor = tensionRatio > 0.8 ? '#f43f5e' : tensionRatio > 0.5 ? '#f59e0b' : '#10b981';

        // Back elastic band
        ctx.strokeStyle = bandColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(slingshotAnchor.x - 12, slingshotAnchor.y - 10);
        ctx.lineTo(pullPos.x, pullPos.y);
        ctx.stroke();

        // Projectile RJ-45 body
        ctx.save();
        ctx.translate(pullPos.x, pullPos.y);
        const aimAngle = isDraggingRef.current
          ? Math.atan2(slingshotAnchor.y - pullPos.y, slingshotAnchor.x - pullPos.x)
          : 0;
        ctx.rotate(aimAngle);

        ctx.fillStyle = '#059669';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-13, -8, 26, 16, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        for (let pIdx = -5; pIdx <= 5; pIdx += 2) {
          ctx.fillRect(9, pIdx - 0.5, 3.5, 1);
        }
        ctx.restore();

        // Front elastic band
        ctx.strokeStyle = bandColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(slingshotAnchor.x + 12, slingshotAnchor.y - 10);
        ctx.lineTo(pullPos.x, pullPos.y);
        ctx.stroke();

        // Trajectory arc dots with landing prediction ring
        if (isDraggingRef.current) {
          const launchVx = (slingshotAnchor.x - pullPos.x) * 0.22;
          const launchVy = (slingshotAnchor.y - pullPos.y) * 0.22;
          let simX = pullPos.x;
          let simY = pullPos.y;
          let simVx = launchVx;
          let simVy = launchVy;
          let impactX = simX;
          let impactY = groundY;

          for (let step = 0; step < 36; step++) {
            simX += simVx * 1.5;
            simY += simVy * 1.5;
            simVy += 0.35 * 1.5;
            if (simY >= groundY) {
              impactX = simX;
              impactY = groundY;
              break;
            }

            const alpha = Math.max(0.12, 0.85 - step * 0.022);
            ctx.fillStyle = `rgba(52, 211, 153, ${alpha})`;
            ctx.beginPath();
            ctx.arc(simX, simY, Math.max(1.5, 3.2 - step * 0.06), 0, Math.PI * 2);
            ctx.fill();
          }

          // Target landing ring on the ground
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(impactX, impactY - 2, 10, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Flying projectile
      if (proj.active) {
        proj.vx *= 0.995;
        proj.vy += 0.35 * timeStep;
        proj.x += proj.vx * timeStep;
        proj.y += proj.vy * timeStep;

        if (Math.random() > 0.3) {
          particlesRef.current.push({
            x: proj.x,
            y: proj.y,
            vx: (Math.random() - 0.5) * 1.2 - proj.vx * 0.08,
            vy: (Math.random() - 0.5) * 1.2 - proj.vy * 0.08,
            life: 1,
            maxLife: 18 + Math.random() * 8,
            color: '#10b981',
            size: 2.5 + Math.random() * 2,
          });
        }

        // Floor collision
        if (proj.y + proj.radius >= groundY) {
          proj.y = groundY - proj.radius;
          proj.vy = -proj.vy * 0.42;
          proj.vx *= 0.8;
          if (Math.abs(proj.vy) < 0.5) {
            proj.vy = 0;
            proj.restTimer += 1;
          }
        }

        if (proj.x - proj.radius < 0) {
          proj.x = proj.radius;
          proj.vx = -proj.vx * 0.5;
        }
        if (proj.x + proj.radius > LOGICAL_WIDTH) {
          proj.restTimer = 100;
        }

        // Projectile RJ-45 connector rendering
        ctx.save();
        ctx.translate(proj.x, proj.y);
        const heading = Math.atan2(proj.vy, proj.vx);
        ctx.rotate(heading);

        // Turbo exhaust trail
        if (hasBoosted) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(-14, -6);
          ctx.lineTo(-30 - Math.random() * 8, 0);
          ctx.lineTo(-14, 6);
          ctx.closePath();
          ctx.fill();
        }

        // RJ-45 crystal housing
        ctx.fillStyle = hasBoosted ? '#0284c7' : '#059669';
        ctx.strokeStyle = hasBoosted ? '#38bdf8' : '#34d399';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-13, -8, 26, 16, 3);
        ctx.fill();
        ctx.stroke();

        // 8 Gold Contact Pins
        ctx.fillStyle = '#fbbf24';
        for (let pIdx = -5; pIdx <= 5; pIdx += 2) {
          ctx.fillRect(9, pIdx - 0.5, 3.5, 1);
        }

        // Locking Tab clip
        ctx.fillStyle = hasBoosted ? '#bae6fd' : '#a7f3d0';
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(4, -12);
        ctx.lineTo(5, -8);
        ctx.closePath();
        ctx.fill();

        // Wire jacket out the back
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-13, 0);
        ctx.lineTo(-24, 0);
        ctx.stroke();

        ctx.restore();

        if (Math.abs(proj.vx) < 0.3 && Math.abs(proj.vy) < 0.3 && proj.y + proj.radius >= groundY - 2) {
          proj.restTimer += 1;
        }

        if (proj.restTimer > 45 && !proj.hasLanded) {
          proj.active = false;
          proj.hasLanded = true;
          handleRoundEnd();
        }
      }

      // Blocks rendering & physics
      blocksRef.current.forEach((block) => {
        if (block.destroyed) return;

        if (block.vx !== 0 || block.vy !== 0 || block.y + block.h < groundY) {
          block.vy += 0.35 * timeStep;
          block.vx *= 0.96;
          block.x += block.vx * timeStep;
          block.y += block.vy * timeStep;
          block.angle += block.vAngle * timeStep;

          if (block.y + block.h >= groundY) {
            block.y = groundY - block.h;
            block.vy = -block.vy * 0.3;
            block.vx *= 0.7;
            block.vAngle *= 0.6;
          }
        }

        // Collision check
        if (proj.active) {
          const nearestX = Math.max(block.x, Math.min(proj.x, block.x + block.w));
          const nearestY = Math.max(block.y, Math.min(proj.y, block.y + block.h));
          const distSq = (proj.x - nearestX) ** 2 + (proj.y - nearestY) ** 2;

          if (distSq < proj.radius ** 2) {
            const impactSpeed = Math.sqrt(proj.vx ** 2 + proj.vy ** 2);
            shakeRef.current = Math.min(18, impactSpeed * 2);
            sound.impact(Math.min(1.3, impactSpeed * 0.2));

            block.vx = proj.vx * 0.45;
            block.vy = proj.vy * 0.35 - 1.5;
            block.vAngle = (Math.random() - 0.5) * 0.12;

            proj.vx *= 0.45;
            proj.vy *= 0.45;

            block.hp -= 1;
            if (block.hp <= 0) {
              block.destroyed = true;

              for (let i = 0; i < 14; i++) {
                particlesRef.current.push({
                  x: block.x + block.w / 2,
                  y: block.y + block.h / 2,
                  vx: (Math.random() - 0.5) * 7,
                  vy: (Math.random() - 0.5) * 7 - 2,
                  life: 1,
                  maxLife: 24 + Math.random() * 16,
                  color: block.type.includes('multiplier') ? '#eab308' : '#71717a',
                  size: 2 + Math.random() * 2.5,
                });
              }

              if (block.type === 'tnt') {
                sound.crashExplode();
                shakeRef.current = 24;
                slowMoRef.current = 14;
                blocksRef.current.forEach((other) => {
                  if (!other.destroyed) {
                    const dx = other.x - block.x;
                    const dy = other.y - block.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 160) {
                      other.vx += (dx / d) * 9;
                      other.vy -= 6;
                      other.hp -= 2;
                      if (other.hp <= 0) other.destroyed = true;
                    }
                  }
                });
              }

              let mult = 0;
              if (block.type === 'multiplier_2x') mult = 2;
              if (block.type === 'multiplier_5x') mult = 5;
              if (block.type === 'multiplier_10x') mult = 10;
              if (block.type === 'jackpot_25x') mult = 25;
              if (block.type === 'jackpot_50x') mult = 50;

              if (mult > 0) {
                hitMultipliersRef.current.push(mult);
                if (mult >= 10) {
                  sound.jackpot();
                  slowMoRef.current = 18;
                } else {
                  sound.coinWin();
                }

                floatingTextsRef.current.push({
                  x: block.x + block.w / 2,
                  y: block.y - 12,
                  text: `x${mult}`,
                  color: '#fbbf24',
                  life: 38,
                });
              }
            }
          }
        }

        // Draw individual block with clean craftsmanship
        ctx.save();
        ctx.translate(block.x + block.w / 2, block.y + block.h / 2);
        ctx.rotate(block.angle);

        if (block.type === 'server') {
          // Dark titanium hardware unit
          ctx.fillStyle = '#18181b';
          ctx.strokeStyle = '#27272a';
          ctx.lineWidth = 1;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

          // Subtle hardware vent lines
          ctx.strokeStyle = '#27272a';
          ctx.beginPath();
          ctx.moveTo(-block.w / 2 + 10, -2);
          ctx.lineTo(block.w / 2 - 10, -2);
          ctx.moveTo(-block.w / 2 + 10, 4);
          ctx.lineTo(block.w / 2 - 10, 4);
          ctx.stroke();

          // Small LED
          ctx.fillStyle = block.hp > 1 ? '#10b981' : '#f43f5e';
          ctx.beginPath();
          ctx.arc(-block.w / 2 + 8, -block.h / 2 + 8, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (block.type === 'tnt') {
          // Tactical red block
          ctx.fillStyle = '#7f1d1d';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('TNT', 0, 0);
        } else if (block.type.includes('multiplier') || block.type.includes('jackpot')) {
          // Precision amber/gold vault
          const isJ50 = block.type === 'jackpot_50x';
          ctx.fillStyle = isJ50 ? '#381604' : '#291e0a';
          ctx.strokeStyle = isJ50 ? '#f59e0b' : '#d97706';
          ctx.lineWidth = isJ50 ? 2 : 1.5;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

          ctx.fillStyle = isJ50 ? '#fef08a' : '#fbbf24';
          ctx.font = isJ50 ? 'bold 12px monospace' : 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label =
            block.type === 'jackpot_50x'
              ? '★ x50'
              : block.type === 'jackpot_25x'
              ? 'x25'
              : block.type === 'multiplier_10x'
              ? 'x10'
              : block.type === 'multiplier_5x'
              ? 'x5'
              : 'x2';
          ctx.fillText(label, 0, 0);
        } else {
          // Standard dark crate
          ctx.fillStyle = '#202024';
          ctx.strokeStyle = '#323238';
          ctx.lineWidth = 1;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);
        }

        // Damage stress cracks if partially damaged
        if (block.hp < block.maxHp && !block.destroyed) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(-block.w * 0.25, -block.h * 0.3);
          ctx.lineTo(block.w * 0.08, -block.h * 0.05);
          ctx.lineTo(-block.w * 0.1, block.h * 0.25);
          ctx.stroke();
        }

        ctx.restore();
      });

      // Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * timeStep;
        p.y += p.vy * timeStep;
        p.vy += 0.2;
        p.life++;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Floating Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= 0.8;
        ft.life--;

        ctx.fillStyle = ft.color;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.min(1, ft.life / 20);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;

        if (ft.life <= 0) {
          floatingTextsRef.current.splice(i, 1);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleRoundEnd = () => {
    const destroyedCount = blocksRef.current.filter((b) => b.destroyed).length;
    const cratesMults = hitMultipliersRef.current.reduce((sum, m) => sum + m, 0);

    let totalMult = cratesMults;
    const isCombo = hitMultipliersRef.current.length >= 2;
    if (isCombo) {
      // Combo multiplier reward +25%
      totalMult = Math.round(totalMult * 1.25 * 10) / 10;
    }
    if (destroyedCount >= 3 && cratesMults === 0) totalMult = 1.5;
    if (destroyedCount >= 6 && cratesMults === 0) totalMult = 3.0;

    if (totalMult > 0) {
      const winAmount = Math.round(bet * totalMult);
      onUpdateCoins(winAmount);
      setLastWin({ amount: winAmount, multiplier: totalMult, comboBonus: isCombo });
      sound.coinWin();

      if (totalMult >= 5) {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } else {
      setLastWin({ amount: 0, multiplier: 0, comboBonus: false });
      sound.broke();
    }

    setGameState('resolved');
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_WIDTH / rect.width;
    const scaleY = LOGICAL_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // 1. In-flight Turbo Boost ability
    if (gameState === 'flying') {
      const proj = projectileRef.current;
      if (proj.active && !hasBoosted) {
        setHasBoosted(true);
        proj.vx *= 1.4;
        proj.vy = Math.min(proj.vy * 0.7, -2.4);
        sound.turboBoost();
        shakeRef.current = 14;

        for (let i = 0; i < 24; i++) {
          particlesRef.current.push({
            x: proj.x,
            y: proj.y,
            vx: (Math.random() - 0.5) * 8 - proj.vx * 0.15,
            vy: (Math.random() - 0.5) * 8 - proj.vy * 0.15,
            life: 1,
            maxLife: 22 + Math.random() * 10,
            color: Math.random() > 0.4 ? '#38bdf8' : '#fbbf24',
            size: 3 + Math.random() * 3,
          });
        }

        floatingTextsRef.current.push({
          x: proj.x,
          y: proj.y - 20,
          text: '¡TURBO IMPULSO!',
          color: '#38bdf8',
          life: 34,
        });
      }
      return;
    }

    if (gameState !== 'aiming') return;
    if (userCoins < bet) {
      sound.broke();
      return;
    }

    const { x, y } = getCanvasCoords(e);
    const dist = Math.sqrt((x - slingshotAnchor.x) ** 2 + (y - slingshotAnchor.y) ** 2);
    if (dist < 80) {
      isDraggingRef.current = true;
      dragPosRef.current = { x, y };
      sound.tap();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    let { x, y } = getCanvasCoords(e);

    const dx = x - slingshotAnchor.x;
    const dy = y - slingshotAnchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxPullRadius) {
      x = slingshotAnchor.x + (dx / dist) * maxPullRadius;
      y = slingshotAnchor.y + (dy / dist) * maxPullRadius;
    }

    dragPosRef.current = { x, y };
    sound.slingshotStretch(dist / maxPullRadius);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const pull = dragPosRef.current;
    const dx = slingshotAnchor.x - pull.x;
    const dy = slingshotAnchor.y - pull.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 18) {
      onUpdateCoins(-bet);
      setGameState('flying');
      sound.whoosh();

      projectileRef.current = {
        x: slingshotAnchor.x,
        y: slingshotAnchor.y,
        vx: dx * 0.22,
        vy: dy * 0.22,
        radius: 13,
        active: true,
        hasLanded: false,
        restTimer: 0,
      };
    } else {
      dragPosRef.current = { x: slingshotAnchor.x, y: slingshotAnchor.y };
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    dragPosRef.current = { x: slingshotAnchor.x, y: slingshotAnchor.y };
  };

  const handleBrag = () => {
    if (!lastWin || bragged) return;
    onBroadcastWin('angry', lastWin.multiplier, lastWin.amount);
    setBragged(true);
    sound.coinWin();
  };

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6 shadow-[0_16px_50px_rgba(0,0,0,0.6)] flex flex-col items-center border border-white/[0.08]">
      {/* Top Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between sm:justify-start gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-white font-mono">
                  Slingshot
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  {currentLevel === 3 ? 'Bote x50' : 'Bote x25'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                {currentLevel === 1 ? 'Nivel 1: Bastidor Rack' : currentLevel === 2 ? 'Nivel 2: Doble Búnker' : 'Nivel 3: Fortaleza SysAdmin'}
              </p>
            </div>
          </div>

          {/* Level Switcher */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                type="button"
                disabled={gameState === 'flying'}
                onClick={() => {
                  setCurrentLevel(lvl);
                  resetLevel(lvl);
                  sound.tap();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  currentLevel === lvl
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Nivel {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              resetLevel();
              sound.tap();
            }}
            title="Reiniciar torre"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer ml-auto sm:ml-2 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bet Switcher */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1 bg-black/50 p-2 rounded-2xl border border-white/[0.08] overflow-x-auto scrollbar-none shadow-inner">
          <span className="text-xs font-mono text-zinc-400 px-1.5 flex items-center gap-1.5 shrink-0 font-medium">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Apuesta:</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={gameState === 'flying'}
              onClick={() => {
                setBet((prev) => Math.max(10, Math.floor(prev / 2)));
                sound.tap();
              }}
              className="min-h-[36px] px-2 py-1 rounded-xl text-xs font-mono font-medium text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.06] active:scale-95 cursor-pointer"
            >
              ½
            </button>
            <button
              type="button"
              disabled={gameState === 'flying'}
              onClick={() => {
                setBet((prev) => Math.min(Math.min(userCoins, 10000), prev * 2));
                sound.tap();
              }}
              className="min-h-[36px] px-2 py-1 rounded-xl text-xs font-mono font-medium text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.06] active:scale-95 cursor-pointer"
            >
              2×
            </button>
            {[50, 100, 250, 500].map((amount) => (
              <button
                key={amount}
                disabled={gameState === 'flying'}
                onClick={() => {
                  setBet(amount);
                  sound.tap();
                }}
                className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer shrink-0 active:scale-95 ${
                  bet === amount
                    ? 'bg-zinc-200 text-black font-semibold shadow-sm'
                    : 'text-zinc-400 hover:text-white bg-white/[0.02] border border-white/[0.04]'
                }`}
              >
                {amount}
              </button>
            ))}
            <button
              type="button"
              disabled={gameState === 'flying'}
              onClick={() => {
                setBet(Math.min(userCoins > 0 ? userCoins : 1000, 2500));
                sound.tap();
              }}
              className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 active:scale-95 ${
                bet >= 2500 || bet === userCoins
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20'
              }`}
            >
              MÁX
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0d]">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="w-full h-auto cursor-crosshair touch-none select-none block aspect-[2/1]"
        />

        {gameState === 'aiming' && (
          <div className="absolute top-3 left-3 pointer-events-none bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Arrastra el conector RJ-45 hacia atrás para disparar</span>
          </div>
        )}

        {gameState === 'flying' && (
          <div className="absolute top-3 left-3 pointer-events-none bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs text-amber-300 font-mono flex items-center gap-2 animate-bounce">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{!hasBoosted ? '¡Toca la pantalla para activar el Turbo en vuelo!' : '¡Turbo activado!'}</span>
          </div>
        )}

        {/* Resolution Banner */}
        {gameState === 'resolved' && lastWin && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
            {lastWin.multiplier > 0 ? (
              <>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">
                    Impacto exitoso
                  </span>
                  {lastWin.comboBonus && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                      ¡COMBO x1.25!
                    </span>
                  )}
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold text-white font-mono mt-0.5">
                  +{lastWin.amount.toLocaleString()} fichas
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Multiplicador x{lastWin.multiplier.toFixed(1)} en Nivel {currentLevel}
                </p>

                <div className="flex items-center gap-2 mt-5 flex-wrap justify-center">
                  <button
                    onClick={() => {
                      resetLevel();
                      sound.tap();
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-medium border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Repetir nivel</span>
                  </button>

                  {currentLevel < 3 && (
                    <button
                      onClick={() => {
                        const nextLvl = currentLevel + 1;
                        setCurrentLevel(nextLvl);
                        resetLevel(nextLvl);
                        sound.coinWin();
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                    >
                      <span>Avanzar a Nivel {currentLevel + 1}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={handleBrag}
                    disabled={bragged}
                    className={`px-4 py-2 rounded-xl font-mono text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      bragged
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white hover:bg-zinc-200 text-black font-semibold'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{bragged ? 'Compartido' : 'Enviar a chat'}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white font-mono">
                  Tiro sin impacto
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  No se alcanzaron multiplicadores en este tiro.
                </p>

                <button
                  onClick={() => {
                    resetLevel();
                    sound.tap();
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-medium border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Intentar de nuevo</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

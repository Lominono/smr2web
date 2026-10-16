'use client';

import React, { useRef, useState, useEffect } from 'react';
import { sound } from '@/lib/audio';
import { Sparkles, RefreshCw, Flame, Coins, Trophy, Zap, ShieldAlert, Award } from 'lucide-react';
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
  type: 'server' | 'crate' | 'multiplier_2x' | 'multiplier_5x' | 'multiplier_10x' | 'jackpot_25x' | 'tnt';
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

  // Betting states
  const [bet, setBet] = useState<number>(100);
  const [gameState, setGameState] = useState<'aiming' | 'flying' | 'resolved'>('aiming');
  const [lastWin, setLastWin] = useState<{ amount: number; multiplier: number } | null>(null);
  const [bragged, setBragged] = useState(false);

  // Physics constants
  const groundY = 380;
  const slingshotAnchor = { x: 130, y: groundY - 80 };
  const maxPullRadius = 85;

  // Drag state
  const isDraggingRef = useRef(false);
  const dragPosRef = useRef({ x: slingshotAnchor.x, y: slingshotAnchor.y });

  // Projectile state
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
    radius: 14,
    active: false,
    hasLanded: false,
    restTimer: 0,
  });

  // Level blocks & particles
  const blocksRef = useRef<Block[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const shakeRef = useRef(0);
  const slowMoRef = useRef(0);
  const hitMultipliersRef = useRef<number[]>([]);
  const totalBlocksCountRef = useRef(0);

  // Initialize level blocks
  const resetLevel = () => {
    const blocks: Block[] = [];
    const baseStartX = 520;

    // Tower 1: The Server Stack
    blocks.push({ x: baseStartX, y: groundY - 40, w: 70, h: 40, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
    blocks.push({ x: baseStartX, y: groundY - 80, w: 70, h: 40, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
    blocks.push({ x: baseStartX + 10, y: groundY - 120, w: 50, h: 40, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_2x', destroyed: false });

    // Tower 2: High Stakes Rack with Multipliers & TNT
    const col2X = baseStartX + 95;
    blocks.push({ x: col2X, y: groundY - 45, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'crate', destroyed: false });
    blocks.push({ x: col2X, y: groundY - 90, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'tnt', destroyed: false });
    blocks.push({ x: col2X, y: groundY - 135, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_5x', destroyed: false });

    // Tower 3: Golden Jackpot Vault on Top
    const col3X = baseStartX + 160;
    blocks.push({ x: col3X, y: groundY - 40, w: 70, h: 40, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
    blocks.push({ x: col3X, y: groundY - 80, w: 70, h: 40, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
    blocks.push({ x: col3X + 10, y: groundY - 125, w: 50, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_10x', destroyed: false });

    // Crown / Golden Jacktop Crate balancing on beam
    blocks.push({ x: baseStartX + 40, y: groundY - 165, w: 140, h: 18, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'crate', destroyed: false });
    blocks.push({ x: baseStartX + 85, y: groundY - 215, w: 50, h: 50, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'jackpot_25x', destroyed: false });

    blocksRef.current = blocks;
    totalBlocksCountRef.current = blocks.length;
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
      radius: 14,
      active: false,
      hasLanded: false,
      restTimer: 0,
    };

    dragPosRef.current = { x: slingshotAnchor.x, y: slingshotAnchor.y };
    setGameState('aiming');
    setLastWin(null);
    setBragged(false);
  };

  useEffect(() => {
    resetLevel();
  }, []);

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      // Slow-mo check
      let timeStep = 1;
      if (slowMoRef.current > 0) {
        timeStep = 0.25;
        slowMoRef.current--;
      }

      // Screen shake decay
      let offsetX = 0;
      let offsetY = 0;
      if (shakeRef.current > 0) {
        offsetX = (Math.random() - 0.5) * shakeRef.current;
        offsetY = (Math.random() - 0.5) * shakeRef.current;
        shakeRef.current *= 0.88;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
      }

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // 1. Clear background
      ctx.fillStyle = '#08090e';
      ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);

      // Subtle Apple style grid background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Ground line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();

      // Slingshot Base & Post
      ctx.strokeStyle = '#383842';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(slingshotAnchor.x, groundY);
      ctx.lineTo(slingshotAnchor.x, slingshotAnchor.y + 15);
      ctx.lineTo(slingshotAnchor.x - 14, slingshotAnchor.y - 12);
      ctx.moveTo(slingshotAnchor.x, slingshotAnchor.y + 15);
      ctx.lineTo(slingshotAnchor.x + 14, slingshotAnchor.y - 12);
      ctx.stroke();

      const proj = projectileRef.current;

      // Draw Slingshot Bands if aiming or dragging
      if (!proj.active && !proj.hasLanded) {
        const pullPos = isDraggingRef.current ? dragPosRef.current : slingshotAnchor;

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        // Back band
        ctx.beginPath();
        ctx.moveTo(slingshotAnchor.x - 12, slingshotAnchor.y - 10);
        ctx.lineTo(pullPos.x, pullPos.y);
        ctx.stroke();

        // Projectile in pocket
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(pullPos.x, pullPos.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();

        // Glowing core
        ctx.fillStyle = '#6ee7b7';
        ctx.beginPath();
        ctx.arc(pullPos.x, pullPos.y, proj.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Front band
        ctx.beginPath();
        ctx.moveTo(slingshotAnchor.x + 12, slingshotAnchor.y - 10);
        ctx.lineTo(pullPos.x, pullPos.y);
        ctx.stroke();

        // Predictive Trajectory Dots when dragging
        if (isDraggingRef.current) {
          const launchVx = (slingshotAnchor.x - pullPos.x) * 0.22;
          const launchVy = (slingshotAnchor.y - pullPos.y) * 0.22;
          let simX = pullPos.x;
          let simY = pullPos.y;
          let simVx = launchVx;
          let simVy = launchVy;

          ctx.fillStyle = 'rgba(52, 211, 153, 0.6)';
          for (let step = 0; step < 26; step++) {
            simX += simVx * 1.5;
            simY += simVy * 1.5;
            simVy += 0.35 * 1.5; // Gravity
            if (simY > groundY) break;

            if (step % 2 === 0) {
              ctx.beginPath();
              ctx.arc(simX, simY, Math.max(1.5, 4 - step * 0.12), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Update and Draw Flying Projectile
      if (proj.active) {
        proj.vx *= 0.995;
        proj.vy += 0.35 * timeStep; // Gravity
        proj.x += proj.vx * timeStep;
        proj.y += proj.vy * timeStep;

        // Particle trail
        if (Math.random() > 0.3) {
          particlesRef.current.push({
            x: proj.x,
            y: proj.y,
            vx: (Math.random() - 0.5) * 1.5 - proj.vx * 0.1,
            vy: (Math.random() - 0.5) * 1.5 - proj.vy * 0.1,
            life: 1,
            maxLife: 20 + Math.random() * 10,
            color: '#10b981',
            size: 3 + Math.random() * 3,
          });
        }

        // Floor collision
        if (proj.y + proj.radius >= groundY) {
          proj.y = groundY - proj.radius;
          proj.vy = -proj.vy * 0.45;
          proj.vx *= 0.8;
          if (Math.abs(proj.vy) < 0.5) {
            proj.vy = 0;
            proj.restTimer += 1;
          }
        }

        // Left/Right bounds
        if (proj.x - proj.radius < 0) {
          proj.x = proj.radius;
          proj.vx = -proj.vx * 0.5;
        }
        if (proj.x + proj.radius > canvas.width) {
          proj.restTimer = 100; // Trigger resolution
        }

        // Draw projectile
        ctx.save();
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Projectile Icon / Face
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', proj.x, proj.y);

        // Check if stopped
        if (Math.abs(proj.vx) < 0.3 && Math.abs(proj.vy) < 0.3 && proj.y + proj.radius >= groundY - 2) {
          proj.restTimer += 1;
        }

        if (proj.restTimer > 60 && !proj.hasLanded) {
          proj.active = false;
          proj.hasLanded = true;
          handleRoundEnd();
        }
      }

      // Physics & Drawing of Blocks
      blocksRef.current.forEach((block) => {
        if (block.destroyed) return;

        // Apply block physics if moved
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

        // Collision with Projectile
        if (proj.active) {
          const nearestX = Math.max(block.x, Math.min(proj.x, block.x + block.w));
          const nearestY = Math.max(block.y, Math.min(proj.y, block.y + block.h));
          const distSq = (proj.x - nearestX) ** 2 + (proj.y - nearestY) ** 2;

          if (distSq < proj.radius ** 2) {
            // Collision detected!
            const impactSpeed = Math.sqrt(proj.vx ** 2 + proj.vy ** 2);
            shakeRef.current = Math.min(22, impactSpeed * 2.5);

            // Audio & physics push
            sound.impact(Math.min(1.5, impactSpeed * 0.2));

            block.vx = proj.vx * 0.45;
            block.vy = proj.vy * 0.35 - 1.5;
            block.vAngle = (Math.random() - 0.5) * 0.15;

            proj.vx *= 0.45;
            proj.vy *= 0.45;

            // Damage block
            block.hp -= 1;
            if (block.hp <= 0) {
              block.destroyed = true;

              // Explosive particles
              for (let i = 0; i < 18; i++) {
                particlesRef.current.push({
                  x: block.x + block.w / 2,
                  y: block.y + block.h / 2,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8 - 2,
                  life: 1,
                  maxLife: 30 + Math.random() * 20,
                  color: block.type.includes('multiplier') ? '#f59e0b' : '#64748b',
                  size: 3 + Math.random() * 4,
                });
              }

              // TNT chain explosion
              if (block.type === 'tnt') {
                sound.crashExplode();
                shakeRef.current = 28;
                slowMoRef.current = 15;
                blocksRef.current.forEach((other) => {
                  if (!other.destroyed) {
                    const dx = other.x - block.x;
                    const dy = other.y - block.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 160) {
                      other.vx += (dx / d) * 10;
                      other.vy -= 8;
                      other.hp -= 2;
                      if (other.hp <= 0) other.destroyed = true;
                    }
                  }
                });
              }

              // Multiplier crates bonus
              let mult = 0;
              if (block.type === 'multiplier_2x') mult = 2;
              if (block.type === 'multiplier_5x') mult = 5;
              if (block.type === 'multiplier_10x') mult = 10;
              if (block.type === 'jackpot_25x') mult = 25;

              if (mult > 0) {
                hitMultipliersRef.current.push(mult);
                if (mult >= 10) {
                  sound.jackpot();
                  slowMoRef.current = 20;
                } else {
                  sound.coinWin();
                }

                floatingTextsRef.current.push({
                  x: block.x + block.w / 2,
                  y: block.y - 15,
                  text: `x${mult} BONUS!`,
                  color: '#fbbf24',
                  life: 45,
                });
              }
            }
          }
        }

        // Draw block
        ctx.save();
        ctx.translate(block.x + block.w / 2, block.y + block.h / 2);
        ctx.rotate(block.angle);

        // Styling based on block type
        if (block.type === 'server') {
          ctx.fillStyle = '#1e212b';
          ctx.strokeStyle = '#383b47';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

          // LED indicator lights
          ctx.fillStyle = block.hp > 1 ? '#10b981' : '#f43f5e';
          ctx.beginPath();
          ctx.arc(-block.w / 2 + 8, -block.h / 2 + 8, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#475569';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SERVER', 4, 3);
        } else if (block.type === 'tnt') {
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#b91c1c';
          ctx.lineWidth = 2;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('TNT 💥', 0, 0);
        } else if (block.type.includes('multiplier') || block.type === 'jackpot_25x') {
          // Golden Multiplier Crate
          ctx.fillStyle = '#78350f';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 8;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label =
            block.type === 'jackpot_25x'
              ? 'x25 ⭐'
              : block.type === 'multiplier_10x'
              ? 'x10'
              : block.type === 'multiplier_5x'
              ? 'x5'
              : 'x2';
          ctx.fillText(label, 0, 0);
        } else {
          // Normal wood crate
          ctx.fillStyle = '#27272a';
          ctx.strokeStyle = '#3f3f46';
          ctx.lineWidth = 1;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);
        }

        ctx.restore();
      });

      // Update and Draw Particles
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

      // Update and Draw Floating Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= 1;
        ft.life--;

        ctx.fillStyle = ft.color;
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.min(1, ft.life / 20);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;

        if (ft.life <= 0) {
          floatingTextsRef.current.splice(i, 1);
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle launch evaluation
  const handleRoundEnd = () => {
    const destroyedCount = blocksRef.current.filter((b) => b.destroyed).length;
    const cratesMults = hitMultipliersRef.current.reduce((sum, m) => sum + m, 0);

    // Multiplier calculation:
    // Base destruction bonus + hit crates multiplier
    let totalMult = cratesMults;
    if (destroyedCount >= 3 && cratesMults === 0) {
      totalMult = 1.5;
    }
    if (destroyedCount >= 6 && cratesMults === 0) {
      totalMult = 3.0;
    }

    if (totalMult > 0) {
      const winAmount = Math.round(bet * totalMult);
      onUpdateCoins(winAmount);
      setLastWin({ amount: winAmount, multiplier: totalMult });
      sound.coinWin();

      if (totalMult >= 5) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } else {
      setLastWin({ amount: 0, multiplier: 0 });
      sound.broke();
    }

    setGameState('resolved');
  };

  // Mouse & Touch events for Slingshot
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'aiming') return;
    if (userCoins < bet) {
      sound.broke();
      alert('¡No te quedan suficientes monedas! Pide la Beca arriba a la derecha.');
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Check if clicked near slingshot
    const dist = Math.sqrt((clientX - slingshotAnchor.x) ** 2 + (clientY - slingshotAnchor.y) ** 2);
    if (dist < 60) {
      isDraggingRef.current = true;
      dragPosRef.current = { x: clientX, y: clientY };
      sound.tap();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Clamp to pull radius
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

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const pull = dragPosRef.current;
    const dx = slingshotAnchor.x - pull.x;
    const dy = slingshotAnchor.y - pull.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 18) {
      // Valid shot: Deduct bet!
      onUpdateCoins(-bet);
      setGameState('flying');
      sound.whoosh();

      projectileRef.current = {
        x: slingshotAnchor.x,
        y: slingshotAnchor.y,
        vx: dx * 0.22,
        vy: dy * 0.22,
        radius: 14,
        active: true,
        hasLanded: false,
        restTimer: 0,
      };
    } else {
      // Weak pull, cancel
      dragPosRef.current = { x: slingshotAnchor.x, y: slingshotAnchor.y };
    }
  };

  const handleBrag = () => {
    if (!lastWin || bragged) return;
    onBroadcastWin('angry', lastWin.multiplier, lastWin.amount);
    setBragged(true);
    sound.coinWin();
  };

  return (
    <div className="bg-[#0b0c10] border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col items-center">
      {/* Top Header of the Game */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
              ANGRY CABLE <span className="text-emerald-400">//</span> DOPAMINE SLINGSHOT
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
              JACKPOT x25
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Arrastra el tirachinas, apunta al rack del servidor y revienta las cajas multiplicadoras.
          </p>
        </div>

        {/* Bet Selection Pills */}
        <div className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-2xl border border-white/[0.08]">
          <span className="text-[11px] font-mono text-zinc-400 px-2 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" /> Apuesta:
          </span>
          {[50, 100, 250, 500, 1000].map((amount) => (
            <button
              key={amount}
              disabled={gameState === 'flying'}
              onClick={() => {
                setBet(amount);
                sound.tap();
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                bet === amount
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] shadow-inner bg-[#08090e]">
        <canvas
          ref={canvasRef}
          width={820}
          height={400}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-auto cursor-crosshair touch-none select-none block"
        />

        {/* Aiming Hint */}
        {gameState === 'aiming' && (
          <div className="absolute top-4 left-4 pointer-events-none bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-zinc-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Arrastra la bolita verde y suelta para disparar</span>
          </div>
        )}

        {/* Round Resolution Banner */}
        {gameState === 'resolved' && lastWin && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
            {lastWin.multiplier > 0 ? (
              <>
                <div className="p-3 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-3 shadow-[0_0_25px_rgba(251,191,36,0.4)]">
                  <Trophy className="w-8 h-8" />
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest">
                  ¡TIRITO DEMOLEDOR!
                </span>
                <h3 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 mt-1">
                  +{lastWin.amount.toLocaleString()} 🪙
                </h3>
                <p className="text-xs text-zinc-300 mt-1 font-mono">
                  Multiplicador total conseguido: <strong className="text-amber-400">x{lastWin.multiplier.toFixed(2)}</strong>
                </p>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => {
                      resetLevel();
                      sound.tap();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tirar de Nuevo</span>
                  </button>

                  <button
                    onClick={handleBrag}
                    disabled={bragged}
                    className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      bragged
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-95'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{bragged ? '¡Presumido en Chat!' : 'Fardar en el Chat'}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 mb-3">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  Tiro al aire... 0 fichas
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Ni has rozado el rack dorado. La próxima tira con más parábola.
                </p>

                <button
                  onClick={() => {
                    resetLevel();
                    sound.tap();
                  }}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar (-{bet} 🪙)</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom helper instructions */}
      <div className="w-full flex items-center justify-between text-[11px] text-zinc-500 font-mono mt-3 px-1">
        <span>💥 TNT causa explosión en cadena</span>
        <span>⭐ Cajas doradas dan multiplicadores directos (x2, x5, x10, x25)</span>
      </div>
    </div>
  );
};

'use client';

import React, { useRef, useState, useEffect } from 'react';
import { sound } from '@/lib/audio';
import { RotateCcw, Coins, Trophy, Zap, AlertTriangle, Share2 } from 'lucide-react';
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

  const [bet, setBet] = useState<number>(100);
  const [gameState, setGameState] = useState<'aiming' | 'flying' | 'resolved'>('aiming');
  const [lastWin, setLastWin] = useState<{ amount: number; multiplier: number } | null>(null);
  const [bragged, setBragged] = useState(false);

  // Physics constants
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
    radius: 14,
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

  const resetLevel = () => {
    const blocks: Block[] = [];
    const baseStartX = 520;

    // Tower 1
    blocks.push({ x: baseStartX, y: groundY - 40, w: 70, h: 40, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
    blocks.push({ x: baseStartX, y: groundY - 80, w: 70, h: 40, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
    blocks.push({ x: baseStartX + 10, y: groundY - 120, w: 50, h: 40, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_2x', destroyed: false });

    // Tower 2: Multipliers & TNT
    const col2X = baseStartX + 95;
    blocks.push({ x: col2X, y: groundY - 45, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'crate', destroyed: false });
    blocks.push({ x: col2X, y: groundY - 90, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'tnt', destroyed: false });
    blocks.push({ x: col2X, y: groundY - 135, w: 45, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_5x', destroyed: false });

    // Tower 3: Golden Vault
    const col3X = baseStartX + 160;
    blocks.push({ x: col3X, y: groundY - 40, w: 70, h: 40, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
    blocks.push({ x: col3X, y: groundY - 80, w: 70, h: 40, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 3, maxHp: 3, type: 'server', destroyed: false });
    blocks.push({ x: col3X + 10, y: groundY - 125, w: 50, h: 45, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'multiplier_10x', destroyed: false });

    // Crossbeam and Top Jackpot Box
    blocks.push({ x: baseStartX + 40, y: groundY - 165, w: 140, h: 18, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 2, maxHp: 2, type: 'crate', destroyed: false });
    blocks.push({ x: baseStartX + 85, y: groundY - 215, w: 50, h: 50, vx: 0, vy: 0, angle: 0, vAngle: 0, hp: 1, maxHp: 1, type: 'jackpot_25x', destroyed: false });

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
      let timeStep = 1;
      if (slowMoRef.current > 0) {
        timeStep = 0.25;
        slowMoRef.current--;
      }

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

      // Clean background
      ctx.fillStyle = '#08090e';
      ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);

      // Grid
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

      // Ground
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.stroke();

      // Slingshot Post
      ctx.strokeStyle = '#383842';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(slingshotAnchor.x, groundY);
      ctx.lineTo(slingshotAnchor.x, slingshotAnchor.y + 15);
      ctx.lineTo(slingshotAnchor.x - 14, slingshotAnchor.y - 12);
      ctx.moveTo(slingshotAnchor.x, slingshotAnchor.y + 15);
      ctx.lineTo(slingshotAnchor.x + 14, slingshotAnchor.y - 12);
      ctx.stroke();

      const proj = projectileRef.current;

      // Slingshot Bands & Projectile when aiming
      if (!proj.active && !proj.hasLanded) {
        const pullPos = isDraggingRef.current ? dragPosRef.current : slingshotAnchor;

        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(slingshotAnchor.x - 12, slingshotAnchor.y - 10);
        ctx.lineTo(pullPos.x, pullPos.y);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(pullPos.x, pullPos.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(pullPos.x, pullPos.y, proj.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(slingshotAnchor.x + 12, slingshotAnchor.y - 10);
        ctx.lineTo(pullPos.x, pullPos.y);
        ctx.stroke();

        // Trajectory dots
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
            simVy += 0.35 * 1.5;
            if (simY > groundY) break;

            if (step % 2 === 0) {
              ctx.beginPath();
              ctx.arc(simX, simY, Math.max(1.5, 3.5 - step * 0.1), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Flying Projectile
      if (proj.active) {
        proj.vx *= 0.995;
        proj.vy += 0.35 * timeStep;
        proj.x += proj.vx * timeStep;
        proj.y += proj.vy * timeStep;

        if (Math.random() > 0.3) {
          particlesRef.current.push({
            x: proj.x,
            y: proj.y,
            vx: (Math.random() - 0.5) * 1.5 - proj.vx * 0.1,
            vy: (Math.random() - 0.5) * 1.5 - proj.vy * 0.1,
            life: 1,
            maxLife: 20 + Math.random() * 10,
            color: '#10b981',
            size: 3 + Math.random() * 2,
          });
        }

        if (proj.y + proj.radius >= groundY) {
          proj.y = groundY - proj.radius;
          proj.vy = -proj.vy * 0.45;
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
        if (proj.x + proj.radius > canvas.width) {
          proj.restTimer = 100;
        }

        // Draw projectile with clean glow
        ctx.save();
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (Math.abs(proj.vx) < 0.3 && Math.abs(proj.vy) < 0.3 && proj.y + proj.radius >= groundY - 2) {
          proj.restTimer += 1;
        }

        if (proj.restTimer > 50 && !proj.hasLanded) {
          proj.active = false;
          proj.hasLanded = true;
          handleRoundEnd();
        }
      }

      // Blocks
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

        // Collision Check
        if (proj.active) {
          const nearestX = Math.max(block.x, Math.min(proj.x, block.x + block.w));
          const nearestY = Math.max(block.y, Math.min(proj.y, block.y + block.h));
          const distSq = (proj.x - nearestX) ** 2 + (proj.y - nearestY) ** 2;

          if (distSq < proj.radius ** 2) {
            const impactSpeed = Math.sqrt(proj.vx ** 2 + proj.vy ** 2);
            shakeRef.current = Math.min(20, impactSpeed * 2.2);
            sound.impact(Math.min(1.4, impactSpeed * 0.2));

            block.vx = proj.vx * 0.45;
            block.vy = proj.vy * 0.35 - 1.5;
            block.vAngle = (Math.random() - 0.5) * 0.15;

            proj.vx *= 0.45;
            proj.vy *= 0.45;

            block.hp -= 1;
            if (block.hp <= 0) {
              block.destroyed = true;

              for (let i = 0; i < 16; i++) {
                particlesRef.current.push({
                  x: block.x + block.w / 2,
                  y: block.y + block.h / 2,
                  vx: (Math.random() - 0.5) * 8,
                  vy: (Math.random() - 0.5) * 8 - 2,
                  life: 1,
                  maxLife: 25 + Math.random() * 20,
                  color: block.type.includes('multiplier') ? '#f59e0b' : '#64748b',
                  size: 2.5 + Math.random() * 3,
                });
              }

              if (block.type === 'tnt') {
                sound.crashExplode();
                shakeRef.current = 26;
                slowMoRef.current = 15;
                blocksRef.current.forEach((other) => {
                  if (!other.destroyed) {
                    const dx = other.x - block.x;
                    const dy = other.y - block.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 160) {
                      other.vx += (dx / d) * 10;
                      other.vy -= 7;
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
                  text: `x${mult}`,
                  color: '#fbbf24',
                  life: 40,
                });
              }
            }
          }
        }

        // Draw Block
        ctx.save();
        ctx.translate(block.x + block.w / 2, block.y + block.h / 2);
        ctx.rotate(block.angle);

        if (block.type === 'server') {
          ctx.fillStyle = '#1c1e24';
          ctx.strokeStyle = '#2e323b';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

          ctx.fillStyle = block.hp > 1 ? '#10b981' : '#f43f5e';
          ctx.beginPath();
          ctx.arc(-block.w / 2 + 8, -block.h / 2 + 8, 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#64748b';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('SERVER', 3, 3);
        } else if (block.type === 'tnt') {
          ctx.fillStyle = '#991b1b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('TNT', 0, 0);
        } else if (block.type.includes('multiplier') || block.type === 'jackpot_25x') {
          ctx.fillStyle = '#78350f';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label =
            block.type === 'jackpot_25x'
              ? 'x25'
              : block.type === 'multiplier_10x'
              ? 'x10'
              : block.type === 'multiplier_5x'
              ? 'x5'
              : 'x2';
          ctx.fillText(label, 0, 0);
        } else {
          ctx.fillStyle = '#27272a';
          ctx.strokeStyle = '#3f3f46';
          ctx.lineWidth = 1;
          ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
          ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);
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
        ft.y -= 1;
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
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleRoundEnd = () => {
    const destroyedCount = blocksRef.current.filter((b) => b.destroyed).length;
    const cratesMults = hitMultipliersRef.current.reduce((sum, m) => sum + m, 0);

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
          particleCount: 90,
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

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'aiming') return;
    if (userCoins < bet) {
      sound.broke();
      alert('Saldo insuficiente. Solicita la Beca arriba a la derecha.');
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

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
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white font-mono">
              ANGRY CABLE // SLINGSHOT
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
              JACKPOT x25
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Arrastra el tirachinas, apunta a la torre del servidor y derriba las cajas multiplicadoras.
          </p>
        </div>

        {/* Bet presets */}
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
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
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

        {gameState === 'aiming' && (
          <div className="absolute top-4 left-4 pointer-events-none bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs text-zinc-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Arrastra el núcleo verde y suelta para disparar</span>
          </div>
        )}

        {/* Resolution Banner */}
        {gameState === 'resolved' && lastWin && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
            {lastWin.multiplier > 0 ? (
              <>
                <div className="p-3 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-3 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                  <Trophy className="w-8 h-8" />
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest">
                  IMPACTO CONFIRMADO
                </span>
                <h3 className="text-3xl sm:text-5xl font-black text-white font-mono mt-1">
                  +{lastWin.amount.toLocaleString()} FICHAS
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Multiplicador conseguido: x{lastWin.multiplier.toFixed(2)}
                </p>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={() => {
                      resetLevel();
                      sound.tap();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tirar de Nuevo</span>
                  </button>

                  <button
                    onClick={handleBrag}
                    disabled={bragged}
                    className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      bragged
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-white hover:bg-zinc-200 text-black shadow-lg active:scale-95'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{bragged ? 'Publicado en Chat' : 'Publicar en Chat'}</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 mb-3">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-mono">
                  Sin impacto suficiente (0 fichas)
                </h3>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm font-mono">
                  Ajusta la parábola para derribar las cajas multiplicadoras.
                </p>

                <button
                  onClick={() => {
                    resetLevel();
                    sound.tap();
                  }}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reintentar (-{bet} fichas)</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="w-full flex items-center justify-between text-[11px] text-zinc-500 font-mono mt-3 px-1">
        <span>TNT causa deflagración en área</span>
        <span>Cajas multiplicadoras directas (x2, x5, x10, x25)</span>
      </div>
    </div>
  );
};

// Helper utilities for SMR2 economy, ranks, cooldowns and balanced streaks

export interface RankInfo {
  name: string;
  badge: string;
  color: string;
  border: string;
  bg: string;
}

export function getUserRank(coins: number): RankInfo {
  if (coins >= 5000) {
    return {
      name: 'Root',
      badge: '★ ROOT',
      color: 'text-amber-300',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
    };
  }
  if (coins >= 2500) {
    return {
      name: 'SysAdmin',
      badge: 'SYS',
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
    };
  }
  if (coins >= 1200) {
    return {
      name: 'Admin',
      badge: 'ADM',
      color: 'text-purple-400',
      border: 'border-purple-500/30',
      bg: 'bg-purple-500/10',
    };
  }
  if (coins >= 500) {
    return {
      name: 'Técnico',
      badge: 'TEC',
      color: 'text-blue-400',
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
    };
  }
  if (coins >= 200) {
    return {
      name: 'Operador',
      badge: 'OP',
      color: 'text-cyan-400',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
    };
  }
  return {
    name: 'Novato',
    badge: 'NOV',
    color: 'text-zinc-400',
    border: 'border-zinc-700/50',
    bg: 'bg-zinc-800/40',
  };
}

export function canClaimDaily(lastClaimDate?: string): boolean {
  if (!lastClaimDate) return true;
  const today = new Date().toISOString().split('T')[0];
  const last = lastClaimDate.split('T')[0];
  return today !== last;
}

// Balanced daily streak progression (fair, non-hyperinflated)
export function getDailyRewardAmount(streak: number): number {
  const rewards = [25, 45, 70, 105, 150];
  const idx = Math.min(Math.max(streak - 1, 0), rewards.length - 1);
  return rewards[idx];
}

// Ruleta Diaria cooldown: 12 hours (in ms)
export const SPIN_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export function getSpinCooldownRemaining(lastSpinDate?: string | null): number {
  if (!lastSpinDate) return 0;
  const lastTime = new Date(lastSpinDate).getTime();
  if (isNaN(lastTime)) return 0;
  const elapsed = Date.now() - lastTime;
  return Math.max(0, SPIN_COOLDOWN_MS - elapsed);
}

// Fondo de Rescate cooldown: 30 minutes (in ms)
export const RESCUE_COOLDOWN_MS = 30 * 60 * 1000;
export const RESCUE_THRESHOLD = 50; // Only claimable if balance < 50
export const RESCUE_AMOUNT = 50;    // Provides 50 coins to get back in the game

export function getRescueCooldownRemaining(lastRescueDate?: string | null): number {
  if (!lastRescueDate) return 0;
  const lastTime = new Date(lastRescueDate).getTime();
  if (isNaN(lastTime)) return 0;
  const elapsed = Date.now() - lastTime;
  return Math.max(0, RESCUE_COOLDOWN_MS - elapsed);
}

// Helper to format remaining ms as "05h 22m" or "18m 40s"
export function formatCooldown(ms: number): string {
  if (ms <= 0) return 'Disponible';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

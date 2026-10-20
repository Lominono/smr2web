// Helper utilities for SMR2 economy, ranks and daily streaks

export interface RankInfo {
  name: string;
  badge: string;
  color: string;
  border: string;
  bg: string;
}

export function getUserRank(coins: number): RankInfo {
  if (coins >= 10000) {
    return {
      name: 'Root',
      badge: '★ ROOT',
      color: 'text-amber-300',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
    };
  }
  if (coins >= 5000) {
    return {
      name: 'SysAdmin',
      badge: 'SYS',
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
    };
  }
  if (coins >= 2000) {
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

export function getDailyRewardAmount(streak: number): number {
  const rewards = [150, 250, 400, 600, 1000];
  const idx = Math.min(Math.max(streak - 1, 0), rewards.length - 1);
  return rewards[idx];
}

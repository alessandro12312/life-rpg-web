import { useAnimationStore } from "@/store/useAnimationStore";
import { usePlayerStore } from "@/store/usePlayerStore";

interface ActivityResponse {
  level: number;
  xp_current: number;
  xp_to_next: number;
  character_stats: unknown;
  current_streak: number;
  highest_streak: number;
  stat_points?: number;
  avatar_id?: string | null;
  xp_gained?: number;
  levels_gained?: number;
  stat_gains?: Record<string, number>;
}

export function applyActivityResponse(data: ActivityResponse) {
  const oldLevel = usePlayerStore.getState().level;
  const pStats = Array.isArray(data.character_stats)
    ? data.character_stats[0]
    : data.character_stats;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usePlayerStore.getState().initStats(
    data.level,
    data.xp_current,
    data.xp_to_next,
    pStats as any,
    data.current_streak,
    data.highest_streak,
    data.stat_points,
    data.avatar_id,
  );

  if (data.xp_gained && data.xp_gained > 0) {
    useAnimationStore.getState().triggerActivity({
      xpGained: data.xp_gained,
      levelsGained: data.levels_gained ?? 0,
      oldLevel,
      newLevel: data.level,
      statGains: data.stat_gains ?? {},
    });
  }
}

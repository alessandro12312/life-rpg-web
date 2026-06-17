import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { GuildService } from '../guild/guild.service';
import { BattleService } from '../battle/battle.service';

// ─── Skill Catalog ─────────────────────────────────────────────────────────────
// Mirrors the node IDs used in the frontend SKILLS array
export interface SkillDef {
  id: string;
  requires: string[];
  effect: {
    type:
      | 'xp_multiplier_category'
      | 'xp_multiplier_global'
      | 'stat_gain_multiplier'
      | 'streak_bonus'
      | 'stat_gain_streak_bonus';
    category?: 'STUDY' | 'WORKOUT';
    value: number;
  };
}

export const SKILL_CATALOG: SkillDef[] = [
  // core_1 is the always-unlocked root — no backend effect needed
  {
    id: 'core_1',
    requires: [],
    effect: { type: 'xp_multiplier_global', value: 0 },
  },

  // Intelligence Path
  {
    id: 'int_1',
    requires: ['core_1'],
    effect: { type: 'xp_multiplier_category', category: 'STUDY', value: 0.05 },
  },
  {
    id: 'int_2',
    requires: ['int_1'],
    effect: { type: 'stat_gain_multiplier', value: 0.1 },
  },

  // Strength Path
  {
    id: 'str_1',
    requires: ['core_1'],
    effect: { type: 'xp_multiplier_category', category: 'WORKOUT', value: 0.1 },
  },
  {
    id: 'str_2',
    requires: ['str_1'],
    effect: { type: 'streak_bonus', value: 0.05 },
  },

  // Defense / Consistency
  {
    id: 'def_1',
    requires: ['core_1'],
    effect: { type: 'xp_multiplier_global', value: 0.05 },
  },
  {
    id: 'def_2',
    requires: ['def_1'],
    effect: { type: 'xp_multiplier_global', value: 0.1 },
  },

  // Endurance / Vitality
  {
    id: 'end_1',
    requires: ['core_1'],
    effect: { type: 'stat_gain_streak_bonus', value: 0.01 },
  },
  {
    id: 'end_2',
    requires: ['end_1'],
    effect: { type: 'stat_gain_streak_bonus', value: 0.02 },
  },
];

function getSkillById(id: string): SkillDef | undefined {
  return SKILL_CATALOG.find((s) => s.id === id);
}

// ─── Achievement Catalog ────────────────────────────────────────────────────────
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Completa la tua prima attività',
    icon: '⚔️',
  },
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Raggiungi il livello 5',
    icon: '⭐',
  },
  {
    id: 'level_10',
    name: 'Veteran',
    description: 'Raggiungi il livello 10',
    icon: '🏅',
  },
  {
    id: 'streak_3',
    name: 'Consistent',
    description: 'Mantieni una streak di 3 giorni',
    icon: '🔥',
  },
  {
    id: 'streak_7',
    name: 'On Fire',
    description: 'Mantieni una streak di 7 giorni',
    icon: '💥',
  },
  {
    id: 'streak_30',
    name: 'Unbreakable',
    description: 'Mantieni una streak di 30 giorni',
    icon: '🛡️',
  },
  {
    id: 'study_10',
    name: 'Scholar',
    description: 'Completa 10 sessioni di studio',
    icon: '📚',
  },
  {
    id: 'workout_10',
    name: 'Warrior',
    description: 'Completa 10 sessioni di allenamento',
    icon: '💪',
  },
  {
    id: 'sanctum_5',
    name: 'Monk',
    description: 'Completa 5 sessioni nel Sanctum',
    icon: '🧘',
  },
  {
    id: 'skill_1',
    name: 'Awakened',
    description: 'Sblocca la tua prima skill nel Grimoire',
    icon: '✨',
  },
];

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class PlayerService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly guildService: GuildService,
    private readonly battleService: BattleService,
  ) {}

  async getPlayerStats(userId: string) {
    const { data: user, error } = await this.supabase
      .getClient()
      .from('users')
      .select('*, character_stats(*)')
      .eq('id', userId)
      .single();

    if (error || !user) throw new NotFoundException('Player not found');
    return user;
  }

  async checkUsernameAvailability(
    username: string,
  ): Promise<{ available: boolean }> {
    const { data, error } = await this.supabase
      .getClient()
      .from('users')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (error)
      throw new InternalServerErrorException(
        'Errore nella verifica dello username',
      );

    return { available: !data };
  }

  // ── Skill Tree ─────────────────────────────────────────────────────────────
  async getPlayerSkills(userId: string): Promise<{ unlockedIds: string[] }> {
    const { data, error } = await this.supabase
      .getClient()
      .from('player_skills')
      .select('skill_id')
      .eq('user_id', userId);

    if (error)
      throw new InternalServerErrorException('Errore nel recupero delle skill');
    const unlockedIds = (data ?? []).map(
      (r: { skill_id: string }) => r.skill_id,
    );
    // core_1 is always unlocked
    if (!unlockedIds.includes('core_1')) unlockedIds.unshift('core_1');
    return { unlockedIds };
  }

  async unlockSkill(userId: string, skillId: string) {
    const skill = getSkillById(skillId);
    if (!skill) throw new BadRequestException('Unknown skill');
    if (skillId === 'core_1')
      throw new BadRequestException('core_1 is always unlocked');

    const { data: user, error: userError } = await this.supabase
      .getClient()
      .from('users')
      .select('level')
      .eq('id', userId)
      .single();
    if (userError || !user) throw new NotFoundException('Player not found');

    const { data: unlocked } = await this.supabase
      .getClient()
      .from('player_skills')
      .select('skill_id')
      .eq('user_id', userId);

    const unlockedIds: string[] = (unlocked ?? []).map(
      (r: { skill_id: string }) => r.skill_id,
    );
    if (!unlockedIds.includes('core_1')) unlockedIds.push('core_1');

    if (unlockedIds.includes(skillId))
      throw new BadRequestException('Skill already unlocked');

    // Check prerequisites
    for (const req of skill.requires) {
      if (req === 'core_1') continue; // always satisfied
      if (!unlockedIds.includes(req)) {
        throw new ForbiddenException(`Prerequisite "${req}" not unlocked`);
      }
    }

    // SP check: total SP = max(0, level - 5), spent = unlocked count (excluding core_1)
    const totalSP = Math.max(0, user.level - 5);
    const spentSP = unlockedIds.filter((id) => id !== 'core_1').length;
    if (spentSP >= totalSP)
      throw new BadRequestException('Not enough Skill Points');

    const { error: insertError } = await this.supabase
      .getClient()
      .from('player_skills')
      .insert({ user_id: userId, skill_id: skillId });
    if (insertError)
      throw new InternalServerErrorException(
        'Errore nello sblocco della skill',
      );

    return this.getPlayerSkills(userId);
  }

  // ── Achievements ──────────────────────────────────────────────────────────
  async getAchievements(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId);
    if (error)
      throw new InternalServerErrorException(
        'Errore nel recupero degli achievement',
      );
    const unlockedIds = (data ?? []).map((r: any) => r.achievement_id);
    return {
      catalog: ACHIEVEMENT_CATALOG,
      unlocked: data ?? [],
      unlockedIds,
    };
  }

  async checkAchievements(
    userId: string,
    ctx: {
      level: number;
      current_streak: number;
      category?: string;
      custom_name?: string;
    },
  ) {
    const { data: existing } = await this.supabase
      .getClient()
      .from('achievements')
      .select('achievement_id')
      .eq('user_id', userId);
    const has = new Set((existing ?? []).map((r: any) => r.achievement_id));
    const newAchievements: string[] = [];

    const tryUnlock = (id: string) => {
      if (!has.has(id)) {
        newAchievements.push(id);
        has.add(id);
      }
    };

    // Activity count checks
    const { count: totalActivities } = await this.supabase
      .getClient()
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((totalActivities ?? 0) >= 1) tryUnlock('first_blood');

    // Category counts
    const { count: studyCount } = await this.supabase
      .getClient()
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', 'STUDY');
    if ((studyCount ?? 0) >= 10) tryUnlock('study_10');

    const { count: workoutCount } = await this.supabase
      .getClient()
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('category', 'WORKOUT');
    if ((workoutCount ?? 0) >= 10) tryUnlock('workout_10');

    // Sanctum count (custom_name = 'Sanctum Deep Focus')
    const { count: sanctumCount } = await this.supabase
      .getClient()
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('custom_name', 'Sanctum Deep Focus');
    if ((sanctumCount ?? 0) >= 5) tryUnlock('sanctum_5');

    // Level checks
    if (ctx.level >= 5) tryUnlock('level_5');
    if (ctx.level >= 10) tryUnlock('level_10');

    // Streak checks
    if (ctx.current_streak >= 3) tryUnlock('streak_3');
    if (ctx.current_streak >= 7) tryUnlock('streak_7');
    if (ctx.current_streak >= 30) tryUnlock('streak_30');

    // Skill check
    const { data: skills } = await this.supabase
      .getClient()
      .from('player_skills')
      .select('skill_id')
      .eq('user_id', userId);
    if ((skills ?? []).length >= 1) tryUnlock('skill_1');

    // Batch insert new achievements
    if (newAchievements.length > 0) {
      await this.supabase
        .getClient()
        .from('achievements')
        .insert(
          newAchievements.map((aid) => ({
            user_id: userId,
            achievement_id: aid,
          })),
        );
    }

    return newAchievements;
  }

  // ── Goals ──────────────────────────────────────────────────────────────────
  async getGoals(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error)
      throw new InternalServerErrorException(
        'Errore nel recupero degli obiettivi',
      );
    return data ?? [];
  }

  async createGoal(
    userId: string,
    payload: {
      title: string;
      category: string;
      target_minutes: number;
      deadline?: string;
      xp_reward?: number;
    },
  ) {
    const { data, error } = await this.supabase
      .getClient()
      .from('goals')
      .insert({
        user_id: userId,
        title: payload.title,
        category: payload.category,
        target_minutes: payload.target_minutes,
        deadline: payload.deadline || null,
        xp_reward: payload.xp_reward || 200,
      })
      .select()
      .single();
    if (error)
      throw new InternalServerErrorException(
        "Errore nella creazione dell'obiettivo",
      );
    return data;
  }

  // ── Goal Progress Update ──────────────────────────────────────────────────
  async updateGoalProgress(
    userId: string,
    category: string,
    minutes: number,
    currentLevel: number,
    currentXP: number,
    xpToNext: number,
  ) {
    // Fetch active goals matching category
    const { data: goals } = await this.supabase
      .getClient()
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)
      .in('category', [category, 'MIXED']);

    if (!goals || goals.length === 0) return;

    // Goal-Boss linkage: find active battles for this user
    const { data: userBattles } = await this.supabase
      .getClient()
      .from('battle_participants')
      .select('battle_id')
      .eq('user_id', userId);

    const battleIds = (userBattles || []).map((b: any) => b.battle_id);

    let primaryStat = 1.0;
    if (battleIds.length > 0) {
      const { data: charStats } = await this.supabase
        .getClient()
        .from('character_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (charStats) {
        if (category === 'STUDY') {
          primaryStat = Number(charStats.intelligence) || 1.0;
        } else if (category === 'WORKOUT') {
          primaryStat = Number(charStats.strength) || 1.0;
        } else {
          primaryStat = Number(charStats.focus) || 1.0;
        }
      }
    }

    let bonusXP = 0;
    for (const goal of goals) {
      const newMinutes = Math.min(
        goal.current_minutes + minutes,
        goal.target_minutes,
      );
      const completed = newMinutes >= goal.target_minutes;
      await this.supabase
        .getClient()
        .from('goals')
        .update({ current_minutes: newMinutes, completed })
        .eq('id', goal.id);
      if (completed) bonusXP += goal.xp_reward || 200;

      // Deal damage to any active battles linked to this goal
      if (battleIds.length > 0) {
        const { data: battles } = await this.supabase
          .getClient()
          .from('battles')
          .select('*, bosses!inner(id, name, source_goal_id)')
          .in('id', battleIds)
          .eq('status', 'ACTIVE')
          .eq('bosses.source_goal_id', goal.id);

        for (const battle of battles || []) {
          const damage = Math.max(1, Math.floor(minutes * primaryStat * 0.5));
          const newHp = Math.max(0, battle.boss_current_hp - damage);
          const isDefeated = newHp === 0;

          const updatePayload: any = { boss_current_hp: newHp };
          if (isDefeated) {
            updatePayload.status = 'VICTORY';
            updatePayload.ended_at = new Date().toISOString();
          }

          await this.supabase
            .getClient()
            .from('battles')
            .update(updatePayload)
            .eq('id', battle.id);

          // Insert log
          await this.supabase
            .getClient()
            .from('battle_logs')
            .insert({
              battle_id: battle.id,
              turn_number: battle.current_turn,
              actor_type: 'PLAYER',
              actor_id: userId,
              action_type: 'ATTACK',
              damage_dealt: damage,
              narrative: `💥 I progressi reali del Goal "${goal.title}" infliggono ${damage} danni a ${battle.bosses?.name || 'il Boss'}!${isDefeated ? ' Il Boss è stato sconfitto!' : ''}`,
            });

          if (isDefeated) {
            await this.battleService.distributeBattleRewards(
              battle.id,
              'VICTORY',
            );
          }
        }
      }
    }

    // Award bonus XP from completed goals
    if (bonusXP > 0) {
      const { data: user } = await this.supabase
        .getClient()
        .from('users')
        .select('xp_current, xp_to_next, level, stat_points')
        .eq('id', userId)
        .single();
      if (user) {
        let xp = user.xp_current + bonusXP;
        let lvl = user.level;
        let xpNext = user.xp_to_next;
        let levels_gained = 0;
        while (xp >= xpNext) {
          lvl += 1;
          levels_gained += 1;
          xp -= xpNext;
          xpNext = Math.floor(100 * Math.pow(lvl, 1.15) + 900);
        }
        await this.supabase
          .getClient()
          .from('users')
          .update({
            xp_current: xp,
            xp_to_next: xpNext,
            level: lvl,
            stat_points: (user.stat_points || 0) + (levels_gained * 5),
          })
          .eq('id', userId);
      }
    }
  }

  // ── Activity History ──────────────────────────────────────────────────────
  async getActivityHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const offset = (page - 1) * limit;
    const client = this.supabase.getClient();

    const { data, error, count } = await client
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error)
      throw new InternalServerErrorException(
        'Errore nel recupero della cronologia attività',
      );

    const loadedCount = offset + (data?.length || 0);
    const hasMore = loadedCount < (count ?? 0);

    return {
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
      hasMore,
    };
  }

  // ── Log Activity ──────────────────────────────────────────────────────────
  async logActivity(
    userId: string,
    payload: {
      category: 'STUDY' | 'WORKOUT' | 'MIXED' | 'CUSTOM';
      custom_name?: string;
      duration_minutes: number;
      intensity_multiplier?: number;
      stat_type?:
        | 'intelligence'
        | 'strength'
        | 'endurance'
        | 'discipline'
        | 'focus'
        | 'knowledge'
        | 'health';
    },
  ) {
    const intensity = payload.intensity_multiplier || 1.0;

    const { data: user, error: fetchError } = await this.supabase
      .getClient()
      .from('users')
      .select(
        'xp_current, xp_to_next, level, current_streak, highest_streak, last_login_date, stat_points',
      )
      .eq('id', userId)
      .single();
    if (fetchError || !user) throw new NotFoundException('Player not found');

    let {
      xp_current,
      xp_to_next,
      level,
      current_streak,
      highest_streak,
      last_login_date,
      stat_points,
    } = user;

    // Fetch active skills
    const { data: skillRows } = await this.supabase
      .getClient()
      .from('player_skills')
      .select('skill_id')
      .eq('user_id', userId);
    const unlockedIds: string[] = [
      'core_1',
      ...(skillRows ?? []).map((r: { skill_id: string }) => r.skill_id),
    ];
    const activeSkills = unlockedIds
      .map((id) => getSkillById(id))
      .filter((s): s is SkillDef => !!s);

    // Streak
    const todayStr = new Date().toISOString().split('T')[0];
    if (last_login_date) {
      const diffDays = Math.ceil(
        Math.abs(
          new Date(todayStr).getTime() - new Date(last_login_date).getTime(),
        ) / 86400000,
      );
      if (diffDays === 1) {
        current_streak += 1;
        if (current_streak > highest_streak) highest_streak = current_streak;
      } else if (diffDays > 1) {
        current_streak = 1;
      }
    } else {
      current_streak = 1;
      highest_streak = 1;
    }

    // Base streak multiplier
    let streakMultiplier = 1.0;
    if (current_streak >= 7) streakMultiplier = 1.1;
    else if (current_streak >= 3) streakMultiplier = 1.05;

    // Skill: streak_bonus
    const streakBonusTotal = activeSkills
      .filter((s) => s.effect.type === 'streak_bonus')
      .reduce((acc, s) => acc + s.effect.value, 0);
    if (current_streak >= 1) streakMultiplier += streakBonusTotal;

    // Skill: xp multipliers
    const categoryBonus = activeSkills
      .filter(
        (s) =>
          s.effect.type === 'xp_multiplier_category' &&
          s.effect.category === payload.category,
      )
      .reduce((acc, s) => acc + s.effect.value, 0);
    const globalBonus = activeSkills
      .filter((s) => s.effect.type === 'xp_multiplier_global')
      .reduce((acc, s) => acc + s.effect.value, 0);

    const xpMultiplier = (1 + categoryBonus + globalBonus) * streakMultiplier;

    // Skill: stat_gain
    const statGainMult =
      1 +
      activeSkills
        .filter((s) => s.effect.type === 'stat_gain_multiplier')
        .reduce((acc, s) => acc + s.effect.value, 0);

    // Skill: endurance_streak_bonus
    const enduranceStreakBonusMultiplier = activeSkills
      .filter((s) => s.effect.type === 'stat_gain_streak_bonus')
      .reduce((acc, s) => acc + current_streak * s.effect.value, 0);

    const xp_yield = Math.floor(
      payload.duration_minutes * 10 * intensity * xpMultiplier,
    );

    // Base Primary Stat Gain (nerfed from 0.1 to 0.08)
    const primary_stat_gain = parseFloat(
      (
        (payload.duration_minutes / 60) *
        0.08 *
        intensity *
        statGainMult
      ).toFixed(2),
    );

    // Secondary Stats Gain
    const base_endurance_gain =
      (payload.duration_minutes / 60) * 0.03 * intensity * statGainMult;
    const extra_endurance_gain =
      (payload.duration_minutes / 60) *
      enduranceStreakBonusMultiplier *
      intensity;
    const endurance_gain = parseFloat(
      (base_endurance_gain + extra_endurance_gain).toFixed(2),
    );

    const knowledge_gain =
      payload.category === 'STUDY'
        ? parseFloat(
            (
              (payload.duration_minutes / 60) *
              0.05 *
              intensity *
              statGainMult
            ).toFixed(2),
          )
        : 0;

    let levels_gained = 0;
    xp_current += xp_yield;
    while (xp_current >= xp_to_next) {
      level += 1;
      levels_gained += 1;
      xp_current -= xp_to_next;
      xp_to_next = Math.floor(100 * Math.pow(level, 1.15) + 900);
    }

    const { error: updateError } = await this.supabase
      .getClient()
      .from('users')
      .update({
        xp_current,
        xp_to_next,
        level,
        current_streak,
        highest_streak,
        last_login_date: todayStr,
        stat_points: (stat_points || 0) + (levels_gained * 5),
      })
      .eq('id', userId);
    if (updateError)
      throw new InternalServerErrorException(
        "Errore nell'aggiornamento del giocatore",
      );

    // Stat update
    const stats_yield: Record<string, number> = {};
    const { data: currentStats, error: statError } = await this.supabase
      .getClient()
      .from('character_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!statError && currentStats) {
      const updates: any = {};

      // Primary Stat
      if (payload.stat_type && primary_stat_gain > 0) {
        stats_yield[payload.stat_type] = primary_stat_gain;
        updates[payload.stat_type] = parseFloat(
          (
            Number(currentStats[payload.stat_type] || 1) + primary_stat_gain
          ).toFixed(2),
        );
      }

      // Endurance (all activities)
      if (endurance_gain > 0) {
        if (payload.stat_type === 'endurance') {
          updates['endurance'] = parseFloat(
            (
              Number(updates['endurance'] || currentStats.endurance || 1) +
              endurance_gain
            ).toFixed(2),
          );
          stats_yield['endurance'] =
            (stats_yield['endurance'] || 0) + endurance_gain;
        } else {
          stats_yield['endurance'] = endurance_gain;
          updates['endurance'] = parseFloat(
            (Number(currentStats.endurance || 1) + endurance_gain).toFixed(2),
          );
        }
      }

      // Knowledge (study activities)
      if (knowledge_gain > 0) {
        if (payload.stat_type === 'knowledge') {
          updates['knowledge'] = parseFloat(
            (
              Number(updates['knowledge'] || currentStats.knowledge || 1) +
              knowledge_gain
            ).toFixed(2),
          );
          stats_yield['knowledge'] =
            (stats_yield['knowledge'] || 0) + knowledge_gain;
        } else {
          stats_yield['knowledge'] = knowledge_gain;
          updates['knowledge'] = parseFloat(
            (Number(currentStats.knowledge || 1) + knowledge_gain).toFixed(2),
          );
        }
      }

      // Health (levels gained)
      if (levels_gained > 0) {
        const health_gain = levels_gained * 0.5;
        stats_yield['health'] = health_gain;
        updates['health'] = parseFloat(
          (Number(currentStats.health || 1) + health_gain).toFixed(2),
        );
      }

      if (Object.keys(updates).length > 0) {
        await this.supabase
          .getClient()
          .from('character_stats')
          .update(updates)
          .eq('user_id', userId);
      }
    }

    await this.supabase
      .getClient()
      .from('activity_logs')
      .insert({
        user_id: userId,
        category: payload.category,
        custom_name: payload.custom_name || payload.category,
        duration_minutes: payload.duration_minutes,
        intensity_multiplier: intensity,
        xp_yield,
        stats_yield,
      });

    // Update goal progress
    await this.updateGoalProgress(
      userId,
      payload.category,
      payload.duration_minutes,
      level,
      xp_current,
      xp_to_next,
    );

    // Update guild quest progress (if member of a guild)
    await this.guildService.updateGuildQuestProgress(
      userId,
      payload.category,
      payload.duration_minutes,
    );

    // Check achievements
    await this.checkAchievements(userId, {
      level,
      current_streak,
      category: payload.category,
      custom_name: payload.custom_name,
    });

    const playerStats = await this.getPlayerStats(userId);
    return {
      ...playerStats,
      xp_gained: xp_yield,
      levels_gained,
      stat_gains: stats_yield,
    };
  }

  // ── Onboarding ────────────────────────────────────────────────────────────
  async onboardPlayer(
    userId: string,
    payload: {
      studyHoursWeekly: number;
      workoutHoursWeekly: number;
      race: string;
      className: string;
      avatarId?: string;
    },
  ) {
    const { data: userRow } = await this.supabase
      .getClient()
      .from('users')
      .select('class_name, xp_current')
      .eq('id', userId)
      .single();

    if (!userRow) throw new NotFoundException('Player not found');
    if (userRow.class_name !== 'Novice') {
      throw new BadRequestException('Player has already completed onboarding');
    }

    let intelligenceBonus = 0,
      disciplineBonus = 0,
      strengthBonus = 0,
      enduranceBonus = 0,
      focusBonus = 0,
      knowledgeBonus = 0;

    if (payload.studyHoursWeekly > 20) {
      intelligenceBonus += 2.0;
      disciplineBonus += 1.5;
    } else if (payload.studyHoursWeekly >= 10) {
      intelligenceBonus += 1.0;
      disciplineBonus += 0.5;
    }
    if (payload.workoutHoursWeekly > 7) {
      strengthBonus += 2.0;
      enduranceBonus += 1.5;
    } else if (payload.workoutHoursWeekly >= 3) {
      strengthBonus += 1.0;
      enduranceBonus += 0.5;
    }

    const race = payload.race?.toLowerCase() || 'human';
    if (race === 'umano' || race === 'human') {
      intelligenceBonus += 1;
      strengthBonus += 1;
      enduranceBonus += 1;
      disciplineBonus += 1;
      focusBonus += 1;
      knowledgeBonus += 1;
    } else if (race === 'orco' || race === 'orc') {
      strengthBonus += 3;
      enduranceBonus += 2;
    } else if (race === 'elfo' || race === 'elf') {
      intelligenceBonus += 3;
      focusBonus += 2;
    } else if (race === 'nano' || race === 'dwarf') {
      disciplineBonus += 3;
      enduranceBonus += 2;
    }

    const cls = payload.className?.toLowerCase() || 'warrior';
    if (
      cls === 'barbaro' ||
      cls === 'barbarian' ||
      cls === 'warrior' ||
      cls === 'guerriero'
    ) {
      strengthBonus += 2;
      enduranceBonus += 2;
    } else if (cls === 'mago' || cls === 'mage') {
      intelligenceBonus += 2;
      knowledgeBonus += 2;
    } else if (cls === 'ladro' || cls === 'rogue') {
      focusBonus += 2;
      strengthBonus += 2;
    } else if (cls === 'chierico' || cls === 'cleric') {
      knowledgeBonus += 2;
      disciplineBonus += 2;
    }

    const { data: stats } = await this.supabase
      .getClient()
      .from('character_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (stats) {
      await this.supabase
        .getClient()
        .from('character_stats')
        .update({
          intelligence: parseFloat(
            (Number(stats.intelligence) + intelligenceBonus).toFixed(2),
          ),
          discipline: parseFloat(
            (Number(stats.discipline) + disciplineBonus).toFixed(2),
          ),
          strength: parseFloat(
            (Number(stats.strength) + strengthBonus).toFixed(2),
          ),
          endurance: parseFloat(
            (Number(stats.endurance) + enduranceBonus).toFixed(2),
          ),
          focus: parseFloat((Number(stats.focus || 1) + focusBonus).toFixed(2)),
          knowledge: parseFloat(
            (Number(stats.knowledge || 1) + knowledgeBonus).toFixed(2),
          ),
        })
        .eq('user_id', userId);
    }

    const avatarId = payload.avatarId || `${race}-${cls}`;
    if (userRow) {
      await this.supabase
        .getClient()
        .from('users')
        .update({
          xp_current: userRow.xp_current + 500,
          race: payload.race,
          class_name: payload.className,
          avatar_id: avatarId,
        })
        .eq('id', userId);
    }

    // Create initial goals based on onboarding answers
    const initialGoals: {
      title: string;
      category: string;
      target_minutes: number;
      xp_reward: number;
    }[] = [];
    if (payload.studyHoursWeekly > 0) {
      initialGoals.push({
        title: `Studia ${payload.studyHoursWeekly}h questa settimana`,
        category: 'STUDY',
        target_minutes: payload.studyHoursWeekly * 60,
        xp_reward: 300,
      });
    }
    if (payload.workoutHoursWeekly > 0) {
      initialGoals.push({
        title: `Allenati ${payload.workoutHoursWeekly}h questa settimana`,
        category: 'WORKOUT',
        target_minutes: payload.workoutHoursWeekly * 60,
        xp_reward: 300,
      });
    }
    for (const g of initialGoals) {
      await this.createGoal(userId, g);
    }

    return this.getPlayerStats(userId);
  }

  async allocateStatPoints(
    userId: string,
    payload: {
      stat:
        | 'intelligence'
        | 'strength'
        | 'endurance'
        | 'discipline'
        | 'focus'
        | 'knowledge'
        | 'health';
      points: number;
    },
  ) {
    const client = this.supabase.getClient();

    // Fetch user stat_points
    const { data: user, error: userError } = await client
      .from('users')
      .select('stat_points')
      .eq('id', userId)
      .single();

    if (userError || !user) throw new NotFoundException('Player not found');
    if (payload.points <= 0 || !Number.isInteger(payload.points)) {
      throw new BadRequestException('Points must be a positive integer');
    }
    if ((user.stat_points || 0) < payload.points) {
      throw new BadRequestException('Not enough stat points');
    }

    // Fetch current character stats
    const { data: stats, error: statError } = await client
      .from('character_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (statError || !stats)
      throw new NotFoundException('Character stats not found');

    const currentVal = Number(stats[payload.stat] || 0);
    const newVal = parseFloat((currentVal + payload.points * 1.0).toFixed(2));

    // Deduct stat points from user
    const { error: userUpdateError } = await client
      .from('users')
      .update({ stat_points: user.stat_points - payload.points })
      .eq('id', userId);

    if (userUpdateError)
      throw new InternalServerErrorException('Error updating stat points');

    // Update character stats
    const { error: statUpdateError } = await client
      .from('character_stats')
      .update({ [payload.stat]: newVal })
      .eq('user_id', userId);

    if (statUpdateError)
      throw new InternalServerErrorException('Error updating stats');

    return this.getPlayerStats(userId);
  }
}

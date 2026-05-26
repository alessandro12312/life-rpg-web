// ─── Battle Combat Engine ───────────────────────────────────────────────────
// Pure functions for combat calculations. No DB access — used by BattleService.

export interface CombatStats {
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  mana: number;
}

export interface CharacterStats {
  intelligence: number;
  strength: number;
  endurance: number;
  discipline: number;
  focus: number;
  knowledge: number;
  health: number;
}

export interface BossScaledStats {
  hp: number;
  atk: number;
  def: number;
}

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  isMiss: boolean;
  damageBlocked: number;
}

export interface StatusEffect {
  type: 'BUFF' | 'DEBUFF';
  statAffected: string; // 'atk' | 'def' | 'spd'
  value: number; // percentage modifier (+0.2 = +20%, -0.25 = -25%)
  duration: number; // remaining turns
  sourceSkillId?: string;
}

// ─── Stat Derivation ────────────────────────────────────────────────────────
// Converts character_stats + level into combat-ready stats.
export function deriveCombatStats(
  level: number,
  stats: CharacterStats,
): CombatStats {
  const s = stats;
  return {
    maxHp: Math.floor(80 + s.health * 15 + s.endurance * 8 + level * 5),
    atk: Math.floor(8 + s.strength * 3 + s.intelligence * 1.5 + level * 2),
    def: Math.floor(5 + s.endurance * 2 + s.discipline * 1.5 + level * 1.5),
    spd: Math.floor(5 + s.focus * 2 + s.discipline * 1 + level * 0.5),
    mana: Math.floor(50 + s.intelligence * 5 + s.focus * 3 + level * 2),
  };
}

// Calculates boss stats for a specific phase, scaling dynamically with party/player level.
export function scaleBossStats(
  level: number,
  tier: number,
  difficultyFactor: number,
  phaseIndex: number, // 0-based
): BossScaledStats {
  const hpBase = 150 + tier * 50 + level * 40;
  const atkBase = 10 + tier * 4 + level * 4.0;
  const defBase = 5 + tier * 3 + level * 2.5;

  const phaseMultiplier = 1 + phaseIndex * 0.3; // +30% HP per phase
  const phaseAtkMultiplier = 1 + phaseIndex * 0.15; // +15% ATK per phase
  const phaseDefMultiplier = 1 + phaseIndex * 0.1; // +10% DEF per phase

  return {
    hp: Math.floor(hpBase * difficultyFactor * phaseMultiplier),
    atk: Math.floor(atkBase * difficultyFactor * phaseAtkMultiplier),
    def: Math.floor(defBase * difficultyFactor * phaseDefMultiplier),
  };
}

// ─── Critical Hit ───────────────────────────────────────────────────────────
// Focus increases crit chance: 5% base, +1% per focus, capped at 25%.
export function getCritChance(focus: number): number {
  return Math.min(0.25, 0.05 + focus * 0.01);
}

export function rollCritical(focus: number): boolean {
  return Math.random() < getCritChance(focus);
}

// ─── Miss Chance ────────────────────────────────────────────────────────────
// Very low miss rate, slightly reduced by speed.
export function rollMiss(attackerSpd: number, defenderSpd: number): boolean {
  const baseMiss = 0.05; // 5% base
  const spdDiff = defenderSpd - attackerSpd;
  const missChance = Math.max(0.01, Math.min(0.15, baseMiss + spdDiff * 0.005));
  return Math.random() < missChance;
}

// ─── Damage Calculation ─────────────────────────────────────────────────────
// Final Fantasy-inspired: ATK vs DEF with variance and crit multiplier.
export function calculateDamage(
  attackerAtk: number,
  defenderDef: number,
  skillMultiplier: number = 1.0,
  isCritical: boolean,
  isDefending: boolean = false,
): number {
  const baseDamage = Math.max(1, attackerAtk - Math.floor(defenderDef * 0.6));
  const variance = 0.9 + Math.random() * 0.2; // ±10%
  const critMultiplier = isCritical ? 1.5 : 1.0;
  const defendMultiplier = isDefending ? 0.5 : 1.0;

  return Math.floor(
    baseDamage * skillMultiplier * variance * critMultiplier * defendMultiplier,
  );
}

// ─── Healing Calculation ────────────────────────────────────────────────────
export function calculateHealing(
  maxHp: number,
  currentHp: number,
  healMultiplier: number,
): number {
  const healAmount = Math.floor(maxHp * healMultiplier);
  return Math.min(healAmount, maxHp - currentHp); // Don't overheal
}

// ─── Status Effect Application ──────────────────────────────────────────────
// Returns the effective stat value after applying all active status effects.
export function applyStatusEffects(
  baseStat: number,
  statName: string,
  effects: StatusEffect[],
): number {
  let modifier = 0;
  for (const effect of effects) {
    if (effect.statAffected === statName && effect.duration > 0) {
      modifier += effect.value;
    }
  }
  return Math.max(1, Math.floor(baseStat * (1 + modifier)));
}

// ─── Tick Status Effects ────────────────────────────────────────────────────
// Reduces duration of all effects by 1, removes expired ones.
export function tickStatusEffects(effects: StatusEffect[]): StatusEffect[] {
  return effects
    .map((e) => ({ ...e, duration: e.duration - 1 }))
    .filter((e) => e.duration > 0);
}

// ─── Boss AI ────────────────────────────────────────────────────────────────
// Selects which player to target and what action the boss takes.
export interface BossAction {
  actionType: 'BOSS_ATTACK' | 'BOSS_SKILL';
  targetId: string; // participant user_id
  skillMultiplier: number;
  narrative: string;
}

export function decideBossAction(
  bossName: string,
  bossAtk: number,
  participants: Array<{
    userId: string;
    currentHp: number;
    maxHp: number;
    isAlive: boolean;
  }>,
  currentPhase: number,
  turnNumber: number,
): BossAction {
  // Filter alive participants
  const alive = participants.filter((p) => p.isAlive);
  if (alive.length === 0) {
    // Should not happen — battle should end before this
    return {
      actionType: 'BOSS_ATTACK',
      targetId: participants[0].userId,
      skillMultiplier: 1.0,
      narrative: `${bossName} si guarda intorno confuso...`,
    };
  }

  // Target selection: 70% lowest HP, 30% random
  let target: (typeof alive)[0];
  if (Math.random() < 0.7) {
    target = alive.reduce(
      (min, p) => (p.currentHp < min.currentHp ? p : min),
      alive[0],
    );
  } else {
    target = alive[Math.floor(Math.random() * alive.length)];
  }

  // Action selection: normal attack most turns, special every ~4 turns in later phases
  const useSpecial = currentPhase > 1 && turnNumber % 4 === 0;

  if (useSpecial) {
    const specialNames = [
      'Colpo Devastante',
      'Artiglio Infernale',
      'Soffio di Fuoco',
      'Schianto Sismico',
      'Lama Oscura',
      'Morso Velenoso',
    ];
    const specialName =
      specialNames[Math.floor(Math.random() * specialNames.length)];

    return {
      actionType: 'BOSS_SKILL',
      targetId: target.userId,
      skillMultiplier: 1.5 + currentPhase * 0.2,
      narrative: `${bossName} usa ${specialName}!`,
    };
  }

  const attackVerbs = ['attacca', 'colpisce', 'si scaglia contro', 'assale'];
  const verb = attackVerbs[Math.floor(Math.random() * attackVerbs.length)];

  return {
    actionType: 'BOSS_ATTACK',
    targetId: target.userId,
    skillMultiplier: 1.0,
    narrative: `${bossName} ${verb}!`,
  };
}

// ─── Reward Calculation ─────────────────────────────────────────────────────
export interface BattleRewards {
  xpPerPlayer: number;
  bonusXp: number; // e.g. no-KO bonus
  lootDrops: Array<{ itemId: string; quantity: number }>;
}

export function calculateRewards(
  bossXpReward: number,
  bossLootTable: Array<{ itemId: string; dropRate: number }>,
  mode: string,
  participantCount: number,
  anyPlayerKOed: boolean,
): BattleRewards {
  let baseXp = bossXpReward;

  // Mode scaling
  if (mode === 'PARTY') {
    baseXp = Math.floor(baseXp * 0.8); // Party gets slightly less total, but shared
  } else if (mode === 'RAID') {
    baseXp = Math.floor(baseXp * 0.6); // Raid gets less per person
  }

  const xpPerPlayer = Math.floor(baseXp / participantCount);
  const bonusXp = anyPlayerKOed ? 0 : Math.floor(bossXpReward * 0.2); // +20% no-KO bonus

  // Loot drops
  const lootDrops: Array<{ itemId: string; quantity: number }> = [];
  for (const loot of bossLootTable) {
    if (Math.random() < loot.dropRate) {
      lootDrops.push({ itemId: loot.itemId, quantity: 1 });
    }
  }

  return { xpPerPlayer, bonusXp, lootDrops };
}

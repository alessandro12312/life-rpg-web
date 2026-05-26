// Simulating the Life RPG progression curve and combat stats

function getXpToNext(level) {
  return Math.floor(100 * Math.pow(level, 1.8) + 900);
}

function simulateProgression() {
  console.log("=== LEVEL PROGRESSION SIMULATION ===");
  console.log("Level\tXP to Next\tCumulative XP\tEst. Focus Hours (10 XP/min, 1.0 mult)");
  let cumulativeXp = 0;
  for (let lvl = 1; lvl <= 100; lvl++) {
    const xpNeeded = getXpToNext(lvl);
    const estHours = (xpNeeded / 600).toFixed(1);
    const cumHours = (cumulativeXp / 600).toFixed(1);
    if (lvl === 1 || lvl === 2 || lvl === 5 || lvl === 10 || lvl === 20 || lvl === 50 || lvl === 80 || lvl === 100) {
      console.log(`${lvl}\t${xpNeeded}\t\t${cumulativeXp}\t\t${estHours} hrs (Cum: ${cumHours} hrs)`);
    }
    cumulativeXp += xpNeeded;
  }
}

// Derive combat stats
function deriveCombatStats(level, stats) {
  return {
    maxHp: Math.floor(80 + stats.health * 15 + stats.endurance * 8 + level * 5),
    atk: Math.floor(8 + stats.strength * 3 + stats.intelligence * 1.5 + level * 2),
    def: Math.floor(5 + stats.endurance * 2 + stats.discipline * 1.5 + level * 1.5),
    spd: Math.floor(5 + stats.focus * 2 + stats.discipline * 1 + level * 0.5),
    mana: Math.floor(50 + stats.intelligence * 5 + stats.focus * 3 + level * 2),
  };
}

// Boss Stat Scaling
function scaleBossStats(tier, difficultyFactor, phaseIndex) {
  const hpBase = 300 + tier * 200;
  const phaseMultiplier = 1 + phaseIndex * 0.3; // +30% HP per phase
  return {
    hp: Math.floor(hpBase * difficultyFactor * phaseMultiplier),
    atk: Math.floor((20 + tier * 12) * difficultyFactor * (1 + phaseIndex * 0.15)),
    def: Math.floor((10 + tier * 8) * difficultyFactor * (1 + phaseIndex * 0.15)), // note: scaleBossStats in battle-combat.engine.ts line 75 has (1 + phaseIndex * 0.1) for def
  };
}

function simulateCombat() {
  console.log("\n=== COMBAT STATS SIMULATION ===");
  // Define a starter character (Level 1) with race Human and class Warrior
  // Onboarding stats for human: +1 to all
  // Onboarding stats for warrior: +2 strength, +2 endurance
  // Total stats starts at 1 base + onboarding bonuses
  const baseStats = { intelligence: 2, strength: 4, endurance: 4, discipline: 2, focus: 2, knowledge: 2, health: 1 };
  
  console.log("Starter Character Combat Stats (Lvl 1 Warrior):");
  console.log(deriveCombatStats(1, baseStats));
  
  // Level 10 Character stats
  // Leveling up gives 5 stat points per level. Total levels gained = 9, so 45 stat points.
  // Plus stats gained from activity logs: let's assume they logged 30 hours of STUDY/WORKOUT (1800 minutes).
  // Activity gains: (duration / 60) * 0.08 * multiplier. 30 hours = 30 * 0.08 = 2.4 points to primary stat.
  // Also endurance gains: 30 * 0.03 = 0.9 points.
  // Let's assume a Level 10 character stats has added ~50 stats points in total.
  // Let's check a balanced distribution:
  const lvl10Stats = {
    intelligence: 5,
    strength: 20,
    endurance: 15,
    discipline: 8,
    focus: 8,
    knowledge: 5,
    health: 4,
  };
  const lvl10Combat = deriveCombatStats(10, lvl10Stats);
  console.log("\nLevel 10 Character Combat Stats (Strength Focus):");
  console.log(lvl10Combat);

  // Level 50 Character stats
  // Levels gained = 49 -> 245 stat points. Plus activity stats: let's assume ~60 hours of focus (approx 5 stat points extra).
  // Total stats added: ~250.
  const lvl50Stats = {
    intelligence: 15,
    strength: 100,
    endurance: 60,
    discipline: 40,
    focus: 40,
    knowledge: 15,
    health: 20,
  };
  const lvl50Combat = deriveCombatStats(50, lvl50Stats);
  console.log("\nLevel 50 Character Combat Stats (Strength Focus):");
  console.log(lvl50Combat);

  console.log("\n=== BOSS SCALING SIMULATION ===");
  for (let tier = 1; tier <= 5; tier++) {
    console.log(`\nTier ${tier} Boss (Diff: 1.0, Phase 1 vs Phase 3):`);
    console.log("Phase 1:", scaleBossStats(tier, 1.0, 0));
    console.log("Phase 3:", scaleBossStats(tier, 1.0, 2));
  }
}

simulateProgression();
simulateCombat();

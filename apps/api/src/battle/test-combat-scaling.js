// Simulate combat using new level scaling formulas

function deriveCombatStats(level, stats) {
  return {
    maxHp: Math.floor(80 + stats.health * 15 + stats.endurance * 8 + level * 5),
    atk: Math.floor(8 + stats.strength * 3 + stats.intelligence * 1.5 + level * 2),
    def: Math.floor(5 + stats.endurance * 2 + stats.discipline * 1.5 + level * 1.5),
    spd: Math.floor(5 + stats.focus * 2 + stats.discipline * 1 + level * 0.5),
    mana: Math.floor(50 + stats.intelligence * 5 + stats.focus * 3 + level * 2),
  };
}

function scaleBossStatsNew(level, tier, difficultyFactor, phaseIndex) {
  const hpBase = 150 + tier * 50 + level * 40;
  const atkBase = 10 + tier * 4 + level * 4.0;
  const defBase = 5 + tier * 3 + level * 2.5;

  const phaseMultiplier = 1 + phaseIndex * 0.3;
  const phaseAtkMultiplier = 1 + phaseIndex * 0.15;
  const phaseDefMultiplier = 1 + phaseIndex * 0.1;

  return {
    hp: Math.floor(hpBase * difficultyFactor * phaseMultiplier),
    atk: Math.floor(atkBase * difficultyFactor * phaseAtkMultiplier),
    def: Math.floor(defBase * difficultyFactor * phaseDefMultiplier),
  };
}

function runCombatSim(playerLevel, playerStats, bossTier, bossDiff) {
  const player = deriveCombatStats(playerLevel, playerStats);
  const boss = scaleBossStatsNew(playerLevel, bossTier, bossDiff, 0); // Phase 1

  console.log(`\nPlayer Lvl ${playerLevel} vs Tier ${bossTier} Boss (Diff: ${bossDiff}):`);
  console.log("Player:", player);
  console.log("Boss Phase 1:", boss);

  // Compute damage
  // Player to Boss:
  const playerDmg = Math.max(1, player.atk - Math.floor(boss.def * 0.6));
  const playerTurnsToWin = Math.ceil(boss.hp / playerDmg);

  // Boss to Player:
  const bossDmg = Math.max(1, boss.atk - Math.floor(player.def * 0.6));
  const bossTurnsToWin = Math.ceil(player.maxHp / bossDmg);

  console.log(`Player deals ${playerDmg} dmg/turn -> defeats Boss in ${playerTurnsToWin} turns.`);
  console.log(`Boss deals ${bossDmg} dmg/turn -> KOs Player in ${bossTurnsToWin} turns.`);
  if (playerTurnsToWin < bossTurnsToWin) {
    console.log("Outcome: PLAYER WINS!");
  } else {
    console.log("Outcome: BOSS WINS (Soft lock or defeat)!");
  }
}

// 1. Level 1 Warrior vs Tier 1 Boss (1.0 diff)
// Starter warrior stats
const lvl1Stats = { intelligence: 2, strength: 4, endurance: 4, discipline: 2, focus: 2, knowledge: 2, health: 1 };
runCombatSim(1, lvl1Stats, 1, 1.0);

// 2. Level 10 Warrior vs Tier 1 Boss (1.0 diff)
const lvl10Stats = { intelligence: 5, strength: 20, endurance: 15, discipline: 8, focus: 8, knowledge: 5, health: 4 };
runCombatSim(10, lvl10Stats, 1, 1.0);

// 3. Level 10 Warrior vs Tier 3 Boss (1.0 diff)
runCombatSim(10, lvl10Stats, 3, 1.0);

// 4. Level 50 Warrior vs Tier 5 Boss (1.0 diff)
const lvl50Stats = { intelligence: 15, strength: 100, endurance: 60, discipline: 40, focus: 40, knowledge: 15, health: 20 };
runCombatSim(50, lvl50Stats, 5, 1.0);

// 5. Level 100 Warrior vs Tier 5 Boss (1.2 diff)
const lvl100Stats = { intelligence: 30, strength: 200, endurance: 120, discipline: 80, focus: 80, knowledge: 30, health: 40 };
runCombatSim(100, lvl100Stats, 5, 1.2);

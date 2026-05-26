// Testing alternative progression curve formulas
const dailyXp = 1500; // 1500 XP/day on average for active players (with goals, streak, and combat rewards)

const curves = [
  { name: "Current Formula (exp 1.8)", fn: lvl => Math.floor(100 * Math.pow(lvl, 1.8) + 900) },
  { name: "Alternative 1: exp 1.25", fn: lvl => Math.floor(100 * Math.pow(lvl, 1.25) + 900) },
  { name: "Alternative 2: exp 1.2", fn: lvl => Math.floor(100 * Math.pow(lvl, 1.2) + 900) },
  { name: "Alternative 3: Lower base, exp 1.3", fn: lvl => Math.floor(75 * Math.pow(lvl, 1.3) + 700) },
  { name: "Alternative 4: Linear-ish, exp 1.1", fn: lvl => Math.floor(100 * Math.pow(lvl, 1.1) + 900) },
  { name: "Alternative 5: Logarithmic-linear mix", fn: lvl => Math.floor(150 * lvl + 850) },
];

for (const curve of curves) {
  let cumulativeXp = 0;
  console.log(`=== ${curve.name} ===`);
  console.log("Level\tXP Required\tCumulative XP\tDays to Reach Level");
  
  for (let lvl = 1; lvl <= 100; lvl++) {
    const xpNeeded = curve.fn(lvl);
    if (lvl === 1 || lvl === 5 || lvl === 10 || lvl === 20 || lvl === 50 || lvl === 80 || lvl === 100) {
      const daysToLvl = (cumulativeXp / dailyXp).toFixed(0);
      const hoursToLvl = (cumulativeXp / 600).toFixed(0); // 600 XP per focus hour
      console.log(`${lvl}\t${xpNeeded}\t\t${cumulativeXp}\t\t${daysToLvl} days (${hoursToLvl} hrs of focus)`);
    }
    cumulativeXp += xpNeeded;
  }
  console.log();
}

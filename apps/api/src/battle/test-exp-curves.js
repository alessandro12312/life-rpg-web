// Evaluating different EXP curves
const exponents = [1.2, 1.3, 1.4, 1.5, 1.8];
const dailyXp = 1000; // Assume 100 minutes of active tracking at 10 XP/min = 1000 XP per day

console.log("Daily target: " + dailyXp + " XP (approx. 100 minutes of active tracking / day)\n");

for (const k of exponents) {
  let cumulativeXp = 0;
  console.log(`--- Curve: Math.floor(100 * Math.pow(level, ${k}) + 900) ---`);
  console.log("Level\tXP Required\tCumulative XP\tDays to Reach Level");
  
  for (let lvl = 1; lvl <= 100; lvl++) {
    const xpNeeded = Math.floor(100 * Math.pow(lvl, k) + 900);
    if (lvl === 1 || lvl === 5 || lvl === 10 || lvl === 20 || lvl === 50 || lvl === 80 || lvl === 100) {
      const daysToLvl = (cumulativeXp / dailyXp).toFixed(0);
      const hoursToLvl = (cumulativeXp / 600).toFixed(0);
      console.log(`${lvl}\t${xpNeeded}\t\t${cumulativeXp}\t\t${daysToLvl} days (${hoursToLvl} hrs of focus)`);
    }
    cumulativeXp += xpNeeded;
  }
  console.log();
}

// ─── Combat Skills Catalog ──────────────────────────────────────────────────
// Skills available during battle, filtered by player class.
// '*' means the skill is available to all classes.

export interface CombatSkill {
    id: string;
    name: string;
    description: string;
    classes: string[];       // class names that can use this skill ('*' = universal)
    manaCost: number;
    cooldown: number;        // turns until reusable (0 = no cooldown)
    effect: {
        type: 'DAMAGE' | 'HEAL' | 'BUFF' | 'DEBUFF';
        multiplier?: number;     // damage/heal multiplier
        statAffected?: string;   // for BUFF/DEBUFF: 'atk' | 'def' | 'spd'
        duration?: number;       // turns the effect lasts
        value?: number;          // +/- percentage for BUFF/DEBUFF
    };
}

export const COMBAT_SKILLS: CombatSkill[] = [
    // ─── Universal ────────────────────────────────────────────────────────
    {
        id: 'focus_strike',
        name: 'Colpo Concentrato',
        description: 'Un attacco preciso che sfrutta la concentrazione.',
        classes: ['*'],
        manaCost: 10,
        cooldown: 0,
        effect: { type: 'DAMAGE', multiplier: 1.3 },
    },

    // ─── Warrior / Barbarian ──────────────────────────────────────────────
    {
        id: 'heavy_slash',
        name: 'Fendente Pesante',
        description: 'Un colpo devastante con tutta la forza bruta.',
        classes: ['warrior', 'barbarian', 'barbaro', 'guerriero'],
        manaCost: 15,
        cooldown: 0,
        effect: { type: 'DAMAGE', multiplier: 1.8 },
    },
    {
        id: 'battle_cry',
        name: 'Grido di Guerra',
        description: 'Un urlo che aumenta l\'attacco per 3 turni.',
        classes: ['warrior', 'barbarian', 'barbaro', 'guerriero'],
        manaCost: 25,
        cooldown: 3,
        effect: { type: 'BUFF', statAffected: 'atk', value: 0.2, duration: 3 },
    },
    {
        id: 'whirlwind',
        name: 'Turbine d\'Acciaio',
        description: 'Attacco rotante con danno massiccio.',
        classes: ['warrior', 'barbarian', 'barbaro', 'guerriero'],
        manaCost: 35,
        cooldown: 4,
        effect: { type: 'DAMAGE', multiplier: 2.2 },
    },

    // ─── Mage ─────────────────────────────────────────────────────────────
    {
        id: 'fireball',
        name: 'Palla di Fuoco',
        description: 'Una sfera di fuoco devastante.',
        classes: ['mage', 'mago'],
        manaCost: 30,
        cooldown: 1,
        effect: { type: 'DAMAGE', multiplier: 2.5 },
    },
    {
        id: 'magic_shield',
        name: 'Scudo Magico',
        description: 'Un barriera magica che aumenta la difesa.',
        classes: ['mage', 'mago'],
        manaCost: 20,
        cooldown: 2,
        effect: { type: 'BUFF', statAffected: 'def', value: 0.5, duration: 2 },
    },
    {
        id: 'arcane_blast',
        name: 'Esplosione Arcana',
        description: 'Energia arcana pura concentrata in un singolo colpo.',
        classes: ['mage', 'mago'],
        manaCost: 45,
        cooldown: 3,
        effect: { type: 'DAMAGE', multiplier: 3.0 },
    },

    // ─── Rogue ────────────────────────────────────────────────────────────
    {
        id: 'backstab',
        name: 'Pugnalata alle Spalle',
        description: 'Un attacco furtivo mirato al punto debole.',
        classes: ['rogue', 'ladro'],
        manaCost: 20,
        cooldown: 1,
        effect: { type: 'DAMAGE', multiplier: 2.2 },
    },
    {
        id: 'smoke_bomb',
        name: 'Bomba Fumogena',
        description: 'Riduce l\'attacco del nemico per 2 turni.',
        classes: ['rogue', 'ladro'],
        manaCost: 15,
        cooldown: 3,
        effect: { type: 'DEBUFF', statAffected: 'atk', value: -0.25, duration: 2 },
    },
    {
        id: 'venom_strike',
        name: 'Colpo Velenoso',
        description: 'Avvelena il nemico riducendone la difesa.',
        classes: ['rogue', 'ladro'],
        manaCost: 25,
        cooldown: 2,
        effect: { type: 'DEBUFF', statAffected: 'def', value: -0.3, duration: 3 },
    },

    // ─── Cleric ───────────────────────────────────────────────────────────
    {
        id: 'holy_light',
        name: 'Luce Sacra',
        description: 'Cura le ferite con energia divina.',
        classes: ['cleric', 'chierico'],
        manaCost: 25,
        cooldown: 1,
        effect: { type: 'HEAL', multiplier: 0.3 },
    },
    {
        id: 'smite',
        name: 'Punizione Divina',
        description: 'Un attacco sacro che brucia i non-morti.',
        classes: ['cleric', 'chierico'],
        manaCost: 20,
        cooldown: 0,
        effect: { type: 'DAMAGE', multiplier: 1.6 },
    },
    {
        id: 'divine_protection',
        name: 'Protezione Divina',
        description: 'Aumenta la difesa di tutto il party per 3 turni.',
        classes: ['cleric', 'chierico'],
        manaCost: 35,
        cooldown: 4,
        effect: { type: 'BUFF', statAffected: 'def', value: 0.3, duration: 3 },
    },
];

/**
 * Returns skills available for a given class name (case-insensitive).
 * Universal skills ('*') are always included.
 */
export function getSkillsForClass(className: string): CombatSkill[] {
    const normalizedClass = className.toLowerCase().trim();
    return COMBAT_SKILLS.filter(
        skill => skill.classes.includes('*') || skill.classes.includes(normalizedClass),
    );
}

/**
 * Finds a specific combat skill by ID.
 */
export function getCombatSkillById(skillId: string): CombatSkill | undefined {
    return COMBAT_SKILLS.find(s => s.id === skillId);
}

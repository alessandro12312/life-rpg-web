// ─── Items Catalog ──────────────────────────────────────────────────────────
// Consumable items usable during battle or obtained as loot drops.

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: 'POTION' | 'BUFF' | 'ATTACK' | 'MATERIAL';
  effect: {
    type: 'HEAL_HP' | 'HEAL_MANA' | 'BUFF_ATK' | 'BUFF_DEF' | 'DAMAGE';
    value: number; // flat amount or percentage (0.0 - 1.0 for %)
    isPercentage?: boolean; // true → value is treated as % of max
    duration?: number; // turns for buffs
  };
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC';
  maxStack: number; // max quantity per inventory slot
}

export const ITEMS_CATALOG: ItemDef[] = [
  // ─── Potions ──────────────────────────────────────────────────────────
  {
    id: 'potion_hp_small',
    name: 'Pozione di Vita (Piccola)',
    description: 'Ripristina il 25% degli HP massimi.',
    category: 'POTION',
    effect: { type: 'HEAL_HP', value: 0.25, isPercentage: true },
    rarity: 'COMMON',
    maxStack: 5,
  },
  {
    id: 'potion_hp_large',
    name: 'Pozione di Vita (Grande)',
    description: 'Ripristina il 50% degli HP massimi.',
    category: 'POTION',
    effect: { type: 'HEAL_HP', value: 0.5, isPercentage: true },
    rarity: 'UNCOMMON',
    maxStack: 3,
  },
  {
    id: 'potion_mana_small',
    name: 'Pozione di Mana (Piccola)',
    description: 'Ripristina il 30% del mana massimo.',
    category: 'POTION',
    effect: { type: 'HEAL_MANA', value: 0.3, isPercentage: true },
    rarity: 'COMMON',
    maxStack: 5,
  },
  {
    id: 'potion_mana_large',
    name: 'Pozione di Mana (Grande)',
    description: 'Ripristina il 60% del mana massimo.',
    category: 'POTION',
    effect: { type: 'HEAL_MANA', value: 0.6, isPercentage: true },
    rarity: 'UNCOMMON',
    maxStack: 3,
  },

  // ─── Buff Items ───────────────────────────────────────────────────────
  {
    id: 'elixir_strength',
    name: 'Elisir di Forza',
    description: "Aumenta l'attacco del 20% per 3 turni.",
    category: 'BUFF',
    effect: { type: 'BUFF_ATK', value: 0.2, duration: 3 },
    rarity: 'UNCOMMON',
    maxStack: 3,
  },
  {
    id: 'elixir_iron_skin',
    name: 'Elisir Pelle di Ferro',
    description: 'Aumenta la difesa del 25% per 3 turni.',
    category: 'BUFF',
    effect: { type: 'BUFF_DEF', value: 0.25, duration: 3 },
    rarity: 'UNCOMMON',
    maxStack: 3,
  },

  // ─── Attack Items ─────────────────────────────────────────────────────
  {
    id: 'bomb_fire',
    name: 'Bomba Incendiaria',
    description: 'Infligge 80 danni al boss.',
    category: 'ATTACK',
    effect: { type: 'DAMAGE', value: 80 },
    rarity: 'RARE',
    maxStack: 2,
  },

  // ─── Materials (non-usable, for crafting/trade) ───────────────────────
  {
    id: 'dragon_scale',
    name: 'Scaglia di Drago',
    description: 'Un materiale raro ottenuto dai boss drago.',
    category: 'MATERIAL',
    effect: { type: 'HEAL_HP', value: 0 }, // no combat effect
    rarity: 'EPIC',
    maxStack: 99,
  },
  {
    id: 'demon_essence',
    name: 'Essenza Demoniaca',
    description: 'Energia oscura raccolta dai demoni sconfitti.',
    category: 'MATERIAL',
    effect: { type: 'HEAL_HP', value: 0 },
    rarity: 'RARE',
    maxStack: 99,
  },
  {
    id: 'beast_fang',
    name: 'Zanna di Bestia',
    description: 'Una zanna affilata, utile per il crafting.',
    category: 'MATERIAL',
    effect: { type: 'HEAL_HP', value: 0 },
    rarity: 'COMMON',
    maxStack: 99,
  },
];

/**
 * Returns an item definition by its ID.
 */
export function getItemById(itemId: string): ItemDef | undefined {
  return ITEMS_CATALOG.find((i) => i.id === itemId);
}

/**
 * Returns only items usable in battle (excludes MATERIAL category).
 */
export function getUsableBattleItems(): ItemDef[] {
  return ITEMS_CATALOG.filter((i) => i.category !== 'MATERIAL');
}

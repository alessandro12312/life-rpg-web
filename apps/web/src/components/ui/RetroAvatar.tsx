import * as React from "react";
import { cn } from "@/lib/utils";

export interface RetroAvatarProps extends React.SVGProps<SVGSVGElement> {
  race: string;
  className?: string; // Standard HTML/React class string
  characterClass?: string; // The RPG class (e.g. warrior, mage, rogue, cleric)
  gender?: string; // 'm' / 'f' or 'male' / 'female'
  size?: number;
  showBackdrop?: boolean;
}

/**
 * Normalizes race input into standard English forms.
 */
const normalizeRace = (race: string): "human" | "elf" | "orc" | "dwarf" | "undead" => {
  const r = (race || "").toLowerCase().trim();
  if (r.includes("elf")) return "elf";
  if (r.includes("orc") || r.includes("orc")) return "orc";
  if (r.includes("nan") || r.includes("dwar")) return "dwarf";
  if (r.includes("undea") || r.includes("morto")) return "undead";
  return "human"; // Default
};

/**
 * Normalizes RPG class input into standard English forms.
 */
const normalizeClass = (cls: string): "warrior" | "mage" | "rogue" | "cleric" => {
  const c = (cls || "").toLowerCase().trim();
  if (c.includes("guer") || c.includes("warr")) return "warrior";
  if (c.includes("mag")) return "mage";
  if (c.includes("lad") || c.includes("rog") || c.includes("thie")) return "rogue";
  if (c.includes("chie") || c.includes("cler")) return "cleric";
  return "warrior"; // Default
};

/**
 * Normalizes gender input.
 */
const normalizeGender = (g: string): "male" | "female" => {
  const gender = (g || "").toLowerCase().trim();
  if (gender === "f" || gender.includes("fem") || gender.includes("donn")) return "female";
  return "male"; // Default
};

/**
 * Decides the colors for each cell character in the 12x12 grid.
 */
const getPixelColor = (
  key: string,
  race: "human" | "elf" | "orc" | "dwarf" | "undead",
  charClass: "warrior" | "mage" | "rogue" | "cleric",
  gender: "male" | "female"
): string => {
  switch (key) {
    case "O": // Outline
      return "#0b0813";
    case "S": // Skin
      switch (race) {
        case "elf":
          return "#fbf1e6"; // Pale alabaster
        case "orc":
          return "#4a9c5d"; // Savage green
        case "dwarf":
          return "#e29c78"; // Warm bronze
        case "undead":
          return "#758d88"; // Rotting green-grey
        case "human":
        default:
          return "#eeb490"; // Standard peach
      }
    case "H": // Hair
      switch (race) {
        case "elf":
          return "#e0f2fe"; // Ethereal silver
        case "orc":
          return "#1e293b"; // Obsidian dark
        case "dwarf":
          return "#d35400"; // Fire ginger
        case "undead":
          return "#475569"; // Rusted charcoal
        case "human":
        default:
          return gender === "female" ? "#b45309" : "#451a03"; // Golden blonde vs deep brown
      }
    case "E": // Eyes
      switch (race) {
        case "undead":
          return "#ef4444"; // Piercing red
        case "elf":
          return "#22d3ee"; // Glowing cyan
        case "orc":
          return "#fbbf24"; // Feral yellow
        default:
          return "#000000"; // Pitch black
      }
    case "M": // Mouth / Nose
      switch (race) {
        case "orc":
          return "#2f663c"; // Dark green shadow
        case "undead":
          return "#4a5b57"; // Dark grey shadow
        default:
          return "#ca8a04"; // Darker peach/shadow
      }
    case "B": // Beard (dwarves only)
      return "#b45309"; // Rich ginger beard
    case "A": // Armor Base
      switch (charClass) {
        case "warrior":
          return "#64748b"; // Steel plates
        case "mage":
          return "#1e1b4b"; // Cosmic indigo robes
        case "rogue":
          return "#0f172a"; // Shadowy slate armor
        case "cleric":
          return "#f1f5f9"; // Holy white surcoat
        default:
          return "#475569";
      }
    case "C": // Armor Accent (Class insignia / details)
      switch (charClass) {
        case "warrior":
          return "#dc2626"; // Battle red trims
        case "mage":
          return "#a855f7"; // Arcane purple gem
        case "rogue":
          return "#10b981"; // Poison green highlights
        case "cleric":
          return "#fbbf24"; // Sunburst gold
        default:
          return "#f59e0b";
      }
    default:
      return "transparent";
  }
};

/**
 * Builds the 12x12 procedural matrix for the avatar, incorporating race, class, and gender rules.
 */
const getSpriteMatrix = (
  race: "human" | "elf" | "orc" | "dwarf" | "undead",
  charClass: "warrior" | "mage" | "rogue" | "cleric",
  gender: "male" | "female"
): string[][] => {
  // Initialize with transparent cells '.'
  const m = Array(12)
    .fill(null)
    .map(() => Array(12).fill("."));

  const isFemale = gender === "female";
  const isDwarf = race === "dwarf";
  const isElf = race === "elf";

  // 1. Hair / Helmet base (Rows 1 & 2)
  for (let c = 3; c <= 8; c++) m[1][c] = "H";
  for (let c = 2; c <= 9; c++) m[2][c] = "H";

  // 2. Face & Hair sides (Row 3)
  m[3][2] = isFemale ? "H" : ".";
  for (let c = 3; c <= 8; c++) m[3][c] = "S";
  m[3][9] = isFemale ? "H" : ".";

  // 3. Eyes & Ears (Row 4)
  if (isFemale) {
    m[4][2] = "H";
    m[4][9] = "H";
  } else if (isElf) {
    m[4][2] = "S"; // Pointed elven ear left
    m[4][9] = "S"; // Pointed elven ear right
  }
  for (let c = 3; c <= 8; c++) m[4][c] = "S";
  m[4][4] = "E"; // Left Eye
  m[4][7] = "E"; // Right Eye

  // 4. Mouth & Cheek Hair (Row 5)
  if (isFemale) {
    m[5][2] = "H";
    m[5][9] = "H";
  }
  for (let c = 3; c <= 8; c++) m[5][c] = "S";
  m[5][5] = "M"; // Mouth
  m[5][6] = "M";

  // Dwarf Beard overlay
  if (isDwarf && !isFemale) {
    m[5][4] = "B";
    m[5][5] = "B";
    m[5][6] = "B";
    m[5][7] = "B";
  }

  // 5. Neck & Hair bottom (Row 6)
  if (isFemale) {
    m[6][2] = "H";
    m[6][9] = "H";
  }
  for (let c = 4; c <= 7; c++) m[6][c] = "S"; // neck

  if (isDwarf && !isFemale) {
    for (let c = 3; c <= 8; c++) m[6][c] = "B"; // Full beard covers neck
  }

  // 6. Shoulders / Robe Top (Row 7)
  for (let c = 2; c <= 9; c++) m[7][c] = "A";
  if (isFemale) {
    m[7][2] = "H";
    m[7][9] = "H";
  }
  if (isDwarf && !isFemale) {
    m[7][4] = "B"; // Beard overlaps chest/shoulders
    m[7][5] = "B";
    m[7][6] = "B";
    m[7][7] = "B";
  }

  // 7. Core Body / Armor (Rows 8, 9, 10)
  for (let r = 8; r <= 10; r++) {
    for (let c = 3; c <= 8; c++) {
      m[r][c] = "A";
    }
  }

  // Class insignia/gem design (Center chest)
  m[8][5] = "C";
  m[8][6] = "C";
  m[9][5] = "C";
  m[9][6] = "C";

  // 8. Auto-generate Outlines ('O') where solid meets transparent
  const outlineMatrix = m.map((row) => [...row]);
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 12; c++) {
      if (m[r][c] !== ".") {
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          // Check if neighbor cell is out of bounds or transparent
          if (nr < 0 || nr >= 12 || nc < 0 || nc >= 12 || m[nr][nc] === ".") {
            if (nr >= 0 && nr < 12 && nc >= 0 && nc < 12) {
              if (m[nr][nc] === ".") {
                outlineMatrix[nr][nc] = "O";
              }
            }
          }
        }
      }
    }
  }

  return outlineMatrix;
};

export const RetroAvatar = React.forwardRef<SVGSVGElement, RetroAvatarProps>(
  (
    {
      race,
      characterClass = "warrior",
      gender = "male",
      size = 64,
      showBackdrop = true,
      className,
      ...props
    },
    ref
  ) => {
    const normalizedRace = normalizeRace(race);
    const normalizedClass = normalizeClass(characterClass);
    const normalizedGender = normalizeGender(gender);

    const matrix = getSpriteMatrix(normalizedRace, normalizedClass, normalizedGender);

    return (
      <svg
        ref={ref}
        viewBox="0 0 12 12"
        width={size}
        height={size}
        className={cn("select-none bg-transparent", className)}
        style={{ shapeRendering: "crispEdges" }}
        {...props}
      >
        {showBackdrop && (
          <>
            {/* Dark background circle */}
            <circle cx="6" cy="6" r="5.5" fill="#0f0c1b" stroke="#1d1635" strokeWidth="0.5" />
            {/* Grid pattern overlay for that digital viewport look */}
            <pattern id="retro-grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <rect width="1" height="1" fill="none" stroke="#1e183a" strokeWidth="0.05" />
            </pattern>
            <circle cx="6" cy="6" r="5.2" fill="url(#retro-grid)" />
          </>
        )}

        {/* Character pixels */}
        {matrix.flatMap((row, r) =>
          row.map((cell, c) => {
            if (cell === ".") return null;
            const fill = getPixelColor(cell, normalizedRace, normalizedClass, normalizedGender);
            return (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill={fill}
              />
            );
          })
        )}
      </svg>
    );
  }
);

RetroAvatar.displayName = "RetroAvatar";

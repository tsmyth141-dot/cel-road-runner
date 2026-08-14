export type WeaponDef = {
  id: string;
  name: string;
  /** Body / accent colours used by the first-person viewmodel. */
  body: number;
  accent: number;
  kind: "fists" | "gun";
  /** Where in the story it becomes available. */
  unlockedBy: string;
};

/** Ordered arsenal. Index 0 is always owned (bare fists); the rest are earned. */
export const WEAPONS: WeaponDef[] = [
  { id: "fists", name: "Taped Fists", body: 0xf2c49b, accent: 0xf2f2f2, kind: "fists", unlockedBy: "Start" },
  { id: "tagger", name: "Tagger .45", body: 0x5b4bd6, accent: 0xff2e7e, kind: "gun", unlockedBy: "Club floor" },
  { id: "shaker", name: "Shaker SMG", body: 0x27d17c, accent: 0xffd400, kind: "gun", unlockedBy: "Back alley" },
  { id: "nozzle", name: "Nozzle Cannon", body: 0xff7a1a, accent: 0x00e5ff, kind: "gun", unlockedBy: "Downtown" },
  { id: "chrome", name: "Chrome Burner", body: 0xdfe7ff, accent: 0x8b5cf6, kind: "gun", unlockedBy: "Rooftops" },
];

export function weaponAt(index: number): WeaponDef {
  return WEAPONS[Math.max(0, Math.min(WEAPONS.length - 1, index))]!;
}

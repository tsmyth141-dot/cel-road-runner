export type WeaponDef = {
  id: string;
  name: string;
  /** Body / accent colours used by the first-person viewmodel. */
  body: number;
  accent: number;
  /** Where in the story it becomes available. */
  unlockedBy: string;
};

/** Ordered arsenal. Index 0 is the starting weapon; the rest are earned. */
export const WEAPONS: WeaponDef[] = [
  { id: "tagger", name: "Tagger .45", body: 0x5b4bd6, accent: 0xff2e7e, unlockedBy: "Start" },
  { id: "shaker", name: "Shaker SMG", body: 0x27d17c, accent: 0xffd400, unlockedBy: "Club floor" },
  { id: "nozzle", name: "Nozzle Cannon", body: 0xff7a1a, accent: 0x00e5ff, unlockedBy: "Back rooms" },
  { id: "chrome", name: "Chrome Burner", body: 0xdfe7ff, accent: 0x8b5cf6, unlockedBy: "Rooftops" },
];

export function weaponAt(index: number): WeaponDef {
  return WEAPONS[Math.max(0, Math.min(WEAPONS.length - 1, index))]!;
}

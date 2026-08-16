export type SaveData = {
  version: 2;
  chapter: string;
  /** Level the player is standing in ("club" | "city" | ...). */
  zone: string;
  position: [number, number, number];
  yaw: number;
  /** Weapon ids the player has earned so far (index 0 is always owned). */
  unlocked: string[];
  /** Currently equipped weapon id. */
  weapon: string;
  savedAt: number;
};

const KEY = "spraycity.save.v1";

export function loadGame(): SaveData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (!data || !Array.isArray(data.position)) return null;
    if (typeof data.zone !== "string") data.zone = "club";
    if (!Array.isArray(data.unlocked) || data.unlocked.length === 0) {
      data.unlocked = ["fists"];
    }
    if (!data.unlocked.includes("fists")) data.unlocked.unshift("fists");
    if (typeof data.weapon !== "string" || !data.unlocked.includes(data.weapon)) {
      data.weapon = data.unlocked[0]!;
    }
    data.version = 2;
    return data;
  } catch {
    return null;
  }
}

export function saveGame(data: Omit<SaveData, "version" | "savedAt">) {
  if (typeof window === "undefined") return;
  const payload: SaveData = { ...data, version: 2, savedAt: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* storage full or blocked */
  }
}

export function clearSave() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export const NEW_GAME_STATE: Omit<SaveData, "version" | "savedAt"> = {
  chapter: "ch1-the-club",
  zone: "club",
  position: [-14.2, 1.7, 4.2],
  yaw: Math.PI / 2,

  unlocked: ["fists"],
  weapon: "fists",
};

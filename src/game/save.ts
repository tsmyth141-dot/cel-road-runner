export type SaveData = {
  version: 1;
  chapter: string;
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
    if (data?.version !== 1 || !Array.isArray(data.position)) return null;
    if (!Array.isArray(data.unlocked) || data.unlocked.length === 0) {
      data.unlocked = ["tagger"];
    }
    if (typeof data.weapon !== "string") data.weapon = data.unlocked[0]!;
    return data;
  } catch {
    return null;
  }
}

export function saveGame(data: Omit<SaveData, "version" | "savedAt">) {
  if (typeof window === "undefined") return;
  const payload: SaveData = { ...data, version: 1, savedAt: Date.now() };
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
  position: [0, 1.7, 11],
  yaw: 0,
  unlocked: ["tagger"],
  weapon: "tagger",
};

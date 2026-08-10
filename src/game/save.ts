export type SaveData = {
  version: 1;
  chapter: string;
  position: [number, number, number];
  yaw: number;
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
  chapter: "prologue",
  position: [0, 1.7, 8],
  yaw: 0,
};

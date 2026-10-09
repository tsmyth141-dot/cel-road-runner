export type CutsceneLine = { speaker: string; text: string };

export type CutsceneKey = {
  t: number;
  pos: [number, number, number];
  yaw: number;
  pitch: number;
};

export type CutsceneScript = {
  id: string;
  duration: number;
  keys: CutsceneKey[];
  lines: { from: number; to: number; line: CutsceneLine }[];
};

const BARTENDER = "Bartender";

/** Chapter 1 opener: you come to in a booth of the Velvet Can. */
export const CLUB_INTRO: CutsceneScript = {
  id: "ch1-wake-up",
  duration: 19,
  keys: [
    { t: 0, pos: [-14.2, 0.95, 4.2], yaw: -0.6, pitch: -0.8 },
    { t: 2.2, pos: [-14.2, 1.05, 4.25], yaw: -0.85, pitch: -0.62 },
    { t: 4.2, pos: [-14.15, 1.3, 4.3], yaw: -1.3, pitch: -0.32 },
    { t: 7.5, pos: [-14.0, 1.62, 4.3], yaw: -1.94, pitch: -0.06 },
    { t: 13, pos: [-13.8, 1.68, 4.25], yaw: -1.98, pitch: 0.12 },
    { t: 19, pos: [-13.45, 1.7, 4.2], yaw: -1.94, pitch: 0.08 },
  ],
  lines: [
    { from: 0.9, to: 4.4, line: { speaker: BARTENDER, text: "Hey. Hey — you still breathing down there?" } },
    { from: 4.6, to: 8.4, line: { speaker: BARTENDER, text: "Third time this month I've scraped you out of that booth." } },
    { from: 8.6, to: 12.4, line: { speaker: BARTENDER, text: "Club's shut. Everyone's gone. Even the music gave up on you." } },
    { from: 12.6, to: 16.2, line: { speaker: BARTENDER, text: "Go home, kid. Back door's lit — straight out onto Canal Street." } },
    { from: 16.4, to: 19, line: { speaker: BARTENDER, text: "And whatever you did last night... the city remembers." } },
  ],
};

/** Optional follow-up: inspect the wrecked booth after regaining control. */
export const BOOTH_AFTERSHOCK: CutsceneScript = {
  id: "ch1-booth-aftershock",
  duration: 8.5,
  keys: [
    { t: 0, pos: [-13.45, 1.7, 4.2], yaw: -1.94, pitch: 0.08 },
    { t: 2.2, pos: [-14.0, 1.55, 4.15], yaw: -0.82, pitch: -0.48 },
    { t: 5.4, pos: [-13.9, 1.62, 4.18], yaw: -1.72, pitch: -0.08 },
    { t: 8.5, pos: [-13.45, 1.7, 4.2], yaw: -1.94, pitch: 0.04 },
  ],
  lines: [
    { from: 1.2, to: 4.2, line: { speaker: "You", text: "Empty glasses. Spilled ice. None of this is coming back to me." } },
    { from: 4.5, to: 8.2, line: { speaker: BARTENDER, text: "Don't force it. Get some air before the room starts spinning again." } },
  ],
};

export function sampleCutscene(script: CutsceneScript, t: number): CutsceneKey {
  const keys = script.keys;
  if (t <= keys[0]!.t) return keys[0]!;
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i]!;
    if (t <= b.t) {
      const a = keys[i - 1]!;
      const raw = (t - a.t) / Math.max(b.t - a.t, 0.0001);
      const k = raw * raw * (3 - 2 * raw); // smoothstep
      return {
        t,
        pos: [
          a.pos[0] + (b.pos[0] - a.pos[0]) * k,
          a.pos[1] + (b.pos[1] - a.pos[1]) * k,
          a.pos[2] + (b.pos[2] - a.pos[2]) * k,
        ],
        yaw: a.yaw + (b.yaw - a.yaw) * k,
        pitch: a.pitch + (b.pitch - a.pitch) * k,
      };
    }
  }
  return keys[keys.length - 1]!;
}

export function lineAt(script: CutsceneScript, t: number): CutsceneLine | null {
  for (const l of script.lines) if (t >= l.from && t < l.to) return l.line;
  return null;
}

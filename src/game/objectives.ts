export type Objective = { id: string; label: string; complete: boolean };

export function chapterObjectives(zone: string, flags: string[], weaponUnlocked: boolean): Objective[] {
  const outside = zone === "city" || flags.includes("ch1-left-club");
  return [
    { id: "outside", label: "Leave through the green-lit back door", complete: outside },
    { id: "home", label: "Find your way home on Canal Street", complete: weaponUnlocked },
  ];
}
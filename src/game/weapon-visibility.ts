/** Holstering changes presentation, never the selected or owned weapon. */
export function toggleHolstered(holstered: boolean) {
  return !holstered;
}

export function shouldShowWeapon(holstered: boolean, cutscene: boolean, conversation: boolean) {
  return !holstered && !cutscene && !conversation;
}
<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the nightclub's bar and booth scenery authored in `src/game/nightclub.ts` with shared `makeBuilder` materials; this preserves the existing lightweight level pipeline and Chromebook performance.
- Keep waking visual effects scoped to the intro canvas with CSS, leaving dialogue sharp and removing effects on scene end; this avoids extra WebGL passes on Chromebooks.
- Derive chapter objectives from engine story flags and loadout in a shared objective module; this keeps the HUD aligned with saved gameplay progress.
- Keep optional bartender conversation separate from cutscene playback, using engine interaction state and DOM choices; this preserves the player's position and never replays the wake-up.
- Centralize camera-relative movement intent in a pure tested helper; this keeps traditional directional controls consistent with mouse look.
- Share street landmarks between level scenery and navigation tests; this keeps door thresholds and the two-block home approach aligned.

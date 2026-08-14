import { useEffect, useRef, useState } from "react";
import { createEngine, type EngineHandle, type LoadoutState } from "@/game/engine";
import type { SaveData } from "@/game/save";
import { WEAPONS } from "@/game/progression";

type Props = {
  start: Pick<SaveData, "position" | "yaw" | "chapter" | "unlocked" | "weapon" | "zone">;
  onExit: () => void;
};

export default function GameCanvas({ start, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const [locked, setLocked] = useState(false);
  const [loadout, setLoadout] = useState<LoadoutState>({
    unlocked: start.unlocked,
    weapon: start.weapon,
    zone: start.zone,
    title: start.zone === "city" ? "Canal Street" : "The Velvet Can",
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = createEngine(canvasRef.current, start, setLocked, (state) => {
      setLoadout(state);
      if (state.justUnlocked) setToast(state.justUnlocked);
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-background">
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0">
        {/* vignette + scanline grade */}
        <div className="absolute inset-0 bg-vignette" />

        {/* crosshair */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-8 w-8">
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-secondary shadow-hud" />
            <span className="absolute left-1/2 top-0 h-2.5 w-[3px] -translate-x-1/2 bg-primary shadow-hud" />
            <span className="absolute bottom-0 left-1/2 h-2.5 w-[3px] -translate-x-1/2 bg-primary shadow-hud" />
            <span className="absolute left-0 top-1/2 h-[3px] w-2.5 -translate-y-1/2 bg-primary shadow-hud" />
            <span className="absolute right-0 top-1/2 h-[3px] w-2.5 -translate-y-1/2 bg-primary shadow-hud" />
          </div>
        </div>

        {/* corner HUD tags */}
        <div className="absolute bottom-6 left-6 -rotate-2">
          <p className="font-display text-xs uppercase tracking-[0.4em] text-secondary">
            Chapter 1 — {loadout.zone === "city" ? "Out on the block" : "The Velvet Can"}
          </p>
          <p className="font-display text-4xl uppercase leading-none text-foreground drop-shadow-[3px_3px_0_var(--outline)]">
            {loadout.title}
          </p>
        </div>

        {/* Weapon rack — greyed slots are still locked */}
        <div className="absolute bottom-6 right-6 flex flex-col items-end gap-1">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Loadout
          </p>
          <div className="flex gap-2">
            {WEAPONS.map((w, i) => {
              const owned = loadout.unlocked.includes(w.id);
              const active = loadout.weapon === w.id;
              return (
                <div
                  key={w.id}
                  className={`rounded-sm border-2 px-2 py-1 text-center font-display text-[10px] uppercase tracking-[0.2em] ${
                    active
                      ? "border-primary bg-primary/20 text-primary"
                      : owned
                        ? "border-foreground/40 text-foreground/80"
                        : "border-foreground/15 text-muted-foreground/40"
                  }`}
                >
                  <span className="block text-[9px] opacity-70">{i + 1}</span>
                  {owned ? w.name : "Locked"}
                </div>
              );
            })}
          </div>
        </div>

        {loadout.prompt && (
          <div className="absolute left-1/2 top-1/2 mt-16 -translate-x-1/2 rounded-md border-2 border-secondary bg-background/80 px-5 py-2">
            <p className="font-display text-sm uppercase tracking-[0.35em] text-secondary">
              {loadout.prompt}
            </p>
          </div>
        )}

        {toast && (
          <div className="absolute left-1/2 top-24 -translate-x-1/2 -rotate-1 rounded-md bg-secondary px-6 py-3 text-center shadow-tag">
            <p className="font-display text-[10px] uppercase tracking-[0.4em] text-secondary-foreground/80">
              Weapon Unlocked
            </p>
            <p className="font-display text-3xl uppercase leading-none text-secondary-foreground">
              {toast}
            </p>
          </div>
        )}
      </div>

      {!locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/80 px-6 text-center backdrop-blur-md">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.5em] text-secondary">
              Paused
            </p>
            <h2 className="mt-1 font-display text-5xl uppercase tracking-wide text-foreground drop-shadow-[4px_4px_0_var(--outline)]">
              Take Five
            </h2>
          </div>
          <ul className="grid gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <li>WASD — Move</li>
            <li>Shift — Sprint</li>
            <li>Mouse — Look</li>
            <li>1-5 — Swap earned weapons</li>
            <li>Walk into the lit doorway to change area</li>
            <li>Esc — Pause · Autosaves every 10s</li>
          </ul>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              className="rounded-md bg-primary px-8 py-3 font-display text-lg uppercase tracking-widest text-primary-foreground shadow-tag transition-transform hover:-translate-y-1"
              onClick={() => engineRef.current?.requestPointerLock()}
            >
              Resume
            </button>
            <button
              className="rounded-md border-2 border-foreground/60 bg-card px-8 py-3 font-display text-lg uppercase tracking-widest text-foreground transition-transform hover:-translate-y-1"
              onClick={() => {
                engineRef.current?.save();
                onExit();
              }}
            >
              Save &amp; Quit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

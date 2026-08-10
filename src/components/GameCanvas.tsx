import { useEffect, useRef, useState } from "react";
import { createEngine, type EngineHandle } from "@/game/engine";
import type { SaveData } from "@/game/save";

type Props = {
  start: Pick<SaveData, "position" | "yaw" | "chapter">;
  onExit: () => void;
};

export default function GameCanvas({ start, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = createEngine(canvasRef.current, start, setLocked);
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
            District 0
          </p>
          <p className="font-display text-4xl uppercase leading-none text-foreground drop-shadow-[3px_3px_0_var(--outline)]">
            Spray City
          </p>
        </div>
        <div className="absolute bottom-6 right-6 rotate-2 text-right">
          <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Loadout
          </p>
          <p className="font-display text-2xl uppercase leading-none text-primary">
            Tagger .45
          </p>
        </div>
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

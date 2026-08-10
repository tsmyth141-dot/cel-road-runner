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

      {/* Crosshair */}
      {locked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-6 w-6">
            <span className="absolute left-1/2 top-0 h-2 w-[2px] -translate-x-1/2 bg-primary" />
            <span className="absolute bottom-0 left-1/2 h-2 w-[2px] -translate-x-1/2 bg-primary" />
            <span className="absolute top-1/2 left-0 h-[2px] w-2 -translate-y-1/2 bg-primary" />
            <span className="absolute top-1/2 right-0 h-[2px] w-2 -translate-y-1/2 bg-primary" />
          </div>
        </div>
      )}

      {!locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-background/85 px-6 text-center backdrop-blur-sm">
          <h2 className="font-display text-3xl uppercase tracking-widest text-foreground">
            Paused
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            WASD to move, Shift to sprint, mouse to look. Progress autosaves.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              className="rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-tag transition-transform hover:-translate-y-0.5"
              onClick={() => engineRef.current?.requestPointerLock()}
            >
              Click to play
            </button>
            <button
              className="rounded-md border border-border px-6 py-3 text-sm font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                engineRef.current?.save();
                onExit();
              }}
            >
              Save &amp; quit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

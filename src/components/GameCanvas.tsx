import { useEffect, useRef, useState } from "react";
import { createEngine, type CutsceneState, type EngineHandle, type LoadoutState } from "@/game/engine";
import type { SaveData } from "@/game/save";
import { WEAPONS } from "@/game/progression";
import { chapterObjectives } from "@/game/objectives";
import { Button } from "@/components/ui/button";
import { Check, Circle, ArrowRight } from "lucide-react";
import { MovementControls } from "./MovementControls";
import { BARTENDER_CHOICES } from "@/game/dialogue";

type Props = {
  start: Pick<SaveData, "position" | "yaw" | "chapter" | "unlocked" | "weapon" | "zone" | "storyFlags">;
  intro?: boolean;
  onExit: () => void;
};

export default function GameCanvas({ start, intro = false, onExit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const cutsceneActiveRef = useRef(intro && start.zone === "club");
  const [locked, setLocked] = useState(false);
  const [loadout, setLoadout] = useState<LoadoutState>({
    unlocked: start.unlocked,
    weapon: start.weapon,
    zone: start.zone,
    title: start.zone === "city" ? "Canal Street" : "The Velvet Can",
    health: 100,
    maxHealth: 100,
    enemies: 0,
    storyFlags: start.storyFlags ?? [],
  });
  const [toast, setToast] = useState<string | null>(null);
  const [hasStartedWalking, setHasStartedWalking] = useState(!intro);
  const [talking, setTalking] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const objectives = chapterObjectives(loadout.zone, loadout.storyFlags, loadout.unlocked.includes("tagger"));
  const [cut, setCut] = useState<CutsceneState>({
    active: intro && start.zone === "club",
    waking: intro && start.zone === "club",
    progress: 0,
    line: null,
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = createEngine(
      canvasRef.current,
      start,
      setLocked,
      (state) => {
        setLoadout(state);
        if (state.justUnlocked) setToast(state.justUnlocked);
      },
      {
        playIntro: intro,
        onConversation: (active) => {
          setTalking(active);
          setReply(null);
        },
        onCutscene: (state) => {
          cutsceneActiveRef.current = state.active;
          setCut(state);
        },
      },
    );
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-background">
      <canvas ref={canvasRef} className={`block h-full w-full ${cut.active && cut.waking ? "wake-vision" : ""}`} />
      {cut.active && cut.waking && (
        <div className="pointer-events-none absolute inset-0 wake-eyelids" aria-hidden="true" />
      )}

      {/* HUD */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          cut.active ? "opacity-0" : "opacity-100"
        }`}
      >
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

        <div className="absolute left-6 top-6 w-48 -rotate-1">
          <div className="flex items-end justify-between font-display text-xs uppercase tracking-[0.25em] text-foreground">
            <span>Health</span>
            <span className="text-secondary">{loadout.health}</span>
          </div>
          <div className="mt-1 h-3 border-2 border-foreground/50 bg-background/70">
            <div
              className="h-full bg-primary transition-[width] duration-200"
              style={{ width: `${(loadout.health / loadout.maxHealth) * 100}%` }}
            />
          </div>
          {loadout.zone === "city" && (
            <p className="mt-2 font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Threats nearby · {loadout.enemies}
            </p>
          )}
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

      {!cut.active && (
        <aside aria-label="Objectives" className="pointer-events-none absolute right-4 top-4 w-60 max-w-[48vw] border-l-2 border-secondary/70 bg-background/65 px-3 py-3 sm:right-6 sm:top-6 sm:w-72">
          <p className="font-display text-xs uppercase text-secondary">Chapter 1 · Get your bearings</p>
          <h2 className="mb-3 font-display text-xl text-foreground">Objectives</h2>
          <ol className="space-y-2 text-xs leading-relaxed sm:text-sm">
            {objectives.map((objective) => (
              <li key={objective.id} className={`flex items-start gap-2 ${objective.complete ? "text-muted-foreground" : "text-foreground"}`}>
                {objective.complete ? <Check className="mt-0.5 size-4 shrink-0 text-accent" /> : <Circle className="mt-0.5 size-3.5 shrink-0 text-secondary" />}
                <span className={objective.complete ? "line-through" : ""}>{objective.label}</span>
              </li>
            ))}
          </ol>
        </aside>
      )}

      {!cut.active && locked && loadout.zone === "club" && (
        <div className="pointer-events-none absolute bottom-28 left-4 border-l-2 border-secondary/60 bg-background/65 px-3 py-2 text-xs text-foreground sm:left-6">
          <p className="mb-1 font-display text-sm text-secondary">Get your bearings</p>
          <p><kbd>W ↑</kbd> Forward · <kbd>A ←</kbd> Left · <kbd>S ↓</kbd> Back · <kbd>D →</kbd> Right</p>
          <p className="mt-1"><kbd>Shift</kbd> · Sprint &nbsp; <kbd>E</kbd> · Interact &nbsp; <kbd>Esc</kbd> · Pause</p>
        </div>
      )}

      {cut.active && (
        <div className="absolute inset-0 select-none">
          {/* fade up from black */}
          <div
            className="pointer-events-none absolute inset-0 bg-background transition-opacity duration-[1600ms]"
            style={{ opacity: cut.progress > 0.02 ? 0 : 1 }}
          />
          {/* letterbox */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[12vh] bg-background" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[12vh] bg-background" />
          <div className="pointer-events-none absolute inset-0 bg-vignette" />

          <div className="pointer-events-none absolute left-8 top-[14vh] -rotate-2">
            <p className="font-display text-xs uppercase tracking-[0.5em] text-secondary">
              Chapter 1 — The Velvet Can
            </p>
            <p className="font-display text-2xl uppercase leading-none text-foreground/80">
              4:47 AM · Closing time
            </p>
          </div>

          {cut.line && (
            <div className="pointer-events-none absolute bottom-[14vh] left-1/2 w-[min(46rem,88vw)] -translate-x-1/2 rounded-md border-2 border-secondary/70 bg-background/85 px-6 py-4 shadow-tag">
              <p className="font-display text-xs uppercase tracking-[0.45em] text-secondary">
                {cut.line.speaker}
              </p>
              <p className="mt-1 text-lg leading-snug text-foreground">{cut.line.text}</p>
            </div>
          )}

          <button
            className="absolute bottom-[4vh] right-8 rounded-md border-2 border-foreground/40 px-5 py-2 font-display text-xs uppercase tracking-[0.35em] text-muted-foreground transition-colors hover:border-secondary hover:text-secondary"
            onClick={() => {
              if (!cutsceneActiveRef.current) return;
              cutsceneActiveRef.current = false;
              setCut((state) => ({ ...state, active: false, line: null, progress: 1 }));
              engineRef.current?.skipCutscene();
            }}
          >
            Skip scene →
          </button>
        </div>
      )}

      {talking && (
        <div className="absolute inset-0 flex items-end justify-center bg-background/20 p-4 pb-16 sm:pb-24">
          <section role="dialog" aria-modal="true" aria-label="Talk to bartender" className="w-full max-w-xl rounded-md border border-secondary/60 bg-background/95 p-5 shadow-tag">
            <p className="font-display text-lg text-secondary">Bartender</p>
            <p aria-live="polite" className="my-3 text-sm leading-relaxed text-foreground">{reply ?? "You all right? Anything you need to ask before you go?"}</p>
            <div className="flex flex-col gap-2">
              {BARTENDER_CHOICES.map((choice) => (
                <Button key={choice.id} variant="ghost" className="h-auto justify-start whitespace-normal border-l-2 border-secondary/40 px-3 py-2 text-left text-foreground" onClick={() => setReply(choice.answer)}>{choice.question}</Button>
              ))}
              <Button variant="secondary" className="mt-2 self-start" onClick={() => engineRef.current?.closeConversation()}>I’ll be going <ArrowRight /></Button>
            </div>
          </section>
        </div>
      )}

      {!locked && !cut.active && !talking && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-background/30 px-6 text-center">
          <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-md border border-foreground/20 bg-background/90 px-6 py-7">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.5em] text-secondary">
              {hasStartedWalking ? "Paused" : "You’re awake"}
            </p>
            <h2 className="mt-1 font-display text-5xl uppercase tracking-wide text-foreground drop-shadow-[4px_4px_0_var(--outline)]">
              {hasStartedWalking ? "Take Five" : "Get your bearings"}
            </h2>
          </div>
          <MovementControls />
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              className="rounded-md bg-primary px-8 py-3 font-display text-lg uppercase tracking-widest text-primary-foreground shadow-tag transition-transform hover:-translate-y-1"
              onClick={() => {
                setHasStartedWalking(true);
                engineRef.current?.requestPointerLock();
              }}
            >
              {hasStartedWalking ? "Resume" : "Start walking"} <ArrowRight />
            </Button>
            <Button variant="outline"
              className="rounded-md border-2 border-foreground/60 bg-card px-8 py-3 font-display text-lg uppercase tracking-widest text-foreground transition-transform hover:-translate-y-1"
              onClick={() => {
                engineRef.current?.save();
                onExit();
              }}
            >
              Save &amp; Quit
            </Button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

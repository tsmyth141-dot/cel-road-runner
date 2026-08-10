import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { clearSave, loadGame, NEW_GAME_STATE, type SaveData } from "@/game/save";

const GameCanvas = lazy(() => import("@/components/GameCanvas"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spray City — Cel-Shaded First-Person Action Game" },
      {
        name: "description",
        content:
          "Spray City is a lightweight browser-based first-person action game with bold cel-shaded street-art visuals. Runs in Chrome, no downloads.",
      },
      { property: "og:title", content: "Spray City — Cel-Shaded FPS in Your Browser" },
      {
        property: "og:description",
        content:
          "Explore a stylised graffiti-soaked 3D test district. WASD, mouse-look, and local saves — straight in the browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [save, setSave] = useState<SaveData | null>(null);
  const [session, setSession] = useState<Pick<
    SaveData,
    "position" | "yaw" | "chapter"
  > | null>(null);

  useEffect(() => {
    setSave(loadGame());
  }, []);

  if (session) {
    return (
      <ClientOnly>
        <Suspense fallback={<div className="fixed inset-0 bg-background" />}>
          <GameCanvas
            start={session}
            onExit={() => {
              setSession(null);
              setSave(loadGame());
            }}
          />
        </Suspense>
      </ClientOnly>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0 bg-spray opacity-90" />
      <div className="pointer-events-none absolute inset-0 bg-grit" />

      <div className="relative z-10 w-full max-w-lg text-center">
        <p className="font-display text-sm uppercase tracking-[0.5em] text-secondary">
          Chapter 0 · Prologue
        </p>
        <h1 className="mt-3 font-display text-6xl uppercase leading-[0.85] tracking-tight text-foreground sm:text-7xl">
          Spray
          <span className="block text-primary drop-shadow-[6px_6px_0_var(--outline)]">
            City
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-sm text-muted-foreground">
          A cel-shaded first-person action game. Foundation build: test district,
          movement and local saves.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <button
            className="w-full rounded-md bg-primary px-6 py-4 font-display text-lg uppercase tracking-widest text-primary-foreground shadow-tag transition-transform hover:-translate-y-1"
            onClick={() => {
              clearSave();
              setSession(NEW_GAME_STATE);
            }}
          >
            New Game
          </button>
          <button
            disabled={!save}
            className="w-full rounded-md border-2 border-foreground/70 bg-card px-6 py-4 font-display text-lg uppercase tracking-widest text-foreground transition-transform enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() =>
              save &&
              setSession({
                position: save.position,
                yaw: save.yaw,
                chapter: save.chapter,
              })
            }
          >
            Continue
          </button>
        </div>

        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
          {save
            ? `Last save · ${new Date(save.savedAt).toLocaleString()}`
            : "No save data found"}
        </p>
      </div>
    </main>
  );
}

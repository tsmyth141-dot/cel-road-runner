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
          "Spray City is a lightweight browser first-person action game with bold cel-shaded street-art visuals. Runs in Chrome, no downloads, saves locally.",
      },
      { property: "og:title", content: "Spray City — Cel-Shaded FPS in Your Browser" },
      {
        property: "og:description",
        content:
          "Explore a graffiti-soaked neon district. Smooth first-person movement, toon-shaded visuals and local saves — straight in the browser.",
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
    "position" | "yaw" | "chapter" | "unlocked" | "weapon" | "zone"
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
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Backdrop: spray haze, grit, skyline silhouette */}
      <div className="pointer-events-none absolute inset-0 bg-spray" />
      <div className="pointer-events-none absolute inset-0 bg-grit opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-skyline" />
      <div className="pointer-events-none absolute inset-0 bg-vignette" />

      {/* Drip tags */}
      <span className="pointer-events-none absolute left-6 top-24 hidden -rotate-90 font-display text-[10px] uppercase tracking-[0.6em] text-secondary/70 sm:block">
        Build 0.2 · Foundation
      </span>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <div className="max-w-xl">
          <span className="inline-block -rotate-2 border-2 border-secondary bg-secondary px-3 py-1 font-display text-xs uppercase tracking-[0.35em] text-secondary-foreground">
            Chapter 1 — The Velvet Can
          </span>

          <h1 className="mt-6 font-display text-[clamp(4rem,16vw,9rem)] uppercase leading-[0.78] tracking-tight text-foreground">
            <span className="block drop-shadow-[6px_6px_0_var(--outline)]">Spray</span>
            <span className="block -rotate-1 text-primary drop-shadow-[8px_8px_0_var(--outline)]">
              City
            </span>
          </h1>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            The story opens on the floor of the Velvet Can — strobes, a stacked
            speaker wall and a crew that owes you. Earn your arsenal one job at a
            time as the city opens up, chapter by chapter.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:max-w-sm">
            <button
              className="group relative w-full overflow-hidden rounded-md bg-primary px-8 py-5 text-left font-display text-2xl uppercase tracking-widest text-primary-foreground shadow-tag transition-transform hover:-translate-y-1"
              onClick={() => {
                clearSave();
                setSession(NEW_GAME_STATE);
              }}
            >
              New Game
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-base opacity-60 transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>

            <button
              disabled={!save}
              className="group relative w-full overflow-hidden rounded-md border-2 border-foreground/70 bg-card px-8 py-5 text-left font-display text-2xl uppercase tracking-widest text-foreground transition-transform enabled:hover:-translate-y-1 enabled:hover:border-accent enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
              onClick={() =>
                save &&
                setSession({
                  position: save.position,
                  yaw: save.yaw,
                  chapter: save.chapter,
                  unlocked: save.unlocked,
                  weapon: save.weapon,
                  zone: save.zone,
                })
              }
            >
              Continue
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-base opacity-60">
                {save ? "↺" : "—"}
              </span>
            </button>
          </div>

          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-2 font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <div>
              <dt className="text-accent">Save slot</dt>
              <dd>
                {save
                  ? new Date(save.savedAt).toLocaleString()
                  : "Empty — start a new run"}
              </dd>
            </div>
            <div>
              <dt className="text-accent">Controls</dt>
              <dd>WASD · Shift · Mouse</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}

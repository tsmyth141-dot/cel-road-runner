export function MovementControls() {
  return (
    <div className="text-sm text-foreground">
      <div className="mx-auto grid w-48 grid-cols-3 gap-2 text-center">
        <div className="col-start-2 row-start-1"><kbd className="block rounded-sm border border-secondary/60 bg-muted px-2 py-1 font-display text-xl text-secondary">W ↑</kbd><span className="text-xs">Forward</span></div>
        {[['A ←', 'Left'], ['S ↓', 'Backward'], ['D →', 'Right']].map(([key, label]) => (
          <div key={key} className="row-start-2"><kbd className="block rounded-sm border border-secondary/60 bg-muted px-2 py-1 font-display text-xl text-secondary">{key}</kbd><span className="text-xs">{label}</span></div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Mouse · Look &nbsp; Shift · Sprint &nbsp; E · Talk</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">H · Put away / draw &nbsp; Esc · Pause</p>
    </div>
  );
}
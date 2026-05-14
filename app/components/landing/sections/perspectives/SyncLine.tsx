export function SyncLine() {
  return (
    <div
      data-testid="sync-line"
      aria-hidden="true"
      className="absolute top-1/2 left-1/2 hidden h-px w-24 -translate-x-1/2 -translate-y-1/2 lg:block"
      style={{
        background:
          'linear-gradient(90deg, transparent, rgb(var(--grad-b-rgb) / 0.6), transparent)',
      }}
    />
  );
}

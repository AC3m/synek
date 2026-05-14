export function SyncLine() {
  return (
    <div
      data-testid="sync-line"
      aria-hidden="true"
      className="hidden lg:block"
      style={{
        position: 'absolute',
        left: '56%',
        right: '22%',
        top: '50%',
        height: 1,
        zIndex: 1,
        background:
          'linear-gradient(90deg, transparent, rgba(var(--grad-a-rgb), 0.5), rgba(var(--grad-b-rgb), 0.5), transparent)',
      }}
    />
  );
}

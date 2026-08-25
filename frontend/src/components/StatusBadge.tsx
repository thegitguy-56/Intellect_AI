const STYLES: Record<string, string> = {
  uploaded: "bg-surface-container text-on-surface-variant border-outline-variant",
  processing: "bg-secondary-container/10 text-secondary border-secondary-container/30",
  analyzed: "bg-primary-container/10 text-primary border-primary/30",
  error: "bg-error-container/40 text-on-error-container border-error/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded border px-2 py-1 font-mono text-xs capitalize ${STYLES[status] ?? STYLES.uploaded}`}
    >
      {status}
    </span>
  );
}

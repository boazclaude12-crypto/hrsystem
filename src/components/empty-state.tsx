export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
      {message}
    </div>
  );
}

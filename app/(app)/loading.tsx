/** Shown at once while a page's data loads, so taps feel instant. */
export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="flex animate-pulse flex-col gap-4">
      <span className="sr-only">กำลังโหลด…</span>
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="h-36 rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-200" />
        ))}
      </div>
      <div className="h-56 rounded-2xl bg-slate-200" />
    </div>
  );
}

"use client";

/** Installed iOS apps have no browser reload button, so offer one in the menu. */
export function ReloadButton() {
  return (
    <button
      type="button"
      onClick={() => location.reload()}
      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100"
    >
      โหลดหน้าใหม่
    </button>
  );
}

"use client";

/** Clears the offline copies of your pages, then signs out. */
export function SignOutButton() {
  return (
    <form
      action="/auth/signout"
      method="post"
      onSubmit={async (event) => {
        // Wipe saved pages first so they cannot be opened offline afterwards.
        event.preventDefault();
        const form = event.currentTarget;
        try {
          await Promise.all(["pages-", "meta-"].map(async (prefix) => {
            for (const name of await caches.keys()) if (name.startsWith(prefix)) await caches.delete(name);
          }));
        } catch {
          // No Cache API (or blocked): nothing was stored.
        }
        form.submit();
      }}
    >
      <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-negative hover:bg-slate-100">
        ออกจากระบบ
      </button>
    </form>
  );
}

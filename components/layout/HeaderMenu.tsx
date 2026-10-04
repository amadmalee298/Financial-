"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ReloadButton } from "@/components/pwa/ReloadButton";
import { SignOutButton } from "@/components/pwa/SignOutButton";
import { isActive, navItems } from "./navItems";

/**
 * The header menu. The header lives in the app layout, so it stays mounted while
 * pages change; without this a menu opened to go to another page stayed open on
 * top of it, hiding the loading skeleton and making the app look stuck.
 */
export function HeaderMenu({ email }: { email: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  const close = () => menu.current?.removeAttribute("open");

  // A new page was reached.
  useEffect(close, [pathname]);

  // Tapping outside the menu, or pressing Escape, closes it.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={menu} className="relative">
      <summary className="cursor-pointer list-none rounded-lg px-3 py-1.5 text-sm hover:bg-secondary lg:hover:bg-slate-100">
        เมนู
      </summary>
      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 text-primary shadow-lg">
        <p className="truncate px-3 py-2 text-xs text-slate-500 lg:hidden">{email}</p>
        <div className="flex flex-col lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100 aria-[current=page]:bg-slate-100 aria-[current=page]:font-semibold"
            >
              {item.label}
            </Link>
          ))}
          <hr className="my-1 border-slate-200" />
        </div>
        <ReloadButton />
        <SignOutButton />
      </div>
    </details>
  );
}

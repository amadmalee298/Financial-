"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navItems } from "./navItems";

/** Bottom tab bar for phones and small tablets. */
export function MobileNav() {
  const pathname = usePathname();
  const items = navItems.filter((item) => item.primary);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-800 bg-primary pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className="py-3 text-center text-xs text-slate-400 aria-[current=page]:text-white"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

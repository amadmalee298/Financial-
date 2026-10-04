"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navItems } from "./navItems";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-primary px-3 py-5 lg:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-3">
        <Image src="/logo.svg" alt="" width={32} height={32} />
        <span className="font-semibold text-white">My Investment</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className="rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-secondary hover:text-white aria-[current=page]:bg-secondary aria-[current=page]:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ReloadButton } from "@/components/pwa/ReloadButton";
import { SignOutButton } from "@/components/pwa/SignOutButton";
import { navItems } from "./navItems";

export function Header({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center pt-[env(safe-area-inset-top)] justify-between gap-4 border-b border-slate-800 bg-primary px-[max(1rem,env(safe-area-inset-left))] text-white lg:border-slate-200 lg:bg-white lg:px-8 lg:text-primary">
      <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
        <Image src="/logo.svg" alt="" width={28} height={28} />
        <span className="font-semibold">My Investment</span>
      </Link>
      <span className="hidden truncate text-sm text-slate-500 lg:block">{email}</span>

      <details className="relative">
        <summary className="cursor-pointer list-none rounded-lg px-3 py-1.5 text-sm hover:bg-secondary lg:hover:bg-slate-100">
          เมนู
        </summary>
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 text-primary shadow-lg">
          <p className="truncate px-3 py-2 text-xs text-slate-500 lg:hidden">{email}</p>
          <div className="flex flex-col lg:hidden">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100">
                {item.label}
              </Link>
            ))}
            <hr className="my-1 border-slate-200" />
          </div>
          <ReloadButton />
          <SignOutButton />
        </div>
      </details>
    </header>
  );
}

import Image from "next/image";
import Link from "next/link";
import { HeaderMenu } from "./HeaderMenu";

export function Header({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center pt-[env(safe-area-inset-top)] justify-between gap-4 border-b border-slate-800 bg-primary px-[max(1rem,env(safe-area-inset-left))] text-white lg:border-slate-200 lg:bg-white lg:px-8 lg:text-primary">
      <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
        <Image src="/logo.svg" alt="" width={28} height={28} />
        <span className="font-semibold">My Investment</span>
      </Link>
      <span className="hidden truncate text-sm text-slate-500 lg:block">{email}</span>

      <HeaderMenu email={email} />
    </header>
  );
}

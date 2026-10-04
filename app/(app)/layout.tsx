import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/auth";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { OfflineSync } from "@/components/pwa/OfflineSync";

/**
 * Shell for every signed-in page. The session check is a local JWT check
 * (see getSessionUser), so awaiting it here costs next to nothing. Keep this
 * layout free of its own <Suspense>: React reveals streamed boundaries in
 * batches, so an extra boundary here can delay the page content behind it.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  // The proxy already redirects, but never render user pages without a user.
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <Header email={user.email} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
      <OfflineSync userId={user.id} />
    </div>
  );
}

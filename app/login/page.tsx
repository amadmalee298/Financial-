import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeNextPath } from "@/lib/utils/redirect";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-primary px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/logo.svg" alt="" width={48} height={48} priority />
          <h1 className="text-2xl font-semibold text-white">My Investment</h1>
          <p className="text-sm text-slate-400">
            บันทึกและติดตามพอร์ตการลงทุนของคุณ
          </p>
        </div>
        <LoginForm next={safeNextPath(next)} />
      </div>
    </main>
  );
}

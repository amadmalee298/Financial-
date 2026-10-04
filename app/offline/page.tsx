import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "ออฟไลน์" };

/** Fallback shown by the service worker for pages that were never opened online. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-primary px-4 py-12 pt-[max(3rem,env(safe-area-inset-top))]">
      <div className="max-w-sm text-center">
        <Image src="/logo.svg" alt="" width={48} height={48} className="mx-auto" priority />
        <h1 className="mt-4 text-xl font-semibold text-white">ไม่มีสัญญาณอินเทอร์เน็ต</h1>
        <p className="mt-2 text-sm text-slate-400">
          หน้านี้ยังไม่เคยเปิดตอนออนไลน์ จึงยังไม่มีข้อมูลที่บันทึกไว้ หน้าที่เคยเปิดแล้วจะดูได้แม้ออฟไลน์
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary"
        >
          ลองอีกครั้ง
        </a>
      </div>
    </main>
  );
}

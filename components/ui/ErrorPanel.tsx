"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { explainDigest } from "@/lib/utils/error-digest";

/** Friendly error screen with a retry button; shared by the error boundaries. */
export function ErrorPanel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">โหลดหน้านี้ไม่สำเร็จ</h1>
      <p className="text-sm text-slate-600">
        เซิร์ฟเวอร์ติดต่อฐานข้อมูลไม่ได้หรือตอบช้าผิดปกติ ข้อมูลของคุณไม่ได้หาย ลองใหม่อีกครั้ง
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            // A server error needs a fresh server render, not just a client re-render.
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary"
        >
          ลองใหม่
        </button>
        <Link href="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50">
          กลับหน้าภาพรวม
        </Link>
      </div>
      {explainDigest(error.digest) && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{explainDigest(error.digest)}</p>
      )}
      {error.digest && (
        <p className="text-xs break-all text-slate-400">
          รหัสข้อผิดพลาด {error.digest} — ถ้าเกิดซ้ำ ส่งรหัสนี้ให้ผู้ดูแล หรือค้นใน Vercel → Logs เพื่อดูสาเหตุละเอียด
        </p>
      )}
    </div>
  );
}

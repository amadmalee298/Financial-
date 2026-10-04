import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-primary px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold text-white">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
        <p className="mt-2 text-sm text-slate-400">
          กรุณาลองเข้าสู่ระบบอีกครั้ง หรือสมัครสมาชิกใหม่
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary"
        >
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </main>
  );
}

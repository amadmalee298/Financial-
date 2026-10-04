/**
 * A short, safe reason code for a failed load, e.g. "E-portfolio-PGRST205".
 *
 * Next.js shows an error page only a "digest" in production. When an error
 * already carries a digest Next keeps it, so we put a readable code there
 * instead of a random number: where it failed (`key`) and the database error
 * code (or the kind of network failure). It never contains messages, details,
 * row data, keys or URLs, only letters, digits and "_", so it is safe to show.
 */
type ErrorLike = { code?: unknown; message?: unknown; name?: unknown; cause?: unknown };

const clean = (text: string) => text.replace(/[^A-Za-z0-9_]/g, "").slice(0, 48);

function reasonOf(cause: unknown): string {
  if (!cause || typeof cause !== "object") return "ERR";
  const { code, message, name, cause: inner } = cause as ErrorLike;

  // Postgres / PostgREST error codes: PGRST205, 42P01, 42501, ...
  if (typeof code === "string" && code.trim()) return clean(code);

  const text = typeof message === "string" ? message : "";
  if (/timeout|timed out|aborted/i.test(text)) return "TIMEOUT";
  if (/fetch failed|network|ECONN|ENOTFOUND|socket/i.test(text)) return "FETCH_FAILED";

  // Error objects: the class name, plus the code of whatever caused it (undici hides it there).
  if (typeof name === "string" && name !== "Error") {
    const innerCode = inner && typeof inner === "object" ? (inner as ErrorLike).code : undefined;
    return clean(typeof innerCode === "string" ? `${name}_${innerCode}` : name);
  }
  return "ERR";
}

/** `key` names the place that failed, e.g. "portfolio", "auth". */
export function buildDigest(key: string, causes: unknown[]) {
  const reasons = [...new Set(causes.filter(Boolean).map(reasonOf))].slice(0, 3);
  return `E-${clean(key) || "load"}-${reasons.join("+") || "ERR"}`;
}

/** Plain-language advice for a digest produced by `buildDigest`; null for anything else. */
export function explainDigest(digest: string | undefined): string | null {
  const match = digest?.match(/^E-[A-Za-z0-9_]+-(.+)$/);
  if (!match) return null;
  const reasons = match[1].split("+");
  const has = (...codes: string[]) => reasons.some((r) => codes.includes(r));

  if (has("PGRST205", "42P01", "PGRST200", "PGRST204", "42703")) {
    return "ไม่พบตารางหรือคอลัมน์ในฐานข้อมูล: ยังไม่ได้รันไฟล์ supabase/setup_all.sql ใน SQL Editor หรือรันไม่ครบ ให้รันตามขั้นตอนตั้งค่าอีกครั้ง";
  }
  if (has("PGRST301", "PGRST302", "42501", "401", "403")) {
    return "ไม่มีสิทธิ์อ่านข้อมูลหรือเซสชันหมดอายุ: ลองออกจากระบบแล้วเข้าสู่ระบบใหม่";
  }
  if (reasons.some((r) => r.startsWith("AuthRetryableFetchError") || r.startsWith("AuthApiError"))) {
    return "ตรวจสอบการเข้าสู่ระบบกับ Supabase ไม่ได้ชั่วคราว: ลองใหม่อีกครั้ง ถ้ายังเป็นอยู่ ให้เช็ก NEXT_PUBLIC_SUPABASE_URL กับสถานะโปรเจกต์ Supabase";
  }
  if (has("TIMEOUT", "FETCH_FAILED", "PGRST000", "PGRST001", "PGRST002", "PGRST003")) {
    return "เซิร์ฟเวอร์ติดต่อ Supabase ไม่ได้หรือตอบช้าเกินไป: เช็กว่าโปรเจกต์ Supabase ไม่ถูกพัก (Paused), ค่า NEXT_PUBLIC_SUPABASE_URL ถูกต้อง และ Function Region ของ Vercel ตรงกับภูมิภาคของ Supabase";
  }
  return null;
}

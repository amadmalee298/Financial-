"use client";

import { useSyncExternalStore } from "react";
import { useOnline } from "./useOnline";

const time = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

const noSubscription = () => () => {};

/** Saved time of this page when the service worker served a stored copy. */
function savedAt() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="sw-cached-at"]');
  const ms = Number(meta?.content);
  return Number.isFinite(ms) && ms > 0 ? time.format(ms) : null;
}

/** Shown when offline, or when this page is a saved copy (slow network). */
export function OfflineBanner() {
  const online = useOnline();
  // Read once from the page itself; the server render has no saved time.
  const saved = useSyncExternalStore(noSubscription, savedAt, () => null);

  if (online && !saved) return null;

  return (
    <div role="status" className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
      {online ? (
        <>
          เชื่อมต่อเซิร์ฟเวอร์ไม่ได้หรือเครือข่ายช้า แสดงข้อมูลที่บันทึกไว้ ณ {saved}{" "}
          <button type="button" onClick={() => location.reload()} className="font-semibold underline">
            โหลดใหม่
          </button>
        </>
      ) : (
        <>
          ออฟไลน์ — แสดงข้อมูลที่บันทึกไว้{saved ? ` ณ ${saved}` : ""} · ดูได้อย่างเดียว บันทึกข้อมูลไม่ได้จนกว่าจะกลับมาออนไลน์
        </>
      )}
    </div>
  );
}

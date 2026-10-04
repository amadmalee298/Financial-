"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui/Card";

/** Chrome/Edge/Android fire this once the app is installable. */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const noSubscription = () => () => {};

type Env = "server" | "installed" | "ios" | "other";

function detect(): Env {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  // iPadOS 13+ identifies as a Mac, so also look for a touch screen.
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}

export function InstallCard() {
  const env = useSyncExternalStore<Env>(noSubscription, detect, () => "server");
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  return (
    <Card>
      <h2 className="mb-3 font-medium">ติดตั้งเป็นแอป</h2>

      {env === "installed" && <p className="text-sm text-positive">✓ ติดตั้งแล้ว — กำลังเปิดในโหมดแอป</p>}

      {env === "ios" && (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>เปิดหน้านี้ใน Safari (iPhone หรือ iPad)</li>
          <li>
            แตะปุ่ม <strong>แชร์</strong> (สี่เหลี่ยมมีลูกศรชี้ขึ้น)
          </li>
          <li>
            เลื่อนลงแล้วเลือก <strong>เพิ่มลงในหน้าจอโฮม</strong> แล้วแตะ <strong>เพิ่ม</strong>
          </li>
        </ol>
      )}

      {env === "other" && (
        <div className="space-y-3 text-sm text-slate-600">
          {prompt ? (
            <button
              type="button"
              onClick={async () => {
                await prompt.prompt();
                await prompt.userChoice;
                setPrompt(null);
              }}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary"
            >
              ติดตั้งแอป
            </button>
          ) : (
            <p>ใน Chrome / Edge เลือกเมนู “ติดตั้งแอป” หรือไอคอนติดตั้งที่แถบที่อยู่ ถ้ายังไม่เห็น ให้ใช้งานสักครู่แล้วลองใหม่</p>
          )}
        </div>
      )}

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        ใช้งานออฟไลน์: หน้าที่เคยเปิดไว้จะดูได้แม้ไม่มีอินเทอร์เน็ต (พร้อมบอกเวลาที่บันทึกข้อมูล) แต่บันทึกหรือแก้ไขข้อมูลไม่ได้จนกว่าจะออนไลน์
        เมื่อออกจากระบบ ข้อมูลที่เก็บไว้ในเครื่องจะถูกลบ
      </p>
    </Card>
  );
}

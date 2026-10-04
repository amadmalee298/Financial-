"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  TARGET_MS,
  median,
  speedFindings,
  type Finding,
  type SpeedMeasurements,
} from "@/lib/diagnostics/speed";

const marks: Record<Finding["level"], string> = { ok: "✓", warn: "!", bad: "✕" };
const tones: Record<Finding["level"], string> = {
  ok: "text-positive",
  warn: "text-amber-700",
  bad: "text-negative",
};

/** Time a few sequential requests; `speedtest` keeps the service worker and caches out of the way. */
async function timeRequests(path: string, count: number) {
  const times: number[] = [];
  let last: unknown = null;
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    const response = await fetch(`${path}${path.includes("?") ? "&" : "?"}speedtest=${Date.now()}-${i}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    last = response.headers.get("content-type")?.includes("json") ? await response.json() : await response.text();
    times.push(Math.round(performance.now() - start));
    if (!response.ok) throw new Error(`${path} → ${response.status}`);
  }
  return { times, last };
}

const ms = (value: number) => `${Math.round(value).toLocaleString("th-TH")} ms`;

export function SpeedCheck() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpeedMeasurements | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const fn = await timeRequests("/api/speed", 4);
      const db = await timeRequests("/api/speed?db=1", 1);
      // The real thing: the dashboard's full HTML, as a page load would fetch it.
      const page = await timeRequests("/dashboard", 3);
      // Last: a static file the service worker and proxy leave alone = network to Vercel's CDN.
      const net = await timeRequests("/logo.svg", 3);
      const server = db.last as { region?: string; dbMs?: number[] };
      setResult({
        staticMs: net.times,
        functionMs: fn.times,
        dbMs: server.dbMs ?? [],
        pageMs: page.times,
        region: server.region ?? "unknown",
      });
    } catch {
      setError("ตรวจไม่สำเร็จ ลองใหม่อีกครั้ง (ต้องออนไลน์และล็อกอินอยู่)");
    } finally {
      setRunning(false);
    }
  }

  const pageSteady = result ? median(result.pageMs.slice(1)) : 0;
  const overTarget = pageSteady > TARGET_MS;

  return (
    <Card>
      <h2 className="mb-1 font-medium">ตรวจความเร็ว</h2>
      <p className="mb-3 text-xs text-slate-500">
        วัดว่าเวลาหายไปที่ไหน: เครือข่ายมือถือ, ฟังก์ชันเซิร์ฟเวอร์ หรือระยะทางไปฐานข้อมูล แล้วลองโหลดหน้าภาพรวมจริง ใช้เวลาไม่กี่วินาที
      </p>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-secondary disabled:opacity-60"
      >
        {running ? "กำลังตรวจ…" : result ? "ตรวจอีกครั้ง" : "เริ่มตรวจ"}
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
        </p>
      )}

      {result && !running && (
        <div className="mt-4 flex flex-col gap-4">
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-slate-500">มือถือ → Vercel (ไฟล์ธรรมดา)</dt>
            <dd className="text-right tabular-nums">{ms(median(result.staticMs))}</dd>
            <dt className="text-slate-500">เรียกฟังก์ชัน ครั้งแรก / ครั้งต่อมา</dt>
            <dd className="text-right tabular-nums">
              {ms(result.functionMs[0] ?? 0)} / {ms(median(result.functionMs.slice(1)))}
            </dd>
            <dt className="text-slate-500">เซิร์ฟเวอร์ → ฐานข้อมูล ต่อคำขอ</dt>
            <dd className="text-right tabular-nums">
              {ms(median(result.dbMs.slice(1)))} <span className="text-xs text-slate-400">(แรก {ms(result.dbMs[0] ?? 0)})</span>
            </dd>
            <dt className="text-slate-500">ภูมิภาคเซิร์ฟเวอร์</dt>
            <dd className="text-right">{result.region}</dd>
            <dt className="font-medium">เปิดหน้าภาพรวมจริง ครั้งแรก / ครั้งต่อมา</dt>
            <dd className={`text-right font-semibold tabular-nums ${overTarget ? "text-negative" : "text-positive"}`}>
              {(result.pageMs[0] / 1000).toFixed(1)} / {(pageSteady / 1000).toFixed(1)} วินาที
            </dd>
          </dl>

          <ul className="flex flex-col gap-2">
            {speedFindings(result).map((finding, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span aria-hidden className={`mt-0.5 w-4 shrink-0 text-center font-bold ${tones[finding.level]}`}>
                  {marks[finding.level]}
                </span>
                <span>{finding.text}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400">
            เวลาหน้าภาพรวมนับถึงรับหน้าเว็บครบ ยังไม่รวมเวลาแสดงผลบนมือถือ เป้าหมายต่ำกว่า 3 วินาที ผลตรวจแสดงเฉพาะบนหน้านี้ ไม่ได้เก็บหรือส่งไปที่ไหน
          </p>
        </div>
      )}
    </Card>
  );
}

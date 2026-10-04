/** Timings, in milliseconds, collected by the speed check on the Settings page. */
export type SpeedMeasurements = {
  /** Phone → Vercel's CDN (a static file): the network baseline. */
  staticMs: number[];
  /** Phone → serverless function with no database: includes the proxy and any cold start. */
  functionMs: number[];
  /** Function → Supabase, one trivial query after another (first one includes connection setup). */
  dbMs: number[];
  /** Loading the real dashboard page (HTML, fully streamed): what you actually wait for. */
  pageMs: number[];
  /** Region the function ran in, as reported by the host. */
  region: string;
};

export type Finding = { level: "ok" | "warn" | "bad"; text: string };

export const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const TARGET_MS = 3000;

/**
 * Plain-language reading of the measurements. The first sample of each series
 * is kept apart because it carries one-off costs (waking the function, opening
 * the connection); the rest show the steady state.
 */
export function speedFindings(m: SpeedMeasurements): Finding[] {
  const out: Finding[] = [];
  const dbSteady = median(m.dbMs.slice(1));
  const dbFirst = m.dbMs[0] ?? 0;
  const fnSteady = median(m.functionMs.slice(1));
  const fnFirst = m.functionMs[0] ?? 0;
  const net = median(m.staticMs);
  const pageFirst = m.pageMs[0] ?? 0;
  const pageSteady = median(m.pageMs.slice(1));
  const where = m.region && m.region !== "unknown" ? ` (${m.region})` : "";

  const pageMeasured = m.pageMs.length > 0;
  const pageSlow = pageSteady > TARGET_MS;

  if (dbSteady > 120) {
    out.push(
      pageMeasured && !pageSlow
        ? {
            level: "warn",
            text: `เซิร์ฟเวอร์${where} อยู่ไกลฐานข้อมูล (~${Math.round(dbSteady)} ms ต่อคำขอ) ตอนนี้หน้ายังโหลดต่ำกว่าเป้า แต่ถ้าตั้ง Function Region ของ Vercel ให้ตรงกับ Supabase จะเร็วขึ้นอีกมาก`,
          }
        : {
            level: "bad",
            text: `เซิร์ฟเวอร์${where} อยู่ไกลฐานข้อมูลมาก: แต่ละคำขอใช้ ~${Math.round(dbSteady)} ms และหนึ่งหน้ายิงต่อเนื่องหลายครั้ง นี่คือสาเหตุหลักของความช้า แก้โดยตั้ง Function Region ของ Vercel ให้อยู่ภูมิภาคเดียวกับ Supabase`,
          },
    );
  } else if (dbSteady > 40) {
    out.push({
      level: "warn",
      text: `เซิร์ฟเวอร์${where} ค่อนข้างไกลฐานข้อมูล (~${Math.round(dbSteady)} ms ต่อคำขอ) ถ้าอยู่ภูมิภาคเดียวกันควรต่ำกว่า 40 ms`,
    });
  } else {
    out.push({ level: "ok", text: `เซิร์ฟเวอร์${where} ใกล้ฐานข้อมูล (~${Math.round(dbSteady)} ms ต่อคำขอ)` });
  }

  if (dbFirst - dbSteady > 300) {
    out.push({
      level: "warn",
      text: `คำขอแรกไปฐานข้อมูลช้ากว่าปกติ ~${Math.round(dbFirst - dbSteady)} ms (เปิดการเชื่อมต่อใหม่ หรือโปรเจกต์ Supabase เพิ่งตื่นจากการพัก) ถ้าไม่ได้ใช้นาน หน้าแรกที่เปิดจะช้ากว่าหน้าต่อๆ ไป`,
    });
  }

  if (fnFirst - fnSteady > 600) {
    out.push({
      level: "warn",
      text: `ฟังก์ชันเซิร์ฟเวอร์ถูกปลุกจากการหลับ (cold start) ใช้เวลาเพิ่ม ~${Math.round(fnFirst - fnSteady)} ms ครั้งแรกหลังไม่มีคนใช้จะช้า ครั้งต่อไปจะเร็วขึ้น`,
    });
  }

  if (net > 400) {
    out.push({
      level: "warn",
      text: `เครือข่ายจากมือถือถึง Vercel ช้า (~${Math.round(net)} ms แค่ดึงไฟล์เล็กๆ) ลองสลับระหว่าง Wi-Fi กับ 5G แล้วตรวจอีกครั้ง`,
    });
  }

  const seconds = (v: number) => (v / 1000).toFixed(1);
  if (m.pageMs.length > 0) {
    if (pageSteady > TARGET_MS) {
      out.push({
        level: "bad",
        text: `หน้าภาพรวมจริงใช้ ~${seconds(pageSteady)} วินาที (ครั้งแรก ${seconds(pageFirst)}) เกินเป้า ${TARGET_MS / 1000} วินาที`,
      });
    } else if (pageFirst > TARGET_MS) {
      out.push({
        level: "warn",
        text: `หน้าภาพรวมครั้งแรกช้า ${seconds(pageFirst)} วินาที แต่ครั้งต่อมา ~${seconds(pageSteady)} วินาที (ต่ำกว่าเป้า ${TARGET_MS / 1000} วินาที) ครั้งแรกรวมการปลุกเซิร์ฟเวอร์`,
      });
    } else {
      out.push({
        level: "ok",
        text: `หน้าภาพรวมจริงใช้ ~${seconds(pageSteady)} วินาที (ครั้งแรก ${seconds(pageFirst)}) ต่ำกว่าเป้า ${TARGET_MS / 1000} วินาที`,
      });
    }
  }

  if (out.every((f) => f.level === "ok")) {
    out.push({ level: "ok", text: "ไม่พบจุดคอขวดชัดเจนจากการตรวจนี้" });
  }
  return out;
}

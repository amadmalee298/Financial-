// Renders the SVG sources in scripts/icons to the PNGs the PWA needs.
// Needs Playwright with Chromium (not a project dependency):
//   npx playwright install chromium && node scripts/generate-icons.mjs
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const outputs = [
  { src: "any.svg", size: 192, file: "public/icons/icon-192.png" },
  { src: "any.svg", size: 512, file: "public/icons/icon-512.png" },
  { src: "full-bleed.svg", size: 512, file: "public/icons/icon-maskable-512.png" },
  { src: "full-bleed.svg", size: 180, file: "app/apple-icon.png" },
];

mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : undefined,
);
for (const { src, size, file } of outputs) {
  const svg = readFileSync(`scripts/icons/${src}`, "utf8");
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log("wrote", file);
}
await browser.close();

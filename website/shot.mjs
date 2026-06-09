import { chromium } from "playwright";

const browser = await chromium.launch();
const base = "http://localhost:4321/";

// Desktop
const d = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await d.goto(base, { waitUntil: "networkidle" });
await d.screenshot({ path: "/tmp/home-desktop.png", fullPage: true });

// Mobile
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto(base, { waitUntil: "networkidle" });
await m.screenshot({ path: "/tmp/home-mobile.png", fullPage: true });

await browser.close();
console.log("screenshots saved");

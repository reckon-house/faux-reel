#!/usr/bin/env node
// Export a Faux Reel loop as a seamless animated GIF (+ MP4), fully local.
//
// Spins up a throwaway static server for THIS repo, opens capture.html in the
// installed Google Chrome via playwright-core, and records one loop off a CDP
// screencast, snapping frames to an exact fps grid so the last frame butts
// against the first (a seamless loop). No dev server, no remote site.
//
// Requires: Node 18+, Google Chrome, ffmpeg on PATH, and `npm install` in this
// folder (pulls playwright-core, which drives your existing Chrome).
//
// Usage:
//   npm install                                  # once
//   node export-gif.mjs [--width 720] [--fps 20] [--out faux-reel]
//                       [--headline "Title"] [--images "a.jpg, b.jpg"]
//                       [--colors "#0AA7CA, #181B17"] [--speed 1]
//   No --images uses the bundled sample/ set.
//
// Output: exports/faux-reel.gif, -small.gif, .mp4

import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, rmSync, existsSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};

const WIDTH = parseInt(arg("width", "720"), 10);
const HEIGHT = Math.round((WIDTH * 9) / 16);
const FPS = parseInt(arg("fps", "20"), 10);
const FRAME_MS = 1000 / FPS;
const NAME = arg("out", "faux-reel");

// Serve THIS repo over a throwaway local port so the whole export runs offline.
// capture.html, sizzle-reel.js and sample/ all live at the repo root, one level up.
const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json",
};
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split("?")[0]);
  const file = join(ROOT, path === "/" ? "capture.html" : path);
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404); res.end("not found"); return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;

// Reel config passes straight through to capture.html (all optional; it falls
// back to the bundled sample set).
const query = new URLSearchParams();
for (const key of ["images", "colors", "headline", "speed"]) {
  const v = arg(key, null);
  if (v !== null) query.set(key, v);
}
const PAGE_URL = `http://localhost:${PORT}/capture.html${query.toString() ? "?" + query : ""}`;

const OUT_DIR = "exports";
const TMP = join(OUT_DIR, ".frames");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const log = (m) => process.stdout.write(`${m}\n`);
const timed = (label, promise, ms = 15000) =>
  Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`STALLED: ${label}`)), ms)),
  ]);

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  const cdp = await page.context().newCDPSession(page);

  log(`→ ${PAGE_URL} @ ${WIDTH}x${HEIGHT}`);
  await page.goto(PAGE_URL, { waitUntil: "networkidle" });
  await page.waitForFunction("window.__ready === true", null, { timeout: 30000 });

  const loopMs = await page.evaluate("window.__loopMs");
  const frames = Math.round(loopMs / FRAME_MS);
  log(`loop ${loopMs}ms → ${frames} frames @ ${FPS}fps`);

  // Screencast on the LIVE clock. Frozen virtual time turned into a
  // whack-a-mole of never-delivered decodes and wedged captureScreenshot
  // readbacks; screencast instead forces the compositor to produce real
  // frames, each stamped with an epoch timestamp. Recording spans two
  // beat-0 boundaries, then the encode step snaps recorded frames to an
  // exact 20fps grid across exactly one loop.
  const shots = [];
  cdp.on("Page.screencastFrame", (e) => {
    shots.push({ ts: e.metadata.timestamp, data: e.data });
    cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "png",
    everyNthFrame: 1,
    maxWidth: WIDTH,
    maxHeight: HEIGHT,
  });

  // Watch for two fresh beat-0 boundaries on the wall clock.
  let t0 = null;
  let t1 = null;
  let lastBeat = await page.evaluate("window.__beat");
  const deadline = Date.now() + (loopMs * 3) + 15000;
  while (t1 === null && Date.now() < deadline) {
    const beat = await page.evaluate("window.__beat");
    if (beat === 0 && lastBeat !== 0) {
      const now = Date.now() / 1000;
      if (t0 === null) {
        t0 = now;
        log("first beat-0 boundary — recording one loop");
      } else {
        t1 = now;
      }
    }
    lastBeat = beat;
    await new Promise((r) => setTimeout(r, 15));
  }
  await cdp.send("Page.stopScreencast").catch(() => {});
  if (t0 === null || t1 === null) throw new Error("never saw two beat-0 boundaries");
  log(`recorded ${shots.length} screencast frames across ${(t1 - t0).toFixed(2)}s`);

  // Snap to the 20fps grid: for each tick pick the latest frame at or
  // before it (the frame that was on screen at that instant).
  let written = 0;
  for (let f = 0; f < frames; f++) {
    const target = t0 + (f * FRAME_MS) / 1000;
    let best = null;
    for (const sh of shots) {
      if (sh.ts <= target) best = sh;
      else break;
    }
    if (!best) best = shots[0];
    writeFileSync(join(TMP, `f${String(f).padStart(4, "0")}.png`), Buffer.from(best.data, "base64"));
    written++;
  }
  log(`wrote ${written} grid frames`);
} finally {
  await browser.close();
}

// ── Assemble ──
const seq = join(TMP, "f%04d.png");
const gif = join(OUT_DIR, `${NAME}.gif`);
const gifSmall = join(OUT_DIR, `${NAME}-small.gif`);
const mp4 = join(OUT_DIR, `${NAME}.mp4`);
const palette = join(TMP, "palette.png");

const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });

log("encoding GIF (2-pass palette)…");
ff(["-framerate", String(FPS), "-i", seq, "-vf", "palettegen=stats_mode=diff", palette]);
ff(["-framerate", String(FPS), "-i", seq, "-i", palette, "-lavfi",
  "paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", "-loop", "0", gif]);

log("encoding small GIF (480px)…");
ff(["-framerate", String(FPS), "-i", seq, "-i", palette, "-lavfi",
  "scale=480:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
  "-loop", "0", gifSmall]);

log("encoding MP4…");
// libx264 + yuv420p requires even dimensions (720x405 would fail) — snap down.
ff(["-framerate", String(FPS), "-i", seq, "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", mp4]);

rmSync(TMP, { recursive: true, force: true });

for (const f of [gif, gifSmall, mp4]) {
  if (existsSync(f)) {
    const mb = (statSync(f).size / 1048576).toFixed(2);
    log(`✓ ${f}  ${mb} MB`);
  }
}

server.close();

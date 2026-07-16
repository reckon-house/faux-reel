#!/usr/bin/env node
// Export the SizzleReel loop as a seamless animated GIF (+ MP4).
//
// Captures /sizzle/capture from a running dev server using the installed
// Google Chrome via playwright-core, stepping CDP VIRTUAL TIME so every
// frame lands on an exact tick — no wall-clock jitter, and the last frame
// butts perfectly against the first for a seamless loop.
//
// Usage:
//   node scripts/export-sizzle-gif.mjs [--port 59201] [--width 720] [--fps 20]
//
// Output: exports/ivy-park-sizzle.gif / .mp4 / -small.gif

import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};

const PORT = arg("port", "59201");
const WIDTH = parseInt(arg("width", "720"), 10);
const HEIGHT = Math.round((WIDTH * 9) / 16);
const FPS = parseInt(arg("fps", "20"), 10);
const FRAME_MS = 1000 / FPS;
const NAME = arg("out", "west-texas-sizzle");
const URL = `http://localhost:${PORT}/sizzle/capture`;

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

  log(`→ ${URL} @ ${WIDTH}x${HEIGHT}`);
  await page.goto(URL, { waitUntil: "networkidle" });
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

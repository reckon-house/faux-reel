# AGENTS.md

Orientation for an AI coding agent (Claude Code, Cursor, and friends) working in
this repo. It's small on purpose — read this, then the file you're changing.

## What this is

Faux Reel makes a **sizzle reel**: a fast montage of still images that reads as
motion, using only CSS animation. No video files. One small engine, three ways
to use it.

## The files

- **`sizzle-reel.js`** — the drop-in Web Component `<sizzle-reel>`. Zero
  dependencies (~17KB). Self-contained: it registers the element, injects its own
  CSS, and choreographs the loop. This is the file most people embed.
- **`index.html`** — a standalone tool. Open it in a browser (no build): load
  images, pull a palette from them, set a title, copy the embed code.
- **`react/SizzleReel.tsx`** — the same engine as one React component; its only
  dependency is `react`. Props mirror the web component's attributes.
- **`export/export-gif.mjs`** — a Node CLI that renders the loop to a seamless
  GIF/MP4 by stepping a headless Chrome's virtual clock frame by frame. Needs
  `node`, `playwright-core`, and `ffmpeg`.
- **`sample/`** — West Texas photos the demo plays by default.

## The one idea to hold onto

The reel is a list of **beats**. The clearest place to see it is `buildSequence`
in `react/SizzleReel.tsx` (the web component mirrors it). Each beat is a
transition: wipes (`shutter`, `curtain`, `slat`), a cream `burn` blink, a lens
`pinch`, solid `color` frames, and title-card beats where the words build in.

The move that sells it is the **hidden cut**: `pinch` and `flash` beats swap the
photo while the cover is fully opaque, so the eye never catches the swap — it just
reads motion. A blink that lands back on the *same* image reads as a glitch, so
consecutive beats always change the frame.

Timings live in each beat's `ms`; wipes settle at ~72% of their hold so a frame
rests before the next cut. Retime by editing those numbers.

## Common changes

- **Different default look** → edit the beat list in `buildSequence` and the
  default palette.
- **New transition** → add a branch in the beat renderer + a CSS keyframe, then
  reference it from `buildSequence`.
- **Retiming** → the per-beat `ms` values.

## Gotchas

- The web component pauses when off-screen (IntersectionObserver). A reel in a
  zero-size or `display:none` container reads as off-screen and won't animate
  until it's actually visible.
- Weight animates via `font-variation-settings: 'wght' N`, not `font-weight`.
- The images in `sample/` are project samples from the author, for demo only.
  Swap in your own before you redistribute.

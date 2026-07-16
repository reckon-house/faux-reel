# Export a Faux Reel to GIF / MP4

Turn your reel into a shareable file, entirely on your machine. Nothing hits the
network, and it does not need the `index.html` tool running.

## Requirements

- Node 18+
- Google Chrome (the script drives your installed Chrome; no browser download)
- `ffmpeg` on your PATH (`brew install ffmpeg`)

## Use

```bash
cd export
npm install          # once, pulls playwright-core
npm run export       # or: node export-gif.mjs
```

Output lands in `export/exports/`: `faux-reel.gif`, `faux-reel-small.gif` (480px),
and `faux-reel.mp4`. By default it renders the bundled `sample/` reel.

### Your own reel

Pass the same values you would put on `<sizzle-reel>`:

```bash
node export-gif.mjs \
  --headline "Your Title" \
  --images "sample/1.jpg, sample/2.jpg, sample/3.jpg" \
  --colors "#0AA7CA, #181B17, #776549" \
  --speed 1
```

Image paths are relative to the repo root (where `sample/` lives). Drop your own
photos anywhere in the repo folder and point `--images` at them.

### Options

| Flag | Default | What it does |
|------|---------|--------------|
| `--width` | `720` | Output width in px (height is 16:9) |
| `--fps` | `20` | Frames per second |
| `--out` | `faux-reel` | Output filename stem |
| `--headline` | `Faux Reel` | Title-card text |
| `--images` | sample set | Comma-separated image paths |
| `--colors` | brand set | Comma-separated hex colors |
| `--speed` | `1` | Playback speed |

## How it works

The script serves this repo on a throwaway local port, opens `capture.html` (a
bare full-screen `<sizzle-reel>`) in headless Chrome, records exactly one loop off
a CDP screencast, and snaps the frames to an even fps grid so the loop is seamless.
`ffmpeg` then encodes the GIF (two-pass palette) and the MP4.

> Want animated WebP instead? It is smaller and full-color for photographic
> frames, but needs an `ffmpeg` built with `libwebp`. The bundled `demo.webp` was
> made by re-encoding the exported frames with one.

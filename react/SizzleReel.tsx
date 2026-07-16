"use client";

import { useEffect, useRef, useState } from "react";

// A code-only "sizzle reel": one container hard-cuts and wipes through a run
// of stills fast enough that the eye reads it as motion. No video files.
//
// v2: beats can be photos OR solid-color frames OR type frames, and the burn
// blink mirrors the site's BurnMeltTransition (cream #F3F0ED + the
// blur/saturate/contrast pop) at blink length. Feed it images, hex colors,
// and an optional headline; it choreographs a default loop or takes a custom
// sequence.

export type SizzleFx =
  | "shutter" // clip-path opens from a center band
  | "fade" // quick crossfade
  | "slat" // vertical blinds, staggered
  | "flash" // solid color blink that clears
  | "cut" // hard cut (stepped opacity)
  | "curtain" // image wipes in left-to-right
  | "burn" // cream blink + blur/saturate pop, image settles under it
  | "ccurtain" // solid color wipes in left-to-right and HOLDS
  | "ccurtainV" // solid color wipes in top-to-bottom and HOLDS
  | "word" // solid color + type punches in and holds
  | "wordSlide" // solid color + one line slides in from the left edge
  | "wordBuild" // solid color + the line assembles word by word
  | "wordOut" // the standing line exits word by word, leaving the bare card
  | "pinch"; // top+bottom panels close to the middle, cut hides at the meet, panels part onto the new frame

export interface SizzleBeat {
  fx: SizzleFx;
  img?: number; // index into images[] (photo beats)
  color?: string; // hex (color/word/flash beats)
  text?: string; // word beats
  ms: number; // how long this beat holds before the next fires
}

const STYLE_ID = "sz-reel-css";
const CSS = `
.sz-stage{position:relative;overflow:hidden;background:#0E0E0E;display:block;container-type:inline-size}
.sz-fill{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.sz-layer{position:absolute;inset:0;will-change:transform,opacity,clip-path}
.sz-shutter{animation:szShutter var(--d) cubic-bezier(.7,0,.15,1) both}
@keyframes szShutter{from{clip-path:inset(50% 0 50% 0)}to{clip-path:inset(0 0 0 0)}}
.sz-fade{animation:szFade var(--d) ease both}
@keyframes szFade{from{opacity:0}to{opacity:1}}
.sz-cut{animation:szCut var(--d) steps(2) both}
@keyframes szCut{from{opacity:0}to{opacity:1}}
.sz-curtain{animation:szCurtain var(--d) cubic-bezier(.7,0,.15,1) both}
@keyframes szCurtain{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.sz-ccurtainV{animation:szCurtainV var(--d) cubic-bezier(.7,0,.15,1) both}
@keyframes szCurtainV{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
.sz-flash{animation:szFlash var(--d) ease both}
@keyframes szFlash{0%{opacity:0}22%{opacity:1}62%{opacity:1}100%{opacity:0}}
.sz-flashswap{animation:szFlashSwap var(--d) linear both}
@keyframes szFlashSwap{0%{opacity:0}21%{opacity:0}22%{opacity:1}100%{opacity:1}}
.sz-pinchP{position:absolute;left:0;right:0;height:50.5%}
.sz-pinchT{top:0;transform:translateY(-102%);animation:szPinchT var(--d) cubic-bezier(.7,0,.15,1) both}
.sz-pinchB{bottom:0;transform:translateY(102%);animation:szPinchB var(--d) cubic-bezier(.7,0,.15,1) both}
@keyframes szPinchT{0%{transform:translateY(-102%)}45%{transform:translateY(0)}55%{transform:translateY(0)}100%{transform:translateY(-102%)}}
@keyframes szPinchB{0%{transform:translateY(102%)}45%{transform:translateY(0)}55%{transform:translateY(0)}100%{transform:translateY(102%)}}
.sz-pinchswap{animation:szPinchSwap var(--d) linear both}
@keyframes szPinchSwap{0%{opacity:0}49%{opacity:0}50%{opacity:1}100%{opacity:1}}
.sz-wout{display:inline-block;margin:0 .13em;animation:szWordOutCut calc(var(--d)*.5) steps(1,end) both,szWordOutDrop calc(var(--d)*.5) linear both}
@keyframes szWordOutCut{0%{opacity:1}58%{opacity:1}62%{opacity:0}100%{opacity:0}}
@keyframes szWordOutDrop{0%{transform:none}45%{transform:translateY(-3%) scale(1.006)}62%{transform:translateY(9%) scale(.96)}100%{transform:translateY(9%) scale(.96)}}
.sz-strip{position:absolute;top:0;height:100%;overflow:hidden;clip-path:inset(0 0 100% 0);animation:szSlat var(--sd) cubic-bezier(.6,0,.15,1) both}
.sz-strip img{position:absolute;top:0;height:100%;max-width:none;object-fit:cover;display:block}
@keyframes szSlat{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
.sz-burnimg{animation:szBurnImg var(--d) cubic-bezier(.72,0,.18,1) both}
@keyframes szBurnImg{0%{opacity:0;transform:scale(1.02);filter:brightness(1.5) saturate(2.6) contrast(1.5)}22%{opacity:1;transform:scale(1.015);filter:brightness(1.35) saturate(2.2) contrast(1.4)}100%{opacity:1;transform:scale(1);filter:brightness(1) saturate(1) contrast(1)}}
.sz-burnpop{position:absolute;inset:0;pointer-events:none;background:rgba(243,240,237,.35);opacity:0;-webkit-backdrop-filter:blur(0px) saturate(1) contrast(1);backdrop-filter:blur(0px) saturate(1) contrast(1);animation:szBurnPop var(--d) cubic-bezier(.72,0,.18,1) both}
@keyframes szBurnPop{0%{opacity:0;-webkit-backdrop-filter:blur(0px) saturate(1) contrast(1);backdrop-filter:blur(0px) saturate(1) contrast(1)}18%{opacity:1;-webkit-backdrop-filter:blur(4px) saturate(4.5) contrast(2.2);backdrop-filter:blur(4px) saturate(4.5) contrast(2.2)}100%{opacity:0;-webkit-backdrop-filter:blur(0px) saturate(1) contrast(1);backdrop-filter:blur(0px) saturate(1) contrast(1)}}
.sz-burnwash{position:absolute;inset:0;pointer-events:none;background:#F3F0ED;opacity:0;animation:szBurnWash var(--d) cubic-bezier(.72,0,.18,1) both}
@keyframes szBurnWash{0%{opacity:0}16%{opacity:.95}40%{opacity:.3}100%{opacity:0}}
.sz-burnup{animation:szBurnUp var(--d) cubic-bezier(.2,.8,.2,1) both}
@keyframes szBurnUp{0%{opacity:0}28%{opacity:1}100%{opacity:1}}
.sz-word{display:grid;place-items:center;text-align:center;padding:9%;font-weight:400;line-height:1.3;letter-spacing:.01em;font-size:clamp(13px,3cqw,42px)}
.sz-word .sz-line{display:block;text-wrap:balance}
.sz-anim{animation:szWordCut var(--d) steps(1,end) both,szWordPunch var(--d) linear both}
.sz-slidein{display:inline-block;animation:szWordSlide calc(var(--d)*.55) cubic-bezier(.7,0,.15,1) both}
@keyframes szWordSlide{0%{clip-path:inset(-8% 100% -8% -8%);transform:translateX(-5%)}100%{clip-path:inset(-8% -8% -8% -8%);transform:none}}
.sz-w{display:inline-block;margin:0 .13em;animation:szWordCut calc(var(--d)*.42) steps(1,end) both,szWordPunch calc(var(--d)*.42) linear both}
@keyframes szWordCut{0%{opacity:0}3%{opacity:1}100%{opacity:1}}
@keyframes szWordPunch{0%{transform:translateY(12%) scale(.955)}30%{transform:translateY(-0.6%) scale(1.004)}44%{transform:none}100%{transform:none}}
.sz-wgrp{display:inline-block;white-space:nowrap}
.sz-wgrp+.sz-wgrp{margin-left:.28em}
.sz-ltr{display:inline-block;animation:szLtrIn var(--ld) cubic-bezier(.18,.9,.24,1) both}
@keyframes szLtrIn{0%{opacity:0;transform:translateY(75%) scale(.86)}60%{opacity:1}100%{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){
  .sz-layer,.sz-strip,.sz-anim,.sz-slidein,.sz-w,.sz-ltr{animation:none!important}
  .sz-shutter,.sz-curtain,.sz-ccurtainV,.sz-strip{clip-path:inset(0 0 0 0)!important}
  .sz-fade,.sz-cut,.sz-burnup{opacity:1!important}
  .sz-flashswap,.sz-pinchswap{animation:none!important;opacity:1!important}
  .sz-pinchT{animation:none!important;transform:translateY(-102%)!important}
  .sz-pinchB{animation:none!important;transform:translateY(102%)!important}
  .sz-wout{animation:none!important;opacity:0!important}
  .sz-burnimg{opacity:1!important;filter:none!important;transform:none!important}
  .sz-anim,.sz-slidein,.sz-w,.sz-ltr{opacity:1!important;transform:none!important;clip-path:none!important}
  .sz-flash,.sz-burnpop,.sz-burnwash{opacity:0!important;animation:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
}
`;

function useSizzleStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

/** Default choreography: photos punctuated by color blinks, a burn, a solid
 *  curtain, and type. Wraps seamlessly: the first beat reveals over the last
 *  frame of the previous loop.
 *
 *  Type behavior: a 1-2 word headline gets one slide-in title card at the
 *  end. A 3+ word headline scatters its words through the loop as their own
 *  quick cards, then the full line assembles word by word on the closer. */
export function buildSequence(
  imageCount: number,
  colors: string[],
  headline?: string
): SizzleBeat[] {
  const img = (k: number) => k % Math.max(imageCount, 1);
  const col = (k: number) => colors[k % Math.max(colors.length, 1)] ?? "#18A6CC";
  const words = headline?.trim() ? headline.trim().split(/\s+/) : [];
  const scatter = words.length >= 3;

  // Photos play in array order so a curated set stays in its intended
  // sequence, and every image gets a beat (0..6). Consecutive beats always
  // land on different images, which the hidden-cut beats (pinch) rely on: the
  // pinch closes over the fade's frame and parts onto the next one.
  const beats: SizzleBeat[] = [{ fx: "shutter", img: img(0), ms: 640 }];
  // Scatter words land quick (capped build) then hold — a pause before the
  // next cut, so a word gets to breathe instead of being clipped away.
  if (scatter) beats.push({ fx: "word", color: col(2), text: words[0], ms: 720 });
  beats.push(
    { fx: "fade", img: img(1), ms: 420 },
    { fx: "pinch", color: col(0), img: img(2), ms: 520 },
    { fx: "slat", img: img(3), ms: 700 }
  );
  if (scatter) beats.push({ fx: "word", color: col(0), text: words[1], ms: 720 });
  beats.push(
    { fx: "burn", img: img(4), ms: 640 },
    { fx: "ccurtain", color: col(1), ms: 380 }
  );
  if (words.length >= 4) beats.push({ fx: "word", color: col(3), text: words[2], ms: 720 });
  beats.push(
    { fx: "curtain", img: img(5), ms: 720 },
    // 7th frame. Modulo wraps for smaller sets (repeats an earlier image,
    // spaced far from its first showing). Held a beat longer than a typical
    // cut so the image actually registers before the title card cuts in.
    { fx: "cut", img: img(6), ms: 640 }
  );
  if (scatter) {
    beats.push({ fx: "wordBuild", color: col(2), text: words.join(" "), ms: 1080 });
    // The line leaves the way it arrived: words cascade out, the bare card
    // holds a breath, and the next loop's shutter opens over it.
    beats.push({ fx: "wordOut", color: col(2), text: words.join(" "), ms: 620 });
  } else if (words.length > 0) {
    beats.push({ fx: "wordSlide", color: col(2), text: words.join(" "), ms: 800 });
  }
  return beats;
}

/** Legible type on any frame color: dark ink on light grounds, white on
 *  everything else. Used when no explicit textColor prop is given. */
function autoTextColor(hex?: string): string {
  if (!hex) return "#FFFFFF";
  const n = hex.replace("#", "");
  const v = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.55 ? "#141414" : "#FFFFFF";
}

// What the previous beat left on screen — the surface the current beat
// reveals over. Flash clears itself, so it defers to what came before it.
type Underlay =
  | { kind: "img"; img: number }
  | { kind: "color"; color: string; text?: string };

function underlayBefore(seq: SizzleBeat[], index: number): Underlay {
  for (let k = 1; k <= seq.length; k++) {
    const b = seq[(index - k + seq.length) % seq.length];
    if (b.fx === "flash" || b.fx === "pinch") {
      // A flash/pinch with an image is a hidden cut: it clears onto that
      // image. Without one it's transparent at rest, so keep looking back.
      if (b.img != null) return { kind: "img", img: b.img };
      continue;
    }
    if (b.fx === "ccurtain" || b.fx === "ccurtainV")
      return { kind: "color", color: b.color ?? "#0E0E0E" };
    if (b.fx === "wordOut")
      // The type has left; what remains is the bare card.
      return { kind: "color", color: b.color ?? "#0E0E0E" };
    if (b.fx === "word" || b.fx === "wordSlide" || b.fx === "wordBuild")
      return { kind: "color", color: b.color ?? "#0E0E0E", text: b.text };
    if (b.img != null) return { kind: "img", img: b.img };
  }
  return { kind: "img", img: 0 };
}

interface Props {
  images: string[];
  colors?: string[]; // hexes for flash / color-curtain / word frames
  headline?: string; // adds a title-card beat to the default loop
  textColor?: string; // word beat type color; auto contrast when omitted
  className?: string;
  style?: React.CSSProperties; // sizing lives on the stage itself
  sequence?: SizzleBeat[]; // full custom choreography (overrides the default)
  offsetBeat?: number; // start mid-sequence so a grid of reels stays desynced
  speed?: number; // 1 = as authored; 1.5 = 50% faster
  index?: number | null; // controlled beat index (step/debug mode); disables the timer
  nonce?: number; // bump to replay the current beat's animation
  onBeatChange?: (index: number, beat: SizzleBeat) => void;
  // IntersectionObserver root for the offscreen-pause check. Defaults to the
  // viewport, which is wrong inside a clipped container (e.g. a grid bounded
  // to a fixed aspect-ratio box via overflow:hidden) — a cell sitting past
  // the clip is still "in the viewport" as far as the default root is
  // concerned, so it never pauses despite being invisible. Pass the clipping
  // element's ref here so those cells correctly read as out of view.
  pauseRoot?: React.RefObject<HTMLElement | null>;
}

export function SizzleReel({
  images,
  colors = ["#18A6CC", "#0E0E0E", "#18A6CC"],
  headline,
  textColor,
  className = "",
  style,
  sequence,
  offsetBeat = 0,
  speed = 1,
  index = null,
  nonce = 0,
  onBeatChange,
  pauseRoot,
}: Props) {
  useSizzleStyles();
  const seq =
    sequence && sequence.length > 0
      ? sequence
      : buildSequence(images.length, colors, headline);
  const [i, setI] = useState(
    ((offsetBeat % seq.length) + seq.length) % seq.length
  );
  const controlled = index != null;
  const active = controlled
    ? ((index % seq.length) + seq.length) % seq.length
    : i % seq.length;

  // Pausing is OPT-IN via pauseRoot: pass the element that clips this reel (a
  // grid's bounded box) and cells that fall outside it stop, so a wall of reels
  // doesn't paint cells nobody can see. That intersection is static — the cells
  // don't move relative to their box — so the observer fires reliably. A lone
  // reel (the page hero, a thumbnail) passes nothing and simply runs; it's one
  // cheap loop, and a viewport-root observer is unreliable inside the app's
  // nested Lenis scroll anyway (it can leave a reel wrongly stuck paused).
  const stageRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = stageRef.current;
    const root = pauseRoot?.current;
    if (!el || !root) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      root,
      threshold: 0.01,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [pauseRoot]);

  // Warm the cache so first-pass reveals never flash empty.
  useEffect(() => {
    images.forEach((src) => {
      const im = new window.Image();
      im.src = src;
    });
  }, [images]);

  useEffect(() => {
    if (controlled) return; // step mode: the parent drives the beat
    if (!inView) return; // paused off-screen; resumes from the same beat
    if (i >= seq.length) {
      setI(0);
      return;
    }
    const hold = Math.max(120, seq[i].ms / Math.max(speed, 0.1));
    const t = setTimeout(() => setI((v) => (v + 1) % seq.length), hold);
    return () => clearTimeout(t);
  }, [i, seq, speed, controlled, inView]);

  useEffect(() => {
    onBeatChange?.(active, seq[active]);
  }, [active, seq, onBeatChange]);

  const beat = seq[active];
  const under = underlayBefore(seq, active);
  const holdMs = beat.ms / Math.max(speed, 0.1);
  // Wipes settle at 72% of the hold so the frame rests before the next cut.
  // Flash is a self-clearing blink: it must span the WHOLE hold, otherwise
  // the cleared underlay shows naked for the remainder and reads as a stutter.
  const dur = Math.round(beat.fx === "flash" ? holdMs : holdMs * 0.72);

  return (
    <div ref={stageRef} className={`sz-stage ${className}`} style={style}>
      {/* All stills stay mounted; the underlay just toggles opacity. Swapping
          one img's src per beat risked a one-frame decode blank (a dark
          blink) at every photo-to-photo boundary. */}
      {images.map((src, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={k}
          className="sz-fill"
          src={src}
          alt=""
          aria-hidden="true"
          style={{ opacity: under.kind === "img" && under.img === k ? 1 : 0 }}
        />
      ))}
      {under.kind === "color" ? (
        <div
          className="sz-fill sz-word"
          style={{ background: under.color, color: textColor ?? autoTextColor(under.color) }}
        >
          {under.text ? <span className="sz-line">{under.text}</span> : null}
        </div>
      ) : null}
      <BeatLayer
        key={`${active}:${nonce}`}
        beat={beat}
        images={images}
        dur={dur}
        textColor={textColor}
      />
    </div>
  );
}

function BeatLayer({
  beat,
  images,
  dur,
  textColor,
}: {
  beat: SizzleBeat;
  images: string[];
  dur: number;
  textColor?: string;
}) {
  const d = { ["--d" as string]: `${dur}ms` } as React.CSSProperties;

  if (beat.fx === "flash")
    return (
      <div className="sz-layer" style={d}>
        {beat.img != null ? (
          // The hidden cut: swaps in at 22% — exactly when the color hits
          // full cover — so the blink clears onto a new frame.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="sz-fill sz-flashswap" src={images[beat.img]} alt="" aria-hidden="true" style={d} />
        ) : null}
        <div className="sz-layer sz-flash" style={{ ...d, background: beat.color }} />
      </div>
    );

  if (beat.fx === "ccurtain" || beat.fx === "ccurtainV")
    return (
      <div
        className={`sz-layer ${beat.fx === "ccurtain" ? "sz-curtain" : "sz-ccurtainV"}`}
        style={{ ...d, background: beat.color }}
      />
    );

  if (beat.fx === "word" || beat.fx === "wordSlide") {
    // Letters build in sequence — a fast rise-and-form, staggered left to
    // right. Words stay in nowrap groups so only whole words break to a new
    // line; the stagger runs continuously across the line. Total build is
    // capped so a long headline still lands inside the beat.
    const words = (beat.text ?? "").split(/\s+/).filter(Boolean);
    const totalChars = words.reduce((n, w) => n + w.length, 0) || 1;
    // Cap the build so a longer hold (the pause after a scatter word) doesn't
    // slow the entrance itself — letters land quick, then the beat sits.
    const build = Math.min(dur, 360);
    const stagger = Math.min(38, Math.round((build * 0.5) / totalChars));
    const ldur = Math.round(build * 0.5);
    let li = 0;
    return (
      <div
        className="sz-layer sz-word"
        style={{ ...d, background: beat.color, color: textColor ?? autoTextColor(beat.color) }}
      >
        <span className="sz-line">
          {words.map((w, wi) => (
            <span key={wi} className="sz-wgrp">
              {[...w].map((ch, ci) => (
                <span
                  key={ci}
                  className="sz-ltr"
                  style={{ animationDelay: `${li++ * stagger}ms`, ["--ld" as string]: `${ldur}ms` } as React.CSSProperties}
                >
                  {ch}
                </span>
              ))}
            </span>
          ))}
        </span>
      </div>
    );
  }

  if (beat.fx === "pinch")
    return (
      <div className="sz-layer" style={d}>
        {beat.img != null ? (
          // The hidden cut: swaps at 50% — while the panels are shut.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="sz-fill sz-pinchswap" src={images[beat.img]} alt="" aria-hidden="true" style={d} />
        ) : null}
        <div className="sz-pinchP sz-pinchT" style={{ ...d, background: beat.color }} />
        <div className="sz-pinchP sz-pinchB" style={{ ...d, background: beat.color }} />
      </div>
    );

  if (beat.fx === "wordOut") {
    const words = (beat.text ?? "").split(/\s+/);
    const stagger = Math.round(dur * 0.16);
    return (
      <div
        className="sz-layer sz-word"
        style={{ ...d, background: beat.color, color: textColor ?? autoTextColor(beat.color) }}
      >
        <span className="sz-line">
          {words.map((w, k) => (
            <span key={k} className="sz-wout" style={{ animationDelay: `${k * stagger}ms` }}>
              {w}
            </span>
          ))}
        </span>
      </div>
    );
  }

  if (beat.fx === "wordBuild") {
    const words = (beat.text ?? "").split(/\s+/);
    // Words land one at a time; the last settles around 75% of the beat so
    // the finished line gets a real hold before the loop wraps.
    const stagger = Math.round(dur * 0.16);
    const tc = textColor ?? autoTextColor(beat.color);
    return (
      <div className="sz-layer" style={d}>
        {/* The title card rides in under a cream burn-blink. sz-burnup brings
            the flat card to full quickly (~28%, while the wash still covers),
            so the cut from the previous photo into the card is hidden by the
            bloom — replacing the old sz-cut stepped fade that left the card at
            half opacity over the photo for half the beat, then hard-snapped.
            That seam was the jerk between the cut and the title card. */}
        <div
          className="sz-layer sz-word sz-burnup"
          style={{ ...d, background: beat.color, color: tc }}
        >
          <span className="sz-line">
            {words.map((w, k) => (
              <span key={k} className="sz-w" style={{ animationDelay: `${k * stagger}ms` }}>
                {w}
              </span>
            ))}
          </span>
        </div>
        <div className="sz-burnpop" style={d} />
        <div className="sz-burnwash" style={d} />
      </div>
    );
  }

  if (beat.fx === "burn")
    return (
      <div className="sz-layer" style={d}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sz-fill sz-burnimg" src={images[beat.img ?? 0]} alt="" aria-hidden="true" style={d} />
        <div className="sz-burnpop" style={d} />
        <div className="sz-burnwash" style={d} />
      </div>
    );

  if (beat.fx === "slat") {
    const N = 6;
    return (
      <div
        className="sz-layer"
        style={{ ["--sd" as string]: `${Math.round(dur * 0.7)}ms` } as React.CSSProperties}
      >
        {Array.from({ length: N }).map((_, k) => (
          <div
            key={k}
            className="sz-strip"
            style={{
              left: `${(k * 100) / N}%`,
              width: `${100 / N}%`,
              animationDelay: `${Math.round(k * dur * 0.08)}ms`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[beat.img ?? 0]} alt="" aria-hidden="true" style={{ left: `${-k * 100}%`, width: `${N * 100}%` }} />
          </div>
        ))}
      </div>
    );
  }

  // shutter / fade / cut / curtain — single image layer with a wipe class
  return (
    <div className={`sz-layer sz-${beat.fx}`} style={d}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sz-fill" src={images[beat.img ?? 0]} alt="" aria-hidden="true" />
    </div>
  );
}

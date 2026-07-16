/*  <sizzle-reel> — a code-only "sizzle reel" web component.
 *
 *  One container cuts and wipes through a run of stills fast enough that the
 *  eye reads it as motion. No video files, no dependencies, no build step.
 *
 *  Usage:
 *    <script src="sizzle-reel.js"></script>
 *    <sizzle-reel
 *      images="/photos/a.jpg, /photos/b.jpg, /photos/c.jpg"
 *      colors="#0888B8, #181818, #38B8D8"
 *      headline="Courage is power"
 *      aspect="16 / 9"
 *      radius="18px"
 *      speed="1"
 *      offset="0"
 *    ></sizzle-reel>
 *
 *  Attributes:
 *    images   — comma-separated image URLs (3+ recommended, 5-6 ideal)
 *    colors   — comma-separated hexes for color frames / title cards
 *    headline — optional. 1-2 words: slide-in title card at the end.
 *               3+ words: words scatter through the loop as quick cards,
 *               then the full line builds word by word and exits.
 *    aspect   — CSS aspect-ratio (default "16 / 9")
 *    radius   — border-radius (default "0")
 *    speed    — 1 = as authored, 1.5 = 50% faster (default 1)
 *    offset   — start N beats into the loop (desync a grid of reels)
 *
 *  Type inherits the page font. Pauses automatically when offscreen.
 *  Respects prefers-reduced-motion (resolves every beat to its end frame).
 */

const CSS = `
:host{display:block}
.sz-stage{position:relative;overflow:hidden;background:#0E0E0E;width:100%;height:100%;container-type:inline-size;border-radius:var(--sz-radius,0)}
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
.sz-word{box-sizing:border-box;display:grid;place-items:center;text-align:center;padding:9%;font-weight:400;line-height:1.3;letter-spacing:.01em;font-size:clamp(13px,3cqw,42px)}
.sz-word .sz-line{display:block;text-wrap:balance}
.sz-anim{animation:szWordCut var(--d) steps(1,end) both,szWordPunch var(--d) linear both}
.sz-slidein{display:inline-block;animation:szWordSlide calc(var(--d)*.55) cubic-bezier(.7,0,.15,1) both}
@keyframes szWordSlide{0%{clip-path:inset(-8% 100% -8% -8%);transform:translateX(-5%)}100%{clip-path:inset(-8% -8% -8% -8%);transform:none}}
.sz-w{display:inline-block;margin:0 .13em;animation:szWordCut calc(var(--d)*.42) steps(1,end) both,szWordPunch calc(var(--d)*.42) linear both}
@keyframes szWordCut{0%{opacity:0}3%{opacity:1}100%{opacity:1}}
@keyframes szWordPunch{0%{transform:translateY(12%) scale(.955)}30%{transform:translateY(-0.6%) scale(1.004)}44%{transform:none}100%{transform:none}}
.sz-wout{display:inline-block;margin:0 .13em;animation:szWordOutCut calc(var(--d)*.5) steps(1,end) both,szWordOutDrop calc(var(--d)*.5) linear both}
@keyframes szWordOutCut{0%{opacity:1}58%{opacity:1}62%{opacity:0}100%{opacity:0}}
@keyframes szWordOutDrop{0%{transform:none}45%{transform:translateY(-3%) scale(1.006)}62%{transform:translateY(9%) scale(.96)}100%{transform:translateY(9%) scale(.96)}}
@media (prefers-reduced-motion:reduce){
  .sz-layer,.sz-strip,.sz-anim,.sz-slidein,.sz-w{animation:none!important}
  .sz-shutter,.sz-curtain,.sz-ccurtainV,.sz-strip{clip-path:inset(0 0 0 0)!important}
  .sz-fade,.sz-cut,.sz-burnup{opacity:1!important}
  .sz-flashswap,.sz-pinchswap{animation:none!important;opacity:1!important}
  .sz-pinchT{animation:none!important;transform:translateY(-102%)!important}
  .sz-pinchB{animation:none!important;transform:translateY(102%)!important}
  .sz-wout{animation:none!important;opacity:0!important}
  .sz-burnimg{opacity:1!important;filter:none!important;transform:none!important}
  .sz-anim,.sz-slidein,.sz-w{opacity:1!important;transform:none!important;clip-path:none!important}
  .sz-flash,.sz-burnpop,.sz-burnwash{opacity:0!important;animation:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
}
`;

function autoTextColor(hex) {
  if (!hex) return "#FFFFFF";
  const n = hex.replace("#", "");
  const v = n.length === 3 ? n.split("").map((c) => c + c).join("") : n;
  const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55 ? "#141414" : "#FFFFFF";
}

function buildSequence(imageCount, colors, headline) {
  const img = (k) => k % Math.max(imageCount, 1);
  const col = (k) => colors[k % Math.max(colors.length, 1)] || "#18A6CC";
  const words = headline && headline.trim() ? headline.trim().split(/\s+/) : [];
  const scatter = words.length >= 3;

  const beats = [{ fx: "shutter", img: img(0), ms: 640 }];
  if (scatter) beats.push({ fx: "word", color: col(2), text: words[0], ms: 420 });
  beats.push(
    { fx: "fade", img: img(1), ms: 420 },
    { fx: "pinch", color: col(0), img: img(5), ms: 520 },
    { fx: "slat", img: img(2), ms: 700 }
  );
  if (scatter) beats.push({ fx: "word", color: col(0), text: words[1], ms: 420 });
  beats.push(
    { fx: "burn", img: img(3), ms: 640 },
    { fx: "ccurtain", color: col(1), ms: 380 }
  );
  if (words.length >= 4) beats.push({ fx: "word", color: col(3), text: words[2], ms: 400 });
  beats.push({ fx: "curtain", img: img(4), ms: 720 });
  if (scatter) {
    beats.push({ fx: "wordBuild", color: col(2), text: words.join(" "), ms: 1080 });
    beats.push({ fx: "wordOut", color: col(2), text: words.join(" "), ms: 620 });
  } else if (words.length > 0) {
    beats.push({ fx: "wordSlide", color: col(2), text: words.join(" "), ms: 800 });
  }
  return beats;
}

function underlayBefore(seq, index) {
  for (let k = 1; k <= seq.length; k++) {
    const b = seq[(index - k + seq.length) % seq.length];
    if (b.fx === "flash" || b.fx === "pinch") {
      if (b.img != null) return { kind: "img", img: b.img };
      continue;
    }
    if (b.fx === "ccurtain" || b.fx === "ccurtainV") return { kind: "color", color: b.color || "#0E0E0E" };
    if (b.fx === "wordOut") return { kind: "color", color: b.color || "#0E0E0E" };
    if (b.fx === "word" || b.fx === "wordSlide" || b.fx === "wordBuild")
      return { kind: "color", color: b.color || "#0E0E0E", text: b.text };
    if (b.img != null) return { kind: "img", img: b.img };
  }
  return { kind: "img", img: 0 };
}

class SizzleReelElement extends HTMLElement {
  static observedAttributes = ["images", "colors", "headline", "speed", "aspect", "radius", "offset"];

  #timer = null;
  #io = null;
  #i = 0;
  #seq = [];
  #images = [];
  #stack = [];
  #stage = null;
  #beatEl = null;
  #visible = true;
  #frozen = false;

  connectedCallback() { this.#setup(); }
  disconnectedCallback() { this.#teardown(); }
  attributeChangedCallback() { if (this.isConnected) this.#setup(); }

  // Read the choreography and drive the beat externally (the standalone tool's
  // timeline uses these). `beats` is the list; `index` reads or sets the current
  // beat. Setting a number freezes on that beat and replays it; setting null
  // resumes the loop. A `beat` event fires on every render with { index, beat }.
  get beats() { return this.#seq.slice(); }
  get index() { return this.#i; }
  set index(v) {
    if (v == null) { this.#frozen = false; this.#render(); return; }
    if (!this.#seq.length) return;
    this.#frozen = true;
    this.#i = ((Number(v) % this.#seq.length) + this.#seq.length) % this.#seq.length;
    this.#render();
  }

  #attr(name, dflt) { return this.getAttribute(name) || dflt; }
  #list(name) {
    return this.#attr(name, "").split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
  }

  #teardown() {
    clearTimeout(this.#timer);
    this.#timer = null;
    if (this.#io) { this.#io.disconnect(); this.#io = null; }
  }

  #setup() {
    this.#teardown();
    this.#frozen = false;
    this.#images = this.#list("images");
    const colors = this.#list("colors");
    this.#seq = buildSequence(this.#images.length, colors.length ? colors : ["#18A6CC", "#0E0E0E"], this.#attr("headline", ""));
    const off = parseInt(this.#attr("offset", "0"), 10) || 0;
    this.#i = ((off % this.#seq.length) + this.#seq.length) % this.#seq.length;

    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    root.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = CSS;
    root.appendChild(style);

    this.style.aspectRatio = this.#attr("aspect", "16 / 9");
    this.#stage = document.createElement("div");
    this.#stage.className = "sz-stage";
    this.#stage.style.setProperty("--sz-radius", this.#attr("radius", "0"));
    root.appendChild(this.#stage);

    // Persistent image stack — no src swaps, no decode blinks.
    this.#stack = this.#images.map((src) => {
      const im = document.createElement("img");
      im.className = "sz-fill";
      im.src = src;
      im.alt = "";
      im.setAttribute("aria-hidden", "true");
      im.style.opacity = "0";
      this.#stage.appendChild(im);
      return im;
    });
    this.#underDiv = document.createElement("div");
    this.#underDiv.className = "sz-fill sz-word";
    this.#underDiv.style.display = "none";
    this.#stage.appendChild(this.#underDiv);

    // Pause offscreen: movement nobody sees is battery spent.
    this.#io = new IntersectionObserver((entries) => {
      const vis = entries[0]?.isIntersecting ?? true;
      if (vis && !this.#visible) { this.#visible = true; this.#render(); }
      else if (!vis && this.#visible) { this.#visible = false; clearTimeout(this.#timer); }
    }, { threshold: 0.05 });
    this.#io.observe(this);

    this.#render();
  }

  #underDiv = null;

  #render() {
    if (!this.#visible || !this.#seq.length) return;
    const beat = this.#seq[this.#i];
    const under = underlayBefore(this.#seq, this.#i);

    this.#stack.forEach((im, k) => {
      im.style.opacity = under.kind === "img" && under.img === k ? "1" : "0";
    });
    if (under.kind === "color") {
      this.#underDiv.style.display = "";
      this.#underDiv.style.background = under.color;
      this.#underDiv.style.color = autoTextColor(under.color);
      this.#underDiv.innerHTML = under.text ? `<span class="sz-line"></span>` : "";
      if (under.text) this.#underDiv.firstChild.textContent = under.text;
    } else {
      this.#underDiv.style.display = "none";
    }

    if (this.#beatEl) this.#beatEl.remove();
    const speed = Math.max(parseFloat(this.#attr("speed", "1")) || 1, 0.1);
    const holdMs = beat.ms / speed;
    const dur = Math.round(beat.fx === "flash" ? holdMs : holdMs * 0.72);
    this.#beatEl = this.#buildBeat(beat, dur);
    this.#stage.appendChild(this.#beatEl);

    this.dispatchEvent(new CustomEvent("beat", { detail: { index: this.#i, beat, beats: this.#seq } }));

    clearTimeout(this.#timer);
    if (this.#frozen) return;
    this.#timer = setTimeout(() => {
      this.#i = (this.#i + 1) % this.#seq.length;
      this.#render();
    }, Math.max(120, holdMs));
  }

  #img(src, cls, dur) {
    const im = document.createElement("img");
    im.className = cls;
    im.src = src;
    im.alt = "";
    im.setAttribute("aria-hidden", "true");
    if (dur != null) im.style.setProperty("--d", `${dur}ms`);
    return im;
  }

  #buildBeat(beat, dur) {
    const el = document.createElement("div");
    el.className = "sz-layer";
    el.style.setProperty("--d", `${dur}ms`);
    const imgs = this.#images;

    if (beat.fx === "flash") {
      if (beat.img != null) el.appendChild(this.#img(imgs[beat.img], "sz-fill sz-flashswap", dur));
      const c = document.createElement("div");
      c.className = "sz-layer sz-flash";
      c.style.setProperty("--d", `${dur}ms`);
      c.style.background = beat.color || "#111";
      el.appendChild(c);
      return el;
    }

    if (beat.fx === "pinch") {
      if (beat.img != null) el.appendChild(this.#img(imgs[beat.img], "sz-fill sz-pinchswap", dur));
      for (const side of ["T", "B"]) {
        const p = document.createElement("div");
        p.className = `sz-pinchP sz-pinch${side}`;
        p.style.setProperty("--d", `${dur}ms`);
        p.style.background = beat.color || "#111";
        el.appendChild(p);
      }
      return el;
    }

    if (beat.fx === "ccurtain" || beat.fx === "ccurtainV") {
      el.className = `sz-layer ${beat.fx === "ccurtain" ? "sz-curtain" : "sz-ccurtainV"}`;
      el.style.background = beat.color || "#111";
      return el;
    }

    if (beat.fx === "word" || beat.fx === "wordSlide" || beat.fx === "wordBuild" || beat.fx === "wordOut") {
      // The standing title cards (wordSlide / wordBuild) ride in under a cream
      // burn-blink so the cut from the previous photo into the flat card is
      // hidden by the bloom, not a hard snap. The quick scatter words and the
      // exit (wordOut) keep their own hard cut.
      const bloom = beat.fx === "wordSlide" || beat.fx === "wordBuild";
      const card = document.createElement("div");
      card.className = "sz-layer sz-word" + (bloom ? " sz-burnup" : "");
      card.style.background = beat.color || "#111";
      card.style.color = autoTextColor(beat.color);
      const line = document.createElement("span");
      line.className = "sz-line";
      if (beat.fx === "word" || beat.fx === "wordSlide") {
        line.classList.add(beat.fx === "wordSlide" ? "sz-slidein" : "sz-anim");
        line.textContent = beat.text || "";
      } else {
        const words = (beat.text || "").split(/\s+/);
        const stagger = Math.round(dur * 0.16);
        words.forEach((w, k) => {
          const s = document.createElement("span");
          s.className = beat.fx === "wordBuild" ? "sz-w" : "sz-wout";
          s.style.animationDelay = `${k * stagger}ms`;
          s.textContent = w;
          line.appendChild(s);
        });
      }
      card.appendChild(line);
      if (!bloom) return card;
      el.appendChild(card);
      for (const cls of ["sz-burnpop", "sz-burnwash"]) {
        const d = document.createElement("div");
        d.className = cls;
        d.style.setProperty("--d", `${dur}ms`);
        el.appendChild(d);
      }
      return el;
    }

    if (beat.fx === "burn") {
      el.appendChild(this.#img(imgs[beat.img ?? 0], "sz-fill sz-burnimg", dur));
      for (const cls of ["sz-burnpop", "sz-burnwash"]) {
        const d = document.createElement("div");
        d.className = cls;
        d.style.setProperty("--d", `${dur}ms`);
        el.appendChild(d);
      }
      return el;
    }

    if (beat.fx === "slat") {
      const N = 6;
      el.style.setProperty("--sd", `${Math.round(dur * 0.7)}ms`);
      for (let k = 0; k < N; k++) {
        const strip = document.createElement("div");
        strip.className = "sz-strip";
        strip.style.left = `${(k * 100) / N}%`;
        // Overlap each strip 1px into the next so no sub-pixel seam of the dark
        // stage shows where two columns meet. The image is sized in cqw (stage
        // width), not % of the strip, so the wider strip does not shift its slice.
        strip.style.width = `calc(${100 / N}% + 1px)`;
        strip.style.animationDelay = `${Math.round(k * dur * 0.08)}ms`;
        const im = this.#img(imgs[beat.img ?? 0], "");
        im.style.left = `${(-k * 100) / N}cqw`;
        im.style.width = `100cqw`;
        strip.appendChild(im);
        el.appendChild(strip);
      }
      return el;
    }

    // shutter / fade / cut / curtain
    el.className = `sz-layer sz-${beat.fx}`;
    el.appendChild(this.#img(imgs[beat.img ?? 0], "sz-fill"));
    return el;
  }
}

customElements.define("sizzle-reel", SizzleReelElement);
// Expose for programmatic use (window.SizzleReelElement). Loaded as a plain
// classic <script>, this file also runs from file:// — double-clicking index.html
// works. An ES-module script would not: browsers block module src fetches over
// file:// (opaque origin), so the element would never register.
if (typeof window !== "undefined") window.SizzleReelElement = SizzleReelElement;

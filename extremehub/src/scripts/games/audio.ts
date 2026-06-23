// Shared synth-audio for the mini-cabinet games. No files — all generated.
// Lazy-loaded alongside whichever game the player picks.
const AC = (window.AudioContext || (window as any).webkitAudioContext);
let actx: AudioContext | null = null;
let muted = localStorage.getItem("wv-mute") === "1";

export function setMuted(m: boolean) { muted = m; localStorage.setItem("wv-mute", m ? "1" : "0"); }
export function isMuted() { return muted; }
export function resume() { try { (actx ||= new AC()).resume(); } catch {} }

export function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.05, slide?: number) {
  if (muted) return;
  try {
    const c = (actx ||= new AC()), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  } catch {}
}
export function noise(dur: number, vol = 0.12) {
  if (muted) return;
  try {
    const c = (actx ||= new AC()), n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = c.createBufferSource(); s.buffer = buf; const g = c.createGain(); g.gain.value = vol;
    s.connect(g); g.connect(c.destination); s.start();
  } catch {}
}

// Theme-aware palette pulled live from the CSS tokens.
export function palette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => (cs.getPropertyValue(n).trim() || f);
  return {
    cyan: v("--cyan", "#41ead4"),
    violet: v("--violet", "#8b5cf6"),
    magenta: v("--magenta", "#ff3ec8"),
    amber: "#ffc24e",
    text: v("--text", "#e9edf9"),
    muted: "#8d95ad",
    border: "#1d2235",
    bg: "#06070c",
  };
}

// Common lifecycle helper: RAF loop that auto-pauses off-screen / tab-hidden.
export function makeLoop(canvas: HTMLElement, frame: () => void) {
  let raf = 0, running = false;
  const tick = () => { if (!running) return; frame(); raf = requestAnimationFrame(tick); };
  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  const io = new IntersectionObserver((e) => (e[0].isIntersecting ? start() : stop()), { threshold: 0.05 });
  io.observe(canvas);
  const vis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", vis);
  start();
  return { stop, start, destroy: () => { stop(); io.disconnect(); document.removeEventListener("visibilitychange", vis); } };
}

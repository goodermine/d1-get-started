import { tone, noise, resume, palette, makeLoop } from "./audio";

export function createGame(canvas: HTMLCanvasElement) {
  const W = 640, H = 420, G = 20;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const cols = W / G, rows = H / G;
  const LETTERS = "EXTREME".split("");

  let snake: { x: number; y: number }[] = [];
  let dir = { x: 1, y: 0 }, next = { x: 1, y: 0 };
  let food = { x: 0, y: 0, ch: "E" }, score = 0, hi = Number(localStorage.getItem("snake-hi") || 0);
  let dead = false, acc = 0, last = performance.now();
  const stepMs = () => Math.max(70, 130 - snake.length * 1.5);

  function place() {
    let p; do { p = { x: (Math.random() * cols) | 0, y: (Math.random() * rows) | 0 }; }
    while (snake.some((s) => s.x === p.x && s.y === p.y));
    food = { ...p, ch: LETTERS[(Math.random() * LETTERS.length) | 0] };
  }
  function reset() { snake = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }]; dir = { x: 1, y: 0 }; next = dir; score = 0; dead = false; place(); }

  function step() {
    dir = next;
    const head = { x: (snake[0].x + dir.x + cols) % cols, y: (snake[0].y + dir.y + rows) % rows };
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      dead = true; if (score > hi) { hi = score; localStorage.setItem("snake-hi", String(hi)); }
      noise(0.35, 0.13); tone(200, 0.4, "sawtooth", 0.1, 60); return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { score += 10; tone(660, 0.07, "square", 0.05, 1100); place(); }
    else snake.pop();
  }

  function frame() {
    const now = performance.now(); acc += now - last; last = now;
    if (!dead) while (acc >= stepMs()) { acc -= stepMs(); step(); }
    const c = palette();
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
    // food letter
    ctx.fillStyle = c.amber; ctx.font = "700 18px 'Space Grotesk Variable', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(food.ch, food.x * G + G / 2, food.y * G + G / 2);
    // snake
    for (let i = 0; i < snake.length; i++) {
      ctx.fillStyle = i === 0 ? c.cyan : i % 2 ? c.violet : c.magenta;
      ctx.fillRect(snake[i].x * G + 1, snake[i].y * G + 1, G - 2, G - 2);
    }
    // hud
    ctx.fillStyle = c.muted; ctx.font = "600 13px 'Space Grotesk Variable', monospace"; ctx.textAlign = "left";
    ctx.fillText(`SCORE ${score}   HI ${hi}`, 10, 16);
    if (dead) {
      ctx.fillStyle = "rgba(6,7,12,0.8)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = c.magenta; ctx.font = "700 34px 'Space Grotesk Variable', monospace"; ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 14);
      ctx.fillStyle = c.text; ctx.font = "600 16px 'Space Grotesk Variable', monospace";
      ctx.fillText("SPACE / tap to retry", W / 2, H / 2 + 18);
    }
  }

  function setDir(x: number, y: number) { if (x !== -dir.x || y !== -dir.y) next = { x, y }; }
  function onKey(e: KeyboardEvent) {
    const k = e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(k)) e.preventDefault();
    if (k === "ArrowUp" || k === "w") setDir(0, -1);
    else if (k === "ArrowDown" || k === "s") setDir(0, 1);
    else if (k === "ArrowLeft" || k === "a") setDir(-1, 0);
    else if (k === "ArrowRight" || k === "d") setDir(1, 0);
    else if (k === " " && dead) { resume(); reset(); }
  }
  let tx = 0, ty = 0;
  function ts(e: TouchEvent) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }
  function te(e: TouchEvent) {
    if (dead) { resume(); reset(); return; }
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
  }

  addEventListener("keydown", onKey);
  canvas.addEventListener("touchstart", ts, { passive: true });
  canvas.addEventListener("touchend", te, { passive: true });
  resume(); reset();
  const loop = makeLoop(canvas, frame);

  return {
    destroy() {
      loop.destroy();
      removeEventListener("keydown", onKey);
      canvas.removeEventListener("touchstart", ts);
      canvas.removeEventListener("touchend", te);
    },
  };
}

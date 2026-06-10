import { tone, noise, resume, palette, makeLoop } from "./audio";

export function createGame(canvas: HTMLCanvasElement) {
  const W = 640, H = 420;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const WORDS = ["WONDER", "EXTREME", "FORGED", "SHIPPED"];

  type Brick = { x: number; y: number; w: number; h: number; ch: string; col: string; alive: boolean };
  let bricks: Brick[] = [];
  let paddle = W / 2, pw = 96;
  let ball = { x: W / 2, y: H - 60, vx: 4, vy: -4, r: 7 };
  let score = 0, lives = 3, level = 0, state: "play" | "over" | "win" = "play";

  function build() {
    bricks = [];
    const word = WORDS[level % WORDS.length];
    const rows = 3, cols = word.length;
    const bw = (W - 60) / cols, bh = 26, ox = 30, oy = 44;
    const C = palette();
    const colors = [C.cyan, C.violet, C.magenta];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        bricks.push({ x: ox + c * bw, y: oy + r * (bh + 8), w: bw - 6, h: bh, ch: word[c], col: colors[r % 3], alive: true });
  }
  function launch() { ball = { x: W / 2, y: H - 60, vx: (Math.random() < 0.5 ? -1 : 1) * (3.4 + level * 0.4), vy: -(4 + level * 0.3), r: 7 }; }
  function reset() { score = 0; lives = 3; level = 0; state = "play"; build(); launch(); }
  function nextLevel() { level++; build(); launch(); tone(523, 0.12, "triangle", 0.07); setTimeout(() => tone(784, 0.16, "triangle", 0.07), 110); }

  function frame() {
    const C = palette();
    if (state === "play") {
      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.x < ball.r || ball.x > W - ball.r) { ball.vx *= -1; tone(330, 0.04, "square", 0.03); }
      if (ball.y < ball.r) { ball.vy *= -1; tone(330, 0.04, "square", 0.03); }
      // paddle
      const py = H - 24;
      if (ball.y > py - ball.r && ball.y < py + 8 && Math.abs(ball.x - paddle) < pw / 2 + ball.r && ball.vy > 0) {
        ball.vy = -Math.abs(ball.vy);
        ball.vx += (ball.x - paddle) / (pw / 2) * 2.2;
        ball.vx = Math.max(-7, Math.min(7, ball.vx));
        tone(523, 0.05, "square", 0.04);
      }
      // bottom
      if (ball.y > H + 10) {
        lives--; tone(180, 0.3, "sawtooth", 0.1, 70);
        if (lives <= 0) { state = "over"; noise(0.35, 0.13); } else launch();
      }
      // bricks
      for (const b of bricks) {
        if (!b.alive) continue;
        if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
          b.alive = false; ball.vy *= -1; score += 10; tone(660, 0.05, "square", 0.05, 990); break;
        }
      }
      if (!bricks.some((b) => b.alive)) nextLevel();
    }

    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.font = "700 16px 'Space Grotesk Variable', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.col; ctx.globalAlpha = 0.22; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.globalAlpha = 1; ctx.strokeStyle = b.col; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.col; ctx.fillText(b.ch, b.x + b.w / 2, b.y + b.h / 2);
    }
    // paddle + ball
    ctx.fillStyle = C.cyan; ctx.fillRect(paddle - pw / 2, H - 24, pw, 9);
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 6.283); ctx.fillStyle = C.text; ctx.fill();
    // hud
    ctx.fillStyle = C.muted; ctx.font = "600 13px 'Space Grotesk Variable', monospace"; ctx.textAlign = "left";
    ctx.fillText(`SCORE ${score}   LIVES ${Math.max(0, lives)}   LV ${level + 1}`, 10, 18);

    if (state === "over") {
      ctx.fillStyle = "rgba(6,7,12,0.8)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = C.magenta; ctx.textAlign = "center"; ctx.font = "700 34px 'Space Grotesk Variable', monospace";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 14);
      ctx.fillStyle = C.text; ctx.font = "600 16px 'Space Grotesk Variable', monospace";
      ctx.fillText("SPACE / tap to retry", W / 2, H / 2 + 18);
    }
  }

  function move(clientX: number) {
    const r = canvas.getBoundingClientRect();
    paddle = Math.max(pw / 2, Math.min(W - pw / 2, ((clientX - r.left) / r.width) * W));
  }
  function onMove(e: PointerEvent) { move(e.clientX); }
  function onKey(e: KeyboardEvent) {
    if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if (e.key === "ArrowLeft") paddle = Math.max(pw / 2, paddle - 28);
    else if (e.key === "ArrowRight") paddle = Math.min(W - pw / 2, paddle + 28);
    else if (e.key === " " && state !== "play") { resume(); reset(); }
  }
  function onTouch(e: TouchEvent) { if (state !== "play") { resume(); reset(); return; } move(e.touches[0].clientX); }

  canvas.addEventListener("pointermove", onMove);
  addEventListener("keydown", onKey);
  canvas.addEventListener("touchmove", onTouch, { passive: true });
  canvas.addEventListener("touchstart", onTouch, { passive: true });
  resume(); reset();
  const loop = makeLoop(canvas, frame);

  return {
    destroy() {
      loop.destroy();
      canvas.removeEventListener("pointermove", onMove);
      removeEventListener("keydown", onKey);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchstart", onTouch);
    },
  };
}

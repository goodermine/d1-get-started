import { tone, noise, resume, palette, makeLoop } from "./audio";

export function createGame(canvas: HTMLCanvasElement) {
  const W = 640, H = 420, PH = 78, PW = 11, WIN = 7;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  let py = H / 2, ay = H / 2;
  let ball = { x: W / 2, y: H / 2, vx: 5, vy: 2.5 };
  let ps = 0, as = 0, state: "play" | "over" = "play", winner = "";
  let up = false, down = false;

  function serve(dirToPlayer: boolean) {
    ball = { x: W / 2, y: H / 2, vx: (dirToPlayer ? -1 : 1) * 5, vy: (Math.random() * 2 - 1) * 3 };
  }
  function reset() { ps = 0; as = 0; state = "play"; py = ay = H / 2; serve(Math.random() < 0.5); }

  function frame() {
    const C = palette();
    if (state === "play") {
      if (up) py -= 6; if (down) py += 6;
      py = Math.max(PH / 2, Math.min(H - PH / 2, py));
      // AI follows ball with a little lag
      const target = ball.vx > 0 ? ball.y : H / 2;
      ay += Math.max(-4.6, Math.min(4.6, target - ay));
      ay = Math.max(PH / 2, Math.min(H - PH / 2, ay));

      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.y < 6 || ball.y > H - 6) { ball.vy *= -1; tone(300, 0.04, "square", 0.03); }
      // player paddle (left)
      if (ball.x < 24 + PW && ball.x > 18 && Math.abs(ball.y - py) < PH / 2 + 6 && ball.vx < 0) {
        ball.vx = Math.abs(ball.vx) * 1.05; ball.vy += (ball.y - py) / (PH / 2) * 2.5; tone(523, 0.05, "square", 0.04);
      }
      // ai paddle (right)
      if (ball.x > W - 24 - PW && ball.x < W - 18 && Math.abs(ball.y - ay) < PH / 2 + 6 && ball.vx > 0) {
        ball.vx = -Math.abs(ball.vx) * 1.05; ball.vy += (ball.y - ay) / (PH / 2) * 2.5; tone(440, 0.05, "square", 0.04);
      }
      if (ball.x < 0) { as++; tone(180, 0.2, "sawtooth", 0.08, 80); endCheck(); serve(false); }
      else if (ball.x > W) { ps++; tone(880, 0.12, "square", 0.06, 1320); endCheck(); serve(true); }
    }

    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    // net
    ctx.strokeStyle = C.border; ctx.setLineDash([8, 12]); ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    // paddles
    ctx.fillStyle = C.cyan; ctx.fillRect(18, py - PH / 2, PW, PH);
    ctx.fillStyle = C.magenta; ctx.fillRect(W - 18 - PW, ay - PH / 2, PW, PH);
    // ball
    ctx.fillStyle = C.text; ctx.fillRect(ball.x - 5, ball.y - 5, 10, 10);
    // score
    ctx.fillStyle = C.muted; ctx.font = "700 32px 'Space Grotesk Variable', monospace"; ctx.textAlign = "center";
    ctx.fillText(String(ps), W / 2 - 50, 44); ctx.fillText(String(as), W / 2 + 50, 44);
    ctx.font = "600 12px 'Space Grotesk Variable', monospace"; ctx.fillText("YOU", W / 2 - 50, 62); ctx.fillText("CPU", W / 2 + 50, 62);

    if (state === "over") {
      ctx.fillStyle = "rgba(6,7,12,0.82)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = winner === "YOU" ? C.cyan : C.magenta; ctx.font = "700 32px 'Space Grotesk Variable', monospace";
      ctx.fillText(winner === "YOU" ? "YOU WIN" : "CPU WINS", W / 2, H / 2 - 12);
      ctx.fillStyle = C.text; ctx.font = "600 16px 'Space Grotesk Variable', monospace";
      ctx.fillText("SPACE / tap to play again", W / 2, H / 2 + 18);
    }
  }
  function endCheck() { if (ps >= WIN || as >= WIN) { state = "over"; winner = ps > as ? "YOU" : "CPU"; noise(0.3, 0.1); } }

  function onKey(e: KeyboardEvent) {
    if (["ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
    if (e.key === "ArrowUp" || e.key === "w") up = e.type === "keydown";
    if (e.key === "ArrowDown" || e.key === "s") down = e.type === "keydown";
    if (e.key === " " && e.type === "keydown" && state === "over") { resume(); reset(); }
  }
  function onPointer(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    py = Math.max(PH / 2, Math.min(H - PH / 2, ((e.clientY - r.top) / r.height) * H));
  }
  function onTouch(e: TouchEvent) {
    if (state === "over") { resume(); reset(); return; }
    const r = canvas.getBoundingClientRect();
    py = Math.max(PH / 2, Math.min(H - PH / 2, ((e.touches[0].clientY - r.top) / r.height) * H));
  }

  addEventListener("keydown", onKey); addEventListener("keyup", onKey);
  canvas.addEventListener("pointermove", onPointer);
  canvas.addEventListener("touchmove", onTouch, { passive: true });
  canvas.addEventListener("touchstart", onTouch, { passive: true });
  resume(); reset();
  const loop = makeLoop(canvas, frame);

  return {
    destroy() {
      loop.destroy();
      removeEventListener("keydown", onKey); removeEventListener("keyup", onKey);
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchstart", onTouch);
    },
  };
}

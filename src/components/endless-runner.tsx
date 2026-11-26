import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  GROUND,
  KINDS,
  PLAYER_X,
  RULE,
  WORLD_H,
  WORLD_W,
  beginRun,
  createGame,
  loadBest,
  snapshot,
  tick,
  type Cause,
  type Game,
  type Input,
  type Kind,
  type Mode,
} from "@/game/engine";
import { Sfx } from "@/game/audio";

// Reference frame is 768×432.
// Title block ≈ x 0.11–0.89, y 0.03–0.43.
// Jumper ≈ x 0.36–0.64, y 0.40–0.74.
// Fallen log ≈ x 0.16–0.84, y 0.66–0.90.

type Sprite = {
  img: HTMLImageElement;
  cx: number;
  cy: number;
  cw: number;
  ch: number;
};

function measure(img: HTMLImageElement): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { img, cx: 0, cy: 0, cw: img.width, ch: img.height };
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  let minX = img.width;
  let minY = img.height;
  let maxX = 0;
  let maxY = 0;
  const step = 2;
  for (let y = 0; y < img.height; y += step) {
    for (let x = 0; x < img.width; x += step) {
      if ((data[(y * img.width + x) * 4 + 3] ?? 0) > 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return { img, cx: 0, cy: 0, cw: img.width, ch: img.height };
  return { img, cx: minX, cy: minY, cw: maxX - minX, ch: maxY - minY };
}

function loadSprite(src: string) {
  return new Promise<Sprite>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(measure(img));
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function drawRotated(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  centerX: number,
  centerY: number,
  scale: number,
  rotation: number,
) {
  const dw = sprite.cw * scale;
  const dh = sprite.ch * scale;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.drawImage(sprite.img, sprite.cx, sprite.cy, sprite.cw, sprite.ch, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  centerX: number,
  feetY: number,
  scale: number,
  squashX = 1,
  squashY = 1,
) {
  const dw = sprite.cw * scale * squashX;
  const dh = sprite.ch * scale * squashY;
  ctx.drawImage(
    sprite.img,
    sprite.cx,
    sprite.cy,
    sprite.cw,
    sprite.ch,
    centerX - dw / 2,
    feetY - dh,
    dw,
    dh,
  );
}

interface Art {
  palace: HTMLImageElement;
  hero: Sprite;
  run: Sprite[];
  jump: Sprite[];
  slide: Sprite[];
  kick: Sprite;
  cypress: Sprite;
  props: Record<Kind, Sprite>;
  runScale: number;
  jumpScale: number;
  slideScale: number;
  ground: HTMLImageElement;
}

export function EndlessRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("attract");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [combo, setCombo] = useState(0);
  const [cause, setCause] = useState<Cause | null>(null);
  const [isBest, setIsBest] = useState(false);
  const [hintOn, setHintOn] = useState(false);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = createGame(0);
    const input: Input = { jump: false, jumpHeld: false, slide: false };
    const sfx = new Sfx();
    let art: Art | null = null;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;

    const hooks = {
      jump: () => sfx.jump(),
      land: () => sfx.land(),
      slide: () => sfx.slide(),
      clear: (close: boolean) => sfx.clear(close),
      die: (next: Cause) => sfx.die(next === "recording"),
    };

    const api = {
      get state() {
        return snapshot(game);
      },
      start() {
        sfx.unlock();
        beginRun(game);
      },
      jump() {
        input.jump = true;
        input.jumpHeld = true;
      },
      releaseJump() {
        input.jumpHeld = false;
      },
      slide() {
        input.slide = true;
      },
    };
    window.__runner = api;

    const stored = loadBest();
    game.best = stored;
    game.bestAtStart = stored;
    setBest(stored);

    const onResize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(WORLD_W * dpr);
      canvas.height = Math.floor(WORLD_H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    onResize();
    window.addEventListener("resize", onResize);

    const paint = () => {
      ctx.clearRect(0, 0, WORLD_W, WORLD_H);
      ctx.save();
      if (game.shake > 0 && !reduceMotion) {
        const mag = game.shake * 8;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }
      if (!art) {
        ctx.fillStyle = "#c9844a";
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
        ctx.restore();
        return;
      }

      const scene = art;
      const travel = game.mode === "attract" ? game.t * 120 : game.distance;
      const palace = scene.palace;
      const zoom = 1.08;
      const viewW = palace.width / zoom;
      const maxPan = Math.max(0, palace.width - viewW);
      const pan = (Math.sin(travel / 980) * 0.5 + 0.5) * maxPan;
      ctx.drawImage(palace, pan, 0, viewW, palace.height, 0, 0, WORLD_W, WORLD_H);

      const paintTrees = (dist: number, height: number, feet: number, alpha: number, gap: number) => {
        const scale = height / scene.cypress.ch;
        const off = ((dist % gap) + gap) % gap;
        ctx.save();
        ctx.globalAlpha = alpha;
        for (let x = -gap; x < WORLD_W + gap; x += gap) {
          drawSprite(ctx, scene.cypress, x - off + gap * 0.15, feet, scale);
        }
        ctx.restore();
      };
      paintTrees(travel * 0.34, 190, 300, 0.45, 560);
      paintTrees(travel * 0.72, 280, 372, 0.95, 340);

      const tileW = 280;
      const gscroll = ((travel % tileW) + tileW) % tileW;
      const lip = scene.ground;
      for (let x = -tileW; x < WORLD_W + tileW; x += tileW) {
        ctx.drawImage(lip, 0, 30, lip.width, 90, x - gscroll, 404, tileW, 28);
      }

      ctx.save();
      const wash = ctx.createLinearGradient(0, 0, 0, WORLD_H);
      wash.addColorStop(0, "rgba(255, 206, 120, 0.16)");
      wash.addColorStop(0.42, "rgba(255, 170, 70, 0.02)");
      wash.addColorStop(1, "rgba(48, 22, 8, 0.16)");
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255, 214, 150, 0.13)";
      ctx.beginPath();
      ctx.moveTo(70, 0);
      ctx.lineTo(210, 0);
      ctx.lineTo(390, WORLD_H);
      ctx.lineTo(150, WORLD_H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const paintBoy = (atX: number, feetY: number) => {
        const poseScale =
          game.pose === "slide"
            ? scene.slideScale
            : game.pose === "jump" || game.pose === "spin"
              ? scene.jumpScale
              : scene.runScale;
        const planted = game.grounded && feetY > GROUND - 18;
        const lift = Math.max(0, GROUND - feetY);
        const shadowY = planted ? feetY + 2 : GROUND + 3;
        ctx.save();
        ctx.fillStyle = `rgba(48, 24, 8, ${planted ? 0.34 : 0.22 * Math.max(0.35, 1 - lift / 260)})`;
        ctx.beginPath();
        const shadowW = (game.pose === "slide" ? 50 : 30) * (planted ? 1 : 1 - Math.min(0.65, lift / 340));
        ctx.ellipse(atX, shadowY, shadowW, planted ? 6 : 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        let squashX = 1;
        let squashY = 1;
        if (game.squash > 0) {
          squashX = 1.14;
          squashY = 0.86;
        } else if (game.landT > 0) {
          const k = game.landT / 0.12;
          squashX = 1 + 0.16 * k;
          squashY = 1 - 0.18 * k;
        }

        if (game.pose === "spin" && game.mode === "play") {
          const t = Math.min(1, game.spin);
          const ease = t * t * (3 - 2 * t);
          const ang = ease * Math.PI * 2;
          const fade = t > 0.76 ? (t - 0.76) / 0.24 : 0;
          const cy = feetY - 74;
          const kScale = 196 / scene.kick.cw;
          ctx.save();
          ctx.strokeStyle = `rgba(255, 220, 150, ${0.55 * (1 - fade)})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(atX, cy, 46, ang - 1.4, ang + 0.2);
          ctx.stroke();
          ctx.restore();
          for (let i = 3; i >= 1; i--) {
            ctx.save();
            ctx.globalAlpha = 0.14 * (1 - fade);
            drawRotated(ctx, scene.kick, atX, cy, kScale, ang - i * 0.38);
            ctx.restore();
          }
          ctx.save();
          ctx.globalAlpha = 1 - fade;
          drawRotated(ctx, scene.kick, atX, cy, kScale, ang);
          ctx.restore();
          if (fade > 0) {
            const fall = scene.jump[3] ?? scene.jump[0]!;
            ctx.save();
            ctx.globalAlpha = fade;
            drawSprite(ctx, fall, atX, feetY + 2, poseScale);
            ctx.restore();
          }
          return;
        }

        const n = scene.run.length;
        const span = ((game.anim * n) % n + n) % n;
        const i0 = Math.floor(span) % n;
        const frac = span - Math.floor(span);
        const i1 = (i0 + 1) % n;
        let frame: Sprite = scene.run[i0] ?? scene.run[0]!;
        const next: Sprite = scene.run[i1] ?? frame;
        let drawFeet = feetY;
        let lean = 0;
        let blend = 0;
        if (game.pose === "jump" && game.mode !== "attract") {
          if (game.squash > 0) frame = scene.jump[0] ?? frame;
          else if (game.vy < -80) frame = scene.jump[1] ?? frame;
          else if (game.vy < 120) frame = scene.jump[2] ?? frame;
          else frame = scene.jump[3] ?? frame;
          if (game.squash <= 0 && game.landT <= 0) {
            const stretch = Math.min(0.16, Math.abs(game.vy) / 5200);
            squashY = 1 + stretch;
            squashX = 1 / squashY;
          }
        } else if (game.pose === "slide") {
          const p = 1 - game.slideLeft / 0.5;
          const idx = p < 0.22 ? 0 : p < 0.55 ? 1 : p < 0.8 ? 2 : 3;
          frame = scene.slide[idx] ?? frame;
        } else {
          lean = game.mode === "attract" ? -0.045 : -0.05 - Math.min(0.07, game.speed / 8000);
          blend = frac;
        }

        ctx.save();
        if (game.mode === "dead") {
          ctx.translate(atX, GROUND);
          ctx.rotate(-0.55);
          ctx.translate(-atX, -GROUND);
        } else if (lean !== 0) {
          ctx.translate(atX, drawFeet - 46);
          ctx.rotate(lean);
          ctx.translate(-atX, -(drawFeet - 46));
        }
        drawSprite(ctx, frame, atX, drawFeet + 2, poseScale, squashX, squashY);
        if (blend > 0.04) {
          ctx.save();
          ctx.globalAlpha = blend * 0.34;
          drawSprite(ctx, next, atX, drawFeet + 2, poseScale, squashX, squashY);
          ctx.restore();
        }
        ctx.restore();
      };

      if (game.mode === "attract") {
        paintBoy(470, 352);
      } else {
        const ordered = [...game.obstacles].sort((a, b) => b.x - a.x);
        for (const ob of ordered) {
          if (ob.kind === "arch") continue;
          const sprite = scene.props[ob.kind];
          drawSprite(ctx, sprite, ob.x, GROUND + 4, KINDS[ob.kind].dh / sprite.ch);
        }
        paintBoy(PLAYER_X, game.feetY);
        for (const ob of ordered) {
          if (ob.kind !== "arch") continue;
          drawSprite(ctx, scene.props.arch, ob.x, GROUND + 2, KINDS.arch.dh / scene.props.arch.ch);
        }
      }

      for (const p of game.particles) {
        const alpha = Math.max(0, p.life / p.max);
        ctx.globalAlpha = alpha;
        if (p.kind === "streak") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.r;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 0.045, p.y + p.vy * 0.02);
          ctx.stroke();
        } else if (p.kind === "ring") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.r, Math.max(3, p.r * 0.32), 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      for (const text of game.texts) {
        ctx.globalAlpha = Math.max(0, text.life / text.max);
        ctx.font = "700 22px 'Lilita One', system-ui";
        ctx.textAlign = "left";
        ctx.fillStyle = "#f6e6c4";
        ctx.strokeStyle = "#6b3e1c";
        ctx.lineWidth = 4;
        ctx.strokeText(text.text, text.x, text.y);
        ctx.fillText(text.text, text.x, text.y);
      }
      ctx.globalAlpha = 1;

      if (game.mode === "play" && game.pose !== "slide" && !reduceMotion) {
        const rush = Math.min(1, game.speed / 520);
        const air = game.pose === "jump" || game.pose === "spin" ? 1 : 0;
        ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const y = game.feetY - 28 - i * 16 - air * game.vy * 0.01;
          const span = 70 + rush * 40;
          const x = PLAYER_X - 24 - ((game.distance * (1.1 + rush) + i * 37) % span);
          const len = 10 + rush * 26 + air * 8;
          ctx.globalAlpha = (0.08 + rush * 0.16) * (1 - i / 9);
          ctx.strokeStyle = i % 2 === 0 ? "#fff4dc" : "#f0d7a4";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - len, y + air * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

    const loop = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      let guard = 0;
      while (acc >= 1 / 60 && guard++ < 4) {
        tick(game, input, 1 / 60, hooks);
        input.jump = false;
        input.slide = false;
        acc -= 1 / 60;
      }
      paint();
      if (game.mode !== modeRef.current) {
        modeRef.current = game.mode;
        setMode(game.mode);
        setCause(game.cause);
        setIsBest(game.isBest);
      }
      if (game.mode === "play" || game.mode === "dead") {
        setScore(game.score);
        setBest(game.best);
        setCombo(game.combo);
        setHintOn(game.hint > 0.35);
      } else {
        setHintOn(false);
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      sfx.unlock();
      if (game.mode === "play") return;
      beginRun(game);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const jumpKey = event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW";
      const slideKey = event.code === "ArrowDown" || event.code === "KeyS";
      if (!jumpKey && !slideKey) return;
      event.preventDefault();
      sfx.unlock();
      if (game.mode !== "play") {
        if (jumpKey || slideKey) start();
        return;
      }
      if (jumpKey) {
        input.jump = true;
        input.jumpHeld = true;
      }
      if (slideKey) input.slide = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
        input.jumpHeld = false;
      }
    };

    let swipeY = 0;
    let swipeAt = 0;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target !== canvas) return;
      swipeY = event.clientY;
      swipeAt = performance.now();
      sfx.unlock();
      if (game.mode !== "play") {
        start();
        return;
      }
      input.jump = true;
      input.jumpHeld = true;
    };
    const onPointerUp = (event: PointerEvent) => {
      input.jumpHeld = false;
      if (game.mode !== "play") return;
      const dy = event.clientY - swipeY;
      if (dy > 36 && performance.now() - swipeAt < 420) {
        input.jump = false;
        input.jumpHeld = false;
        if (
          (game.pose === "jump" || game.pose === "spin") &&
          game.ride == null &&
          game.feetY > GROUND - 22
        ) {
          game.vy = 0;
          game.feetY = GROUND;
          game.pose = "run";
          game.grounded = true;
          game.spin = 0;
          game.airJumps = 1;
        }
        input.slide = true;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    void Promise.all([
      loadImage("/runner/palace.jpg"),
      loadSprite("/runner/hero.png"),
      Promise.all(Array.from({ length: 25 }, (_, i) => loadSprite(`/runner/run-${i + 1}.png?v=25`))),
      Promise.all([1, 2, 3, 4].map((i) => loadSprite(`/runner/jump-${i}.png`))),
      Promise.all([1, 2, 3, 4].map((i) => loadSprite(`/runner/slide-${i}.png`))),
      loadSprite("/runner/kick.png"),
      loadSprite("/runner/cypress.png"),
      loadSprite("/runner/log.png"),
      loadSprite("/runner/rock.png"),
      loadSprite("/runner/arch.png"),
      loadSprite("/runner/camera.png"),
      loadImage("/runner/ground.jpg"),
    ])
      .then(([palace, hero, run, jump, slide, kick, cypress, log, rock, arch, camera, ground]) => {
        if (!alive) return;
        const runScale = 214 / (run[0]?.ch || 214);
        const jumpH = Math.max(...jump.map((frame) => frame.ch));
        const slideH = Math.max(...slide.map((frame) => frame.ch));
        art = {
          palace,
          hero,
          run,
          jump,
          slide,
          kick,
          cypress,
          props: { log, rock, arch, recording: camera },
          runScale,
          jumpScale: 248 / (jumpH || 248),
          slideScale: 196 / (slideH || 196),
          ground,
        };
      })
      .catch((error: unknown) => {
        console.error(error);
      });

    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      delete window.__runner;
    };
  }, []);

  const pressJump = (held: boolean) => {
    const api = window.__runner;
    if (!api) return;
    if (held) api.jump();
    else api.releaseJump();
  };

  return (
    <main className="page">
      <div className="page-wash" aria-hidden="true" />
      <div className="stage">
        <canvas ref={canvasRef} width={WORLD_W} height={WORLD_H} aria-label="Endless runner through Persepolis" />
        {mode === "attract" && (
          <>
            <h1 className="wordmark">
              <span>ENDLESS</span>
              <span>RUNNER</span>
            </h1>
            <div className="attract-controls">
              <p className="rule">{RULE}</p>
              <button type="button" className="stone-btn" onClick={() => window.__runner?.start()}>
                Run
              </button>
            </div>
          </>
        )}
        {mode === "play" && (
          <>
            <div className="hud">
              <div>
                <div className="hud-label">Score</div>
                <div className="hud-num">{score}</div>
              </div>
              <div className="hud-side">
                <div className="hud-label">Best</div>
                <div className="hud-num">{best}</div>
              </div>
            </div>
            {hintOn && <p className="hint">{RULE}</p>}
            {combo > 1 && !hintOn && <p className="combo">Combo ×{combo}</p>}
          </>
        )}
        {mode === "dead" && (
          <div className="overlay">
            <div className="card">
              <h2>{cause === "recording" ? RULE : "Wiped out"}</h2>
              <p className="sub">
                {cause === "recording" ? "You checked it out." : RULE}
              </p>
              {isBest && <p className="new-best">New best</p>}
              <div className="stats">
                <div>
                  <b>{score}</b>
                  <span>Score</span>
                </div>
                <div>
                  <b>{best}</b>
                  <span>Best</span>
                </div>
              </div>
              <button type="button" className="stone-btn" onClick={() => window.__runner?.start()}>
                Restart
              </button>
              <p className="keys">پرش، پرش دوباره می‌چرخد · پایین سر خوردن</p>
            </div>
          </div>
        )}
      </div>
      <div className="dock">
        {mode === "attract" && (
          <>
            <p className="dock-rule">{RULE}</p>
            <button type="button" className="dock-btn" onClick={() => window.__runner?.start()}>
              Run
            </button>
          </>
        )}
        {mode === "play" && (
          <div className="dock-row">
            <button
              type="button"
              className="dock-btn"
              onPointerDown={(event) => {
                event.preventDefault();
                pressJump(true);
              }}
              onPointerUp={() => pressJump(false)}
              onPointerLeave={() => pressJump(false)}
            >
              <ArrowUp aria-hidden="true" />
              Jump
            </button>
            <button
              type="button"
              className="dock-btn"
              onPointerDown={(event) => {
                event.preventDefault();
                window.__runner?.slide();
              }}
            >
              <ArrowDown aria-hidden="true" />
              Slide
            </button>
          </div>
        )}
        {mode === "dead" && (
          <>
            <p className="dock-rule">{cause === "recording" ? RULE : "Wiped out"}</p>
            <button type="button" className="dock-btn" onClick={() => window.__runner?.start()}>
              Restart
            </button>
          </>
        )}
        {mode === "play" && <p className="keys">پرش دوم یه دور می‌چرخه · کشیدن به پایین = سر خوردن</p>}
      </div>
    </main>
  );
}

declare global {
  interface Window {
    __runner?: {
      readonly state: ReturnType<typeof snapshot>;
      start: () => void;
      jump: () => void;
      releaseJump: () => void;
      slide: () => void;
    };
  }
}

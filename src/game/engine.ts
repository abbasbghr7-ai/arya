export const WORLD_W = 768;
export const WORLD_H = 432;
export const GROUND = 396;
export const PLAYER_X = 196;

export const RULE = "Never check out the recording";

export type Mode = "attract" | "play" | "dead";
export type Kind = "log" | "rock" | "arch" | "recording";
export type Cause = "obstacle" | "recording";
export type Pose = "run" | "jump" | "slide" | "spin";

export interface KindSpec {
  dh: number;
  hw: number;
  hh: number;
  lift: number;
}

export const KINDS: Record<Kind, KindSpec> = {
  log: { dh: 50, hw: 168, hh: 38, lift: 0 },
  rock: { dh: 78, hw: 60, hh: 64, lift: 0 },
  recording: { dh: 118, hw: 38, hh: 96, lift: 0 },
  arch: { dh: 136, hw: 156, hh: 78, lift: 58 },
};

const JUMP_V = -760;
const AIR_JUMP_V = -820;
const GRAVITY = 2550;
const MAX_FALL = 1200;
const SLIDE_TIME = 0.5;
const BASE_SPEED = 286;
const MAX_SPEED = 640;
const SPIN_TIME = 0.48;

export interface Obstacle {
  id: number;
  kind: Kind;
  x: number;
  passed: boolean;
  closest: number;
  scored: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  color: string;
  kind?: "dust" | "streak" | "ring";
}

export interface FloatText {
  text: string;
  x: number;
  y: number;
  life: number;
  max: number;
}

export interface Game {
  mode: Mode;
  t: number;
  distance: number;
  score: number;
  bonus: number;
  best: number;
  combo: number;
  comboLeft: number;
  speed: number;
  cause: Cause | null;
  isBest: boolean;
  bestAtStart: number;
  shake: number;
  hitStop: number;
  feetY: number;
  vy: number;
  pose: Pose;
  slideLeft: number;
  buffer: number;
  grounded: boolean;
  airJumps: number;
  spin: number;
  dustFrame: number;
  ride: number | null;
  nextId: number;
  anim: number;
  landT: number;
  squash: number;
  obstacles: Obstacle[];
  sinceSpawn: number;
  lastKind: Kind | null;
  bag: Kind[];
  texts: FloatText[];
  particles: Particle[];
  hint: number;
  jumpCut: boolean;
  deadT: number;
}

export interface Input {
  jump: boolean;
  jumpHeld: boolean;
  slide: boolean;
}

export interface Hooks {
  jump?: () => void;
  land?: () => void;
  slide?: () => void;
  clear?: (close: boolean) => void;
  die?: (cause: Cause) => void;
}

export interface RunnerSnapshot {
  mode: Mode;
  score: number;
  best: number;
  combo: number;
  speed: number;
  feetY: number;
  pose: Pose;
  cause: Cause | null;
  obstacles: number;
  kinds: Kind[];
  grounded: boolean;
}

const SAVE_KEY = "endless-runner-v1";

export function loadBest(): number {
  if (typeof localStorage === "undefined") return 0;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw) as { version?: number; best?: number };
    if (data.version !== 1 || typeof data.best !== "number" || !Number.isFinite(data.best)) {
      return 0;
    }
    return Math.max(0, Math.floor(data.best));
  } catch {
    return 0;
  }
}

export function saveBest(best: number) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, best: Math.floor(best) }));
  } catch {
    /* ignore quota */
  }
}

export function createGame(best = 0): Game {
  return {
    mode: "attract",
    t: 0,
    distance: 0,
    score: 0,
    bonus: 0,
    best,
    combo: 0,
    comboLeft: 0,
    speed: BASE_SPEED,
    cause: null,
    isBest: false,
    bestAtStart: best,
    shake: 0,
    hitStop: 0,
    feetY: GROUND,
    vy: 0,
    pose: "run",
    slideLeft: 0,
    buffer: 0,
    grounded: true,
    airJumps: 1,
    spin: 0,
    dustFrame: -1,
    ride: null,
    nextId: 1,
    anim: 0,
    landT: 0,
    squash: 0,
    obstacles: [],
    sinceSpawn: 0,
    lastKind: null,
    bag: [],
    texts: [],
    particles: [],
    hint: 0,
    jumpCut: false,
    deadT: 0,
  };
}

export function beginRun(g: Game) {
  const best = g.best;
  const next = createGame(best);
  Object.assign(g, next);
  g.mode = "play";
  g.hint = 2.8;
  g.sinceSpawn = -0.35;
  g.bestAtStart = best;
}

export function snapshot(g: Game): RunnerSnapshot {
  return {
    mode: g.mode,
    score: g.score,
    best: g.best,
    combo: g.combo,
    speed: Math.round(g.speed),
    feetY: Math.round(g.feetY),
    pose: g.pose,
    cause: g.cause,
    obstacles: g.obstacles.length,
    kinds: g.obstacles.map((ob) => ob.kind),
    grounded: g.grounded,
  };
}

function refreshScore(g: Game) {
  g.score = Math.floor(g.distance / 16) + g.bonus;
}

function burst(g: Game, x: number, y: number, n: number, color: string) {
  for (let i = 0; i < n; i++) {
    if (g.particles.length > 90) g.particles.shift();
    g.particles.push({
      x,
      y,
      vx: (Math.random() - 0.35) * 160,
      vy: -40 - Math.random() * 140,
      life: 0.35 + Math.random() * 0.35,
      max: 0.7,
      r: 1.5 + Math.random() * 2.6,
      color,
    });
  }
}

function pickKind(g: Game): Kind {
  if (g.bag.length === 0) {
    const deck: Kind[] = ["log", "rock", "log", "arch", "rock", "recording", "log", "arch", "rock"];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = deck[i]!;
      deck[i] = deck[j]!;
      deck[j] = tmp;
    }
    g.bag = deck;
  }
  let kind = g.bag.pop() ?? "log";
  if (kind === g.lastKind && (kind === "arch" || kind === "recording")) {
    kind = kind === "arch" ? "log" : "rock";
  }
  return kind;
}

function spawnInterval(g: Game) {
  const progress = Math.min(1, g.distance / 9800);
  let gap = 1.08 - progress * 0.4;
  if (g.lastKind === "arch") gap += 0.16;
  if (g.lastKind === "recording") gap += 0.06;
  return Math.max(0.66, gap);
}

export function playerBox(g: Game) {
  if (g.pose === "slide") {
    return { x: PLAYER_X - 34, y: g.feetY - 40, w: 92, h: 38 };
  }
  if (g.pose === "spin") {
    return { x: PLAYER_X - 40, y: g.feetY - 100, w: 86, h: 88 };
  }
  return { x: PLAYER_X - 18, y: g.feetY - 112, w: 46, h: 106 };
}

export function obstacleBox(o: Obstacle) {
  const spec = KINDS[o.kind];
  return {
    x: o.x - spec.hw / 2,
    y: GROUND - spec.lift - spec.hh,
    w: spec.hw,
    h: spec.hh,
  };
}

function rideable(kind: Kind) {
  return kind === "log" || kind === "rock";
}

function platformTop(kind: Kind) {
  return GROUND + 4 - KINDS[kind].dh;
}

function streak(g: Game, x: number, y: number, n: number, color: string) {
  for (let i = 0; i < n; i++) {
    if (g.particles.length > 150) g.particles.shift();
    g.particles.push({
      x,
      y,
      vx: -220 - Math.random() * 460,
      vy: (Math.random() - 0.5) * 90,
      life: 0.16 + Math.random() * 0.18,
      max: 0.34,
      r: 1.4 + Math.random() * 1.6,
      color,
      kind: "streak",
    });
  }
}

function ring(g: Game, x: number, y: number, color: string) {
  if (g.particles.length > 150) g.particles.shift();
  g.particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.32,
    max: 0.32,
    r: 10,
    color,
    kind: "ring",
  });
}

function mount(g: Game, ob: Obstacle, hooks?: Hooks) {
  const top = platformTop(ob.kind);
  g.ride = ob.id;
  g.feetY = top;
  g.vy = 0;
  g.grounded = true;
  g.pose = "run";
  g.airJumps = 1;
  g.spin = 0;
  g.jumpCut = false;
  g.landT = 0.1;
  g.squash = 0.12;
  g.shake = Math.min(1, g.shake + 0.4);
  hooks?.land?.();
  burst(g, PLAYER_X, top, 16, "#f3e6c4");
  streak(g, PLAYER_X, top - 18, 10, "#fff6d4");
  ring(g, PLAYER_X, top, "#ffe3a1");
}

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function verticalGap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  const aBottom = a.y + a.h;
  const bBottom = b.y + b.h;
  if (aBottom <= b.y) return b.y - aBottom;
  if (bBottom <= a.y) return a.y - bBottom;
  return 0;
}

function kill(g: Game, cause: Cause, hooks?: Hooks) {
  g.mode = "dead";
  g.cause = cause;
  g.hitStop = 0.07;
  g.shake = 1;
  g.deadT = 0;
  g.isBest = g.score > g.bestAtStart && g.score > 0;
  if (g.score > g.best) {
    g.best = g.score;
    saveBest(g.best);
  }
  burst(g, PLAYER_X, GROUND - 20, 16, cause === "recording" ? "#e7c56a" : "#c48955");
  hooks?.die?.(cause);
}

function tryJump(g: Game, hooks?: Hooks) {
  if (!g.grounded && g.pose === "slide") return;
  if (g.pose === "slide") {
    g.slideLeft = 0;
    g.pose = "run";
  }
  g.vy = JUMP_V;
  g.pose = "jump";
  g.grounded = false;
  g.ride = null;
  g.airJumps = 1;
  g.spin = 0;
  g.jumpCut = false;
  g.buffer = 0;
  g.squash = 0.09;
  hooks?.jump?.();
  burst(g, PLAYER_X, g.feetY, 8, "#ead7ae");
  streak(g, PLAYER_X - 6, g.feetY - 30, 7, "#fff3cf");
}

function trySpin(g: Game, hooks?: Hooks) {
  if (g.grounded || g.airJumps <= 0 || g.pose === "slide") return;
  g.airJumps = 0;
  g.vy = AIR_JUMP_V;
  g.pose = "spin";
  g.spin = 0.001;
  g.grounded = false;
  g.ride = null;
  g.jumpCut = true;
  g.buffer = 0;
  g.squash = 0.05;
  hooks?.jump?.();
  burst(g, PLAYER_X, g.feetY - 70, 14, "#f3d48a");
}

function trySlide(g: Game, hooks?: Hooks) {
  if (g.mode !== "play") return;
  if (!g.grounded) {
    if (g.vy < 180) g.vy = 220;
    return;
  }
  if (g.ride != null) {
    g.pose = "slide";
    g.slideLeft = SLIDE_TIME * 0.65;
    hooks?.slide?.();
    return;
  }
  if (g.pose === "slide") {
    g.slideLeft = Math.max(g.slideLeft, SLIDE_TIME * 0.72);
    return;
  }
  g.pose = "slide";
  g.slideLeft = SLIDE_TIME;
  g.vy = 0;
  g.feetY = GROUND;
  hooks?.slide?.();
  burst(g, PLAYER_X - 10, GROUND, 6, "#e6c79a");
}

function stepPlay(g: Game, input: Input, dt: number, hooks?: Hooks) {
  if (g.hitStop > 0) {
    g.hitStop = Math.max(0, g.hitStop - dt);
    return;
  }

  g.t += dt;
  g.hint = Math.max(0, g.hint - dt);
  g.landT = Math.max(0, g.landT - dt);
  g.squash = Math.max(0, g.squash - dt);
  g.shake = Math.max(0, g.shake - dt * 1.8);
  g.anim += dt * (g.speed / 188);

  if (input.jump) g.buffer = 0.12;
  g.buffer = Math.max(0, g.buffer - dt);

  if (input.slide) trySlide(g, hooks);

  if (g.buffer > 0 && g.grounded) tryJump(g, hooks);
  else if (g.buffer > 0 && !g.grounded) trySpin(g, hooks);

  if (!input.jumpHeld && g.vy < -180 && !g.jumpCut && g.pose === "jump" && g.airJumps > 0) {
    g.vy *= 0.52;
    g.jumpCut = true;
  }

  if (g.pose === "spin") {
    g.spin += dt / SPIN_TIME;
    if (g.spin >= 1) {
      g.spin = 1;
      g.pose = "jump";
    }
  }

  if (g.pose === "slide") {
    g.slideLeft -= dt;
    if (g.ride == null) {
      g.feetY = GROUND;
      g.vy = 0;
      g.grounded = true;
    }
    if (g.slideLeft <= 0) {
      g.pose = "run";
      g.slideLeft = 0;
    }
  } else if (g.pose === "jump" || g.pose === "spin" || !g.grounded) {
    const prevFeet = g.feetY;
    g.vy = Math.min(MAX_FALL, g.vy + GRAVITY * dt);
    g.feetY += g.vy * dt;
    if (g.vy >= 0 && g.ride == null) {
      for (const ob of g.obstacles) {
        if (!rideable(ob.kind)) continue;
        const top = platformTop(ob.kind);
        const spec = KINDS[ob.kind];
        const left = ob.x - spec.hw / 2 + 14;
        const right = ob.x + spec.hw / 2 - 12;
        if (PLAYER_X < left || PLAYER_X > right) continue;
        const crossed = prevFeet <= top + 16 && g.feetY >= top - 8 && g.feetY <= top + 42;
        if (crossed) {
          mount(g, ob, hooks);
          break;
        }
      }
    }
    if (g.ride == null && g.feetY >= GROUND) {
      g.feetY = GROUND;
      g.vy = 0;
      g.grounded = true;
      g.pose = "run";
      g.airJumps = 1;
      g.spin = 0;
      g.landT = 0.12;
      g.jumpCut = false;
      hooks?.land?.();
      burst(g, PLAYER_X, GROUND, 12, "#e4c48a");
      streak(g, PLAYER_X, GROUND - 8, 6, "#fff0cc");
      ring(g, PLAYER_X, GROUND, "#f6e2b4");
    }
  } else if (g.ride == null) {
    g.feetY = GROUND;
    g.grounded = true;
  }

  g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.distance * 0.034);
  const advance = g.speed * dt;
  g.distance += advance;
  g.sinceSpawn += dt;
  refreshScore(g);

  if (g.comboLeft > 0) {
    g.comboLeft -= dt;
    if (g.comboLeft <= 0) g.combo = 0;
  }

  for (const ob of g.obstacles) ob.x -= advance;

  if (g.ride != null) {
    const ob = g.obstacles.find((item) => item.id === g.ride);
    if (!ob) {
      g.ride = null;
      g.grounded = false;
      g.pose = "jump";
      g.vy = 120;
    } else {
      const spec = KINDS[ob.kind];
      const left = ob.x - spec.hw / 2 + 6;
      const right = ob.x + spec.hw / 2 - 2;
      if (PLAYER_X < left || PLAYER_X > right) {
        g.ride = null;
        g.grounded = false;
        g.pose = "jump";
        g.vy = 70;
        g.feetY = platformTop(ob.kind);
        burst(g, PLAYER_X, g.feetY, 8, "#f4e4c4");
        streak(g, PLAYER_X, g.feetY - 10, 6, "#fff6d8");
      } else {
        g.feetY = platformTop(ob.kind);
        g.vy = 0;
        g.grounded = true;
      }
    }
  }

  const body = playerBox(g);
  for (const ob of g.obstacles) {
    const box = obstacleBox(ob);
    if (overlaps(body, box) || (box.x < body.x + body.w && box.x + box.w > body.x)) {
      const gap = verticalGap(body, box);
      if (gap < ob.closest) ob.closest = gap;
    }
    if (!ob.scored && ob.x + KINDS[ob.kind].hw / 2 < body.x) {
      ob.scored = true;
      ob.passed = true;
      const close = ob.closest < 30;
      if (g.comboLeft > 0) g.combo += close ? 2 : 1;
      else g.combo = 1;
      g.comboLeft = 2.6;
      g.bonus += 10 * g.combo + (close ? 24 : 0);
      refreshScore(g);
      g.texts.push({
        text: close ? `Close ×${g.combo}` : `×${g.combo}`,
        x: PLAYER_X + 36,
        y: g.feetY - 130,
        life: 0.7,
        max: 0.7,
      });
      hooks?.clear?.(close);
    }
    if (g.mode !== "play" || g.ride === ob.id) continue;
    if (!overlaps(body, box)) continue;
    if (ob.kind === "recording" || ob.kind === "arch") {
      kill(g, ob.kind === "recording" ? "recording" : "obstacle", hooks);
      return;
    }
    const top = platformTop(ob.kind);
    const front = box.x + Math.min(26, box.w * 0.4);
    if (body.x < front && g.feetY > top + 12) {
      kill(g, "obstacle", hooks);
      return;
    }
  }
  if (g.ride != null && !g.obstacles.some((ob) => ob.id === g.ride)) g.ride = null;
  g.obstacles = g.obstacles.filter((ob) => ob.x > -220);

  if (g.sinceSpawn >= spawnInterval(g)) {
    const kind = pickKind(g);
    g.obstacles.push({
      id: g.nextId++,
      kind,
      x: WORLD_W + 90,
      passed: false,
      closest: 999,
      scored: false,
    });
    g.lastKind = kind;
    g.sinceSpawn = 0;
  }

  const stepFrame = Math.floor(g.anim * 2);
  if (g.pose === "run" && g.grounded && stepFrame !== g.dustFrame) {
    g.dustFrame = stepFrame;
    burst(g, PLAYER_X - 18, g.feetY - 2, 9, "#e6d2a4");
    streak(g, PLAYER_X - 8, g.feetY - 20, 5, "#fff4d6");
  }

  for (const p of g.particles) {
    p.life -= dt;
    if (p.kind === "ring") p.r += 340 * dt;
    const grav = p.kind === "streak" ? 30 : p.kind === "ring" ? 0 : 640;
    const world = p.kind === "streak" ? 0 : -g.speed;
    p.x += (p.vx + world) * dt;
    p.y += p.vy * dt;
    p.vy += grav * dt;
  }
  g.particles = g.particles.filter((p) => p.life > 0);
  for (const t of g.texts) {
    t.life -= dt;
    t.y -= 28 * dt;
  }
  g.texts = g.texts.filter((t) => t.life > 0);
}

export function tick(g: Game, input: Input, dt: number, hooks?: Hooks) {
  const step = Math.min(dt, 0.05);
  if (g.mode === "attract") {
    g.t += step;
    g.anim += step * 1.7;
    if (Math.random() < step * 6) {
      burst(g, 80 + Math.random() * 620, 300 + Math.random() * 80, 1, "rgba(255,236,200,0.9)");
    }
    for (const p of g.particles) {
      p.life -= step;
      p.x += p.vx * step * 0.2;
      p.y += p.vy * step * 0.15;
    }
    g.particles = g.particles.filter((p) => p.life > 0);
    return;
  }
  if (g.mode === "dead") {
    g.t += step;
    g.deadT += step;
    g.shake = Math.max(0, g.shake - step * 1.4);
    for (const p of g.particles) {
      p.life -= step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vy += 380 * step;
    }
    g.particles = g.particles.filter((p) => p.life > 0);
    return;
  }
  stepPlay(g, input, step, hooks);
}

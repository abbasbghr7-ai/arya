import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as ArrowUp, r as ArrowDown } from "../_libs/lucide-react.mjs";
import "./router-BIzk5gIP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DPYw3C79.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KINDS = {
	log: {
		dh: 50,
		hw: 168,
		hh: 38,
		lift: 0
	},
	rock: {
		dh: 78,
		hw: 60,
		hh: 64,
		lift: 0
	},
	recording: {
		dh: 118,
		hw: 38,
		hh: 96,
		lift: 0
	},
	arch: {
		dh: 136,
		hw: 156,
		hh: 78,
		lift: 58
	}
};
var JUMP_V = -760;
var AIR_JUMP_V = -820;
var GRAVITY = 2550;
var MAX_FALL = 1200;
var SLIDE_TIME = .5;
var BASE_SPEED = 286;
var MAX_SPEED = 640;
var SPIN_TIME = .48;
var SAVE_KEY = "endless-runner-v1";
function loadBest() {
	if (typeof localStorage === "undefined") return 0;
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return 0;
		const data = JSON.parse(raw);
		if (data.version !== 1 || typeof data.best !== "number" || !Number.isFinite(data.best)) return 0;
		return Math.max(0, Math.floor(data.best));
	} catch {
		return 0;
	}
}
function saveBest(best) {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(SAVE_KEY, JSON.stringify({
			version: 1,
			best: Math.floor(best)
		}));
	} catch {}
}
function createGame(best = 0) {
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
		feetY: 396,
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
		deadT: 0
	};
}
function beginRun(g) {
	const best = g.best;
	const next = createGame(best);
	Object.assign(g, next);
	g.mode = "play";
	g.hint = 2.8;
	g.sinceSpawn = -.35;
	g.bestAtStart = best;
}
function snapshot(g) {
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
		grounded: g.grounded
	};
}
function refreshScore(g) {
	g.score = Math.floor(g.distance / 16) + g.bonus;
}
function burst(g, x, y, n, color) {
	for (let i = 0; i < n; i++) {
		if (g.particles.length > 90) g.particles.shift();
		g.particles.push({
			x,
			y,
			vx: (Math.random() - .35) * 160,
			vy: -40 - Math.random() * 140,
			life: .35 + Math.random() * .35,
			max: .7,
			r: 1.5 + Math.random() * 2.6,
			color
		});
	}
}
function pickKind(g) {
	if (g.bag.length === 0) {
		const deck = [
			"log",
			"rock",
			"log",
			"arch",
			"rock",
			"recording",
			"log",
			"arch",
			"rock"
		];
		for (let i = deck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const tmp = deck[i];
			deck[i] = deck[j];
			deck[j] = tmp;
		}
		g.bag = deck;
	}
	let kind = g.bag.pop() ?? "log";
	if (kind === g.lastKind && (kind === "arch" || kind === "recording")) kind = kind === "arch" ? "log" : "rock";
	return kind;
}
function spawnInterval(g) {
	let gap = 1.08 - Math.min(1, g.distance / 9800) * .4;
	if (g.lastKind === "arch") gap += .16;
	if (g.lastKind === "recording") gap += .06;
	return Math.max(.66, gap);
}
function playerBox(g) {
	if (g.pose === "slide") return {
		x: 162,
		y: g.feetY - 40,
		w: 92,
		h: 38
	};
	if (g.pose === "spin") return {
		x: 156,
		y: g.feetY - 100,
		w: 86,
		h: 88
	};
	return {
		x: 178,
		y: g.feetY - 112,
		w: 46,
		h: 106
	};
}
function obstacleBox(o) {
	const spec = KINDS[o.kind];
	return {
		x: o.x - spec.hw / 2,
		y: 396 - spec.lift - spec.hh,
		w: spec.hw,
		h: spec.hh
	};
}
function rideable(kind) {
	return kind === "log" || kind === "rock";
}
function platformTop(kind) {
	return 400 - KINDS[kind].dh;
}
function streak(g, x, y, n, color) {
	for (let i = 0; i < n; i++) {
		if (g.particles.length > 150) g.particles.shift();
		g.particles.push({
			x,
			y,
			vx: -220 - Math.random() * 460,
			vy: (Math.random() - .5) * 90,
			life: .16 + Math.random() * .18,
			max: .34,
			r: 1.4 + Math.random() * 1.6,
			color,
			kind: "streak"
		});
	}
}
function ring(g, x, y, color) {
	if (g.particles.length > 150) g.particles.shift();
	g.particles.push({
		x,
		y,
		vx: 0,
		vy: 0,
		life: .32,
		max: .32,
		r: 10,
		color,
		kind: "ring"
	});
}
function mount(g, ob, hooks) {
	const top = platformTop(ob.kind);
	g.ride = ob.id;
	g.feetY = top;
	g.vy = 0;
	g.grounded = true;
	g.pose = "run";
	g.airJumps = 1;
	g.spin = 0;
	g.jumpCut = false;
	g.landT = .1;
	g.squash = .12;
	g.shake = Math.min(1, g.shake + .4);
	hooks?.land?.();
	burst(g, 196, top, 16, "#f3e6c4");
	streak(g, 196, top - 18, 10, "#fff6d4");
	ring(g, 196, top, "#ffe3a1");
}
function overlaps(a, b) {
	return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function verticalGap(a, b) {
	const aBottom = a.y + a.h;
	const bBottom = b.y + b.h;
	if (aBottom <= b.y) return b.y - aBottom;
	if (bBottom <= a.y) return a.y - bBottom;
	return 0;
}
function kill(g, cause, hooks) {
	g.mode = "dead";
	g.cause = cause;
	g.hitStop = .07;
	g.shake = 1;
	g.deadT = 0;
	g.isBest = g.score > g.bestAtStart && g.score > 0;
	if (g.score > g.best) {
		g.best = g.score;
		saveBest(g.best);
	}
	burst(g, 196, 376, 16, cause === "recording" ? "#e7c56a" : "#c48955");
	hooks?.die?.(cause);
}
function tryJump(g, hooks) {
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
	g.squash = .09;
	hooks?.jump?.();
	burst(g, 196, g.feetY, 8, "#ead7ae");
	streak(g, 190, g.feetY - 30, 7, "#fff3cf");
}
function trySpin(g, hooks) {
	if (g.grounded || g.airJumps <= 0 || g.pose === "slide") return;
	g.airJumps = 0;
	g.vy = AIR_JUMP_V;
	g.pose = "spin";
	g.spin = .001;
	g.grounded = false;
	g.ride = null;
	g.jumpCut = true;
	g.buffer = 0;
	g.squash = .05;
	hooks?.jump?.();
	burst(g, 196, g.feetY - 70, 14, "#f3d48a");
}
function trySlide(g, hooks) {
	if (g.mode !== "play") return;
	if (!g.grounded) {
		if (g.vy < 180) g.vy = 220;
		return;
	}
	if (g.ride != null) {
		g.pose = "slide";
		g.slideLeft = SLIDE_TIME * .65;
		hooks?.slide?.();
		return;
	}
	if (g.pose === "slide") {
		g.slideLeft = Math.max(g.slideLeft, SLIDE_TIME * .72);
		return;
	}
	g.pose = "slide";
	g.slideLeft = SLIDE_TIME;
	g.vy = 0;
	g.feetY = 396;
	hooks?.slide?.();
	burst(g, 186, 396, 6, "#e6c79a");
}
function stepPlay(g, input, dt, hooks) {
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
	if (input.jump) g.buffer = .12;
	g.buffer = Math.max(0, g.buffer - dt);
	if (input.slide) trySlide(g, hooks);
	if (g.buffer > 0 && g.grounded) tryJump(g, hooks);
	else if (g.buffer > 0 && !g.grounded) trySpin(g, hooks);
	if (!input.jumpHeld && g.vy < -180 && !g.jumpCut && g.pose === "jump" && g.airJumps > 0) {
		g.vy *= .52;
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
			g.feetY = 396;
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
		if (g.vy >= 0 && g.ride == null) for (const ob of g.obstacles) {
			if (!rideable(ob.kind)) continue;
			const top = platformTop(ob.kind);
			const spec = KINDS[ob.kind];
			const left = ob.x - spec.hw / 2 + 14;
			const right = ob.x + spec.hw / 2 - 12;
			if (196 < left || 196 > right) continue;
			if (prevFeet <= top + 16 && g.feetY >= top - 8 && g.feetY <= top + 42) {
				mount(g, ob, hooks);
				break;
			}
		}
		if (g.ride == null && g.feetY >= 396) {
			g.feetY = 396;
			g.vy = 0;
			g.grounded = true;
			g.pose = "run";
			g.airJumps = 1;
			g.spin = 0;
			g.landT = .12;
			g.jumpCut = false;
			hooks?.land?.();
			burst(g, 196, 396, 12, "#e4c48a");
			streak(g, 196, 388, 6, "#fff0cc");
			ring(g, 196, 396, "#f6e2b4");
		}
	} else if (g.ride == null) {
		g.feetY = 396;
		g.grounded = true;
	}
	g.speed = Math.min(MAX_SPEED, BASE_SPEED + g.distance * .034);
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
			if (196 < left || 196 > right) {
				g.ride = null;
				g.grounded = false;
				g.pose = "jump";
				g.vy = 70;
				g.feetY = platformTop(ob.kind);
				burst(g, 196, g.feetY, 8, "#f4e4c4");
				streak(g, 196, g.feetY - 10, 6, "#fff6d8");
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
		if (overlaps(body, box) || box.x < body.x + body.w && box.x + box.w > body.x) {
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
				x: 232,
				y: g.feetY - 130,
				life: .7,
				max: .7
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
		const front = box.x + Math.min(26, box.w * .4);
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
			x: 858,
			passed: false,
			closest: 999,
			scored: false
		});
		g.lastKind = kind;
		g.sinceSpawn = 0;
	}
	const stepFrame = Math.floor(g.anim * 2);
	if (g.pose === "run" && g.grounded && stepFrame !== g.dustFrame) {
		g.dustFrame = stepFrame;
		burst(g, 178, g.feetY - 2, 9, "#e6d2a4");
		streak(g, 188, g.feetY - 20, 5, "#fff4d6");
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
function tick(g, input, dt, hooks) {
	const step = Math.min(dt, .05);
	if (g.mode === "attract") {
		g.t += step;
		g.anim += step * 1.7;
		if (Math.random() < step * 6) burst(g, 80 + Math.random() * 620, 300 + Math.random() * 80, 1, "rgba(255,236,200,0.9)");
		for (const p of g.particles) {
			p.life -= step;
			p.x += p.vx * step * .2;
			p.y += p.vy * step * .15;
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
var Sfx = class {
	ctx = null;
	muted = false;
	unlock() {
		if (this.muted) return;
		const Ctx = window.AudioContext || window.webkitAudioContext;
		if (!Ctx) return;
		if (!this.ctx) this.ctx = new Ctx();
		if (this.ctx.state === "suspended") this.ctx.resume();
	}
	tone(freq, dur, type, gain, slideTo) {
		if (!this.ctx || this.muted) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const amp = this.ctx.createGain();
		osc.type = type;
		osc.frequency.setValueAtTime(freq, t);
		if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
		amp.gain.setValueAtTime(gain, t);
		amp.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		osc.connect(amp);
		amp.connect(this.ctx.destination);
		osc.start(t);
		osc.stop(t + dur + .02);
	}
	noise(dur, gain) {
		if (!this.ctx || this.muted) return;
		const t = this.ctx.currentTime;
		const length = Math.floor(this.ctx.sampleRate * dur);
		const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
		const src = this.ctx.createBufferSource();
		src.buffer = buffer;
		const filter = this.ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 900;
		const amp = this.ctx.createGain();
		amp.gain.setValueAtTime(gain, t);
		amp.gain.exponentialRampToValueAtTime(1e-4, t + dur);
		src.connect(filter);
		filter.connect(amp);
		amp.connect(this.ctx.destination);
		src.start(t);
	}
	jump() {
		this.tone(220, .14, "square", .05, 520);
	}
	land() {
		this.noise(.08, .04);
		this.tone(120, .07, "triangle", .04);
	}
	slide() {
		this.noise(.12, .035);
	}
	clear(close) {
		this.tone(close ? 660 : 520, .08, "triangle", close ? .05 : .03, close ? 880 : 700);
	}
	die(recording) {
		this.noise(.22, .07);
		this.tone(recording ? 340 : 180, .28, "sawtooth", .04, 70);
	}
};
function measure(img) {
	const canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) return {
		img,
		cx: 0,
		cy: 0,
		cw: img.width,
		ch: img.height
	};
	ctx.drawImage(img, 0, 0);
	const data = ctx.getImageData(0, 0, img.width, img.height).data;
	let minX = img.width;
	let minY = img.height;
	let maxX = 0;
	let maxY = 0;
	const step = 2;
	for (let y = 0; y < img.height; y += step) for (let x = 0; x < img.width; x += step) if ((data[(y * img.width + x) * 4 + 3] ?? 0) > 24) {
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	}
	if (maxX <= minX || maxY <= minY) return {
		img,
		cx: 0,
		cy: 0,
		cw: img.width,
		ch: img.height
	};
	return {
		img,
		cx: minX,
		cy: minY,
		cw: maxX - minX,
		ch: maxY - minY
	};
}
function loadSprite(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(measure(img));
		img.onerror = () => reject(/* @__PURE__ */ new Error(`Could not load ${src}`));
		img.src = src;
	});
}
function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(/* @__PURE__ */ new Error(`Could not load ${src}`));
		img.src = src;
	});
}
function drawRotated(ctx, sprite, centerX, centerY, scale, rotation) {
	const dw = sprite.cw * scale;
	const dh = sprite.ch * scale;
	ctx.save();
	ctx.translate(centerX, centerY);
	ctx.rotate(rotation);
	ctx.drawImage(sprite.img, sprite.cx, sprite.cy, sprite.cw, sprite.ch, -dw / 2, -dh / 2, dw, dh);
	ctx.restore();
}
function drawSprite(ctx, sprite, centerX, feetY, scale, squashX = 1, squashY = 1) {
	const dw = sprite.cw * scale * squashX;
	const dh = sprite.ch * scale * squashY;
	ctx.drawImage(sprite.img, sprite.cx, sprite.cy, sprite.cw, sprite.ch, centerX - dw / 2, feetY - dh, dw, dh);
}
function EndlessRunner() {
	const canvasRef = (0, import_react.useRef)(null);
	const [mode, setMode] = (0, import_react.useState)("attract");
	const [score, setScore] = (0, import_react.useState)(0);
	const [best, setBest] = (0, import_react.useState)(0);
	const [combo, setCombo] = (0, import_react.useState)(0);
	const [cause, setCause] = (0, import_react.useState)(null);
	const [isBest, setIsBest] = (0, import_react.useState)(false);
	const [hintOn, setHintOn] = (0, import_react.useState)(false);
	const modeRef = (0, import_react.useRef)(mode);
	modeRef.current = mode;
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const game = createGame(0);
		const input = {
			jump: false,
			jumpHeld: false,
			slide: false
		};
		const sfx = new Sfx();
		let art = null;
		let raf = 0;
		let last = performance.now();
		let acc = 0;
		let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		let alive = true;
		const hooks = {
			jump: () => sfx.jump(),
			land: () => sfx.land(),
			slide: () => sfx.slide(),
			clear: (close) => sfx.clear(close),
			die: (next) => sfx.die(next === "recording")
		};
		window.__runner = {
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
			}
		};
		const stored = loadBest();
		game.best = stored;
		game.bestAtStart = stored;
		setBest(stored);
		const onResize = () => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.width = Math.floor(768 * dpr);
			canvas.height = Math.floor(432 * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		onResize();
		window.addEventListener("resize", onResize);
		const paint = () => {
			ctx.clearRect(0, 0, 768, 432);
			ctx.save();
			if (game.shake > 0 && !reduceMotion) {
				const mag = game.shake * 8;
				ctx.translate((Math.random() - .5) * mag, (Math.random() - .5) * mag);
			}
			if (!art) {
				ctx.fillStyle = "#c9844a";
				ctx.fillRect(0, 0, 768, 432);
				ctx.restore();
				return;
			}
			const scene = art;
			const travel = game.mode === "attract" ? game.t * 120 : game.distance;
			const palace = scene.palace;
			const viewW = palace.width / 1.08;
			const maxPan = Math.max(0, palace.width - viewW);
			const pan = (Math.sin(travel / 980) * .5 + .5) * maxPan;
			ctx.drawImage(palace, pan, 0, viewW, palace.height, 0, 0, 768, 432);
			const paintTrees = (dist, height, feet, alpha, gap) => {
				const scale = height / scene.cypress.ch;
				const off = (dist % gap + gap) % gap;
				ctx.save();
				ctx.globalAlpha = alpha;
				for (let x = -gap; x < 768 + gap; x += gap) drawSprite(ctx, scene.cypress, x - off + gap * .15, feet, scale);
				ctx.restore();
			};
			paintTrees(travel * .34, 190, 300, .45, 560);
			paintTrees(travel * .72, 280, 372, .95, 340);
			const tileW = 280;
			const gscroll = (travel % tileW + tileW) % tileW;
			const lip = scene.ground;
			for (let x = -280; x < 1048; x += tileW) ctx.drawImage(lip, 0, 30, lip.width, 90, x - gscroll, 404, tileW, 28);
			ctx.save();
			const wash = ctx.createLinearGradient(0, 0, 0, 432);
			wash.addColorStop(0, "rgba(255, 206, 120, 0.16)");
			wash.addColorStop(.42, "rgba(255, 170, 70, 0.02)");
			wash.addColorStop(1, "rgba(48, 22, 8, 0.16)");
			ctx.fillStyle = wash;
			ctx.fillRect(0, 0, 768, 432);
			ctx.globalCompositeOperation = "lighter";
			ctx.fillStyle = "rgba(255, 214, 150, 0.13)";
			ctx.beginPath();
			ctx.moveTo(70, 0);
			ctx.lineTo(210, 0);
			ctx.lineTo(390, 432);
			ctx.lineTo(150, 432);
			ctx.closePath();
			ctx.fill();
			ctx.restore();
			const paintBoy = (atX, feetY) => {
				const poseScale = game.pose === "slide" ? scene.slideScale : game.pose === "jump" || game.pose === "spin" ? scene.jumpScale : scene.runScale;
				const planted = game.grounded && feetY > 378;
				const lift = Math.max(0, 396 - feetY);
				const shadowY = planted ? feetY + 2 : 399;
				ctx.save();
				ctx.fillStyle = `rgba(48, 24, 8, ${planted ? .34 : .22 * Math.max(.35, 1 - lift / 260)})`;
				ctx.beginPath();
				const shadowW = (game.pose === "slide" ? 50 : 30) * (planted ? 1 : 1 - Math.min(.65, lift / 340));
				ctx.ellipse(atX, shadowY, shadowW, planted ? 6 : 7, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
				let squashX = 1;
				let squashY = 1;
				if (game.squash > 0) {
					squashX = 1.14;
					squashY = .86;
				} else if (game.landT > 0) {
					const k = game.landT / .12;
					squashX = 1 + .16 * k;
					squashY = 1 - .18 * k;
				}
				if (game.pose === "spin" && game.mode === "play") {
					const t = Math.min(1, game.spin);
					const ang = t * t * (3 - 2 * t) * Math.PI * 2;
					const fade = t > .76 ? (t - .76) / .24 : 0;
					const cy = feetY - 74;
					const kScale = 196 / scene.kick.cw;
					ctx.save();
					ctx.strokeStyle = `rgba(255, 220, 150, ${.55 * (1 - fade)})`;
					ctx.lineWidth = 3;
					ctx.beginPath();
					ctx.arc(atX, cy, 46, ang - 1.4, ang + .2);
					ctx.stroke();
					ctx.restore();
					for (let i = 3; i >= 1; i--) {
						ctx.save();
						ctx.globalAlpha = .14 * (1 - fade);
						drawRotated(ctx, scene.kick, atX, cy, kScale, ang - i * .38);
						ctx.restore();
					}
					ctx.save();
					ctx.globalAlpha = 1 - fade;
					drawRotated(ctx, scene.kick, atX, cy, kScale, ang);
					ctx.restore();
					if (fade > 0) {
						const fall = scene.jump[3] ?? scene.jump[0];
						ctx.save();
						ctx.globalAlpha = fade;
						drawSprite(ctx, fall, atX, feetY + 2, poseScale);
						ctx.restore();
					}
					return;
				}
				const n = scene.run.length;
				const span = (game.anim * n % n + n) % n;
				const i0 = Math.floor(span) % n;
				const frac = span - Math.floor(span);
				const i1 = (i0 + 1) % n;
				let frame = scene.run[i0] ?? scene.run[0];
				const next = scene.run[i1] ?? frame;
				let drawFeet = feetY;
				let lean = 0;
				let blend = 0;
				if (game.pose === "jump" && game.mode !== "attract") {
					if (game.squash > 0) frame = scene.jump[0] ?? frame;
					else if (game.vy < -80) frame = scene.jump[1] ?? frame;
					else if (game.vy < 120) frame = scene.jump[2] ?? frame;
					else frame = scene.jump[3] ?? frame;
					if (game.squash <= 0 && game.landT <= 0) {
						squashY = 1 + Math.min(.16, Math.abs(game.vy) / 5200);
						squashX = 1 / squashY;
					}
				} else if (game.pose === "slide") {
					const p = 1 - game.slideLeft / .5;
					const idx = p < .22 ? 0 : p < .55 ? 1 : p < .8 ? 2 : 3;
					frame = scene.slide[idx] ?? frame;
				} else {
					lean = game.mode === "attract" ? -.045 : -.05 - Math.min(.07, game.speed / 8e3);
					blend = frac;
				}
				ctx.save();
				if (game.mode === "dead") {
					ctx.translate(atX, 396);
					ctx.rotate(-.55);
					ctx.translate(-atX, -396);
				} else if (lean !== 0) {
					ctx.translate(atX, drawFeet - 46);
					ctx.rotate(lean);
					ctx.translate(-atX, -(drawFeet - 46));
				}
				drawSprite(ctx, frame, atX, drawFeet + 2, poseScale, squashX, squashY);
				if (blend > .04) {
					ctx.save();
					ctx.globalAlpha = blend * .34;
					drawSprite(ctx, next, atX, drawFeet + 2, poseScale, squashX, squashY);
					ctx.restore();
				}
				ctx.restore();
			};
			if (game.mode === "attract") paintBoy(470, 352);
			else {
				const ordered = [...game.obstacles].sort((a, b) => b.x - a.x);
				for (const ob of ordered) {
					if (ob.kind === "arch") continue;
					const sprite = scene.props[ob.kind];
					drawSprite(ctx, sprite, ob.x, 400, KINDS[ob.kind].dh / sprite.ch);
				}
				paintBoy(196, game.feetY);
				for (const ob of ordered) {
					if (ob.kind !== "arch") continue;
					drawSprite(ctx, scene.props.arch, ob.x, 398, KINDS.arch.dh / scene.props.arch.ch);
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
					ctx.lineTo(p.x + p.vx * .045, p.y + p.vy * .02);
					ctx.stroke();
				} else if (p.kind === "ring") {
					ctx.strokeStyle = p.color;
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.ellipse(p.x, p.y, p.r, Math.max(3, p.r * .32), 0, 0, Math.PI * 2);
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
					const y = game.feetY - 28 - i * 16 - air * game.vy * .01;
					const span = 70 + rush * 40;
					const x = 172 - (game.distance * (1.1 + rush) + i * 37) % span;
					const len = 10 + rush * 26 + air * 8;
					ctx.globalAlpha = (.08 + rush * .16) * (1 - i / 9);
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
		const loop = (now) => {
			if (!alive) return;
			const dt = Math.min(.05, (now - last) / 1e3);
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
				setHintOn(game.hint > .35);
			} else setHintOn(false);
			raf = requestAnimationFrame(loop);
		};
		const start = () => {
			sfx.unlock();
			if (game.mode === "play") return;
			beginRun(game);
		};
		const onKeyDown = (event) => {
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
		const onKeyUp = (event) => {
			if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") input.jumpHeld = false;
		};
		let swipeY = 0;
		let swipeAt = 0;
		const onPointerDown = (event) => {
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
		const onPointerUp = (event) => {
			input.jumpHeld = false;
			if (game.mode !== "play") return;
			if (event.clientY - swipeY > 36 && performance.now() - swipeAt < 420) {
				input.jump = false;
				input.jumpHeld = false;
				if ((game.pose === "jump" || game.pose === "spin") && game.ride == null && game.feetY > 374) {
					game.vy = 0;
					game.feetY = 396;
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
		Promise.all([
			loadImage("/runner/palace.jpg"),
			loadSprite("/runner/hero.png"),
			Promise.all(Array.from({ length: 25 }, (_, i) => loadSprite(`/runner/run-${i + 1}.png?v=25`))),
			Promise.all([
				1,
				2,
				3,
				4
			].map((i) => loadSprite(`/runner/jump-${i}.png`))),
			Promise.all([
				1,
				2,
				3,
				4
			].map((i) => loadSprite(`/runner/slide-${i}.png`))),
			loadSprite("/runner/kick.png"),
			loadSprite("/runner/cypress.png"),
			loadSprite("/runner/log.png"),
			loadSprite("/runner/rock.png"),
			loadSprite("/runner/arch.png"),
			loadSprite("/runner/camera.png"),
			loadImage("/runner/ground.jpg")
		]).then(([palace, hero, run, jump, slide, kick, cypress, log, rock, arch, camera, ground]) => {
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
				props: {
					log,
					rock,
					arch,
					recording: camera
				},
				runScale,
				jumpScale: 248 / (jumpH || 248),
				slideScale: 196 / (slideH || 196),
				ground
			};
		}).catch((error) => {
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
	const pressJump = (held) => {
		const api = window.__runner;
		if (!api) return;
		if (held) api.jump();
		else api.releaseJump();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "page",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "page-wash",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "stage",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
						ref: canvasRef,
						width: 768,
						height: 432,
						"aria-label": "Endless runner through Persepolis"
					}),
					mode === "attract" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "wordmark",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "ENDLESS" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "RUNNER" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "attract-controls",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rule",
							children: "Never check out the recording"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "stone-btn",
							onClick: () => window.__runner?.start(),
							children: "Run"
						})]
					})] }),
					mode === "play" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hud",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "hud-label",
								children: "Score"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "hud-num",
								children: score
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "hud-side",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "hud-label",
									children: "Best"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "hud-num",
									children: best
								})]
							})]
						}),
						hintOn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "hint",
							children: "Never check out the recording"
						}),
						combo > 1 && !hintOn && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "combo",
							children: ["Combo ×", combo]
						})
					] }),
					mode === "dead" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overlay",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "card",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: cause === "recording" ? "Never check out the recording" : "Wiped out" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "sub",
									children: cause === "recording" ? "You checked it out." : "Never check out the recording"
								}),
								isBest && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "new-best",
									children: "New best"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "stats",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: score }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Score" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: best }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Best" })] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "stone-btn",
									onClick: () => window.__runner?.start(),
									children: "Restart"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "keys",
									children: "پرش، پرش دوباره می‌چرخد · پایین سر خوردن"
								})
							]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "dock",
				children: [
					mode === "attract" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "dock-rule",
						children: "Never check out the recording"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dock-btn",
						onClick: () => window.__runner?.start(),
						children: "Run"
					})] }),
					mode === "play" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "dock-row",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dock-btn",
							onPointerDown: (event) => {
								event.preventDefault();
								pressJump(true);
							},
							onPointerUp: () => pressJump(false),
							onPointerLeave: () => pressJump(false),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { "aria-hidden": "true" }), "Jump"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "dock-btn",
							onPointerDown: (event) => {
								event.preventDefault();
								window.__runner?.slide();
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDown, { "aria-hidden": "true" }), "Slide"]
						})]
					}),
					mode === "dead" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "dock-rule",
						children: cause === "recording" ? "Never check out the recording" : "Wiped out"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dock-btn",
						onClick: () => window.__runner?.start(),
						children: "Restart"
					})] }),
					mode === "play" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "keys",
						children: "پرش دوم یه دور می‌چرخه · کشیدن به پایین = سر خوردن"
					})
				]
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EndlessRunner, {});
}
//#endregion
export { Home as component };

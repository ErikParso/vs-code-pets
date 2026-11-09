// Draws the World on a click-through canvas over VS Code's whole window. Everything is drawn in
// device pixels, from sprites built at a whole number of device pixels per sprite pixel, so the
// cats stay crisp at any zoom level.
import type { Cat } from '../world/cat';
import { BITES, CHEW, FADE_TIME, GRAVITY, HOP_TIME, SNIFF, WALK_SPEED, WIND_UP } from '../world/config';
import { clamp } from '../world/math';
import { SP } from '../world/sprites';
import { EMOTION_TIME, World } from '../world/world';

/** How to draw: debug mode adds the floors, walls and meters; `ink` is VS Code's text colour. */
export interface Look {
  debug: boolean;
  ink: string;
}

// Playing: three swipes a second; each is the second half of its beat.
const swiping = (t: number) => (t * 3) % 1 >= 0.5;

const Z = ['KKKK', '..K.', '.K..', 'KKKK'];
const HEART = ['KK.KK', 'KKKKK', '.KKK.', '..K..'];

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private sprites: Record<string, Record<string, HTMLCanvasElement>> = {}; // sprites[coat][frame]
  dpr = 1; // device pixels per CSS pixel
  px: number; // device pixels per sprite pixel
  width = 0; // the window's, CSS px
  height = 0;

  /** `scale`: CSS pixels per sprite pixel. */
  constructor(private readonly scale: number) {
    this.px = scale;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pixel-cat-overlay';
    Object.assign(this.canvas.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      pointerEvents: 'none',
      zIndex: '999',
    });
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  /** Fits the canvas to the window (and the sprites to its pixel ratio). */
  resize(): void {
    const ratio = window.devicePixelRatio || 1;
    if (ratio !== this.dpr || !Object.keys(this.sprites).length) {
      this.dpr = ratio;
      this.px = Math.max(1, Math.round(this.scale * this.dpr));
      this.buildSprites();
    }
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Clears the canvas, and draws the world on it while the cats are shown. */
  draw(world: World, shown: boolean, look: Look): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!shown) return;
    if (look.debug) this.drawDebug(world);
    this.drawFish(world);
    this.drawYarn(world);
    for (const c of world.cats) {
      this.drawCat(world, c);
      if (look.debug) this.drawMeters(world, c, look.ink);
    }
    this.drawEmotions(world, look.ink);
  }

  // One set of frames per coat.
  private buildSprites(): void {
    const { px } = this;
    this.sprites = {};
    for (const [coatName, coat] of Object.entries(SP.coats)) {
      const palette = { ...SP.palette, ...coat };
      const set: Record<string, HTMLCanvasElement> = {};
      for (const [name, rows] of Object.entries(SP.frames)) {
        const c = document.createElement('canvas');
        c.width = rows[0].length * px; // most frames are 24x16; climbing ones are 16x24
        c.height = rows.length * px;
        const g = c.getContext('2d') as CanvasRenderingContext2D;
        rows.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            const color = palette[row[x]];
            if (!color) continue;
            g.fillStyle = color;
            g.fillRect(x * px, y * px, px, px);
          }
        });
        set[name] = c;
      }
      this.sprites[coatName] = set;
    }
  }

  private frameName(cat: Cat): string {
    const a = cat.activity;
    const cycle = (frames: string[], fps: number) => frames[Math.floor(a.t * fps) % frames.length];
    switch (a.kind) {
      case 'walk':
        // Legs move faster when trotting.
        return cycle(['walkA', 'walkB', 'walkA', 'walkD'], (7 * a.speed) / WALK_SPEED);
      case 'wallhop':
        // Gathered in, pushing off, reaching to grab; then holding on, tail swishing.
        if (a.t < WIND_UP) return 'climbPull';
        if (a.t < WIND_UP + HOP_TIME / 2) return 'climbPush';
        if (a.t < WIND_UP + HOP_TIME) return 'climbReach';
        return cycle(['climbReach', 'climbTail'], 3);
      case 'slide':
        return 'climbPull'; // paws gathered in, braking
      case 'sleep':
        return cycle(['sleep1', 'sleep2'], 1.1);
      case 'crouch':
        return 'crouch';
      case 'eat': {
        // A sniff, then bite after bite: munching, a tug; every third bite the tail flicks.
        if (a.t < SNIFF) return 'eatDown';
        const n = (a.t - SNIFF) / CHEW;
        if (n % 1 > 0.6) return 'eatTug';
        return Math.floor(n) % 3 === 1 ? 'eatTail' : 'eatChew';
      }
      case 'play':
        // Paw up, swipe, paw up, swipe...
        return swiping(a.t) ? 'playSwipe' : 'playUp';
      case 'air':
        return a.flight.vy + GRAVITY * a.t < 0 ? 'leap' : 'walkA';
      default:
        if (a.t % 4 > 3.85) return 'sitBlink';
        return Math.floor(a.t * 2) % 6 === 0 ? 'sitTail' : 'sit';
    }
  }

  // Fish: tumbling through the air (in quarter turns, which keeps the pixels crisp), then
  // flopping about (see FishPond.flop); off the end of the floor it tumbles away. Being eaten,
  // it loses a chunk with each tug, from the cat's end; pushed out by newer fish, it fades away.
  private drawFish(world: World): void {
    const { ctx, dpr, px } = this;
    for (const g of world.fish.items) {
      const since = g.t - g.flopFrom; // into the current flop
      const flopping = g.landed && !g.cat && !g.falling && since < g.flopTime;
      const tumbling = !g.landed || g.falling;
      const wiggle = tumbling || flopping ? Math.floor(g.t * 12) % 2 : 0;
      const img = this.sprites.orange[wiggle ? 'fishB' : 'fishA'];
      const bites = g.cat ? clamp(Math.floor((g.cat.t - SNIFF) / CHEW + 0.4), 0, BITES) : 0;
      const cols = img.width / px;
      const cut = Math.min(cols - 1, Math.round((cols * bites) / BITES)) * px;
      const turn = tumbling ? (Math.floor(g.t * 8) % 4) * (g.vx < 0 ? -1 : 1) : 0;
      const lift = flopping ? Math.sin((Math.PI * since) / g.flopTime) * g.flopHeight : 0;
      const facing = (g.vx < 0 ? -1 : 1) * ((g.flips ?? 0) % 2 ? -1 : 1);
      ctx.globalAlpha = g.fade ? 1 - g.fade / FADE_TIME : 1;
      ctx.save();
      ctx.translate(Math.round(g.x * dpr), Math.round((g.y - lift) * dpr - img.height / 2));
      ctx.rotate((turn * Math.PI) / 2);
      if (!tumbling && facing < 0) ctx.scale(-1, 1);
      // The bitten-off end is the one towards the cat, in the fish's own (maybe flipped) frame.
      const sx = g.cat && g.cat.dir * (facing < 0 ? -1 : 1) > 0 ? cut : 0;
      const w = img.width - cut;
      ctx.drawImage(img, sx, 0, w, img.height, sx - Math.round(img.width / 2), -Math.round(img.height / 2), w, img.height);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Balls of yarn: tumbling through the air like a fish; on the floor, a quarter turn per ~5.5
  // sprite px it has rolled (right: clockwise), turning about the middle of the ball (4.5, 3.5 px
  // into the sprite) so it stays put; batted, it jogs away from the paw on each swipe.
  private drawYarn(world: World): void {
    const { ctx, dpr, px } = this;
    for (const g of world.yarn.items) {
      const tumbling = !g.landed || g.falling;
      const swiper = g.cat && swiping(g.cat.t) ? g.cat : null;
      const img = this.sprites.orange[swiper ? 'yarnB' : 'yarnA'];
      const nudge = swiper ? swiper.dir * (px / dpr) : 0;
      const turn = tumbling ? (Math.floor(g.t * 8) % 4) * (g.vx < 0 ? -1 : 1) : Math.floor((g.x * dpr) / (5.5 * px));
      ctx.globalAlpha = g.fade ? 1 - g.fade / FADE_TIME : 1;
      ctx.save();
      ctx.translate(Math.round((g.x + nudge) * dpr), Math.round(g.y * dpr) - 3.5 * px);
      ctx.rotate((turn * Math.PI) / 2);
      ctx.drawImage(img, -4.5 * px, -3.5 * px);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Debug overlay: the floors (teal) and walls (orange) the cats get around on.
  private drawDebug(world: World): void {
    const { ctx, dpr } = this;
    const t = Math.max(2, Math.round(2 * dpr));
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ff9f1c';
    for (const w of world.walls) {
      ctx.fillRect(Math.round(w.x * dpr) - t / 2, Math.round(w.y1 * dpr), t, Math.round((w.y2 - w.y1) * dpr));
    }
    ctx.fillStyle = '#2ec4b6';
    for (const f of world.floors) {
      ctx.fillRect(Math.round(f.x1 * dpr), Math.round(f.y * dpr) - t, Math.round((f.x2 - f.x1) * dpr), t);
    }
    ctx.globalAlpha = 1;
  }

  // Debug: bars under the cat. Hunger: teal = full, orange = would eat, red = asking.
  private drawMeters(world: World, cat: Cat, ink: string): void {
    const { ctx, dpr } = this;
    const t = Math.max(2, Math.round(2 * dpr));
    const w = Math.round(world.catW * 0.6 * dpr);
    const hold = cat.onWall;
    const x = Math.round((hold ? hold.wall.x : cat.x) * dpr - w / 2);
    const y = Math.round((cat.y + 3) * dpr);
    const bars: [number, string][] = [
      [cat.care.level(), cat.care.asking() ? '#e63946' : cat.care.canEat() ? '#ff9f1c' : '#2ec4b6'],
      [cat.care.trust, SP.palette.P],
    ];
    bars.forEach(([value, color], i) => {
      const by = y + i * 2 * t;
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x, by, w, t);
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.fillRect(x, by, Math.round(w * value), t);
    });
  }

  private drawCat(world: World, cat: Cat): void {
    const { ctx, dpr } = this;
    const img = this.sprites[cat.coat][this.frameName(cat)];
    const w = img.width;
    const h = img.height;
    // On a wall: seen from behind, hugging the border, centred on the wall line.
    const hold = cat.onWall;
    const cx = Math.round((hold ? hold.wall.x : cat.x) * dpr);
    const cy = Math.round((cat.y - (hold ? h / dpr : world.catH) / 2) * dpr);
    ctx.save();
    ctx.translate(cx, cy);
    if (!hold && cat.dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h / 2);
    ctx.restore();
  }

  // Cat emotions: sleep, affection, and food requests.
  private drawEmotions(world: World, ink: string): void {
    const { ctx, dpr, px } = this;
    const zp = Math.max(1, px - Math.round(dpr));
    for (const z of world.emotions) {
      ctx.fillStyle = z.kind === 'heart' ? SP.palette.P : ink;
      ctx.globalAlpha = 0.8 * (1 - z.t / EMOTION_TIME);
      const zx = Math.round((z.x + Math.sin(z.t * 3) * 3) * dpr) - (z.kind === 'fish' ? 5 * zp : 0); // centred
      const zy = Math.round(z.y * dpr);
      const rows = z.kind === 'fish' ? SP.frames.fishA : z.kind === 'heart' ? HEART : Z;
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const c = z.dir < 0 ? row[row.length - 1 - x] : row[x];
          if (c === '.') continue;
          if (z.kind === 'fish') ctx.fillStyle = SP.palette[c];
          ctx.fillRect(zx + x * zp, zy + y * zp, zp, zp);
        }
      });
    }
    ctx.globalAlpha = 1;
  }
}

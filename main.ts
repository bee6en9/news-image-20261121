// news-image-20261121 — one image summing up Saturday 21 November 2026.
// Node 22, standard library only. No network, no external assets.
// Draws a 1024x1024 newspaper front page ("THE WORLD DAILY") to
// /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png). Deterministic:
// no randomness, no clocks, no timestamps anywhere in the output.
//
// Five verified stories of 21 Nov 2026:
//  1. AI rout: Nvidia -14% on a Reuters report of an SEC accounting probe;
//     S&P 500 -3.7%, Nasdaq -5.28% (Reuters / Le Monde, 21 Nov 2026).
//  2. Russian ballistic missiles hit Kryvyi Rih, Zelenskyy's hometown:
//     2 killed, 60 wounded (AP, 21 Nov 2026).
//  3. Mexico captures FBI most-wanted cartel boss "El Chapo Isidro"
//     in Guasave, Sinaloa (Reuters / AP, 21 Nov 2026).
//  4. COP31 climate talks in Antalya run into overtime; the draft final
//     text drops fossil-fuel language (AP, 21 Nov 2026).
//  5. Magnitude 6.8 earthquake in the Banda Sea, off Timor-Leste;
//     no casualties reported (Reuters / GFZ, 21 Nov 2026).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// ---------------------------------------------------------------------------
// Canvas: a plain RGB framebuffer, 1024 by 1024.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [251, 247, 236];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [22, 41, 77];
const NIGHT: RGB = [13, 24, 48];
const RED: RGB = [179, 38, 30];
const BLUE: RGB = [36, 86, 166];
const SKY: RGB = [168, 205, 232];
const GOLD: RGB = [201, 162, 39];
const GREEN: RGB = [46, 125, 50];
const GREY: RGB = [107, 107, 107];
const RULE: RGB = [201, 194, 176];
const WHITE: RGB = [255, 255, 255];
const ORANGE: RGB = [232, 126, 32];
const YELLOW: RGB = [244, 196, 48];
const SAND: RGB = [238, 222, 186];
const DARKBLDG: RGB = [44, 64, 104];
const TEAL: RGB = [18, 77, 74];
const DEEPSEA: RGB = [18, 52, 86];
const BRICK: RGB = [140, 52, 40];

function put(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
  }
}

function hline(x0: number, x1: number, y: number, c: RGB): void {
  for (let x = x0; x <= x1; x++) put(x, y, c);
}

function vline(x: number, y0: number, y1: number, c: RGB): void {
  for (let y = y0; y <= y1; y++) put(x, y, c);
}

// Bresenham line, any slope.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    put(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function thickLine(x0: number, y0: number, x1: number, y1: number, c: RGB, t: number): void {
  for (let d = 0; d < t; d++) line(x0, y0 + d, x1, y1 + d, c);
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) put(x, y, c);
    }
  }
}

function ring(cx: number, cy: number, r: number, c: RGB): void {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    put(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}

function frame(x: number, y: number, w: number, h: number, c: RGB): void {
  hline(x, x + w - 1, y, c);
  hline(x, x + w - 1, y + h - 1, c);
  vline(x, y, y + h - 1, c);
  vline(x + w - 1, y, y + h - 1, c);
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 cells; '#' is ink, '.' blank.
// Uppercase, lowercase, digits and punctuation the page uses.
// ---------------------------------------------------------------------------
const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  a: ['.....', '.....', '.###.', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['.....', '.....', '.###.', '#...#', '#....', '#...#', '.###.'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  f: ['..##.', '.#...', '.#...', '####.', '.#...', '.#...', '.#...'],
  g: ['.....', '.####', '#...#', '#...#', '.####', '....#', '.###.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '#..#.', '.##..'],
  k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '.....', '####.', '#...#', '#...#', '####.', '#....'],
  q: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#...', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '..#..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '..#..', '.#...'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
};

const CHAR_W = 6; // 5 pixels of glyph plus 1 of space

function glyphWidth(s: string, scale: number): number {
  return s.length * CHAR_W * scale - scale;
}

function drawGlyph(x: number, y: number, ch: string, scale: number, c: RGB): void {
  const g = GLYPHS[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    for (let col = 0; col < 5; col++) {
      if (row[col] === '#') {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            put(x + col * scale + dx, y + r * scale + dy, c);
          }
        }
      }
    }
  }
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    drawGlyph(cx, y, ch, scale, c);
    cx += CHAR_W * scale;
  }
}

function drawTextCentered(cx: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(glyphWidth(s, scale) / 2), y, s, scale, c);
}

// Greedy word wrap to a pixel width; returns lines of the original text.
function wrap(s: string, maxPx: number, scale: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxPx / (CHAR_W * scale)));
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur === '' ? w : cur + ' ' + w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur !== '') lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

function drawPara(x: number, y: number, s: string, maxPx: number, scale: number, c: RGB): number {
  const lines = wrap(s, maxPx, scale);
  const lh = 9 * scale;
  for (let i = 0; i < lines.length; i++) {
    drawText(x, y + i * lh, lines[i], scale, c);
  }
  return y + lines.length * lh;
}

// ---------------------------------------------------------------------------
// PNG encoder: signature, IHDR, one IDAT (zlib, filter 0 per row), IEND.
// ---------------------------------------------------------------------------
const CRC_TABLE = ((): Uint32Array => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Illustrations (all fixed coordinates — no randomness).
// ---------------------------------------------------------------------------

// Lead illustration: a falling market chart on a night panel.
function drawChart(x0: number, y0: number, w: number, h: number): void {
  rect(x0, y0, w, h, NIGHT);
  drawText(x0 + 16, y0 + 14, 'S&P 500', 2, WHITE);
  drawText(x0 + 16, y0 + 40, '-3.7%', 4, YELLOW);
  drawText(x0 + 16, y0 + 76, 'NASDAQ -5.3%', 2, [255, 170, 160]);
  // Grid lines.
  const base = y0 + h - 26;
  for (let g = 0; g < 3; g++) {
    const gy = base - 60 - g * 55;
    for (let gx = x0 + 12; gx < x0 + w - 12; gx += 8) put(gx, gy, [48, 66, 104]);
  }
  // Falling bars.
  const heights = [168, 142, 116, 90, 64, 40];
  const bw = 38;
  for (let i = 0; i < 6; i++) {
    const bx = x0 + 16 + i * (bw + 10);
    const bh = heights[i];
    rect(bx, base - bh, bw, bh, i < 3 ? BLUE : [120, 40, 34]);
  }
  // Red trend line diving across the bar tops, with an arrowhead.
  const tx0 = x0 + 34;
  const ty0 = base - 168 - 12;
  const tx1 = x0 + w - 22;
  const ty1 = base - 40 - 12;
  thickLine(tx0, ty0, tx1, ty1, RED, 4);
  line(tx1, ty1, tx1 - 22, ty1 - 4, RED);
  line(tx1, ty1, tx1 - 6, ty1 - 22, RED);
  line(tx1, ty1, tx1 - 22, ty1 - 4, RED);
  // Baseline.
  hline(x0 + 12, x0 + w - 12, base, WHITE);
  drawText(x0 + w - 62, base + 8, 'FRI', 2, WHITE);
}

// Panel A illustration: night over Kryvyi Rih — skyline, explosion, trails.
function drawKryvyiRih(x0: number, y0: number, w: number, h: number): void {
  rect(x0, y0, w, h, NIGHT);
  for (let i = 0; i < 34; i++) {
    const sx = x0 + 10 + ((i * 53) % (w - 20));
    const sy = y0 + 8 + ((i * 37) % 34);
    put(sx, sy, WHITE);
    if (i % 4 === 0) put(sx + 1, sy, WHITE);
  }
  const base = y0 + h;
  const towers: [number, number][] = [
    [16, 62],
    [86, 88],
    [156, 70],
    [226, 96],
    [296, 58],
    [356, 80],
  ];
  for (const [bx, bh] of towers) {
    rect(x0 + bx, base - bh, 54, bh, DARKBLDG);
    for (let wy = base - bh + 8; wy < base - 8; wy += 16) {
      for (let wx = x0 + bx + 8; wx < x0 + bx + 46; wx += 16) {
        if ((wx + wy) % 32 === 0) rect(wx, wy, 4, 5, GOLD);
      }
    }
  }
  // Explosion over the middle tower.
  const ex = x0 + 210;
  const ey = y0 + 46;
  disc(ex, ey, 24, RED);
  disc(ex, ey, 16, ORANGE);
  disc(ex, ey, 9, YELLOW);
  line(ex, ey - 24, ex, ey - 40, YELLOW);
  line(ex, ey + 24, ex, ey + 40, YELLOW);
  line(ex - 24, ey, ex - 40, ey, YELLOW);
  line(ex + 24, ey, ex + 40, ey, YELLOW);
  // Two missile trails diving from the top right.
  line(x0 + w - 30, y0 + 6, x0 + w - 92, y0 + 66, WHITE);
  line(x0 + w - 29, y0 + 6, x0 + w - 91, y0 + 66, WHITE);
  line(x0 + w - 66, y0 + 4, x0 + w - 128, y0 + 58, WHITE);
  disc(x0 + w - 92, y0 + 66, 5, ORANGE);
  disc(x0 + w - 128, y0 + 58, 5, ORANGE);
}

// Panel B illustration: gold badge star and handcuff rings on deep teal.
function drawCapture(x0: number, y0: number, w: number, h: number): void {
  rect(x0, y0, w, h, TEAL);
  // Desert sun in the top-right corner and dunes at the bottom.
  disc(x0 + w - 36, y0 + 26, 16, GOLD);
  for (let i = 0; i < 3; i++) {
    line(x0, y0 + h - 26 - i * 8, x0 + 150 + i * 90, y0 + h - 8 - i * 8, SAND);
  }
  // Gold five-point star (badge) on the left.
  const cx = x0 + 92;
  const cy = y0 + 62;
  const R = 44;
  const r = 18;
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const ang = (-Math.PI / 2 + (k * Math.PI) / 5);
    const rad = k % 2 === 0 ? R : r;
    pts.push([Math.round(cx + rad * Math.cos(ang)), Math.round(cy + rad * Math.sin(ang))]);
  }
  for (let k = 0; k < 10; k++) {
    const [ax, ay] = pts[k];
    const [bx, by] = pts[(k + 1) % 10];
    thickLine(ax, ay, bx, by, GOLD, 3);
  }
  drawTextCentered(cx, cy - 7, 'FBI', 2, YELLOW);
  // Handcuff rings on the right.
  ring(x0 + 300, y0 + 62, 26, WHITE);
  ring(x0 + 300, y0 + 62, 24, WHITE);
  ring(x0 + 368, y0 + 62, 26, WHITE);
  ring(x0 + 368, y0 + 62, 24, WHITE);
  line(x0 + 322, y0 + 48, x0 + 346, y0 + 48, WHITE);
  line(x0 + 322, y0 + 76, x0 + 346, y0 + 76, WHITE);
  // Jail bars along the right edge.
  for (let bx = x0 + w - 18; bx < x0 + w; bx += 6) vline(bx, y0, y0 + h - 1, [120, 160, 158]);
}

// Panel C illustration: globe, sun and a rising thermometer on sky blue.
function drawClimate(x0: number, y0: number, w: number, h: number): void {
  rect(x0, y0, w, h, SKY);
  disc(x0 + w - 66, y0 + 30, 20, GOLD);
  // Globe.
  const gx = x0 + 110;
  const gy = y0 + 72;
  disc(gx, gy, 48, BLUE);
  disc(gx - 16, gy - 12, 14, GREEN);
  disc(gx + 14, gy + 10, 12, GREEN);
  disc(gx + 20, gy - 22, 8, GREEN);
  ring(gx, gy, 48, WHITE);
  ring(gx, gy, 49, WHITE);
  // Clouds.
  disc(x0 + 250, y0 + 30, 14, WHITE);
  disc(x0 + 268, y0 + 30, 18, WHITE);
  disc(x0 + 288, y0 + 30, 14, WHITE);
  // Thermometer on the right.
  const tx = x0 + 330;
  rect(tx, y0 + 24, 16, 72, WHITE);
  rect(tx + 4, y0 + 30, 8, 60, RED);
  disc(tx + 8, y0 + 100, 16, RED);
  disc(tx + 8, y0 + 100, 10, [255, 120, 110]);
  drawText(x0 + 356, y0 + 92, '1.5C', 3, INK);
  // Ground line.
  rect(x0, y0 + h - 10, w, 10, GREEN);
}

// Panel D illustration: sea waves, a crack and a seismograph line.
function drawQuake(x0: number, y0: number, w: number, h: number): void {
  rect(x0, y0, w, h, DEEPSEA);
  // Big magnitude.
  drawText(x0 + 18, y0 + 18, '6.8', 5, YELLOW);
  drawText(x0 + 18, y0 + 62, 'MAGNITUDE', 2, WHITE);
  // Jagged crack from the top.
  const cx0 = x0 + 250;
  let px = cx0;
  let py = y0;
  const steps: [number, number][] = [
    [12, 18], [-16, 20], [14, 16], [-10, 18], [12, 16], [-8, 14], [10, 12],
  ];
  for (const [dx, dy] of steps) {
    line(px, py, px + dx, py + dy, ORANGE);
    line(px + 1, py, px + dx + 1, py + dy, ORANGE);
    px += dx;
    py += dy;
  }
  // Seismograph zigzag across the lower half.
  let sx = x0 + 12;
  let sy = y0 + 108;
  const zig: [number, number][] = [
    [30, 0], [12, -14], [12, 16], [12, -22], [12, 20], [14, -8], [16, 4],
    [30, 0], [12, -18], [12, 24], [12, -12], [14, 6], [16, -2], [30, 0],
  ];
  for (const [dx, dy] of zig) {
    line(sx, sy, sx + dx, sy + dy, WHITE);
    line(sx, sy + 1, sx + dx, sy + dy + 1, WHITE);
    sx += dx;
    sy += dy;
  }
  // Sea waves at the bottom.
  for (let wy = y0 + h - 22; wy < y0 + h - 4; wy += 8) {
    for (let wx = x0 + 6; wx < x0 + w - 6; wx += 4) {
      if (((wx + wy) % 16) < 8) put(wx, wy, [120, 180, 220]);
    }
  }
}

// One story panel: illustration strip, kicker, headline, subhead.
function drawPanel(
  x: number,
  y: number,
  w: number,
  h: number,
  kicker: string,
  kickerColor: RGB,
  headline: string,
  subhead: string,
  art: (x0: number, y0: number, w: number, h: number) => void,
): void {
  frame(x, y, w, h, RULE);
  art(x + 2, y + 2, w - 4, 140);
  drawText(x + 14, y + 152, kicker, 2, kickerColor);
  drawText(x + 14, y + 176, headline, 2, INK);
  drawText(x + 14, y + 200, subhead, 2, GREY);
}

// ---------------------------------------------------------------------------
// Page: fill the paper, then draw the front page top to bottom.
// ---------------------------------------------------------------------------
rect(0, 0, W, H, PAPER);

// --- Masthead ---------------------------------------------------------------
rect(0, 0, W, 104, NAVY);
drawTextCentered(512, 22, 'THE WORLD DAILY', 6, WHITE);
rect(0, 104, W, 4, RED);
drawTextCentered(512, 118, 'SATURDAY, 21 NOVEMBER 2026', 2, INK);
drawTextCentered(512, 140, 'FIVE STORIES FROM ONE DAY AROUND THE WORLD', 2, RED);

// --- Lead story: the AI market rout -----------------------------------------
drawText(40, 170, 'MARKETS', 2, RED);
drawText(40, 196, 'AI ROUT SENDS', 5, INK);
drawText(40, 240, 'MARKETS REELING', 5, INK);
drawPara(
  40,
  296,
  "Nvidia plunges 14% as Reuters reports an SEC accounting probe. The S&P 500 falls 3.7% and the Nasdaq 5.3%.",
  560,
  3,
  INK,
);
// Stat strip under the lead text.
rect(40, 414, 170, 54, NAVY);
drawTextCentered(125, 434, 'NVIDIA -14%', 2, WHITE);
rect(226, 414, 170, 54, RED);
drawTextCentered(311, 434, 'S&P -3.7%', 2, WHITE);
rect(412, 414, 170, 54, INK);
drawTextCentered(497, 434, 'NASDAQ -5.3%', 2, WHITE);
drawText(40, 476, 'FRIDAY ON WALL STREET', 2, GREY);

// Lead illustration: falling chart.
drawChart(640, 168, 344, 310);

// --- Divider ----------------------------------------------------------------
rect(40, 490, 944, 2, RULE);

// --- Four more stories, 2 by 2 ---------------------------------------------
drawPanel(
  40, 506, 452, 230,
  'UKRAINE', RED,
  "MISSILES HIT ZELENSKYY'S HOMETOWN",
  'Two killed, 60 hurt in Kryvyi Rih',
  drawKryvyiRih,
);
drawPanel(
  532, 506, 452, 230,
  'MEXICO', TEAL,
  'MEXICO NABS FBI MOST-WANTED BOSS',
  'El Chapo Isidro seized in Sinaloa',
  drawCapture,
);
drawPanel(
  40, 748, 452, 230,
  'CLIMATE', GREEN,
  'CLIMATE TALKS RUN INTO OVERTIME',
  'COP31 draft drops fossil fuel pledge',
  drawClimate,
);
drawPanel(
  532, 748, 452, 230,
  'ASIA-PACIFIC', BLUE,
  'QUAKE SHAKES THE BANDA SEA',
  'Magnitude 6.8 off Timor-Leste coast',
  drawQuake,
);

// --- Footer -----------------------------------------------------------------
drawTextCentered(512, 994, 'FIVE STORIES - ONE DAY - 21 NOVEMBER 2026', 2, GREY);

// ---------------------------------------------------------------------------
// Write the PNG.
// ---------------------------------------------------------------------------
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'entry.png'), encodePng());

// One-off asset prep: remove the solid black background from the face sticker.
// Strategy: flood-fill inward from all four edges, clearing near-black pixels
// to transparent and stopping at the bright white die-cut border. Because the
// subject (incl. the dark t-shirt) is fully enclosed by that border, the fill
// can never reach inside it — so the shirt is preserved.
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'fs';

const SRC = process.argv[2];
const OUT = process.argv[3];
// A pixel counts as "background black" if it's dark enough to flood through.
const DARK_LUMA = 60;

const png = PNG.sync.read(readFileSync(SRC));
const { width: w, height: h, data } = png;

const idx = (x, y) => (y * w + x) * 4;
const luma = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

const visited = new Uint8Array(w * h);
const stack = [];

// Seed the flood from every edge pixel.
for (let x = 0; x < w; x++) {
  stack.push([x, 0], [x, h - 1]);
}
for (let y = 0; y < h; y++) {
  stack.push([0, y], [w - 1, y]);
}

let cleared = 0;
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= w || y >= h) continue;
  const p = y * w + x;
  if (visited[p]) continue;
  visited[p] = 1;

  const i = idx(x, y);
  // Stop at anything brighter than the threshold (the white border / subject).
  if (luma(i) > DARK_LUMA) continue;

  // It's background — make it fully transparent.
  data[i + 3] = 0;
  cleared++;

  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

writeFileSync(OUT, PNG.sync.write(png));
console.log(`Cleared ${cleared} px of ${w * h} to transparent → ${OUT}`);

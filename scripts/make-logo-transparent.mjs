import sharp from "sharp";
import { readFileSync } from "node:fs";

/** Only near-white page background — do not treat logo line art as background. */
function isNearWhiteBackground(r, g, b) {
  return r >= 248 && g >= 248 && b >= 248;
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Darken gray/black line art so the car and trophy read clearly on light UI. */
function strengthenLineArt(data) {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const lum = luminance(r, g, b);

  // Logo outlines and interior line art (not saturated blue/red fills).
    if (chroma <= 55 && lum <= 120) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    } else if (chroma <= 45 && lum <= 170) {
      data[i] = Math.round(r * 0.35);
      data[i + 1] = Math.round(g * 0.35);
      data[i + 2] = Math.round(b * 0.35);
    }
  }
}

async function removeBackground(inputPath, outputPath) {
  const input = readFileSync(inputPath);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const total = width * height;
  const remove = new Uint8Array(total);
  const queue = [];

  function tryPush(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (remove[idx]) return;
    const i = idx * 4;
    if (!isNearWhiteBackground(data[i], data[i + 1], data[i + 2])) return;
    remove[idx] = 1;
    queue.push(idx);
  }

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (queue.length > 0) {
    const idx = queue.pop();
    const x = idx % width;
    const y = (idx - x) / width;
    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }

  let cleared = 0;
  for (let idx = 0; idx < total; idx++) {
    if (!remove[idx]) continue;
    const i = idx * 4;
    if (data[i + 3] === 0) continue;
    data[i + 3] = 0;
    cleared++;
  }

  strengthenLineArt(data);

  await sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`Wrote ${outputPath} (cleared ${cleared} px)`);
}

const brandMarkSource =
  "/Users/pablitochoi/.cursor/projects/Users-pablitochoi-Documents-Car-Show-Events-App/assets/CarShowScout-faviconV2-c98ae6a0-99e6-4fb4-ac72-801b0fc8e05c.png";

for (const dest of [
  "public/brand/carshowscout-mark.png",
  "src/app/icon.png",
  "src/app/apple-icon.png",
]) {
  await removeBackground(brandMarkSource, dest);
}

await sharp("public/brand/carshowscout-mark.png")
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .jpeg({ quality: 92 })
  .toFile("public/brand/carshowscout-logo.jpg");
console.log("Wrote public/brand/carshowscout-logo.jpg");

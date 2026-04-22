/**
 * Generate PWA/iOS icon PNGs from favicon.svg.
 * Usage: pnpm tsx scripts/generate-icons.ts
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

// Read SVG and replace adaptive colors with fixed light-on-dark
const svgSource = readFileSync(resolve(publicDir, 'favicon.svg'), 'utf-8');
const fixedSvg = svgSource
  .replace(/<style>[\s\S]*?<\/style>/, '')
  .replace(/fill: #0f172a;/g, '')
  .replace(/<polygon/g, '<polygon fill="#fafafa"');

const BG = '#131313'; // oklch(0.08 0 0) — matches app dark background

const sizes = [
  { name: 'apple-touch-icon.png', size: 180, padding: 28 },
  { name: 'icon-192.png', size: 192, padding: 30 },
  { name: 'icon-512.png', size: 512, padding: 80 },
];

for (const { name, size, padding } of sizes) {
  const innerSize = size - padding * 2;
  // SVG viewBox is 20x16, so scale to fit within innerSize
  const scale = innerSize / 20; // width-constrained
  const svgHeight = Math.round(16 * scale);
  const svgWidth = Math.round(20 * scale);

  const resized = await sharp(Buffer.from(fixedSvg)).resize(svgWidth, svgHeight).png().toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      {
        input: resized,
        top: Math.round((size - svgHeight) / 2),
        left: Math.round((size - svgWidth) / 2),
      },
    ])
    .png()
    .toFile(resolve(publicDir, name));

  console.log(`Generated ${name} (${size}x${size})`);
}

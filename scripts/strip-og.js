/**
 * Strip unused @vercel/og files from the bundle to reduce Worker size.
 * This saves ~2 MiB (resvg.wasm + index.edge.js) since the app
 * does not use Next.js OG image generation.
 *
 * Run after `opennextjs-cloudflare build` and before deploy.
 */
const fs = require("fs");
const path = require("path");

const ogDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "next",
  "dist",
  "compiled",
  "@vercel",
  "og"
);

const filesToStub = ["resvg.wasm", "index.edge.js"];

let totalSaved = 0;

for (const file of filesToStub) {
  const filePath = path.join(ogDir, file);
  try {
    const stat = fs.statSync(filePath);
    const originalSize = stat.size;

    if (file.endsWith(".wasm")) {
      // Empty WASM module (magic header only)
      fs.writeFileSync(filePath, Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));
    } else {
      // Empty JS module
      fs.writeFileSync(filePath, "// stripped for bundle size\nexport default {};\n");
    }

    const newSize = fs.statSync(filePath).size;
    const saved = originalSize - newSize;
    totalSaved += saved;
    console.log(
      `  ✓ ${file}: ${(originalSize / 1024).toFixed(1)} KiB → ${(newSize / 1024).toFixed(1)} KiB (saved ${(saved / 1024).toFixed(1)} KiB)`
    );
  } catch (err) {
    console.warn(`  ⚠ ${file}: skipped (${err.message})`);
  }
}

console.log(`\n  Total saved: ${(totalSaved / 1024).toFixed(1)} KiB\n`);

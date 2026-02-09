/**
 * Strip unused Prisma WASM query compiler files from node_modules BEFORE build.
 *
 * This project only uses PostgreSQL, so we stub the WASM files for:
 *   mysql, sqlite, sqlserver, cockroachdb
 *
 * Each unused provider has ~5 MB × 2 formats (.js + .mjs) × 2 sizes (fast + small).
 * Stripping 4 unused providers saves ~55 MB from the bundle.
 *
 * Run BEFORE `opennextjs-cloudflare build` so the bundler picks up stubs.
 */
const fs = require("fs");
const path = require("path");

// Providers to remove (everything except postgresql)
const UNUSED_PROVIDERS = ["mysql", "sqlite", "sqlserver", "cockroachdb"];

// Target: node_modules/@prisma/client/runtime/
const runtimeDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "@prisma",
  "client",
  "runtime"
);

if (!fs.existsSync(runtimeDir)) {
  console.log("  ⚠ @prisma/client/runtime not found, skipping.");
  process.exit(0);
}

let totalSaved = 0;
let filesStripped = 0;

const entries = fs.readdirSync(runtimeDir);

for (const entry of entries) {
  const isUnused = UNUSED_PROVIDERS.some(
    (provider) =>
      entry.includes(`.${provider}.`) &&
      (entry.includes("wasm-base64") || entry.includes("query_compiler"))
  );

  if (!isUnused) continue;

  const fullPath = path.join(runtimeDir, entry);
  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const originalSize = stat.size;

    // Replace with minimal stub
    if (entry.endsWith(".mjs")) {
      fs.writeFileSync(fullPath, "export default {};\n");
    } else {
      fs.writeFileSync(fullPath, "module.exports = {};\n");
    }

    const saved = originalSize - fs.statSync(fullPath).size;
    totalSaved += saved;
    filesStripped++;

    if (saved > 100 * 1024) {
      // Only log files > 100KB
      console.log(
        `  ✓ ${entry}: ${(originalSize / 1024 / 1024).toFixed(1)} MB → stub`
      );
    }
  } catch (err) {
    console.warn(`  ⚠ ${entry}: skipped (${err.message})`);
  }
}

console.log(
  `\n  Prisma strip: ${filesStripped} files, saved ${(totalSaved / 1024 / 1024).toFixed(1)} MB\n`
);

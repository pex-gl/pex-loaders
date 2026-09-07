// Vendors the Draco decoder from the installed draco3d package into
// decoders/draco/, so the shipped assets are always a matched glue/wasm pair
// from a known version. Run after bumping draco3d.
//
// draco3d only publishes the "nodejs" glue, but its Node-specific code sits
// behind a `typeof process === "object" && process.versions.node` runtime
// guard: with a wasmBinary supplied it runs unchanged in a worker. It is
// vendored under Draco's conventional web name so that pointing
// `transcoderPath` at gstatic's versioned CDN keeps working.
import { createRequire } from "node:module";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { version } = require("draco3d/package.json");

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../decoders/draco",
);

const FILES = {
  "draco_decoder_nodejs.js": "draco_wasm_wrapper.js",
  "draco_decoder.wasm": "draco_decoder.wasm",
};

await mkdir(OUT_DIR, { recursive: true });

for (const [from, to] of Object.entries(FILES)) {
  await copyFile(require.resolve(`draco3d/${from}`), join(OUT_DIR, to));
  console.log(`draco3d@${version}: ${from} -> decoders/draco/${to}`);
}

await writeFile(join(OUT_DIR, "VERSION"), `draco3d@${version}\n`);

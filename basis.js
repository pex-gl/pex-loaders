/* eslint-disable unicorn/relative-url-style */
import { loadArrayBuffer } from "pex-io";
import { createTexture } from "pex-gpu";

import WorkerPool from "./worker-pool.js";

// Resolved as package-relative assets so the vendored transcoder works
// unbundled and is picked up as an asset by bundlers, with no copy step.
const WORKER_URL = new URL("./decoders/basis/basis-worker.js", import.meta.url);
const TRANSCODER_URL = new URL(
  "./decoders/basis/basis_transcoder.js",
  import.meta.url,
);
const WASM_URL = new URL(
  "./decoders/basis/basis_transcoder.wasm",
  import.meta.url,
);

/**
 * Basis Universal source encodings.
 *
 * @readonly
 * @enum {number}
 */
const BasisFormat = { ETC1S: 0, UASTC_4x4: 1 };

// Pools are keyed by the configuration that defines them — including the
// device features, which are baked into each worker at init — so a second call
// with a different transcoder or device gets its own pool.
const pools = new Map();

// The worker resolves `transcoderUrl` against its own location, not the page's,
// so every URL has to be absolute by the time it is posted.
const resolve = (path, fallback) =>
  path ? new URL(path, globalThis.location?.href).href : fallback.href;

// Compressed texture families the device can sample, as the transcoder's three
// targets. WebGPU has no PVRTC, ATC or ETC1 equivalent.
const deviceFeatures = (ctx) => ({
  bc: ctx.device.features.has("texture-compression-bc"),
  etc2: ctx.device.features.has("texture-compression-etc2"),
  astc: ctx.device.features.has("texture-compression-astc"),
});

function getPool({ transcoderPath, workerPath, workerLimit, features }) {
  const poolKey = `${transcoderPath ?? ""}|${workerPath ?? ""}|${workerLimit ?? ""}|${features.bc}${features.etc2}${features.astc}`;
  let pool = pools.get(poolKey);
  if (pool) return pool;

  const workerUrl = resolve(workerPath, WORKER_URL);
  const transcoderUrl = resolve(
    transcoderPath && `${transcoderPath}basis_transcoder.js`,
    TRANSCODER_URL,
  );
  const wasmUrl = resolve(
    transcoderPath && `${transcoderPath}basis_transcoder.wasm`,
    WASM_URL,
  );

  // Fetched once and structured-cloned to each worker, rather than refetched
  // per worker.
  let wasmPending;

  pool = new WorkerPool({
    workerLimit,
    createWorker: async () => {
      wasmPending ??= loadArrayBuffer(wasmUrl);
      const worker = new Worker(workerUrl);
      worker.postMessage({
        type: "init",
        config: { transcoderUrl, wasmBinary: await wasmPending, features },
      });
      return worker;
    },
  });

  pools.set(poolKey, pool);
  return pool;
}

/**
 * @typedef {object} BasisOptions
 * @property {string} [transcoderPath] Directory holding `basis_transcoder.js`
 *   and `basis_transcoder.wasm`, with a trailing slash. Defaults to the
 *   transcoder vendored alongside this package.
 * @property {string} [workerPath] Path to `basis-worker.js` — a file, not a
 *   directory, since bundlers emit it under a hashed name. Defaults to the
 *   worker vendored alongside this package.
 * @property {"srgb" | "linear"} [colorSpace="linear"] Selects the `-srgb`
 *   variant of the transcode target. Colour textures generally want "srgb";
 *   normal/roughness maps want "linear".
 * @property {object} [transcodeConfig] Low-level transcode descriptor, supplied
 *   by {@link module:pex-loaders.loadKtx2} for KTX2 containers. Omit for
 *   standalone `.basis` files.
 * @property {number} [workerLimit=4] Maximum number of concurrent transcoder
 *   workers.
 */

/**
 * @typedef {object} BasisLevel
 * @property {Uint8Array} data Transcoded bytes for one mip level.
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {object} BasisResult
 * @property {number} width
 * @property {number} height
 * @property {GPUTextureFormat} format WebGPU format the levels are encoded in.
 * @property {boolean} hasAlpha
 * @property {BasisLevel[]} levels Mip chain, largest first.
 */

/**
 * Transcode a basis file, array buffer, or pre-parsed KTX2 payload into mip
 * levels, without creating a GPU texture.
 *
 * The transcode target is chosen from the device's compressed-texture features
 * — ASTC, then BC7, then ETC2, then BC1/BC3 — falling back to uncompressed
 * `rgba8unorm` when none are available.
 *
 * @param {import("pex-gpu").GpuContext} ctx
 * @param {string | ArrayBuffer | ArrayBuffer[]} urlOrArrayBuffer
 * @param {BasisOptions} [options]
 * @returns {Promise<BasisResult>}
 * @alias module:"pex-loaders".transcodeBasis
 */
async function transcodeBasis(ctx, urlOrArrayBuffer, options = {}) {
  const {
    transcoderPath,
    workerPath,
    workerLimit,
    colorSpace = "linear",
    transcodeConfig,
  } = options;

  const buffers = Array.isArray(urlOrArrayBuffer)
    ? urlOrArrayBuffer
    : [
        urlOrArrayBuffer instanceof ArrayBuffer
          ? urlOrArrayBuffer
          : await loadArrayBuffer(urlOrArrayBuffer),
      ];

  const taskConfig = { colorSpace, ...transcodeConfig };

  // Levels and global data are payload, not configuration: two transcodes of
  // the same buffer with the same settings are the same task.
  // eslint-disable-next-line no-unused-vars
  const { globalData, levels, ...taskConfigForCache } = taskConfig;

  // eslint-disable-next-line no-unused-vars
  const { type, id, ...result } = await getPool({
    transcoderPath,
    workerPath,
    workerLimit,
    features: deviceFeatures(ctx),
  }).run({
    message: { type: "decode", taskConfig, buffers },
    transfer: buffers,
    cost: buffers.reduce((total, { byteLength }) => total + byteLength, 0),
    key: JSON.stringify(taskConfigForCache),
    cacheKey: buffers[0],
  });

  return result;
}

/**
 * Load a basis file or array buffer as a texture.
 *
 * @param {import("pex-gpu").GpuContext} ctx
 * @param {string | ArrayBuffer | ArrayBuffer[]} urlOrArrayBuffer
 * @param {BasisOptions} [options]
 * @returns {Promise<import("pex-gpu").GpuTexture>}
 * @alias module:"pex-loaders".loadBasis
 */
async function loadBasis(ctx, urlOrArrayBuffer, options = {}) {
  const { width, height, format, levels } = await transcodeBasis(
    ctx,
    urlOrArrayBuffer,
    options,
  );
  return createTexture(ctx, {
    label: typeof urlOrArrayBuffer === "string" ? urlOrArrayBuffer : "basis",
    width,
    height,
    format,
    mipLevels: levels.map((level) => level.data),
  });
}

/**
 * Terminate every Basis transcoder worker. Safe to call at any point;
 * subsequent loads transparently start a new pool.
 *
 * @alias module:"pex-loaders".disposeBasis
 */
function disposeBasis() {
  for (const pool of pools.values()) pool.dispose();
  pools.clear();
}

export default loadBasis;
export { BasisFormat, transcodeBasis, disposeBasis };

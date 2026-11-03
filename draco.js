import { loadArrayBuffer } from "pex-io";

import WorkerPool from "./worker-pool.js";

// Resolved as package-relative assets so the vendored decoder works unbundled
// and is picked up as an asset by bundlers, with no copy step. Named after
// Draco's own web layout so `transcoderPath` can point at a CDN mirror such as
// https://www.gstatic.com/draco/versioned/decoders/1.5.7/ instead.
const WORKER_URL = new URL("./decoders/draco/draco-worker.js", import.meta.url);
const WRAPPER_URL = new URL(
  "./decoders/draco/draco_wasm_wrapper.js",
  import.meta.url,
);
const WASM_URL = new URL(
  "./decoders/draco/draco_decoder.wasm",
  import.meta.url,
);

// Suits standalone .drc files, which identify attributes by Draco's five
// named types. glTF does not: KHR_draco_mesh_compression carries explicit
// unique IDs per semantic, so that path replaces this config wholesale and
// sets useUniqueIDs.
const DEFAULT_TRANSCODE_CONFIG = {
  attributeIDs: {
    positions: "POSITION",
    normals: "NORMAL",
    texCoords: "TEX_COORD",
    colors: "COLOR",
  },
  attributeTypes: {
    positions: "Float32Array",
    normals: "Float32Array",
    texCoords: "Float32Array",
    colors: "Float32Array",
  },
  useUniqueIDs: false,
};

// Pools are keyed by the configuration that defines them, so a second call
// with a different transcoder or worker limit gets its own pool instead of
// silently reusing the first one's.
const pools = new Map();

// The worker resolves `wrapperUrl` against its own location, not the page's,
// so every URL has to be absolute by the time it is posted.
const resolve = (path, fallback) =>
  path ? new URL(path, globalThis.location?.href).href : fallback.href;

function getPool({ transcoderPath, workerPath, workerLimit }) {
  const poolKey = `${transcoderPath ?? ""}|${workerPath ?? ""}|${workerLimit ?? ""}`;
  let pool = pools.get(poolKey);
  if (pool) return pool;

  const workerUrl = resolve(workerPath, WORKER_URL);
  const wrapperUrl = resolve(
    transcoderPath && `${transcoderPath}draco_wasm_wrapper.js`,
    WRAPPER_URL,
  );
  const wasmUrl = resolve(
    transcoderPath && `${transcoderPath}draco_decoder.wasm`,
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
        config: { wrapperUrl, wasmBinary: await wasmPending },
      });
      return worker;
    },
  });

  pools.set(poolKey, pool);
  return pool;
}

/**
 * @typedef {object} DracoOptions
 * @property {string} [transcoderPath] Directory holding `draco_wasm_wrapper.js`
 *   and `draco_decoder.wasm`, with a trailing slash. Defaults to the decoder
 *   vendored alongside this package.
 * @property {string} [workerPath] Path to `draco-worker.js` — a file, not a
 *   directory, since bundlers emit it under a hashed name. Defaults to the
 *   worker vendored alongside this package.
 * @property {object} [transcodeConfig] Draco attribute mapping: `attributeIDs`,
 *   `attributeTypes` (TypedArray constructor names) and `useUniqueIDs`. Set
 *   `useUniqueIDs` for glTF-sourced buffers, which identify attributes by
 *   unique ID rather than semantic name.
 * @property {number} [workerLimit=4] Maximum number of concurrent decoder
 *   workers.
 */

/**
 * @typedef {Int8Array
 *   | Uint8Array
 *   | Int16Array
 *   | Uint16Array
 *   | Int32Array
 *   | Uint32Array
 *   | Float32Array} DracoTypedArray
 *   Arrays the Draco decoder outputs.
 */

/**
 * @typedef {object} DracoAttribute
 * @property {DracoTypedArray} data
 * @property {number} itemSize Components per element.
 */

/**
 * Load a Draco file (.drc) or array buffer as geometry attributes.
 *
 * Decoding runs in a pool of workers and the geometry buffers are transferred
 * back, not copied. Returns plain typed arrays: creating GPU buffers from them
 * is left to the caller.
 *
 * @param {string | ArrayBuffer} urlOrArrayBuffer
 * @param {DracoOptions} [options]
 * @returns {Promise<Record<string, DracoAttribute>>} One entry per decoded
 *   attribute, plus `indices` for meshes.
 * @alias module:pex-loaders.loadDraco
 */
async function loadDraco(urlOrArrayBuffer, options = {}) {
  const {
    transcoderPath,
    workerPath,
    transcodeConfig = DEFAULT_TRANSCODE_CONFIG,
    workerLimit,
  } = options;

  const buffer =
    urlOrArrayBuffer instanceof ArrayBuffer
      ? urlOrArrayBuffer
      : await loadArrayBuffer(urlOrArrayBuffer);

  const { geometry } = await getPool({
    transcoderPath,
    workerPath,
    workerLimit,
  }).run({
    message: { type: "decode", taskConfig: transcodeConfig, buffer },
    transfer: [buffer],
    cost: buffer.byteLength,
    key: JSON.stringify(transcodeConfig),
    cacheKey: buffer,
  });

  return geometry;
}

/**
 * Terminate every Draco decoder worker. Safe to call at any point; subsequent
 * `loadDraco` calls transparently start a new pool.
 *
 * @alias module:pex-loaders.disposeDraco
 */
function disposeDraco() {
  for (const pool of pools.values()) pool.dispose();
  pools.clear();
}

export default loadDraco;
export { disposeDraco };

import { loadArrayBuffer } from "pex-io";

import WorkerPool from "./worker-pool.js";

let workerPool;

// Decoder API
let transcoderPending;

const getWorkerStringUrl = (transcoder, worker) => {
  const str = `
${transcoder}
${worker}
DracoWorker()
`;
  return URL.createObjectURL(new Blob([str]));
};

// TODO: draco_decoder.js only
const getTranscoder = async (transcoderPath) =>
  transcoderPending ||
  Promise.all([
    getWorkerStringUrl(
      await (await fetch(`${transcoderPath}draco_wasm_wrapper.js`)).text(),
      await (
        await (await fetch(`${transcoderPath}draco-worker.js`)).text()
      ).replace("module.exports = DracoWorker", ""),
      // DracoWorker.toString()
    ),
    await (await fetch(`${transcoderPath}draco_decoder.wasm`)).arrayBuffer(),
  ]);

function loadGeometry(buffer, taskConfig) {
  const taskKey = JSON.stringify(taskConfig);

  const cachedTask = workerPool.hasTask(taskKey, buffer);
  if (cachedTask) return cachedTask;

  let worker;
  let taskId;

  const geometryPending = workerPool
    .getWorker(transcoderPending, buffer.byteLength)
    .then((workerData) => {
      ({ worker, taskId } = workerData);

      return new Promise((resolve, reject) => {
        worker._callbacks[taskId] = { resolve, reject };

        worker.postMessage({ type: "decode", id: taskId, taskConfig, buffer }, [
          buffer,
        ]);
      });
    })
    .then(({ geometry }) => geometry);

  // Remove task from the task list.
  geometryPending
    .catch(() => true)
    .then(() => {
      if (worker && taskId) {
        workerPool.releaseTask(worker, taskId);
      }
    });

  // Cache the task result.
  workerPool.taskCache.set(buffer, {
    key: taskKey,
    promise: geometryPending,
  });

  return geometryPending;
}

/**
 * @typedef DracoOptions
 * @property {string} [transcoderPath="assets/decoders/draco/"]
 * @property {object} [transcodeConfig={}]
 * @property {number} [workerLimit=4]
 * @property {object} [workerConfig={ astcSupported, etc1Supported, etc2Supported, dxtSupported, bptcSupported, pvrtcSupported }]
 */

/**
 * Load a draco file or array buffer as a texture
 * @alias module:pex-loaders.loadDraco
 * @param {string | ArrayBuffer} data
 * @param {DracoOptions} [options]
 * @returns {Promise<object>}
 */
async function loadDraco(
  data,
  {
    transcoderPath = "assets/decoders/draco/",
    transcodeConfig = {
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
    },

    workerLimit,
    workerConfig,
  } = {},
) {
  if (!workerPool) workerPool = new WorkerPool(workerLimit, workerConfig);

  transcoderPending = getTranscoder(transcoderPath);

  return await loadGeometry(
    data instanceof ArrayBuffer ? data : await loadArrayBuffer(data),
    transcodeConfig,
  );
}

export default loadDraco;

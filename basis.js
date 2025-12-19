import { loadArrayBuffer } from "pex-io";

import WorkerPool from "./worker-pool.js";

let workerPool;

// Constants
const BasisFormat = {
  ETC1S: 0,
  UASTC_4x4: 1,
  // UASTC4x4 = 1,
  // UASTC_HDR_4x4 = 2,
  // ASTC_HDR_6x6 = 3,
  // ASTC_HDR_6x6_INTERMEDIATE = 4,
};

const TranscoderFormat = {
  ETC1: 0,
  ETC2: 1,
  BC1: 2,
  BC3: 3,
  BC4: 4,
  BC5: 5,
  BC7_M6_OPAQUE_ONLY: 6,
  BC7_M5: 7,
  PVRTC1_4_RGB: 8,
  PVRTC1_4_RGBA: 9,
  ASTC_4x4: 10,
  ATC_RGB: 11,
  ATC_RGBA_INTERPOLATED_ALPHA: 12,
  RGBA32: 13,
  RGB565: 14,
  BGR565: 15,
  RGBA4444: 16,
};

const InternalFormat = {
  // RGBAFormat: 1023,
  RGBAFormat: 6408, // gl.RGBA
  RGBA_ASTC_4x4_Format: 37808,
  RGBA_BPTC_Format: 36492,
  RGBA_ETC2_EAC_Format: 37496,
  RGBA_PVRTC_4BPPV1_Format: 35842,
  RGBA_S3TC_DXT5_Format: 33779,
  RGB_ETC1_Format: 36196,
  RGB_ETC2_Format: 37492,
  RGB_PVRTC_4BPPV1_Format: 35840,
  RGB_S3TC_DXT1_Format: 33776,
};

const InternalFormatSRGB = {
  // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_s3tc_srgb/
  COMPRESSED_SRGB_S3TC_DXT1_EXT: 0x8c4c,
  COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT: 0x8c4d,
  COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT: 0x8c4e,
  COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT: 0x8c4f,

  // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_etc/
  COMPRESSED_R11_EAC: 0x9270,
  COMPRESSED_SIGNED_R11_EAC: 0x9271,
  COMPRESSED_RG11_EAC: 0x9272,
  COMPRESSED_SIGNED_RG11_EAC: 0x9273,
  COMPRESSED_RGB8_ETC2: 0x9274,
  COMPRESSED_SRGB8_ETC2: 0x9275,
  COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2: 0x9276,
  COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2: 0x9277,
  COMPRESSED_RGBA8_ETC2_EAC: 0x9278,
  COMPRESSED_SRGB8_ALPHA8_ETC2_EAC: 0x9279,

  // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/
  COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR: 0x93d0,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR: 0x93d1,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR: 0x93d2,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR: 0x93d3,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR: 0x93d4,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR: 0x93d5,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR: 0x93d6,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR: 0x93d7,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR: 0x93d8,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR: 0x93d9,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR: 0x93da,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR: 0x93db,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR: 0x93dc,
  // COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR: 0x93dd,

  // https://registry.khronos.org/webgl/extensions/EXT_texture_compression_bptc/
  COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT: 0x8e8d,
};

// prettier-ignore
const InternalFormatToSRGB = {
  // DXT
  [InternalFormat.RGB_S3TC_DXT1_Format]: InternalFormatSRGB.COMPRESSED_SRGB_S3TC_DXT1_EXT,
  [InternalFormat.RGBA_S3TC_DXT1_Format]: InternalFormatSRGB.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT,
  [InternalFormat.RGBA_S3TC_DXT3_Format]: InternalFormatSRGB.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT,
  [InternalFormat.RGBA_S3TC_DXT5_Format]: InternalFormatSRGB.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT,

  // ETC
  [InternalFormat.RGB_ETC1_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ETC2,
  [InternalFormat.RGB_ETC2_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ETC2,
  [InternalFormat.RGBA_ETC2_EAC_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC,

  // ASTC
  [InternalFormat.RGBA_ASTC_4x4_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR,
  // [InternalFormat.RGBA_ASTC_5x4_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR,
  // [InternalFormat.RGBA_ASTC_5x5_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR,
  // [InternalFormat.RGBA_ASTC_6x5_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR,
  // [InternalFormat.RGBA_ASTC_6x6_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR,
  // [InternalFormat.RGBA_ASTC_8x5_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR,
  // [InternalFormat.RGBA_ASTC_8x6_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR,
  // [InternalFormat.RGBA_ASTC_8x8_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR,
  // [InternalFormat.RGBA_ASTC_10x5_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR,
  // [InternalFormat.RGBA_ASTC_10x6_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR,
  // [InternalFormat.RGBA_ASTC_10x8_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR,
  // [InternalFormat.RGBA_ASTC_10x10_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR,
  // [InternalFormat.RGBA_ASTC_12x10_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR,
  // [InternalFormat.RGBA_ASTC_12x12_Format]: InternalFormatSRGB.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR,

  // BPTC
  [InternalFormat.RGBA_BPTC_Format]: InternalFormatSRGB.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT,
}

// Decoder API
let transcoderPending;

const getWorkerStringUrl = (transcoder, worker) => {
  const str = `const _InternalFormat = ${JSON.stringify(InternalFormat)}
const _TranscoderFormat = ${JSON.stringify(TranscoderFormat)}
const _BasisFormat = ${JSON.stringify(BasisFormat)}
${transcoder}
${worker}
BasisWorker(_InternalFormat, _TranscoderFormat, _BasisFormat)
`;
  return URL.createObjectURL(new Blob([str]));
};

const getTranscoder = async (transcoderPath) =>
  transcoderPending ||
  Promise.all([
    getWorkerStringUrl(
      await (await fetch(`${transcoderPath}basis_transcoder.js`)).text(),
      await (await (await fetch(`${transcoderPath}basis-worker.js`)).text())
        .replace("module.exports = BasisWorker", "")
        .replace("export default BasisWorker;", ""),
      // BasisWorker.toString()
    ),
    await (await fetch(`${transcoderPath}basis_transcoder.wasm`)).arrayBuffer(),
  ]);

// Texture creation
const loadCompressedTexture = async (buffers, taskConfig = {}) => {
  // eslint-disable-next-line no-unused-vars
  const { globalData, levels, ...taskConfigForCache } = taskConfig;
  const taskKey = JSON.stringify(taskConfigForCache);

  const cachedTask = workerPool.hasTask(taskKey, buffers[0]);
  if (cachedTask) return cachedTask;

  let worker;
  let taskId;
  let taskCost = 0;

  for (let i = 0; i < buffers.length; i++) {
    taskCost += buffers[i].byteLength;
  }

  const texturePending = workerPool
    .getWorker(transcoderPending, taskCost)
    .then((workerData) => {
      ({ worker, taskId } = workerData);

      return new Promise((resolve, reject) => {
        worker._callbacks[taskId] = { resolve, reject };

        worker.postMessage(
          {
            type: "decode",
            id: taskId,
            taskConfig,
            buffers,
          },
          buffers,
        );
      });
    })
    .then((message) => {
      // eslint-disable-next-line no-unused-vars
      const { type, id, hasAlpha, ...texture } = message;

      if (taskConfig.colorSpace === "srgb") {
        const srgbInternalFormat = InternalFormatToSRGB[texture.internalFormat];
        if (srgbInternalFormat) {
          texture.internalFormat = srgbInternalFormat;
        } else {
          console.warn(
            `Missing SRGB conversion format for internalFormat "${texture.internalFormat}"`,
          );
        }
      }

      return {
        compressed: texture.internalFormat !== InternalFormat.RGBAFormat,
        ...texture,
      };
    });

  // Remove task from the task list.
  texturePending
    .catch(() => true)
    .then(() => {
      if (worker && taskId) {
        workerPool.releaseTask(worker, taskId);
      }
    });

  workerPool.taskCache.set(buffers[0], {
    key: taskKey,
    promise: texturePending,
  });

  return texturePending;
};

/**
 * @typedef BasisOptions
 * @property {WebGLRenderingContext | WebGL2RenderingContext} gl
 * @property {string} [transcoderPath='assets/decoders/basis/']
 * @property {object} [transcodeConfig={}]
 * @property {number} [workerLimit=4]
 * @property {object} [workerConfig={ astcSupported, etc1Supported, etc2Supported, dxtSupported, bptcSupported, pvrtcSupported }]
 */

/**
 * Load a basis file or array buffer as texture options
 * @alias module:pex-loaders.loadBasis
 * @param {string | ArrayBuffer | ArrayBuffer[]} urlOrArrayBuffer
 * @param {BasisOptions} [options]
 * @returns {Promise<object>}
 */
async function loadBasis(
  urlOrArrayBuffer,
  {
    gl,
    transcoderPath = "assets/decoders/basis/",
    transcodeConfig = {},
    workerLimit,
    workerConfig = {
      astcSupported: !!gl.getExtension("WEBGL_compressed_texture_astc"),
      etc1Supported: !!gl.getExtension("WEBGL_compressed_texture_etc1"),
      etc2Supported: !!gl.getExtension("WEBGL_compressed_texture_etc"),
      dxtSupported: !!gl.getExtension("WEBGL_compressed_texture_s3tc"),
      bptcSupported: !!gl.getExtension("EXT_texture_compression_bptc"),
      pvrtcSupported:
        !!gl.getExtension("WEBGL_compressed_texture_pvrtc") ||
        !!gl.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc"),
    },
  } = {},
) {
  if (!workerPool) workerPool = new WorkerPool(workerLimit, workerConfig);

  transcoderPending = getTranscoder(transcoderPath);

  const hasManyBuffers = Array.isArray(urlOrArrayBuffer);

  const buffers = hasManyBuffers
    ? urlOrArrayBuffer
    : urlOrArrayBuffer instanceof ArrayBuffer
      ? [urlOrArrayBuffer]
      : [await loadArrayBuffer(urlOrArrayBuffer)];

  return await loadCompressedTexture(buffers, transcodeConfig);
}

export default loadBasis;
export { BasisFormat };

import { loadArrayBuffer } from "pex-io";
import { createTexture } from "pex-gpu";

import {
  read as readKTX,
  KHR_DF_MODEL_UASTC,
  KHR_SUPERCOMPRESSION_ZSTD,
  KHR_DF_TRANSFER_SRGB,
  KHR_DF_FLAG_ALPHA_PREMULTIPLIED,
} from "ktx-parse";

import { BasisFormat, transcodeBasis } from "./basis.js";

let zstdPending;

const createZstd = async () => {
  const { ZSTDDecoder } = await import("zstddec");
  const decoder = new ZSTDDecoder();
  await decoder.init();
  return decoder;
};

// Channel IDs within a Basic Data Format Descriptor sample, per colour model.
const KTX2ChannelETC1S = { RGB: 0, RRR: 3, GGG: 4, AAA: 15 };
const KTX2ChannelUASTC = { RGB: 0, RGBA: 3, RRR: 4, RRRG: 5 };

const getAlpha = ({ colorModel, samples }) => {
  return colorModel === KHR_DF_MODEL_UASTC
    ? (samples[0].channelType & 0xf) === KTX2ChannelUASTC.RGBA
    : samples.length === 2 &&
        (samples[1].channelType & 0xf) === KTX2ChannelETC1S.AAA;
};

/**
 * @typedef {object} Ktx2Options
 * @property {import("./basis.js").BasisOptions} [basisOptions={}] Forwarded to
 *   the Basis transcoder. `colorSpace` is taken from the container's transfer
 *   function and cannot be overridden here.
 */

/**
 * @typedef {object} Ktx2Result
 * @property {number} width
 * @property {number} height
 * @property {GPUTextureFormat} format
 * @property {boolean} hasAlpha
 * @property {import("./basis.js").BasisLevel[]} levels
 * @property {boolean} premultipliedAlpha Whether RGB is already scaled by
 *   alpha. WebGPU has no premultiply step for raw uploads, so honouring this is
 *   left to the renderer.
 */

/**
 * Transcode a ktx2 file or array buffer into mip levels, without creating a GPU
 * texture.
 *
 * Handles Basis-compressed payloads (UASTC and ETC1S), optionally
 * zstd-supercompressed. 3D, array and cube textures are not supported yet.
 *
 * - KTX: https://registry.khronos.org/KTX/specs/2.0/ktxspec.v2.html
 * - DFD:
 *   https://registry.khronos.org/DataFormat/specs/1.3/dataformat.1.3.html#basicdescriptor
 *
 * @param {import("pex-gpu").GpuContext} ctx
 * @param {string | ArrayBuffer} urlOrArrayBuffer
 * @param {Ktx2Options} [options]
 * @returns {Promise<Ktx2Result>}
 * @alias module:pex-loaders.transcodeKtx2
 */
async function transcodeKtx2(
  ctx,
  urlOrArrayBuffer,
  { basisOptions = {} } = {},
) {
  const buffer =
    urlOrArrayBuffer instanceof ArrayBuffer
      ? urlOrArrayBuffer
      : await loadArrayBuffer(urlOrArrayBuffer);

  const ktx = readKTX(new Uint8Array(buffer));

  if (ktx.pixelDepth > 0) {
    throw new Error("pex-loaders: loadKtx2 only supports 2D textures.");
  }
  if (ktx.layerCount > 1) {
    throw new Error("pex-loaders: loadKtx2 does not support array textures.");
  }
  if (ktx.faceCount > 1) {
    throw new Error("pex-loaders: loadKtx2 does not support cube textures.");
  }

  const isZstd = ktx.supercompressionScheme === KHR_SUPERCOMPRESSION_ZSTD;
  if (isZstd) zstdPending ??= createZstd();
  const zstd = isZstd ? await zstdPending : null;

  const { pixelWidth: width, pixelHeight: height } = ktx;

  const levels = ktx.levels.map((level, index) => ({
    index,
    width: Math.max(1, width >> index),
    height: Math.max(1, height >> index),
    data: isZstd
      ? zstd.decode(level.levelData, level.uncompressedByteLength)
      : level.levelData,
  }));

  // The Basic Data Format Descriptor block is always the first DFD.
  const dfd = ktx.dataFormatDescriptor[0];
  const basisFormat =
    dfd.colorModel === KHR_DF_MODEL_UASTC
      ? BasisFormat.UASTC_4x4
      : BasisFormat.ETC1S;

  const transcodeConfig = {
    levels,
    width,
    height,
    basisFormat,
    hasAlpha: getAlpha(dfd),
    lowLevel: true,
    ...(basisFormat === BasisFormat.ETC1S && { globalData: ktx.globalData }),
  };

  const result = await transcodeBasis(
    ctx,
    // Level data may share one backing buffer; transfer each distinct one once.
    [...new Set(levels.map((level) => level.data.buffer))],
    {
      ...basisOptions,
      // The container's transfer function decides sRGB, not the caller.
      colorSpace:
        dfd.transferFunction === KHR_DF_TRANSFER_SRGB ? "srgb" : "linear",
      transcodeConfig,
    },
  );

  return {
    ...result,
    premultipliedAlpha: !!(dfd.flags & KHR_DF_FLAG_ALPHA_PREMULTIPLIED),
  };
}

/**
 * Load a ktx2 file or array buffer as a texture.
 *
 * @param {import("pex-gpu").GpuContext} ctx
 * @param {string | ArrayBuffer} urlOrArrayBuffer
 * @param {Ktx2Options} [options]
 * @returns {Promise<import("pex-gpu").GpuTexture>}
 * @alias module:pex-loaders.loadKtx2
 */
async function loadKtx2(ctx, urlOrArrayBuffer, options) {
  const { width, height, format, levels } = await transcodeKtx2(
    ctx,
    urlOrArrayBuffer,
    options,
  );
  return createTexture(ctx, {
    label: typeof urlOrArrayBuffer === "string" ? urlOrArrayBuffer : "ktx2",
    width,
    height,
    format,
    mipLevels: levels.map((level) => level.data),
  });
}

export default loadKtx2;
export { transcodeKtx2 };

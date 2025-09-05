import { loadArrayBuffer } from "pex-io";

import {
  read as readKTX,
  KHR_DF_MODEL_UASTC,
  KHR_SUPERCOMPRESSION_ZSTD,
  KHR_DF_TRANSFER_SRGB,
  KHR_DF_FLAG_ALPHA_PREMULTIPLIED,
} from "ktx-parse";
import { ZSTDDecoder } from "zstddec";

import loadBasis, { BasisFormat } from "./basis.js";

let zstd;
let zstdPending;

const KTX2ChannelETC1S = {
  RGB: 0,
  RRR: 3,
  GGG: 4,
  AAA: 15,
};

const KTX2ChannelUASTC = {
  RGB: 0,
  RGBA: 3,
  RRR: 4,
  RRRG: 5,
};

const getAlpha = ({ colorModel, samples }) => {
  if (colorModel === KHR_DF_MODEL_UASTC) {
    if ((samples[0].channelType & 0xf) === KTX2ChannelUASTC.RGBA) {
      return true;
    }
    return false;
  }

  if (
    samples.length === 2 &&
    (samples[1].channelType & 0xf) === KTX2ChannelETC1S.AAA
  ) {
    return true;
  }
  return false;
};

/**
 * @typedef Ktx2Options
 * @property {import("./basis.js").BasisOptions} [basisOptions={}]
 */

/**
 * Load a ktx2 file or array buffer as texture options
 *
 * - KTX: http://github.khronos.org/KTX-Specification/
 * - DFD: https://www.khronos.org/registry/DataFormat/specs/1.3/dataformat.1.3.html#basicdescriptor
 * @alias module:pex-loaders.loadKtx2
 * @param {string | ArrayBuffer} data
 * @param {Ktx2Options} [options]
 * @returns {Promise<object>}
 */
async function loadKtx2(data, { basisOptions = {} } = {}) {
  const buffer =
    data instanceof ArrayBuffer ? data : await loadArrayBuffer(data);

  const ktx = readKTX(new Uint8Array(buffer));

  if (ktx.pixelDepth > 0) {
    throw new Error("Only 2D textures are currently supported.");
  }

  if (ktx.layerCount > 1) {
    throw new Error("Array textures are not currently supported.");
  }

  if (ktx.faceCount > 1) {
    throw new Error("Cube textures are not currently supported.");
  }

  const isZstd = ktx.supercompressionScheme === KHR_SUPERCOMPRESSION_ZSTD;
  if (isZstd && !zstd) {
    zstd = new ZSTDDecoder();
    zstdPending = zstd.init();
  }
  await zstdPending;

  // Get levels
  const levels = [];
  const width = ktx.pixelWidth;
  const height = ktx.pixelHeight;

  for (let levelIndex = 0; levelIndex < ktx.levels.length; levelIndex++) {
    const levelWidth = Math.max(1, Math.floor(width / 2 ** levelIndex));
    const levelHeight = Math.max(1, Math.floor(height / 2 ** levelIndex));
    let levelData = ktx.levels[levelIndex].levelData;

    if (isZstd) {
      levelData = zstd.decode(
        levelData,
        ktx.levels[levelIndex].uncompressedByteLength,
      );
    }

    levels.push({
      index: levelIndex,
      width: levelWidth,
      height: levelHeight,
      data: levelData,
    });
  }

  // Basic Data Format Descriptor Block is always the first DFD.
  const dfd = ktx.dataFormatDescriptor[0];

  // Parse basis
  const basisFormat =
    dfd.colorModel === KHR_DF_MODEL_UASTC
      ? BasisFormat.UASTC_4x4
      : BasisFormat.ETC1S;

  const parseConfig = {
    levels,
    width: ktx.pixelWidth,
    height: ktx.pixelHeight,
    basisFormat,
    hasAlpha: getAlpha(dfd),
    lowLevel: true,
  };

  if (basisFormat === BasisFormat.ETC1S) {
    parseConfig.globalData = ktx.globalData;
  }

  return (
    // Load regular basis
    loadBasis(
      Array.from(
        levels.reduce((buffers, level) => {
          buffers.add(level.data.buffer);
          return buffers;
        }, new Set()),
      ),
      {
        ...basisOptions,
        transcodeConfig: parseConfig,
      },
    )
      // Add extra ktx props
      .then((texture) => ({
        ...texture,
        // srgb or linear
        // encoding: dfd.transferFunction === KHR_DF_TRANSFER_SRGB ? 3 : 1,
        premultiplyAlpha: !!(dfd.flags & KHR_DF_FLAG_ALPHA_PREMULTIPLIED),
      }))
  );
}

export default loadKtx2;

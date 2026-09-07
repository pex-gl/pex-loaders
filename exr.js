import { loadArrayBuffer } from "pex-io";
import parseExr from "parse-exr";
import { createTexture } from "pex-gpu";

// parse-exr output types, and its RedFormat channel layout for single-channel
// files (three.js constants, carried over by the parser).
const FLOAT_TYPE = 1015;
const HALF_FLOAT_TYPE = 1016;
const RED_FORMAT = 1028;

/**
 * @typedef {object} ExrOptions
 * @property {"rgba16float"|"rgba32float"} [format="rgba16float"] Texture format. Falls back to "rgba16float" when "rgba32float" is requested without the "float32-filterable" feature. Single-channel EXRs upload to the matching "r16float"/"r32float" instead.
 */

/**
 * Load an EXR file (.exr) as a texture.
 *
 * Decodes at the texture's own precision — half-float files skip the
 * Float32Array round trip entirely, since parse-exr emits the half-float bit
 * pattern rgba16float already expects.
 *
 * @param {import("pex-gpu").GpuContext} ctx
 * @param {string | ArrayBuffer} urlOrArrayBuffer
 * @param {ExrOptions} [options]
 * @returns {Promise<import("pex-gpu").GpuTexture>}
 * @alias module:pex-loaders.loadExr
 */
async function loadExr(ctx, urlOrArrayBuffer, options = {}) {
  let format = options.format ?? "rgba16float";

  if (
    format === "rgba32float" &&
    !ctx.device.features.has("float32-filterable")
  ) {
    console.warn(
      "pex-loaders: loadExr",
      `"rgba32float" requested but the "float32-filterable" feature is unavailable; falling back to "rgba16float"`,
    );
    format = "rgba16float";
  }

  const isArrayBuffer = urlOrArrayBuffer instanceof ArrayBuffer;
  const isHalfFloat = format === "rgba16float";

  const {
    width,
    height,
    data,
    format: channels,
  } = parseExr(
    isArrayBuffer ? urlOrArrayBuffer : await loadArrayBuffer(urlOrArrayBuffer),
    isHalfFloat ? HALF_FLOAT_TYPE : FLOAT_TYPE,
  );

  return createTexture(ctx, {
    label: isArrayBuffer ? "exr" : urlOrArrayBuffer,
    width,
    height,
    format:
      channels === RED_FORMAT
        ? isHalfFloat
          ? "r16float"
          : "r32float"
        : format,
    data,
  });
}

export default loadExr;

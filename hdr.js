import { loadArrayBuffer } from "pex-io";
import parseHdr from "parse-hdr";
import { createTexture } from "pex-gpu";

/**
 * @typedef {object} HdrOptions
 * @property {"rgba16float" | "rgba32float"} [format="rgba16float"]
 *   "rgba32float" requires the "float32-filterable" feature, falling back to
 *   "rgba16float" without it.
 */

/**
 * Load a Radiance HDR file (.hdr) as an equirectangular envMap texture.
 *
 * Uploads to rgba16float by default: parse-hdr decodes to a Float32Array, and
 * rgba16float preserves radiance beyond 1.0 while staying filterable for the
 * skybox renderer's linear sampler.
 *
 * @param {import("pex-gpu").GpuContext} ctx
 * @param {string | ArrayBuffer} urlOrArrayBuffer
 * @param {HdrOptions} [options]
 * @returns {Promise<import("pex-gpu").GpuTexture>}
 * @alias module:"pex-loaders".loadHdr
 */
async function loadHdr(ctx, urlOrArrayBuffer, options = {}) {
  let format = options.format ?? "rgba16float";

  if (
    format === "rgba32float" &&
    !ctx.device.features.has("float32-filterable")
  ) {
    console.warn(
      "pex-loaders: loadHdr",
      `"rgba32float" requested but the "float32-filterable" feature is unavailable; falling back to "rgba16float"`,
    );
    format = "rgba16float";
  }

  const isArrayBuffer = urlOrArrayBuffer instanceof ArrayBuffer;

  const { shape, data } = parseHdr(
    isArrayBuffer ? urlOrArrayBuffer : await loadArrayBuffer(urlOrArrayBuffer),
  );

  return createTexture(ctx, {
    label: isArrayBuffer ? "hdr" : urlOrArrayBuffer,
    width: shape[0],
    height: shape[1],
    format,
    data: format === "rgba16float" ? new Float16Array(data) : data,
  });
}

export default loadHdr;

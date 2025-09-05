import { loadArrayBuffer } from "pex-io";
import parseExr from "parse-exr";

/**
 * @typedef ExrOptions
 * @property {number} [type=1015] Float or Half Float WebGL type. (1015 for Float)
 */

/**
 * Load an EXR file or array buffer as a texture
 * @alias module:pex-loaders.loadExr
 * @param {ctx} ctx
 * @param {string | ArrayBuffer} data
 * @param {ExrOptions} [options]
 * @param {ctx.texture2D} [texture] Optionally pass an already created texture resource.
 * @returns {Promise<ctx.texture2D>}
 */
async function loadExr(ctx, data, options, texture) {
  const outputType = options?.type || 1015;
  const isHalfFloat = outputType === 1016;

  const parsed = parseExr(
    data instanceof ArrayBuffer ? data : await loadArrayBuffer(data),
    outputType,
  );

  texture ||= ctx.texture2D({
    width: 1,
    height: 1,
    pixelFormat: ctx.PixelFormat[isHalfFloat ? "RGBA16F" : "RGBA32F"],
    min: ctx.Filter.Linear,
    mag: ctx.Filter.Linear,
  });

  ctx.update(texture, {
    data: parsed.data,
    width: parsed.width,
    height: parsed.height,
  });

  return texture;
}

export default loadExr;

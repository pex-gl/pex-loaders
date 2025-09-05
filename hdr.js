import { loadArrayBuffer } from "pex-io";

import parseHdr from "parse-hdr";

/**
 * Load an HDR file or array buffer as a texture
 * @alias module:pex-loaders.loadHdr
 * @param {ctx} ctx
 * @param {string | ArrayBuffer} data
 * @param {ctx.texture2D} [texture] Optionally pass an already created texture resource.
 * @returns {Promise<ctx.texture2D>}
 */
async function loadHdr(ctx, data, texture) {
  const parsed = parseHdr(
    data instanceof ArrayBuffer ? data : await loadArrayBuffer(data),
  );

  texture ||= ctx.texture2D({
    pixelFormat: ctx.PixelFormat.RGBA32F,
    min: ctx.Filter.Linear,
    mag: ctx.Filter.Linear,
    flipY: true,
  });

  ctx.update(texture, {
    data: parsed.data,
    width: parsed.shape[0],
    height: parsed.shape[1],
  });

  return texture;
}

export default loadHdr;

import { loadArrayBuffer } from "pex-io";
import { utils } from "pex-math";
import * as SHADERS from "pex-shaders";

import { MPFExtractor, extractXMP } from "@monogrid/gainmap-js";

/**
 * Load an Ultra HDR (aka gain map) file or array buffer as a texture
 * @alias module:pex-loaders.loadUltraHdr
 * @param {ctx} ctx
 * @param {string | ArrayBuffer} data
 * @param {ctx.texture2D} [texture] Optionally pass an already created texture resource.
 * @returns {Promise<ctx.texture2D>}
 */
async function loadUltraHdr(ctx, data, texture) {
  const jpegBuffer = new Uint8Array(
    data instanceof ArrayBuffer ? data : await loadArrayBuffer(data),
  );

  // Decode the files into the textures
  const metadata = extractXMP(jpegBuffer);
  if (!metadata) throw new Error("Gain map XMP metadata not found");

  const mpfExtractor = new MPFExtractor({
    extractFII: true,
    extractNonFII: true,
  });
  const images = await mpfExtractor.extract(jpegBuffer);
  if (images.length !== 2) throw new Error("Gain map recovery image not found");

  const sdrBuffer = new Uint8Array(await images[0].arrayBuffer());
  const gainMapBuffer = new Uint8Array(await images[1].arrayBuffer());

  const blobOptions = { type: "image/jpeg" };
  const imageBitmapOptions = { imageOrientation: "flipY" };

  const [sdrImage, gainMapImage] = await Promise.all([
    createImageBitmap(new Blob([sdrBuffer], blobOptions), imageBitmapOptions),
    gainMapBuffer
      ? createImageBitmap(
          new Blob([gainMapBuffer], blobOptions),
          imageBitmapOptions,
        )
      : Promise.resolve(new ImageData(2, 2)),
  ]);

  const sdr = ctx.texture2D({
    data: sdrImage,
    pixelFormat: ctx.PixelFormat.SRGB8,
    encoding: ctx.Encoding.Linear,
    mag: ctx.Filter.Linear,
    min: ctx.Filter.Linear,
  });

  const gainMap = ctx.texture2D({
    data: gainMapImage,
    width: gainMapImage.width,
    height: gainMapImage.height,
    pixelFormat: ctx.PixelFormat.RGBA8,
    encoding: ctx.Encoding.Linear,
    mag: ctx.Filter.Linear,
    min: ctx.Filter.LinearMipmapLinear,
    mipmap: true,
  });

  // Render
  texture ||= ctx.texture2D({
    pixelFormat: ctx.PixelFormat.RGBA16F,
    encoding: ctx.Encoding.Linear,
    min: ctx.Filter.Linear,
    mag: ctx.Filter.Linear,
  });

  ctx.update(texture, {
    width: sdrImage.width,
    height: sdrImage.height,
  });

  const maxDisplayBoost = utils.clamp(
    Math.pow(2, metadata.hdrCapacityMax),
    1,
    65504,
  );
  const weightFactor = utils.clamp(
    (Math.log2(maxDisplayBoost) - metadata.hdrCapacityMin) /
      (metadata.hdrCapacityMax - metadata.hdrCapacityMin),
    0,
    1,
  );

  const cmd = {
    name: "drawGainMap",
    pass: ctx.pass({ color: [texture], clearColor: [0, 0, 0, 1] }),
    pipeline: ctx.pipeline({
      vert: SHADERS.pipeline.blit.vert,
      frag: /* glsl */ `precision highp float;

#define HALF_FLOAT_MIN vec3(-65504, -65504, -65504)
#define HALF_FLOAT_MAX vec3(65504, 65504, 65504)

uniform sampler2D sdr;
uniform sampler2D gainMap;
uniform vec3 gamma;
uniform vec3 offsetHdr;
uniform vec3 offsetSdr;
uniform vec3 gainMapMin;
uniform vec3 gainMapMax;
uniform float weightFactor;

varying vec2 vTexCoord0;

void main() {
  vec3 rgb = texture2D(sdr, vTexCoord0).rgb;
  vec3 recovery = texture2D(gainMap, vTexCoord0).rgb;

  vec3 logRecovery = pow(recovery, gamma);
  vec3 logBoost = gainMapMin * (1.0 - logRecovery) + gainMapMax * logRecovery;
  vec3 hdrColor = (rgb + offsetSdr) * exp2(logBoost * weightFactor) - offsetHdr;
  vec3 clampedHdrColor = max(HALF_FLOAT_MIN, min(HALF_FLOAT_MAX, hdrColor));

  gl_FragColor = vec4(clampedHdrColor, 1.0);
}`,
      depthTest: false,
      depthWrite: false,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(Float32Array.of(-1, -1, 3, -1, -1, 3)),
    },
    count: 3,
    uniforms: {
      sdr,
      gainMap,
      gainMapMin: metadata.gainMapMin,
      gainMapMax: metadata.gainMapMax,
      offsetSdr: metadata.offsetSdr,
      offsetHdr: metadata.offsetHdr,
      gamma: metadata.gamma.map((c) => 1 / c),
      hdrCapacityMin: metadata.hdrCapacityMin,
      hdrCapacityMax: metadata.hdrCapacityMax,
      weightFactor,
    },
  };

  ctx.submit(cmd);

  // Dispose
  ctx.dispose(sdr);
  ctx.dispose(gainMap);
  ctx.dispose(cmd.attributes.aPosition);
  ctx.dispose(cmd.pass);
  ctx.dispose(cmd.pipeline);
  sdrImage.close();
  gainMapImage.close();

  return texture;
}

export default loadUltraHdr;

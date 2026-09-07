import * as gpu from "pex-gpu";

import { loadArrayBuffer } from "pex-io";
import { utils } from "pex-math";

// https://github.com/hsnilsson/MPFExtractor
const extractMPF = async (
  imageArrayBuffer,
  { extractNonFII = true, extractFII = true } = {},
) => {
  const imgs = [];

  const dataView = new DataView(imageArrayBuffer.buffer);
  // If you're executing this line on a big endian machine, it'll be reversed.
  // bigEnd further down though, refers to the endianness of the image itself.
  if (dataView.getUint16(0) !== 0xffd8) throw new Error("Not a valid jpeg");

  const length = dataView.byteLength;
  let offset = 2;
  let loops = 0;
  let marker; // APP# marker

  while (offset < length) {
    if (++loops > 250) {
      throw new Error(`Found no marker after ${loops} loops 😵`);
    }
    if (dataView.getUint8(offset) !== 0xff) {
      throw new Error(
        `Not a valid marker at offset 0x${offset.toString(16)}, found: 0x${dataView.getUint8(offset).toString(16)}`,
      );
    }

    marker = dataView.getUint8(offset + 1);

    if (marker === 0xe2) {
      // Works for iPhone 8 Plus, X, and XSMax. Or any photos of MPF format.
      // Great way to visualize image information in html is using Exiftool. E.g.:
      // ./exiftool.exe -htmldump -wantTrailer photo.jpg > photo.html

      const formatPt = offset + 4;
      /*
       *  Structure of the MP Format Identifier
       *
       *  Offset Addr.  | Code (Hex)  | Description
       *  +00             ff            Marker Prefix      <-- offset
       *  +01             e2            APP2
       *  +02             #n            APP2 Field Length
       *  +03             #n            APP2 Field Length
       *  +04             4d            'M'                <-- formatPt
       *  +05             50            'P'
       *  +06             46            'F'
       *  +07             00            NULL
       *                                                   <-- tiffOffset
       */
      if (dataView.getUint32(formatPt) === 0x4d504600) {
        // Found MPF tag, so we start dig out sub images

        const tiffOffset = formatPt + 4;
        let bigEnd; // Endianness from TIFF header

        // Test for TIFF validity and endianness
        // 0x4949 and 0x4D4D ('II' and 'MM') marks Little Endian and Big Endian
        if (dataView.getUint16(tiffOffset) === 0x4949) {
          bigEnd = false;
        } else if (dataView.getUint16(tiffOffset) === 0x4d4d) {
          bigEnd = true;
        } else {
          throw new Error("No valid endianness marker found in TIFF header");
        }

        if (dataView.getUint16(tiffOffset + 2, !bigEnd) !== 0x002a) {
          throw new Error("Not valid TIFF data! (no 0x002A marker)");
        }

        // 32 bit number stating the offset from the start of the 8 Byte MP Header
        // to MP Index IFD Least possible value is thus 8 (means 0 offset)
        const firstIFDOffset = dataView.getUint32(tiffOffset + 4, !bigEnd);
        if (firstIFDOffset < 0x00000008) {
          throw new Error("Not valid TIFF data! (First offset less than 8)");
        }

        // Move ahead to MP Index IFD
        // Assume we're at the first IFD, so firstIFDOffset points to
        // MP Index IFD and not MP Attributes IFD. (If we try extract from a sub image,
        // we fail silently here due to this assumption)
        // Count (2 Byte) | MP Index Fields a.k.a. MP Entries (count * 12 Byte) | Offset of Next IFD (4 Byte)
        const dirStart = tiffOffset + firstIFDOffset; // Start of IFD (Image File Directory)
        const count = dataView.getUint16(dirStart, !bigEnd); // Count of MPEntries (2 Byte)

        // Extract info from MPEntries (starting after Count)
        const entriesStart = dirStart + 2;
        let numberOfImages = 0;

        for (let i = entriesStart; i < entriesStart + 12 * count; i += 12) {
          // Each entry is 12 Bytes long
          // Check MP Index IFD tags, here we only take tag 0xb001 = Number of images
          if (dataView.getUint16(i, !bigEnd) === 0xb001) {
            // stored in Last 4 bytes of its 12 Byte entry.
            numberOfImages = dataView.getUint32(i + 8, !bigEnd);
          }
        }

        const nextIFDOffsetLen = 4; // 4 Byte offset field that appears after MP Index IFD tags
        const MPImageListValPt = dirStart + 2 + count * 12 + nextIFDOffsetLen;
        const images = [];

        for (
          let i = MPImageListValPt;
          i < MPImageListValPt + numberOfImages * 16;
          i += 16
        ) {
          const image = {
            MPType: dataView.getUint32(i, !bigEnd),
            size: dataView.getUint32(i + 4, !bigEnd),
            // This offset is specified relative to the address of the MP Endian
            // field in the MP Header, unless the image is a First Individual Image,
            // in which case the value of the offset shall be NULL (0x00000000).
            dataOffset: dataView.getUint32(i + 8, !bigEnd),
            dependantImages: dataView.getUint32(i + 12, !bigEnd),
            start: -1,
            end: -1,
            isFII: false,
          };

          if (!image.dataOffset) {
            // dataOffset is 0x00000000 for First Individual Image
            image.start = 0;
            image.isFII = true;
          } else {
            image.start = tiffOffset + image.dataOffset;
            image.isFII = false;
          }
          image.end = image.start + image.size;
          images.push(image);
        }

        if (extractNonFII && images.length) {
          const bufferBlob = new Blob([dataView]);
          for (const image of images) {
            if (image.isFII && !extractFII) continue; // Skip FII

            const imageBlob = bufferBlob.slice(
              image.start,
              image.end + 1,
              "image/jpeg",
            );
            imgs.push(imageBlob);
          }
          break;
        }
      }
    }
    offset += 2 + dataView.getUint16(offset + 2);
  }

  return imgs;
};

// https://github.com/MONOGRID/gainmap-js/blob/c82cc167d369b1fc7ec6cf4e30a7e110cf41ce6c/src/decode/utils/extractXMP.ts
const getAttribute = (description, name, defaultValue) => {
  let returnValue;
  const parsedValue = description.attributes.getNamedItem(name)?.nodeValue;
  if (!parsedValue) {
    const node = description.getElementsByTagName(name)[0];
    if (node) {
      const values = node.getElementsByTagName("rdf:li");
      if (values.length === 3) {
        returnValue = Array.from(values).map((v) => v.innerHTML);
      } else {
        throw new Error(
          `Gainmap metadata contains an array of items for ${name} but its length is not 3`,
        );
      }
    } else {
      if (defaultValue) return defaultValue;
      else throw new Error(`Can't find ${name} in gainmap metadata`);
    }
  } else {
    returnValue = parsedValue;
  }

  return returnValue;
};

const extractXMP = (input) => {
  let str;
  // support node test environment
  if (typeof TextDecoder !== "undefined") str = new TextDecoder().decode(input);
  else str = input.toString();

  let start = str.indexOf("<x:xmpmeta");
  const parser = new DOMParser();

  while (start !== -1) {
    const end = str.indexOf("x:xmpmeta>", start);
    str.slice(start, end + 10);
    const xmpBlock = str.slice(start, end + 10);
    try {
      const xmlDocument = parser.parseFromString(xmpBlock, "text/xml");
      const description =
        xmlDocument.getElementsByTagName("rdf:Description")[0];

      const gainMapMin = getAttribute(description, "hdrgm:GainMapMin", "0");
      const gainMapMax = getAttribute(description, "hdrgm:GainMapMax");

      const gamma = getAttribute(description, "hdrgm:Gamma", "1");

      const offsetSDR = getAttribute(
        description,
        "hdrgm:OffsetSDR",
        "0.015625",
      );
      const offsetHDR = getAttribute(
        description,
        "hdrgm:OffsetHDR",
        "0.015625",
      );

      let hdrCapacityMin = description.attributes.getNamedItem(
        "hdrgm:HDRCapacityMin",
      )?.nodeValue;
      if (!hdrCapacityMin) hdrCapacityMin = "0";

      const hdrCapacityMax = description.attributes.getNamedItem(
        "hdrgm:HDRCapacityMax",
      )?.nodeValue;
      if (!hdrCapacityMax) throw new Error("Incomplete gainmap metadata");

      // prettier-ignore
      return {
        gainMapMin: Array.isArray(gainMapMin) ? gainMapMin.map(v => parseFloat(v)) : [parseFloat(gainMapMin), parseFloat(gainMapMin), parseFloat(gainMapMin)],
        gainMapMax: Array.isArray(gainMapMax) ? gainMapMax.map(v => parseFloat(v)) : [parseFloat(gainMapMax), parseFloat(gainMapMax), parseFloat(gainMapMax)],
        gamma: Array.isArray(gamma) ? gamma.map(v => parseFloat(v)) : [parseFloat(gamma), parseFloat(gamma), parseFloat(gamma)],
        offsetSdr: Array.isArray(offsetSDR) ? offsetSDR.map(v => parseFloat(v)) : [parseFloat(offsetSDR), parseFloat(offsetSDR), parseFloat(offsetSDR)],
        offsetHdr: Array.isArray(offsetHDR) ? offsetHDR.map(v => parseFloat(v)) : [parseFloat(offsetHDR), parseFloat(offsetHDR), parseFloat(offsetHDR)],
        hdrCapacityMin: parseFloat(hdrCapacityMin),
        hdrCapacityMax: parseFloat(hdrCapacityMax)
      };
    } catch (e) {}
    start = str.indexOf("<x:xmpmeta", end);
  }
};

const shader = /* wgsl */ `
struct GainMap {
  gainMapMin: vec3f,
  gainMapMax: vec3f,
  gamma: vec3f,
  offsetSdr: vec3f,
  offsetHdr: vec3f,
  weightFactor: f32,
}
@group(0) @binding(0) var<uniform> gainMap: GainMap;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var sdrTexture: texture_2d<f32>;
@group(0) @binding(3) var gainMapTexture: texture_2d<f32>;

const HALF_FLOAT_MAX = vec3f(65504.0);
const HALF_FLOAT_MIN = vec3f(-65504.0);

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> VertexOut {
  let uv = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return VertexOut(vec4f(uv * 2.0 - 1.0, 0.0, 1.0), uv);
}

@fragment
fn fragmentMain(input: VertexOut) -> @location(0) vec4f {
  // sdrTexture is *-srgb: textureSample returns linear values, as the gain map
  // recovery math requires.
  let rgb = textureSample(sdrTexture, linearSampler, input.uv).rgb;
  let recovery = textureSample(gainMapTexture, linearSampler, input.uv).rgb;

  let logRecovery = pow(recovery, gainMap.gamma);
  let logBoost = mix(gainMap.gainMapMin, gainMap.gainMapMax, logRecovery);
  let hdrColor =
    (rgb + gainMap.offsetSdr) * exp2(logBoost * gainMap.weightFactor) -
    gainMap.offsetHdr;

  return vec4f(clamp(hdrColor, HALF_FLOAT_MIN, HALF_FLOAT_MAX), 1.0);
}
`;

const TEXTURE_FORMAT = "rgba16float";

/**
 * @typedef {object} UltraHdrOptions
 * @property {number} [maxDisplayBoost] Linear headroom to decode for, clamped
 *   to [1, 65504]. Defaults to the file's full capacity (`2 **
 *   hdrCapacityMax`), which decodes at full strength. Pass the display's
 *   headroom (eg. `screen.highDynamicRangeHeadroom`) to decode for what the
 *   screen can actually show.
 */

/**
 * Load an Ultra HDR (aka gain map) file or array buffer as a texture
 *
 * @param {import("pex-gpu").GpuContext} ctx
 * @param {string | ArrayBuffer} urlOrArrayBuffer
 * @param {UltraHdrOptions} [options]
 * @param {import("pex-gpu").GpuTexture} [texture] Optionally pass an already
 *   created texture resource. Reused when it matches the SDR image size and the
 *   rgba16float format, disposed and reallocated otherwise: WebGPU textures
 *   cannot be resized.
 * @returns {Promise<import("pex-gpu").GpuTexture>}
 * @alias module:pex-loaders.loadUltraHdr
 */
async function loadUltraHdr(ctx, urlOrArrayBuffer, options, texture) {
  const jpegBuffer = new Uint8Array(
    urlOrArrayBuffer instanceof ArrayBuffer
      ? urlOrArrayBuffer
      : await loadArrayBuffer(urlOrArrayBuffer),
  );

  // Decode the files into the textures
  const metadata = extractXMP(jpegBuffer);
  if (!metadata) throw new Error("Gain map XMP metadata not found");

  const images = await extractMPF(jpegBuffer);
  if (images.length !== 2) throw new Error("Gain map recovery image not found");

  const sdrBuffer = new Uint8Array(await images[0].arrayBuffer());
  const gainMapBuffer = new Uint8Array(await images[1].arrayBuffer());

  const blobOptions = { type: "image/jpeg" };

  const [sdrImage, gainMapImage] = await Promise.all([
    createImageBitmap(new Blob([sdrBuffer], blobOptions)),
    createImageBitmap(new Blob([gainMapBuffer], blobOptions)),
  ]);

  const sdr = gpu.createTexture(ctx, {
    label: "ultraHdrSdr",
    data: sdrImage,
    format: "rgba8unorm-srgb",
  });

  // Recovery values are raw, not color: no srgb format, no mip chain (gain maps
  // are at most the size of the SDR image, so this only ever magnifies).
  const gainMap = gpu.createTexture(ctx, {
    label: "ultraHdrGainMap",
    data: gainMapImage,
    format: "rgba8unorm",
  });

  const sampler = gpu.createSampler(ctx, { filter: "linear" });

  // Render
  if (
    texture &&
    (texture.width !== sdrImage.width ||
      texture.height !== sdrImage.height ||
      texture.format !== TEXTURE_FORMAT)
  ) {
    texture.dispose();
    texture = undefined;
  }
  texture ||= gpu.createTexture(ctx, {
    label: "ultraHdr",
    width: sdrImage.width,
    height: sdrImage.height,
    format: TEXTURE_FORMAT,
  });

  const maxDisplayBoost = utils.clamp(
    options?.maxDisplayBoost ?? Math.pow(2, metadata.hdrCapacityMax),
    1,
    65504,
  );
  const weightFactor = utils.clamp(
    (Math.log2(maxDisplayBoost) - metadata.hdrCapacityMin) /
      (metadata.hdrCapacityMax - metadata.hdrCapacityMin),
    0,
    1,
  );

  gpu.submit(ctx, {
    label: "drawGainMap",
    pass: {
      colorAttachments: [{ texture, clearValue: [0, 0, 0, 1] }],
    },
    pipeline: { shader },
    // WebGPU render targets are top-left origin, so sampling the fullscreen
    // triangle at its raw uv stores the result bottom-up: the same orientation
    // loadHdr/loadExr produce with flipY.
    count: 3,
    uniforms: {
      gainMap: {
        gainMapMin: metadata.gainMapMin,
        gainMapMax: metadata.gainMapMax,
        gamma: metadata.gamma.map((c) => 1 / c),
        offsetSdr: metadata.offsetSdr,
        offsetHdr: metadata.offsetHdr,
        weightFactor,
      },
      linearSampler: sampler,
      sdrTexture: sdr,
      gainMapTexture: gainMap,
    },
  });

  // Dispose
  sdr.dispose();
  gainMap.dispose();
  sdrImage.close();
  gainMapImage.close();

  return texture;
}

export default loadUltraHdr;

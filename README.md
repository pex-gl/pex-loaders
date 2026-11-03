# pex-loaders

[![npm version](https://img.shields.io/npm/v/pex-loaders)](https://www.npmjs.com/package/pex-loaders)
[![stability-stable](https://img.shields.io/badge/stability-stable-green.svg)](https://www.npmjs.com/package/pex-loaders)
[![npm minzipped size](https://img.shields.io/bundlephobia/minzip/pex-loaders)](https://bundlephobia.com/package/pex-loaders)
[![dependencies](https://img.shields.io/librariesio/release/npm/pex-loaders)](https://github.com/pex-gl/pex-loaders/blob/main/package.json)
[![types](https://img.shields.io/npm/types/pex-loaders)](https://github.com/microsoft/TypeScript)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fa6673.svg)](https://conventionalcommits.org)
[![styled with prettier](https://img.shields.io/badge/styled_with-Prettier-f8bc45.svg?logo=prettier)](https://github.com/prettier/prettier)
[![linted with eslint](https://img.shields.io/badge/linted_with-ES_Lint-4B32C3.svg?logo=eslint)](https://github.com/eslint/eslint)
[![license](https://img.shields.io/github/license/pex-gl/pex-loaders)](https://github.com/pex-gl/pex-loaders/blob/main/LICENSE.md)

Resource loader for [PEX](https://pex.gl).

## Installation

```bash
npm install pex-loaders
```

## Usage

```js
import {
  loadUltraHdr,
  loadHdr,
  loadExr,
  loadDraco,
  loadKtx2,
} from "pex-loaders";
import createContext from "pex-context";

const ctx = createContext();

const getEnvMap = async (ctx, url) => {
  if (url.endsWith(".jpg")) return await loadUltraHdr(ctx, url);
  if (url.endsWith(".hdr")) return await loadHdr(ctx, url);
  if (url.endsWith(".exr")) return await loadExr(ctx, url);

  throw new Error("Unsupported env map file type");
};

const loadDracoGeometry = async (urlOrArrayBuffer) =>
  await loadDraco(urlOrArrayBuffer);

const loadKtxTexture = async (ctx, urlOrArrayBuffer) => {
  return await loadKtx2(urlOrArrayBuffer, {
    basisOptions: {
      gl: ctx.gl,
      transcoderPath: "assets/decoders/basis/",
    },
  });
};
```

## API

<!-- api-start -->

## Modules

<dl>
<dt><a href="#module_pex-loaders">pex-loaders</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#BasisOptions">BasisOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#BasisLevel">BasisLevel</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#BasisResult">BasisResult</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#DracoOptions">DracoOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#DracoTypedArray">DracoTypedArray</a> : <code>Int8Array</code> | <code>Uint8Array</code> | <code>Int16Array</code> | <code>Uint16Array</code> | <code>Int32Array</code> | <code>Uint32Array</code> | <code>Float32Array</code></dt>
<dd><p>Arrays the Draco decoder outputs.</p>
</dd>
<dt><a href="#DracoAttribute">DracoAttribute</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#ExrOptions">ExrOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#HdrOptions">HdrOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#Ktx2Options">Ktx2Options</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#Ktx2Result">Ktx2Result</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#UltraHdrOptions">UltraHdrOptions</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="module_pex-loaders"></a>

## pex-loaders

- [pex-loaders](#module_pex-loaders)
  - [.transcodeBasis(ctx, urlOrArrayBuffer, [options])](#module_pex-loaders.transcodeBasis) ⇒ [<code>Promise.&lt;BasisResult&gt;</code>](#BasisResult)
  - [.loadBasis(ctx, urlOrArrayBuffer, [options])](#module_pex-loaders.loadBasis) ⇒ <code>Promise.&lt;module:pex-gpu~GpuTexture&gt;</code>
  - [.disposeBasis()](#module_pex-loaders.disposeBasis)
  - [.loadDraco(urlOrArrayBuffer, [options])](#module_pex-loaders.loadDraco) ⇒ <code>Promise.&lt;Record.&lt;string, DracoAttribute&gt;&gt;</code>
  - [.disposeDraco()](#module_pex-loaders.disposeDraco)
  - [.loadExr(ctx, urlOrArrayBuffer, [options])](#module_pex-loaders.loadExr) ⇒ <code>Promise.&lt;module:pex-gpu~GpuTexture&gt;</code>
  - [.loadHdr(ctx, urlOrArrayBuffer, [options])](#module_pex-loaders.loadHdr) ⇒ <code>Promise.&lt;module:pex-gpu~GpuTexture&gt;</code>
  - [.transcodeKtx2(ctx, urlOrArrayBuffer, [options])](#module_pex-loaders.transcodeKtx2) ⇒ [<code>Promise.&lt;Ktx2Result&gt;</code>](#Ktx2Result)
  - [.loadKtx2(ctx, urlOrArrayBuffer, [options])](#module_pex-loaders.loadKtx2) ⇒ <code>Promise.&lt;module:pex-gpu~GpuTexture&gt;</code>
  - [.loadUltraHdr(ctx, urlOrArrayBuffer, [options], [texture])](#module_pex-loaders.loadUltraHdr) ⇒ <code>Promise.&lt;module:pex-gpu~GpuTexture&gt;</code>

<a name="module_pex-loaders.transcodeBasis"></a>

### pex-loaders.transcodeBasis(ctx, urlOrArrayBuffer, [options]) ⇒ [<code>Promise.&lt;BasisResult&gt;</code>](#BasisResult)

Transcode a basis file, array buffer, or pre-parsed KTX2 payload into mip
levels, without creating a GPU texture.

The transcode target is chosen from the device's compressed-texture features
— ASTC, then BC7, then ETC2, then BC1/BC3 — falling back to uncompressed
`rgba8unorm` when none are available.

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param            | Type                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| ctx              | <code>module:pex-gpu~GpuContext</code>                                                    |
| urlOrArrayBuffer | <code>string</code> \| <code>ArrayBuffer</code> \| <code>Array.&lt;ArrayBuffer&gt;</code> |
| [options]        | [<code>BasisOptions</code>](#BasisOptions)                                                |

<a name="module_pex-loaders.loadBasis"></a>

### pex-loaders.loadBasis(ctx, urlOrArrayBuffer, [options]) ⇒ <code>Promise.&lt;module:pex-gpu~GpuTexture&gt;</code>

Load a basis file or array buffer as a texture.

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param            | Type                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| ctx              | <code>module:pex-gpu~GpuContext</code>                                                    |
| urlOrArrayBuffer | <code>string</code> \| <code>ArrayBuffer</code> \| <code>Array.&lt;ArrayBuffer&gt;</code> |
| [options]        | [<code>BasisOptions</code>](#BasisOptions)                                                |

<a name="module_pex-loaders.disposeBasis"></a>

### pex-loaders.disposeBasis()

Terminate every Basis transcoder worker. Safe to call at any point;
subsequent loads transparently start a new pool.

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)
<a name="module_pex-loaders.loadDraco"></a>

### pex-loaders.loadDraco(urlOrArrayBuffer, [options]) ⇒ <code>Promise.&lt;Record.&lt;string, DracoAttribute&gt;&gt;</code>

Load a Draco file (.drc) or array buffer as geometry attributes.

Decoding runs in a pool of workers and the geometry buffers are transferred
back, not copied. Returns plain typed arrays: creating GPU buffers from them
is left to the caller.

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)
**Returns**: <code>Promise.&lt;Record.&lt;string, DracoAttribute&gt;&gt;</code> - One entry per decoded
attribute, plus `indices` for meshes.

| Param            | Type                                            |
| ---------------- | ----------------------------------------------- |
| urlOrArrayBuffer | <code>string</code> \| <code>ArrayBuffer</code> |
| [options]        | [<code>DracoOptions</code>](#DracoOptions)      |

<a name="module_pex-loaders.disposeDraco"></a>

### pex-loaders.disposeDraco()

Terminate every Draco decoder worker. Safe to call at any point; subsequent
`loadDraco` calls transparently start a new pool.

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)
<a name="module_pex-loaders.loadExr"></a>

### pex-loaders.loadExr(ctx, urlOrArrayBuffer, [options]) ⇒ <code>Promise.&lt;module:pex-gpu~GpuTexture&gt;</code>

Load an EXR file (.exr) as a texture.

Decodes at the texture's own precision — half-float files skip the
Float32Array round trip entirely, since parse-exr emits the half-float bit
pattern rgba16float already expects.

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param            | Type                                            |
| ---------------- | ----------------------------------------------- |
| ctx              | <code>module:pex-gpu~GpuContext</code>          |
| urlOrArrayBuffer | <code>string</code> \| <code>ArrayBuffer</code> |
| [options]        | [<code>ExrOptions</code>](#ExrOptions)          |

<a name="module_pex-loaders.loadHdr"></a>

### pex-loaders.loadHdr(ctx, urlOrArrayBuffer, [options]) ⇒ <code>Promise.&lt;module:pex-gpu~GpuTexture&gt;</code>

Load a Radiance HDR file (.hdr) as an equirectangular envMap texture.

Uploads to rgba16float by default: parse-hdr decodes to a Float32Array, and
rgba16float preserves radiance beyond 1.0 while staying filterable for the
skybox renderer's linear sampler.

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param            | Type                                            |
| ---------------- | ----------------------------------------------- |
| ctx              | <code>module:pex-gpu~GpuContext</code>          |
| urlOrArrayBuffer | <code>string</code> \| <code>ArrayBuffer</code> |
| [options]        | [<code>HdrOptions</code>](#HdrOptions)          |

<a name="module_pex-loaders.transcodeKtx2"></a>

### pex-loaders.transcodeKtx2(ctx, urlOrArrayBuffer, [options]) ⇒ [<code>Promise.&lt;Ktx2Result&gt;</code>](#Ktx2Result)

Transcode a ktx2 file or array buffer into mip levels, without creating a GPU
texture.

Handles Basis-compressed payloads (UASTC and ETC1S), optionally
zstd-supercompressed. 3D, array and cube textures are not supported yet.

- KTX: https://registry.khronos.org/KTX/specs/2.0/ktxspec.v2.html
- DFD:
  https://registry.khronos.org/DataFormat/specs/1.3/dataformat.1.3.html#basicdescriptor

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param            | Type                                            |
| ---------------- | ----------------------------------------------- |
| ctx              | <code>module:pex-gpu~GpuContext</code>          |
| urlOrArrayBuffer | <code>string</code> \| <code>ArrayBuffer</code> |
| [options]        | [<code>Ktx2Options</code>](#Ktx2Options)        |

<a name="module_pex-loaders.loadKtx2"></a>

### pex-loaders.loadKtx2(ctx, urlOrArrayBuffer, [options]) ⇒ <code>Promise.&lt;module:pex-gpu~GpuTexture&gt;</code>

Load a ktx2 file or array buffer as a texture.

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param            | Type                                            |
| ---------------- | ----------------------------------------------- |
| ctx              | <code>module:pex-gpu~GpuContext</code>          |
| urlOrArrayBuffer | <code>string</code> \| <code>ArrayBuffer</code> |
| [options]        | [<code>Ktx2Options</code>](#Ktx2Options)        |

<a name="module_pex-loaders.loadUltraHdr"></a>

### pex-loaders.loadUltraHdr(ctx, urlOrArrayBuffer, [options], [texture]) ⇒ <code>Promise.&lt;module:pex-gpu~GpuTexture&gt;</code>

Load an Ultra HDR (aka gain map) file or array buffer as a texture

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param            | Type                                             | Description                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ctx              | <code>module:pex-gpu~GpuContext</code>           |                                                                                                                                                                                                   |
| urlOrArrayBuffer | <code>string</code> \| <code>ArrayBuffer</code>  |                                                                                                                                                                                                   |
| [options]        | [<code>UltraHdrOptions</code>](#UltraHdrOptions) |                                                                                                                                                                                                   |
| [texture]        | <code>module:pex-gpu~GpuTexture</code>           | Optionally pass an already created texture resource. Reused when it matches the SDR image size and the rgba16float format, disposed and reallocated otherwise: WebGPU textures cannot be resized. |

<a name="BasisFormat"></a>

## BasisFormat : <code>enum</code>

Basis Universal source encodings.

**Kind**: global enum
**Read only**: true
**Properties**

| Name      | Type                | Default        |
| --------- | ------------------- | -------------- |
| ETC1S     | <code>number</code> | <code>0</code> |
| UASTC_4x4 | <code>number</code> | <code>1</code> |

<a name="BasisOptions"></a>

## BasisOptions : <code>object</code>

**Kind**: global typedef
**Properties**

| Name              | Type                                                             | Default                         | Description                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [transcoderPath]  | <code>string</code>                                              |                                 | Directory holding `basis_transcoder.js` and `basis_transcoder.wasm`, with a trailing slash. Defaults to the transcoder vendored alongside this package.  |
| [workerPath]      | <code>string</code>                                              |                                 | Path to `basis-worker.js` — a file, not a directory, since bundlers emit it under a hashed name. Defaults to the worker vendored alongside this package. |
| [colorSpace]      | <code>&quot;srgb&quot;</code> \| <code>&quot;linear&quot;</code> | <code>&quot;linear&quot;</code> | Selects the `-srgb` variant of the transcode target. Colour textures generally want "srgb"; normal/roughness maps want "linear".                         |
| [transcodeConfig] | <code>object</code>                                              |                                 | Low-level transcode descriptor, supplied by [loadKtx2](#module_pex-loaders.loadKtx2) for KTX2 containers. Omit for standalone `.basis` files.            |
| [workerLimit]     | <code>number</code>                                              | <code>4</code>                  | Maximum number of concurrent transcoder workers.                                                                                                         |

<a name="BasisLevel"></a>

## BasisLevel : <code>object</code>

**Kind**: global typedef
**Properties**

| Name   | Type                    | Description                         |
| ------ | ----------------------- | ----------------------------------- |
| data   | <code>Uint8Array</code> | Transcoded bytes for one mip level. |
| width  | <code>number</code>     |                                     |
| height | <code>number</code>     |                                     |

<a name="BasisResult"></a>

## BasisResult : <code>object</code>

**Kind**: global typedef
**Properties**

| Name     | Type                                                 | Description                              |
| -------- | ---------------------------------------------------- | ---------------------------------------- |
| width    | <code>number</code>                                  |                                          |
| height   | <code>number</code>                                  |                                          |
| format   | <code>GPUTextureFormat</code>                        | WebGPU format the levels are encoded in. |
| hasAlpha | <code>boolean</code>                                 |                                          |
| levels   | [<code>Array.&lt;BasisLevel&gt;</code>](#BasisLevel) | Mip chain, largest first.                |

<a name="DracoOptions"></a>

## DracoOptions : <code>object</code>

**Kind**: global typedef
**Properties**

| Name              | Type                | Default        | Description                                                                                                                                                                                                                 |
| ----------------- | ------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [transcoderPath]  | <code>string</code> |                | Directory holding `draco_wasm_wrapper.js` and `draco_decoder.wasm`, with a trailing slash. Defaults to the decoder vendored alongside this package.                                                                         |
| [workerPath]      | <code>string</code> |                | Path to `draco-worker.js` — a file, not a directory, since bundlers emit it under a hashed name. Defaults to the worker vendored alongside this package.                                                                    |
| [transcodeConfig] | <code>object</code> |                | Draco attribute mapping: `attributeIDs`, `attributeTypes` (TypedArray constructor names) and `useUniqueIDs`. Set `useUniqueIDs` for glTF-sourced buffers, which identify attributes by unique ID rather than semantic name. |
| [workerLimit]     | <code>number</code> | <code>4</code> | Maximum number of concurrent decoder workers.                                                                                                                                                                               |

<a name="DracoTypedArray"></a>

## DracoTypedArray : <code>Int8Array</code> \| <code>Uint8Array</code> \| <code>Int16Array</code> \| <code>Uint16Array</code> \| <code>Int32Array</code> \| <code>Uint32Array</code> \| <code>Float32Array</code>

Arrays the Draco decoder outputs.

**Kind**: global typedef
<a name="DracoAttribute"></a>

## DracoAttribute : <code>object</code>

**Kind**: global typedef
**Properties**

| Name     | Type                                             | Description             |
| -------- | ------------------------------------------------ | ----------------------- |
| data     | [<code>DracoTypedArray</code>](#DracoTypedArray) |                         |
| itemSize | <code>number</code>                              | Components per element. |

<a name="ExrOptions"></a>

## ExrOptions : <code>object</code>

**Kind**: global typedef
**Properties**

| Name     | Type                                                                         | Default                              | Description                                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [format] | <code>&quot;rgba16float&quot;</code> \| <code>&quot;rgba32float&quot;</code> | <code>&quot;rgba16float&quot;</code> | Texture format. Falls back to "rgba16float" when "rgba32float" is requested without the "float32-filterable" feature. Single-channel EXRs upload to the matching "r16float"/"r32float" instead. |

<a name="HdrOptions"></a>

## HdrOptions : <code>object</code>

**Kind**: global typedef
**Properties**

| Name     | Type                                                                         | Default                              | Description                                                                                        |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [format] | <code>&quot;rgba16float&quot;</code> \| <code>&quot;rgba32float&quot;</code> | <code>&quot;rgba16float&quot;</code> | "rgba32float" requires the "float32-filterable" feature, falling back to "rgba16float" without it. |

<a name="Ktx2Options"></a>

## Ktx2Options : <code>object</code>

**Kind**: global typedef
**Properties**

| Name           | Type                                       | Default         | Description                                                                                                                    |
| -------------- | ------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [basisOptions] | [<code>BasisOptions</code>](#BasisOptions) | <code>{}</code> | Forwarded to the Basis transcoder. `colorSpace` is taken from the container's transfer function and cannot be overridden here. |

<a name="Ktx2Result"></a>

## Ktx2Result : <code>object</code>

**Kind**: global typedef
**Properties**

| Name               | Type                                                 | Description                                                                                                                        |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| width              | <code>number</code>                                  |                                                                                                                                    |
| height             | <code>number</code>                                  |                                                                                                                                    |
| format             | <code>GPUTextureFormat</code>                        |                                                                                                                                    |
| hasAlpha           | <code>boolean</code>                                 |                                                                                                                                    |
| levels             | [<code>Array.&lt;BasisLevel&gt;</code>](#BasisLevel) |                                                                                                                                    |
| premultipliedAlpha | <code>boolean</code>                                 | Whether RGB is already scaled by alpha. WebGPU has no premultiply step for raw uploads, so honouring this is left to the renderer. |

<a name="UltraHdrOptions"></a>

## UltraHdrOptions : <code>object</code>

**Kind**: global typedef
**Properties**

| Name              | Type                | Description                                                                                                                                                                                                                                                                |
| ----------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [maxDisplayBoost] | <code>number</code> | Linear headroom to decode for, clamped to [1, 65504]. Defaults to the file's full capacity (`2 **   hdrCapacityMax`), which decodes at full strength. Pass the display's headroom (eg. `screen.highDynamicRangeHeadroom`) to decode for what the screen can actually show. |

<!-- api-end -->

## License

MIT. See [license file](https://github.com/pex-gl/pex-loaders/blob/main/LICENSE.md).

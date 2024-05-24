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
import { loadUltraHdr, loadHdr, loadExr } from "pex-loaders";

const getEnvMap = async (ctx, url) => {
  if (url.endsWith(".jpg")) return await loadUltraHdr(ctx, url);
  if (url.endsWith(".hdr")) return await loadHdr(ctx, url);
  if (url.endsWith(".exr")) return await loadExr(ctx, url);

  throw new Error("Unsupported env map file type");
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
<dt><a href="#BasisOptions">BasisOptions</a></dt>
<dd></dd>
<dt><a href="#DracoOptions">DracoOptions</a></dt>
<dd></dd>
<dt><a href="#ExrOptions">ExrOptions</a></dt>
<dd></dd>
<dt><a href="#Ktx2Options">Ktx2Options</a></dt>
<dd></dd>
</dl>

<a name="module_pex-loaders"></a>

## pex-loaders

- [pex-loaders](#module_pex-loaders)
  - [.loadBasis(data, [options])](#module_pex-loaders.loadBasis) ⇒ <code>Promise.&lt;object&gt;</code>
  - [.loadDraco(data, [options])](#module_pex-loaders.loadDraco) ⇒ <code>Promise.&lt;object&gt;</code>
  - [.loadExr(ctx, data, [options], [texture])](#module_pex-loaders.loadExr) ⇒ <code>Promise.&lt;ctx.texture2D&gt;</code>
  - [.loadHdr(ctx, data, [texture])](#module_pex-loaders.loadHdr) ⇒ <code>Promise.&lt;ctx.texture2D&gt;</code>
  - [.loadKtx2(data, [options])](#module_pex-loaders.loadKtx2) ⇒ <code>Promise.&lt;object&gt;</code>
  - [.loadUltraHdr(ctx, data, [texture])](#module_pex-loaders.loadUltraHdr) ⇒ <code>Promise.&lt;ctx.texture2D&gt;</code>

<a name="module_pex-loaders.loadBasis"></a>

### pex-loaders.loadBasis(data, [options]) ⇒ <code>Promise.&lt;object&gt;</code>

Load a basis file or array buffer as texture options

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param     | Type                                            |
| --------- | ----------------------------------------------- |
| data      | <code>string</code> \| <code>ArrayBuffer</code> |
| [options] | [<code>BasisOptions</code>](#BasisOptions)      |

<a name="module_pex-loaders.loadDraco"></a>

### pex-loaders.loadDraco(data, [options]) ⇒ <code>Promise.&lt;object&gt;</code>

Load a draco file or array buffer as a texture

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param     | Type                                            |
| --------- | ----------------------------------------------- |
| data      | <code>string</code> \| <code>ArrayBuffer</code> |
| [options] | [<code>DracoOptions</code>](#DracoOptions)      |

<a name="module_pex-loaders.loadExr"></a>

### pex-loaders.loadExr(ctx, data, [options], [texture]) ⇒ <code>Promise.&lt;ctx.texture2D&gt;</code>

Load an EXR file or array buffer as a texture

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param     | Type                                            | Description                                          |
| --------- | ----------------------------------------------- | ---------------------------------------------------- |
| ctx       | <code>ctx</code>                                |                                                      |
| data      | <code>string</code> \| <code>ArrayBuffer</code> |                                                      |
| [options] | [<code>ExrOptions</code>](#ExrOptions)          |                                                      |
| [texture] | <code>ctx.texture2D</code>                      | Optionally pass an already created texture resource. |

<a name="module_pex-loaders.loadHdr"></a>

### pex-loaders.loadHdr(ctx, data, [texture]) ⇒ <code>Promise.&lt;ctx.texture2D&gt;</code>

Load an HDR file or array buffer as a texture

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param     | Type                                            | Description                                          |
| --------- | ----------------------------------------------- | ---------------------------------------------------- |
| ctx       | <code>ctx</code>                                |                                                      |
| data      | <code>string</code> \| <code>ArrayBuffer</code> |                                                      |
| [texture] | <code>ctx.texture2D</code>                      | Optionally pass an already created texture resource. |

<a name="module_pex-loaders.loadKtx2"></a>

### pex-loaders.loadKtx2(data, [options]) ⇒ <code>Promise.&lt;object&gt;</code>

Load a ktx2 file or array buffer as texture options

- KTX: http://github.khronos.org/KTX-Specification/
- DFD: https://www.khronos.org/registry/DataFormat/specs/1.3/dataformat.1.3.html#basicdescriptor

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param     | Type                                            |
| --------- | ----------------------------------------------- |
| data      | <code>string</code> \| <code>ArrayBuffer</code> |
| [options] | [<code>Ktx2Options</code>](#Ktx2Options)        |

<a name="module_pex-loaders.loadUltraHdr"></a>

### pex-loaders.loadUltraHdr(ctx, data, [texture]) ⇒ <code>Promise.&lt;ctx.texture2D&gt;</code>

Load an Ultra HDR (aka gain map) file or array buffer as a texture

**Kind**: static method of [<code>pex-loaders</code>](#module_pex-loaders)

| Param     | Type                                            | Description                                          |
| --------- | ----------------------------------------------- | ---------------------------------------------------- |
| ctx       | <code>ctx</code>                                |                                                      |
| data      | <code>string</code> \| <code>ArrayBuffer</code> |                                                      |
| [texture] | <code>ctx.texture2D</code>                      | Optionally pass an already created texture resource. |

<a name="BasisOptions"></a>

## BasisOptions

**Kind**: global typedef
**Properties**

| Name              | Type                                                                      | Default                                                                                                   |
| ----------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| gl                | <code>WebGLRenderingContext</code> \| <code>WebGL2RenderingContext</code> |                                                                                                           |
| [transcoderPath]  | <code>string</code>                                                       | <code>&quot;&#x27;assets/decoders/basis/&#x27;&quot;</code>                                               |
| [transcodeConfig] | <code>object</code>                                                       | <code>{}</code>                                                                                           |
| [workerLimit]     | <code>number</code>                                                       | <code>4</code>                                                                                            |
| [workerConfig]    | <code>object</code>                                                       | <code>{ astcSupported, etc1Supported, etc2Supported, dxtSupported, bptcSupported, pvrtcSupported }</code> |

<a name="DracoOptions"></a>

## DracoOptions

**Kind**: global typedef
**Properties**

| Name              | Type                | Default                                                     |
| ----------------- | ------------------- | ----------------------------------------------------------- |
| [transcoderPath]  | <code>string</code> | <code>&quot;&#x27;assets/decoders/draco/&#x27;&quot;</code> |
| [transcodeConfig] | <code>object</code> | <code>{}</code>                                             |
| [workerLimit]     | <code>number</code> | <code>4</code>                                              |
| [workerConfig]    | <code>object</code> | <code>{}</code>                                             |

<a name="ExrOptions"></a>

## ExrOptions

**Kind**: global typedef
**Properties**

| Name   | Type                | Default           | Description                                      |
| ------ | ------------------- | ----------------- | ------------------------------------------------ |
| [type] | <code>number</code> | <code>1015</code> | Float or Half Float WebGL type. (1015 for Float) |

<a name="Ktx2Options"></a>

## Ktx2Options

**Kind**: global typedef
**Properties**

| Name           | Type                                       | Default         |
| -------------- | ------------------------------------------ | --------------- |
| [basisOptions] | [<code>BasisOptions</code>](#BasisOptions) | <code>{}</code> |

<!-- api-end -->

## License

MIT. See [license file](https://github.com/pex-gl/pex-loaders/blob/main/LICENSE.md).

# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

# [2.0.0-alpha.5](https://github.com/pex-gl/pex-loaders/compare/v2.0.0-alpha.4...v2.0.0-alpha.5) (2026-11-25)

### Bug Fixes

* upload exr and ultra-hdr envmaps top-down ([18776d7](https://github.com/pex-gl/pex-loaders/commit/18776d7bd79448db66e6c7086116d65f6f7eb6e8))

# [2.0.0-alpha.4](https://github.com/pex-gl/pex-loaders/compare/v2.0.0-alpha.3...v2.0.0-alpha.4) (2026-11-03)

### Performance Improvements

* lazy load zstddec and parse-exr ([41a1bc7](https://github.com/pex-gl/pex-loaders/commit/41a1bc7b97d87a6e9651204330d5f7ca5689c730))

# [2.0.0-alpha.3](https://github.com/pex-gl/pex-loaders/compare/v2.0.0-alpha.2...v2.0.0-alpha.3) (2026-11-03)

# [2.0.0-alpha.2](https://github.com/pex-gl/pex-loaders/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2026-09-24)

# [2.0.0-alpha.1](https://github.com/pex-gl/pex-loaders/compare/v2.0.0-alpha.0...v2.0.0-alpha.1) (2026-09-16)



# [2.0.0-alpha.0](https://github.com/pex-gl/pex-loaders/compare/v1.2.1...v2.0.0-alpha.0) (2026-09-16)


### Features

* upgrade basis/ktx2 + fix worker-pool concurrency ([5db0437](https://github.com/pex-gl/pex-loaders/commit/5db043706a36d1c35bd14dad7055e1d9a5611c8a))
* upgrade draco and worker pool ([bbb916c](https://github.com/pex-gl/pex-loaders/commit/bbb916c98cb6e6be0f8bb51a2c09133d6fdfebd1))
* upgrade exr, hdr and ultra-hdr for pex-gpu ([f72a4c2](https://github.com/pex-gl/pex-loaders/commit/f72a4c23eae5076954a03ec866d66155a10dd1a8))



## [1.2.1](https://github.com/pex-gl/pex-loaders/compare/v1.2.0...v1.2.1) (2025-12-19)


### Bug Fixes

* use export default for BasisWorker ([7dd8963](https://github.com/pex-gl/pex-loaders/commit/7dd896363d2d897d751f3550400ee8cfb67b7585))



# [1.2.0](https://github.com/pex-gl/pex-loaders/compare/v1.1.0...v1.2.0) (2025-09-19)


### Features

* expose worker pool decoders workers ([d20f401](https://github.com/pex-gl/pex-loaders/commit/d20f40175b0d397eefe5369292a110c1cc91d230))
* handle srgb textures in ktx/basis ([f5bf102](https://github.com/pex-gl/pex-loaders/commit/f5bf10298f9feed588601b69e3afc216535b57b9))



# [1.1.0](https://github.com/pex-gl/pex-loaders/compare/v1.0.0...v1.1.0) (2025-09-05)


### Features

* add support for pex-context v4 ([7a79af8](https://github.com/pex-gl/pex-loaders/commit/7a79af833e5ec13dbfbfe455c7e2d41d44cf7702))



# [1.0.0](https://github.com/pex-gl/pex-loaders/compare/v1.0.0-alpha.4...v1.0.0) (2025-08-22)



# [1.0.0-alpha.4](https://github.com/pex-gl/pex-loaders/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2024-05-24)


### Features

* add parse-exr ([36e370b](https://github.com/pex-gl/pex-loaders/commit/36e370b8a5746de61864e857ba07d1bece86ec6a))



# [1.0.0-alpha.3](https://github.com/pex-gl/pex-loaders/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2024-05-15)



# [1.0.0-alpha.2](https://github.com/pex-gl/pex-loaders/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2024-05-15)


### Bug Fixes

* set pixelFormat depending on output type in exr ([b492045](https://github.com/pex-gl/pex-loaders/commit/b4920452fd95e4daba6e6712533c514d38e67475))



# [1.0.0-alpha.1](https://github.com/pex-gl/pex-loaders/compare/v1.0.0-alpha.0...v1.0.0-alpha.1) (2024-05-15)


### Bug Fixes

* add extract MPF and XMP for ultra hdr ([1b8c1bb](https://github.com/pex-gl/pex-loaders/commit/1b8c1bbe28bcf824858dd9a2951f3d256c781a5e))



# [1.0.0-alpha.0](https://github.com/pex-gl/pex-loaders/compare/v0.0.1...v1.0.0-alpha.0) (2024-05-15)


### Bug Fixes

* add missing exr options ([a8bd7ec](https://github.com/pex-gl/pex-loaders/commit/a8bd7ec85b1802385921c025e7c7088a255e68e5))


### Build System

* update ktx-parse ([eb710b7](https://github.com/pex-gl/pex-loaders/commit/eb710b7275fabe2d9890b2bf345d1d190b8d96c7))


### Features

* add ultra-hdr (gain map), hdr and exr ([7c7a1d6](https://github.com/pex-gl/pex-loaders/commit/7c7a1d6c1355cb03ed0cfd65b6fa4652884e5e6b))
* expose basis ([1e1342f](https://github.com/pex-gl/pex-loaders/commit/1e1342fe51681478e3ecb9b7551f81da6ef12249))
* uniformise basis draco and ktx2 parameters ([64ddb89](https://github.com/pex-gl/pex-loaders/commit/64ddb897ca617b2563b5caa390037149a3511fb9))


### BREAKING CHANGES

* ktx-parse enums/constants have been renamed
* api parameters change



## 0.0.1 (2022-08-31)

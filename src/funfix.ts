/*
 * Copyright (c) 2017 by The Funfix Project Developers.
 * Some rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * The `funfix` root module.
 *
 * Exports sub-modules:
 *
 * - [core]{@link "core/index"} for core data types and utilities that belong in
 *   a standard library
 * - [exec]{@link "exec/index"} low level primitives for dealing with asynchrony
 *   and concurrency
 * - [types]{@link "types/index"} for type class definitions inspired by
 *   Haskell's standard library and Typelevel Cats
 * - [effect]{@link "effect/index"} for dealing with side effects
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Try } from "funfix/dist/core/try"
 * // ... or ...
 * import { Try } from "funfix/dist/core"
 * // ... or ...
 * import { Try } from "funfix/dist"
 * // ... or ...
 * import { Try } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module funfix
 */

/***/

// Exporting everything
export * from "./core"
export * from "./exec"
export * from "./types"
export * from "./effect"

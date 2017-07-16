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
 * The `core` module exports basic types, data types and utilities that belong
 * in a standard library.
 *
 * Exports sub-modules:
 *
 * - [core/disjunctions]{@link "core/disjunctions"} for the
 *   {@link Either}, {@link Option} and {@link Try} data types
 * - [core/errors]{@link "core/errors"} for reusable error types
 * - [core/std]{@link "core/std"} for universal equality and hash code
 *   (e.g. {@link IEquals}, {@link is} and {@link hashCode})
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Option } from "funfix/dist/core"
 * // ... or ...
 * import { Option } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module core
 */

/***/

// Exporting everything
export * from "./std"
export * from "./errors"
export * from "./disjunctions"

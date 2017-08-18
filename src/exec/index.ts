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
 * The `exec` package contains low level utilities and data types, providing a
 * standard library that is needed for building higher level concurrency tools.
 *
 * Exports sub-modules:
 *
 * - [exec/cancelable](./exec_cancelable.html) for the {@link Cancelable} data type
 * - [exec/scheduler](./exec_scheduler.html) for the {@link Scheduler} type
 * - [exec/time](./exec_time.html) for expressing time durations with
 *   {@link TimeUnit} and {@link Duration}
 * - [exec/future](./exec_future.html) exposes a {@link Future} data type that
 *   is lawful and cancelable, as an alternative to JavaScript's `Promise`
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Cancelable } from "funfix/dist/exec"
 * // ... or ...
 * import { Cancelable } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module exec
 */

/***/

export * from "./cancelable"
export * from "./time"
export * from "./scheduler"
export * from "./ref"
export * from "./future"

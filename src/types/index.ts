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
 * Module implementing type classes, inspired by Haskell's standard
 * library and by [Typelevel Cats]{@link http://typelevel.org/cats/}.
 *
 * Exports sub-modules:
 *
 * - [types/eq]{@link "types/eq"}: exposes the {@link Eq} type class
 * - [types/functor]{@link "types/functor"}: exposes the {@link Functor}
 *   type class
 * - [types/applicative]{@link "types/applicative"}: exposes the
 *   {@link Apply}, {@link Applicative} and {@link ApplicativeError}
 *   type classes
 * - [types/monad]{@link "types/monad"}: exposes the
 *   {@link FlatMap}, {@link Monad} and {@link MonadError}
 *   type classes
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Monad } from "funfix/dist/types"
 * // ... or ...
 * import { Monad } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module types
 */

/***/
export * from "./kinds"
export * from "./eq"
export * from "./functor"
export * from "./applicative"
export * from "./monad"
export * from "./instances"

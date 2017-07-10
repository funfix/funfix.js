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
 * Lightweight encoding for higher kinded types.
 *
 * Inspired by the
 * [Lightweight higher-kinded polymorphism]{@link https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf}
 * paper.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { HK } from "funfix/dist/types/kinds"
 * // ... or ...
 * import { HK } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module types/kinds
 */

/***/
import { NotImplementedError } from "../core/errors"

export abstract class HK<F, A> {
  __hkF(): F { return synthetic() }
  __hkA(): A { return synthetic() }
}

export abstract class HK2<F, A, B> extends HK<F, A> {
  __hkB(): B { return synthetic() }
}

export abstract class HK3<F, A, B, C> extends HK2<F, A, B> {
  __hkC(): C { return synthetic() }
}

export abstract class HK4<F, A, B, C, D> extends HK3<F, A, B, C> {
  __hkD(): D { return synthetic() }
}

export abstract class HK5<F, A, B, C, D, E> extends HK4<F, A, B, C, D> {
  __hkE(): E { return synthetic() }
}

/**
 * Data type for expressing equivalence in type class laws.
 *
 * @final
 */
export class IsEquiv<A> {
  private constructor(public lh: A, public rh: A) {}

  static of<A>(lh: A, rh: A): IsEquiv<A> {
    return new IsEquiv(lh, rh)
  }
}

function synthetic(): never {
  throw new NotImplementedError("synthetic function")
}

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
 * Exposes the {@link Applicative} type class.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Applicative } from "funfix/dist/types/applicative"
 * // ... or ...
 * import { Applicative } from "funfix/dist/types"
 * // ... or ...
 * import { Applicative } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module types/applicative
 */

/***/
import { HK } from "./kinds"
import { Functor, HasFunctor } from "./functor"

/**
 * `Applicative` functor type class.
 *
 * Allows application of a function in an Applicative context to a
 * value in an `Applicative` context.
 *
 * References:
 *
 * - [The Essence of the Iterator Pattern]{@link https://www.cs.ox.ac.uk/jeremy.gibbons/publications/iterator.pdf}
 * - [Applicative programming with effects]{@link http://staff.city.ac.uk/~ross/papers/Applicative.pdf}
 *
 * Example:
 *
 * ```typescript
 * const F = applicativeOf(Option)
 *
 * F.ap(F.pure(1), F.pure((x: number) => x + 1)) // Some(2)
 * ```
 *
 * Note that having an `Applicative` instance implies that a
 * {@link Functor} implementation is also available, which is why
 * `Applicative` is a subtype of `Functor`.
 *
 * CREDITS: this type class is inspired by the equivalent in Haskell's
 * standard library and the implementation is inspired by the
 * [Typelevel Cats]{@link http://typelevel.org/cats/} project.
 */
export abstract class Applicative<F> extends Functor<F> {
  abstract pure<A>(a: A): HK<F, A>

  abstract ap<A, B>(fa: HK<F, A>, ff: HK<F, (a: A) => B>): HK<F, B>

  map2<A, B, Z>(fa: HK<F, A>, fb: HK<F, B>, f: (a: A, b: B) => Z): HK<F, Z> {
    return this.ap(fb, this.map(fa, a => (b: B) => f(a, b)))
  }

  product<A, B>(fa: HK<F, A>, fb: HK<F, B>): HK<F, [A, B]> {
    return this.map2(fa, fb, (a: A, b: B) => [a, b] as [A, B])
  }

  map<A, B>(fa: HK<F, A>, f: (a: A) => B): HK<F, B> {
    return this.ap(fa, this.pure(f))
  }
}

/**
 * Interface to be implemented by types, as `static` methods, meant
 * to expose the default {@link Applicative} instance.
 *
 * Note that by exposing an `Applicative` instance, we are also
 * exposing a {@link Functor} implementation as well, since an
 * `Applicative` is a `Functor`.
 */
export interface HasApplicative<F> extends HasFunctor<F> {
  __types: {
    functor: () => Functor<F>,
    applicative: () => Applicative<F>
  }
}

/**
 * Given a `constructor` reference that implements {@link HasApplicative},
 * returns its associated {@link Applicative} instance.
 *
 * ```typescript
 * import { Option, Applicative, applicativeOf } from "funfix"
 *
 * const F: Applicative<Option<any>> = applicativeOf(Option)
 * ```
 */
export function applicativeOf<F>(constructor: HasApplicative<F>): Applicative<F> {
  return constructor.__types.applicative()
}

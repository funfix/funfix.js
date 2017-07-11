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
 * Exposes the {@link Functor} type class.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Functor } from "funfix/dist/types/functor"
 * // ... or ...
 * import { Functor } from "funfix/dist/types"
 * // ... or ...
 * import { Functor } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module types/functor
 */

/***/
import { HK, Equiv } from "./kinds"
import { id } from "../core/std"

/**
 * The `Functor` is a type class providing the `map` operation that
 * allows lifting an `f` function into the functor context and
 * applying it.
 *
 * The name is short for "covariant functor".
 *
 * Example:
 *
 * ```typescript
 * const F = functorOf(Option)
 *
 * F.map(Some(1), x => x + 1) // Some(2)
 * ```
 *
 * MUST obey the laws defined in {@link FunctorLaws}.
 *
 * CREDITS: this type class is inspired by the equivalent in Haskell's
 * standard library and the implementation is inspired by the
 * [Typelevel Cats]{@link http://typelevel.org/cats/} project.
 */
export abstract class Functor<F> {
  abstract map<A, B>(fa: HK<F, A>, f: (a: A) => B): HK<F, B>
}

/**
 * Type class laws defined for {@link Functor}.
 *
 * This is an abstract definition. In order to use it in unit testing,
 * the implementor must think of a strategy to evaluate the truthiness
 * of the returned `Equiv` values.
 */
export class FunctorLaws<F> {
  /**
   * @param F is the {@link Functor} designated instance for `F`,
   * to be tested.
   */
  constructor(public F: Functor<F>) {}

  /**
   * ```typescript
   * fa.map(id) <-> fa
   * ```
   */
  covariantIdentity<A>(fa: HK<F, A>): Equiv<HK<F, A>> {
    return Equiv.of(this.F.map(fa, id), fa)
  }

  /**
   * ```typescript
   * fa.map(f).map(g) <-> fa.map(x => g(f(x)))
   * ```
   */
  covariantComposition<A, B, C>(fa: HK<F, A>, f: (a: A) => B, g: (b: B) => C): Equiv<HK<F, C>> {
    return Equiv.of(
      this.F.map(this.F.map(fa, f), g),
      this.F.map(fa, x => g(f(x)))
    )
  }
}

/**
 * Interface to be implemented by types, as `static` methods, meant
 * to expose the default {@link Functor} instance.
 */
export interface HasFunctor<F> {
  __types: { functor: () => Functor<F> }
}

/**
 * Given a `constructor` reference that implements {@link HasFunctor},
 * returns its associated {@link Functor} instance.
 *
 * ```typescript
 * import { Option, Functor, functorOf } from "funfix"
 *
 * const F: Functor<Option<any>> = functorOf(Option)
 * ```
 */
export function functorOf<F>(constructor: HasFunctor<F>): Functor<F> {
  return constructor.__types.functor()
}

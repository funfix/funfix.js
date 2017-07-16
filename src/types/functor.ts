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
import { id } from "../core/std"
import { HK, Equiv, Constructor, getTypeClassInstance } from "./kinds"

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
 * ## Implementation notes
 *
 * Even though in TypeScript the Funfix library is using `abstract class` to
 * express type classes, when implementing this type class it is recommended
 * that you implement it as a mixin using "`implements`", instead of extending
 * it directly with "`extends`". See
 * [TypeScript: Mixins]{@link https://www.typescriptlang.org/docs/handbook/mixins.html}
 * for details and note that we already have {@link applyMixins} defined.
 *
 * Implementation example:
 *
 * ```typescript
 * import { HK, Functor, registerTypeClassInstance } from "funfix"
 *
 * class Box<T> implements HK<Box<any>, T> {
 *   constructor(public value: T) {}
 *
 *   // Implements HK<Box<any>, A>, not really needed, but useful in order
 *   // to avoid type casts. Note these can and should be undefined:
 *   readonly _funKindF: Box<any>
 *   readonly _funKindA: T
 * }
 *
 * // Type alias defined for readability
 * type BoxK<T> = HK<Box<any>, T>
 *
 * // Actual implementation
 * class BoxFunctor implements Functor<Box<any>> {
 *   map<A, B>(fa: BoxK<A>, f: (a: A) => B): Box<B> {
 *     const a = (fa as Box<A>).value
 *     return new Box(f(a))
 *   }
 * }
 *
 * // Registering global Functor instance for Box
 * registerTypeClassInstance(Functor)(Box, new BoxFunctor())
 * ```
 *
 * We are using `implements` in order to support multiple inheritance and to
 * avoid inheriting any `static` members. In the Flow definitions (e.g.
 * `.js.flow` files) for Funfix these type classes are defined with
 * "`interface`", as they are meant to be interfaces that sometimes have
 * default implementations and not classes.
 *
 * ## Credits
 *
 * This type class is inspired by the equivalent in Haskell's
 * standard library and the implementation is inspired by the
 * [Typelevel Cats]{@link http://typelevel.org/cats/} project.
 */
export abstract class Functor<F> {
  /**
   * Given a mapping function, transforms the source.
   *
   * The `map` operation must follow these laws:
   *
   * - `fa.map(id) <-> fa`
   * - `fa.map(f).map(g) <-> fa.map(x => g(f(x)))`
   */
  abstract map<A, B>(fa: HK<F, A>, f: (a: A) => B): HK<F, B>

  // Implements TypeClass<F>

  /** @hidden */
  static readonly _funTypeId: string = "functor"
  /** @hidden */
  static readonly _funSupertypeIds: string[] = []
  /** @hidden */
  static readonly _funErasure: Functor<any>
}

/**
 * Type class laws defined for {@link Functor}.
 *
 * This is an abstract definition. In order to use it in unit testing,
 * the implementor must think of a strategy to evaluate the truthiness
 * of the returned `Equiv` values.
 *
 * Even though in TypeScript the Funfix library is using classes to
 * express these laws, when implementing this class it is recommended
 * that you implement it as a mixin using `implements`, instead of extending
 * it directly with `extends`. See
 * [TypeScript: Mixins]{@link https://www.typescriptlang.org/docs/handbook/mixins.html}
 * for details and note that we already have {@link applyMixins} defined.
 *
 * We are doing this in order to support multiple inheritance and to
 * avoid inheriting any `static` members. In the Flow definitions (e.g.
 * `.js.flow` files) for Funfix these classes are defined with
 * `interface`, as they are meant to be interfaces that sometimes have
 * default implementations and not classes.
 */
export abstract class FunctorLaws<F> {
  /**
   * The {@link Functor} designated instance for `F`,
   * to be tested.
   */
  abstract readonly F: Functor<F>

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
 * Given a {@link Constructor} reference, returns its associated
 * {@link Functor} instance if it exists, or throws a {@link NotImplementedError}
 * in case there's no such association.
 *
 * ```typescript
 * import { Option, Functor, functorOf } from "funfix"
 *
 * const F: Functor<Option<any>> = functorOf(Option)
 * ```
 */
export const functorOf: <F>(c: Constructor<F>) => Functor<F> =
  getTypeClassInstance(Functor)

/**
 * Given an {@link Functor} instance, returns the {@link FunctorLaws}
 * associated with it.
 */
export function functorLawsOf<F>(instance: Functor<F>): FunctorLaws<F> {
  return new (class extends FunctorLaws<F> { public readonly F = instance })()
}

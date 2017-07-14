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
 * Exposes the {@link Apply} and {@link Applicative} type classes.
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
import { HK, Equiv, Constructor, getTypeClassInstance } from "./kinds"
import { Functor, FunctorLaws } from "./functor"
import { NotImplementedError } from "../core/errors"

/**
 * The `Apply` type class, a weaker version of {@link Applicative};
 * has `ap` (apply), but `pure`.
 *
 * Must obey the laws defined in {@link ApplyLaws}.
 *
 * Note that having an `Apply` instance implies that a
 * {@link Functor} implementation is also available, which is why
 * `Apply` is a subtype of `Functor`.
 *
 * CREDITS: this type class is inspired by the equivalent in Haskell's
 * standard library and the implementation is inspired by the
 * [Typelevel Cats]{@link http://typelevel.org/cats/} project.
 */
export abstract class Apply<F> extends Functor<F> {
  /**
   * Given a value and a function in the `Apply` context,
   * applies the function to the value.
   */
  abstract ap<A, B>(fa: HK<F, A>, ff: HK<F, (a: A) => B>): HK<F, B>

  /**
   * Applies the pure (binary) function `f` to the effectful values
   * `fa` and `fb`.
   *
   * `map2` can be seen as a binary version of {@link Functor.map}.
   */
  map2<A, B, Z>(fa: HK<F, A>, fb: HK<F, B>, f: (a: A, b: B) => Z): HK<F, Z> {
    return this.ap(fb, this.map(fa, a => (b: B) => f(a, b)))
  }

  /**
   * Captures the idea of composing independent effectful values.
   *
   * It is of particular interest when taken together with [[Functor]].
   * Where [[Functor]] captures the idea of applying a unary pure
   * function to an effectful value, calling `product` with `map`
   * allows one to apply a function of arbitrary arity to multiple
   * independent effectful values.
   *
   * This operation is equivalent with:
   *
   * ```typescript
   * map2(fa, fb, (a, b) => [a, b])
   * ```
   */
  product<A, B>(fa: HK<F, A>, fb: HK<F, B>): HK<F, [A, B]> {
    return this.map2(fa, fb, (a: A, b: B) => [a, b] as [A, B])
  }

  // Implements TypeClass<F>
  static readonly _funTypeId: string = "apply"
  static readonly _funSupertypeIds: string[] = ["functor"]
  static readonly _funErasure: Apply<any>
}

/**
 * Type class laws defined for {@link Apply}.
 *
 * This is an abstract definition. In order to use it in unit testing,
 * the implementor must think of a strategy to evaluate the truthiness
 * of the returned `Equiv` values.
 */
export class ApplyLaws<F> extends FunctorLaws<F> {
  /**
   * @param F is the {@link Apply} designated instance for `F`,
   * to be tested.
   */
  constructor(public readonly F: Apply<F>) { super(F) }

  applyComposition<A, B, C>(fa: HK<F, A>, fab: HK<F, (a: A) => B>, fbc: HK<F, (b: B) => C>): Equiv<HK<F, C>> {
    const F = this.F
    const compose = (f: (b: B) => C) => (
      (g: (a: A) => B) => (a: A) => f(g(a))
    )

    return Equiv.of(
      F.ap(F.ap(fa, fab), fbc),
      F.ap(fa, F.ap(fab, F.map(fbc, compose)))
    )
  }

  applyProductConsistency<A, B>(fa: HK<F, A>, f: HK<F, (a: A) => B>): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(
      F.ap(fa, f),
      F.map(F.product(f, fa), p => { const [f, a] = p; return f(a) })
    )
  }

  applyMap2Consistency<A, B>(fa: HK<F, A>, f: HK<F, (a: A) => B>): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(
      F.ap(fa, f),
      F.map2(f, fa, (f, a) => f(a))
    )
  }
}

/**
 * Given a {@link Constructor} reference, returns its associated
 * {@link Apply} instance if it exists, or throws a {@link NotImplementedError}
 * in case there's no such association.
 *
 * ```typescript
 * import { Option, Apply, applyOf } from "funfix"
 *
 * const F: Apply<Option<any>> = applyOf(Option)
 * ```
 */
export const applyOf: <F>(c: Constructor<F>) => Apply<F> =
  getTypeClassInstance(Apply)

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
 * Note that having an `Applicative` instance implies
 * {@link Functor} and {@link Apply} implementations are also
 * available, which is why `Applicative` is a subtype of
 * `Functor` and `Apply`.
 *
 * CREDITS: this type class is inspired by the equivalent in Haskell's
 * standard library and the implementation is inspired by the
 * [Typelevel Cats]{@link http://typelevel.org/cats/} project.
 */
export abstract class Applicative<F> extends Apply<F> {
  abstract pure<A>(a: A): HK<F, A>

  unit(): HK<F, void> {
    return this.pure(undefined)
  }

  map<A, B>(fa: HK<F, A>, f: (a: A) => B): HK<F, B> {
    return this.ap(fa, this.pure(f))
  }

  // Implements TypeClass<F>
  static readonly _funTypeId: string = "applicative"
  static readonly _funSupertypeIds: string[] = ["functor", "apply"]
  static readonly _funErasure: Applicative<any>
}

/**
 * Type class laws defined for {@link Applicative}.
 *
 * This is an abstract definition. In order to use it in unit testing,
 * the implementor must think of a strategy to evaluate the truthiness
 * of the returned `Equiv` values.
 */
export class ApplicativeLaws<F> extends ApplyLaws<F> {
  /**
   * @param F is the {@link Applicative} designated instance for `F`,
   * to be tested.
   */
  constructor(public F: Applicative<F>) { super(F) }

  applicativeIdentity<A>(fa: HK<F, A>): Equiv<HK<F, A>> {
    const F = this.F
    return Equiv.of(
      F.ap(fa, F.pure((a: A) => a)),
      fa
    )
  }

  applicativeHomomorphism<A, B>(a: A, f: (a: A) => B): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(
      F.ap(F.pure(a), F.pure(f)),
      F.pure(f(a))
    )
  }

  applicativeInterchange<A, B>(a: A, ff: HK<F, (a: A) => B>): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(
      F.ap(F.pure(a), ff),
      F.ap(ff, F.pure((f: (a: A) => B) => f(a)))
    )
  }

  applicativeMap<A, B>(fa: HK<F, A>, f: (a: A) => B): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(
      F.map(fa, f),
      F.ap(fa, F.pure(f))
    )
  }

  applicativeComposition<A, B, C>(fa: HK<F, A>, fab: HK<F, (a: A) => B>, fbc: HK<F, (b: B) => C>): Equiv<HK<F, C>> {
    const F = this.F
    const compose = (f: (b: B) => C) => (
      (g: (a: A) => B) => (a: A) => f(g(a))
    )

    return Equiv.of(
      F.ap(fa, F.ap(fab, F.ap(fbc, F.pure(compose)))),
      F.ap(F.ap(fa, fab), fbc)
    )
  }

  applicativeUnit<A>(a: A): Equiv<HK<F, A>> {
    const F = this.F
    return Equiv.of(F.map(F.unit(), _ => a), F.pure(a))
  }
}

/**
 * Given a {@link Constructor} reference, returns its associated
 * {@link Applicative} instance if it exists, or throws a {@link NotImplementedError}
 * in case there's no such association.
 *
 * ```typescript
 * import { Option, Applicative, applicativeOf } from "funfix"
 *
 * const F: Applicative<Option<any>> = applicativeOf(Option)
 * ```
 */
export const applicativeOf: <F>(c: Constructor<F>) => Applicative<F> =
  getTypeClassInstance(Applicative)

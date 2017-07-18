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
import { Either, Right, Left } from "../core/disjunctions"
import { NotImplementedError } from "../core/errors"
import { applyMixins } from "../core/std"

/**
 * The `Apply` type class, a weaker version of {@link Applicative},
 * exposing `ap` (apply), but not `pure`.
 *
 * This type class is exposed in addition to `Applicative` because
 * there are data types for which we can't implement `pure`, but
 * that could still benefit from an `ap` definition. For example
 * in case of a `Map<K, ?>` we couldn't define `pure` for it
 * because we don't have a `K` key.
 *
 * MUST obey the laws defined in {@link ApplyLaws}.
 *
 * Note that having an `Apply` instance implies that a
 * {@link Functor} implementation is also available, which is why
 * `Apply` is a subtype of `Functor`.
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
 * import {
 *   HK, Apply,
 *   registerTypeClassInstance,
 *   applyMixins
 * } from "funfix"
 *
 * // Type alias defined for readability.
 * // HK is our encoding for higher-kinded types.
 * type BoxK<T> = HK<Box<any>, T>
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
 * class BoxApply implements Apply<Box<any>> {
 *   map<A, B>(fa: BoxK<A>, f: (a: A) => B): Box<B> {
 *     const a = (fa as Box<A>).value
 *     return new Box(f(a))
 *   }
 *
 *   ap<A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>): Box<B> {
 *     const a = (fa as Box<A>).value
 *     const f = (ff as Box<(a: A) => B>).value
 *     return new Box(f(a))
 *   }
 *
 *   // Mixed-in, as these have default implementations
 *   map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
 *   product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
 * }
 *
 * // Call needed in order to implement `map2` and `product` using
 * // the default implementations defined by `Apply`, because
 * // we are using `implements` instead of `extends` above and
 * // because in this sample we want the default implementations,
 * // but note that you can always provide your own definitions
 * applyMixins(BoxApply, [Apply])
 *
 * // Registering global Apply instance for Box, needed in order
 * // for the `applyOf(Box)` calls to work
 * registerTypeClassInstance(Apply)(Box, new BoxApply())
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
export abstract class Apply<F> implements Functor<F> {
  /**
   * Given a value and a function in the `Apply` context,
   * applies the function to the value.
   */
  abstract ap<A, B>(fa: HK<F, A>, ff: HK<F, (a: A) => B>): HK<F, B>

  /** Inherited from {@link Functor.map}. */
  abstract map<A, B>(fa: HK<F, A>, f: (a: A) => B): HK<F, B>

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

  /** @hidden */
  static readonly _funTypeId: string = "apply"
  /** @hidden */
  static readonly _funSupertypeIds: string[] = ["functor"]
  /** @hidden */
  static readonly _funErasure: Apply<any>
}

applyMixins(Apply, [Functor])

/**
 * Type class laws defined for {@link Apply}.
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
export abstract class ApplyLaws<F> implements FunctorLaws<F> {
  /**
   * The {@link Apply} designated instance for `F`,
   * to be tested.
   */
  public readonly F: Apply<F>

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

  /** Mixed-in from {@link FunctorLaws.covariantIdentity}. */
  covariantIdentity: <A>(fa: HK<F, A>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link FunctorLaws.covariantComposition}. */
  covariantComposition: <A, B, C>(fa: HK<F, A>, f: (a: A) => B, g: (b: B) => C) => Equiv<HK<F, C>>
}

applyMixins(ApplyLaws, [FunctorLaws])

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
 * Given an {@link Apply} instance, returns the {@link ApplyLaws}
 * associated with it.
 */
export function applyLawsOf<F>(instance: Apply<F>): ApplyLaws<F> {
  return new (class extends ApplyLaws<F> { public readonly F = instance })()
}

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
 * import {
 *   HK, Applicative,
 *   registerTypeClassInstance,
 *   applyMixins
 * } from "funfix"
 *
 * // Type alias defined for readability.
 * // HK is our encoding for higher-kinded types.
 * type BoxK<T> = HK<Box<any>, T>
 *
 * class Box<T> implements HK<Box<any>, T> {
 *   constructor(public value: T) {}
 *
 *   // Implements HK<Box<any>, A>, not really needed, but useful in order
 *   // to avoid type casts. Note they can and should be undefined:
 *   readonly _funKindF: Box<any>
 *   readonly _funKindA: T
 * }
 *
 * class BoxApplicative implements Applicative<Box<any>> {
 *   pure<A>(a: A): Box<A> { return new Box(a) }
 *
 *   ap<A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>): Box<B> {
 *     const a = (fa as Box<A>).value
 *     const f = (ff as Box<(a: A) => B>).value
 *     return new Box(f(a))
 *   }
 *
 *   // Mixed-in, as these have default implementations
 *   map: <A, B>(fa: BoxK<A>, f: (a: A) => B) => Box<B>
 *   map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
 *   product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
 *   unit: () => Box<void>
 * }
 *
 * // Call needed in order to implement `map`, `map2`, `product` and `unit`,
 * // using the default implementations defined by `Applicative`, because
 * // we are using `implements` instead of `extends` above and
 * // because in this sample we want the default implementations,
 * // but note that you can always provide your own
 * applyMixins(BoxApplicative, [Applicative])
 *
 * // Registering global Applicative instance for Box, needed in order
 * // for the `functorOf(Box)`, `applyOf(Box)` and `applicativeOf(Box)`
 * // calls to work
 * registerTypeClassInstance(Applicative)(Box, new BoxApplicative())
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
export abstract class Applicative<F> implements Apply<F> {
  /**
   * Lifts a strict value `A` into the `F<A>` context.
   */
  abstract pure<A>(a: A): HK<F, A>

  /** Inherited from {@link Apply.ap}. */
  abstract ap<A, B>(fa: HK<F, A>, ff: HK<F, (a: A) => B>): HK<F, B>

  /**
   * Shorthand for `pure<void>(undefined)`, provided for convenience
   * and because implementations can override the default for
   * optimization purposes.
   */
  unit(): HK<F, void> {
    return this.pure(undefined)
  }

  /** Inherited from {@link Functor.map}. */
  map<A, B>(fa: HK<F, A>, f: (a: A) => B): HK<F, B> {
    return this.ap(fa, this.pure(f))
  }

  /** Mixed-in from {@link Apply.map2}. */
  map2: <A, B, Z>(fa: HK<F, A>, fb: HK<F, B>, f: (a: A, b: B) => Z) => HK<F, Z>
  /** Mixed-in from {@link Apply.product}. */
  product: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => HK<F, [A, B]>

  // Implements TypeClass<F>

  /** @hidden */
  static readonly _funTypeId: string = "applicative"
  /** @hidden */
  static readonly _funSupertypeIds: string[] = ["functor", "apply"]
  /** @hidden */
  static readonly _funErasure: Applicative<any>
}

applyMixins(Applicative, [Apply])

/**
 * Type class laws defined for {@link Applicative}.
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
export abstract class ApplicativeLaws<F> implements ApplyLaws<F> {
  /**
   * The {@link Applicative} designated instance for `F`,
   * to be tested.
   */
  public readonly F: Applicative<F>

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

  /** Mixed-in from {@link FunctorLaws.covariantIdentity}. */
  covariantIdentity: <A>(fa: HK<F, A>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link FunctorLaws.covariantComposition}. */
  covariantComposition: <A, B, C>(fa: HK<F, A>, f: (a: A) => B, g: (b: B) => C) => Equiv<HK<F, C>>

  /** Mixed-in from {@link ApplyLaws.applyComposition}. */
  applyComposition: <A, B, C>(fa: HK<F, A>, fab: HK<F, (a: A) => B>, fbc: HK<F, (b: B) => C>) => Equiv<HK<F, C>>
  /** Mixed-in from {@link ApplyLaws.applyProductConsistency}. */
  applyProductConsistency: <A, B>(fa: HK<F, A>, f: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link ApplyLaws.applyMap2Consistency}. */
  applyMap2Consistency: <A, B>(fa: HK<F, A>, f: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
}

applyMixins(ApplicativeLaws, [ApplyLaws])

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

/**
 * Given an {@link Applicative} instance, returns the {@link ApplicativeLaws}
 * associated with it.
 */
export function applicativeLawsOf<F>(instance: Applicative<F>): ApplicativeLaws<F> {
  return new (class extends ApplicativeLaws<F> { public readonly F = instance })()
}

/**
 * The `ApplicativeError` type class is a {@link Applicative} that
 * also allows you to raise and or handle an error value.
 *
 * This type class allows one to abstract over error-handling
 * applicative types.
 *
 * MUST follow the law defined in {@link ApplicativeErrorLaws}.
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
 * import {
 *   HK,
 *   ApplicativeError,
 *   registerTypeClassInstance,
 *   applyMixins,
 *   Try
 * } from "funfix"
 *
 * // Type alias defined for readability.
 * // HK is our encoding for higher-kinded types.
 * type BoxK<T> = HK<Box<any>, T>
 *
 * class Box<T> implements HK<Box<any>, T> {
 *   constructor(public value: Try<T>) {}
 *
 *   // Implements HK<Box<any>, A>, not really needed, but useful in order
 *   // to avoid type casts. Note they can and should be undefined:
 *   readonly _funKindF: Box<any>
 *   readonly _funKindA: T
 * }
 *
 * class BoxApplicativeError implements ApplicativeError<Box<any>, any> {
 *   pure<A>(a: A): Box<A> { return new Box(Try.success(a)) }
 *
 *   ap<A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>): Box<B> {
 *     const ta = (fa as Box<A>).value
 *     const tf = (ff as Box<(a: A) => B>).value
 *     return new Box(Try.map2(ta, tf, (a, f) => f(a)))
 *   }
 *
 *   raise<A>(e: any): HK<Box<any>, A> {
 *     return new Box(Try.failure(e))
 *   }
 *
 *   recoverWith<A>(fa: BoxK<A>, f: (e: any) => BoxK<A>): HK<Box<any>, A> {
 *     return new Box((fa as Box<A>).value.recoverWith(e => (f(e) as Box<A>).value))
 *   }
 *
 *   // Mixed-in, as these have default implementations
 *   map: <A, B>(fa: BoxK<A>, f: (a: A) => B) => Box<B>
 *   map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
 *   product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
 *   unit: () => Box<void>
 *   recover: <A>(fa: HK<Box<any>, A>, f: (e: any) => A) => HK<Box<any>, A>
 *   attempt: <A>(fa: HK<Box<any>, A>) => HK<Box<any>, Either<any, A>>
 * }
 *
 * // Call needed in order to implement `map`, `map2`, `product`, etc.
 * // using the default implementations defined by `ApplicativeError`,
 * // because we are using `implements` instead of `extends` above and
 * // because in this sample we want the default implementations,
 * // but note that you can always provide your own
 * applyMixins(BoxApplicativeError, [ApplicativeError])
 *
 * // Registering global ApplicativeError instance for Box, needed in order
 * // for the `functorOf(Box)`, `applyOf(Box)`, `applicativeOf(Box)`
 * // and `applicativeErrorOf(Box)` calls to work
 * registerTypeClassInstance(ApplicativeError)(Box, new BoxApplicativeError())
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
export abstract class ApplicativeError<F, E> implements Applicative<F> {
  /**
   * Lift an error into the `F` context.
   */
  abstract raise<A>(e: E): HK<F, A>

  /**
   * Handle any error, potentially recovering from it, by mapping it to an
   * `F<A>` value.
   *
   * @see {@link recover} to handle any error by simply mapping it to an `A`
   * value instead of an `F<A>`.
   */
  abstract recoverWith<A>(fa: HK<F, A>, f: (e: E) => HK<F, A>): HK<F, A>

  /**
   * Handle any error by mapping it to an `A` value.
   *
   * @see {@link recoverWith} to map to an `F[A]` value instead of
   * simply an `A` value.
   */
  recover<A>(fa: HK<F, A>, f: (e: E) => A): HK<F, A> {
    const F = this
    return F.recoverWith(fa, e => F.pure(f(e)))
  }

  /**
   * Handle errors by turning them into {@link Either} values.
   *
   * If there is no error, then a `Right` value will be returned.
   * All non-fatal errors should be handled by this method.
   */
  attempt<A>(fa: HK<F, A>): HK<F, Either<E, A>> {
    const F = this
    return F.recover(
      F.map(fa, a => Either.right<E, A>(a)),
      Left)
  }

  /** Inherited from {@link Applicative.pure}. */
  abstract pure<A>(a: A): HK<F, A>

  /** Inherited from {@link Applicative.ap}. */
  abstract ap<A, B>(fa: HK<F, A>, ff: HK<F, (a: A) => B>): HK<F, B>

  /** Mixed-in from {@link Applicative.unit}. */
  unit: () => HK<F, void>
  /** Mixed-in from {@link Applicative.map}. */
  map: <A, B>(fa: HK<F, A>, f: (a: A) => B) => HK<F, B>
  /** Mixed-in from {@link Apply.map2}. */
  map2: <A, B, Z>(fa: HK<F, A>, fb: HK<F, B>, f: (a: A, b: B) => Z) => HK<F, Z>
  /** Mixed-in from {@link Apply.product}. */
  product: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => HK<F, [A, B]>

  // Implements TypeClass<F>

  /** @hidden */
  static readonly _funTypeId: string = "applicativeError"
  /** @hidden */
  static readonly _funSupertypeIds: string[] = ["functor", "apply", "applicative"]
  /** @hidden */
  static readonly _funErasure: ApplicativeError<any, any>
}

applyMixins(ApplicativeError, [Applicative])

/**
 * Type class laws defined for {@link ApplicativeError}.
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
export abstract class ApplicativeErrorLaws<F, E> implements ApplicativeLaws<F> {
  /**
   * The {@link Applicative} designated instance for `F`,
   * to be tested.
   */
  public readonly F: ApplicativeError<F, E>

  applicativeErrorRecoverWith<A>(e: E, f: (e: E) => HK<F, A>): Equiv<HK<F, A>> {
    const F = this.F
    return Equiv.of(F.recoverWith(F.raise<A>(e), f), f(e))
  }

  applicativeErrorRecover<A>(e: E, f: (e: E) => A): Equiv<HK<F, A>> {
    const F = this.F
    return Equiv.of(F.recover(F.raise<A>(e), f), F.pure(f(e)))
  }

  recoverWithPure<A>(a: A, f: (e: E) => HK<F, A>): Equiv<HK<F, A>> {
    const F = this.F
    return Equiv.of(F.recoverWith(F.pure(a), f), F.pure(a))
  }

  recoverPure<A>(a: A, f: (e: E) => A): Equiv<HK<F, A>> {
    const F = this.F
    return Equiv.of(F.recover(F.pure(a), f), F.pure(a))
  }

  raiseErrorAttempt(e: E): Equiv<HK<F, Either<E, void>>> {
    const F = this.F
    return Equiv.of(F.attempt(F.raise<void>(e)), F.pure(Left(e)))
  }

  pureAttempt<A>(a: A): Equiv<HK<F, Either<E, A>>> {
    const F = this.F
    return Equiv.of(F.attempt(F.pure(a)), F.pure(Right(a)))
  }

  /** Mixed-in from {@link ApplicativeLaws.applicativeIdentity}. */
  applicativeIdentity: <A>(fa: HK<F, A>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link ApplicativeLaws.applicativeHomomorphism}. */
  applicativeHomomorphism: <A, B>(a: A, f: (a: A) => B) => Equiv<HK<F, B>>
  /** Mixed-in from {@link ApplicativeLaws.applicativeInterchange}. */
  applicativeInterchange: <A, B>(a: A, ff: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link ApplicativeLaws.applicativeMap}. */
  applicativeMap: <A, B>(fa: HK<F, A>, f: (a: A) => B) => Equiv<HK<F, B>>
  /** Mixed-in from {@link ApplicativeLaws.applicativeComposition}. */
  applicativeComposition: <A, B, C>(fa: HK<F, A>, fab: HK<F, (a: A) => B>, fbc: HK<F, (b: B) => C>) => Equiv<HK<F, C>>
  /** Mixed-in from {@link ApplicativeLaws.applicativeUnit}. */
  applicativeUnit: <A>(a: A) => Equiv<HK<F, A>>

  /** Mixed-in from {@link FunctorLaws.covariantIdentity}. */
  covariantIdentity: <A>(fa: HK<F, A>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link FunctorLaws.covariantComposition}. */
  covariantComposition: <A, B, C>(fa: HK<F, A>, f: (a: A) => B, g: (b: B) => C) => Equiv<HK<F, C>>

  /** Mixed-in from {@link ApplyLaws.applyComposition}. */
  applyComposition: <A, B, C>(fa: HK<F, A>, fab: HK<F, (a: A) => B>, fbc: HK<F, (b: B) => C>) => Equiv<HK<F, C>>
  /** Mixed-in from {@link ApplyLaws.applyProductConsistency}. */
  applyProductConsistency: <A, B>(fa: HK<F, A>, f: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link ApplyLaws.applyMap2Consistency}. */
  applyMap2Consistency: <A, B>(fa: HK<F, A>, f: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
}

applyMixins(ApplicativeErrorLaws, [ApplicativeLaws])

/**
 * Given a {@link Constructor} reference, returns its associated
 * {@link ApplicativeError} instance if it exists, or throws a {@link NotImplementedError}
 * in case there's no such association.
 *
 * ```typescript
 * import { Eval, ApplicativeError, applicativeErrorOf } from "funfix"
 *
 * const F: ApplicativeError<Option<any>> = applicativeErrorOf(Eval)
 * ```
 */
export const applicativeErrorOf: <F, E>(c: Constructor<F>) => ApplicativeError<F, E> =
  getTypeClassInstance(ApplicativeError)

/**
 * Given an {@link ApplicativeError} instance, returns the
 * {@link ApplicativeErrorLaws} associated with it.
 */
export function applicativeErrorLawsOf<F,E>(instance: ApplicativeError<F,E>): ApplicativeErrorLaws<F,E> {
  return new (class extends ApplicativeErrorLaws<F,E> { public readonly F = instance })()
}

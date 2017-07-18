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
 * Exposes the {@link Monad} and {@link FlatMap} type classes.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Monad } from "funfix/dist/types/monad"
 * // ... or ...
 * import { Monad } from "funfix/dist/types"
 * // ... or ...
 * import { Monad } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module types/monad
 */

/***/
import { HK, Equiv, Constructor, getTypeClassInstance } from "./kinds"
import { Either, Right, Left } from "../core/disjunctions"
import { applyMixins } from "../core/std"
import {
  Apply,
  ApplyLaws,
  Applicative,
  ApplicativeLaws,
  ApplicativeError,
  ApplicativeErrorLaws
} from "./applicative"

/**
 * The `FlatMap` type class is a lightweight {@link Monad}.
 *
 * It exposes [flatMap]{@link FlatMap.flatMap}, which allows to have a
 * value in a context (`F<A>`) and then feed that into a function that
 * takes a normal value and returns a value in a context
 * (`A => F<B>`).
 *
 * One motivation for separating this out from `Monad` is that there are
 * situations where we can implement `flatMap` but not `pure`. For example,
 * we can implement `map` or `flatMap` that transforms the values of a
 * `Map<K, ?>` type, but we can't implement `pure` (because we wouldn't
 * know what key to use when instantiating the new `Map`).
 *
 * Must obey the laws defined in {@link FlatMapLaws}.
 *
 * Note that having an `Monad` instance implies
 * {@link Functor} and {@link Apply} implementations are also available,
 * as `FlatMap` is a subtype of these.
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
 *   HK, FlatMap, Either,
 *   registerTypeClassInstance,
 *   applyMixins
 * } from "../src/funfix"
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
 * class BoxFlatMap implements FlatMap<Box<any>> {
 *   map<A, B>(fa: BoxK<A>, f: (a: A) => B): Box<B> {
 *     return new Box(f((fa as Box<A>).value))
 *   }
 *
 *   flatMap<A, B>(fa: BoxK<A>, f: (a: A) => BoxK<B>): Box<B> {
 *     return f((fa as Box<A>).value) as Box<B>
 *   }
 *
 *   tailRecM<A, B>(a: A, f: (a: A) => BoxK<Either<A, B>>): Box<B> {
 *     let cursor = a
 *     while (true) {
 *       const box = f(cursor) as Box<Either<A, B>>
 *       const v = box.value
 *       if (v.isRight()) return new Box(v.get())
 *       cursor = v.left().get()
 *     }
 *   }
 *
 *   // Mixed-in, as these have default implementations
 *   map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
 *   ap: <A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>) => Box<B>
 *   product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
 *   unit: () => Box<void>
 *   followedBy: <A, B>(fa: BoxK<A>, fb: BoxK<B>) => Box<B>
 *   followedByL: <A, B>(fa: BoxK<A>, fb: () => BoxK<B>) => Box<B>
 *   forEffect: <A, B>(fa: BoxK<A>, fb: BoxK<B>) => Box<A>
 *   forEffectL: <A, B>(fa: BoxK<A>, fb: () => BoxK<B>) => Box<A>
 * }
 *
 * // Call needed in order to implement `map`, `map2`, `product`, etc.
 * // using the default implementations defined by `FlatMap`, because
 * // we are using `implements` instead of `extends` above and
 * // because in this sample we want the default implementations,
 * // but note that you can always provide your own
 * applyMixins(BoxFlatMap, [FlatMap])
 *
 * // Registering global Functor instance for Box, needed in order
 * // for the `functorOf(Box)`, `applyOf(Box)`, `applicativeOf(Box)`
 * // and `flatMapOf(Box)` calls to work
 * registerTypeClassInstance(FlatMap)(Box, new BoxFunctor())
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
export abstract class FlatMap<F> implements Apply<F> {
  abstract flatMap<A, B>(fa: HK<F, A>, f: (a: A) => HK<F, B>): HK<F, B>

  /** Inherited from {@link Functor.map}. */
  abstract map<A, B>(fa: HK<F, A>, f: (a: A) => B): HK<F, B>

  /**
   * Keeps calling `f` until a `Right(b)` is returned.
   *
   * Based on Phil Freeman's
   * [Stack Safety for Free]{@link http://functorial.com/stack-safety-for-free/index.pdf}.
   *
   * Implementations of this method should use constant stack space relative to `f`.
   */
  abstract tailRecM<A, B>(a: A, f: (a: A) => HK<F, Either<A, B>>): HK<F, B>

  /**
   * Sequentially compose two actions, discarding any value produced
   * by the first.
   *
   * See [followedByL]{@link FlatMap.followedByL} for a lazy version.
   */
  followedBy<A, B>(fa: HK<F, A>, fb: HK<F, B>): HK<F, B> {
    return this.flatMap(fa, _ => fb)
  }

  /**
   * Sequentially compose two actions, discarding any value produced
   * by the first.
   *
   * See [followedBy]{@link FlatMap.followedBy} for the strict version.
   */
  followedByL<A, B>(fa: HK<F, A>, fb: () => HK<F, B>): HK<F, B> {
    return this.flatMap(fa, _ => fb())
  }

  /**
   * Sequentially compose two actions, discarding any value
   * produced by the second.
   *
   * See [forEffectL]{@link FlatMap.forEffectL} for the lazy version.
   */
  forEffect<A, B>(fa: HK<F, A>, fb: HK<F, B>): HK<F, A> {
    return this.flatMap(fa, a => this.map(fb, _ => a))
  }

  /**
   * Sequentially compose two actions, discarding any value
   * produced by the second.
   *
   * See [forEffect]{@link FlatMap.forEffect} for the strict version.
   */
  forEffectL<A, B>(fa: HK<F, A>, fb: () => HK<F, B>): HK<F, A> {
    return this.flatMap(fa, a => this.map(fb(), _ => a))
  }

  /** Inherited from {@link Apply.ap}. */
  ap<A, B>(fa: HK<F, A>, ff: HK<F, (a: A) => B>): HK<F, B> {
    return this.flatMap(fa, a => this.map(ff, f => f(a)))
  }

  /** Inherited from {@link Apply.map2}. */
  map2<A, B, Z>(fa: HK<F, A>, fb: HK<F, B>, f: (a: A, b: B) => Z): HK<F, Z> {
    return this.flatMap(fa, a => this.map(fb, b => f(a, b)))
  }

  /** Inherited from {@link Apply.product}. */
  product<A, B>(fa: HK<F, A>, fb: HK<F, B>): HK<F, [A, B]> {
    return this.flatMap(fa, a => this.map(fb, b => [a, b] as [A, B]))
  }

  // Implements TypeClass<F>

  /** @hidden */
  static readonly _funTypeId: string = "flatMap"
  /** @hidden */
  static readonly _funSupertypeIds: string[] = ["functor", "apply"]
  /** @hidden */
  static readonly _funErasure: FlatMap<any>
}

/**
 * Type class laws defined for {@link FlatMap}.
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
export abstract class FlatMapLaws<F> implements ApplyLaws<F> {
  /**
   * The {@link Apply} designated instance for `F`,
   * to be tested.
   */
  public readonly F: FlatMap<F>

  /**
   * ```typescript
   *  fa.flatMap(f).flatMap(g) <-> fa.flatMap(a => f(a).flatMap(g))
   *  ```
   */
  flatMapAssociativity<A, B, C>(fa: HK<F, A>, f: (a: A) => HK<F, B>, g: (b: B) => HK<F, C>): Equiv<HK<F, C>> {
    const F = this.F
    return Equiv.of(
      F.flatMap(F.flatMap(fa, f), g),
      F.flatMap(fa, a => F.flatMap(f(a), g))
    )
  }

  /**
   * ```typescript
   * fab.ap(fa) <-> fab.flatMap(f => fa.map(f))
   * ```
   */
  flatMapConsistentApply<A, B>(fa: HK<F, A>, fab: HK<F, (a: A) => B>): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(
      F.ap(fa, fab),
      F.flatMap(fab, f => F.map(fa, f))
    )
  }

  /**
   * ```typescript
   * fa.followedBy(fb) <-> fa.flatMap(_ => fb)
   * ```
   */
  followedByConsistency<A, B>(fa: HK<F, A>, fb: HK<F, B>): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(
      F.followedBy(fa, fb),
      F.flatMap(fa, _ => fb)
    )
  }

  /**
   * ```typescript
   * fa.followedBy(() => fb) <-> fa.flatMap(_ => fb)
   * ```
   */
  followedByLConsistency<A, B>(fa: HK<F, A>, fb: HK<F, B>): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(
      F.followedByL(fa, () => fb),
      F.flatMap(fa, _ => fb)
    )
  }

  /**
   * ```typescript
   * fa.forEffect(fb) <-> fa.flatMap(a => fb.map(_ => a))
   * ```
   */
  forEffectConsistency<A, B>(fa: HK<F, A>, fb: HK<F, B>): Equiv<HK<F, A>> {
    const F = this.F
    return Equiv.of(
      F.forEffect(fa, fb),
      F.flatMap(fa, a => F.map(fb, _ => a))
    )
  }

  /**
   * ```typescript
   * fa.forEffectL(() => fb) <-> fa.flatMap(a => fb.map(_ => a))
   * ```
   */
  forEffectLConsistency<A, B>(fa: HK<F, A>, fb: HK<F, B>): Equiv<HK<F, A>> {
    const F = this.F
    return Equiv.of(
      F.forEffectL(fa, () => fb),
      F.flatMap(fa, a => F.map(fb, _ => a))
    )
  }

  tailRecMConsistentFlatMap<A>(a: A, f: (a: A) => HK<F, A>): Equiv<HK<F, A>> {
    const F = this.F
    const bounce = (n: number) => {
      return F.tailRecM([a, n] as [A, number], x => {
        const [a0, i] = x
        return i > 0
          ? F.map(f(a0), a1 => Left([a1, i - 1] as [A, number]))
          : F.map(f(a0), Right)
      })
    }

    /*
     * The law is for n >= 1
     * bounce(n) == bounce(n - 1).flatMap(f)
     *
     * Many monads blow up if n gets too large here (for instance List, becomes
     * multiplicative, so the memory is exponential in n).
     */
    return Equiv.of(bounce(1), F.flatMap(bounce(0), f))
  }

  /** Mixed-in from {@link FunctorLaws.covariantIdentity}. */
  covariantIdentity: <A>(fa: HK<F, A>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link FunctorLaws.covariantComposition}. */
  covariantComposition: <A, B, C>(fa: HK<F, A>, f: (a: A) => B, g: (b: B) => C) => Equiv<HK<F, C>>
  /** Mixed in from {@link ApplyLaws.applyComposition}. */
  applyComposition: <A, B, C>(fa: HK<F, A>, fab: HK<F, (a: A) => B>, fbc: HK<F, (b: B) => C>) => Equiv<HK<F, C>>
  /** Mixed in from {@link ApplyLaws.applyProductConsistency}. */
  applyProductConsistency: <A, B>(fa: HK<F, A>, f: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
  /** Mixed in from {@link ApplyLaws.applyMap2Consistency}. */
  applyMap2Consistency: <A, B>(fa: HK<F, A>, f: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
}

applyMixins(FlatMapLaws, [ApplyLaws])

/**
 * Given a {@link Constructor} reference, returns its associated
 * {@link FlatMap} instance if it exists, or throws a {@link NotImplementedError}
 * in case there's no such association.
 *
 * ```typescript
 * import { Option, FlatMap, flatMapOf } from "funfix"
 *
 * const F: FlatMap<Option<any>> = flatMapOf(Option)
 * ```
 */
export const flatMapOf: <F>(c: Constructor<F>) => FlatMap<F> =
  getTypeClassInstance(FlatMap)

/**
 * Given an {@link FlatMap} instance, returns the {@link FlatMapLaws}
 * associated with it.
 */
export function flatMapLawsOf<F>(instance: FlatMap<F>): FlatMapLaws<F> {
  return new (class extends FlatMapLaws<F> { public readonly F = instance })()
}

/**
 * The `Monad` type class.
 *
 * Allows composition of dependent effectful functions.
 *
 * A `Monad` instance is defined by two operations:
 *
 * - `pure` from {@link Applicative}, which lifts an `A` value
 *    in the `F<A>` context
 * - `flatMap`, which allows us to have a value in a context (`F<A>`)
 *    and then feed that into a function that takes a normal value and
 *    returns a value in a context (`A => F<B>`)
 *
 * See [Monads for functional programming]{@link http://homepages.inf.ed.ac.uk/wadler/papers/marktoberdorf/baastad.pdf},
 * by Philip Wadler.
 *
 * Must obey the laws defined in {@link MonadLaws}.
 *
 * Note that having an `Applicative` instance implies
 * {@link Functor}, {@link Apply}, {@link Applicative} and {@link FlatMap}
 * implementations are also available, as `Monad` is a subtype
 * of these type classes.
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
 *   HK, Monad, Either,
 *   registerTypeClassInstance,
 *   applyMixins
 * } from "../src/funfix"
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
 * class BoxMonad implements Monad<Box<any>> {
 *   pure<A>(a: A): Box<A> { return new Box(a) }
 *
 *   flatMap<A, B>(fa: BoxK<A>, f: (a: A) => BoxK<B>): Box<B> {
 *     return f((fa as Box<A>).value) as Box<B>
 *   }
 *
 *   tailRecM<A, B>(a: A, f: (a: A) => BoxK<Either<A, B>>): Box<B> {
 *     let cursor = a
 *     while (true) {
 *       const box = f(cursor) as Box<Either<A, B>>
 *       const v = box.value
 *       if (v.isRight()) return new Box(v.get())
 *       cursor = v.left().get()
 *     }
 *   }
 *
 *   // Mixed-in, as these have default implementations
 *   map: <A, B>(fa: BoxK<A>, f: (a: A) => B) => Box<B>
 *   map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
 *   ap: <A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>) => Box<B>
 *   product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
 *   unit: () => Box<void>
 *   followedBy: <A, B>(fa: BoxK<A>, fb: BoxK<B>) => Box<B>
 *   followedByL: <A, B>(fa: BoxK<A>, fb: () => BoxK<B>) => Box<B>
 *   forEffect: <A, B>(fa: BoxK<A>, fb: BoxK<B>) => Box<A>
 *   forEffectL: <A, B>(fa: BoxK<A>, fb: () => BoxK<B>) => Box<A>
 * }
 *
 * // Call needed in order to implement `map`, `map2`, `product`, etc.
 * // using the default implementations defined by `Monad`, because
 * // we are using `implements` instead of `extends` above and
 * // because in this sample we want the default implementations,
 * // but note that you can always provide your own
 * applyMixins(BoxMonad, [Monad])
 *
 * // Registering global Monad instance for Box, needed in order
 * // for the `functorOf(Box)`, `applyOf(Box)`, `applicativeOf(Box)`,
 * // `flatMapOf(Box)` and `monadOf(Box)` calls to work
 * registerTypeClassInstance(Monad)(Box, new BoxFunctor())
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
export abstract class Monad<F> implements FlatMap<F>, Applicative<F> {
  /** Inherited from {@link Applicative.pure}. */
  abstract pure<A>(a: A): HK<F, A>

  /** Inherited from {@link FlatMap.flatMap}. */
  abstract flatMap<A, B>(fa: HK<F, A>, f: (a: A) => HK<F, B>): HK<F, B>

  /** Inherited from {@link FlatMap.tailRecM}. */
  abstract tailRecM<A, B>(a: A, f: (a: A) => HK<F, Either<A, B>>): HK<F, B>

  /** Inherited from {@link Apply.ap}. */
  ap<A, B>(fa: HK<F, A>, ff: HK<F, (a: A) => B>): HK<F, B> {
    return this.flatMap(fa, a => this.map(ff, f => f(a)))
  }

  /** Inherited from {@link Functor.map}. */
  map<A, B>(fa: HK<F, A>, f: (a: A) => B): HK<F, B> {
    return this.flatMap(fa, a => this.pure(f(a)))
  }

  /** Inherited from {@link Apply.map2}. */
  map2<A, B, Z>(fa: HK<F, A>, fb: HK<F, B>, f: (a: A, b: B) => Z): HK<F, Z> {
    const F = this
    return F.flatMap(fa, a => F.map(fb, b => f(a, b)))
  }

  /** Inherited from {@link Apply.product}. */
  product<A, B>(fa: HK<F, A>, fb: HK<F, B>): HK<F, [A, B]> {
    const F = this
    return F.flatMap(fa, a => F.map(fb, b => [a, b] as [A, B]))
  }

  /** Mixed-in from {@link Applicative.unit}. */
  unit: () => HK<F, void>
  /** Mixed-in from {@link FlatMap.followedBy}. */
  followedBy: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => HK<F, B>
  /** Mixed-in from {@link FlatMap.followedByL}. */
  followedByL: <A, B>(fa: HK<F, A>, fb: () => HK<F, B>) => HK<F, B>
  /** Mixed-in from {@link FlatMap.forEffect}. */
  forEffect: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => HK<F, A>
  /** Mixed-in from {@link FlatMap.forEffectL}. */
  forEffectL: <A, B>(fa: HK<F, A>, fb: () => HK<F, B>) => HK<F, A>

  // Implements TypeClass<F>

  /** @hidden */
  static readonly _funTypeId: string = "monad"
  /** @hidden */
  static readonly _funSupertypeIds: string[] = ["functor", "apply", "applicative", "flatMap"]
  /** @hidden */
  static readonly _funErasure: Monad<any>
}

applyMixins(Monad, [Applicative, FlatMap])

/**
 * Type class laws defined for {@link Monad}.
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
export abstract class MonadLaws<F> implements ApplicativeLaws<F>, FlatMapLaws<F> {
  /**
   * The {@link Monad} designated instance for `F`,
   * to be tested.
   */
  public readonly F: Monad<F>

  monadLeftIdentity<A, B>(a: A, f: (a: A) => HK<F, B>): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(F.flatMap(F.pure(a), f), f(a))
  }

  monadRightIdentity<A, B>(fa: HK<F, A>): Equiv<HK<F, A>> {
    const F = this.F
    return Equiv.of(F.flatMap(fa, F.pure), fa)
  }

  mapFlatMapCoherence<A, B>(fa: HK<F, A>, f: (a: A) => B): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(F.flatMap(fa, a => F.pure(f(a))), F.map(fa, f))
  }

  tailRecMStackSafety(): Equiv<HK<F, number>> {
    const F = this.F
    const n = 10000
    const res = F.tailRecM(0, i => F.pure(i < n ? Left(i + 1) : Right(i)))
    return Equiv.of(res, F.pure(n))
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

  /** Mixed-in from {@link ApplicativeLaws.applyComposition}. */
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

  /** Mixed-in from {@link FlatMapLaws.flatMapAssociativity}. */
  flatMapAssociativity: <A, B, C>(fa: HK<F, A>, f: (a: A) => HK<F, B>, g: (b: B) => HK<F, C>) => Equiv<HK<F, C>>
  /** Mixed-in from {@link FlatMapLaws.flatMapConsistentApply}. */
  flatMapConsistentApply: <A, B>(fa: HK<F, A>, fab: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link FlatMapLaws.followedByConsistency}. */
  followedByConsistency: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link FlatMapLaws.followedByLConsistency}. */
  followedByLConsistency: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link FlatMapLaws.forEffectConsistency}. */
  forEffectConsistency: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link FlatMapLaws.forEffectLConsistency}. */
  forEffectLConsistency: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link FlatMapLaws.tailRecMConsistentFlatMap}. */
  tailRecMConsistentFlatMap: <A>(a: A, f: (a: A) => HK<F, A>) => Equiv<HK<F, A>>
}

applyMixins(MonadLaws, [ApplicativeLaws, FlatMapLaws])

/**
 * Given a {@link Constructor} reference, returns its associated
 * {@link Monad} instance if it exists, or throws a {@link NotImplementedError}
 * in case there's no such association.
 *
 * ```typescript
 * import { Option, Monad, monadOf } from "funfix"
 *
 * const F: Monad<Option<any>> = monadOf(Option)
 * ```
 */
export const monadOf: <F>(c: Constructor<F>) => Monad<F> =
  getTypeClassInstance(Monad)

/**
 * Given an {@link Monad} instance, returns the {@link MonadLaws}
 * associated with it.
 */
export function monadLawsOf<F>(instance: Monad<F>): MonadLaws<F> {
  return new (class extends MonadLaws<F> { public readonly F = instance })()
}

/**
 * The `MonadError` type class is a {@link Applicative} that
 * also allows you to raise and or handle an error value.
 *
 * This type class allows one to abstract over error-handling
 * applicative types.
 *
 * MUST follow the law defined in {@link MonadErrorLaws}.
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
 *   MonadError,
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
 * class BoxMonadError implements MonadError<Box<any>, any> {
 *   pure<A>(a: A): Box<A> { return new Box(Try.success(a)) }
 *
 *   flatMap<A, B>(fa: BoxK<A>, f: (a: A) => BoxK<B>): Box<B> {
 *     throw new NotImplementedError("Provide implementation")
 *   }
 *
 *   tailRecM<A, B>(a: A, f: (a: A) => BoxK<Either<A, B>>): Box<B> {
 *     throw new NotImplementedError("Provide implementation")
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
 *   // Mixed in
 *   map: <A, B>(fa: BoxK<A>, f: (a: A) => B) => Box<B>
 *   map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
 *   ap: <A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>) => Box<B>
 *   product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
 *   unit: () => Box<void>
 *   followedBy: <A, B>(fa: BoxK<A>, fb: BoxK<B>) => Box<B>
 *   followedByL: <A, B>(fa: BoxK<A>, fb: () => BoxK<B>) => Box<B>
 *   forEffect: <A, B>(fa: BoxK<A>, fb: BoxK<B>) => Box<A>
 *   forEffectL: <A, B>(fa: BoxK<A>, fb: () => BoxK<B>) => Box<A>
 *   recover: <A>(fa: HK<Box<any>, A>, f: (e: any) => A) => HK<Box<any>, A>
 *   attempt: <A>(fa: HK<Box<any>, A>) => HK<Box<any>, Either<any, A>>
 * }
 *
 * // Call needed in order to implement `map`, `map2`, `product`, etc.
 * // using the default implementations defined by `MonadError`,
 * // because we are using `implements` instead of `extends` above and
 * // because in this sample we want the default implementations,
 * // but note that you can always provide your own
 * applyMixins(BoxMonadError, [MonadError])
 *
 * // Registering global MonadError instance for Box, needed in order
 * // for the `functorOf(Box)`, `applyOf(Box)`, `applicativeOf(Box)`
 * // and `monadErrorOf(Box)` calls to work
 * registerTypeClassInstance(MonadError)(Box, new BoxMonadError())
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
export abstract class MonadError<F, E> implements ApplicativeError<F, E>, Monad<F> {
  /** Inherited from {@link Applicative.pure}. */
  abstract pure<A>(a: A): HK<F, A>

  /** Inherited from {@link ApplicativeError.raise}. */
  abstract raise<A>(e: E): HK<F, A>

  /** Inherited from {@link FlatMap.flatMap}. */
  abstract flatMap<A, B>(fa: HK<F, A>, f: (a: A) => HK<F, B>): HK<F, B>

  /** Inherited from {@link FlatMap.tailRecM}. */
  abstract tailRecM<A, B>(a: A, f: (a: A) => HK<F, Either<A, B>>): HK<F, B>

  /** Inherited from {@link ApplicativeError.recoverWith}. */
  abstract recoverWith<A>(fa: HK<F, A>, f: (e: E) => HK<F, A>): HK<F, A>

  /** Mixed-in from {@link ApplicativeError.recover}. */
  recover: <A>(fa: HK<F, A>, f: (e: E) => A) => HK<F, A>
  /** Mixed-in from {@link ApplicativeError.attempt}. */
  attempt: <A>(fa: HK<F, A>) => HK<F, Either<E, A>>

  /** Mixed-in from {@link Applicative.unit}. */
  unit: () => HK<F, void>
  /** Mixed-in from {@link Applicative.map}. */
  map: <A, B>(fa: HK<F, A>, f: (a: A) => B) => HK<F, B>
  /** Mixed-in from {@link Apply.map2}. */
  map2: <A, B, Z>(fa: HK<F, A>, fb: HK<F, B>, f: (a: A, b: B) => Z) => HK<F, Z>
  /** Mixed-in from {@link Apply.product}. */
  product: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => HK<F, [A, B]>
  /** Mixed-in from {@link FlatMap.followedBy}. */
  followedBy: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => HK<F, B>
  /** Mixed-in from {@link FlatMap.followedByL}. */
  followedByL: <A, B>(fa: HK<F, A>, fb: () => HK<F, B>) => HK<F, B>
  /** Mixed-in from {@link FlatMap.forEffect}. */
  forEffect: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => HK<F, A>
  /** Mixed-in from {@link FlatMap.forEffectL}. */
  forEffectL: <A, B>(fa: HK<F, A>, fb: () => HK<F, B>) => HK<F, A>
  /** Mixed-in from {@link Monad.ap}. */
  ap: <A, B>(fa: HK<F, A>, ff: HK<F, (a: A) => B>) => HK<F, B>

  // Implements TypeClass<F>

  /** @hidden */
  static readonly _funTypeId: string = "monadError"
  /** @hidden */
  static readonly _funSupertypeIds: string[] =
    ["functor", "apply", "applicative", "monad", "applicativeError"]

  /** @hidden */
  static readonly _funErasure: MonadError<any, any>
}

applyMixins(MonadError, [Monad, ApplicativeError])

/**
 * Type class laws defined for {@link MonadError}.
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
export abstract class MonadErrorLaws<F, E> implements ApplicativeErrorLaws<F, E>, MonadLaws<F> {
  /**
   * The {@link MonadError} designated instance for `F`,
   * to be tested.
   */
  public readonly F: MonadError<F, E>

  monadErrorLeftZero<A, B>(e: E, f: (a: A) => HK<F, B>): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(F.flatMap(F.raise<A>(e), f), F.raise<B>(e))
  }

  /** Mixed-in from {@link ApplicativeErrorLaws.applicativeErrorRecoverWith}. */
  applicativeErrorRecoverWith: <A>(e: E, f: (e: E) => HK<F, A>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link ApplicativeErrorLaws.applicativeErrorRecover}. */
  applicativeErrorRecover: <A>(e: E, f: (e: E) => A) => Equiv<HK<F, A>>
  /** Mixed-in from {@link ApplicativeErrorLaws.recoverWithPure}. */
  recoverWithPure: <A>(a: A, f: (e: E) => HK<F, A>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link ApplicativeErrorLaws.recoverPure}. */
  recoverPure: <A>(a: A, f: (e: E) => A) => Equiv<HK<F, A>>
  /** Mixed-in from {@link ApplicativeErrorLaws.raiseErrorAttempt}. */
  raiseErrorAttempt: (e: E) => Equiv<HK<F, Either<E, void>>>
  /** Mixed-in from {@link ApplicativeErrorLaws.pureAttempt}. */
  pureAttempt: <A>(a: A) => Equiv<HK<F, Either<E, A>>>

  /** Mixed-in from {@link MonadLaws.monadLeftIdentity}. */
  monadLeftIdentity: <A, B>(a: A, f: (a: A) => HK<F, B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link MonadLaws.monadRightIdentity}. */
  monadRightIdentity: <A, B>(fa: HK<F, A>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link MonadLaws.mapFlatMapCoherence}. */
  mapFlatMapCoherence: <A, B>(fa: HK<F, A>, f: (a: A) => B) => Equiv<HK<F, B>>
  /** Mixed-in from {@link MonadLaws.tailRecMStackSafety}. */
  tailRecMStackSafety: () => Equiv<HK<F, number>>

  /** Mixed-in from {@link FlatMapLaws.flatMapAssociativity}. */
  flatMapAssociativity: <A, B, C>(fa: HK<F, A>, f: (a: A) => HK<F, B>, g: (b: B) => HK<F, C>) => Equiv<HK<F, C>>
  /** Mixed-in from {@link FlatMapLaws.flatMapConsistentApply}. */
  flatMapConsistentApply: <A, B>(fa: HK<F, A>, fab: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link FlatMapLaws.followedByConsistency}. */
  followedByConsistency: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link FlatMapLaws.followedByLConsistency}. */
  followedByLConsistency: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link FlatMapLaws.forEffectConsistency}. */
  forEffectConsistency: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link FlatMapLaws.forEffectLConsistency}. */
  forEffectLConsistency: <A, B>(fa: HK<F, A>, fb: HK<F, B>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link FlatMapLaws.tailRecMConsistentFlatMap}. */
  tailRecMConsistentFlatMap: <A>(a: A, f: (a: A) => HK<F, A>) => Equiv<HK<F, A>>

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

applyMixins(MonadErrorLaws, [MonadLaws, ApplicativeErrorLaws])

/**
 * Given a {@link Constructor} reference, returns its associated
 * {@link MonadError} instance if it exists, or throws a {@link NotImplementedError}
 * in case there's no such association.
 *
 * ```typescript
 * import { Eval, MonadError, monadErrorOf } from "funfix"
 *
 * const F: MonadError<Option<any>> = monadErrorOf(Eval)
 * ```
 */
export const monadErrorOf: <F, E>(c: Constructor<F>) => MonadError<F, E> =
  getTypeClassInstance(MonadError)

/**
 * Given an {@link MonadError} instance, returns the
 * {@link MonadErrorLaws} associated with it.
 */
export function monadErrorLawsOf<F,E>(instance: MonadError<F,E>): MonadErrorLaws<F,E> {
  return new (class extends MonadErrorLaws<F,E> { public readonly F = instance })()
}

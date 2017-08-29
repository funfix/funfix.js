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

import { HK, Equiv, Constructor, getTypeClassInstance } from "./kinds"
import { Functor, FunctorLaws } from "./functor"
import { applyMixins, id } from "funfix-core"

/**
 * The `CoflatMap` type class, a weaker version of {@link Comonad},
 * exposing `coflatMap`, but not `extract`.
 *
 * This type class is exposed in addition to `Comonad` because
 * there are data types for which we can't implement `extract`, but
 * that could still benefit from an `coflatMap` definition.
 *
 * MUST obey the laws defined in {@link CoflatMapLaws}.
 *
 * Note that having a `CoflatMap` instance implies that a
 * {@link Functor} implementation is also available, which is why
 * `CoflatMap` is a subtype of `Functor`.
 *
 * ## Implementation notes
 *
 * Even though in TypeScript the Funfix library is using `abstract class` to
 * express type classes, when implementing this type class it is recommended
 * that you implement it as a mixin using "`implements`", instead of extending
 * it directly with "`extends`". See
 * [TypeScript: Mixins]{@link https://www.typescriptlang.org/docs/handbook/mixins.html}
 * for details and note that we already have `applyMixins` defined.
 *
 * Implementation example:
 *
 * ```typescript
 * import {
 *   HK, CoflatMap,
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
 * class BoxCoflatMap implements CoflatMap<Box<any>> {
 *   map<A, B>(fa: BoxK<A>, f: (a: A) => B): Box<B> {
 *     const a = (fa as Box<A>).value
 *     return new Box(f(a))
 *   }
 *
 *   coflat
 * }
 *
 * // Call needed in order to implement `map2` and `product` using
 * // the default implementations defined by `CoflatMap`, because
 * // we are using `implements` instead of `extends` above and
 * // because in this sample we want the default implementations,
 * // but note that you can always provide your own definitions
 * applyMixins(BoxCoflatMap, [CoflatMap])
 *
 * // Registering global CoflatMap instance for Box, needed in order
 * // for the `coflatMapOf(Box)` calls to work
 * registerTypeClassInstance(CoflatMap)(Box, new BoxCoflatMap())
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
export abstract class CoflatMap<F> implements Functor<F> {
  /**
   * `coflatMap` is the dual of `flatMap` on {@link FlatMap}.
   *
   * It applies a value in a context to a function that takes a
   * value in a context and returns a normal value.
   */
  abstract coflatMap<A, B>(fa: HK<F, A>, ff: (a: HK<F, A>) => B): HK<F, B>

  /**
   * `coflatten` is the dual of `flatten` on {@link FlatMap}.
   *
   * Whereas `flatten` removes a layer of `F`, coflatten adds a
   * layer of `F`.
   */
  abstract coflatten<A>(fa: HK<F, A>): HK<F, HK<F, A>>

  /** Inherited from {@link Functor.map}. */
  map: <A, B>(fa: HK<F, A>, f: (a: A) => B) => HK<F, B>

  /** @hidden */
  static readonly _funTypeId: string = "coflatMap"
  /** @hidden */
  static readonly _funSupertypeIds: string[] = ["functor"]
  /** @hidden */
  static readonly _funErasure: CoflatMap<any>
}

applyMixins(CoflatMap, [Functor])

/**
 * Type class laws defined for {@link CoflatMap}.
 *
 * This is an abstract definition. In order to use it in unit testing,
 * the implementor must think of a strategy to evaluate the truthiness
 * of the returned `Equiv` values.
 *
 * Even though in TypeScript the Funfix library is using classes to
 * express these laws, when implementing this class it is recommended
 * that you implement it as a mixin using `implements`, instead of
 * extending it directly with `extends`. See
 * [TypeScript: Mixins]{@link https://www.typescriptlang.org/docs/handbook/mixins.html}
 * for details and note that we already have `applyMixins` defined.
 *
 * We are doing this in order to support multiple inheritance and to
 * avoid inheriting any `static` members. In the Flow definitions (e.g.
 * `.js.flow` files) for Funfix these classes are defined with
 * `interface`, as they are meant to be interfaces that sometimes have
 * default implementations and not classes.
 */
export abstract class CoflatMapLaws<F> implements FunctorLaws<F> {
  /**
   * The {@link CoflatMap} designated instance for `F`,
   * to be tested.
   */
  public readonly F: CoflatMap<F>

  /**
   * ```
   *  fa.coflatMap(f).coflatMap(g) <-> fa.coflatMap(x => g(x.coflatMap(f)))
   * ```
   */
  coflatMapAssociativity<A, B, C>(fa: HK<F, A>, f: (a: HK<F, A>) => B, g: (b: HK<F, B>) => C): Equiv<HK<F, C>> {
    const F = this.F
    return Equiv.of(
      F.coflatMap(F.coflatMap(fa, f), g),
      F.coflatMap(fa, a => g(F.coflatMap(a, f)))
    )
  }

  /**
   * ```
   * fa.coflatten.coflatten <-> fa.coflatten.map(_.coflatten)
   * ```
   */
  coflattenThroughMap<A>(fa: HK<F, A>): Equiv<HK<F, HK<F, HK<F, A>>>> {
    const F = this.F
    return Equiv.of(
      F.coflatten(F.coflatten(fa)),
      F.map(F.coflatten(fa), F.coflatten)
    )
  }

  /**
   * ```
   * fa.coflatMap(f) <-> fa.coflatten.map(f)
   * ```
   */
  coflattenCoherence<A, B>(fa: HK<F, A>, f: (a: HK<F, A>) => B): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(
      F.coflatMap(fa, f),
      F.map(F.coflatten(fa), f)
    )
  }

  /**
   * ```
   * fa.coflatten <-> fa.coflatMap(identity)
   * ```
   */
  coflatMapIdentity<A>(fa: HK<F, A>): Equiv<HK<F, HK<F, A>>> {
    const F = this.F
    return Equiv.of(
      F.coflatten(fa),
      F.coflatMap(fa, id)
    )
  }

  /** Mixed-in from {@link FunctorLaws.covariantIdentity}. */
  covariantIdentity: <A>(fa: HK<F, A>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link FunctorLaws.covariantComposition}. */
  covariantComposition: <A, B, C>(fa: HK<F, A>, f: (a: A) => B, g: (b: B) => C) => Equiv<HK<F, C>>
}

applyMixins(CoflatMapLaws, [FunctorLaws])

/**
 * Given a {@link Constructor} reference, returns its associated
 * {@link CoflatMap} instance if it exists, or throws a `NotImplementedError`
 * in case there's no such association.
 *
 * ```typescript
 * import { Option, CoflatMap, coflatMapOf } from "funfix"
 *
 * const F: CoflatMap<Option<any>> = coflatMapOf(Option)
 * ```
 */
export const coflatMapOf: <F>(c: Constructor<F>) => CoflatMap<F> =
  getTypeClassInstance(CoflatMap)

/**
 * Given an {@link CoflatMap} instance, returns the {@link CoflatMapLaws}
 * associated with it.
 */
export function coflatMapLawsOf<F>(instance: CoflatMap<F>): CoflatMapLaws<F> {
  return new (class extends CoflatMapLaws<F> { public readonly F = instance })()
}

// ---
/**
 * `Comonad` is the dual of {@link Monad}.
 *
 * Whereas Monads allow for the composition of effectful functions,
 * Comonads allow for composition of functions that extract the
 * value from their context.
 *
 * Example:
 *
 * ```typescript
 * const F = comonadOf(Eval)
 *
 * F.extract(Eval.of(() => 2)) // 2
 * ```
 *
 * Note that having an `Comonad` instance implies {@link Functor} and
 * {@link CoflatMap} implementations are also available, which is why
 * `Comonad` is a subtype of `Functor` and `CoflatMap`.
 *
 * ## Implementation notes
 *
 * Even though in TypeScript the Funfix library is using `abstract class` to
 * express type classes, when implementing this type class it is recommended
 * that you implement it as a mixin using "`implements`", instead of extending
 * it directly with "`extends`". See
 * [TypeScript: Mixins]{@link https://www.typescriptlang.org/docs/handbook/mixins.html}
 * for details and note that we already have `applyMixins` defined.
 *
 * Implementation example:
 *
 * ```typescript
 * import {
 *   HK, Comonad,
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
 * class BoxComonad implements Comonad<Box<any>> {
 *   map<A, B>(fa: BoxK<A>, f: (a: A) => B): BoxK<B> {
 *     const a = (fa as Box<A>).value
 *     return new Box(f(a))
 *   }
 *
 *   coflatMap<A, B>(fa: BoxK<A>, ff: (a: BoxK<A>) => B): BoxK<B> {
 *     return new Box(ff(fa))
 *   }
 *
 *   coflatten<A>(fa: BoxK<A>): BoxK<BoxK<A>> {
 *     return new Box(fa)
 *   }
 * }
 *
 * // Registering global Comonad instance for Box, needed in order
 * // for the `functorOf(Box)`, `coflatMapOf(Box)` and `comonadOf(Box)`
 * // calls to work
 * registerTypeClassInstance(Comonad)(Box, new BoxComonad())
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
export abstract class Comonad<F> implements CoflatMap<F> {
  /**
   * `extract` is the dual of `pure` on {@link Monad}
   * (via {@link Applicative}) and extracts the value from
   * its context.
   *
   * Example:
   *
   * ```typescript
   * const cm = comonadOf(Eval)
   *
   * cm.extract(Eval.of(() => 10)) //=> 10
   * ```
   */
  abstract extract<A>(fa: HK<F, A>): A

  /** Inherited from {@link Functor.map}. */
  map: <A, B>(fa: HK<F, A>, f: (a: A) => B) => HK<F, B>
  /** Inherited from {@link CoflatMap.coflatMap}. */
  coflatMap: <A, B>(fa: HK<F, A>, ff: (a: HK<F, A>) => B) => HK<F, B>
  /** Inherited from {@link CoflatMap.coflatten}. */
  coflatten: <A>(fa: HK<F, A>) => HK<F, HK<F, A>>

  // Implements TypeClass<F>

  /** @hidden */
  static readonly _funTypeId: string = "comonad"
  /** @hidden */
  static readonly _funSupertypeIds: string[] = ["functor", "apply"]
  /** @hidden */
  static readonly _funErasure: Comonad<any>
}

applyMixins(Comonad, [CoflatMap])

/**
 * Type class laws defined for {@link Comonad}.
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
 * for details and note that we already have `applyMixins` defined.
 *
 * We are doing this in order to support multiple inheritance and to
 * avoid inheriting any `static` members. In the Flow definitions (e.g.
 * `.js.flow` files) for Funfix these classes are defined with
 * `interface`, as they are meant to be interfaces that sometimes have
 * default implementations and not classes.
 */
export abstract class ComonadLaws<F> implements CoflatMapLaws<F> {
  /**
   * The {@link Comonad} designated instance for `F`,
   * to be tested.
   */
  public readonly F: Comonad<F>

  /** Mixed-in from {@link CoflatMapLaws.coflatMapAssociativity}. */
  coflatMapAssociativity: <A, B, C>(fa: HK<F, A>, f: (a: HK<F, A>) => B, g: (b: HK<F, B>) => C) => Equiv<HK<F, C>>
  /** Mixed-in from {@link CoflatMapLaws.coflattenThroughMap}. */
  coflattenThroughMap: <A>(fa: HK<F, A>) => Equiv<HK<F, HK<F, HK<F, A>>>>
  /** Mixed-in from {@link CoflatMapLaws.coflattenCoherence}. */
  coflattenCoherence: <A, B>(fa: HK<F, A>, f: (a: HK<F, A>) => B) => Equiv<HK<F, B>>
  /** Mixed-in from {@link CoflatMapLaws.coflatMapIdentity}. */
  coflatMapIdentity: <A>(fa: HK<F, A>) => Equiv<HK<F, HK<F, A>>>

  /** Mixed-in from {@link FunctorLaws.covariantIdentity}. */
  covariantIdentity: <A>(fa: HK<F, A>) => Equiv<HK<F, A>>
  /** Mixed-in from {@link FunctorLaws.covariantComposition}. */
  covariantComposition: <A, B, C>(fa: HK<F, A>, f: (a: A) => B, g: (b: B) => C) => Equiv<HK<F, C>>

  /** Mixed-in from {@link CoflatMapLaws.applyComposition}. */
  applyComposition: <A, B, C>(fa: HK<F, A>, fab: HK<F, (a: A) => B>, fbc: HK<F, (b: B) => C>) => Equiv<HK<F, C>>
  /** Mixed-in from {@link CoflatMapLaws.applyProductConsistency}. */
  applyProductConsistency: <A, B>(fa: HK<F, A>, f: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
  /** Mixed-in from {@link CoflatMapLaws.applyMap2Consistency}. */
  applyMap2Consistency: <A, B>(fa: HK<F, A>, f: HK<F, (a: A) => B>) => Equiv<HK<F, B>>
}

applyMixins(ComonadLaws, [CoflatMapLaws])

/**
 * Given a {@link Constructor} reference, returns its associated
 * {@link Comonad} instance if it exists, or throws a `NotImplementedError`
 * in case there's no such association.
 *
 * ```typescript
 * import { Option, Comonad, comonadOf } from "funfix"
 *
 * const F: Comonad<Option<any>> = comonadOf(Option)
 * ```
 */
export const comonadOf: <F>(c: Constructor<F>) => Comonad<F> =
  getTypeClassInstance(Comonad)

/**
 * Given an {@link Comonad} instance, returns the {@link ComonadLaws}
 * associated with it.
 */
export function comonadLawsOf<F>(instance: Comonad<F>): ComonadLaws<F> {
  return new (class extends ComonadLaws<F> { public readonly F = instance })()
}

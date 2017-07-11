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
 * Exposes the {@link Option} monadic data type for expressing optional values
 * (i.e. a smart nullable type).
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Option } from "funfix/dist/core/option"
 * // ... or ...
 * import { Option } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module core/option
 */

/***/

import * as std from "./std"
import { NoSuchElementError } from "./errors"
import { Applicative } from "../types/applicative"
import { Eq } from "../types/eq"
import { HK } from "../types/kinds"

/**
 * Represents optional values, inspired by Scala's `Option` and by
 * Haskell's `Maybe` data types.
 *
 * Option is an immutable data type, represented as a sum type, being
 * either a [[Some]], in case it contains a single element, or a [[None]],
 * in case it is empty.
 *
 * The most idiomatic way to use an `Option` instance is to treat it
 * as a collection or monad and use `map`,`flatMap`, `filter`,
 * or `forEach`.
 *
 * @final
 */
export class Option<A> implements std.IEquals<Option<A>>, OptionK<A> {
  // tslint:disable-next-line:variable-name
  private _isEmpty: boolean
  private _ref: A

  private constructor(ref: A, isEmpty?: boolean) {
    /* tslint:disable-next-line:strict-type-predicates */
    this._isEmpty = isEmpty != null ? isEmpty : (ref === null || ref === undefined)
    this._ref = ref
  }

  /**
   * Returns the option's value.
   *
   * WARNING!
   *
   * This function is partial, the option must be non-empty, otherwise
   * a runtime exception will get thrown. Use with care.
   *
   * @throws [[NoSuchElementError]] in case the option is empty
   */
  get(): A {
    if (!this._isEmpty) return this._ref
    else throw new NoSuchElementError("Option.get")
  }

  /**
   * Returns the option's value if the option is nonempty, otherwise
   * return the given `fallback`.
   *
   * See [[Option.getOrElseL]] for a lazy alternative.
   */
  getOrElse(fallback: A): A {
    if (!this._isEmpty) return this._ref
    else return fallback
  }

  /**
   * Returns the option's value if the option is nonempty, otherwise
   * return `null`.
   */
  orNull(): A | null {
    if (!this._isEmpty) return this._ref
    else return null
  }

  /**
   * Returns the option's value if the option is nonempty, otherwise
   * return the result of evaluating `thunk`.
   *
   * See [[Option.getOrElse]] for a strict alternative.
   */
  getOrElseL(thunk: () => A): A {
    if (!this._isEmpty) return this._ref
    else return thunk()
  }

  /**
   * Returns this option if it is nonempty, otherwise returns the
   * given `fallback`.
   */
  orElse(fallback: Option<A>): Option<A> {
    if (!this._isEmpty) return this
    else return fallback
  }

  /**
   * Returns this option if it is nonempty, otherwise returns the
   * given result of evaluating the given `thunk`.
   *
   * @param thunk a no-params function that gets evaluated and
   *        whose result is returned in case this option is empty
   */
  orElseL(thunk: () => Option<A>): Option<A> {
    if (!this._isEmpty) return this
    else return thunk()
  }

  /**
   * Returns `true` if the option is empty, `false` otherwise.
   */
  isEmpty(): boolean { return this._isEmpty }

  /**
   * Returns `true` if the option is not empty, `false` otherwise.
   */
  nonEmpty(): boolean { return !this._isEmpty }

  /**
   * Returns an option containing the result of applying `f` to
   * this option's value, or an empty option if the source is empty.
   *
   * NOTE: this is similar with `flatMap`, except with `map` the
   * result of `f` doesn't need to be wrapped in an `Option`.
   *
   * @param f the mapping function that will transform the value
   *          of this option if nonempty.
   *
   * @return a new option instance containing the value of the
   *         source mapped by the given function
   */
  map<B>(f: (a: A) => B): Option<B> {
    return this._isEmpty ? None : Some(f(this._ref))
  }

  /**
   * Returns an optioning containing the result of the source mapped
   * by the given function `f`.
   *
   * Similar to `map`, except that if the mapping function `f` returns
   * `null`, then the final result returned will be [[Option.none]].
   *
   * Comparison:
   *
   * ```typescript
   * Option.of(1).mapN(x => null) // None
   * Option.of(1).map(x => null)  // Some(null)
   *
   * Option.of(1).mapN(x => x+1)  // 2
   * Option.of(1).map(x => x+1)   // 2
   * ```
   *
   * What this operation does is to allow for safe chaining of multiple
   * method calls or functions that might produce `null` results:
   *
   * ```typescript
   * Option.of(user)
   *   .mapN(_ => _.contacts)
   *   .mapN(_ => _.length)
   * ```
   */
  mapN<B>(f: (a: A) => B): Option<B> {
    return this._isEmpty ? None : Option.of(f(this._ref))
  }

  /**
   * Returns the result of applying `f` to this option's value if
   * the option is nonempty, otherwise returns an empty option.
   *
   * NOTE: this is similar with `map`, except that `flatMap` the
   * result returned by `f` is expected to be boxed in an `Option`
   * already.
   *
   * Example:
   *
   * ```typescript
   * const opt = Option.of(10)
   *
   * opt.flatMap(num => {
   *   if (num % 2 == 0)
   *     Some(num + 1)
   *   else
   *     None
   * })
   * ```
   *
   * @param f the mapping function that will transform the value
   *          of this option if nonempty.
   *
   * @return a new option instance containing the value of the
   *         source mapped by the given function
   */
  flatMap<B>(f: (a: A) => Option<B>): Option<B> {
    if (this._isEmpty) return None
    else return f(this._ref)
  }

  /** Alias for [[flatMap]]. */
  chain<B>(f: (a: A) => Option<B>): Option<B> {
    return this.flatMap(f)
  }

  /**
   * Returns this option if it is nonempty AND applying the
   * predicate `p` to the underlying value yields `true`,
   * otherwise return an empty option.
   *
   * @param p is the predicate function that is used to
   *        apply filtering on the option's value
   *
   * @return a new option instance containing the value of the
   *         source filtered with the given predicate
   */
  filter(p: (a: A) => boolean): Option<A> {
    if (this._isEmpty || !p(this._ref)) return None
    else return this
  }

  /**
   * Returns the result of applying `f` to this option's value,
   * or in case the option is empty, the return the result of
   * evaluating the `fallback` function.
   *
   * This function is equivalent with:
   *
   * ```typescript
   * opt.map(f).getOrElseL(fallback)
   * ```
   *
   * @param fallback is the function to be evaluated in case this
   *        option is empty
   *
   * @param f is the mapping function for transforming this option's
   *        value in case it is nonempty
   */
  fold<B>(fallback: () => B, f: (a: A) => B): B {
    if (this._isEmpty) return fallback()
    else return f(this._ref)
  }

  /**
   * Returns true if this option is nonempty and the value it
   * holds is equal to the given `elem`.
   */
  contains(elem: A): boolean {
    return !this._isEmpty && std.is(this._ref, elem)
  }

  /**
   * Returns `true` if this option is nonempty and the given
   * predicate returns `true` when applied on this option's value.
   *
   * @param p is the predicate function to test
   */
  exists(p: (a: A) => boolean): boolean {
    return !this._isEmpty && p(this._ref)
  }

  /**
   * Returns true if this option is empty or the given predicate
   * returns `true` when applied on this option's value.
   *
   * @param p is the predicate function to test
   */
  forAll(p: (a: A) => boolean): boolean {
    return this._isEmpty || p(this._ref)
  }

  /**
   * Apply the given procedure `cb` to the option's value if
   * this option is nonempty, otherwise do nothing.
   *
   * @param cb the procedure to apply
   */
  forEach(cb: (a: A) => void): void {
    if (!this._isEmpty) cb(this._ref)
  }

  // Implemented from IEquals
  equals(that: Option<A>): boolean {
    // tslint:disable-next-line:strict-type-predicates
    if (that == null) return false
    if (this.nonEmpty() && that.nonEmpty()) {
      const l = this.get()
      const r = that.get()
      return std.is(l, r)
    }
    return this.isEmpty() && that.isEmpty()
  }

  // Implemented from IEquals
  hashCode(): number {
    if (this._isEmpty) return 2433880
    else if (this._ref == null) return 2433881 << 2
    else return std.hashCode(this._ref) << 2
  }

  // tslint:disable-next-line:variable-name
  __hkF: () => Option<any>
  // tslint:disable-next-line:variable-name
  __hkA: () => A

  // tslint:disable-next-line:variable-name
  static __types = {
    functor: () => OptionInstances.global,
    applicative: () => OptionInstances.global,
    eq: () => OptionInstances.global
  }

  /**
   * Builds an [[Option]] reference that contains the given value.
   *
   * If the given value is `null` or `undefined` then the returned
   * option will be empty.
   */
  static of<A>(value: A | null | undefined): Option<A> {
    return value != null ? Some(value) : None
  }

  /**
   * Builds an [[Option]] reference that contains the given reference.
   *
   * Note that `value` is allowed to be `null` or `undefined`, the
   * returned option will still be non-empty. Use [[Option.of]]
   * if you want to avoid this problem. This means:
   *
   * ```typescript
   * const opt = Some<number | null>(null)
   *
   * opt.isEmpty()
   * //=> false
   *
   * opt.get()
   * //=> null
   * ```
   */
  static some<A>(value: A): Option<A> {
    return new Option(value, false)
  }

  /**
   * Returns an empty [[Option]].
   *
   * NOTE: Because `Option` is immutable, this function returns the
   * same cached reference is on different calls.
   */
  static none(): Option<never> {
    return None
  }

  /**
   * Returns an empty [[Option]].
   *
   * Similar to [[Option.none]], but this one allows specifying a
   * type parameter (in the context of Typescript or Flow or other
   * type system).
   *
   * NOTE: Because `Option` is immutable, this function returns the
   * same cached reference is on different calls.
   */
  static empty<A>(): Option<A> {
    return None
  }

  /**
   * Alias for [[Some]].
   */
  static pure<A>(value: A): Option<A> { return Some(value) }

  /**
   * Maps 2 optional values by the mapping function, returning a new
   * optional reference that is `Some` only if both option values are
   * `Some`, otherwise it returns a `None`.
   *
   * ```typescript
   * // Yields Some(3)
   * Option.map2(Some(1), Some(2),
   *   (a, b) => a + b
   * )
   *
   * // Yields None, because the second arg is None
   * Option.map2(Some(1), None,
   *   (a, b) => a + b
   * )
   * ```
   *
   * This operation is the `Applicative.map2`.
   */
  static map2<A1,A2,R>(fa1: Option<A1>, fa2: Option<A2>,
    f: (a1: A1, a2: A2) => R): Option<R> {

    return fa1.nonEmpty() && fa2.nonEmpty()
      ? Some(f(fa1.get(), fa2.get()))
      : None
  }

  /**
   * Maps 3 optional values by the mapping function, returning a new
   * optional reference that is `Some` only if all 3 option values are
   * `Some`, otherwise it returns a `None`.
   *
   * ```typescript
   * // Yields Some(6)
   * Option.map3(Some(1), Some(2), Some(3),
   *   (a, b, c) => a + b + c
   * )
   *
   * // Yields None, because the second arg is None
   * Option.map3(Some(1), None, Some(3),
   *   (a, b, c) => a + b + c
   * )
   * ```
   */
  static map3<A1,A2,A3,R>(fa1: Option<A1>, fa2: Option<A2>, fa3: Option<A3>,
    f: (a1: A1, a2: A2, a3: A3) => R): Option<R> {

    return fa1.nonEmpty() && fa2.nonEmpty() && fa3.nonEmpty()
      ? Some(f(fa1.get(), fa2.get(), fa3.get()))
      : None
  }

  /**
   * Maps 4 optional values by the mapping function, returning a new
   * optional reference that is `Some` only if all 4 option values are
   * `Some`, otherwise it returns a `None`.
   *
   * ```typescript
   * // Yields Some(10)
   * Option.map4(Some(1), Some(2), Some(3), Some(4),
   *   (a, b, c, d) => a + b + c + d
   * )
   *
   * // Yields None, because the second arg is None
   * Option.map4(Some(1), None, Some(3), Some(4),
   *   (a, b, c, d) => a + b + c + d
   * )
   * ```
   */
  static map4<A1,A2,A3,A4,R>(
    fa1: Option<A1>, fa2: Option<A2>, fa3: Option<A3>, fa4: Option<A4>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4) => R): Option<R> {

    return fa1.nonEmpty() && fa2.nonEmpty() && fa3.nonEmpty() && fa4.nonEmpty()
      ? Some(f(fa1.get(), fa2.get(), fa3.get(), fa4.get()))
      : None
  }

  /**
   * Maps 5 optional values by the mapping function, returning a new
   * optional reference that is `Some` only if all 5 option values are
   * `Some`, otherwise it returns a `None`.
   *
   * ```typescript
   * // Yields Some(15)
   * Option.map5(Some(1), Some(2), Some(3), Some(4), Some(5),
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   *
   * // Yields None, because the second arg is None
   * Option.map5(Some(1), None, Some(3), Some(4), Some(5),
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   * ```
   */
  static map5<A1,A2,A3,A4,A5,R>(
    fa1: Option<A1>, fa2: Option<A2>, fa3: Option<A3>, fa4: Option<A4>, fa5: Option<A5>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R): Option<R> {

    return fa1.nonEmpty() && fa2.nonEmpty() && fa3.nonEmpty() && fa4.nonEmpty() && fa5.nonEmpty()
      ? Some(f(fa1.get(), fa2.get(), fa3.get(), fa4.get(), fa5.get()))
      : None
  }

  /**
   * Maps 6 optional values by the mapping function, returning a new
   * optional reference that is `Some` only if all 6 option values are
   * `Some`, otherwise it returns a `None`.
   *
   * ```typescript
   * // Yields Some(21)
   * Option.map6(Some(1), Some(2), Some(3), Some(4), Some(5), Some(6),
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   *
   * // Yields None, because the second arg is None
   * Option.map6(Some(1), None, Some(3), Some(4), Some(5), Some(6),
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   * ```
   */
  static map6<A1,A2,A3,A4,A5,A6,R>(
    fa1: Option<A1>, fa2: Option<A2>, fa3: Option<A3>, fa4: Option<A4>, fa5: Option<A5>, fa6: Option<A6>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => R): Option<R> {

    return fa1.nonEmpty() && fa2.nonEmpty() && fa3.nonEmpty() && fa4.nonEmpty() && fa5.nonEmpty() && fa6.nonEmpty()
      ? Some(f(fa1.get(), fa2.get(), fa3.get(), fa4.get(), fa5.get(), fa6.get()))
      : None
  }
}

/**
 * The `Some<A>` data constructor for [[Option]] represents existing
 * values of type `A`.
 *
 * Using this function is equivalent with [[Option.some]].
 */
export function Some<A>(value: A): Option<A> {
  return new (Option as any)(value, false)
}

/**
 * The `None` data constructor for [[Option]] represents non-existing
 * values for any type.
 *
 * Using this reference directly is equivalent with [[Option.none]].
 */
export const None: Option<never> =
  (function () {
    // Ugly workaround to get around the limitation of
    // Option's private constructor
    const F: any = Option
    return new F(null, true) as Option<never>
  })()

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type OptionK<A> = HK<Option<any>, A>

/**
 * Type class instances provided by default for [[Option]].
 */
export class OptionInstances extends Applicative<Option<any>> implements Eq<Option<any>> {
  // tslint:disable-next-line:variable-name
  private __unit: Option<void> = Some(undefined)

  /** @inheritdoc */
  eqv(lh: Option<any>, rh: Option<any>): boolean {
    return lh.equals(rh)
  }

  /** @inheritdoc */
  pure<A>(a: A): Option<A> {
    return Some(a)
  }

  /** @inheritdoc */
  unit(): Option<void> {
    return this.__unit
  }

  /** @inheritdoc */
  ap<A, B>(fa: OptionK<A>, ff: OptionK<(a: A) => B>): Option<B> {
    return Option.map2(fa as Option<A>, ff as Option<(a: A) => B>, (a, f) => f(a))
  }

  /** @inheritdoc */
  map<A, B>(fa: OptionK<A>, f: (a: A) => B): Option<B> {
    return (fa as Option<A>).map(f)
  }

  /** @inheritdoc */
  map2<A, B, Z>(fa: OptionK<A>, fb: OptionK<B>, f: (a: A, b: B) => Z): Option<Z> {
    return Option.map2(fa as Option<A>, fb as Option<B>, f)
  }

  /** @inheritdoc */
  product<A, B>(fa: OptionK<A>, fb: OptionK<B>): Option<[A, B]> {
    return Option.map2(fa as Option<A>, fb as Option<B>, (a, b) => [a, b] as [A, B])
  }

  static global: OptionInstances =
    new OptionInstances()
}

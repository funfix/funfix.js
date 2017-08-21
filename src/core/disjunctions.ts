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
 * Exposes data types for expression disjunctions:
 *
 * - {@link Either}: data type for expressing results with two possible
 *   outcome types (a disjoint union)
 * - {@link Option}: data type for expressing optional values
 * - {@link Try}: data type for representing the result of computations
 *   that may result in either success or failure
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Either } from "funfix/dist/core/disjunction"
 * // ... or ...
 * import { Either } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module core/disjunction
 */

/***/
import * as std from "./std"
import { NoSuchElementError } from "./errors"

/**
 * Represents a value of one of two possible types (a disjoint union).
 *
 * A common use of Either is as an alternative to [[Option]] for dealing
 * with possible missing values. In this usage [[Option.none]] is replaced
 * with [[Either.left]] which can contain useful information and
 * [[Option.some]] is replaced with [[Either.right]].
 *
 * Convention dictates that `left` is used for failure and `right` is used
 * for success. Note that this `Either` type is right-biased, meaning that
 * operations such as `map`, `flatMap` and `filter` work on the `right` value
 * and if you want to work on the `left` value, then you need to do a `swap`.
 *
 * For example, you could use `Either<String, Int>` to detect whether an
 * input is a string or an number:
 *
 * ```typescript
 * function tryParseInt(str: string): Either<string, number> {
 *   const i = parseInt(value)
 *   return isNaN(i) ? Left(str) : Right(i)
 * }
 *
 * const result = tryParseInt("not an int")
 * if (result.isRight()) {
 *   console.log(`Increment: ${result.get}`)
 * } else {
 *   console.log(`ERROR: could not parse ${result.swap.get}`)
 * }
 * ```
 *
 * @final
 */
export class Either<L, R> implements std.IEquals<Either<L, R>> {
  private _isRight: boolean
  private _rightRef: R
  private _leftRef: L

  private constructor(_leftRef: L, _rightRef: R, _isRight: boolean) {
    this._isRight = _isRight
    if (_isRight) this._rightRef = _rightRef
    else this._leftRef = _leftRef
  }

  /**
   * Returns `true` if this is a `left`, `false` otherwise.
   *
   * ```typescript
   * Left("hello").isLeft() // true
   * Right(10).isLeft() // false
   * ```
   */
  isLeft(): boolean { return !this._isRight }

  /**
   * If the source is a `left` value, then returns it unchanged
   * and casted as a `Left`, otherwise throw exception.
   *
   * WARNING!
   *
   * This function is partial, the reference must be a `Left,
   * otherwise a runtime exception will get thrown. Use with care.
   *
   * @throws NoSuchElementError
   */
  left(): Either<L, never> {
    if (!this._isRight) return this as any
    throw new NoSuchElementError("either.left")
  }

  /**
   * Returns `true` if this is a `right`, `false` otherwise.
   *
   * ```typescript
   * Left("hello").isRight() // false
   * Right(10).isRight() // true
   * ```
   */
  isRight(): boolean { return this._isRight }

  /**
   * If the source is a `right` value, then returns it unchanged
   * and casted as a `Right`, otherwise throw exception.
   *
   * WARNING!
   *
   * This function is partial, the reference must be a `Right,
   * otherwise a runtime exception will get thrown. Use with care.
   *
   * @throws NoSuchElementError
   */
  right(): Either<never, R> {
    if (this._isRight) return this as any
    throw new NoSuchElementError("either.right")
  }

  /**
   * Returns true if this is a Right and its value is equal to `elem`
   * (as determined by the `equals` protocol), returns `false` otherwise.
   *
   * ```typescript
   * // True
   * Right("something").contains("something")
   *
   * // False because the values are different
   * Right("something").contains("anything") // false
   *
   * // False because the source is a `left`
   * Left("something").contains("something") // false
   * ```
   */
  contains(elem: R): boolean {
    return this._isRight && std.is(this._rightRef, elem)
  }

  /**
   * Returns `false` if the source is a `left`, or returns the result
   * of the application of the given predicate to the `right` value.
   *
   * ```typescript
   * // True, because it is a right and predicate holds
   * Right(20).exists(n => n > 10)
   *
   * // False, because the predicate returns false
   * Right(10).exists(n => n % 2 != 0)
   *
   * // False, because it is a left
   * Left(10).exists(n => n == 10)
   * ```
   */
  exists(p: (r: R) => boolean): boolean {
    return this._isRight && p(this._rightRef)
  }

  /**
   * Filters `right` values with the given predicate, returning
   * the value generated by `zero` in case the source is a `right`
   * value and the predicate doesn't hold.
   *
   * Possible outcomes:
   *
   *  - Returns the existing value of `right` if this is a `right` value and the
   *    given predicate `p` holds for it
   *  - Returns `Left(zero())` if this is a `right` value
   *    and the given predicate `p` does not hold
   *  - Returns the current "left" value, if the source is a `Left`
   *
   * ```typescript
   * Right(12).filterOrElse(x => x > 10, () => -1) // Right(12)
   * Right(7).filterOrElse(x => x > 10, () => -1)  // Left(-1)
   * Left(7).filterOrElse(x => false, () => -1)    // Left(7)
   * ```
   */
  filterOrElse(p: (r: R) => boolean, zero: () => L): Either<L, R> {
    return this._isRight
      ? (p(this._rightRef) ? this.right() : Left(zero()))
      : this.left()
  }

  /**
   * Binds the given function across `right` values.
   *
   * This operation is the monadic "bind" operation.
   * It can be used to *chain* multiple `Either` references.
   */
  flatMap<S>(f: (r: R) => Either<L, S>): Either<L, S> {
    return this._isRight ? f(this._rightRef) : this.left()
  }

  /**
   * Applies the `left` function to [[Left]] values, and the
   * `right` function to [[Right]] values and returns the result.
   *
   * ```typescript
   * const maybeNum: Either<string, number> =
   *   tryParseInt("not a number")
   *
   * const result: string =
   *   maybeNum.fold(
   *     str => `Could not parse string: ${str}`,
   *     num => `Success: ${num}`
   *   )
   * ```
   */
  fold<S>(left: (l: L) => S, right: (r: R) => S): S {
    return this._isRight ? right(this._rightRef) : left(this._leftRef)
  }

  /**
   * Returns true if the source is a `left` or returns
   * the result of the application of the given predicate to the
   * `right` value.
   *
   * ```typescript
   * // True, because it is a `left`
   * Left("hello").forAll(x => x > 10)
   *
   * // True, because the predicate holds
   * Right(20).forAll(x => x > 10)
   *
   * // False, it's a right and the predicate doesn't hold
   * Right(7).forAll(x => x > 10)
   * ```
   */
  forAll(p: (r: R) => boolean): boolean {
    return !this._isRight || p(this._rightRef)
  }

  /**
   * Returns the `Right` value, if the source has one,
   * otherwise throws an exception.
   *
   * WARNING!
   *
   * This function is partial, the `Either` must be a `Right`, otherwise
   * a runtime exception will get thrown. Use with care.
   *
   * @throws [[NoSuchElementError]] in case the the `Either` is a `Left`
   */
  get(): R {
    if (this._isRight) return this._rightRef
    throw new NoSuchElementError("left.get()")
  }

  /**
   * Returns the value from this `right` or the given `fallback`
   * value if this is a `left`.
   *
   * ```typescript
   * Right(10).getOrElse(27) // 10
   * Left(10).getOrElse(27)  // 27
   * ```
   */
  getOrElse<RR>(fallback: RR): R | RR {
    return this._isRight ? this._rightRef : fallback
  }

  /**
   * Returns the value from this `right` or a value generated
   * by the given `thunk` if this is a `left`.
   *
   * ```typescript
   * Right(10).getOrElseL(() => 27) // 10
   * Left(10).getOrElseL(() => 27)  // 27
   * ```
   */
  getOrElseL<RR>(thunk: () => RR): R | RR {
    return this._isRight ? this._rightRef : thunk()
  }

  /**
   * Transform the source if it is a `right` with the given
   * mapping function.
   *
   * ```typescript
   * Right(10).map(x => x + 17) // right(27)
   * Left(10).map(x => x + 17)  // left(10)
   * ```
   */
  map<C>(f: (r: R) => C): Either<L, C> {
    return this._isRight
      ? Right(f(this._rightRef))
      : this.left()
  }

  /**
   * Executes the given side-effecting function if the
   * source is a `right` value.
   *
   * ```typescript
   * Right(12).forAll(console.log) // prints 12
   * Left(10).forAll(console.log)  // silent
   * ```
   */
  forEach(cb: (r: R) => void): void {
    if (this._isRight) cb(this._rightRef)
  }

  /**
   * If this is a `left`, then return the left value as a `right`
   * or vice versa.
   *
   * ```typescript
   * Right(10).swap() // left(10)
   * Left(20).swap()  // right(20)
   * ```
   */
  swap(): Either<R, L> {
    return this._isRight
      ? Left(this._rightRef)
      : Right(this._leftRef)
  }

  /**
   * Returns an `Option.some(right)` if the source is a `right` value,
   * or `Option.none` in case the source is a `left` value.
   */
  toOption(): Option<R> {
    return this._isRight
      ? Option.some(this._rightRef)
      : Option.none()
  }

  /** Implements {@link IEquals.equals}. */
  equals(other: Either<L, R>): boolean {
    // tslint:disable-next-line:strict-type-predicates
    if (other == null) return false
    if (this._isRight) return std.is(this._rightRef, other._rightRef)
    return std.is(this._leftRef, other._leftRef)
  }

  /** Implements {@link IEquals.hashCode}. */
  hashCode(): number {
    return this._isRight
      ? std.hashCode(this._rightRef) << 2
      : std.hashCode(this._leftRef) << 3
  }

  // Implements HK<F, A>
  readonly _funKindF: Either<L, any>
  readonly _funKindA: R

  // Implements Constructor<T>
  static readonly _funErasure: Either<any, any>

  static left<L, R>(value: L): Either<L, R> {
    return Left(value)
  }

  static right<L, R>(value: R): Either<L, R> {
    return Right(value)
  }

  /**
   * Maps 2 `Either` values by the mapping function, returning a new
   * `Either` reference that is a `Right` only if both `Either` values are
   * `Right` values, otherwise it returns the first `Left` value noticed.
   *
   * ```typescript
   * // Yields Right(3)
   * Try.map2(Right(1), Right(2),
   *   (a, b) => a + b
   * )
   *
   * // Yields Left, because the second arg is a Left
   * Try.map2(Right(1), Left("error"),
   *   (a, b) => a + b
   * )
   * ```
   *
   * This operation is the `Applicative.map2`.
   */
  static map2<A1,A2,L,R>(fa1: Either<L,A1>, fa2: Either<L,A2>,
                         f: (a1: A1, a2: A2) => R): Either<L, R> {

    if (fa1.isLeft()) return ((fa1 as any) as Either<L, R>)
    if (fa2.isLeft()) return ((fa2 as any) as Either<L, R>)
    return Right(f(fa1._rightRef, fa2._rightRef))
  }

  /**
   * Maps 3 `Either` values by the mapping function, returning a new
   * `Either` reference that is a `Right` only if all 3 `Either` values are
   * `Right` values, otherwise it returns the first `Left` value noticed.
   *
   * ```typescript
   * // Yields Right(6)
   * Try.map3(Right(1), Right(2), Right(3),
   *   (a, b, c) => a + b + c
   * )
   *
   * // Yields Left, because the second arg is a Left
   * Try.map3(Right(1), Left("error"), Right(3),
   *   (a, b, c) => a + b + c
   * )
   * ```
   */
  static map3<A1,A2,A3,L,R>(
    fa1: Either<L,A1>, fa2: Either<L,A2>, fa3: Either<L,A3>,
    f: (a1: A1, a2: A2, a3: A3) => R): Either<L, R> {

    if (fa1.isLeft()) return ((fa1 as any) as Either<L, R>)
    if (fa2.isLeft()) return ((fa2 as any) as Either<L, R>)
    if (fa3.isLeft()) return ((fa3 as any) as Either<L, R>)
    return Right(f(fa1._rightRef, fa2._rightRef, fa3._rightRef))
  }

  /**
   * Maps 4 `Either` values by the mapping function, returning a new
   * `Either` reference that is a `Right` only if all 4 `Either` values are
   * `Right` values, otherwise it returns the first `Left` value noticed.
   *
   * ```typescript
   * // Yields Right(10)
   * Try.map4(Right(1), Right(2), Right(3), Right(4),
   *   (a, b, c, d) => a + b + c + d
   * )
   *
   * // Yields Left, because the second arg is a Left
   * Try.map4(Right(1), Left("error"), Right(3), Right(4),
   *   (a, b, c, d) => a + b + c + d
   * )
   * ```
   */
  static map4<A1,A2,A3,A4,L,R>(
    fa1: Either<L,A1>, fa2: Either<L,A2>, fa3: Either<L,A3>, fa4: Either<L,A4>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4) => R): Either<L, R> {

    if (fa1.isLeft()) return ((fa1 as any) as Either<L, R>)
    if (fa2.isLeft()) return ((fa2 as any) as Either<L, R>)
    if (fa3.isLeft()) return ((fa3 as any) as Either<L, R>)
    if (fa4.isLeft()) return ((fa4 as any) as Either<L, R>)
    return Right(f(fa1._rightRef, fa2._rightRef, fa3._rightRef, fa4._rightRef))
  }

  /**
   * Maps 5 `Either` values by the mapping function, returning a new
   * `Either` reference that is a `Right` only if all 5 `Either` values are
   * `Right` values, otherwise it returns the first `Left` value noticed.
   *
   * ```typescript
   * // Yields Right(15)
   * Try.map5(Right(1), Right(2), Right(3), Right(4), Right(5),
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   *
   * // Yields Left, because the second arg is a Left
   * Try.map5(Right(1), Left("error"), Right(3), Right(4), Right(5),
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   * ```
   */
  static map5<A1,A2,A3,A4,A5,L,R>(
    fa1: Either<L,A1>, fa2: Either<L,A2>, fa3: Either<L,A3>, fa4: Either<L,A4>, fa5: Either<L,A5>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R): Either<L, R> {

    if (fa1.isLeft()) return ((fa1 as any) as Either<L, R>)
    if (fa2.isLeft()) return ((fa2 as any) as Either<L, R>)
    if (fa3.isLeft()) return ((fa3 as any) as Either<L, R>)
    if (fa4.isLeft()) return ((fa4 as any) as Either<L, R>)
    if (fa5.isLeft()) return ((fa5 as any) as Either<L, R>)
    return Right(f(fa1._rightRef, fa2._rightRef, fa3._rightRef, fa4._rightRef, fa5._rightRef))
  }

  /**
   * Maps 6 `Either` values by the mapping function, returning a new
   * `Either` reference that is a `Right` only if all 6 `Either` values are
   * `Right` values, otherwise it returns the first `Left` value noticed.
   *
   * ```typescript
   * // Yields Right(21)
   * Try.map5(Right(1), Right(2), Right(3), Right(4), Right(5), Right(6),
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   *
   * // Yields Left, because the second arg is a Left
   * Try.map5(Right(1), Left("error"), Right(3), Right(4), Right(5), Right(6),
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   * ```
   */
  static map6<A1,A2,A3,A4,A5,A6,L,R>(
    fa1: Either<L,A1>, fa2: Either<L,A2>, fa3: Either<L,A3>, fa4: Either<L,A4>, fa5: Either<L,A5>, fa6: Either<L,A6>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => R): Either<L, R> {

    if (fa1.isLeft()) return ((fa1 as any) as Either<L, R>)
    if (fa2.isLeft()) return ((fa2 as any) as Either<L, R>)
    if (fa3.isLeft()) return ((fa3 as any) as Either<L, R>)
    if (fa4.isLeft()) return ((fa4 as any) as Either<L, R>)
    if (fa5.isLeft()) return ((fa5 as any) as Either<L, R>)
    if (fa6.isLeft()) return ((fa6 as any) as Either<L, R>)
    return Right(f(fa1._rightRef, fa2._rightRef, fa3._rightRef, fa4._rightRef, fa5._rightRef, fa6._rightRef))
  }

  /**
   * Keeps calling `f` until a `Right(b)` is returned.
   *
   * Based on Phil Freeman's
   * [Stack Safety for Free]{@link http://functorial.com/stack-safety-for-free/index.pdf}.
   *
   * Described in {@link FlatMap.tailRecM}.
   */
  static tailRecM<L, A, B>(a: A, f: (a: A) => Either<L, Either<A, B>>): Either<L, B> {
    let cursor = a
    while (true) {
      const result = f(cursor)
      if (result.isLeft()) return result as any

      const some = result.get()
      if (some.isRight()) return Right(some.get())
      cursor = some.swap().get()
    }
  }
}

/**
 * The `Left` data constructor represents the left side of the
 * [[Either]] disjoint union, as opposed to the [[Right]] side.
 */
export function Left<L>(value: L): Either<L, never> {
  return new (Either as any)(value, null as never, false)
}

/**
 * The `Right` data constructor represents the right side of the
 * [[Either]] disjoint union, as opposed to the [[Left]] side.
 */
export function Right<R>(value: R): Either<never, R> {
  return new (Either as any)(null as never, value, true)
}

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
export class Option<A> implements std.IEquals<Option<A>> {
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
  getOrElse<AA>(fallback: AA): A | AA {
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
  getOrElseL<AA>(thunk: () => AA): A | AA {
    if (!this._isEmpty) return this._ref
    else return thunk()
  }

  /**
   * Returns this option if it is nonempty, otherwise returns the
   * given `fallback`.
   */
  orElse<AA>(fallback: Option<AA>): Option<A | AA> {
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
  orElseL<AA>(thunk: () => Option<AA>): Option<A | AA> {
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

  // Implements HK<F, A>
  readonly _funKindF: Option<any>
  readonly _funKindA: A

  // Implements Constructor<T>
  static readonly _funErasure: Option<any>

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
   * type parameter (in the context of TypeScript or Flow or other
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

  /**
   * Keeps calling `f` until a `Right(b)` is returned.
   *
   * Based on Phil Freeman's
   * [Stack Safety for Free]{@link http://functorial.com/stack-safety-for-free/index.pdf}.
   *
   * Described in {@link FlatMap.tailRecM}.
   */
  static tailRecM<A, B>(a: A, f: (a: A) => Option<Either<A, B>>): Option<B> {
    let cursor = a
    while (true) {
      const result = f(cursor)
      if (result.isEmpty()) return None

      const some = result.get()
      if (some.isRight()) return Some(some.get())
      cursor = some.swap().get()
    }
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
 * The `Try` type represents a computation that may either result in an
 * exception, or return a successfully computed value. It's similar to,
 * but semantically different from the [[Either]] type.
 *
 * `Try` is a sum type and so instances of `Try` are either instances
 * of [[Success]] or of [[Failure]].
 *
 * For example, `Try` can be used to perform division on a user-defined
 * input, without the need to do explicit exception-handling in all of
 * the places that an exception might occur.
 *
 * Example:
 *
 * ```typescript
 * function divide(dividendS: string, divisorS: string): string {
 *   const dividend = Try(() => parseInt(dividendS))
 *     .filter(_ => _ === _) // filter out NaN
 *   const divisor = Try(() => parseInt(divisorS))
 *     .filter(_ => _ === _)  // filter out NaN
 *
 *   // map2 executes the given function only if both results are
 *   // successful; we could also express this with flatMap / chain
 *   const result = Try.map2(dividend, divisor,
 *     (a, b) => a / b
 *   )
 *
 *   result.fold(
 *     error => `failure: ${error}`
 *     result => `result: ${result}`
 *   )
 * }
 * ```
 *
 * An important property of `Try` is its ability to pipeline, or chain,
 * operations, catching exceptions along the way. The `flatMap` and `map`
 * combinators each essentially pass off either their successfully completed
 * value, wrapped in the [[Success]] type for it to be further operated upon
 * by the next combinator in the chain, or the exception wrapped in the
 * [[Failure]] type usually to be simply passed on down the chain.
 * Combinators such as `recover` and `recoverWith` are designed to provide
 * some type of global behavior in the case of failure.
 *
 * NOTE: all `Try` combinators will catch exceptions and return failure
 * unless otherwise specified in the documentation.
 */
export class Try<A> implements std.IEquals<Try<A>> {
  private _isSuccess: boolean
  private _successRef: A
  private _failureRef: any

  private constructor(_success: A, _failure: any, _isSuccess: boolean) {
    this._isSuccess = _isSuccess
    if (_isSuccess) this._successRef = _success
    else this._failureRef = _failure
  }

  /**
   * Returns `true` if the source is a [[Success]] result,
   * or `false` in case it is a [[Failure]].
   */
  isSuccess(): boolean { return this._isSuccess }

  /**
   * Returns `true` if the source is a [[Failure]],
   * or `false` in case it is a [[Success]] result.
   */
  isFailure(): boolean { return !this._isSuccess }

  /**
   * Returns a Try's successful value if it's a [[Success]] reference,
   * otherwise throws an exception if it's a [[Failure]].
   *
   * WARNING!
   *
   * This function is partial, the option must be non-empty, otherwise
   * a runtime exception will get thrown. Use with care.
   */
  get(): A {
    if (!this._isSuccess) throw this._failureRef
    return this._successRef
  }

  /**
   * Returns the value from a `Success` or the given `fallback`
   * value if this is a `Failure`.
   *
   * ```typescript
   * Success(10).getOrElse(27) // 10
   * Failure("error").getOrElse(27)  // 27
   * ```
   */
  getOrElse<AA>(fallback: AA): A | AA {
    return this._isSuccess ? this._successRef : fallback
  }

  /**
   * Returns the value from a `Success` or the value generated
   * by a given `thunk` in case this is a `Failure`.
   *
   * ```typescript
   * Success(10).getOrElseL(() => 27) // 10
   * Failure("error").getOrElseL(() => 27)  // 27
   * ```
   */
  getOrElseL<AA>(thunk: () => AA): A | AA {
    return this._isSuccess ? this._successRef : thunk()
  }

  /**
   * Returns the current value if it's a [[Success]], or
   * if the source is a [[Failure]] then return `null`.
   *
   * ```typescript
   * Success(10).orNull()      // 10
   * Failure("error").orNull() // null
   * ```
   *
   * This can be useful for use-cases such as:
   *
   * ```typescript
   * Try.of(() => dict.user.profile.name).orNull()
   * ```
   */
  orNull(): A | null {
    if (this._isSuccess) return this._successRef
    return null
  }

  /**
   * Returns the current value if it's a [[Success]], or if
   * the source is a [[Failure]] then return the `fallback`.
   *
   * ```typescript
   * Success(10).orElse(Success(17))      // 10
   * Failure("error").orElse(Success(17)) // 17
   * ```
   */
  orElse<AA>(fallback: Try<AA>): Try<A | AA> {
    if (this._isSuccess) return this
    return fallback
  }

  /**
   * Returns the current value if it's a [[Success]], or if the source
   * is a [[Failure]] then return the value generated by the given
   * `thunk`.
   *
   * ```typescript
   * Success(10).orElseL(() => Success(17))      // 10
   * Failure("error").orElseL(() => Success(17)) // 17
   * ```
   */
  orElseL<AA>(thunk: () => Try<AA>): Try<A | AA> {
    if (this._isSuccess) return this
    return thunk()
  }

  /**
   * Inverts this `Try`. If this is a [[Failure]], returns its exception wrapped
   * in a [[Success]]. If this is a `Success`, returns a `Failure` containing a
   * [[NoSuchElementError]].
   */
  failed(): Try<any> {
    return this._isSuccess
      ? Failure(new NoSuchElementError("try.failed()"))
      : Success(this._failureRef)
  }

  /**
   * Applies the `failure` function to [[Failure]] values, and the
   * `success` function to [[Success]] values and returns the result.
   *
   * ```typescript
   * const maybeNum: Try<number> =
   *   tryParseInt("not a number")
   *
   * const result: string =
   *   maybeNum.fold(
   *     error => `Could not parse string: ${error}`,
   *     num => `Success: ${num}`
   *   )
   * ```
   */
  fold<R>(failure: (error: any) => R, success: (a: A) => R): R {
    return this._isSuccess
      ? success(this._successRef)
      : failure(this._failureRef)
  }

  /**
   * Returns a [[Failure]] if the source is a [[Success]], but the
   * given `p` predicate is not satisfied.
   *
   * @throws NoSuchElementError in case the predicate doesn't hold
   */
  filter(p: (a: A) => boolean): Try<A> {
    if (!this._isSuccess) return this
    try {
      if (p(this._successRef)) return this
      return Failure(
        new NoSuchElementError(
          `Predicate does not hold for ${this._successRef}`
        ))
    } catch (e) {
      return Failure(e)
    }
  }

  /**
   * Returns the given function applied to the value if this is
   * a [[Success]] or returns `this` if this is a [[Failure]].
   *
   * This operation is the monadic "bind" operation.
   * It can be used to *chain* multiple `Try` references.
   *
   * ```typescript
   * Try.of(() => parse(s1)).flatMap(num1 =>
   *   Try.of(() => parse(s2)).map(num2 =>
   *     num1 / num2
   *   ))
   * ```
   */
  flatMap<B>(f: (a: A) => Try<B>): Try<B> {
    if (!this._isSuccess) return this as any
    try {
      return f(this._successRef)
    } catch (e) {
      return Failure(e)
    }
  }

  /** Alias for [[flatMap]]. */
  chain<B>(f: (a: A) => Try<B>): Try<B> {
    return this.flatMap(f)
  }

  /**
   * Returns a `Try` containing the result of applying `f` to
   * this option's value, but only if it's a `Success`, or
   * returns the current `Failure` without any modifications.
   *
   * NOTE: this is similar with `flatMap`, except with `map` the
   * result of `f` doesn't need to be wrapped in a `Try`.
   *
   * @param f the mapping function that will transform the value
   *          of this `Try` if successful.
   *
   * @return a new `Try` instance containing the value of the
   *         source mapped by the given function
   */
  map<B>(f: (a: A) => B): Try<B> {
    return this._isSuccess
      ? Try.of(() => f(this._successRef))
      : ((this as any) as Try<B>)
  }

  /**
   * Applies the given function `cb` if this is a [[Success]], otherwise
   * returns `void` if this is a [[Failure]].
   */
  forEach(cb: (a: A) => void): void {
    if (this._isSuccess) cb(this._successRef)
  }

  /**
   * Applies the given function `f` if this is a `Failure`, otherwise
   * returns `this` if this is a `Success`.
   *
   * This is like `map` for the exception.
   *
   * In the following example, if the `user.profile.email` exists,
   * then it is returned as a successful value, otherwise
   *
   * ```typescript
   * Try.of(() => user.profile.email).recover(e => {
   *   // Access error? Default to empty.
   *   if (e instanceof TypeError) return ""
   *   throw e // We don't know what it is, rethrow
   * })
   *
   * Note that on rethrow, the error is being caught in `recover` and
   * it still returns it as a `Failure(e)`.
   * ```
   */
  recover<AA>(f: (error: any) => AA): Try<A | AA> {
    return this._isSuccess ? this : Try.of(() => f(this._failureRef))
  }

  /**
   * Applies the given function `f` if this is a `Failure`, otherwise
   * returns `this` if this is a `Success`.
   *
   * This is like `map` for the exception.
   *
   * In the following example, if the `user.profile.email` exists,
   * then it is returned as a successful value, otherwise
   *
   * ```typescript
   * Try.of(() => user.profile.email).recover(e => {
   *   // Access error? Default to empty.
   *   if (e instanceof TypeError) return ""
   *   throw e // We don't know what it is, rethrow
   * })
   *
   * Note that on rethrow, the error is being caught in `recover` and
   * it still returns it as a `Failure(e)`.
   * ```
   */
  recoverWith<AA>(f: (error: any) => Try<AA>): Try<A | AA> {
    try {
      return this._isSuccess ? this : f(this._failureRef)
    } catch (e) {
      return Failure(e)
    }
  }

  /**
   * Transforms the source into an [[Option]].
   *
   * In case the source is a `Success(v)`, then it gets translated
   * into a `Some(v)`. If the source is a `Failure(e)`, then a `None`
   * value is returned.
   *
   * ```typescript
   * Success("value").toOption() // Some("value")
   * Failure("error").toOption() // None
   * ```
   */
  toOption(): Option<A> {
    return this._isSuccess ? Some(this._successRef) : None
  }

  /**
   * Transforms the source into an [[Either]].
   *
   * In case the source is a `Success(v)`, then it gets translated
   * into a `Right(v)`. If the source is a `Failure(e)`, then a `Left(e)`
   * value is returned.
   *
   * ```typescript
   * Success("value").toEither() // Right("value")
   * Failure("error").toEither() // Left("error")
   * ```
   */
  toEither(): Either<any, A> {
    return this._isSuccess
      ? Right(this._successRef)
      : Left(this._failureRef)
  }

  // Implemented from IEquals
  equals(that: Try<A>): boolean {
    // tslint:disable-next-line:strict-type-predicates
    if (that == null) return false
    return this._isSuccess
      ? that._isSuccess && std.is(this._successRef, that._successRef)
      : !that._isSuccess && std.is(this._failureRef, that._failureRef)
  }

  // Implemented from IEquals
  hashCode(): number {
    return this._isSuccess
      ? std.hashCode(this._successRef)
      : std.hashCode(this._failureRef)
  }

  // Implements HK<F, A>
  readonly _funKindF: Try<any>
  readonly _funKindA: A

  // Implements Constructor<T>
  static readonly _funErasure: Try<any>

  /**
   * Evaluates the given `thunk` and returns either a [[Success]],
   * in case the evaluation succeeded, or a [[Failure]], in case
   * an exception was thrown.
   *
   * Example:
   *
   * ```typescript
   * let effect = 0
   *
   * const e = Try.of(() => { effect += 1; return effect })
   * e.get() // 1
   * ```
   */
  static of<A>(thunk: () => A): Try<A> {
    try {
      return Success(thunk())
    } catch (e) {
      return Failure(e)
    }
  }

  /** Alias of [[Try.success]]. */
  static pure<A>(value: A): Try<A> {
    return Try.success(value)
  }

  /**
   * Shorthand for `now(undefined as void)`, always returning
   * the same reference as optimization.
   */
  static unit(): Try<void> {
    return tryUnitRef
  }

  /**
   * Returns a [[Try]] reference that represents a successful result
   * (i.e. wrapped in [[Success]]).
   */
  static success<A>(value: A): Try<A> {
    return Success(value)
  }

  /**
   * Returns a [[Try]] reference that represents a failure
   * (i.e. an exception wrapped in [[Failure]]).
   */
  static failure<A>(e: any): Try<A> {
    return Failure(e)
  }

  /**
   * Maps 2 `Try` values by the mapping function, returning a new
   * `Try` reference that is a `Success` only if both `Try` values are
   * a `Success`, otherwise it returns the first `Failure` noticed.
   *
   * ```typescript
   * // Yields Success(3)
   * Try.map2(Success(1), Success(2),
   *   (a, b) => a + b
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * Try.map2(Success(1), Failure("error"),
   *   (a, b) => a + b
   * )
   * ```
   *
   * This operation is the `Applicative.map2`.
   */
  static map2<A1,A2,R>(
    fa1: Try<A1>, fa2: Try<A2>,
    f: (a1: A1, a2: A2) => R): Try<R> {

    if (fa1.isFailure()) return ((fa1 as any) as Try<R>)
    if (fa2.isFailure()) return ((fa2 as any) as Try<R>)
    try {
      return Success(f(fa1._successRef, fa2._successRef))
    } catch (e) {
      return Failure(e)
    }
  }

  /**
   * Maps 3 `Try` values by the mapping function, returning a new
   * `Try` reference that is a `Success` only if all 3 `Try` values are
   * a `Success`, otherwise it returns the first `Failure` noticed.
   *
   * ```typescript
   * // Yields Success(6)
   * Try.map3(Success(1), Success(2), Success(3),
   *   (a, b, c) => {
   *     return a + b + c
   *   }
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * Try.map3(
   *   Success(1),
   *   Failure("error"),
   *   Success(3),
   *
   *   (a, b, c) => {
   *     return a + b + c
   *   }
   * )
   * ```
   */
  static map3<A1,A2,A3,R>(
    fa1: Try<A1>, fa2: Try<A2>, fa3: Try<A3>,
    f: (a1: A1, a2: A2, a3: A3) => R): Try<R> {

    if (fa1.isFailure()) return ((fa1 as any) as Try<R>)
    if (fa2.isFailure()) return ((fa2 as any) as Try<R>)
    if (fa3.isFailure()) return ((fa3 as any) as Try<R>)
    try {
      return Success(f(
        fa1._successRef,
        fa2._successRef,
        fa3._successRef))
    } catch (e) {
      return Failure(e)
    }
  }

  /**
   * Maps 4 `Try` values by the mapping function, returning a new
   * `Try` reference that is a `Success` only if all 4 `Try` values are
   * a `Success`, otherwise it returns the first `Failure` noticed.
   *
   * ```typescript
   * // Yields Success(10)
   * Try.map4(Success(1), Success(2), Success(3), Success(4),
   *   (a, b, c, d) => {
   *     return a + b + c + d
   *   }
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * Try.map3(
   *   Success(1),
   *   Failure("error"),
   *   Success(3),
   *   Success(4),
   *
   *   (a, b, c, d) => {
   *     return a + b + c + d
   *   }
   * )
   * ```
   */
  static map4<A1,A2,A3,A4,R>(
    fa1: Try<A1>, fa2: Try<A2>, fa3: Try<A3>, fa4: Try<A4>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4) => R): Try<R> {

    if (fa1.isFailure()) return ((fa1 as any) as Try<R>)
    if (fa2.isFailure()) return ((fa2 as any) as Try<R>)
    if (fa3.isFailure()) return ((fa3 as any) as Try<R>)
    if (fa4.isFailure()) return ((fa4 as any) as Try<R>)
    try {
      return Success(f(
        fa1._successRef,
        fa2._successRef,
        fa3._successRef,
        fa4._successRef))
    } catch (e) {
      return Failure(e)
    }
  }

  /**
   * Maps 5 `Try` values by the mapping function, returning a new
   * `Try` reference that is a `Success` only if all 5 `Try` values are
   * a `Success`, otherwise it returns the first `Failure` noticed.
   *
   * ```typescript
   * // Yields Success(15)
   * Try.map5(
   *   Success(1),
   *   Success(2),
   *   Success(3),
   *   Success(4),
   *   Success(5),
   *
   *   (a, b, c, d, e) => {
   *     return a + b + c + d + e
   *   }
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * Try.map5(
   *   Success(1),
   *   Failure("error"),
   *   Success(3),
   *   Success(4),
   *   Success(5),
   *
   *   (a, b, c, d, e) => {
   *     return a + b + c + d + e
   *   }
   * )
   * ```
   */
  static map5<A1,A2,A3,A4,A5,R>(
    fa1: Try<A1>, fa2: Try<A2>, fa3: Try<A3>, fa4: Try<A4>, fa5: Try<A5>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R): Try<R> {

    if (fa1.isFailure()) return ((fa1 as any) as Try<R>)
    if (fa2.isFailure()) return ((fa2 as any) as Try<R>)
    if (fa3.isFailure()) return ((fa3 as any) as Try<R>)
    if (fa4.isFailure()) return ((fa4 as any) as Try<R>)
    if (fa5.isFailure()) return ((fa5 as any) as Try<R>)
    try {
      return Success(f(
        fa1._successRef,
        fa2._successRef,
        fa3._successRef,
        fa4._successRef,
        fa5._successRef))
    } catch (e) {
      return Failure(e)
    }
  }

  /**
   * Maps 6 `Try` values by the mapping function, returning a new
   * `Try` reference that is a `Success` only if all 6 `Try` values are
   * a `Success`, otherwise it returns the first `Failure` noticed.
   *
   * ```typescript
   * // Yields Success(21)
   * Try.map6(
   *   Success(1),
   *   Success(2),
   *   Success(3),
   *   Success(4),
   *   Success(5),
   *   Success(6),
   *
   *   (a, b, c, d, e, f) => {
   *     return a + b + c + d + e + f
   *   }
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * Try.map6(
   *   Success(1),
   *   Failure("error"),
   *   Success(3),
   *   Success(4),
   *   Success(5),
   *   Success(6),
   *
   *   (a, b, c, d, e, f) => {
   *     return a + b + c + d + e + f
   *   }
   * )
   * ```
   */
  static map6<A1,A2,A3,A4,A5,A6,R>(
    fa1: Try<A1>, fa2: Try<A2>, fa3: Try<A3>, fa4: Try<A4>, fa5: Try<A5>, fa6: Try<A6>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => R): Try<R> {

    if (fa1.isFailure()) return ((fa1 as any) as Try<R>)
    if (fa2.isFailure()) return ((fa2 as any) as Try<R>)
    if (fa3.isFailure()) return ((fa3 as any) as Try<R>)
    if (fa4.isFailure()) return ((fa4 as any) as Try<R>)
    if (fa5.isFailure()) return ((fa5 as any) as Try<R>)
    if (fa6.isFailure()) return ((fa6 as any) as Try<R>)
    try {
      return Success(f(
        fa1._successRef,
        fa2._successRef,
        fa3._successRef,
        fa4._successRef,
        fa5._successRef,
        fa6._successRef))
    } catch (e) {
      return Failure(e)
    }
  }

  /**
   * Keeps calling `f` until a `Right(b)` is returned.
   *
   * Based on Phil Freeman's
   * [Stack Safety for Free]{@link http://functorial.com/stack-safety-for-free/index.pdf}.
   *
   * Described in {@link FlatMap.tailRecM}.
   */
  static tailRecM<A, B>(a: A, f: (a: A) => Try<Either<A, B>>): Try<B> {
    let cursor = a
    while (true) {
      try {
        const result = f(cursor) as Try<Either<A, B>>
        if (result.isFailure()) return result as any

        const some = result.get()
        if (some.isRight()) return Success(some.get())
        cursor = some.swap().get()
      } catch (e) {
        return Failure(e)
      }
    }
  }
}

/**
 * The `Success` data constructor is for building [[Try]] values that
 * are successful results of computations, as opposed to [[Failure]].
 */
export function Success<A>(value: A): Try<A> {
  return new (Try as any)(value, null, true)
}

/**
 * The `Failure` data constructor is for building [[Try]] values that
 * represent failures, as opposed to [[Success]].
 */
export function Failure(e: any): Try<never> {
  return new (Try as any)(null as never, e, false)
}

/**
 * Reusable reference, to use in {@link Try.unit}.
 *
 * @private
 */
const tryUnitRef: Try<void> = Success(undefined)

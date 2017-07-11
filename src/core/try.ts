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
 * Exposes the {@link Try} data type that can express the successful or failed
 * result of a computation.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Try, Success, Failure } from "funfix/dist/core/try"
 * // ... or ...
 * import { Try, Success, Failure } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module core/try
 */

/***/

import * as std from "./std"
import { NoSuchElementError } from "./errors"
import { None, Option, Some } from "./option"
import { Either, Left, Right } from "./either"
import { Applicative, Eq, HK } from "../types"

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
 * Combinators such as `handleError` and `handleErrorWith` are designed to provide
 * some type of default behavior in the case of failure.
 *
 * NOTE: all `Try` combinators will catch exceptions and return failure
 * unless otherwise specified in the documentation.
 */
export class Try<A> implements std.IEquals<Try<A>>, TryK<A> {
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
  getOrElse(fallback: A): A {
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
  getOrElseL(thunk: () => A): A {
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
  orElse(fallback: Try<A>): Try<A> {
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
  orElseL(thunk: () => Try<A>): Try<A> {
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
  recover(f: (error: any) => A): Try<A> {
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
  recoverWith(f: (error: any) => Try<A>): Try<A> {
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

  // tslint:disable-next-line:variable-name
  __hkF: () => Try<any>
  // tslint:disable-next-line:variable-name
  __hkA: () => A

  // tslint:disable-next-line:variable-name
  static __types = {
    functor: () => TryInstances.global,
    apply: () => TryInstances.global,
    applicative: () => TryInstances.global,
    eq: () => TryInstances.global
  }

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
  static map2<A1,A2,R>(fa1: Try<A1>, fa2: Try<A2>,
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
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type TryK<A> = HK<Try<any>, A>

/**
 * Type class instances provided by default for [[Option]].
 */
export class TryInstances extends Applicative<Try<any>> implements Eq<Try<any>> {
  // tslint:disable-next-line:variable-name
  private __unit: Try<void> = Success(undefined)

  /** @inheritDoc */
  eqv(lh: Try<any>, rh: Try<any>): boolean {
    return lh.equals(rh)
  }

  /** @inheritDoc */
  pure<A>(a: A): Try<A> {
    return Success(a)
  }

  /** @inheritDoc */
  unit(): Try<void> {
    return this.__unit
  }

  /** @inheritDoc */
  ap<A, B>(fa: TryK<A>, ff: TryK<(a: A) => B>): Try<B> {
    return Try.map2(fa as Try<A>, ff as Try<(a: A) => B>, (a, f) => f(a))
  }

  /** @inheritDoc */
  map<A, B>(fa: TryK<A>, f: (a: A) => B): Try<B> {
    return (fa as Try<A>).map(f)
  }

  /** @inheritDoc */
  map2<A, B, Z>(fa: TryK<A>, fb: TryK<B>, f: (a: A, b: B) => Z): Try<Z> {
    return Try.map2(fa as Try<A>, fb as Try<B>, f)
  }

  /** @inheritDoc */
  product<A, B>(fa: TryK<A>, fb: TryK<B>): Try<[A, B]> {
    return Try.map2(fa as Try<A>, fb as Try<B>, (a, b) => [a, b] as [A, B])
  }

  static global: TryInstances =
    new TryInstances()
}

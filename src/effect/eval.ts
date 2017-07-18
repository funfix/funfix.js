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
 * Exposes the {@link Eval} data type, a monad which controls evaluation.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Eval } from "funfix/dist/effect/eval"
 * // ... or ...
 * import { Eval } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module effect/eval
 */

/***/

import { Try, Either } from "../core/disjunctions"
import { IllegalStateError } from "../core/errors"

/**
 * Eval is a monad which controls evaluation.
 *
 * This type wraps a value (or a computation that produces a value)
 * and can produce it on command via the {@link Eval.get get()}
 * method.
 *
 * There are three basic evaluation strategies:
 *
 *  - {@link Eval.now} and {@link Eval.raise}: for describing strict
 *    values, evaluated immediately
 *  - {@link Eval.once}: evaluated only once when the value is needed,
 *    with the result memoized (cached) for subsequent evaluations
 *  - [[Eval.always]]: evaluated every time the value is needed,
 *    being equivalent to a function
 *
 * Eval supports stack-safe lazy computation via the {@link Eval.map .map}
 * and {@link Eval.flatMap .flatMap} methods, which use an internal
 * trampoline to avoid stack overflows. Computation done within `map`
 * and `flatMap` is always done lazily, even when applied to an
 * `Eval.now` instance.
 *
 * Use `map` and `flatMap` to chain computation, and use `get()` to
 * get the result when needed. It is also not good style to create
 * `Eval` instances whose computation involves calling `get()` on
 * another `Eval` instance -- this can defeat the trampolining and
 * lead to stack overflows.
 *
 * ```typescript
 * const rndInt = Eval.of(() => {
 *   const nr = Math.random() * 1000000
 *   return nr & nr
 * })
 *
 * const evenInt = () =>
 *   rndInt.flatMap(int => {
 *     if (i % 2 == 0)
 *       return Eval.now(i)
 *     else // Retry until we have an even number!
 *       return evenInt()
 *   })
 *
 * const cached = evenInt().memoize()
 *
 * // Nothing happens until now, this triggers the
 * // actual evaluation:
 * const n: number = cached.get()
 * ```
 *
 * This type is inspired by `cats.Eval` from
 * {@link http://typelevel.org/cats/|Typelevel Cats}
 * and by `monix.eval.Coeval` from {@link https://monix.io|Monix}.
 * Note that the design of this type follows Monix's `Coeval`, which
 * means that it does error handling (i.e. it's a `MonadError`).
 *
 * @final
 */
export class Eval<A> {
  /**
   * Evaluates the source `Eval` and returns the result.
   *
   * ```typescript
   * const ref1 = Eval.always(() => 100)
   * ref1.get() // 100
   *
   * const ref2 = Eval.raise("error")
   * ref2.get() // throws "error"
   * ```
   *
   * WARNING: this function should be considered partial, as it can
   * throw exception depending on what gets executed, use with care!
   */
  get(): A { return this.run().get() }

  /**
   * Evaluates the source `Eval` and returns the result as a [[Try]],
   * capturing any thrown exceptions in the process.
   *
   * ```typescript
   * const ref1 = Eval.always(() => 100)
   * ref1.run() // Success(100)
   *
   * const ref2 = Eval.raise("error")
   * ref2.run() // Failure("error")
   * ```
   */
  run(): Try<A> { return evalRunLoop(this) }

  /**
   * Evaluates the source `Eval` and returns its successful result,
   * otherwise return the given `fallback` if the source ends in
   * failure.
   *
   * ```typescript
   * const ref1 = Eval.always(() => 100)
   * ref1.getOrElse(0) // 100
   *
   * const ref2 = Eval.raise("error")
   * ref2.getOrElse(0) // 0
   * ```
   *
   * See [[Eval.getOrElseL]] for a lazy alternative.
   */
  getOrElse<AA>(fallback: AA): A | AA {
    return this.run().getOrElse(fallback)
  }

  /**
   * Evaluates the source `Eval` and returns its successful result,
   * otherwise return the result of the given `thunk` as a fallback,
   * if the source ends in failure.
   *
   * ```typescript
   * const ref1 = Eval.always(() => 100)
   * ref1.getOrElseL(() => 0) // 100
   *
   * const ref2 = Eval.raise("error")
   * ref2.getOrElseL(() => 0) // 0
   * ```
   *
   * See [[Eval.getOrElse]] for a strict alternative.
   */
  getOrElseL<AA>(thunk: () => AA): A | AA {
    return this.run().getOrElseL(thunk)
  }

  /**
   * Returns a new `Eval` that applies the mapping function to the
   * successful result emitted by the source.
   *
   * ```typescript
   * Eval.now(111).map(_ => _ * 2).get() // 222
   * ```
   */
  map<B>(f: (a: A) => B): Eval<B> {
    return new FlatMap(this, (a: A) => Eval.now(f(a)))
  }

  /**
   * Creates a new `Eval` by applying a function to the successful
   * result of the source, and returns a new instance equivalent to
   * the result of the function.
   *
   * ```typescript
   * const rndInt = Eval.of(() => {
   *   const nr = Math.random() * 1000000
   *   return nr & nr
   * })
   *
   * const evenInt = () =>
   *   rndInt.flatMap(int => {
   *     if (i % 2 == 0)
   *       return Eval.now(i)
   *     else // Retry until we have an even number!
   *       return evenInt()
   *   })
   * ```
   */
  flatMap<B>(f: (a: A) => Eval<B>): Eval<B> {
    return new FlatMap(this, f)
  }

  /**
   * Alias for {@link Eval.flatMap .flatMap}.
   */
  chain<B>(f: (a: A) => Eval<B>): Eval<B> {
    return this.flatMap(f)
  }

  /**
   * Creates a new `Eval` by applying the 'success' function to the
   * successful result of the source, or the 'error' function to the
   * potential errors that might happen.
   *
   * This function is similar with {@link Eval.map .map}, except that
   * it can also transform errors and not just successful results.
   *
   * @param success is a function for transforming a successful result
   * @param failure is function for transforming failures
   */
  transform<R>(failure: (e: any) => R, success: (a: A) => R): Eval<R> {
    return this.transformWith(
      e => Eval.now(failure(e)),
      a => Eval.now(success(a))
    )
  }

  /**
   * Creates a new `Eval` by applying the 'success' function to the
   * successful result of the source, or the 'error' function to the
   * potential errors that might happen.
   *
   * This function is similar with {@link Eval.flatMap .flatMap},
   * except that it can also transform errors and not just successful
   * results.
   *
   * @param success is a function for transforming a successful result
   * @param failure is function for transforming failures
   */
  transformWith<R>(failure: (e: any) => Eval<R>, success: (a: A) => Eval<R>): Eval<R> {
    const f: any = (a: A) => success(a)
    f.onFailure = failure
    return new FlatMap(this, f) as any
  }

  /**
   * Creates a new `Eval` that will mirror the source on success,
   * but on failure it will try to recover and yield a successful
   * result by applying the given function `f` to the thrown error.
   *
   * This function is the equivalent of a `try/catch` statement,
   * or the equivalent of {@link Eval.map .map} for errors.
   */
  recover<AA>(f: (e: any) => AA): Eval<A | AA> {
    return this.recoverWith(a => Eval.now(f(a)))
  }

  /**
   * Creates a new `Eval` that will mirror the source on success,
   * but on failure it will try to recover and yield a successful
   * result by applying the given function `f` to the thrown error.
   *
   * This function is the equivalent of a `try/catch` statement,
   * or the equivalent of {@link Eval.flatMap .flatMap} for errors.
   */
  recoverWith<AA>(f: (e: any) => Eval<AA>): Eval<A | AA> {
    return this.transformWith(f, Eval.now as any)
  }

  /**
   * Handle errors by turning them into {@link Either} values.
   *
   * If there is no error, then a `Right` value will be returned instead.
   * Errors can be handled by this method.
   */
  attempt(): Eval<Either<any, A>> {
    return this.transform(
      _ => Either.left<any, A>(_),
      Either.right)
  }

  /**
   * Memoizes (caches) the result of the source on the first
   * evaluation and reuses it on subsequent invocations of `get()`.
   *
   * The resulting `Eval` will be idempotent, meaning that
   * evaluating it multiple times will have the same effect
   * as evaluating it once.
   *
   * See {@link Eval.memoizeOnSuccess .memoizeOnSuccess} for a version
   * that only caches successful results.
   */
  memoize(): Eval<A> {
    if ((this instanceof Now) || (this instanceof Raise) || (this instanceof Once)) {
      return this
    } else if (this instanceof Always) {
      return new Once(this.thunk, false)
    } else {
      return new Once(() => this.get(), false)
    }
  }

  /**
   * Memoizes (cache) the successful result of the source and reuses
   * it on subsequent invocations of `get()`. Thrown exceptions are
   * not cached.
   *
   * The resulting `Eval` will be idempotent, but only if the result
   * is successful.
   *
   * See {@link Eval.memoize .memoize} for a version that caches both
   * successful results and failures.
   */
  memoizeOnSuccess(): Eval<A> {
    if (this instanceof Now || this instanceof Raise || this instanceof Once) {
      return this
    } else if (this instanceof Always) {
      return new Once(this.thunk, true)
    } else {
      return new Once(() => this.get(), true)
    }
  }

  /**
   * Returns a new `Eval` that upon evaluation will execute the given
   * function for the generated element, transforming the source into
   * an `Eval<void>`.
   *
   * Similar in spirit with normal {@link Eval.forEach .forEach},
   * but lazy, as obviously nothing gets executed at this point.
   */
  forEachL(cb: (a: A) => void): Eval<void> {
    return this.map(cb)
  }

  /**
   * Triggers the evaluation of the source, executing the given
   * function for the generated element.
   *
   * The application of this function has strict behavior, as the
   * coeval is immediately executed.
   */
  forEach(cb: (a: A) => void): void {
    this.forEachL(cb).get()
  }

  // Implements HK<F, A>
  readonly _funKindF: Eval<any>
  readonly _funKindA: A

  // Implements Constructor<T>
  static readonly _funErasure: Eval<any>

  /**
   * Alias for {@link Eval.always}.
   */
  static of<A>(thunk: () => A): Eval<A> {
    return Eval.always(thunk)
  }

  /**
   * Lifts a value into the `Eval` context.
   *
   * Alias for {@link Eval.now}.
   */
  static pure<A>(value: A): Eval<A> { return Eval.now(value) }

  /**
   * Returns an `Eval` that on execution is always successful,
   * emitting the given strict value.
   */
  static now<A>(value: A): Eval<A> { return new Now(value) }

  /**
   * Shorthand for `now(undefined as void)`, always returning
   * the same reference as optimization.
   */
  static unit(): Eval<void> {
    return evalUnitRef
  }

  /**
   * Returns an `Eval` that on execution is always finishing in error
   * emitting the specified exception.
   */
  static raise(e: any): Eval<never> { return new Raise(e) }

  /**
   * Promote a `thunk` function to an `Eval`, catching exceptions in
   * the process.
   *
   * Note that since `Eval` is not memoized by global, this will
   * recompute the value each time the `Eval` is executed.
   */
  static always<A>(thunk: () => A): Eval<A> {
    return new Always(thunk)
  }

  /**
   * Promote a `thunk` function to a `Coeval` that is memoized on the
   * first evaluation, the result being then available on subsequent
   * evaluations.
   *
   * Note this is equivalent with:
   *
   * ```typescript
   * Eval.always(thunk).memoize()
   * ```
   */
  static once<A>(thunk: () => A): Eval<A> {
    return new Once(thunk, false)
  }

  /**
   * Promote a `thunk` function generating `Eval` results to an `Eval`
   * of the same type.
   */
  static suspend<A>(thunk: () => Eval<A>): Eval<A> {
    return new Suspend(thunk)
  }

  /**
   * Promote a `thunk` function generating `Eval` results to an `Eval`
   * of the same type.
   *
   * Alias for {@link Eval.suspend}.
   */
  static defer<A>(thunk: () => Eval<A>): Eval<A> {
    return Eval.suspend(thunk)
  }

  /**
   * Keeps calling `f` until a `Right(b)` is returned.
   *
   * Based on Phil Freeman's
   * [Stack Safety for Free]{@link http://functorial.com/stack-safety-for-free/index.pdf}.
   *
   * Described in {@link FlatMap.tailRecM}.
   */
  static tailRecM<A, B>(a: A, f: (a: A) => Eval<Either<A, B>>): Eval<B> {
    try {
      return f(a).flatMap(either => {
        if (either.isRight()) {
          return Eval.now(either.get())
        } else {
          // Recursive call
          return Eval.tailRecM(either.swap().get(), f)
        }
      })
    } catch (e) {
      return Eval.raise(e)
    }
  }
}

/**
 * `Now` is an internal `Eval` state that wraps any strict
 * value in an `Eval` reference. Returned by [[Eval.now]].
 *
 * @private
 */
class Now<A> extends Eval<A> {
  /**
   * @param value is the value that's going to be returned
   * when `get()` is called.
   */
  constructor(public value: A) { super() }

  get(): A { return this.value }
  run(): Try<A> { return Try.success(this.value) }
  toString(): string { return `Eval.now(${JSON.stringify(this.value)})` }
}

/**
 * Reusable reference, to use in {@link Eval.unit}.
 *
 * @private
 */
const evalUnitRef: Now<void> = new Now(undefined)

/**
 * `Raise` is an internal `Eval` state that wraps any error / failure
 * value in an `Eval` reference. Returned by [[Eval.raise]].
 *
 * @private
 */
class Raise extends Eval<never> {
  /**
   * @param error is the error value that's going to be
   * throw when `get()` is called.
   */
  constructor(public error: any) { super() }

  get(): never { throw this.error }
  run(): Try<never> { return Try.failure<never>(this.error) }
  toString(): string { return `Eval.raise(${JSON.stringify(this.error)})` }
}

/**
 * `Once` is an internal `Eval` state that executes the given `thunk`
 * only once, upon calling `get()` and then memoize its result for
 * subsequent invocations.
 *
 * Returned by [[Eval.once]].
 *
 * @private
 */
class Once<A> extends Eval<A> {
  private _thunk: () => A
  public cache: Try<A>
  public onlyOnSuccess: boolean

  constructor(thunk: () => A, onlyOnSuccess: boolean) {
    super()
    this._thunk = thunk
    this.onlyOnSuccess = onlyOnSuccess
  }

  run(): Try<A> {
    if (this._thunk) {
      const result = Try.of(this._thunk)
      if (result.isSuccess() || !this.onlyOnSuccess) {
        // GC purposes
        delete this._thunk
        delete this.onlyOnSuccess
        this.cache = result
      }
      return result
    }
    return this.cache
  }

  toString(): string { return `Eval.once([thunk])` }
}

/**
 * `Always` is an internal `Eval` state that executes the given `thunk`
 * every time the call to `get()` happens. Returned by [[Eval.always]].
 *
 * @private
 */
class Always<A> extends Eval<A> {
  constructor(public thunk: () => A) { super() }
  run(): Try<A> { return Try.of(this.thunk) }

  toString(): string { return `Eval.always([thunk])` }
}

/**
 * `Suspend` is an internal `Eval` state that represents a factory of
 * `Eval` values. Returned by [[Eval.suspend]].
 *
 * @private
 */
class Suspend<A> extends Eval<A> {
  constructor(public thunk: () => Eval<A>) { super() }
  toString(): string { return `Eval.suspend([thunk])` }
}

/**
 * `FlatMap` is an internal `Eval` state that represents a
 * [[Eval.flatMap .flatMap]], [[Eval.map .map]], [[Eval.transform .transform]]
 * or a [[Eval.transformWith .transformWith]] operation, all of them
 * being expressed with this state.
 *
 * @private
 */
class FlatMap<A, B> extends Eval<B> {
  constructor(
    public source: Eval<A>,
    public f: (a: A) => Eval<B>) { super() }

  toString(): string {
    return `Eval#FlatMap(${String(this.source)}, [function])`
  }
}

/** @hidden */
interface Handler<A, R> {
  (a: A): R
}

/** @hidden */
interface FailureHandler<A, R> extends Handler<A, R> {
  onFailure(e: any): R
}

/** @hidden */
type Current = Eval<any>
/** @hidden */
type Bind = ((a: any) => Eval<any>)
/** @hidden */
type CallStack = Array<Bind>

/** @hidden */
function _popNextBind(bFirst: Bind | null, bRest: CallStack | null): Bind | undefined | null {
  if (bFirst) return bFirst
  if (bRest && bRest.length > 0) return bRest.pop()
  return null
}

/** @hidden */
function _findErrorHandler(bFirst: Bind | null, bRest: CallStack | null): FailureHandler<any, Eval<any>> | undefined | null {
  let cursor: any = bFirst

  while (true) {
    if (cursor && typeof cursor.onFailure === "function") return cursor
    if (bRest && bRest.length > 0) cursor = bRest.pop()
    else return null
  }
}

/** @hidden */
function evalRunLoop<A>(start: Eval<A>): Try<A> {
  let current: Current = start
  let bFirst: Bind | null = null
  let bRest: CallStack | null = null

  while (true) {
    if (current instanceof Now) {
      const bind = _popNextBind(bFirst, bRest)
      if (!bind) return Try.success(current.value)
      bFirst = null
      try {
        current = bind(current.value)
      } catch (e) {
        current = new Raise(e)
      }
    } else if (current instanceof Always) {
      try {
        current = new Now(current.thunk())
      } catch (e) {
        current = new Raise(e)
      }
    } else if (current instanceof Once) {
      try {
        current = new Now(current.get())
      } catch (e) {
        current = new Raise(e)
      }
    } else if (current instanceof Suspend) {
      try {
        current = current.thunk()
      } catch (e) {
        current = new Raise(e)
      }
    } else if (current instanceof FlatMap) {
      if (bFirst) {
        if (!bRest) bRest = []
        bRest.push(bFirst)
      }
      bFirst = current.f
      current = current.source
    } else if (current instanceof Raise) {
      const bind = _findErrorHandler(bFirst, bRest)
      if (!bind) return Try.failure<never>(current.error)
      bFirst = null
      try {
        current = bind.onFailure(current.error)
      } catch (e) {
        current = new Raise(e)
      }
    } else {
      /* istanbul ignore next */
      throw new IllegalStateError(
        "Types got screwed, Eval is a sealed trait, inheritance is forbidden")
    }
  }
}

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
 * Exposes {@link Future}, a lawful promise implementation.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Future } from "funfix/dist/exec/future"
 * // ... or ...
 * import { Future } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module exec/future
 */

/***/
import { Try, Success, Failure, Option, Some, None, Either, Left, Right } from "../core/disjunctions"
import { IllegalStateError } from "../core/errors"
import { Scheduler } from "./scheduler"
import { ICancelable, Cancelable, MultiAssignCancelable } from "./cancelable"

/**
 * `IPromiseLike` represents objects that have a `then` method complying with
 * the [Promises/A+](https://promisesaplus.com/) specification.
 */
export interface IPromiseLike<T> {
  /**
   * Attaches callbacks for the resolution and/or rejection of the promise.
   *
   * See [MDN: Promise.then]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then}.
   *
   * @param onFulfilled The callback to execute when the promise is resolved.
   * @param onRejected The callback to execute when the promise is rejected.
   *
   * @returns A promise for the completion of which ever callback is executed.
   */
  then(onFulfilled?: (value: T) => any, onRejected?: (reason: any) => any): IPromiseLike<any>
}

/**
 * A `Future` represents a value which may or may not *currently* be available, but will be
 * available at some point, or an exception if the operation producing the result fails.
 *
 * `Future<A>` is a Promise-like alternative data type, that's cancelable and lawful,
 * inspired by Scala's `Future[A]`.
 *
 * You can easily build futures out of functions, that will execute asynchronously
 * (e.g. not on the current call stack) by means of `Future.of`:
 *
 * ```typescript
 * Future.of(() => 1 + 1)
 * ```
 *
 * Such computations use the [[Scheduler.global]] reference for execution, which
 * can be overridden, many times in the function call, being an optional parameter
 * (e.g. in `Future.of`), or in the local context, because it is exposed as a
 * [[DynamicRef]], which allows for localised overrides:
 *
 * ```typescript
 * import { Scheduler, GlobalScheduler, Future } from "funfix"
 *
 * // Custom Scheduler reference that we want to use
 * const ec = new GlobalScheduler(false)
 *
 * Future.of(() => x + y, ec)
 *
 * // ... is equivalent with ...
 *
 * Scheduler.global.bind(ec, () => {
 *   Future.of(() => x + y)
 * })
 * ```
 *
 * To create a `Future` out of an actual asynchronous computation, you can
 * use `Future.create`. Here's an example that takes a function and executes
 * it with an initial delay, returning a cancelable `Future`:
 *
 * ```typescript
 * import { Scheduler, Future, Try, Duration, Cancelable } from "funfix"
 *
 * const delay = <A>(d: Duration, f: () => A, ec: Scheduler = Scheduler.global.get()) =>
 *   Future.create<A>(
 *     cb => {
 *       const task = ec.scheduleOnce(d, () => cb(Try.of(f)))
 *
 *       return Cancelable.of(() => {
 *         console.warn("Delayed task was cancelled")
 *         task.cancel()
 *       })
 *     },
 *     ec
 *   )
 * ```
 *
 * Normally you can `await` on functions returning `Future<A>` values:
 *
 * ```typescript
 * async function asyncSample(n: number): Promise<number> {
 *   let sum = 0
 *   for (let i = 0; i < n; i++) {
 *     sum += await Future.of(() => i)
 *   }
 *   return sum
 * }
 * ```
 *
 * Such functions do need to return a `Promise`, because JavaScript
 * generates code that uses `Promise`'s constructor. But a `Future`
 * is "thenable", so you can await on functions returning `Future`
 * just fine.
 */
export abstract class Future<A> implements IPromiseLike<A>, ICancelable {
  /**
   * Extracts the completed value for this `Future`, returning `Some(result)`
   * if this `Future` is already complete or `None` in case the `Future` wasn't
   * completed yet.
   *
   * ```typescript
   * const f1 = Future.of(() => 1)
   *
   * // Given the async execution of `Future.of`, the immediate invocations of
   * // `value()` will yield `None`, but after complete it will yield
   * // `Some(Success(1))`
   * f1.value()
   *
   * const f2 = Future.raise(new DummyError())
   *
   * // Immediately yields Some(Failure(DummyError))
   * f2.value()
   * ```
   */
  abstract value(): Option<Try<A>>

  /**
   * Given a callback, calls it with this `Future`'s result when that result
   * is ready.
   *
   * The execution of this callback is always trampolined (for already completed
   * futures), or asynchronous, which means that modeling loops based on it is
   * memory safe.
   *
   * ```typescript
   * Future.of(() => "John").complete(r => {
   *   r.fold(
   *    error => console.info("Error: " + error),
   *    success => console.info("Hello, " + John)
   *   )
   * })
   * ```
   */
  abstract onComplete(f: (a: Try<A>) => void): void

  /**
   * In case this `Future` isn't complete, then send it a cancel signal.
   *
   * Depending on the computation that will complete this future, its execution
   * might be interrupted.
   *
   * Execution has the same properties of {@link ICancelable}, being idempotent
   * (calling it multiple times has the same effect as calling it once).
   *
   * In order to create a cancelable `Future`, use {@link Future.create}.
   */
  abstract cancel(): void

  /**
   * Sets the {@link Scheduler} reference that's going to get used for
   * subsequent data transformations.
   *
   * `Future` references have a {@link Scheduler} reference attached at build
   * time, that's going to get used for data transformations. This method
   * returns a new `Future` reference that's going to mirror the source,
   * but that's going to use the given `Scheduler` for subsequent operations
   * like `map`, `flatMap`, `transformWith`, etc.
   *
   * ```typescript
   * const ec1 = new GlobalScheduler(true)
   *
   * // The default Scheduler is global (that second parameter is optiona)
   * const f1 = Future.create(f, ec1)
   *
   * // The `f1` future is going to get executed by `ec1`, however
   * // this subsequent `flatMap` is getting evaluated by `ec2`
   * const ec2 = new GlobalScheduler(false)
   * const f2 = f1.withScheduler(ec2).flatMap(x => Future.pure(x * 2))
   * ```
   *
   * When no `Scheduler` is specified, the default is assumed to be
   * {@link Scheduler.global}.
   *
   * @param ec is the scheduler that's going to get used asynchronous execution
   *        of subsequent operations
   */
  abstract withScheduler(ec: Scheduler): Future<A>

  /**
   * Transforms the source, regardless if the result is a failure or a success.
   *
   * This function is a combination of {@link flatMap} and {@link recoverWith},
   * being the (type safe) alternative to JavaScript's
   * [then]{@link IPromiseLike.then} from the
   * [Promises/A+](https://promisesaplus.com/) specification.
   *
   * NOTE: in Funfix these fold-like methods, by convention, take as the
   * first parameter the function that transforms the failure (the left),
   * whereas the second parameter is the function that transforms the
   * successful result (the right). Think of `Either<Error, A>`.
   *
   * ```typescript
   * const randomInt = (max: number) =>
   *   Future.of(() => {
   *     const n = Math.random() * max
   *     n & n
   *   })
   *
   * const randomEvenInt = (max: number) =>
   *   randomInt(max).transformWith(
   *     err => Future.pure(9),
   *     value => (
   *       // retry until we have an even value
   *       value % 2 == 0 ? Future.pure(value) : randomEvenInt()
   *     )
   *   )
   * ```
   *
   * Also see {@link transform}.
   *
   * @param failure is the function that's going to get executed in case the
   *        source signals a failure
   *
   * @param success is the function that's going to get executed in case the
   *        source signals a successful result
   */
  abstract transformWith<B>(failure: (e: any) => Future<B>, success: (a: A) => Future<B>): Future<B>

  /**
   * Transforms the sources, regardless if the result is a failure or a success.
   *
   * This function is a combination of {@link map} and {@link recover},
   * being the (type safe) alternative to JavaScript's
   * [then]{@link IPromiseLike.then} from the
   * [Promises/A+](https://promisesaplus.com/) specification.
   *
   * Example:
   *
   * ```typescript
   * import { Left, Right } from "funfix"
   *
   * // Expose errors by lifting them to an Either<Error, A>
   * future.transform<Either<any, A>>(Left, Right)
   * ```
   *
   * Also see {@link transformWith}.
   *
   * @param failure is the function that's going to get executed in case the
   *        source signals a failure
   *
   * @param success is the function that's going to get executed in case the
   *        source signals a successful result
   */
  transform<B>(failure: (e: any) => B, success: (a: A) => B): Future<B> {
    return this.transformWith(
      e => Future.pure(failure(e)),
      a => Future.pure(success(a)))
  }

  /**
   * Exposes underlying errors by lifting both successful and failed
   * results into an {@link Either} value.
   *
   * Given that errors are short-circuiting the processing of {@link flatMap}
   * chains, this method is useful for exposing errors such that you can
   * `flatMap` over them.
   *
   * ```typescript
   * const f: Future<number> = Future.raise(new DummyError)
   *
   * // Yields a successful Left(DummyError) on completion
   * const fe: Future<Either<any, number>> = f.attempt()
   *
   * // Yields a Right(1) on completion
   * const fr: Future<Either<any, number>> = Future.pure(1).attempt()
   * ```
   */
  attempt(): Future<Either<any, A>> {
    return this.transform<Either<any, A>>(Left, Right)
  }

  /**
   * Chains asynchronous operations.
   *
   * Creates a new future by applying a function to the successful result of
   * the source and returns the result of the function as the new future.
   * If this future is completed with an exception then the new future will
   * also contain this exception.
   *
   * This operation is the [monadic bind]{@link Monad.flatMap}.
   *
   * ```typescript
   * const fa = Future.of(() => 3)
   * const fb = Future.of(() => 5)
   *
   * // Yields 3 + 5
   * fa.flatMap(a => fb.map(b => a + b))
   * ```
   */
  flatMap<B>(f: (a: A) => Future<B>): Future<B> {
    return this.transformWith(Future.raise, f)
  }

  /**
   * Given a mapping function, transforms the successful result of the source.
   *
   * If the source is completed with an exception, then the new future will
   * also be completed in an error.
   *
   * This operation is the [functor map]{@link Functor.map}.
   *
   * ```typescript
   * const f = Future.of(() => "The future")
   *
   * const g = f.map(x => x + " is now!")
   * ```
   */
  map<B>(f: (a: A) => B): Future<B> {
    return this.transformWith(Future.raise, a => Future.pure(f(a)))
  }

  /**
   * Creates a new future that will handle any matching throwable that this
   * future might contain by assigning it a value of another future.
   *
   * If there is no match, or if this future contains a valid result then the
   * new future will contain the same result.
   *
   * This operation is the equivalent of {@link flatMap} for handling errors.
   * Also see {@link transformWith}, which can handle both successful results
   * and failures.
   *
   * ```typescript
   * const f = Future.of<number>(() => { throw new DummyError() })
   *
   * f.recoverWith(e => e instanceof DummyError
   *   ? Future.pure(10) // Fallback
   *   : Future.raise(e) // Re-throw
   * )
   * ```
   */
  recoverWith<AA>(f: (e: any) => Future<AA>): Future<A | AA> {
    return this.transformWith<A | AA>(f, Future.pure)
  }

  /**
   *
   *
   * ```typescript
   * const f = Future.of<number>(() => { throw new DummyError() })
   *
   * f.recover(e => {
   *   if (e instanceof DummyError) return 10
   *   // Don't re-throw exceptions like this, use `recoverWith` instead!
   *   throw e
   * })
   * ```
   */
  recover<AA>(f: (e: any) => AA): Future<A | AA> {
    return this.transformWith<A | AA>(a => Future.pure(f(a)), Future.pure)
  }

  then<TResult1, TResult2>(
    onFulfilled?: ((value: A) => (IPromiseLike<TResult1> | TResult1)) | undefined | null,
    onRejected?: ((reason: any) => (IPromiseLike<TResult2> | TResult2)) | undefined | null): Future<TResult2 | TResult1> {

    if (!onFulfilled && !onRejected) return this as any
    return this.transformWith(
      promiseThen(onRejected, Future.raise),
      promiseThen(onFulfilled, Future.pure))
  }

  /**
   * Transforms this `Future<A>` reference into a standard JavaScript `Promise<A>`
   * reference.
   *
   * Normally a `Future` is "thenable", so JavaScript should have no problem
   * working with it, however in certain contexts this conversion is useful for
   * working with type definitions that don't recognize the structural typing
   * defined by the Promises/A+ specification.
   */
  toPromise(): Promise<A> {
    return new Promise<A>((resolve, reject) => {
      this.onComplete(_ => _.fold(reject, resolve))
    })
  }

  // Implements HK<F, A>
  readonly _funKindF: Future<any>
  readonly _funKindA: A

  // Implements Constructor<T>
  static readonly _funErasure: Future<any>

  /**
   * Given a function that executes immediately, executes it asynchronously
   * and returns a `Future` that will complete when the result is ready.
   *
   * ```typescript
   * const sum = (x: number, y: number) =>
   *   Future.of(() => x + y)
   * ```
   *
   * @param thunk is the function to execute asynchronously
   * @param ec is an optional {@link Scheduler} reference that will get used
   *        for scheduling the actual async execution; if one isn't provided
   *        then {@link Scheduler.global} gets used, which also allows for
   *        local overrides, being a {@link DynamicRef}
   */
  static of<A>(thunk: () => A, ec: Scheduler = Scheduler.global.get()): Future<A> {
    return new FutureBuilder(
      cb => ec.executeAsync(() => cb(Try.of(() => thunk()))),
      ec)
  }

  /**
   * Lifts a pure value into the `Future` context, returning a `Future`
   * reference that's already complete with the given value.
   *
   * This is the equivalent of `Promise.resolve(a)`.
   *
   * ```typescript
   * const f: Future<number> = Future.pure(10)
   *
   * // Prints Success(10)
   * f.onComplete(r => console.info(r))
   * ```
   *
   * @param a is the value to lift in the `Future` context and that will
   *        get signaled in `onComplete` callbacks
   *
   * @param ec is an optional {@link Scheduler} reference that will get used
   *        for scheduling the actual async execution; if one isn't provided
   *        then {@link Scheduler.global} gets used, which also allows for
   *        local overrides, being a {@link DynamicRef}
   */
  static pure<A>(a: A, ec: Scheduler = Scheduler.global.get()): Future<A> {
    return new PureFuture(Success(a), ec)
  }

  /**
   * Lifts an error in the `Future` context, returning a `Future` reference
   * that's already failed with the given error.
   *
   * This is the equivalent of `Promise.reject`.
   *
   * ```typescript
   * const f: Future<number> = Future.raise("Oops!")
   *
   * // Prints Failure("Oops!")
   * f.onComplete(r => console.info(r))
   * ```
   *
   * @param e is the error to lift in the `Future` context and that will
   *        get signaled as a failure in `onComplete` callbacks
   *
   * @param ec is an optional {@link Scheduler} reference that will get used
   *        for scheduling the actual async execution; if one isn't provided
   *        then {@link Scheduler.global} gets used, which also allows for
   *        local overrides, being a {@link DynamicRef}
   */
  static raise(e: any, ec: Scheduler = Scheduler.global.get()): Future<never> {
    return new PureFuture(Failure(e), ec)
  }

  /**
   * Given a side-effectful function that triggers an asynchronous computation,
   * execute it and return a `Future` reference.
   *
   * The given `register` function will be invoked immediately to "schedule"
   * the asynchronous callback, where the callback is the parameter injected in
   * that function.
   *
   * The `register` function can optionally return a {@link ICancelable}
   * reference that can get used to cancel the running asynchronous
   * computation.
   *
   * Example:
   *
   * ```typescript
   * import { Scheduler, Future, Try, Duration, Cancelable } from "funfix"
   *
   * const delay = <A>(d: Duration, f: () => A, ec: Scheduler = Scheduler.global.get()) =>
   *   Future.create<A>(
   *     cb => {
   *       const task = ec.scheduleOnce(d, () => cb(Try.of(f)))
   *
   *       return Cancelable.of(() => {
   *         console.warn("Delayed task was cancelled")
   *         task.cancel()
   *       })
   *     },
   *     ec
   *   )
   * ```
   *
   * Note that by not returning a cancelable, the returned `Future` reference
   * will NOT BE cancelable.
   *
   * ```typescript
   * // This future is not cancelable, because we are not
   * // returning a cancelable reference
   * Future.create<number>(cb => {
   *   setTimeout(1000, () => cb(Success(10)))
   * })
   * ```
   *
   * @param register is the side-effectful function that will get invoked
   *        to build our `Future`, receiving a callback that's supposed to
   *        get invoked (only once) when the asynchronous computation completes,
   *        and that can optionally return a cancelable reference that can
   *        get used to cancel the running computation
   *
   * @param ec is an optional {@link Scheduler} reference that will get used
   *        for scheduling the actual async execution; if one isn't provided
   *        then {@link Scheduler.global} gets used, which also allows for
   *        local overrides, being a {@link DynamicRef}
   */
  static create<A>(register: (cb: (a: Try<A>) => void) => (ICancelable | void), ec: Scheduler = Scheduler.global.get()): Future<A> {
    return new FutureBuilder(register, ec)
  }

  /**
   * Returns a `Future` reference that's already completed with a `void` value.
   *
   * Alias for:
   *
   * ```typescript
   * Future.pure(undefined)
   * ```
   *
   * Note that the same reference is always returned, so this property holds:
   *
   * ```typescript
   * Future.unit() === Future.unit()
   * ```
   */
  static unit(): Future<void> {
    return futureUnit
  }

  /**
   * Keeps calling `f` until it returns a `Right` value.
   *
   * Based on Phil Freeman's
   * [[http://functorial.com/stack-safety-for-free/index.pdf Stack Safety for Free]].
   *
   * ```typescript
   * const generate = () => {
   *   const n = Math.random() * 1000
   *   return n & n
   * }
   *
   * // Keeps looping until an odd number is returned
   * Future.tailRecM(0, a => Future.of(() => {
   *   return a % 2 == 0 ? Left(generate()) : Right(a)
   * })
   * ```
   *
   * @param a is the initial seed
   * @param f is the function that keeps being invoked with the previous
   *          `Left(a)` value, until a `Right(b)` value is returned,
   *          which will be the `onComplete` result of the `Future`
   *          reference
   */
  static tailRecM<A, B>(a: A, f: (a: A) => Future<Either<A, B>>): Future<B> {
    // Recursive loop based on flatMap
    return f(a).flatMap(r => {
      if (r.isRight()) return Future.pure(r.get())
      return Future.tailRecM(r.swap().get(), f)
    })
  }

  /**
   * Transforms any `Promise`-like data type into a `Future`.
   *
   * ```typescript
   * const p: Promise<number> = Promise.resolve(10)
   *
   * const f: Future<number> = Future.fromPromise(p)
   * ```
   *
   * @param ref is the promise reference that we want to convert into a `Future`
   *
   * @param ec is an optional {@link Scheduler} reference that will get used
   *        for scheduling the actual async execution; if one isn't provided
   *        then {@link Scheduler.global} gets used, which also allows for
   *        local overrides, being a {@link DynamicRef}
   */
  static fromPromise<A>(ref: IPromiseLike<A>, ec: Scheduler = Scheduler.global.get()): Future<A> {
    if (ref instanceof Future)
      return (ref as Future<A>).withScheduler(ec)
    else
      return Future.create(
        cb => { ref.then(value => cb(Success(value)),err => cb(Failure(err))) },
        ec
      )
  }
}

class PureFuture<A> extends Future<A> {
  constructor(private readonly _value: Try<A>, private readonly _ec: Scheduler) { super() }

  cancel(): void {}
  value(): Option<Try<A>> { return Some(this._value) }

  withScheduler(ec: Scheduler): Future<A> {
    if (this._ec === ec) return this
    return new PureFuture(this._value, ec)
  }

  onComplete(f: (a: Try<A>) => void): void {
    this._ec.trampoline(() => f(this._value))
  }

  transformWith<B>(failure: (e: any) => Future<B>, success: (a: A) => Future<B>): Future<B> {
    return genericTransformWith(this, failure, success, this._ec)
  }

  toPromise(): Promise<A> {
    return this._value.fold(e => Promise.reject(e), a => Promise.resolve(a))
  }
}

class FutureBuilder<A> extends Future<A> {
  private _result: Option<Try<A>>
  private _listeners: ((a: Try<A>) => void)[]
  private _cancelable: ICancelable
  private _ec: Scheduler

  constructor(register: (cb: (a: Try<A>) => void) => (ICancelable | void), ec: Scheduler) {
    super()
    this._result = None
    this._listeners = []
    this._ec = ec

    const complete = (result: Try<A>) => {
      if (this._result !== None) {
        throw new IllegalStateError("Attempt to completing a Future multiple times")
      } else {
        this._result = Some(result)
        const listeners = this._listeners
        delete this._listeners
        delete this._cancelable

        for (const f of listeners) {
          // Forced async boundary
          ec.trampoline(() => f(result))
        }
      }
    }

    const cb = register(complete)
    if (this._result === None && cb) this._cancelable = cb
  }

  onComplete(f: (a: Try<A>) => void): void {
    if (this._result !== None) {
      // Forced async boundary
      this._ec.trampoline(() => f(this._result.get()))
    } else {
      this._listeners.push(f)
    }
  }

  value(): Option<Try<A>> {
    return this._result
  }

  cancel(): void {
    const cb = this._cancelable
    if (cb) {
      cb.cancel()
      delete this._cancelable
    }
  }

  withScheduler(ec: Scheduler): Future<A> {
    if (this._ec === ec) return this
    return new FutureBuilder(
      cb => {
        this.onComplete(cb)
        return this._cancelable
      },
      ec)
  }

  transformWith<B>(failure: (e: any) => Future<B>, success: (a: A) => Future<B>): Future<B> {
    return genericTransformWith(this, failure, success, this._ec, this._cancelable)
  }
}

/**
 * Internal, reusable `transformWith` implementation for {@link PureFuture}
 * and {@link FutureBuilder}.
 *
 * @Hidden
 */
function genericTransformWith<A, B>(
  self: Future<A>,
  failure: (e: any) => Future<B>,
  success: (a: A) => Future<B>,
  scheduler: Scheduler,
  cancelable?: ICancelable): Future<B> {

  return new FutureBuilder(
    cb => {
      const cRef = new MultiAssignCancelable(cancelable)

      self.onComplete(tryA => {
        let fb: Future<B>
        try {
          fb = tryA.fold(failure, success)
        } catch (e) {
          fb = Future.raise(e)
        }

        // If the resulting Future is already completed, there's no point
        // in treating it as being cancelable
        if (fb.value().isEmpty()) {
          const fbb = fb as any
          if (fbb._cancelable && fbb._cancelable instanceof MultiAssignCancelable) {
            // Trick we are doing to get rid of extraneous memory
            // allocations, otherwise we can leak memory
            cRef.update(fbb._cancelable).collapse()
            fbb._cancelable = cRef
          } else {
            /* istanbul ignore next */
            cRef.update((fb as any)._cancelable || fb)
          }
        } else {
          cRef.update(Cancelable.empty())
        }

        fb.onComplete(cb)
      })

      return cRef
    },
    scheduler)
}

/**
 * Reusable instance for `Future<void>`.
 *
 * @hidden
 */
const futureUnit: Future<void> =
  new PureFuture(Success(undefined), Scheduler.global.get())

/**
 * Internal, reusable function used in the implementation of {@link Future.then}.
 *
 * @hidden
 */
function promiseThen<T, R>(f: ((t: T) => IPromiseLike<R> | R) | undefined | null, alt: (t: T) => Future<T>):
  ((value: T) => Future<R | T>) {

  return value => {
    if (typeof f !== "function") return alt(value)

    const fb = f(value)
    if (!fb) return Future.pure(value)

    if (typeof (fb as any).then === "function")
      return Future.fromPromise(fb as IPromiseLike<R>)
    else
      return Future.pure(fb as R)
  }
}

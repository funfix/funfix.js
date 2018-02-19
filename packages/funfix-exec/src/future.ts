/*!
 * Copyright (c) 2017-2018 by The Funfix Project Developers.
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

import {
  Try, Success, Failure, Option, Some, None, Either, Left, Right,
  IllegalStateError, IllegalArgumentError, TimeoutError, Throwable,
  coreInternals
} from "funfix-core"

import { HK, Monad } from "funland"
import { Scheduler } from "./scheduler"
import { Duration } from "./time"
import { ICancelable, Cancelable, ChainedCancelable, DummyCancelable } from "./cancelable"
import { iterableToArray } from "./internals"

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
  then(onFulfilled?: (value: T) => any, onRejected?: (reason: Throwable) => any): IPromiseLike<any>
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
export abstract class Future<A> implements HK<"funfix/future", A>, IPromiseLike<A>, ICancelable {
  /**
   * Reference to the current {@link Scheduler} available for subsequent
   * data transformations. Can be set in `Future`'s constructors, or by
   * transforming the source by {@link withScheduler}.
   *
   * Protected, because it shouldn't be public API, being meant for
   * `Future` implementations.
   *
   * @protected
   */
  protected readonly _scheduler!: Scheduler

  /**
   * Reference to the current {@link ICancelable} available for
   * subsequent data transformations.
   *
   * Protected, because it shouldn't be public API, being meant for
   * `Future` implementations.
   *
   * @protected
   */
  protected _cancelable?: ICancelable

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
  abstract transformWith<B>(failure: (e: Throwable) => Future<B>, success: (a: A) => Future<B>): Future<B>

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
   * future.transform<Either<Throwable, A>>(Left, Right)
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
  transform<B>(failure: (e: Throwable) => B, success: (a: A) => B): Future<B> {
    return this.transformWith(
      e => Future.pure(failure(e), this._scheduler),
      a => Future.pure(success(a), this._scheduler))
  }

  /**
   * Exposes underlying errors by lifting both successful and failed
   * results into an `Either` value.
   *
   * Given that errors are short-circuiting the processing of {@link flatMap}
   * chains, this method is useful for exposing errors such that you can
   * `flatMap` over them.
   *
   * ```typescript
   * const f: Future<number> = Future.raise(new DummyError)
   *
   * // Yields a successful Left(DummyError) on completion
   * const fe: Future<Either<Throwable, number>> = f.attempt()
   *
   * // Yields a Right(1) on completion
   * const fr: Future<Either<Throwable, number>> = Future.pure(1).attempt()
   * ```
   */
  attempt(): Future<Either<Throwable, A>> {
    return this.transform<Either<Throwable, A>>(Left, Right)
  }

  /**
   * Chains asynchronous operations.
   *
   * Creates a new future by applying a function to the successful result of
   * the source and returns the result of the function as the new future.
   * If this future is completed with an exception then the new future will
   * also contain this exception.
   *
   * This operation is the monadic bind (e.g. `Monad.flatMap`).
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

  /** Alias for {@link flatMap}. */
  chain<B>(f: (a: A) => Future<B>): Future<B> {
    return this.flatMap(f)
  }

  /**
   * `Applicative` apply operator.
   *
   * Resembles {@link map}, but the passed mapping function is
   * lifted in the `Either` context.
   */
  ap<B>(ff: Future<(a: A) => B>): Future<B> {
    return ff.flatMap(f => this.map(f))
  }

  /**
   * Asynchronously processes the value in the future once the value becomes available.
   *
   *  WARNING: Will not be called if this future is never completed or if it is completed with a failure.
   *
   * @param f the function which will be executed if this `Future` completes with a result
   */
  forEach (f: (a: A) => void): void {
    this.onComplete(r => r.forEach(f))
  }

  /**
   * Given a mapping function, transforms the successful result of the source.
   *
   * If the source is completed with an exception, then the new future will
   * also be completed in an error.
   *
   * This operation is the functor map (e.g. `Functor.map`).
   *
   * ```typescript
   * const f = Future.of(() => "The future")
   *
   * const g = f.map(x => x + " is now!")
   * ```
   */
  map<B>(f: (a: A) => B): Future<B> {
    return this.transformWith(Future.raise,
      a => Future.pure(f(a), this._scheduler))
  }

  /**
   * Creates a new future that will handle any matching throwable that this
   * future might contain by assigning it a value of another future.
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
  recoverWith<AA>(f: (e: Throwable) => Future<AA>): Future<A | AA> {
    return this.transformWith<A | AA>(f, Future.pure)
  }

  /**
   * Creates a new future that will handle any matching throwable that this
   * future might contain by assigning it a value.
   *
   * This operation is the equivalent of {@link map} for handling errors.
   * Also see {@link transform}, which can handle both successful results
   * and failures.
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
  recover<AA>(f: (e: Throwable) => AA): Future<A | AA> {
    return this.transformWith<A | AA>(
      e => Future.pure(f(e), this._scheduler),
      a => Future.pure(a, this._scheduler))
  }

  /**
   * JavaScript `Thenable` implementation, needed in order to `await` `Future`
   * values in `async` functions.
   */
  then<TResult1, TResult2>(
    onFulfilled?: ((value: A) => (IPromiseLike<TResult1> | TResult1)) | undefined | null,
    onRejected?: ((reason: Throwable) => (IPromiseLike<TResult2> | TResult2)) | undefined | null): Future<TResult2 | TResult1> {

    if (!onFulfilled && !onRejected) return this as any
    const ec = this._scheduler
    return this.transformWith(
      promiseThen(onRejected, e => Future.raise(e, ec), ec),
      promiseThen(onFulfilled, a => Future.pure(a, ec), ec)
    ) as any
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

  /**
   * Delays signaling the result of this `Future` by the specified duration.
   *
   * It works for successful results:
   *
   * ```typescript
   * const fa = Future.of(() => "Alex")
   *
   * // Delays the signaling by 1 second
   * fa.delayResult(1000).flatMap
   * ```
   *
   * And for failures as well:
   *
   * ```typescript
   * Future.raise(new TimeoutError()).delayResult(1000)
   * ```
   *
   * @param delay is the duration to wait before signaling the final result
   */
  delayResult(delay: number | Duration): Future<A> {
    return this.transformWith(
      err => Future.delayedTick(delay, this._scheduler).flatMap(() => Future.raise(err, this._scheduler)),
      a => Future.delayedTick(delay, this._scheduler).map(() => a)
    )
  }

  /**
   * Returns a future that mirrors the source in case the result of the source
   * is signaled within the required `after` duration, otherwise it
   * fails with a `TimeoutError`, cancelling the source.
   *
   * ```typescript
   * const fa = Future.of(() => 1).delayResult(10000)
   *
   * // Will fail with a TimeoutError
   * fa.timeout(1000)
   * ```
   *
   * @param after is the duration to wait until it triggers the timeout error
   */
  timeout(after: number | Duration): Future<A> {
    // Creating the exception immediately, to get a good stack trace
    const fb = Future.raise(new TimeoutError(Duration.of(after).toString()), this._scheduler)
    return this.timeoutTo(after, () => fb)
  }

  /**
   * Returns a future that mirrors the source in case the result of the source
   * is signaled within the required `after` duration, otherwise it
   * triggers the execution of the given `fallback` after the duration has
   * passed, cancelling the source.
   *
   * This is literally the implementation of {@link Future.timeout}:
   *
   * ```typescript
   * const fa = Future.of(() => 1).delayResult(10000)
   *
   * fa.timeoutTo(1000, () => Future.raise(new TimeoutError()))
   * ```
   *
   * @param after is the duration to wait until it triggers the `fallback`
   * @param fallback is a thunk generating a fallback `Future` to timeout to
   */
  timeoutTo<AA>(after: number | Duration, fallback: () => Future<AA>): Future<A | AA> {
    const other = Future.delayedTick(after, this._scheduler).flatMap(() => fallback())
    const lst: Future<A | AA>[] = [this, other]
    return Future.firstCompletedOf(lst, this._scheduler)
  }

  // Implements HK<F, A>
  /** @hidden */ readonly _URI!: "funfix/future"
  /** @hidden */ readonly _A!: A

  // Implements Constructor<T>
  /** @hidden */ static readonly _Class: Future<any>

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
    const ref = FutureMaker.empty<A>(ec)
    ec.executeAsync(() => ref.tryComplete(Try.of(thunk)))
    return ref.future()
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
  static raise<A = never>(e: Throwable, ec: Scheduler = Scheduler.global.get()): Future<A> {
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
    const ref = FutureMaker.empty<A>(ec)
    try {
      const cRef = register(ref.complete)
      return ref.future(cRef || undefined)
    } catch (e) {
      return Future.raise(e, ec)
    }
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
  static unit(ec: Scheduler = Scheduler.global.get()): Future<void> {
    // Given that this reference is immutable once built for the given
    // Scheduler, and that schedulers don't change that much, we are
    // caching the reference in order to preserve memory
    const ecAny = ec as any
    let ref = ecAny["_funCache"] && ecAny["_funCache"]["futureUnit"]
    if (!ref) {
      ref = new PureFuture(Success(undefined), ec)
      ecAny["_funCache"] = ecAny["_funCache"] || {}
      ecAny["_funCache"]["futureUnit"] = ref
    }
    return ref
  }

  /**
   * Returns a `Future` that will complete after the given `delay`.
   *
   * This can be used to do delayed execution. For example:
   *
   * ```typescript
   * Future.delayedTick(1000).flatMap(_ =>
   *   Future.of(() => console.info("Hello!"))
   * )
   * ```
   *
   * @param delay is the duration to wait before signaling the tick
   * @param ec is the scheduler that will actually schedule the tick's execution
   */
  static delayedTick<A>(delay: number | Duration, ec: Scheduler = Scheduler.global.get()): Future<void> {
    return Future.create<void>(cb => ec.scheduleOnce(delay, () => cb(Success(undefined))), ec)
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
   *
   * @param ec is an optional {@link Scheduler} reference that will get used
   *        for scheduling the actual async execution; if one isn't provided
   *        then {@link Scheduler.global} gets used, which also allows for
   *        local overrides, being a {@link DynamicRef}
   */
  static tailRecM<A, B>(a: A, f: (a: A) => Future<Either<A, B>>, ec: Scheduler = Scheduler.global.get()): Future<B> {
    // Recursive loop based on flatMap
    return f(a).flatMap(r => {
      if (r.isRight()) return Future.pure(r.get(), ec)
      return Future.tailRecM(r.swap().get(), f, ec)
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
      return Future.create<A>(
        cb => { ref.then(value => cb(Success(value)),err => cb(Failure(err))) },
        ec
      )
  }

  /**
   * Builds an already complete `Future` from a `Try` value.
   *
   * ```typescript
   * import { Success, Failure, Future } from "funfix"
   *
   * // Already completed with 1
   * const f1 = Future.fromTry(Success(1))
   *
   * // Already completed in error
   * const f2 = Future.fromTry(Failure("err"))
   * ```
   *
   * @param value is the `Try` value to stream in `onComplete` listeners
   *
   * @param ec is an optional {@link Scheduler} reference that will get used
   *        for scheduling the actual async execution; if one isn't provided
   *        then {@link Scheduler.global} gets used, which also allows for
   *        local overrides, being a {@link DynamicRef}
   */
  static fromTry<A>(value: Try<A>, ec: Scheduler = Scheduler.global.get()): Future<A> {
    return new PureFuture(value, ec)
  }

  /**
   * Creates a race condition between multiple futures, returning the result
   * of the first one that completes, cancelling the rest.
   *
   * ```typescript
   * const failure = Future.raise(new TimeoutError()).delayResult(2000)
   *
   * // Will yield 1
   * const fa1 = Future.of(() => 1).delayResult(1000)
   * Future.firstCompletedOf([fa1, failure])
   *
   * // Will yield a TimeoutError
   * const fa2 = Future.of(() => 1).delayResult(10000)
   * Future.firstCompletedOf([fa2, failure])
   * ```
   *
   * @param list is the list of futures for which the race is started
   * @param ec is the scheduler doing the needed scheduling and error reporting
   *
   * @return a future that will complete with the result of the first
   *         future form the list to complete, the rest being cancelled
   */
  static firstCompletedOf<A>(list: Future<A>[] | Iterable<Future<A>>, ec: Scheduler = Scheduler.global.get()): Future<A> {
    return futureFirstCompletedOf(list, ec)
  }

  /**
   * Given a list of items, builds future results out of it with the specified
   * mapping function and returns a new future that's going to be completed
   * with the list of all generated results.
   *
   * This is the generic version of {@link Future.sequence}. Useful for
   * processing futures in parallel, with the `parallelism` factor being
   * configurable.
   *
   * Example:
   *
   * ```typescript
   * const list = [1, 2, 3, 4]
   *
   * // Yields [2, 4, 6, 8]
   * Future.traverse(list)(a => Future.pure(a * 2))
   * // ... is equivalent to:
   * Future.sequence(list.map(_ => _ * 2))
   * ```
   *
   * Note that the given `list` is strictly processed, so no lazy behavior
   * should be expected if an `Iterable` is given.
   *
   * But in comparison with {@link Future.sequence}, this builder has lazy
   * behavior in applying the given mapping function. Coupled with the
   * `parallelism` factor, this can be used to do batched processing:
   *
   * ```typescript
   * const userIDs = [1, 2, 3, 4]
   *
   * // Make at most 2 requests in parallel:
   * Future.traverse(userIDs, 2)(fetchUserDetails)
   * ```
   *
   * @param list are the values that get fed in the generator function for
   *        building a list of future results
   *
   * @param parallelism is the maximum number of futures that are going to
   *        be processed in parallel, defaults to `Infinity`
   *
   * @param ec is an optional scheduler that's going to be used for scheduling
   *        the needed asynchronous boundaries
   *
   * @return a function that takes as parameter a the generator function that's
   *         going to map the given `list`, transforming it into a list of
   *         futures, finally returning a future that's going to complete
   *         with the list of all asynchronously generated results
   */
  static traverse<A>(list: A[] | Iterable<A>, parallelism: number = Infinity, ec: Scheduler = Scheduler.global.get()):
    <B>(f: (a: A) => Future<B>) => Future<B[]> {

    return <B>(f: (a: A) => Future<B>) =>
      futureTraverse(list, f, parallelism, ec)
  }

  /**
   * Asynchronously transforms a list of futures into a future of a list.
   *
   * The equivalent of `Promise.all`, this is the specialized version of
   * {@link Future.traverse}.
   *
   * Contract:
   *
   * - the given `Iterable<Future<A>>` list is eagerly evaluated, transformed
   *   from the start into an `Array<Future<A>>`, so don't expect laziness in
   *   evaluating it
   * - In case one of the future fails, then all other futures that are still
   *   pending get cancelled
   * - In case the returned future gets cancelled, then all in-progress futures
   *   from that list get cancelled
   *
   * Sample:
   *
   * ```typescript
   * const f1 = Future.of(() => 1)
   * const f2 = Future.of(() => 2)
   * const f3 = Future.of(() => 3)
   *
   * // Yields [1, 2, 3]
   * const all: Future<number[]> = Future.sequence([f1, f2, f3])
   * ```
   */
  static sequence<A>(list: Future<A>[] | Iterable<Future<A>>, ec: Scheduler = Scheduler.global.get()): Future<A[]> {
    return futureSequence(list, ec)
  }

  /**
   * Maps 2 `Future` values by the mapping function, returning a new
   * `Future` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link Future.sequence} operation and as such
   * on cancellation or failure all future values get cancelled.
   *
   * ```typescript
   * const fa1 = Future.of(() => 1)
   * const fa2 = Future.of(() => 2)
   *
   *
   * // Yields Success(3)
   * Future.map2(fa1, fa2, (a, b) => a + b)
   *
   * // Yields Failure, because the second arg is a Failure
   * Future.map2(fa1, Future.raise("error"),
   *   (a, b) => a + b
   * )
   * ```
   *
   * This operation is the `Applicative.map2`.
   */
  static map2<A1, A2, R>(
    fa1: Future<A1>, fa2: Future<A2>, f: (a1: A1, a2: A2) => R,
    ec: Scheduler = Scheduler.global.get()): Future<R> {

    const fl: Future<any[]> = Future.sequence([fa1, fa2] as any[], ec)
    return fl.map(lst => f(lst[0], lst[1]))
  }

  /**
   * Maps 3 `Future` values by the mapping function, returning a new
   * `Future` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link Future.sequence} operation and as such
   * on cancellation or failure all future values get cancelled.
   *
   * ```typescript
   * const fa1 = Future.of(() => 1)
   * const fa2 = Future.of(() => 2)
   * const fa3 = Future.of(() => 3)
   *
   *
   * // Yields Success(6)
   * Future.map3(fa1, fa2, fa3, (a, b, c) => a + b + c)
   *
   * // Yields Failure, because the second arg is a Failure
   * Future.map3(
   *   fa1, fa2, Future.raise("error"),
   *   (a, b, c) => a + b + c
   * )
   * ```
   *
   * This operation is the `Applicative.map3`.
   */
  static map3<A1, A2, A3, R>(
    fa1: Future<A1>, fa2: Future<A2>, fa3: Future<A3>,
    f: (a1: A1, a2: A2, a3: A3) => R,
    ec: Scheduler = Scheduler.global.get()): Future<R> {

    const fl: Future<any[]> = Future.sequence([fa1, fa2, fa3] as any[], ec)
    return fl.map(lst => f(lst[0], lst[1], lst[2]))
  }

  /**
   * Maps 4 `Future` values by the mapping function, returning a new
   * `Future` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link Future.sequence} operation and as such
   * on cancellation or failure all future values get cancelled.
   *
   * ```typescript
   * const fa1 = Future.of(() => 1)
   * const fa2 = Future.of(() => 2)
   * const fa3 = Future.of(() => 3)
   * const fa4 = Future.of(() => 4)
   *
   * // Yields Success(10)
   * Future.map4(fa1, fa2, fa3, fa4, (a, b, c, d) => a + b + c + d)
   *
   * // Yields Failure, because the second arg is a Failure
   * Future.map4(
   *   fa1, fa2, fa3, Future.raise("error"),
   *   (a, b, c, d) => a + b + c + d
   * )
   * ```
   *
   * This operation is the `Applicative.map4`.
   */
  static map4<A1, A2, A3, A4, R>(
    fa1: Future<A1>, fa2: Future<A2>, fa3: Future<A3>, fa4: Future<A4>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4) => R,
    ec: Scheduler = Scheduler.global.get()): Future<R> {

    const fl: Future<any[]> = Future.sequence([fa1, fa2, fa3, fa4] as any[], ec)
    return fl.map(lst => f(lst[0], lst[1], lst[2], lst[3]))
  }

  /**
   * Maps 5 `Future` values by the mapping function, returning a new
   * `Future` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link Future.sequence} operation and as such
   * on cancellation or failure all future values get cancelled.
   *
   * ```typescript
   * const fa1 = Future.of(() => 1)
   * const fa2 = Future.of(() => 2)
   * const fa3 = Future.of(() => 3)
   * const fa4 = Future.of(() => 4)
   * const fa5 = Future.of(() => 5)
   *
   * // Yields Success(15)
   * Future.map5(fa1, fa2, fa3, fa4, fa5,
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * Future.map5(
   *   fa1, fa2, fa3, fa4, Future.raise("error"),
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   * ```
   *
   * This operation is the `Applicative.map5`.
   */
  static map5<A1, A2, A3, A4, A5, R>(
    fa1: Future<A1>, fa2: Future<A2>, fa3: Future<A3>, fa4: Future<A4>, fa5: Future<A5>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R,
    ec: Scheduler = Scheduler.global.get()): Future<R> {

    const fl: Future<any[]> = Future.sequence([fa1, fa2, fa3, fa4, fa5] as any[], ec)
    return fl.map(lst => f(lst[0], lst[1], lst[2], lst[3], lst[4]))
  }

  /**
   * Maps 6 `Future` values by the mapping function, returning a new
   * `Future` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link Future.sequence} operation and as such
   * on cancellation or failure all future values get cancelled.
   *
   * ```typescript
   * const fa1 = Future.of(() => 1)
   * const fa2 = Future.of(() => 2)
   * const fa3 = Future.of(() => 3)
   * const fa4 = Future.of(() => 4)
   * const fa5 = Future.of(() => 5)
   * const fa6 = Future.of(() => 6)
   *
   * // Yields Success(21)
   * Future.map6(
   *   fa1, fa2, fa3, fa4, fa5, fa6,
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * Future.map6(
   *   fa1, fa2, fa3, fa4, fa5, Future.raise("error"),
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   * ```
   *
   * This operation is the `Applicative.map6`.
   */
  static map6<A1, A2, A3, A4, A5, A6, R>(
    fa1: Future<A1>, fa2: Future<A2>, fa3: Future<A3>, fa4: Future<A4>, fa5: Future<A5>, fa6: Future<A6>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => R,
    ec: Scheduler = Scheduler.global.get()): Future<R> {

    const fl: Future<any[]> = Future.sequence([fa1, fa2, fa3, fa4, fa5, fa6] as any[], ec)
    return fl.map(lst => f(lst[0], lst[1], lst[2], lst[3], lst[4], lst[5]))
  }
}

class PureFuture<A> extends Future<A> {
  constructor(
    private readonly _value: Try<A>,
    protected readonly _scheduler: Scheduler) { super() }

  cancel(): void {}
  value(): Option<Try<A>> { return Some(this._value) }

  withScheduler(ec: Scheduler): Future<A> {
    if (this._scheduler === ec) return this
    return new PureFuture(this._value, ec)
  }

  onComplete(f: (a: Try<A>) => void): void {
    this._scheduler.executeBatched(() => f(this._value))
  }

  transformWith<B>(failure: (e: Throwable) => Future<B>, success: (a: A) => Future<B>): Future<B> {
    return genericTransformWith(this, failure, success, this._scheduler)
  }

  toPromise(): Promise<A> {
    return this._value.fold(e => Promise.reject(e), a => Promise.resolve(a))
  }
}

/**
 * Internal state shared between {@link AsyncFuture} and
 * {@link FutureMaker}.
 *
 * @Hidden
 */
class AsyncFutureState<A> {
  id: null | "chained" | "complete"
  ref: null | ((a: Try<A>) => void)[] | AsyncFutureState<A> | Try<A>

  constructor() {
    this.id = null
    this.ref = null
  }

  compressedRoot(): AsyncFutureState<A> {
    let cursor: AsyncFutureState<A> = this
    while (cursor.id === "chained") {
      cursor = cursor.ref as AsyncFutureState<A>
      this.ref = cursor
    }
    return cursor
  }

  value(): Option<Try<A>> {
    switch (this.id) {
      case null: return None
      case "complete":
        return Some(this.ref as Try<A>)
      case "chained":
        return this.compressedRoot().value()
    }
  }

  tryComplete(r: Try<A>, ec: Scheduler): boolean {
    switch (this.id) {
      case null:
        const xs = (this.ref as (null | ((a: Try<A>) => void)[]))
        this.ref = r
        this.id = "complete"
        if (xs) {
          for (let i = 0; i < xs.length; i++)
            ec.executeBatched(() => xs[i](r))
        }
        return true

      case "complete":
        return false

      case "chained":
        const ref = (this.ref as AsyncFutureState<A>).compressedRoot()
        const result = ref.tryComplete(r, ec)
        this.id = "complete"
        this.ref = result ? r : ref.value().get()
        return result
    }
  }

  chainTo(target: AsyncFutureState<A>, ec: Scheduler): void {
    switch (this.id) {
      case null:
        const xs = (this.ref as (null | ((a: Try<A>) => void)[]))
        this.id = "chained"
        this.ref = target.compressedRoot()

        if (xs && xs.length > 0) {
          // Transferring all listeners to chained future
          for (let i = 0; i < xs.length; i++)
            target.onComplete(xs[i], ec)
        }
        break

      case "chained":
        this.compressedRoot().chainTo(target.compressedRoot(), ec)
        break

      case "complete":
        target.tryComplete(this.ref as Try<A>, ec)
        break
    }
  }

  onComplete(f: (a: Try<A>) => void, ec: Scheduler): void {
    switch (this.id) {
      case null:
        if (!this.ref) this.ref = [];
        (this.ref as ((a: Try<A>) => void)[]).push(f)
        break
      case "complete":
        // Forced async boundary
        ec.executeBatched(() => f(this.ref as Try<A>))
        break
      case "chained":
        (this.ref as AsyncFutureState<A>).onComplete(f, ec)
        break
    }
  }
}

/**
 * Type enumerating the type classes implemented by `Future`.
 */
export type FutureTypes = Monad<"funfix/future">

/**
 * Type-class implementations, compatible with the `static-land`
 * specification.
 */
export const FutureModule: FutureTypes = {
  // Functor
  map: <A, B>(f: (a: A) => B, fa: Future<A>) =>
    fa.map(f),
  // Apply
  ap: <A, B>(ff: Future<(a: A) => B>, fa: Future<A>): Future<B> =>
    fa.ap(ff),
  // Applicative
  of: Future.pure,
  // Chain
  chain: <A, B>(f: (a: A) => Future<B>, fa: Future<A>): Future<B> =>
    fa.flatMap(f),
  // ChainRec
  chainRec: <A, B>(f: <C>(next: (a: A) => C, done: (b: B) => C, a: A) => Future<C>, a: A): Future<B> =>
    Future.tailRecM(a, a => f(Either.left as any, Either.right as any, a))
}

// Registering Fantasy-Land compatible symbols
coreInternals.fantasyLandRegister(Future, FutureModule)

/**
 * Internal `Future` implementation that's the result of a
 * {@link FutureMaker.future}.
 *
 * @Hidden
 */
class AsyncFuture<A> extends Future<A> {
  readonly ["_state"]: AsyncFutureState<A>
  readonly _scheduler: Scheduler
  _cancelable?: ICancelable

  constructor(state: AsyncFutureState<A>, cRef: ICancelable | undefined, ec: Scheduler) {
    super()
    this["_state"] = state
    this._scheduler = ec
    if (cRef) this._cancelable = cRef
  }

  value(): Option<Try<A>> {
    return this["_state"].value()
  }

  onComplete(f: (a: Try<A>) => void): void {
    return this["_state"].onComplete(f, this._scheduler)
  }

  cancel(): void {
    if (this._cancelable) {
      try { this._cancelable.cancel() }
      finally { delete this._cancelable }
    }
  }

  withScheduler(ec: Scheduler): Future<A> {
    if (this._scheduler === ec) return this
    return new AsyncFuture(this["_state"], this._cancelable, ec)
  }

  transformWith<B>(failure: (e: Throwable) => Future<B>, success: (a: A) => Future<B>): Future<B> {
    return genericTransformWith(this, failure, success, this._scheduler, this._cancelable)
  }
}

/**
 * A write interface for {@link Future} to use when implementing
 * producers.
 *
 * This would be the equivalent of the now deprecated `Deferred`
 * data type in JavaScript.
 *
 * Example:
 *
 * ```typescript
 * import { Future, FutureMaker, Scheduler, Success } from "funfix"
 *
 * const ec = Scheduler.global.get()
 * const m = FutureMaker.empty<number>()
 *
 * // The producer
 * ec.scheduleOnce(1000, () => m.complete(Success(1)))
 *
 * // The future that will eventually complete when
 * // `m.complete` gets called
 * const f: Future<number> = maker.future()
 * ```
 */
export class FutureMaker<A> {
  private readonly ["_state"]: AsyncFutureState<A>
  private readonly _scheduler: Scheduler

  private constructor(state: AsyncFutureState<A>, ec: Scheduler) {
    this["_state"] = state
    this._scheduler = ec
  }

  /**
   * Tries to complete this future builder either with a successful
   * value or with a failure.
   *
   * This function can be used in concurrent races where multiple
   * actors compete for completing the same `FutureMaker`.
   *
   * ```typescript
   * const m = FutureMaker.empty<number>()
   *
   * m.tryComplete(Success(1)) //=> true
   * m.tryComplete(Success(2)) //=> false
   *
   * m.future() //=> Yields 1
   * ```
   *
   * In case you have a guarantee that the completion only
   * happens once, then usage of {@link complete} is recommended.
   *
   * @return `false` in case the `FutureMaker` has been already
   *         completed, or `true` otherwise
   */
  readonly tryComplete: (result: Try<A>) => boolean =
    r => this["_state"].tryComplete(r, this._scheduler)

  /**
   * Completes this `FutureMaker` either with a successful value or
   * with a failure, but throws an exception if this maker was
   * already completed.
   *
   * Due to throwing exceptions, this function is recommended for
   * usage in cases where there's a guarantee that the completion
   * of the `FutureMaker` is attempted only once.
   *
   * ```typescript
   * const m = FutureMaker.empty<number>()
   *
   * m.complete(Success(1))
   *
   * m.complete(Success(2)) //=> throws IllegalStateError
   * ```
   *
   * In case you have a concurrent race, see {@link tryComplete}
   * for a version that does not throw exceptions.
   */
  readonly complete: (result: Try<A>) => void =
    r => {
      if (!this.tryComplete(r))
        throw new IllegalStateError("Cannot complete a FutureMaker twice!")
    }

  /**
   * Alias for `tryComplete(Success(value))`.
   *
   * See {@link tryComplete}.
   */
  trySuccess(value: A): boolean {
    return this.tryComplete(Success(value))
  }

  /**
   * Alias for `complete(Success(value))`.
   *
   * See {@link complete}.
   */
  success(value: A): void {
    return this.complete(Success(value))
  }

  /**
   * Alias for `tryComplete(Failure(error))`.
   *
   * See {@link tryComplete}.
   */
  tryFailure(error: Throwable): boolean {
    return this.tryComplete(Failure(error))
  }

  /**
   * Alias for `complete(Failure(value))`.
   *
   * See {@link complete}.
   */
  failure(error: Throwable): void {
    return this.complete(Failure(error))
  }

  /**
   * Chains this to `target` such that any subsequent operations on
   * this future maker is reflected on `target`.
   *
   * ```typescript
   * const main = FutureMaker.empty<number>()
   * const child = FutureMaker.empty<number>()
   *
   * // Now all operations on `child` will be redirected to `main`
   * child.chainTo(main)
   *
   * // Completing `child` will complete `main`
   * child.complete(Success(1))
   *
   * main.future() //=> Yields 1
   * child.future() //=> Yields 1
   * ```
   *
   * The purpose of this method is the same as with
   * {@link ChainedCancelable}, to be used in pieces of logic where
   * the chaining of `onComplete` calls creates a memory leaks,
   * chaining being used to get rid of such chains.
   *
   * This method is being used in the implementation of
   * {@link Future.flatMap} for example to make it memory safe.
   *
   * CREDITS: this was inspired by Scala's `scala.concurrent.Scala`
   * implementation.
   */
  chainTo(target: FutureMaker<A>): void {
    this["_state"].chainTo(target["_state"], this._scheduler)
  }

  /**
   * Creates and returns a {@link Future} that will complete when this
   * future maker is completed.
   *
   * ```typescript
   * const m = FutureMaker.empty<number>()
   *
   * // Creates a simple future, no cancellation logic:
   * m.future()
   *
   * // Creates a future with baked in cancellation logic:
   * const cRef = Cancelable.of(() => console.log("Cancelled!"))
   * m.future(cRef)
   * ```
   *
   * @param cancelable is an optional reference that can indicate
   *        cancellation logic to be baked into the created future
   */
  future(cancelable?: ICancelable): Future<A> {
    switch (this["_state"].id) {
      case "complete":
        return new PureFuture(this["_state"].ref as Try<A>, this._scheduler)
      default:
        return new AsyncFuture(this["_state"], cancelable, this._scheduler)
    }
  }

  /**
   * Returns a new `FutureMaker` that mirrors the state of the source,
   * but that uses the given {@link Scheduler} reference for
   * managing the required async boundaries.
   *
   * The given `Scheduler` reference is used for inserting async
   * boundaries when the registered listeners are triggered when
   * [.complete]{@link complete} is called or for data transformations
   * executed on the future references returned by
   * [.future]{@link FutureMaker.future}.
   *
   * See {@link Future.withScheduler}.
   */
  withScheduler(ec: Scheduler): FutureMaker<A> {
    if (this._scheduler === ec) return this
    return new FutureMaker(this["_state"], ec)
  }

  /**
   * Returns an empty `FutureMaker` reference awaiting completion.
   *
   * This is the builder that one should use for building
   * `FutureMaker` instances, since the default constructor is not
   * exposed due to it exposing internal state.
   */
  static empty<A>(ec: Scheduler = Scheduler.global.get()): FutureMaker<A> {
    return new FutureMaker(new AsyncFutureState(), ec)
  }

  /**
   * Returns an already completed {@link FutureMaker} reference.
   *
   * Example:
   *
   * ```typescript
   * const m = FutureMaker.completed(Success(1))
   *
   * m.future() // Yields 1
   *
   * m.complete(Success(2)) // Throws IllegalStateError
   * ```
   *
   * If all you need is a `Future`, then use {@link Future.fromTry}
   * instead.
   */
  static completed<A>(value: Try<A>, ec: Scheduler = Scheduler.global.get()): FutureMaker<A> {
    const state = new AsyncFutureState<A>()
    state.id = "complete"
    state.ref = value
    return new FutureMaker(state, ec)
  }
}

/**
 * Internal, common `transformWith` implementation.
 *
 * @Hidden
 * @private
 */
function genericTransformWith<A, B>(
  self: Future<A>,
  failure: (e: Throwable) => Future<B>,
  success: (a: A) => Future<B>,
  scheduler: Scheduler,
  cancelable?: ICancelable): Future<B> {

  const defer = FutureMaker.empty<B>(scheduler)
  const cRef = new ChainedCancelable(cancelable)

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
      const cNext = fbb._cancelable

      if (cNext && cNext instanceof ChainedCancelable) {
        // Trick we are doing to get rid of extraneous memory
        // allocations, otherwise we can leak memory
        cNext.chainTo(cRef)
      } else if (cNext && !(cNext instanceof DummyCancelable)) {
        cRef.update(cNext)
      }
    } else {
      // GC purposes
      cRef.clear()
    }

    if (fb instanceof AsyncFuture) {
      fb["_state"].chainTo(defer["_state"], scheduler)
    } else {
      fb.onComplete(defer.tryComplete)
    }
  })

  return defer.future(cRef)
}

/**
 * Internal, reusable function used in the implementation of {@link Future.then}.
 *
 * @Hidden
 */
function promiseThen<T, R>(
  f: ((t: T) => IPromiseLike<R> | R) | undefined | null,
  alt: (t: T) => Future<T>,
  ec: Scheduler):
  ((value: T) => Future<R | T>) {

  return value => {
    if (typeof f !== "function") return alt(value)

    const fb = f(value)
    if (!fb) return Future.pure(value, ec)

    if (typeof (fb as any).then === "function")
      return Future.fromPromise(fb as IPromiseLike<R>, ec)
    else
      return Future.pure(fb as R, ec)
  }
}

/** @Hidden */
function futureCancelAll<A>(list: Future<A>[], ec: Scheduler, skip: number = -1): void {
  const errors = []
  for (let i = 0; i < list.length; i++) {
    if (i !== skip)
      try { list[i].cancel() } catch (e) { errors.push(e) }
  }

  if (errors.length > 0) {
    for (const e of errors) ec.reportFailure(e)
  }
}

/** @Hidden */
function futureIterableToArray<A>(values: Future<A>[] | Iterable<Future<A>>, ec: Scheduler): Future<A>[] {
  if (!values) return []
  if (Object.prototype.toString.call(values) === "[object Array]")
    return values as Future<A>[]

  const arr: Future<A>[] = []
  try {
    const cursor = values[Symbol.iterator]()

    while (true) {
      const item = cursor.next()
      if (item.value) arr.push(item.value)
      if (item.done) break
    }

    return arr
  } catch (e) {
    futureCancelAll(arr, ec)
    throw e
  }
}

/**
 * Internal implementation for `Future.sequence`.
 *
 * @Hidden
 */
function futureSequence<A>(values: Future<A>[] | Iterable<Future<A>>, ec: Scheduler): Future<A[]> {
  return Future.create<A[]>(cb => {
    try {
      // This can throw, handling error below
      const futures = futureIterableToArray(values, ec)
      // Short-circuit in case the list is empty, otherwise the
      // futureSequenceLoop fails (must be non-empty as an invariant)
      if (futures.length === 0) return cb(Success([]))
      const cRef = Cancelable.of(() => futureCancelAll(futures, ec))

      // Creating race condition
      let isDone = false
      let finishedCount = 0
      let finalArray: A[] = []

      for (let index = 0; index < futures.length; index++) {
        const fi = index
        const fa = futures[index]

        fa.onComplete(result => {
          finishedCount += 1

          if (result.isSuccess()) {
            if (!isDone) {
              finalArray[fi] = result.get()
              isDone = finishedCount === futures.length
              if (isDone) cb(Success(finalArray))
            }
          } else {
            if (!isDone) {
              isDone = true
              cRef.cancel()
              cb(result as any)
            } else {
              ec.reportFailure(result.failed().get())
            }
          }
        })
      }

      return cRef
    } catch (e) {
      // If an error happens here, it means the conversion from iterable to
      // array failed, and the futures we've seen are already canceled
      cb(Failure(e))
    }
  }, ec)
}

/**
 * Internal implementation for `Future.firstCompletedOf`.
 *
 * @Hidden
 */
function futureFirstCompletedOf<A>(iterable: Future<A>[] | Iterable<Future<A>>, ec: Scheduler): Future<A> {
  return Future.create<A>(cb => {
    try {
      // This can throw, handling error below
      const futures = futureIterableToArray(iterable, ec)
      // Short-circuit in case the list is empty, otherwise the
      // futureSequenceLoop fails (must be non-empty as an invariant)
      if (futures.length === 0) return cb(Failure(new IllegalArgumentError("empty list of futures")))

      // Creating race condition
      let isDone = false

      for (let index = 0; index < futures.length; index++) {
        const fi = index
        const fa = futures[index]

        fa.onComplete(result => {
          if (!isDone) {
            isDone = true
            futureCancelAll(futures, ec, fi)
            cb(result)
          } else if (result.isFailure()) {
            ec.reportFailure(result.failed().get())
          }
        })
      }

      return Cancelable.of(() => futureCancelAll(futures, ec))
    } catch (e) {
      // If an error happens here, it means the conversion from iterable to
      // array failed, and the futures we've seen are already canceled
      cb(Failure(e))
    }
  }, ec)
}

/**
 * Internal implementation for `Future.traverse`.
 *
 * @Hidden
 */
function futureTraverse<A, B>(
  list: A[] | Iterable<A>,
  f: (a: A) => Future<B>,
  parallelism: number,
  ec: Scheduler): Future<B[]> {

  if (parallelism <= 0) {
    throw new IllegalArgumentError(`parallelism <= 0`)
  }
  return Future.of(() => iterableToArray(list), ec)
    .flatMap(values => futureTraverseLoop(values, f, parallelism, ec, 0, []))
}

/** @Hidden */
function futureTraverseLoop<A, B>(
  list: A[],
  f: (a: A) => Future<B>,
  parallelism: number,
  ec: Scheduler,
  index: number,
  result: B[]): Future<B[]> {

  if (index >= list.length) return Future.pure(result, ec)
  let batch: Future<B>[] = []
  let length = 0

  try {
    while (index < list.length && length < parallelism) {
      batch.push(f(list[index++]))
      length += 1
    }

    const fa = Future.sequence(batch, ec).map(b => {
      for (let i = 0; i < b.length; i++) result.push(b[i])
    })

    if (index >= list.length) {
      // We are done, signal final result
      return fa.map(() => result)
    } else {
      // Continue with the next batch
      return fa.flatMap(() => futureTraverseLoop(list, f, parallelism, ec, index, result))
    }
  } catch (e) {
    // Batch generation triggered an error
    futureCancelAll(batch, ec)
    return Future.raise(e)
  }
}

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

import {
  Either,
  Try,
  Success,
  Failure,
  Throwable
} from "funfix-core"

import {
  ICancelable,
  Cancelable,
  StackedCancelable,
  Scheduler,
  Future
} from "funfix-exec"

/**
 * `IO` represents a specification for a possibly lazy or
 * asynchronous computation, which when executed will produce an `A`
 * as a result, along with possible side-effects.
 *
 * Compared with Funfix's
 * [Future](https://funfix.org/api/exec/classes/future.html) (see
 * `funfix-exec`) or JavaScript's `Promise`, `IO` does not represent a
 * running computation or a value detached from time, as `IO` does not
 * execute anything when working with its builders or operators and it
 * does not submit any work into the `Scheduler` or any run-loop for
 * execution, the execution eventually taking place only after {@link
 * IO.run} is called and not before that.
 *
 * In order to understand `IO`, here's the design space:
 *
 * |                  | Strict                     | Lazy                              |
 * |------------------|:--------------------------:|:---------------------------------:|
 * | **Synchronous**  | `A`                        | `() => A`                         |
 * |                  |                            | [Eval&lt;A&gt;]{@link Eval}       |
 * | **Asynchronous** | `(Try<A> => void) => void` | `() => ((Try<A> => void) => void` |
 * |                  | `Future<A>` / `Promise`    | [IO&lt;A&gt;]{@link IO}           |
 *
 * JavaScript is a language (and runtime) that's strict by default,
 * meaning that expressions are evaluated immediately instead of
 * being evaluated on a by-need basis, like in Haskell.
 *
 * So a value `A` is said to be strict. To turn an `A` value into a lazy
 * value, you turn that expression into a parameterless function of
 * type `() => A`, also called a "thunk".
 *
 * A [Future](https://funfix.org/api/exec/classes/future.html) is a
 * value that's produced by an asynchronous process, but it is said
 * to have strict behavior, meaning that when you receive a `Future`
 * reference, whatever process that's supposed to complete the
 * `Future` has probably started already. This goes for
 * [JavaScript's Promise](https://promisesaplus.com) as well.
 *
 * But there are cases where we don't want strict values, but lazily
 * evaluated ones. In some cases we want functions, or
 * `Future`-generators. Because we might want better handling of
 * parallelism, or we might want to suspend *side effects*. As
 * without suspending *side effects* we don't have *referential
 * transparency*, which really helps with reasoning about the code,
 * being the essence of *functional programming*.
 *
 * This `IO` type is thus the complement to `Future`, a lazy, lawful
 * monadic type that can describe any side effectful action, including
 * asynchronous ones, also capable of suspending side effects.
 *
 * ## Getting Started
 *
 * To build an `IO` from a parameterless function returning a value
 * (a thunk), we can use `IO.of`:
 *
 * ```typescript
 * const hello = IO.of(() => "Hello ")
 * const world = IO.of(() => "World!")
 * ```
 *
 * Nothing gets executed yet, as `IO` is lazy, nothing executes
 * until you trigger [run]{@link IO.run} on it.
 *
 * To combine `IO` values we can use `map` and `flatMap`, which
 * describe sequencing and this time is in a very real sense because
 * of the laziness involved:
 *
 * ```typescript
 * const sayHello = hello
 *   .flatMap(h => world.map(w => h + w))
 *   .map(console.info)
 * ```
 *
 * This `IO` reference will trigger a side effect on evaluation, but
 * not yet. To make the above print its message:
 *
 * ```typescript
 * const f: Future<void> = sayHello.run()
 *
 * //=> Hello World!
 * ```
 *
 * The returned type is a
 * [Future](https://funfix.org/api/exec/classes/future.html), a value
 * that can be completed already or might be completed at some point
 * in the future, once the running asynchronous process finishes.
 *
 * Futures can also be canceled, in case the described computation can
 * be canceled. Not in this case (since there's nothing that can be
 * cancelled when building tasks with `IO.of`), but, we can build
 * cancelable tasks with {@link IO.async}:
 *
 * ```typescript
 * import { Cancelable, Success, IO } from "funfix"
 *
 * const delayedHello = IO.async((scheduler, callback) => {
 *   const task = scheduler.scheduleOnce(1000, () => {
 *     console.info("Delayed Hello!")
 *     // Signaling successful completion
 *     // ("undefined" inhabits type "void")
 *     callback(Success(undefined))
 *   })
 *
 *   return Cancelable.of(() => {
 *     console.info("Cancelling!")
 *     task.cancel()
 *   })
 * })
 * ```
 *
 * The sample above prints a message with a delay, where the delay
 * itself is scheduled with the injected `Scheduler`. The `Scheduler`
 * is in fact an optional parameter to {@link IO.run} and if one
 * isn't explicitly provided, then `Scheduler.global` is assumed.
 *
 * This action can be cancelled, because it specifies cancellation
 * logic. If we wouldn't return an explicit `Cancelable` there,
 * then cancellation wouldn't work. But for this `IO` reference
 * it does:
 *
 * ```typescript
 * // Triggering execution, which sends a task to execute by means
 * // of JavaScript's setTimeout (under the hood):
 * const f: Future<void> = delayedHello.run()
 *
 * // If we change our mind before the timespan has passed:
 * f.cancel()
 * ```
 *
 * ## Note on the ExecutionModel
 *
 * `IO` is conservative in how it introduces async boundaries.
 * Transformations like `map` and `flatMap` for example will default
 * to being executed on the current call stack on which the
 * asynchronous computation was started. But one shouldn't make
 * assumptions about how things will end up executed, as ultimately
 * it is the implementation's job to decide on the best execution
 * model. All you are guaranteed is asynchronous execution after
 * executing `run`.
 *
 * Currently the default `ExecutionModel` specifies batched execution
 * by default and `IO` in its evaluation respects the injected
 * `ExecutionModel`. If you want a different behavior, you need to
 * execute the `IO` reference with a different scheduler.
 *
 * @final
 */
export class IO<A> {
  /**
   * Triggers the asynchronous execution.
   *
   * Without invoking `run` on a `IO`, nothing gets evaluated, as an
   * `IO` has lazy behavior.
   *
   * Also see {@link IO.runOnComplete} for a version that takes a
   * callback as parameter.
   *
   * @return a `Future` that will eventually complete with the
   *         result produced by this `IO` on evaluation
   */
  run<A>(ec: Scheduler = Scheduler.global.get()): Future<A> {
    return taskToFutureRunLoop(this, ec)
  }

  /**
   * Triggers the asynchronous execution.
   *
   * Without invoking `run` on a `IO`, nothing gets evaluated, as an
   * `IO` has lazy behavior.
   *
   * Also see {@link IO.run} for a version that returns a `Future`,
   * which might be easier to work with, especially since a `Future`
   * is `Promise`-like.
   *
   * @param cb is the callback that will be eventually called with
   *        the final result, or error, when the evaluation completes
   *
   * @param ec is the scheduler that controls the triggering of
   *        asynchronous boundaries (e.g. `setTimeout`)
   *
   * @return a cancelable action that can be triggered to cancel
   *         the running computation, assuming that the implementation
   *         of the source `IO` can be cancelled
   */
  runOnComplete<A>(
    cb: (result: Try<A>) => void,
    ec: Scheduler = Scheduler.global.get()): ICancelable {

    const ref = ioGenericRunLoop(this, ec, null, cb, null, null, null)
    return ref || Cancelable.empty()
  }

  /**
   * Handle errors by turning them into `Either` values.
   *
   * If there is no error, then a `Right` value will be returned instead.
   * Errors can be handled by this method.
   */
  attempt(): IO<Either<Throwable, A>> {
    return this.transform(
      _ => Either.left<Throwable, A>(_),
      Either.right)
  }

  /**
   * Alias for {@link IO.flatMap .flatMap}.
   */
  chain<B>(f: (a: A) => IO<B>): IO<B> {
    return this.flatMap(f)
  }

  /**
   * Creates a new `IO` by applying a function to the successful
   * result of the source, and returns a new instance equivalent to
   * the result of the function.
   *
   * ```typescript
   * const rndInt = IO.of(() => {
   *   const nr = Math.random() * 1000000
   *   return nr & nr
   * })
   *
   * const evenInt = () =>
   *   rndInt.flatMap(int => {
   *     if (i % 2 == 0)
   *       return IO.now(i)
   *     else // Retry until we have an even number!
   *       return evenInt()
   *   })
   * ```
   */
  flatMap<B>(f: (a: A) => IO<B>): IO<B> {
    return new IOFlatMap(this, f)
  }

  /**
   * Returns a new `IO` that upon evaluation will execute the given
   * function for the generated element, transforming the source into
   * an `IO<void>`.
   */
  forEach(cb: (a: A) => void): IO<void> {
    return this.map(cb)
  }

  /**
   * Returns a new `IO` that upon evaluation will execute with the
   * given set of {@link IOOptions}, allowing for tuning the run-loop.
   *
   * This allows for example making run-loops "auto-cancelable",
   * an option that's off by default due to safety concerns:
   *
   * ```typescript
   * io.executeWithOptions({
   *   autoCancelableRunLoops: true
   * })
   * ```
   */
  executeWithOptions(set: IOOptions): IO<A> {
    return IO.asyncUnsafe<A>((ctx, cb) => {
      const ec = ctx.scheduler
      const ctx2 = new IOContext(ec, ctx.connection, set)
      ec.trampoline(() => IO.unsafeStart(this, ctx2, cb))
    })
  }

  /**
   * Returns a new `IO` that applies the mapping function to the
   * successful result emitted by the source.
   *
   * ```typescript
   * IO.now(111).map(_ => _ * 2).get() // 222
   * ```
   */
  map<B>(f: (a: A) => B): IO<B> {
    return new IOFlatMap(this, (a: A) => IO.now(f(a)))
  }

  /**
   * Memoizes (caches) the result of the source `IO` and reuses it on
   * subsequent invocations of `run`.
   *
   * The resulting task will be idempotent, meaning that
   * evaluating the resulting task multiple times will have the
   * same effect as evaluating it once.
   *
   * @see {@link IO.memoizeOnSuccess} for a version that only caches
   *     successful results.
   */
  memoize(): IO<A> {
    switch (this._funADType) {
      case "pure":
        return this
      case "always":
        const always = (this as any) as IOAlways<A>
        return new IOOnce(always.thunk, false)
      case "memoize":
        const mem = (this as any) as IOMemoize<A>
        if (!mem.onlySuccess) return mem
        return new IOMemoize(this, false)
      default: // flatMap | async
        return new IOMemoize(this, false)
    }
  }

  /**
   * Memoizes (cache) the successful result of the source task
   * and reuses it on subsequent invocations of `run`.
   * Thrown exceptions are not cached.
   *
   * The resulting task will be idempotent, but only if the
   * result is successful.
   *
   * @see {@link IO.memoize} for a version that caches both successful
   *     results and failures
   */
  memoizeOnSuccess(): IO<A> {
    switch (this._funADType) {
      case "pure":
      case "once":
      case "memoize":
        return this
      case "always":
        const always = (this as any) as IOAlways<A>
        return new IOOnce(always.thunk, true)
      default: // flatMap | async
        return new IOMemoize(this, true)
    }
  }

  /**
   * Creates a new `IO` that will mirror the source on success,
   * but on failure it will try to recover and yield a successful
   * result by applying the given function `f` to the thrown error.
   *
   * This function is the equivalent of a `try/catch` statement,
   * or the equivalent of {@link IO.map .map} for errors.
   */
  recover<AA>(f: (e: Throwable) => AA): IO<A | AA> {
    return this.recoverWith(a => IO.now(f(a)))
  }

  /**
   * Creates a new `IO` that will mirror the source on success,
   * but on failure it will try to recover and yield a successful
   * result by applying the given function `f` to the thrown error.
   *
   * This function is the equivalent of a `try/catch` statement,
   * or the equivalent of {@link IO.flatMap .flatMap} for errors.
   */
  recoverWith<AA>(f: (e: Throwable) => IO<AA>): IO<A | AA> {
    return this.transformWith(f, IO.now as any)
  }

  /**
   * Creates a new `IO` by applying the 'success' function to the
   * successful result of the source, or the 'error' function to the
   * potential errors that might happen.
   *
   * This function is similar with {@link IO.map .map}, except that
   * it can also transform errors and not just successful results.
   *
   * @param success is a function for transforming a successful result
   * @param failure is function for transforming failures
   */
  transform<R>(failure: (e: Throwable) => R, success: (a: A) => R): IO<R> {
    return this.transformWith(
      e => IO.now(failure(e)),
      a => IO.now(success(a))
    )
  }

  /**
   * Creates a new `IO` by applying the 'success' function to the
   * successful result of the source, or the 'error' function to the
   * potential errors that might happen.
   *
   * This function is similar with {@link IO.flatMap .flatMap},
   * except that it can also transform errors and not just successful
   * results.
   *
   * @param success is a function for transforming a successful result
   * @param failure is function for transforming failures
   */
  transformWith<R>(failure: (e: Throwable) => IO<R>, success: (a: A) => IO<R>): IO<R> {
    return new IOFlatMap(this, success, failure)
  }

  /**
   * Identifies the `IO` reference type, useful for debugging and
   * for pattern matching in the implementation.
   */
  readonly _funADType: "pure" | "always" | "once" | "flatMap" | "async" | "memoize"

  // Implements HK<F, A>
  readonly _funKindF: IO<any>
  readonly _funKindA: A

  // Implements Constructor<T>
  static readonly _funErasure: IO<any>

  /**
   * Promote a `thunk` function to an `IO`, catching exceptions in
   * the process.
   *
   * Note that since `IO` is not memoized by global, this will
   * recompute the value each time the `IO` is executed.
   */
  static always<A>(thunk: () => A): IO<A> {
    return new IOAlways(thunk)
  }

  /**
   * Create a `IO` from an asynchronous computation, which takes
   * the form of a function with which we can register a callback.
   *
   * This can be used to translate from a callback-based API to a
   * straightforward monadic version.
   */
  static async<A>(register: (ec: Scheduler, cb: (a: Try<A>) => void) => ICancelable | void): IO<A> {
    return IO.asyncUnsafe<A>((ctx, cb) => {
      const ec = ctx.scheduler
      const conn = ctx.connection

      // Forcing a light asynchronous boundary, otherwise
      // stack overflows are possible
      ec.trampoline(() => {
        // Wrapping the callback in a safe implementation that
        // provides idempotency guarantees and that pops from
        // the given `StackedCancelable` at the right time
        const safe = ioSafeCallback(ec, conn, cb)
        try {
          const ref = register(ec, safe)
          // This `push` can be executed after `register`, even the
          // `safe` callback gets executed immediately, because of
          // the light async boundary in `ioSafeCallback`
          conn.push(ref || Cancelable.empty())
        } catch (e) {
          safe(Failure(e))
        }
      })
    })
  }

  /**
   * Constructs a lazy [[IO]] instance whose result
   * will be computed asynchronously.
   *
   * **WARNING:** Unsafe to use directly, only use if you know
   * what you're doing. For building `IO` instances safely
   * see {@link IO.async}.
   *
   * Rules of usage:
   *
   *  - the received `StackedCancelable` can be used to store
   *    cancelable references that will be executed upon cancel;
   *    every `push` must happen at the beginning, before any
   *    execution happens and `pop` must happen afterwards
   *    when the processing is finished, before signaling the
   *    result
   *  - before execution, an asynchronous boundary is recommended,
   *    to avoid stack overflow errors, but can happen using the
   *    scheduler's facilities for trampolined execution
   *  - on signaling the result (`Success` or `Failure`),
   *    another async boundary is necessary, but can also
   *    happen with the scheduler's facilities for trampolined
   *    execution (e.g. `Scheduler.trampoline`)
   *
   * **WARNING:** note that not only is this builder unsafe, but also
   * unstable, as the {@link IORegister} callback type is exposing
   * volatile internal implementation details. This builder is meant
   * to create optimized asynchronous tasks, but for normal usage
   * prefer {@link IO.async}.
   */
  static asyncUnsafe<A>(register: IORegister<A>): IO<A> {
    return new IOAsync(register)
  }

  /**
   * Promote a `thunk` function generating `IO` results to an `IO`
   * of the same type.
   *
   * Alias for {@link IO.suspend}.
   */
  static defer<A>(thunk: () => IO<A>): IO<A> {
    return IO.unit().flatMap(_ => thunk())
  }

  /**
   * Defers the creation of an `IO` by using the provided function,
   * which has the ability to inject a needed `Scheduler`.
   *
   * Example:
   *
   * ```typescript
   * function measureLatency<A>(source: IO<A>): IO<[A, Long]> {
   *   return IO.deferAction<[A, Long]>(s => {
   *     // We have our Scheduler, which can inject time, we
   *     // can use it for side-effectful operations
   *     const start = s.currentTimeMillis()
   *
   *     return source.map(a => {
   *       const finish = s.currentTimeMillis()
   *       return [a, finish - start]
   *     })
   *   })
   * }
   * ```
   *
   * @param f is the function that's going to be called when the
   *        resulting `IO` gets evaluated
   */
  static deferAction<A>(f: (ec: Scheduler) => IO<A>): IO<A> {
    return IO.asyncUnsafe<A>((ctx, cb) => {
      const ec = ctx.scheduler
      let ioa: IO<A>
      try { ioa = f(ec) } catch (e) { ioa = IO.raise(e) }
      ec.trampoline(() => IO.unsafeStart(ioa, ctx, cb))
    })
  }

  /**
   * Given a `thunk` that produces `Future` values, suspends it
   * in the `IO` context, evaluating it on demand whenever the
   * resulting `IO` gets evaluated.
   *
   * See {@link IO.fromFuture} for the strict version.
   */
  static deferFuture<A>(thunk: () => Future<A>): IO<A> {
    return IO.suspend(() => IO.fromFuture(thunk()))
  }

  /**
   * Wraps calls that generate `Future` results into `IO`, provided
   * a callback with an injected `Scheduler`.
   *
   * This builder helps with wrapping `Future`-enabled APIs that need
   * a `Scheduler` to work.
   *
   * @param f is the function that's going to be executed when the task
   *        gets evaluated, generating the wrapped `Future`
   */
  static deferFutureAction<A>(f: (ec: Scheduler) => Future<A>): IO<A> {
    return IO.deferAction(ec => IO.fromFuture(f(ec)))
  }

  /**
   * Converts any strict `Future` value into an {@link IO}.
   *
   * Note that this builder does not suspend any side effects, since
   * the given parameter is strict (and not a function) and because
   * `Future` has strict behavior.
   *
   * See {@link IO.deferFuture} for an alternative that evaluates
   * lazy thunks that produce future results.
   */
  static fromFuture<A>(fa: Future<A>): IO<A> {
    if (!fa.value().isEmpty()) return IO.fromTry(fa.value().get() as any)
    return IO.asyncUnsafe<A>((ctx, cb) => {
      ctx.connection.push(fa)
      fa.onComplete(result => {
        ctx.connection.pop()
        cb(result as any)
      })
    })
  }

  /**
   * Returns a `IO` reference that will signal the result of the
   * given `Try<A>` reference upon evaluation.
   */
  static fromTry<A>(a: Try<A>): IO<A> { return new IOPure(a) }

  /**
   * Returns an `IO` that on execution is always successful,
   * emitting the given strict value.
   */
  static now<A>(value: A): IO<A> { return new IOPure(Success(value)) }

  /**
   * Alias for {@link IO.always}.
   */
  static of<A>(thunk: () => A): IO<A> {
    return IO.always(thunk)
  }

  /**
   * Promote a `thunk` function to a `Coeval` that is memoized on the
   * first evaluation, the result being then available on subsequent
   * evaluations.
   *
   * Note this is equivalent with:
   *
   * ```typescript
   * IO.always(thunk).memoize()
   * ```
   */
  static once<A>(thunk: () => A): IO<A> {
    return new IOOnce(thunk, false)
  }

  /**
   * Lifts a value into the `IO` context.
   *
   * Alias for {@link IO.now}.
   */
  static pure<A>(value: A): IO<A> { return IO.now(value) }

  /**
   * Returns an `IO` that on execution is always finishing in error
   * emitting the specified exception.
   */
  static raise<A = never>(e: Throwable): IO<A> { return new IOPure(Failure(e)) }

  /**
   * Promote a `thunk` function generating `IO` results to an `IO`
   * of the same type.
   */
  static suspend<A>(thunk: () => IO<A>): IO<A> {
    return IO.unit().flatMap(_ => thunk())
  }

  /**
   * Keeps calling `f` until a `Right(b)` is returned.
   *
   * Based on Phil Freeman's
   * [Stack Safety for Free]{@link http://functorial.com/stack-safety-for-free/index.pdf}.
   *
   * Described in `FlatMap.tailRecM`.
   */
  static tailRecM<A, B>(a: A, f: (a: A) => IO<Either<A, B>>): IO<B> {
    try {
      return f(a).flatMap(either => {
        if (either.isRight()) {
          return IO.now(either.get())
        } else {
          // Recursive call
          return IO.tailRecM(either.swap().get(), f)
        }
      })
    } catch (e) {
      return IO.raise(e)
    }
  }

  /**
   * Shorthand for `now(undefined as void)`, always returning
   * the same reference as optimization.
   */
  static unit(): IO<void> {
    return ioUnitRef
  }

  /**
   * Unsafe utility - starts the execution of a Task.
   *
   * This function allows for specifying a custom {@link IOContext}
   * when evaluating the `IO` reference.
   *
   * DO NOT use directly, as it is UNSAFE to use, unless you know
   * what you're doing. Prefer {@link IO.run} instead.
   */
  static unsafeStart<A>(source: IO<A>, context: IOContext, cb: (r: Try<A>) => void): void | ICancelable {
    return ioGenericRunLoop(source, context.scheduler, context, cb, null, null, null)
  }
}

/**
 * `Pure` is an internal `IO` state that wraps any strict
 * value in an `IO` reference. Returned by {@link IO.now}
 * and {@link IO.raise}.
 *
 * @private
 */
class IOPure<A> extends IO<A> {
  readonly _funADType: "pure" = "pure"

  /**
   * @param value is the value that's going to be returned
   * when `get()` is called.
   */
  constructor(public value: Try<A>) { super() }
}

/**
 * Reusable reference, to use in {@link IO.unit}.
 *
 * @private
 */
const ioUnitRef: IOPure<void> = new IOPure(Try.unit())

/**
 * `Once` is an internal `IO` state that executes the given `thunk`
 * only once, upon calling `get()` and then memoize its result for
 * subsequent invocations.
 *
 * Returned by [[IO.once]].
 *
 * @private
 */
class IOOnce<A> extends IO<A> {
  readonly _funADType: "once" = "once"

  private _thunk: () => A
  public cache: Try<A>
  public onlyOnSuccess: boolean

  constructor(thunk: () => A, onlyOnSuccess: boolean) {
    super()
    this._thunk = thunk
    this.onlyOnSuccess = onlyOnSuccess
  }

  memoize(): IO<A> {
    if (this.onlyOnSuccess && this._thunk)
      return new IOOnce(this._thunk, false)
    else
      return this
  }

  runTry(): Try<A> {
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
}

/**
 * `Always` is an internal `IO` state that executes the given `thunk`
 * every time the call to `get()` happens. Returned by [[IO.always]].
 *
 * @private
 */
class IOAlways<A> extends IO<A> {
  readonly _funADType: "always" = "always"

  constructor(public thunk: () => A) { super() }
}

/**
 * `FlatMap` is an internal `IO` state that represents a
 * [[IO.flatMap .flatMap]], [[IO.map .map]], [[IO.transform .transform]]
 * or a [[IO.transformWith .transformWith]] operation, all of them
 * being expressed with this state.
 *
 * @private
 */
class IOFlatMap<A, B> extends IO<B> {
  readonly _funADType: "flatMap" = "flatMap"

  constructor(
    public readonly source: IO<A>,
    public readonly f: ((a: A) => IO<B>),
    public readonly g?: ((e: Throwable) => IO<B>)) { super() }
}

/**
 * Type alias representing registration callbacks for tasks
 * created with `asyncUnsafe`, that are going to get executed
 * when the asynchronous task gets evaluated.
 */
export type IORegister<A> =
  (context: IOContext, callback: (result: Try<A>) => void) => void

/**
 * Constructs a lazy [[IO]] instance whose result will
 * be computed asynchronously.
 *
 * Unsafe to build directly, only use if you know what you're doing.
 * For building `Async` instances safely, see {@link IO.async}.
 *
 * @private
 * @hidden
 */
class IOAsync<A> extends IO<A> {
  readonly _funADType: "async" = "async"

  constructor(public readonly register: IORegister<A>) { super() }
}

class IOMemoize<A> extends IO<A> {
  readonly _funADType: "memoize" = "memoize"

  public result: Try<A> | Future<A> | null
  public source?: IO<A>
  public readonly onlySuccess: boolean

  constructor(source: IO<A>, onlySuccess: boolean) {
    super()
    this.source = source
    this.result = null
    this.onlySuccess = onlySuccess
  }
}

/**
 * The `Context` under which {@link IO} is supposed to be executed.
 *
 * This definition is of interest only when creating
 * tasks with {@link IO.asyncUnsafe}, which exposes internals and
 * is considered unsafe to use.
 *
 * @final
 */
export class IOContext {
  /**
   * The `Scheduler` in charge of evaluating asynchronous boundaries
   * on `run`.
   */
  public readonly scheduler: Scheduler

  /**
   * Is the `StackedCancelable` that accumulates cancelable
   * actions, to be triggered if cancellation happens.
   */
  public readonly connection: StackedCancelable

  /**
   * Options passed to the run-loop implementation, determining
   * its behavior. See {@link IOOptions} for the available
   * options.
   */
  public readonly options: IOOptions

  constructor(
    scheduler: Scheduler,
    connection: StackedCancelable = new StackedCancelable(),
    options: IOOptions = { autoCancelableRunLoops: false }) {

    this.scheduler = scheduler
    this.options = options
    this.connection = connection

    // Enables auto-cancelable run-loops
    if (options.autoCancelableRunLoops)
      this.shouldCancel = () => connection.isCanceled()
  }

  /**
   * Resets the stored `frameIndex`.
   *
   * Calling this method inside the logic of a {@link IO.asyncUnsafe}
   * lets the run-loop know that an async boundary happened. This
   * works in tandem with the logic for `ExecutionModel.batched(n)`,
   * for better detection of synchronous cycles, to avoid introducing
   * forced async boundaries where not needed.
   */
  markAsyncBoundary(): void {
    this.scheduler.batchIndex = 0
  }

  /**
   * Returns `true` in case the run-loop should be canceled,
   * but this can only happen if `autoCancelableRunLoops` is
   * set to `true`.
   */
  shouldCancel(): boolean { return false }
}

/**
 * Set of options for customizing IO's behavior.
 *
 * @param autoCancelableRunLoops should be set to `true` in
 *        case you want `flatMap` driven loops to be
 *        auto-cancelable. Defaults to `false` because of
 *        safety concerns.
 */
export type IOOptions = {
  autoCancelableRunLoops: boolean
}

/** @hidden */
type Current = IO<any>
/** @hidden */
type Bind = ((a: any) => IO<any>)
/** @hidden */
type BindT = Bind | [Bind, Bind]
/** @hidden */
type CallStack = Array<BindT>

/** @hidden */
function _ioPopNextBind(bFirst: BindT | null, bRest: CallStack | null): Bind | null {
  let f: Bind | [Bind, Bind] | null | undefined = undefined
  if (bFirst) f = bFirst
  else if (bRest && bRest.length > 0) f = bRest.pop()
  if (f) return typeof f === "function" ? f : f[0]
  return null
}

/** @hidden */
function _ioFindErrorHandler(bFirst: BindT | null, bRest: CallStack | null): Bind | null {
  let cursor: any = bFirst
  do {
    if (cursor && typeof cursor !== "function") return cursor[1]
    cursor = bRest ? bRest.pop() : null
  } while (cursor)

  return null
}

/**
 * We need to build a callback on each cycle involving an `IOAsync`
 * state. This class builds a mutable callback to reuse on each
 * cycle in order to reduce GC pressure.
 *
 * @hidden
 * @final
 */
class RestartCallback {
  private canCall = false
  private bFirst: BindT | null = null
  private bRest: CallStack | null = null

  public readonly asFunction: (result: Try<any>) => void

  constructor(
    private context: IOContext,
    private callback: (r: Try<any>) => void) {

    this.asFunction = this.signal.bind(this)
  }

  prepare(bFirst: BindT | null, bRest: CallStack | null) {
    this.bFirst = bFirst
    this.bRest = bRest
    this.canCall = true
  }

  signal(result: Try<any>): void {
    if (this.canCall) {
      this.canCall = false
      ioGenericRunLoop(
        new IOPure(result),
        this.context.scheduler,
        this.context,
        this.callback,
        this,
        this.bFirst,
        this.bRest
      )
    } else if (result.isFailure()) {
      this.context.scheduler.reportFailure(result.failed().get())
    }
  }
}

/** @hidden */
function ioExecuteAsync(
  register: IORegister<any>,
  context: IOContext,
  cb: (result: Try<any>) => void,
  rcb: RestartCallback | null,
  bFirst: BindT | null,
  bRest: CallStack | null,
  frameIndex: number) {

  if (!context.shouldCancel()) {
    context.scheduler.batchIndex = frameIndex

    const restart = rcb || new RestartCallback(context, cb)
    restart.prepare(bFirst, bRest)
    register(context, restart.asFunction)
  }
}

/** @hidden */
function ioRestartAsync(
  start: IO<any>,
  context: IOContext,
  cb: (result: Try<any>) => void,
  rcb: RestartCallback | null,
  bFirstInit: BindT | null,
  bRestInit: CallStack | null): void {

  if (!context.shouldCancel())
    context.scheduler.executeAsync(() => {
      ioGenericRunLoop(start, context.scheduler, context, cb, rcb, bFirstInit, bRestInit)
    })
}

/** @hidden */
function ioGenericRunLoop(
  start: IO<any>,
  scheduler: Scheduler,
  context: IOContext | null,
  cb: (result: Try<any>) => void,
  rcb: RestartCallback | null,
  bFirstInit: BindT | null,
  bRestInit: CallStack | null): ICancelable | void {

  let current: Current | Try<any> = start
  let bFirst: BindT | null = bFirstInit
  let bRest: CallStack | null = bRestInit

  const modulus = scheduler.executionModel.recommendedBatchSize - 1
  let frameIndex = scheduler.batchIndex

  while (true) {
    if (current instanceof Try) {
      if (current.isSuccess()) {
        const bind = _ioPopNextBind(bFirst, bRest)
        if (!bind) {
          scheduler.batchIndex = frameIndex
          return cb(current)
        }

        try {
          current = bind(current.get())
        } catch (e) {
          current = Try.failure(e)
        }
      } else {
        const bind = _ioFindErrorHandler(bFirst, bRest)
        if (!bind) {
          scheduler.batchIndex = frameIndex
          return cb(current)
        }

        try {
          current = bind(current.failed().get())
        } catch (e) {
          current = Try.failure(e)
        }
      }

      bFirst = null
      const nextIndex = (frameIndex + 1) & modulus
      // Should we force an asynchronous boundary?
      if (nextIndex) {
        frameIndex = nextIndex
      } else {
        const ctx = context || new IOContext(scheduler)
        /* istanbul ignore next */
        const boxed = current instanceof Try ? new IOPure(current) : current
        ioRestartAsync(boxed, ctx, cb, rcb, bFirst, bRest)
        return ctx.connection
      }
    }
    else switch (current._funADType) {
      case "pure":
        current = (current as IOPure<any>).value
        break

      case "always":
        current = Try.of((current as IOAlways<any>).thunk)
        break

      case "once":
        current = (current as IOOnce<any>).runTry()
        break

      case "flatMap":
        const flatM: IOFlatMap<any, any> = current as any
        if (bFirst) {
          if (!bRest) bRest = []
          bRest.push(bFirst)
        }

        bFirst = !flatM.g ? flatM.f : [flatM.f, flatM.g]
        current = flatM.source
        break

      case "async":
        const async: IOAsync<any> = current as any
        const ctx = context || new IOContext(scheduler)
        ioExecuteAsync(async.register, ctx, cb, rcb, bFirst, bRest, frameIndex)
        return ctx.connection

      case "memoize":
        const mem: IOMemoize<any> = current as any
        return ioStartMemoize(mem, scheduler, context, cb, bFirst, bRest, frameIndex)
    }
  }
}

/** @hidden */
function ioToFutureGoAsync(
  start: IO<any>,
  scheduler: Scheduler,
  bFirst: BindT | null,
  bRest: CallStack | null,
  forcedAsync: boolean): Future<any> {

  return Future.create<any>(cb => {
    const ctx = new IOContext(scheduler)
    if (forcedAsync)
      ioRestartAsync(start as any, ctx, cb as any, null, bFirst, bRest)
    else
      ioGenericRunLoop(start as any, scheduler, ctx, cb as any, null, bFirst, bRest)

    return ctx.connection
  })
}

/** @hidden */
function taskToFutureRunLoop(
  start: IO<any>,
  scheduler: Scheduler): Future<any> {

  let current: Current | Try<any> = start
  let bFirst: BindT | null = null
  let bRest: CallStack | null = null

  const modulus = scheduler.executionModel.recommendedBatchSize - 1
  let frameIndex = scheduler.batchIndex

  while (true) {
    if (current instanceof Try) {
      if (current.isSuccess()) {
        const bind = _ioPopNextBind(bFirst, bRest)
        if (!bind) {
          scheduler.batchIndex = frameIndex
          return Future.pure(current.get())
        }

        try {
          current = bind(current.get())
        } catch (e) {
          current = new IOPure(Try.failure(e))
        }
      } else {
        const err = current.failed().get()
        const bind = _ioFindErrorHandler(bFirst, bRest)
        if (!bind) {
          scheduler.batchIndex = frameIndex
          return Future.raise(err)
        }

        try {
          current = bind(err)
        } catch (e) {
          current = new IOPure(Try.failure(e))
        }
      }

      bFirst = null
      const nextIndex = (frameIndex + 1) & modulus
      // Should we force an asynchronous boundary?
      if (nextIndex) {
        frameIndex = nextIndex
      } else {
        return ioToFutureGoAsync(current, scheduler, bFirst, bRest, true)
      }
    }
    else switch (current._funADType) {
      case "pure":
        current = (current as IOPure<any>).value
        break

      case "always":
        current = Try.of((current as IOAlways<any>).thunk)
        break

      case "once":
        current = (current as IOOnce<any>).runTry()
        break

      case "flatMap":
        const flatM: IOFlatMap<any, any> = current as any
        if (bFirst) {
          if (!bRest) bRest = []
          bRest.push(bFirst)
        }

        bFirst = !flatM.g ? flatM.f : [flatM.f, flatM.g]
        current = flatM.source
        break

      case "async":
      case "memoize":
        return ioToFutureGoAsync(current, scheduler, bFirst, bRest, false)
    }
  }
}

/**
 * Internal utility used in the implementation of `IO.async`.
 *
 * @hidden
 */
function ioSafeCallback<A>(
  ec: Scheduler,
  conn: StackedCancelable,
  cb: (r: Try<A>) => void): ((r: Try<A>) => void) {

  let called = false
  return (r: Try<A>) => {
    if (!called) {
      called = true
      // Inserting a light async boundary, otherwise we can have
      // stack overflow issues, but also ordering issues with
      // StackedCancelable.push in IO.async!
      ec.trampoline(() => {
        conn.pop()
        cb(r)
      })
    } else if (r.isFailure()) {
      ec.reportFailure(r.failed().get())
    }
  }
}

/** @hidden */
function ioStartMemoize<A>(
  fa: IOMemoize<A>,
  ec: Scheduler,
  context: IOContext | null,
  cb: (r: Try<A>) => void,
  bFirstInit: BindT | null,
  bRestInit: CallStack | null,
  frameIndex: number): ICancelable | void {

  // Storing the current frameIndex because invoking this
  // function effectively ends the current run-loop
  ec.batchIndex = frameIndex
  // The state that we'll use for subscribing listeners below
  let state: Try<A> | Future<A>

  // The first evaluation has to trigger the initial run-loop that
  // will eventually set our completed state
  if (fa.result) {
    state = fa.result
  } else {
    // NOTE this isn't using the passed `IOContext`, or the bindings
    // stack because it would be wrong. This has to be executed
    // independently, within its own context.
    const f = ioToFutureGoAsync(fa.source as any, ec, null, null, false)

    if (f.value().isEmpty()) {
      fa.result = f
      state = f

      f.onComplete(r => {
        if (r.isSuccess() || !fa.onlySuccess) {
          // Caching result for subsequent listeners
          fa.result = r as any
          // GC purposes
          delete fa.source
        } else {
          // Reverting the state to the original IO reference, such
          // that it can be retried again
          fa.result = null
        }
      })
    } else {
      state = (f.value().get() as any) as Try<any>
      // Not storing the state on memoizeOnSuccess if it's a failure
      if (state.isSuccess() || !fa.onlySuccess)
        fa.result = state as any
    }
  }

  // We have the IOMemoize in an already completed state,
  // so running with it
  const io: IO<A> = state instanceof Try
    ? new IOPure(state)
    : IO.fromFuture(state)

  ioGenericRunLoop(io, ec, context, cb, null, bFirstInit, bRestInit)
}

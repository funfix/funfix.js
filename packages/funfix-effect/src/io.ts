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
 * Compared with Funfix's `Future` (see `funfix-exec`) or
 * JavaScript's `Promise`, `IO` does not represent a running
 * computation or a value detached from time, as `IO` does not execute
 * anything when working with its builders or operators and it does
 * not submit any work into the `Scheduler` or any run-loop for
 * execution, the execution eventually taking place only after
 * {@link IO.run} is called and not before that.
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
 * executing `runAsync`.
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
   * Alias for {@link IO.flatMap .flatMap}.
   */
  chain<B>(f: (a: A) => IO<B>): IO<B> {
    return this.flatMap(f)
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
   * Returns a new `IO` that upon evaluation will execute the given
   * function for the generated element, transforming the source into
   * an `IO<void>`.
   */
  forEachL(cb: (a: A) => void): IO<void> {
    return this.map(cb)
  }

  /**
   * Identifies the `IO` reference type, useful for debugging and
   * for pattern matching in the implementation.
   */
  readonly _funADType: "pure" | "always" | "once" | "flatMap" | "async"

  // Implements HK<F, A>
  readonly _funKindF: IO<any>
  readonly _funKindA: A

  // Implements Constructor<T>
  static readonly _funErasure: IO<any>

  /**
   * Alias for {@link IO.always}.
   */
  static of<A>(thunk: () => A): IO<A> {
    return IO.always(thunk)
  }

  /**
   * Lifts a value into the `IO` context.
   *
   * Alias for {@link IO.now}.
   */
  static pure<A>(value: A): IO<A> { return IO.now(value) }

  /**
   * Returns an `IO` that on execution is always successful,
   * emitting the given strict value.
   */
  static now<A>(value: A): IO<A> { return new IOPure(Success(value)) }

  /**
   * Shorthand for `now(undefined as void)`, always returning
   * the same reference as optimization.
   */
  static unit(): IO<void> {
    return ioUnitRef
  }

  /**
   * Returns an `IO` that on execution is always finishing in error
   * emitting the specified exception.
   */
  static raise<A = never>(e: Throwable): IO<A> { return new IOPure(Failure(e)) }

  /**
   * Returns a `IO` reference that will signal the result of the
   * given `Try<A>` reference upon evaluation.
   */
  static fromTry<A>(a: Try<A>): IO<A> { return new IOPure(a) }

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
   * Promote a `thunk` function generating `IO` results to an `IO`
   * of the same type.
   */
  static suspend<A>(thunk: () => IO<A>): IO<A> {
    return IO.unit().flatMap(_ => thunk())
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
   *    execution (e.g. {@link Scheduler.trampoline})
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

  toString(): string {
    return this.value.fold(
      e => `IO.raise(${JSON.stringify(e)})`,
      v => `IO.now(${JSON.stringify(v)})`
    )
  }
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

  toString(): string { return `IO.once([thunk])` }
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
  toString(): string { return `IO.always([thunk])` }
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

  toString(): string {
    return `IOFlatMap(${String(this.source)}, ${this.f}, ${this.g})`
  }
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
  toString(): string {
    return `IO#Async([context], [function])`
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
   * on `runAsync`.
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
        if (!bind) { return cb(current) }

        try {
          current = bind(current.get())
        } catch (e) {
          current = Try.failure(e)
        }
      } else {
        const bind = _ioFindErrorHandler(bFirst, bRest)
        if (!bind) { return cb(current) }

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
    const conn = new StackedCancelable()
    const ctx = new IOContext(scheduler, conn)

    if (forcedAsync)
      ioRestartAsync(start as any, ctx, cb as any, null, bFirst, bRest)
    else
      ioGenericRunLoop(start as any, scheduler, ctx, cb as any, null, bFirst, bRest)

    return conn
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
        if (!bind) { return Future.pure(current.get()) }

        try {
          current = bind(current.get())
        } catch (e) {
          current = new IOPure(Try.failure(e))
        }
      } else {
        const err = current.failed().get()
        const bind = _ioFindErrorHandler(bFirst, bRest)
        if (!bind) { return Future.raise(err) }

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
        const async = current as IOAsync<any>
        return ioToFutureGoAsync(async, scheduler, bFirst, bRest, false)
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

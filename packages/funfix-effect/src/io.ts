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

import { HK, Monad } from "funland"
import {
  Either,
  Try,
  Success,
  Failure,
  Throwable,
  TimeoutError,
  Option, Some, None,
  coreInternals
} from "funfix-core"

import {
  ICancelable,
  Cancelable,
  StackedCancelable,
  Scheduler,
  Future, ExecutionModel,
  execInternals, Duration
} from "funfix-exec"

import {
  IteratorLike,
  iteratorOf
} from "./internals"

/**
 * `IO` represents a specification for a possibly lazy or
 * asynchronous computation, which when executed will produce an `A`
 * as a result, along with possible side-effects.
 *
 * Compared with Funfix's
 * [Future](https://funfix.org/api/exec/classes/future.html) (see
 * [funfix-exec](https://funfix.org/api/exec/)) or JavaScript's
 * [Promise](https://promisesaplus.com/),
 * `IO` does not represent a running computation or a value detached
 * from time, as `IO` does not execute anything when working with its
 * builders or operators and it does not submit any work into the
 * [Scheduler](https://funfix.org/api/exec/classes/scheduler.html) or any
 * run-loop for execution, the execution eventually
 * taking place only after {@link IO.run} is called and not before
 * that.
 *
 * In order to understand `IO`, here's the design space:
 *
 * |                  | Strict                     | Lazy                               |
 * |------------------|:--------------------------:|:----------------------------------:|
 * | **Synchronous**  | `A`                        | `() => A`                          |
 * |                  |                            | [Eval&lt;A&gt;]{@link Eval}        |
 * | **Asynchronous** | `(Try<A> => void) => void` | `() => ((Try<A> => void) => void)` |
 * |                  | `Future<A>` / `Promise`    | [IO&lt;A&gt;]{@link IO}            |
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
 * It's the equivalent of JavaScript's `Promise`, only better and
 * cancelable, see next topic.
 *
 * ## Laziness
 *
 * The fact that `IO` is lazy, whereas `Future` and `Promise` are not
 * has real consequences. For example with `IO` you can do this:
 *
 * ```typescript
 * function retryOnFailure<A>(times: number, io: IO<A>): IO<A> {
 *   return source.recoverWith(err => {
 *     // No more retries left? Re-throw error:
 *     if (times <= 0) return IO.raise(err)
 *     // Recursive call, yes we can!
 *     return retryOnFailure(times - 1, io)
 *       // Adding 500 ms delay for good measure
 *       .delayExecution(500)
 *   })
 * }
 * ```
 *
 * `Future` being a strict value-wannabe means that the actual value
 * gets "memoized" (means cached), however `IO` is basically a function
 * that can be repeated for as many times as you want. `IO` can also
 * do memoization of course:
 *
 * ```typescript
 * io.memoize()
 * ```
 *
 * The difference between this and just calling `run()` is that
 * `memoize()` still returns an `IO` and the actual memoization
 * happens on the first `run()` (with idempotency guarantees of
 * course).
 *
 * But here's something else that `Future` or your favorite
 * `Promise`-like data type cannot do:
 *
 * ```typescript
 * io.memoizeOnSuccess()
 * ```
 *
 * This keeps repeating the computation for as long as the result is a
 * failure and caches it only on success. Yes we can!
 *
 * ### Parallelism
 *
 * Because of laziness, invoking {@link IO.sequence} will not work like
 * it does for `Future.sequence` or `Promise.all`, the given `IO` values
 * being evaluated one after another, in *sequence*, not in *parallel*.
 * If you want parallelism, then you need to use {@link IO.gather} and
 * thus be explicit about it.
 *
 * This is great because it gives you the possibility of fine tuning the
 * execution. For example, say you want to execute things in parallel,
 * but with a maximum limit of 30 tasks being executed in parallel.
 * One way of doing that is to process your list in batches.
 *
 * This sample assumes you have [lodash](https://lodash.com/) installed,
 * for manipulating our array:
 *
 * ```typescript
 * import * as _ from "lodash"
 * import { IO } from "funfix"
 *
 * // Some array of IOs, you come up with something good :-)
 * const list: IO<string>[] = ???
 *
 * // Split our list in chunks of 30 items per chunk,
 * // this being the maximum parallelism allowed
 * const chunks = _.chunks(list, 30)
 * // Specify that each batch should process stuff in parallel
 * const batchedIOs = _.map(chunks, chunk => IO.gather(chunk))
 * // Sequence the batches
 * const allBatches = IO.sequence(batchedIOs)
 *
 * // Flatten the result, within the context of IO
 * const all: IO<string[]> =
 *   allBatches.map(batches => _.flatten(batches))
 * ```
 *
 * Note that the built `IO` reference is just a specification at this point,
 * or you can view it as a function, as nothing has executed yet, you need
 * to call {@link IO.run .run} explicitly.
 *
 * ## Cancellation
 *
 * The logic described by an `IO` task could be cancelable, depending
 * on how the `IO` gets built. This is where the `IO`-`Future`
 * symbiosis comes into play.
 *
 * Futures can also be canceled, in case the described computation can
 * be canceled. When describing `IO` tasks with `IO.of` nothing can be
 * cancelled, since there's nothing about a plain function that you
 * can cancel, but, we can build cancelable tasks with
 * {@link IO.async}:
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
 * Also, given an `IO` task, we can specify actions that need to be
 * triggered in case of cancellation:
 *
 * ```typescript
 * const io = IO.of(() => console.info("Hello!"))
 *   .executeForked()
 *
 * io.doOnCancel(IO.of(() => {
 *   console.info("A cancellation attempt was made!")
 * })
 *
 * const f: Future<void> = io.run()
 *
 * // Note that in this case cancelling the resulting Future
 * // will not stop the actual execution, since it doesn't know
 * // how, but it will trigger our on-cancel callback:
 *
 * f.cancel()
 * //=> A cancellation attempt was made!
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
 * In order to configure a different execution model, this config
 * can be injected by means of a custom scheduler:
 *
 * ```typescript
 * import { Scheduler, ExecutionModel } from "funfix"
 *
 * const ec = Scheduler.global.get()
 *   .withExecutionModel(ExecutionModel.alwaysAsync())
 *
 * // ...
 * io.run(ec)
 * ```
 *
 * Or you can configure an `IO` reference to execute with a certain
 * execution model that overrides the configuration of the injected
 * scheduler, by means of {@link IO.executeWithModel}:
 *
 * ```typescript
 * io.executeWithModel(ExecutionModel.batched(256))
 * ```
 *
 * ## Versus Eval
 *
 * For dealing with lazy evaluation, the other alternative is
 * the {@link Eval} data type.
 *
 * Differences between `Eval` and `IO`:
 *
 * 1. `IO` is capable of describing asynchronous computations as well
 * 2. `IO` is capable of error handling (it implements `MonadError`),
 *    whereas `Eval` does not provide error handling capabilities,
 *    being meant to be used for pure expressions (it implements
 *    `Comonad`, which is incompatible with `MonadError`)
 * 3. You cannot rely on `IO` to produce a value immediately, since
 *    we cannot block threads on top of JavaScript engines
 *
 * So if you need error handling capabilities
 * (i.e. `MonadError<Throwable, ?>`), or if you need to describe
 * asynchronous processes, then `IO` is for you. {@link Eval}
 * is a simpler data type with the sole purpose of controlling the
 * evaluation of expressions (i.e. strict versus lazy).
 *
 * ## Credits
 *
 * This type is inspired by `cats.effect.IO` from
 * {@link http://typelevel.org/cats/|Typelevel Cats},
 * by `monix.eval.Task` from {@link https://monix.io|Monix}, by
 * `scalaz.effect.IO` from [Scalaz](https://github.com/scalaz/scalaz),
 * which are all inspired by Haskell's `IO` data type.
 *
 * @final
 */
export class IO<A> implements HK<"funfix/io", A> {
  /**
   * Triggers the asynchronous execution.
   *
   * Without invoking `run` on a `IO`, nothing gets evaluated, as an
   * `IO` has lazy behavior.
   *
   * ```typescript
   * // Describing a side effect
   * const io = IO.of(() => console.log("Hello!"))
   *   // Delaying it for 1 second, for didactical purposes
   *   .delayExecution(1000)
   *
   * // Nothing executes until we call run on it, which gives
   * // us a Future in return:
   * const f: Future<void> = io.run()
   *
   * // The given Future is cancelable, in case the logic
   * // decribed by our IO is cancelable, so we can do this:
   * f.cancel()
   * ```
   *
   * Note that `run` takes a
   * [Scheduler](https://funfix.org/api/exec/classes/scheduler.html)
   * as an optional parameter and if one isn't provided, then the
   * default scheduler gets used. The `Scheduler` is in charge
   * of scheduling asynchronous boundaries, executing tasks
   * with a delay (e.g. `setTimeout`) or of reporting failures
   * (with `console.error` by default).
   *
   * Also see {@link IO.runOnComplete} for a version that takes a
   * callback as parameter.
   *
   * @return a `Future` that will eventually complete with the
   *         result produced by this `IO` on evaluation
   */
  run(ec: Scheduler = Scheduler.global.get()): Future<A> {
    return taskToFutureRunLoop(this, ec)
  }

  /**
   * Triggers the asynchronous execution.
   *
   * Without invoking `run` on a `IO`, nothing gets evaluated, as an
   * `IO` has lazy behavior.
   *
   * `runComplete` starts the evaluation and takes a callback which
   * will be triggered when the computation is complete.
   *
   * Compared with JavaScript's `Promise.then` the provided callback
   * is a function that receives a
   * [Try](https://funfix.org/api/core/classes/try.html) value, a data
   * type which is what's called a "logical disjunction", or a "tagged
   * union type", a data type that can represent both successful
   * results and failures. This is because in Funfix we don't work
   * with `null`.
   *
   * Also the returned value is an
   * [ICancelable](https://funfix.org/api/exec/interfaces/icancelable.html)
   * reference, which can be used to cancel the running computation,
   * in case the logic described by our `IO` is cancelable (note that
   * some procedures cannot be cancelled, it all depends on how the
   * `IO` value was described, see {@link IO.async} for how cancelable
   * `IO` values can be built).
   *
   * Example:
   *
   * ```typescript
   * // Describing a side effect
   * const io = IO.of(() => console.log("Hello!"))
   *   .delayExecution(1000)
   *
   * // Nothing executes until we explicitly run our `IO`:
   * const c: ICancelable = io.runOnComplete(r =>
   *   r.fold(
   *     err => console.error(err),
   *     _ => console.info("Done!")
   *   ))
   *
   * // In case we change our mind and the logic described by
   * // our `IO` is cancelable, we can cancel it:
   * c.cancel()
   * ```
   *
   * Note that `runOnComplete` takes a
   * [Scheduler](https://funfix.org/api/exec/classes/scheduler.html)
   * as an optional parameter and if one isn't provided, then the
   * default scheduler gets used. The `Scheduler` is in charge
   * of scheduling asynchronous boundaries, executing tasks
   * with a delay (e.g. `setTimeout`) or of reporting failures
   * (with `console.error` by default).
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
  runOnComplete(
    cb: (result: Try<A>) => void,
    ec: Scheduler = Scheduler.global.get()): ICancelable {

    const ref = ioGenericRunLoop(this, ec, null, cb, null, null, null)
    return ref || Cancelable.empty()
  }

  /**
   * Handle errors by lifting results into `Either` values.
   *
   * If there's an error, then a `Left` value will be signaled. If
   * there is no error, then a `Right` value will be signaled instead.
   *
   * The returned type is an
   * [Either](https://funfix.org/api/core/classes/either.html) value,
   * which is what's called a "logical disjunction" or a "tagged union
   * type", representing a choice between two values, in this case
   * errors on the "Left" and successful results on the "Right".
   *
   * ```typescript
   * // Describing an IO that can fail on execution:
   * const io: IO<number> = IO.of(() => {
   *   const n = Math.random() * 1000
   *   const m = n & n // to integer
   *   if (m % 2) throw new Error("No odds please!")
   *   return m
   * })
   *
   * // By using attempt() we can observe and use errors
   * // in `map` and `flatMap` transformations:
   * io.attempt().map(either =>
   *   either.fold(
   *     err => "odd",
   *     val => "even"
   *   ))
   * ```
   *
   * For other error handling capabilities, see {@link IO.recoverWith}
   * and {@link IO.transformWith}.
   */
  attempt(): IO<Either<Throwable, A>> {
    return this.transform(
      _ => Either.left<Throwable, A>(_),
      Either.right)
  }

  /**
   * Introduces an asynchronous boundary at the current stage in the
   * asynchronous processing pipeline (after the source has been
   * evaluated).
   *
   * Consider the following example:
   *
   * ```typescript
   * const readPath: () => "path/to/file"
   *
   * const io = IO.of(readPath)
   *   .asyncBoundary()
   *   .map(fs.readFileSync)
   * ```
   *
   * Between reading the path and then reading the file from that
   * path, we schedule an async boundary (it usually happens with
   * JavaScript's `setTimeout` under the hood).
   *
   * This is equivalent with:
   *
   * ```typescript
   * self.flatMap(a => IO.shift(ec).map(_ => a))
   *
   * // ... or ...
   *
   * self.forEffect(IO.shift(ec))
   * ```
   *
   * Also see {@link IO.shift} and {@link IO.fork}.
   *
   * @param ec is an optional `Scheduler` implementation that can
   *        be used for scheduling the async boundary, however if
   *        not specified, the `IO`'s default scheduler (the one
   *        passed to `run()`) gets used
   */
  asyncBoundary(ec?: Scheduler): IO<A> {
    return this.flatMap(a => IO.shift(ec).map(() => a))
  }

  /**
   * Alias for {@link IO.flatMap .flatMap}.
   */
  chain<B>(f: (a: A) => IO<B>): IO<B> {
    return this.flatMap(f)
  }

  /**
   * Delays the evaluation of this `IO` by the specified duration.
   *
   * ```typescript
   * const fa = IO.of(() => "Hello")
   *
   * // Delays the evaluation by 1 second
   * fa.delayExecution(1000)
   * ```
   *
   * @param delay is the duration to wait before signaling the
   *        final result
   */
  delayExecution(delay: number | Duration): IO<A> {
    return IO.delayedTick(delay).flatMap(() => this)
  }

  /**
   * Delays signaling the result of this `IO` on evaluation by the
   * specified duration.
   *
   * It works for successful results:
   *
   * ```typescript
   * const fa = IO.of(() => "Alex")
   *
   * // Delays the signaling by 1 second
   * fa.delayResult(1000)
   * ```
   *
   * And for failures as well:
   *
   * ```typescript
   * Future.raise(new TimeoutError()).delayResult(1000)
   * ```
   *
   * @param delay is the duration to wait before signaling the
   *        final result
   */
  delayResult(delay: number | Duration): IO<A> {
    return this.transformWith(
      err => IO.delayedTick(delay).flatMap(() => IO.raise(err)),
      a => IO.delayedTick(delay).map(() => a)
    )
  }

  /**
   * Returns a new `IO` in which `f` is scheduled to be run on
   * completion. This would typically be used to release any
   * resources acquired by this `IO`.
   *
   * The returned `IO` completes when both the source and the task
   * returned by `f` complete.
   *
   * NOTE: The given function is only called when the task is
   * complete.  However the function does not get called if the task
   * gets canceled. Cancellation is a process that's concurrent with
   * the execution of a task and hence needs special handling.
   *
   * See {@link IO.doOnCancel} for specifying a callback to call on
   * canceling a task.
   */
  doOnFinish(f: (e: Option<Throwable>) => IO<void>): IO<A> {
    return this.transformWith(
      e => f(Some(e)).flatMap(() => IO.raise(e)),
      a => f(None).map(() => a)
    )
  }

  /**
   * Returns a new `IO` that will mirror the source, but that will
   * execute the given `callback` if the task gets canceled before
   * completion.
   *
   * This only works for premature cancellation. See
   * {@link IO.doOnFinish} for triggering callbacks when the
   * source finishes.
   *
   * @param callback is the `IO` value to execute if the task gets
   *        canceled prematurely
   */
  doOnCancel(callback: IO<void>): IO<A> {
    return IO.asyncUnsafe<A>((ctx, cb) => {
      const ec = ctx.scheduler
      ec.trampoline(() => {
        const conn = ctx.connection
        conn.push(Cancelable.of(() => callback.run(ec)))
        IO.unsafeStart(this, ctx, ioSafeCallback(ec, conn, cb))
      })
    })
  }

  /**
   * Ensures that an asynchronous boundary happens before the
   * execution, managed by the provided scheduler.
   *
   * Alias for {@link IO.fork}.
   *
   * Calling this is equivalent with:
   *
   * ```typescript
   * IO.shift(ec).flatMap(_ => self)
   *
   * // ... or ...
   *
   * IO.shift(ec).followedBy(self)
   * ```
   *
   * See {@link IO.fork}, {@link IO.asyncBoundary} and {@link IO.shift}.
   */
  executeForked(ec?: Scheduler): IO<A> {
    return IO.fork(this, ec)
  }

  /**
   * Override the `ExecutionModel` of the default scheduler.
   *
   * ```typescript
   * import { ExecutionModel } from "funfix"
   *
   * io.executeWithModel(ExecutionModel.alwaysAsync())
   * ```
   */
  executeWithModel(em: ExecutionModel): IO<A> {
    return IO.asyncUnsafe<A>((ctx, cb) => {
      const ec = ctx.scheduler.withExecutionModel(em)
      const ctx2 = new IOContext(ec, ctx.connection, ctx.options)
      ec.trampoline(() => IO.unsafeStart(this, ctx2, cb))
    })
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
   * `Applicative` apply operator.
   *
   * Resembles {@link map}, but the passed mapping function is
   * lifted in the `Either` context.
   */
  ap<B>(ff: IO<(a: A) => B>): IO<B> {
    return ff.flatMap(f => this.map(f))
  }

  /**
   * Sequentially compose two `IO` actions, discarding any value
   * produced by the first.
   *
   * So this:
   *
   * ```typescript
   * ioA.followedBy(ioB)
   * ```
   *
   * Is equivalent with this:
   *
   * ```typescript
   * ioA.flatMap(_ => fb)
   * ```
   */
  followedBy<B>(fb: IO<B>): IO<B> {
    return this.flatMap(() => fb)
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
   * Sequentially compose two actions, discarding any value
   * produced by the second.
   *
   * So this:
   *
   * ```typescript
   * ioA.forEffect(ioB)
   * ```
   *
   * Is equivalent with this:
   *
   * ```typescript
   * ioA.flatMap(a => ioB.map(_ => a))
   * ```
   */
  forEffect<B>(fb: IO<B>): IO<A> {
    return this.flatMap(a => fb.map(() => a))
  }

  /**
   * Returns a new `IO` that applies the mapping function to the
   * successful result emitted by the source.
   *
   * ```typescript
   * IO.now(111).map(_ => _ * 2).get() // 222
   * ```
   *
   * Note there's a correspondence between `flatMap` and `map`:
   *
   * ```typescript
   * fa.map(f) <-> fa.flatMap(x => IO.pure(f(x)))
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
    switch (this._tag) {
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
   * Memoizes (caches) the successful result of the source task
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
    switch (this._tag) {
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
   *
   * ```typescript
   * io.recover(err => {
   *   console.error(err)
   *   fallback
   * })
   * ```
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
   *
   * Note that because of `IO`'s laziness, this can describe retry
   * loop:
   *
   * ```typescript
   * function retryOnFailure<A>(times: number, io: IO<A>): IO<A> {
   *   return source.recoverWith(err => {
   *     // No more retries left? Re-throw error:
   *     if (times <= 0) return IO.raise(err)
   *     // Recursive call, yes we can!
   *     return retryOnFailure(times - 1, io)
   *       // Adding 500 ms delay for good measure
   *       .delayExecution(500)
   *   })
   * }
   * ```
   */
  recoverWith<AA>(f: (e: Throwable) => IO<AA>): IO<A | AA> {
    return this.transformWith(f, IO.now as any)
  }

  /**
   * Returns an `IO` that mirrors the source in case the result of
   * the source is signaled within the required `after` duration
   * on evaluation, otherwise it fails with a `TimeoutError`,
   * cancelling the source.
   *
   * ```typescript
   * const fa = IO.of(() => 1).delayResult(10000)
   *
   * // Will fail with a TimeoutError on run()
   * fa.timeout(1000)
   * ```
   *
   * @param after is the duration to wait until it triggers
   *        the timeout error
   */
  timeout(after: number | Duration): IO<A> {
    const fb = IO.raise(new TimeoutError(Duration.of(after).toString()))
    return this.timeoutTo(after, fb)
  }

  /**
   * Returns an `IO` value that mirrors the source in case the result
   * of the source is signaled within the required `after` duration
   * when evaluated (with `run()`), otherwise it triggers the
   * execution of the given `fallback` after the duration has passed,
   * cancelling the source.
   *
   * This is literally the implementation of {@link IO.timeout}:
   *
   * ```typescript
   * const fa = IO.of(() => 1).delayResult(10000)
   *
   * fa.timeoutTo(1000, IO.raise(new TimeoutError()))
   * ```
   *
   * @param after is the duration to wait until it triggers the `fallback`
   * @param fallback is a fallback `IO` to timeout to
   */
  timeoutTo<AA>(after: number | Duration, fallback: IO<AA>): IO<A | AA> {
    const other = IO.delayedTick(after).flatMap(() => fallback)
    const lst: IO<A | AA>[] = [this, other]
    return IO.firstCompletedOf(lst)
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
   * @param failure is a function for transforming failures
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
   * @param failure is a function for transforming failures
   */
  transformWith<R>(failure: (e: Throwable) => IO<R>, success: (a: A) => IO<R>): IO<R> {
    return new IOFlatMap(this, success, failure)
  }

  /**
   * Identifies the `IO` reference type, useful for debugging and
   * for pattern matching in the implementation.
   *
   * @hidden
   */
  readonly _tag!: "pure" | "always" | "once" | "flatMap" | "async" | "memoize"

  // Implements HK<F, A>
  /** @hidden */ readonly _URI!: "funfix/io"
  /** @hidden */ readonly _A!: A

  // Implements Constructor<T>
  /** @hidden */ static readonly _Class: IO<any>

  /**
   * Promote a `thunk` function to an `IO`, catching exceptions in
   * the process.
   *
   * Note that since `IO` is not memoized by global, this will
   * recompute the value each time the `IO` is executed.
   *
   * ```typescript
   * const io = IO.always(() => { console.log("Hello!") })
   *
   * io.run()
   * //=> Hello!
   * io.run()
   * //=> Hello!
   * io.run()
   * //=> Hello!
   * ```
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
   * Constructs a lazy [[IO]] instance whose result will be computed
   * asynchronously.
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
    return IO.unit().flatMap(() => thunk())
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
   * Returns an `IO` that on evaluation will complete after the
   * given `delay`.
   *
   * This can be used to do delayed execution. For example:
   *
   * ```typescript
   * IO.delayedTick(1000).flatMap(_ =>
   *   IO.of(() => console.info("Hello!"))
   * )
   * ```
   *
   * @param delay is the duration to wait before signaling the tick
   */
  static delayedTick<A>(delay: number | Duration): IO<void> {
    return IO.asyncUnsafe<void>((ctx, cb) => {
      const conn = ctx.connection
      const task = ctx.scheduler.scheduleOnce(delay, () => {
        conn.pop()
        cb(Try.unit())
      })
      conn.push(task)
    })
  }

  /**
   * Creates a race condition between multiple `IO` values, on
   * evaluation returning the result of the first one that completes,
   * cancelling the rest.
   *
   * ```typescript
   * const failure = IO.raise(new TimeoutError()).delayResult(2000)
   *
   * // Will yield 1
   * const fa1 = IO.of(() => 1).delayResult(1000)
   * IO.firstCompletedOf([fa1, failure])
   *
   * // Will yield a TimeoutError
   * const fa2 = IO.of(() => 1).delayResult(10000)
   * IO.firstCompletedOf([fa2, failure])
   * ```
   *
   * @param list is the list of `IO` values for which the
   *        race is started
   *
   * @return a new `IO` that will evaluate to the result of the first
   *         in the list to complete, the rest being cancelled
   */
  static firstCompletedOf<A>(list: IO<A>[] | Iterable<IO<A>>): IO<A> {
    return ioListToFutureProcess(list, Future.firstCompletedOf)
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
    if (!fa.value().isEmpty())
      return IO.fromTry<A>(fa.value().get() as any)

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
   * Mirrors the given source `IO`, but before execution trigger
   * an asynchronous boundary (usually by means of `setTimeout` on
   * top of JavaScript, depending on the provided `Scheduler`
   * implementation).
   *
   * If a `Scheduler` is not explicitly provided, the implementation
   * ends up using the one provided in {@link IO.run}.
   *
   * Note that {@link IO.executeForked} is the method version of this
   * function (e.g. `io.executeForked() == IO.fork(this)`).
   *
   * ```typescript
   * IO.of(() => fs.readFileSync(path))
   *   .executeForked()
   * ```
   *
   * Also see {@link IO.shift} and {@link IO.asyncBoundary}.
   *
   * @param fa is the task that will get executed asynchronously
   *
   * @param ec is the `Scheduler` used for triggering the async
   *        boundary, or if not provided it will default to the
   *        scheduler passed on evaluation in {@link IO.run}
   */
  static fork<A>(fa: IO<A>, ec?: Scheduler): IO<A> {
    return IO.shift(ec).flatMap(() => fa)
  }

  /**
   * Maps 2 `IO` values by the mapping function, returning a new
   * `IO` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link IO.sequence} operation and as such
   * on cancellation or failure all pending tasks get cancelled.
   *
   * ```typescript
   * const fa1 = IO.of(() => 1)
   * const fa2 = IO.of(() => 2)
   *
   *
   * // Yields Success(3)
   * IO.map2(fa1, fa2, (a, b) => a + b)
   *
   * // Yields Failure, because the second arg is a Failure
   * IO.map2(fa1, IO.raise("error"),
   *   (a, b) => a + b
   * )
   * ```
   *
   * This operation is the `Applicative.map2`.
   */
  static map2<A1, A2, R>(
    fa1: IO<A1>, fa2: IO<A2>,
    f: (a1: A1, a2: A2) => R): IO<R> {

    const fl: IO<any[]> = IO.sequence([fa1, fa2] as any[])
    return fl.map(lst => f(lst[0], lst[1]))
  }

  /**
   * Maps 3 `IO` values by the mapping function, returning a new
   * `IO` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link IO.sequence} operation and as such
   * on cancellation or failure all pending tasks get cancelled.
   *
   * ```typescript
   * const fa1 = IO.of(() => 1)
   * const fa2 = IO.of(() => 2)
   * const fa3 = IO.of(() => 3)
   *
   *
   * // Yields Success(6)
   * IO.map3(fa1, fa2, fa3, (a, b, c) => a + b + c)
   *
   * // Yields Failure, because the second arg is a Failure
   * IO.map3(
   *   fa1, fa2, IO.raise("error"),
   *   (a, b, c) => a + b + c
   * )
   * ```
   */
  static map3<A1, A2, A3, R>(
    fa1: IO<A1>, fa2: IO<A2>, fa3: IO<A3>,
    f: (a1: A1, a2: A2, a3: A3) => R): IO<R> {

    const fl: IO<any[]> = IO.sequence([fa1, fa2, fa3] as any[])
    return fl.map(lst => f(lst[0], lst[1], lst[2]))
  }

  /**
   * Maps 4 `IO` values by the mapping function, returning a new
   * `IO` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link IO.sequence} operation and as such
   * on cancellation or failure all pending tasks get cancelled.
   *
   * ```typescript
   * const fa1 = IO.of(() => 1)
   * const fa2 = IO.of(() => 2)
   * const fa3 = IO.of(() => 3)
   * const fa4 = IO.of(() => 4)
   *
   * // Yields Success(10)
   * IO.map4(fa1, fa2, fa3, fa4, (a, b, c, d) => a + b + c + d)
   *
   * // Yields Failure, because the second arg is a Failure
   * IO.map4(
   *   fa1, fa2, fa3, IO.raise("error"),
   *   (a, b, c, d) => a + b + c + d
   * )
   * ```
   */
  static map4<A1, A2, A3, A4, R>(
    fa1: IO<A1>, fa2: IO<A2>, fa3: IO<A3>, fa4: IO<A4>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4) => R): IO<R> {

    const fl: IO<any[]> = IO.sequence([fa1, fa2, fa3, fa4] as any[])
    return fl.map(lst => f(lst[0], lst[1], lst[2], lst[3]))
  }

  /**
   * Maps 5 `IO` values by the mapping function, returning a new
   * `IO` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link IO.sequence} operation and as such
   * on cancellation or failure all pending tasks get cancelled.
   *
   * ```typescript
   * const fa1 = IO.of(() => 1)
   * const fa2 = IO.of(() => 2)
   * const fa3 = IO.of(() => 3)
   * const fa4 = IO.of(() => 4)
   * const fa5 = IO.of(() => 5)
   *
   * // Yields Success(15)
   * IO.map5(fa1, fa2, fa3, fa4, fa5,
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * IO.map5(
   *   fa1, fa2, fa3, fa4, IO.raise("error"),
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   * ```
   */
  static map5<A1, A2, A3, A4, A5, R>(
    fa1: IO<A1>, fa2: IO<A2>, fa3: IO<A3>, fa4: IO<A4>, fa5: IO<A5>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R): IO<R> {

    const fl: IO<any[]> = IO.sequence([fa1, fa2, fa3, fa4, fa5] as any[])
    return fl.map(lst => f(lst[0], lst[1], lst[2], lst[3], lst[4]))
  }

  /**
   * Maps 6 `IO` values by the mapping function, returning a new
   * `IO` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link IO.sequence} operation and as such
   * on cancellation or failure all pending tasks get cancelled.
   *
   * ```typescript
   * const fa1 = IO.of(() => 1)
   * const fa2 = IO.of(() => 2)
   * const fa3 = IO.of(() => 3)
   * const fa4 = IO.of(() => 4)
   * const fa5 = IO.of(() => 5)
   * const fa6 = IO.of(() => 6)
   *
   * // Yields Success(21)
   * IO.map6(
   *   fa1, fa2, fa3, fa4, fa5, fa6,
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * IO.map6(
   *   fa1, fa2, fa3, fa4, fa5, IO.raise("error"),
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   * ```
   */
  static map6<A1, A2, A3, A4, A5, A6, R>(
    fa1: IO<A1>, fa2: IO<A2>, fa3: IO<A3>, fa4: IO<A4>, fa5: IO<A5>, fa6: IO<A6>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => R): IO<R> {

    const fl: IO<any[]> = IO.sequence([fa1, fa2, fa3, fa4, fa5, fa6] as any[])
    return fl.map(lst => f(lst[0], lst[1], lst[2], lst[3], lst[4], lst[5]))
  }

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
   * Maps 2 `IO` values evaluated nondeterministically, returning a new
   * `IO` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link IO.gather} operation. As such
   * the `IO` operations are potentially executed in parallel
   * (if the operations are asynchronous) and on cancellation or
   * failure all pending tasks get cancelled.
   *
   * ```typescript
   * const fa1 = IO.of(() => 1)
   * const fa2 = IO.of(() => 2)
   *
   *
   * // Yields Success(3)
   * IO.parMap2(fa1, fa2, (a, b) => a + b)
   *
   * // Yields Failure, because the second arg is a Failure
   * IO.parMap2(fa1, IO.raise("error"),
   *   (a, b) => a + b
   * )
   * ```
   */
  static parMap2<A1, A2, R>(
    fa1: IO<A1>, fa2: IO<A2>,
    f: (a1: A1, a2: A2) => R): IO<R> {

    const fl: IO<any[]> = IO.gather([fa1, fa2] as any[])
    return fl.map(lst => f(lst[0], lst[1]))
  }

  /**
   * Maps 3 `IO` values evaluated nondeterministically, returning a new
   * `IO` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link IO.gather} operation. As such
   * the `IO` operations are potentially executed in parallel
   * (if the operations are asynchronous) and on cancellation or
   * failure all pending tasks get cancelled.
   *
   * ```typescript
   * const fa1 = IO.of(() => 1)
   * const fa2 = IO.of(() => 2)
   * const fa3 = IO.of(() => 3)
   *
   *
   * // Yields Success(6)
   * IO.parMap3(fa1, fa2, fa3, (a, b, c) => a + b + c)
   *
   * // Yields Failure, because the second arg is a Failure
   * IO.parMap3(
   *   fa1, fa2, IO.raise("error"),
   *   (a, b, c) => a + b + c
   * )
   * ```
   */
  static parMap3<A1, A2, A3, R>(
    fa1: IO<A1>, fa2: IO<A2>, fa3: IO<A3>,
    f: (a1: A1, a2: A2, a3: A3) => R): IO<R> {

    const fl: IO<any[]> = IO.gather([fa1, fa2, fa3] as any[])
    return fl.map(lst => f(lst[0], lst[1], lst[2]))
  }

  /**
   * Maps 4 `IO` values evaluated nondeterministically, returning a new
   * `IO` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link IO.gather} operation. As such
   * the `IO` operations are potentially executed in parallel
   * (if the operations are asynchronous) and on cancellation or
   * failure all pending tasks get cancelled.
   *
   * ```typescript
   * const fa1 = IO.of(() => 1)
   * const fa2 = IO.of(() => 2)
   * const fa3 = IO.of(() => 3)
   * const fa4 = IO.of(() => 4)
   *
   * // Yields Success(10)
   * IO.parMap4(fa1, fa2, fa3, fa4, (a, b, c, d) => a + b + c + d)
   *
   * // Yields Failure, because the second arg is a Failure
   * IO.parMap4(
   *   fa1, fa2, fa3, IO.raise("error"),
   *   (a, b, c, d) => a + b + c + d
   * )
   * ```
   */
  static parMap4<A1, A2, A3, A4, R>(
    fa1: IO<A1>, fa2: IO<A2>, fa3: IO<A3>, fa4: IO<A4>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4) => R): IO<R> {

    const fl: IO<any[]> = IO.gather([fa1, fa2, fa3, fa4] as any[])
    return fl.map(lst => f(lst[0], lst[1], lst[2], lst[3]))
  }

  /**
   * Maps 5 `IO` values evaluated nondeterministically, returning a new
   * `IO` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link IO.gather} operation. As such
   * the `IO` operations are potentially executed in parallel
   * (if the operations are asynchronous) and on cancellation or
   * failure all pending tasks get cancelled.
   *
   * ```typescript
   * const fa1 = IO.of(() => 1)
   * const fa2 = IO.of(() => 2)
   * const fa3 = IO.of(() => 3)
   * const fa4 = IO.of(() => 4)
   * const fa5 = IO.of(() => 5)
   *
   * // Yields Success(15)
   * IO.parMap5(fa1, fa2, fa3, fa4, fa5,
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * IO.parMap5(
   *   fa1, fa2, fa3, fa4, IO.raise("error"),
   *   (a, b, c, d, e) => a + b + c + d + e
   * )
   * ```
   */
  static parMap5<A1, A2, A3, A4, A5, R>(
    fa1: IO<A1>, fa2: IO<A2>, fa3: IO<A3>, fa4: IO<A4>, fa5: IO<A5>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => R): IO<R> {

    const fl: IO<any[]> = IO.gather([fa1, fa2, fa3, fa4, fa5] as any[])
    return fl.map(lst => f(lst[0], lst[1], lst[2], lst[3], lst[4]))
  }

  /**
   * Maps 6 `IO` values evaluated nondeterministically, returning a new
   * `IO` reference that completes with the result of mapping that
   * function to the successful values of the futures, or in failure in
   * case either of them fails.
   *
   * This is a specialized {@link IO.gather} operation. As such
   * the `IO` operations are potentially executed in parallel
   * (if the operations are asynchronous) and on cancellation or
   * failure all pending tasks get cancelled.
   *
   * ```typescript
   * const fa1 = IO.of(() => 1)
   * const fa2 = IO.of(() => 2)
   * const fa3 = IO.of(() => 3)
   * const fa4 = IO.of(() => 4)
   * const fa5 = IO.of(() => 5)
   * const fa6 = IO.of(() => 6)
   *
   * // Yields Success(21)
   * IO.parMap6(
   *   fa1, fa2, fa3, fa4, fa5, fa6,
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   *
   * // Yields Failure, because the second arg is a Failure
   * IO.parMap6(
   *   fa1, fa2, fa3, fa4, fa5, IO.raise("error"),
   *   (a, b, c, d, e, f) => a + b + c + d + e + f
   * )
   * ```
   */
  static parMap6<A1, A2, A3, A4, A5, A6, R>(
    fa1: IO<A1>, fa2: IO<A2>, fa3: IO<A3>, fa4: IO<A4>, fa5: IO<A5>, fa6: IO<A6>,
    f: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => R): IO<R> {

    const fl: IO<any[]> = IO.gather([fa1, fa2, fa3, fa4, fa5, fa6] as any[])
    return fl.map(lst => f(lst[0], lst[1], lst[2], lst[3], lst[4], lst[5]))
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
   * Transforms a list of `IO` values into an `IO` of a list,
   * ordering both results and side effects.
   *
   * This operation would be the equivalent of `Promise.all` or of
   * `Future.sequence`, however because of the laziness of `IO`
   * the given values are processed in order.
   *
   * Sequencing means that on evaluation the tasks won't get processed
   * in parallel. If parallelism is desired, see {@link IO.gather}.
   *
   * Sample:
   *
   * ```typescript
   * const io1 = IO.of(() => 1)
   * const io2 = IO.of(() => 2)
   * const io3 = IO.of(() => 3)
   *
   * // Yields [1, 2, 3]
   * const all: IO<number[]> = IO.sequence([f1, f2, f3])
   * ```
   */
  static sequence<A>(list: IO<A>[] | Iterable<IO<A>>): IO<A[]> {
    return ioSequence(list)
  }

  /**
   * Nondeterministically gather results from the given collection of
   * tasks, returning a task that will signal the same type of
   * collection of results once all tasks are finished.
   *
   * This function is the nondeterministic analogue of `sequence`
   * and should behave identically to `sequence` so long as there is
   * no interaction between the effects being gathered. However,
   * unlike `sequence`, which decides on a total order of effects,
   * the effects in a `gather` are unordered with respect to each
   * other.
   *
   * In other words `gather` can execute `IO` tasks in parallel,
   * whereas {@link IO.sequence} forces an execution order.
   *
   * Although the effects are unordered, the order of results matches
   * the order of the input sequence.
   *
   * ```typescript
   * const io1 = IO.of(() => 1)
   * const io2 = IO.of(() => 2)
   * const io3 = IO.of(() => 3)
   *
   * // Yields [1, 2, 3]
   * const all: IO<number[]> = IO.gather([f1, f2, f3])
   * ```
   */
  static gather<A>(list: IO<A>[] | Iterable<IO<A>>): IO<A[]> {
    return ioListToFutureProcess(list, Future.sequence)
  }

  /**
   * Shifts the bind continuation of the `IO` onto the specified
   * scheduler, for triggering asynchronous execution.
   *
   * Asynchronous actions cannot be shifted, since they are scheduled
   * rather than run. Also, no effort is made to re-shift synchronous
   * actions which *follow* asynchronous actions within a bind chain;
   * those actions will remain on the continuation call stack inherited
   * from their preceding async action.  The only computations which
   * are shifted are those which are defined as synchronous actions and
   * are contiguous in the bind chain *following* the `shift`.
   *
   * For example this sample forces an asynchronous boundary
   * (which usually means that the continuation is scheduled
   * for asynchronous execution with `setTimeout`) before the
   * file will be read synchronously:
   *
   * ```typescript
   * IO.shift().flatMap(_ => fs.readFileSync(path))
   * ```
   *
   * On the other hand in this example the asynchronous boundary
   * is inserted *after* the file has been read:
   *
   * ```typescript
   * IO.of(() => fs.readFileSync(path)).flatMap(content =>
   *   IO.shift().map(_ => content))
   * ```
   *
   * The definition of {@link IO.async} is literally:
   *
   * ```typescript
   * source.flatMap(a => IO.shift(ec).map(_ => a))
   * ```
   *
   * And the definition of {@link IO.fork} is:
   *
   * ```typescript
   * IO.shift(ec).flatMap(_ => source)
   * ```
   *
   * @param ec is the `Scheduler` used for triggering the async
   *        boundary, or if not provided it will default to the
   *        scheduler passed on evaluation in {@link IO.run}
   */
  static shift(ec?: Scheduler): IO<void> {
    if (!ec) return ioShiftDefaultRef
    return ioShift(ec)
  }

  /**
   * Promote a `thunk` function generating `IO` results to an `IO`
   * of the same type.
   */
  static suspend<A>(thunk: () => IO<A>): IO<A> {
    return IO.unit().flatMap(() => thunk())
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
   * Unsafe utility - starts the execution of an `IO`.
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
  readonly _tag: "pure" = "pure"

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
  readonly _tag: "once" = "once"

  private _thunk: () => A
  public cache!: Try<A>
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
  readonly _tag: "always" = "always"

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
  readonly _tag: "flatMap" = "flatMap"

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
  readonly _tag: "async" = "async"

  constructor(public readonly register: IORegister<A>) { super() }
}

class IOMemoize<A> extends IO<A> {
  readonly _tag: "memoize" = "memoize"

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

/**
 * Type enumerating the type classes implemented by `Io`.
 */
export type IOTypes = Monad<"funfix/io">

/**
 * Type-class implementations, compatible with the `static-land`
 * specification.
 */
export const IOModule: IOTypes = {
  // Functor
  map: <A, B>(f: (a: A) => B, fa: IO<A>) =>
    fa.map(f),
  // Apply
  ap: <A, B>(ff: IO<(a: A) => B>, fa: IO<A>): IO<B> =>
    fa.ap(ff),
  // Applicative
  of: IO.pure,
  // Chain
  chain: <A, B>(f: (a: A) => IO<B>, fa: IO<A>): IO<B> =>
    fa.flatMap(f),
  // ChainRec
  chainRec: <A, B>(f: <C>(next: (a: A) => C, done: (b: B) => C, a: A) => IO<C>, a: A): IO<B> =>
    IO.tailRecM(a, a => f(Either.left as any, Either.right as any, a))
}

// Registers Fantasy-Land compatible symbols
coreInternals.fantasyLandRegister(IO, IOModule)

/** @hidden */
function ioShift(ec?: Scheduler): IO<void> {
  return IO.asyncUnsafe<void>((ctx, cb) => {
    (ec || ctx.scheduler).executeAsync(() => cb(Try.unit()))
  })
}

/** @hidden */
const ioShiftDefaultRef: IO<void> = ioShift()

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
          current = bind((current as Try<never>).failed().get())
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
    else switch (current._tag) {
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
        const err = (current as Try<never>).failed().get()
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
    else switch (current._tag) {
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

/**
 * Implementation for `IO.sequence`.
 * @hidden
 */
function ioSequence<A>(list: IO<A>[] | Iterable<IO<A>>): IO<A[]> {
  return IO.of(() => iteratorOf(list))
    .flatMap(cursor => ioSequenceLoop([], cursor))
}

/**
 * Recursive loop that goes through the given `cursor`, element by
 * element, gathering the results of all generated `IO` elements.
 *
 * @hidden
 */
function ioSequenceLoop<A>(acc: A[], cursor: IteratorLike<IO<A>>): IO<A[]> {
  while (true) {
    const elem = cursor.next()
    const isDone = elem.done

    if (elem.value) {
      const io: IO<A> = elem.value
      return io.flatMap(a => {
        acc.push(a)
        if (isDone) return IO.pure(acc)
        return ioSequenceLoop(acc, cursor)
      })
    } else {
      /* istanbul ignore else */
      if (isDone) return IO.pure(acc)
    }
  }
}

/** @hidden */
function ioListToFutureProcess<A, B>(list: IO<A>[] | Iterable<IO<A>>, f: (list: Future<A>[], ec: Scheduler) => Future<B>): IO<B> {
  return IO.asyncUnsafe<B>((ctx, cb) => {
    ctx.scheduler.trampoline(() => {
      let streamErrors = true
      try {
        const futures: Future<A>[] = []
        const array: IO<A>[] = execInternals.iterableToArray(list)
        streamErrors = false

        for (let i = 0; i < array.length; i++) {
          const io = array[i]
          const f = io.run(ctx.scheduler)
          futures.push(f)
        }

        const all = f(futures, ctx.scheduler)
        ctx.connection.push(all)
        all.onComplete(ioSafeCallback(ctx.scheduler, ctx.connection, cb) as any)
      } catch (e) {
        /* istanbul ignore else */
        if (streamErrors) cb(Failure(e))
        else ctx.scheduler.reportFailure(e)
      }
    })
  })
}

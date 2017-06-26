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
 * Provides a {@link Scheduler} data type, capable of scheduling units of work
 * for asynchronous execution, as an alternative to Javascript's `setTimeout`,
 * `setInterval` or other globally available commands.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Scheduler } from "funfix/dist/exec/scheduler"
 * // ... or ...
 * import { Scheduler } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module exec/scheduler
 */

/***/

import { Duration } from "./time"
import { Cancelable, AssignCancelable, MultiAssignCancelable } from "./cancelable"
import { maxPowerOf2, nextPowerOf2, arrayBSearchInsertPos } from "./internals"

/**
 * A `Scheduler` is an execution context that can execute units of
 * work asynchronously, with a delay or periodically.
 *
 * It replaces Javascript's `setTimeout`, which is desirable due to
 * the provided utilities and because special behavior might be needed
 * in certain specialized contexts (e.g. tests), even if the
 * [[Scheduler.global]] reference is implemented with `setTimeout`.
 */
export abstract class Scheduler {
  /**
   * @param em the {@link ExecutionModel} to use for
   *        {@link Scheduler.executionModel}, defaults to
   *        {@link ExecutionModel.default}
   */
  constructor(em?: ExecutionModel) {
    this.executionModel = em || ExecutionModel.default
  }

  /**
   * Schedules the given `command` for async execution.
   *
   * Actual execution might happen immediately, on the current call
   * stack, depending on the `Scheduler` implementation, the only
   * guarantee that this method makes is that execution is stack safe.
   *
   * In [[GlobalScheduler]] this method uses
   * [setImmediate]{@link https://developer.mozilla.org/en/docs/Web/API/Window/setImmediate}
   * when available. But given that `setImmediate` is a very
   * non-standard operation that is currently implemented only by
   * IExplorer and Node.js, on non-supporting environments we fallback
   * on `setTimeout`. See
   * [the W3C proposal]{@link https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/setImmediate/Overview.html}.
   *
   * @param runnable is the thunk to execute asynchronously
   */
  public abstract execute(runnable: () => void): void

  /** Reports that an asynchronous computation failed. */
  public abstract reportFailure(e: any): void

  /**
   * Returns the current time in milliseconds.  Note that while the
   * unit of time of the return value is a millisecond, the
   * granularity of the value depends on the underlying operating
   * system and may be larger.  For example, many operating systems
   * measure time in units of tens of milliseconds.
   *
   * It's the equivalent of `Date.now()`. When wanting to measure
   * time, do not use `Date.now()` directly, prefer this method
   * instead, because then it can be mocked for testing purposes,
   * or overridden for better precision.
   */
  public abstract currentTimeMillis(): number

  /**
   * Schedules a task to run in the future, after `delay`.
   *
   * For example the following schedules a message to be printed to
   * standard output after 5 minutes:
   *
   * ```typescript
   * const task =
   *   scheduler.scheduleOnce(Duration.minutes(5), () => {
   *     console.log("Hello, world!")
   *   })
   *
   * // later if you change your mind ... task.cancel()
   * ```
   *
   * @param delay is the time to wait until the execution happens; if
   *        specified as a `number`, then it's interpreted as milliseconds;
   *        for readability, prefer passing [[Duration]] values
   * @param runnable is the callback to be executed
   *
   * @return a [[Cancelable]] that can be used to cancel the created
   *         task before execution.
   */
  public abstract scheduleOnce(delay: number | Duration, runnable: () => void): Cancelable

  /**
   * Schedules for execution a periodic task that is first executed
   * after the given initial delay and subsequently with the given
   * delay between the termination of one execution and the
   * commencement of the next.
   *
   * For example the following schedules a message to be printed to
   * standard output every 10 seconds with an initial delay of 5
   * seconds:
   *
   * ```typescript
   * const task =
   *   s.scheduleWithFixedDelay(Duration.seconds(5), Duration.seconds(10), () => {
   *     console.log("repeated message")
   *   })
   *
   * // later if you change your mind ...
   * task.cancel()
   * ```
   *
   * @param initialDelay is the time to wait until the first execution happens
   * @param delay is the time to wait between 2 successive executions of the task
   * @param runnable is the thunk to be executed
   * @return a cancelable that can be used to cancel the execution of
   *         this repeated task at any time.
   */
  public scheduleWithFixedDelay(initialDelay: number | Duration, delay: number | Duration, runnable: () => void): Cancelable {
    const loop = (self: Scheduler, ref: AssignCancelable, delayNow: number | Duration) =>
      ref.update(self.scheduleOnce(delayNow, () => {
        runnable()
        loop(self, ref, delay)
      }))

    const task = MultiAssignCancelable.empty()
    return loop(this, task, initialDelay)
  }

  /**
   * Schedules a periodic task that becomes enabled first after the given
   * initial delay, and subsequently with the given period. Executions will
   * commence after `initialDelay` then `initialDelay + period`, then
   * `initialDelay + 2 * period` and so on.
   *
   * If any execution of the task encounters an exception, subsequent executions
   * are suppressed. Otherwise, the task will only terminate via cancellation or
   * termination of the scheduler. If any execution of this task takes longer
   * than its period, then subsequent executions may start late, but will not
   * concurrently execute.
   *
   * For example the following schedules a message to be printed to standard
   * output approximately every 10 seconds with an initial delay of 5 seconds:
   *
   * ```typescript
   * const task =
   *   s.scheduleAtFixedRate(Duration.seconds(5), Duration.seconds(10), () => {
   *     console.log("repeated message")
   *   })
   *
   *   // later if you change your mind ...
   *   task.cancel()
   * ```
   *
   * @param initialDelay is the time to wait until the first execution happens
   * @param period is the time to wait between 2 successive executions of the task
   * @param runnable is the thunk to be executed
   * @return a cancelable that can be used to cancel the execution of
   *         this repeated task at any time.
   */
  public scheduleAtFixedRate(initialDelay: number | Duration, period: number | Duration, runnable: () => void): Cancelable {
    const loop = (self: Scheduler, ref: AssignCancelable, delayNowMs: number, periodMs: number) =>
      ref.update(self.scheduleOnce(delayNowMs, () => {
        // Benchmarking the duration of the runnable
        const startAt = self.currentTimeMillis()
        runnable()
        // Calculating the next delay based on the current execution
        const elapsedMs = self.currentTimeMillis() - startAt
        const nextDelayMs = Math.max(0, periodMs - elapsedMs)
        loop(self, ref, periodMs, nextDelayMs)
      }))

    const task = MultiAssignCancelable.empty()
    return loop(this, task,
      typeof initialDelay === "number" ? initialDelay : initialDelay.toMillis(),
      typeof period === "number" ? period : period.toMillis()
    )
  }

  /**
   *  The {@link ExecutionModel} is a specification of how run-loops
   * and producers should behave in regards to executing tasks
   * either synchronously or asynchronously.
   */
  public executionModel: ExecutionModel

  /**
   * Given a function that will receive the underlying
   * {@link ExecutionModel}, returns a new {@link Scheduler}
   * reference, based on the source that exposes the new
   * `ExecutionModel` value when queried by means of the
   * {@link Scheduler.executionModel} property.
   *
   * This method enables reusing global scheduler references in
   * a local scope, but with a slightly modified execution model
   * to inject
   *
   * The contract of this method (things you can rely on):
   *
   *  1. the source `Scheduler` must not be modified in any way
   *  2. the implementation should wrap the source efficiently, such
   *     that the result mirrors the source `Scheduler` in every way
   *     except for the execution model
   *
   * Sample:
   *
   * ```typescript
   * import { Scheduler, ExecutionModel } from "funfix"
   *
   * const scheduler = Schedule.global()
   *   .withExecutionModel(ExecutionModel.synchronous())
   * ```
   */
  public abstract withExecutionModel(em: ExecutionModel): Scheduler

  /**
   * Returns a reusable [[GlobalScheduler]] reference.
   */
  static global(): GlobalScheduler {
    return globalSchedulerRef
  }
}

/**
 * The `ExecutionModel` is a specification for how potentially asynchronous
 * run-loops should execute, imposed by the `Scheduler`.
 *
 * When executing tasks, a run-loop can always execute tasks
 * asynchronously (by forking logical threads), or it can always
 * execute them synchronously (same thread and call-stack, by
 * using an internal trampoline), or it can do a mixed mode
 * that executes tasks in batches before forking.
 *
 * The specification is considered a recommendation for how
 * run loops should behave, but ultimately it's up to the client
 * to choose the best execution model. This can be related to
 * recursive loops or to events pushed into consumers.
 */
export class ExecutionModel {
  /**
   * Recommended batch size used for breaking synchronous loops in
   * asynchronous batches. When streaming value from a producer to
   * a synchronous consumer it's recommended to break the streaming
   * in batches as to not hold the current thread or run-loop
   * indefinitely.
   *
   * This is rounded to the next power of 2, because then for
   * applying the modulo operation we can just do:
   *
   * ```typescript
   * const modulus = recommendedBatchSize - 1
   * // ...
   * nr = (nr + 1) & modulus
   * ```
   */
  public recommendedBatchSize: number

  /**
   * The type of the execution model, which can be:
   *
   * - `batched`: the default, specifying an mixed execution
   *   mode under which tasks are executed synchronously in
   *   batches up to a maximum size; after a batch of
   *   {@link recommendedBatchSize} is executed, the next
   *   execution should be asynchronous.
   * - `synchronous`: specifies that execution should be
   *   synchronous (immediate, trampolined) for as long as
   *   possible.
   * - `alwaysAsync`: specifies a run-loop should always do
   *   async execution of tasks, triggering asynchronous
   *   boundaries on each step.
   */
  public type: "batched" | "synchronous" | "alwaysAsync"

  private constructor(type: "batched" | "synchronous" | "alwaysAsync", batchSize?: number) {
    this.type = type
    switch (type) {
      case "synchronous":
        this.recommendedBatchSize = maxPowerOf2
        break
      case "alwaysAsync":
        this.recommendedBatchSize = 1
        break
      case "batched":
        this.recommendedBatchSize = nextPowerOf2(batchSize || 128)
        break
    }
  }

  /**
   * An {@link ExecutionModel} that specifies that execution should be
   * synchronous (immediate, trampolined) for as long as possible.
   */
  static synchronous(): ExecutionModel {
    return new ExecutionModel("synchronous")
  }

  /**
   * An {@link ExecutionModel} that specifies a run-loop should always do
   * async execution of tasks, thus triggering asynchronous boundaries on
   * each step.
   */
  static alwaysAsync(): ExecutionModel {
    return new ExecutionModel("alwaysAsync")
  }

  /**
   * Returns an {@link ExecutionModel} that specifies a mixed execution
   * mode under which tasks are executed synchronously in batches up to
   * a maximum size, the `recommendedBatchSize`.
   *
   * After such a batch of {@link recommendedBatchSize} is executed, the
   * next execution should have a forced asynchronous boundary.
   */
  static batched(recommendedBatchSize?: number): ExecutionModel {
    return new ExecutionModel("batched", recommendedBatchSize)
  }

  /**
   * The default {@link ExecutionModel} that should be used whenever
   * an execution model isn't explicitly specified.
   */
  static default: ExecutionModel = ExecutionModel.batched()
}

/**
 * `GlobalScheduler` is a [[Scheduler]] implementation based on Javascript's
 * [setTimeout]{@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout}
 * and (if available and configured)
 * [setImmediate]{@link https://developer.mozilla.org/en/docs/Web/API/Window/setImmediate}.
 */
export class GlobalScheduler extends Scheduler {
  /** If `true`, then `setImmediate` is used in `execute`. */
  private _useSetImmediate: boolean

  /**
   * @param canUseSetImmediate is a boolean informing the
   * `GlobalScheduler` implementation that it can use the nonstandard
   * `setImmediate` for scheduling asynchronous tasks without extra
   * delays.
   *
   * @param em is the {@link ExecutionModel} that will be exposed
   * by the resulting `Scheduler` instance.
   */
  constructor(canUseSetImmediate?: boolean, em?: ExecutionModel) {
    super(em)
    // tslint:disable:strict-type-predicates
    this._useSetImmediate = (canUseSetImmediate || false) &&
      (typeof setImmediate === "function")
  }
  /** @inheritdoc */
  execute(runnable: () => void): void {
    const r = safeRunnable(runnable, this.reportFailure)
    if (this._useSetImmediate) setImmediate(r)
    else setTimeout(r)
  }
  /** @inheritdoc */
  reportFailure(e: any): void {
    console.error(e)
  }
  /** @inheritdoc */
  currentTimeMillis(): number {
    return Date.now()
  }
  /** @inheritdoc */
  scheduleOnce(delay: number | Duration, runnable: () => void): Cancelable {
    const r = safeRunnable(runnable, this.reportFailure)
    const ms = Math.max(0, Duration.of(delay).toMillis())
    const task = setTimeout(r, ms)
    return Cancelable.from(() => clearTimeout(task))
  }
  /** @inheritdoc */
  withExecutionModel(em: ExecutionModel) {
    return new GlobalScheduler(this._useSetImmediate, em)
  }
}

/**
 * The `TestScheduler` is a {@link Scheduler} type meant for testing purposes,
 * being capable of simulating asynchronous execution and the passage of time.
 *
 * Example:
 *
 * ```typescript
 * const s = new TestScheduler()
 * ```
 */
export class TestScheduler extends Scheduler {
  private _reporter: (error: any) => void
  private _clock: number
  private _triggeredFailures: Array<any>
  private _tasks: Array<[number, () => void]>
  private _tasksSearch: (search: number) => number

  constructor(em?: ExecutionModel, reporter?: (error: any) => void) {
    super(em)
    this._reporter = reporter || (_ => {})
    this._clock = 0
    this._triggeredFailures = []
    this._updateTasks([])
  }

  /**
   * Returns a list of triggered errors, if any happened during
   * the {@link tick} execution.
   */
  public triggeredFailures(): Array<any> { return this._triggeredFailures }

  /**
   * Returns `true` if there are any tasks left to execute, `false`
   * otherwise.
   */
  public hasTasksLeft(): boolean { return this._tasks.length > 0 }

  /** @inheritdoc */
  public execute(runnable: () => void): void {
    this._tasks.push([this._clock, runnable])
  }

  /** @inheritdoc */
  public reportFailure(e: any): void {
    this._triggeredFailures.push(e)
    this._reporter(e)
  }

  /** @inheritdoc */
  public currentTimeMillis(): number {
    return this._clock
  }

  /** @inheritdoc */
  public scheduleOnce(delay: number | Duration, runnable: () => void): Cancelable {
    const d = Math.max(0, Duration.of(delay).toMillis())
    const scheduleAt = this._clock + d
    const insertAt = this._tasksSearch(-scheduleAt)
    const ref: [number, () => void] = [scheduleAt, runnable]
    this._tasks.splice(insertAt, 0, ref)

    return Cancelable.from(() => {
      const filtered: Array<[number, () => void]> = []
      for (const e of this._tasks) {
        if (e !== ref) filtered.push(e)
      }
      this._updateTasks(filtered)
    })
  }

  /**
   * Executes the current batch of tasks that are pending, relative
   * to the current {@link TestScheduler.clock|clock}.
   *
   * ```typescript
   * const s = new TestScheduler()
   *
   * // Immediate execution
   * s.execute(() => console.log("A"))
   * s.execute(() => console.log("B"))
   * // Delay with 1 second from now
   * s.scheduleOnce(Duration.seconds(1), () => console.log("C"))
   * s.scheduleOnce(Duration.seconds(1), () => console.log("D"))
   * // Delay with 2 seconds from now
   * s.scheduleOnce(Duration.seconds(2), () => console.log("E"))
   * s.scheduleOnce(Duration.seconds(2), () => console.log("F"))
   *
   * // Actual execution...
   *
   * // Prints A, B
   * s.tick()
   * // Prints C, D
   * s.tick(Duration.seconds(1))
   * // Prints E, F
   * s.tick(Duration.seconds(1))
   * ```
   *
   * @param duration is an optional timespan to user for incrementing
   * the current {@link TestScheduler.clock|clock}, thus allowing
   * the execution of tasks scheduled to execute with a delay.
   *
   * @return the number of executed tasks
   */
  public tick(duration?: number | Duration): number {
    let toExecute = []
    let jumpMs = Duration.of(duration || 0).toMillis()
    let executed = 0

    while (true) {
      const peek = this._tasks.length > 0
        ? this._tasks[this._tasks.length - 1]
        : undefined

      if (peek && peek[0] <= this._clock) {
        toExecute.push(this._tasks.pop())
      } else if (toExecute.length > 0) {
        // Executing current batch, randomized
        while (toExecute.length > 0) {
          const index = Math.floor(Math.random() * toExecute.length)
          const elem = toExecute[index]
          if (elem) try {
            toExecute.splice(index, 1)
            elem[1]()
          } catch (e) {
            this.reportFailure(e)
          } finally {
            executed += 1
          }
        }
      } else if (jumpMs > 0) {
        const nextTaskJump = peek && (peek[0] - this._clock) || jumpMs
        const add = Math.min(nextTaskJump, jumpMs)
        this._clock += add
        jumpMs -= add
      } else {
        break
      }
    }
    return executed
  }

  /** @inheritdoc */
  public withExecutionModel(em: ExecutionModel): TestScheduler {
    const newScheduler = new TestScheduler(em)
    newScheduler._updateTasks(this._tasks)
    return newScheduler
  }

  /** @inheritdoc */
  private _updateTasks(tasks: Array<[number, () => void]>) {
    this._tasks = tasks
    this._tasksSearch = arrayBSearchInsertPos(this._tasks, e => -e[0])
  }
}

/**
 * Internal, reusable [[GlobalScheduler]] reference.
 *
 * @Hidden
 */
const globalSchedulerRef = new GlobalScheduler(true)

/**
 * Internal utility wrapper a runner in an implementation that
 * reports errors with the provided `reporter` callback.
 *
 * @Hidden
 */
function safeRunnable(r: () => void, reporter: (error: any) => void): () => void {
  return () => { try { r() } catch (e) { reporter(e) } }
}

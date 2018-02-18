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

import { IEquals, hashCodeOfString, NotImplementedError, Throwable } from "funfix-core"
import { Duration } from "./time"
import { ICancelable, Cancelable, IAssignCancelable, MultiAssignCancelable } from "./cancelable"
import { DynamicRef } from "./ref"
import { arrayBSearchInsertPos, maxPowerOf2, nextPowerOf2 } from "./internals"

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
   *  The {@link ExecutionModel} is a specification of how run-loops
   * and producers should behave in regards to executing tasks
   * either synchronously or asynchronously.
   */
  public readonly executionModel: ExecutionModel

  /**
   * Index of the current cycle, incremented automatically (modulo
   * the batch size) when doing execution by means of
   * {@link Scheduler.executeBatched} and the `Scheduler` is
   * configured with {@link ExecutionModel.batched}.
   *
   * When observed as being zero, it means an async boundary just
   * happened.
   */
  batchIndex: number = 0

  /**
   * @param em the {@link ExecutionModel} to use for
   *        {@link Scheduler.executionModel}, should default to
   *        {@link ExecutionModel.global}
   */
  protected constructor(em: ExecutionModel) {
    this.executionModel = em

    // Building an optimized executeBatched
    switch (em.type) {
      case "alwaysAsync":
        this.executeBatched = this.executeAsync
        break

      case "synchronous":
        this.executeBatched = this.trampoline
        break

      case "batched":
        const modulus = em.recommendedBatchSize - 1

        this.executeBatched = (r) => {
          const next = (this.batchIndex + 1) & modulus
          if (next) {
            this.batchIndex = next
            return this.trampoline(r)
          } else {
            return this.executeAsync(r)
          }
        }
    }
  }

  /**
   * Executes tasks in batches, according to the rules set by the
   * given {@link ExecutionModel}.
   *
   * The rules, depending on the chosen `ExecutionModel`:
   *
   * - if `synchronous`, then all tasks are executed with
   *   {@link Scheduler.trampoline}
   * - if `asynchronous`, then all tasks are executed with
   *   {@link Scheduler.executeAsync}
   * - if `batched(n)`, then `n` tasks will be executed
   *   with `Scheduler.trampoline` and then the next execution
   *   will force an asynchronous boundary by means of
   *   `Scheduler.executeAsync`
   *
   * Thus, in case of batched execution, an internal counter gets
   * incremented to keep track of how many tasks where executed
   * immediately (trampolined), a counter that's reset when reaching
   * the threshold or when an `executeAsync` happens.
   */
  public readonly executeBatched!: (runnable: () => void) => void

  /**
   * Schedules the given `command` for async execution.
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
  public abstract executeAsync(runnable: () => void): void

  /**
   * Execute the given `runnable` on the current call stack by means
   * of a "trampoline", preserving stack safety.
   *
   * This is an alternative to {@link executeAsync} for triggering
   * light asynchronous boundaries.
   */
  public abstract trampoline(runnable: () => void): void

  /** Reports that an asynchronous computation failed. */
  public abstract reportFailure(e: Throwable): void

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
  public abstract scheduleOnce(delay: number | Duration, runnable: () => void): ICancelable

  /**
   * Given a function that will receive the underlying
   * {@link ExecutionModel}, returns a new {@link Scheduler}
   * reference, based on the source that exposes the new
   * `ExecutionModel` value when queried by means of the
   * {@link Scheduler.executionModel} property.
   *
   * This method enables reusing global scheduler references in
   * a local scope, but with a modified execution model to inject.
   *
   * The contract of this method (things you can rely on):
   *
   *  1. the source `Scheduler` must not be modified in any way
   *  2. the implementation should wrap the source efficiently, such
   *     that the result mirrors the implementation of the source
   *     `Scheduler` in every way except for the execution model
   *
   * Sample:
   *
   * ```typescript
   * import { Scheduler, ExecutionModel } from "funfix"
   *
   * const scheduler = Schedule.global()
   *   .withExecutionModel(ExecutionModel.trampolined())
   * ```
   */
  public abstract withExecutionModel(em: ExecutionModel): Scheduler

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
  public scheduleWithFixedDelay(initialDelay: number | Duration, delay: number | Duration, runnable: () => void): ICancelable {
    const loop = (self: Scheduler, ref: IAssignCancelable, delayNow: number | Duration) =>
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
  public scheduleAtFixedRate(initialDelay: number | Duration, period: number | Duration, runnable: () => void): ICancelable {
    const loop = (self: Scheduler, ref: IAssignCancelable, delayNowMs: number, periodMs: number) =>
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
   * Exposes a reusable [[GlobalScheduler]] reference by means of a
   * {@link DynamicRef}, which allows for lexically scoped bindings to happen.
   *
   * ```typescript
   * const myScheduler = new GlobalScheduler(false)
   *
   * Scheduler.global.bind(myScheduler, () => {
   *   Scheduler.global.get() // myScheduler
   * })
   *
   * Scheduler.global.get() // default instance
   * ```
   */
  static readonly global: DynamicRef<Scheduler> =
    DynamicRef.of(() => globalSchedulerRef)
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
export class ExecutionModel implements IEquals<ExecutionModel> {
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
  public readonly recommendedBatchSize!: number

  /**
   * The type of the execution model, which can be:
   *
   * - `batched`: the default, specifying an mixed execution
   *   mode under which tasks are executed synchronously in
   *   batches up to a maximum size; after a batch of
   *   {@link recommendedBatchSize} is executed, the next
   *   execution should be asynchronous.
   * - `synchronous`: specifies that execution should be
   *   synchronous (immediate / trampolined) for as long as
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

  /** Implements `IEquals.equals`. */
  equals(other: ExecutionModel): boolean {
    return this.type === other.type &&
      this.recommendedBatchSize === other.recommendedBatchSize
  }

  /** Implements `IEquals.hashCode`. */
  hashCode(): number {
    return hashCodeOfString(this.type) * 47 + this.recommendedBatchSize
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
  static readonly global: DynamicRef<ExecutionModel> =
    DynamicRef.of(() => ExecutionModel.batched())
}

/**
 * Internal trampoline implementation used for implementing
 * {@link Scheduler.trampoline}.
 *
 * @final
 * @hidden
 */
class Trampoline {
  private readonly _reporter: (e: Throwable) => void
  private readonly _queue: (() => void)[]
  private _isActive: boolean

  constructor(reporter: (e: Throwable) => void) {
    this._isActive = false
    this._queue = []
    this._reporter = reporter
  }

  execute(r: () => void) {
    if (!this._isActive) {
      this.runLoop(r)
    } else {
      this._queue.push(r)
    }
  }

  private runLoop(r: () => void) {
    this._isActive = true
    try {
      let cursor: (() => void) | undefined = r
      while (cursor) {
        try { cursor() } catch (e) { this._reporter(e) }
        cursor = this._queue.pop()
      }
    } finally {
      this._isActive = false
    }
  }
}

/**
 * `GlobalScheduler` is a [[Scheduler]] implementation based on Javascript's
 * [setTimeout]{@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout}
 * and (if available and configured)
 * [setImmediate]{@link https://developer.mozilla.org/en/docs/Web/API/Window/setImmediate}.
 */
export class GlobalScheduler extends Scheduler {
  /**
   * If `true`, then `setImmediate` is used in `execute`.
   */
  private readonly _useSetImmediate: boolean

  /**
   * {@link Trampoline} used for immediate execution in
   * {@link Scheduler.trampoline}.
   */
  private readonly _trampoline: Trampoline

  /**
   * @param canUseSetImmediate is a boolean informing the
   *        `GlobalScheduler` implementation that it can use the
   *        nonstandard `setImmediate` for scheduling asynchronous
   *        tasks without extra delays.
   *
   * @param em the {@link ExecutionModel} to use for
   *        {@link Scheduler.executionModel}, should default to
   *        {@link ExecutionModel.global}
   *
   * @param reporter is the reporter to use for reporting uncaught
   *        errors, defaults to `console.error`
   */
  constructor(
    canUseSetImmediate: boolean = false,
    em: ExecutionModel = ExecutionModel.global.get(),
    reporter?: (e: Throwable) => void) {

    super(em)
    if (reporter) this.reportFailure = reporter
    this._trampoline = new Trampoline(this.reportFailure)
    // tslint:disable:strict-type-predicates
    this._useSetImmediate = (canUseSetImmediate || false) && (typeof setImmediate === "function")

    this.executeAsync = this._useSetImmediate
      ? r => setImmediate(safeRunnable(r, this.reportFailure))
      : r => setTimeout(safeRunnable(r, this.reportFailure))
  }

  /* istanbul ignore next */
  executeAsync(runnable: () => void): void {
    /* istanbul ignore next */
    throw new NotImplementedError("Constructor of GlobalScheduler wasn't executed")
  }

  trampoline(runnable: () => void): void {
    return this._trampoline.execute(runnable)
  }

  /* istanbul ignore next */
  reportFailure(e: Throwable): void {
    console.error(e)
  }

  currentTimeMillis(): number {
    return Date.now()
  }

  scheduleOnce(delay: number | Duration, runnable: () => void): ICancelable {
    const r = () => {
      this.batchIndex = 0
      try { runnable() } catch (e) { this.reportFailure(e) }
    }

    const ms = Math.max(0, Duration.of(delay).toMillis())
    const task = setTimeout(r, ms)
    return Cancelable.of(() => clearTimeout(task))
  }

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
 *
 * s.execute(() => { console.log("Hello, world!") })
 *
 * // Triggers actual execution
 * s.tick()
 *
 * // Simulating delayed execution
 * const task = s.scheduleOnce(Duration.seconds(10), () => {
 *   console.log("Hello, delayed!")
 * })
 *
 * // We can cancel a delayed task if we want
 * task.cancel()
 *
 * // Or we can execute it by moving the internal clock forward in time
 * s.tick(Duration.seconds(10))
 * ```
 */
export class TestScheduler extends Scheduler {
  private _reporter: (error: any) => void
  private _trampoline: Trampoline
  private _stateRef?: TestSchedulerState

  /**
   * @param reporter is an optional function that will be called
   *        whenever {@link Scheduler.reportFailure} is invoked.
   *
   * @param em the {@link ExecutionModel} to use for
   *        the {@link Scheduler.executionModel}, defaults to
   *        `"synchronous"` for `TestScheduler`
   */
  constructor(reporter?: (error: any) => void, em: ExecutionModel = ExecutionModel.synchronous()) {
    super(em)
    this._reporter = reporter || (_ => {})
    this._trampoline = new Trampoline(this.reportFailure.bind(this))
  }

  private _state() {
    if (!this._stateRef) {
      this._stateRef = new TestSchedulerState()
      this._stateRef.updateTasks([])
    }
    return this._stateRef
  }

  /**
   * Returns a list of triggered errors, if any happened during
   * the {@link tick} execution.
   */
  public triggeredFailures(): Array<any> { return this._state().triggeredFailures }

  /**
   * Returns `true` if there are any tasks left to execute, `false`
   * otherwise.
   */
  public hasTasksLeft(): boolean { return this._state().tasks.length > 0 }

  public executeAsync(runnable: () => void): void {
    this._state().tasks.push([this._state().clock, runnable])
  }

  public trampoline(runnable: () => void): void {
    this._trampoline.execute(runnable)
  }

  public reportFailure(e: Throwable): void {
    this._state().triggeredFailures.push(e)
    this._reporter(e)
  }

  public currentTimeMillis(): number {
    return this._state().clock
  }

  public scheduleOnce(delay: number | Duration, runnable: () => void): ICancelable {
    const d = Math.max(0, Duration.of(delay).toMillis())
    const state = this._state()
    const scheduleAt = state.clock + d
    const insertAt = state.tasksSearch(-scheduleAt)
    const ref: [number, () => void] = [scheduleAt, runnable]
    state.tasks.splice(insertAt, 0, ref)

    return Cancelable.of(() => {
      const filtered: Array<[number, () => void]> = []
      for (const e of state.tasks) {
        if (e !== ref) filtered.push(e)
      }
      state.updateTasks(filtered)
    })
  }

  public withExecutionModel(em: ExecutionModel): TestScheduler {
    const ec2 = new TestScheduler(this._reporter, em)
    ec2._stateRef = this._state()
    return ec2
  }

  /**
   * Executes the current batch of tasks that are pending, relative
   * to [currentTimeMillis]{@link TestScheduler.currentTimeMillis}.
   *
   * ```typescript
   * const s = new TestScheduler()
   *
   * // Immediate execution
   * s.executeAsync(() => console.log("A"))
   * s.executeAsync(() => console.log("B"))
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
   * [currentTimeMillis]{@link TestScheduler.currentTimeMillis}, thus allowing
   * the execution of tasks scheduled to execute with a delay.
   *
   * @return the number of executed tasks
   */
  public tick(duration?: number | Duration): number {
    const state = this._state()
    let toExecute = []
    let jumpMs = Duration.of(duration || 0).toMillis()
    let executed = 0

    while (true) {
      const peek = state.tasks.length > 0
        ? state.tasks[state.tasks.length - 1]
        : undefined

      if (peek && peek[0] <= state.clock) {
        toExecute.push(state.tasks.pop())
      } else if (toExecute.length > 0) {
        // Executing current batch, randomized
        while (toExecute.length > 0) {
          const index = Math.floor(Math.random() * toExecute.length)
          const elem = toExecute[index] as any
          try {
            toExecute.splice(index, 1)
            this.batchIndex = 0
            elem[1]()
          } catch (e) {
            this.reportFailure(e)
          } finally {
            executed += 1
          }
        }
      } else if (jumpMs > 0) {
        const nextTaskJump = peek && (peek[0] - state.clock) || jumpMs
        const add = Math.min(nextTaskJump, jumpMs)
        state.clock += add
        jumpMs -= add
      } else {
        break
      }
    }
    return executed
  }

  /**
   * Executes the task that's at the top of the stack, in case we
   * have a task to execute that doesn't require a jump in time.
   *
   * ```typescript
   * const ec = new TestScheduler()
   *
   * ec.execute(() => console.log("A"))
   * ec.execute(() => console.log("B"))
   *
   * // Prints B
   * ec.tickOne()
   * // Prints A
   * ec.tickOne()
   * ```
   */
  public tickOne(): boolean {
    const state = this._state()
    const peek = state.tasks.length > 0
      ? state.tasks[state.tasks.length - 1]
      : undefined

    if (!peek || peek[0] > state.clock) return false
    this._state().tasks.pop()
    this.batchIndex = 0
    try { peek[1]() } catch (e) { this.reportFailure(e) }
    return true
  }
}

class TestSchedulerState {
  public clock: number
  public triggeredFailures: Array<any>
  public tasks!: Array<[number, () => void]>
  public tasksSearch!: (search: number) => number

  constructor() {
    this.clock = 0
    this.triggeredFailures = []
    this.updateTasks([])
  }

  updateTasks(tasks: Array<[number, () => void]>) {
    this.tasks = tasks
    this.tasksSearch = arrayBSearchInsertPos(this.tasks, e => -e[0])
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

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
import { ICancelable, Cancelable, IAssignCancelable, MultiAssignCancelable } from "./cancelable"
import { DynamicRef } from "./ref"
import { arrayBSearchInsertPos } from "./internals"

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
  public abstract scheduleOnce(delay: number | Duration, runnable: () => void): ICancelable

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
 * Internal trampoline implementation used for implementing
 * {@link Scheduler.trampoline}.
 *
 * @final
 * @hidden
 */
class Trampoline {
  private readonly _parent: Scheduler
  private readonly _queue: (() => void)[]
  private _isActive: boolean

  constructor(parent: Scheduler) {
    this._isActive = false
    this._queue = []
    this._parent = parent
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
        try { cursor() } catch (e) { this._parent.reportFailure(e) }
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
  private _useSetImmediate: boolean

  /**
   * {@link Trampoline} used for immediate execution in
   * {@link Scheduler.trampoline}.
   */
  private _trampoline: Trampoline

  /**
   * @param canUseSetImmediate is a boolean informing the
   * `GlobalScheduler` implementation that it can use the nonstandard
   * `setImmediate` for scheduling asynchronous tasks without extra
   * delays.
   */
  constructor(canUseSetImmediate: boolean = false) {
    super()
    this._trampoline = new Trampoline(this)
    // tslint:disable:strict-type-predicates
    this._useSetImmediate = (canUseSetImmediate || false) && (typeof setImmediate === "function")
  }

  executeAsync(runnable: () => void): void {
    const r = safeRunnable(runnable, this.reportFailure)
    if (this._useSetImmediate) setImmediate(r)
    else setTimeout(r)
  }

  trampoline(runnable: () => void): void {
    this._trampoline.execute(runnable)
  }

  reportFailure(e: any): void {
    console.error(e)
  }

  currentTimeMillis(): number {
    return Date.now()
  }

  scheduleOnce(delay: number | Duration, runnable: () => void): ICancelable {
    const r = safeRunnable(runnable, this.reportFailure)
    const ms = Math.max(0, Duration.of(delay).toMillis())
    const task = setTimeout(r, ms)
    return Cancelable.of(() => clearTimeout(task))
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
  private _clock: number
  private _triggeredFailures: Array<any>
  private _tasks: Array<[number, () => void]>
  private _tasksSearch: (search: number) => number
  private _trampoline: Trampoline

  constructor(reporter?: (error: any) => void) {
    super()
    this._reporter = reporter || (_ => {})
    this._clock = 0
    this._triggeredFailures = []
    this._trampoline = new Trampoline(this)
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

  public executeAsync(runnable: () => void): void {
    this._tasks.push([this._clock, runnable])
  }

  public trampoline(runnable: () => void): void {
    this._trampoline.execute(runnable)
  }

  public reportFailure(e: any): void {
    this._triggeredFailures.push(e)
    this._reporter(e)
  }

  public currentTimeMillis(): number {
    return this._clock
  }

  public scheduleOnce(delay: number | Duration, runnable: () => void): ICancelable {
    const d = Math.max(0, Duration.of(delay).toMillis())
    const scheduleAt = this._clock + d
    const insertAt = this._tasksSearch(-scheduleAt)
    const ref: [number, () => void] = [scheduleAt, runnable]
    this._tasks.splice(insertAt, 0, ref)

    return Cancelable.of(() => {
      const filtered: Array<[number, () => void]> = []
      for (const e of this._tasks) {
        if (e !== ref) filtered.push(e)
      }
      this._updateTasks(filtered)
    })
  }

  /**
   * Executes the current batch of tasks that are pending, relative
   * to [currentTimeMillis]{@link TestScheduler.currentTimeMillis}.
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
   * [currentTimeMillis]{@link TestScheduler.currentTimeMillis}, thus allowing
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
          const elem = toExecute[index] as any
          try {
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

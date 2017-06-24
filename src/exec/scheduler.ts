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
   * Returns a reusable [[GlobalScheduler]] reference.
   */
  static global(): GlobalScheduler {
    return globalSchedulerRef
  }
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
   */
  constructor(canUseSetImmediate?: boolean) {
    super()
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

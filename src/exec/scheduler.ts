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

import { Duration } from "./time"
import { Cancelable } from "./cancelable"

export abstract class Scheduler {
  /**
   * Schedules the given `command` for immediate asynchronous
   * execution.
   *
   * The command may execute in a new thread, in a pooled thread, in
   * the calling thread, basically at the discretion of the
   * [[Scheduler]] implementation.
   */
  public abstract execute(runnable: () => void): void

  /** Reports that an asynchronous computation failed. */
  public abstract reportFailure(e: any): void

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
   * @param r is the callback to be executed
   *
   * @return a [[Cancelable]] that can be used to cancel the created
   *         task before execution.
   */
  public abstract scheduleOnce(delay: number | Duration, r: () => void): Cancelable

  public scheduleWithFixedDelay(initialDelay: number | Duration, delay: number | Duration, r: () => void): Cancelable {
    let token: Cancelable = Cancelable.empty()

    this.scheduleOnce(initialDelay, () => {
      r()
      this.scheduleWithFixedDelay(delay, delay, r)
    })

    return Cancelable.from(token.cancel)
  }
}

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
 * Exposes standard, reusable error types, that help with some common scenarios,
 * working with error types being preferable to working with strings.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { IllegalStateError } from "funfix/dist/core/errors"
 * // ... or ...
 * import { IllegalStateError } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module core/errors
 */

/***/

/**
 * A composite error represents a list of errors that were caught
 * while executing logic which delays re-throwing of errors.
 */
export class CompositeError extends Error {
  private errorsRef: Array<any>

  constructor(errors: Array<any>) {
    let reasons = ""
    for (const e of errors.slice(0, 2)) {
      let message = ""
      if (e instanceof Error) {
        message = `${e.name}(${e.message})`
      } else {
        message = `${e}`
      }
      reasons += ", " + message
    }

    reasons = reasons.slice(2)
    if (errors.length > 2) reasons = reasons + ", ..."
    super(reasons)
    this.name = "CompositeError"
    this.errorsRef = errors
  }

  /**
   * Returns the full list of caught errors.
   */
  public errors(): Array<any> { return this.errorsRef.slice() }
}

/**
 * A dummy error that can be used for testing purposes.
 */
export class DummyError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "DummyError"
  }
}

/**
 * Thrown by various accessor methods or partial functions to indicate
 * that the element being requested does not exist.
 */
export class NoSuchElementError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "NoSuchElementError"
  }
}

/**
 * Error throw in class constructors by implementations that
 * are sealed or final.
 */
export class IllegalInheritanceError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "IllegalInheritanceError"
  }
}

/**
 * Signals that a function has been invoked at an illegal
 * or inappropriate time.
 *
 * In other words, environment or application is not in an
 * appropriate state for the requested operation.
 */
export class IllegalStateError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "IllegalStateError"
  }
}

/**
 * Signals that a function has been invoked with illegal
 * arguments.
 */
export class IllegalArgumentError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "IllegalArgumentError"
  }
}

/**
 * Signals that a function or a method is missing an implementation,
 * which should be provided in the future.
 */
export class NotImplementedError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "NotImplementedError"
  }
}

/**
 * Signals that completion of a procedure took longer than anticipated.
 */
export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "TimeoutError"
  }
}

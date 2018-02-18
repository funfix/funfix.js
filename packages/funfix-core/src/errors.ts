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

/**
 * Type alias for errors that can be thrown.
 *
 * Since in JavaScript any object can be thrown, the standard
 * `Error` class (capital `E`) is not useful as a type in signatures,
 * the needed type being effectively `any`, but we still need a type
 * alias for documentation purposes.
 *
 * And since `any` represents an untyped object that bypasses the
 * type system, Funfix is using `Object` for TypeScript and `mixed`
 * for Flow to represent such throwables.
 */
export type Throwable = Error | Object

/**
 * A composite error represents a list of errors that were caught
 * while executing logic which delays re-throwing of errors.
 */
export class CompositeError extends Error {
  private errorsRef: Array<Throwable>

  constructor(errors: Array<Throwable>) {
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

    // Workaround to make `instanceof` work in ES5
    const self = this as any
    self.constructor = CompositeError
    self.__proto__ = CompositeError.prototype
  }

  /**
   * Returns the full list of caught errors.
   */
  public errors(): Array<Throwable> { return this.errorsRef.slice() }
}

/**
 * A dummy error that can be used for testing purposes.
 */
export class DummyError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "DummyError"

    // Workaround to make `instanceof` work in ES5
    const self = this as any
    self.constructor = DummyError
    self.__proto__ = DummyError.prototype
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

    // Workaround to make `instanceof` work in ES5
    const self = this as any
    self.constructor = NoSuchElementError
    self.__proto__ = NoSuchElementError.prototype
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

    // Workaround to make `instanceof` work in ES5
    const self = this as any
    self.constructor = IllegalInheritanceError
    self.__proto__ = IllegalInheritanceError.prototype
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

    // Workaround to make `instanceof` work in ES5
    const self = this as any
    self.constructor = IllegalStateError
    self.__proto__ = IllegalStateError.prototype
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

    // Workaround to make `instanceof` work in ES5
    const self = this as any
    self.constructor = IllegalArgumentError
    self.__proto__ = IllegalArgumentError.prototype
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

    // Workaround to make `instanceof` work in ES5
    const self = this as any
    self.constructor = NotImplementedError
    self.__proto__ = NotImplementedError.prototype
  }
}

/**
 * Signals that completion of a procedure took longer than anticipated.
 */
export class TimeoutError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = "TimeoutError"

    // Workaround to make `instanceof` work in ES5
    const self = this as any
    self.constructor = TimeoutError
    self.__proto__ = TimeoutError.prototype
  }
}

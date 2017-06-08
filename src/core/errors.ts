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
  constructor(message: string) {
    super(message)
    this.name = "DummyError"
  }
}

/**
 * Thrown by various accessor methods or partial functions to indicate
 * that the element being requested does not exist.
 */
export class NoSuchElementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NoSuchElementError"
  }
}

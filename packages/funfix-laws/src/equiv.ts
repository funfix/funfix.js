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
 * Data type for expressing equivalence in type class laws.
 *
 * All laws expressed by this sub-project are expressed in
 * terms of such equivalences.
 *
 * An `Equiv` represents a sentence whose truthiness remains
 * to be proved in testing:
 *
 * ```
 * Equiv.of(a, b) <-> a is equivalent to b
 * ```
 *
 * Note equivalence may or may not imply equality. Some types
 * cannot declare an equality operation (e.g. functions, or
 * `Promise` because it needs asynchronous execution). Equivalence
 * simply means that the left hand value can always be substituted
 * by the right hand value and vice versa, without changing the
 * output of the program (see referential transparency).
 *
 * @final
 */
export class Equiv<A> {
  private constructor(
    public readonly lh: A,
    public readonly rh: A) {}

  static of<A>(lh: A, rh: A): Equiv<A> {
    return new Equiv(lh, rh)
  }
}

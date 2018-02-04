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

import { IllegalArgumentError } from "funfix-core"

/**
 * Given a sorted array, searches for an insert position for a given search
 * element such that, if inserted in the array at the returned position,
 * the array would remain sorted.
 *
 * @Hidden
 */
export function arrayBSearchInsertPos<A>(array: Array<A>, f: (a: A) => number):
  ((search: number) => number) {

  return search => {
    let minIndex = 0
    let maxIndex = array.length - 1

    while (minIndex <= maxIndex) {
      const index = (minIndex + maxIndex) / 2 | 0
      const current = f(array[index])
      const next = index + 1 <= maxIndex ? f(array[index + 1]) : undefined

      if (current <= search && (next === undefined || search < next)) {
        return index + 1
      } else if (current <= search) {
        minIndex = index + 1
      } else { /* if (current > search) */
        maxIndex = index - 1
      }
    }

    return 0
  }
}

/**
 * Internal utility that builds an iterator out of an `Iterable` or an `Array`.
 *
 * @hidden
 */
export function iterableToArray<A>(values: Iterable<A>): A[] {
  if (!values) return []
  if (Object.prototype.toString.call(values) === "[object Array]")
    return values as A[]

  const cursor = values[Symbol.iterator]()
  const arr: A[] = []

  while (true) {
    const item = cursor.next()
    if (item.value) arr.push(item.value)
    if (item.done) return arr
  }
}

/**
 * Natural log of 2.
 * @hidden
 */
export const lnOf2 = Math.log(2)

/**
 * Calculates the base 2 logarithm of the given argument.
 *
 * @hidden
 * @return a number such that 2^nr^ is equal to our argument.
 */
export function log2(x: number): number {
  return Math.log(x) / lnOf2
}

/**
 * The maximum number that can be returned by {@link nextPowerOf2}.
 * @hidden
 */
export const maxPowerOf2: number = 1 << 30

/**
 * Given a positive integer, returns the next power of 2 that is bigger
 * than our argument, or the maximum that this function can
 * return which is 2^30^ (or 1,073,741,824).
 *
 * @return an integer that is a power of 2, that is bigger or
 *        equal with our argument and that is "closest" to it.
 *
 * @hidden
 */
export function nextPowerOf2(nr: number): number {
  if (nr < 0) throw new IllegalArgumentError("nr must be positive")
  const bit = Math.ceil(log2(nr))
  return 1 << (bit > 30 ? 30 : (bit & bit))
}

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
 * Internal utilities used in the Funfix implementation.
 *
 * @module exec/internals
 * @hidden
 */

/***/

/**
 * Given a sorted array, searches for an insert position for a given search
 * element such that, if inserted in the array at the returned position,
 * the array would remain sorted.
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

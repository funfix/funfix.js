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

import { arrayBSearchInsertPos } from "../../src/internals"
import * as jv from "jsverify"
import * as assert from "./asserts"

describe("arrayBSearchInsertPos", () => {
  it("simple middle search, existing elem", () => {
    const array = [1, 2, 3, 4, 5]
    const search = arrayBSearchInsertPos(array, _ => _)

    assert.equal(search(3), 3)
  })

  it("simple middle search, non-existing elem", () => {
    const array = [1, 2, 4, 5]
    const search = arrayBSearchInsertPos(array, _ => _)

    assert.equal(search(3), 2)
  })

  it("start and end position", () => {
    const array = [4, 5, 6, 7, 8]
    const search = arrayBSearchInsertPos(array, _ => _)

    assert.equal(search(9), 5)
    assert.equal(search(1), 0)
  })

  it("is stable", () => {
    const array = [1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3]
    const search = arrayBSearchInsertPos(array, _ => _)
    assert.equal(search(2), 9)
  })

  jv.property("any existing position",
    jv.array(jv.int32),
    array => {
      const sorted = array.sort((a, b) => {
        if (a < b) return -1
        else if (a > b) return 1
        return 0
      })

      const index = sorted.length === 0 ? -1 : Math.floor(Math.random() * sorted.length)
      if (index < 0) return true
      const elem = sorted[index]

      const pos = arrayBSearchInsertPos(sorted, _ => _)(elem)
      return pos > index &&
        (pos === 0 || sorted[pos - 1] <= elem) &&
        (pos >= sorted.length || elem <= sorted[pos])
    })

  jv.property("any existing position + 1",
    jv.array(jv.int32),
    array => {
      const sorted = array.sort((a, b) => {
        if (a < b) return -1
        else if (a > b) return 1
        return 0
      })

      const index = sorted.length === 0 ? -1 : Math.floor(Math.random() * sorted.length)
      if (index < 0) return true
      const elem = sorted[index] + 1

      const pos = arrayBSearchInsertPos(sorted, _ => _)(elem)
      return pos > index &&
        (pos === 0 || sorted[pos - 1] <= elem) &&
        (pos >= sorted.length || elem <= sorted[pos])
    })
})

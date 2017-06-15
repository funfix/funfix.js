/**
 * @license
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

import { hashCode, is } from "../../src/funfix"
import * as jv from "jsverify"
import * as inst from "./instances"
import {equals} from "../../src/core/std";

describe("hashCode", () => {
  jv.property("hashCode(v) == hashCode(v)",
    inst.arbAny,
    v => hashCode(v) === hashCode(v)
  )

  jv.property("hashCode(v1) != hashCode(v2) => v1 != v2",
    jv.string, jv.string,
    (v1, v2) => hashCode(v1) === hashCode(v2) || v1 !== v2
  )

  it("should work for Dates", () => {
    const d = new Date()
    expect(hashCode(d)).toBe(hashCode(d.valueOf()))
  })
})

describe("is / equals", () => {
  jv.property("equals(v, v) == true",
    inst.arbAny,
    v => is(v, v)
  )

  jv.property("equals(v1, v2) == false => v1 != v2",
    inst.arbAny, inst.arbAny,
    (v1, v2) => is(v1, v2) || v1 !== v2
  )

  jv.property("equals(v1, v2) == equals(v2, v1)",
    inst.arbAny, inst.arbAny,
    (v1, v2) => is(v1, v2) === is(v2, v1)
  )

  jv.property("equals(v1, v2) && equals(v2, v3) => equals(v1, v3) (numbers)",
    jv.number, jv.number, jv.number,
    (v1, v2, v3) => is(v1, v2) && is(v2, v3) ? is(v1, v3) : true
  )

  jv.property("equals(v1, v2) && equals(v2, v3) => equals(v1, v3) (strings)",
    jv.string, jv.string, jv.string,
    (v1, v2, v3) => is(v1, v2) && is(v2, v3) ? is(v1, v3) : true
  )

  jv.property("`is` is an alias of `equals`",
    inst.arbAny, inst.arbAny,
    (a, b) => is(a, b) === equals(a, b)
  )

  it("should work for NaN", () => {
    expect(is(NaN, 1)).toBe(false)
    expect(is(1, NaN)).toBe(false)
    expect(is(NaN, NaN)).toBe(true)
  })

  it("should work for Dates", () => {
    const d1 = new Date()
    const d2 = new Date(d1.valueOf())

    expect(d1 === d2).toBe(false)
    expect(is(d1, d2)).toBe(true)
  })

  it("should work for Box(value) with valueOf", () => {
    class Box<A> {
      constructor(value: A) { this.value = value }
      valueOf() { return this.value }
    }

    expect(new Box("value").valueOf()).toBe("value")
    expect(is(new Box(null), new Box(null))).toBe(true)
    expect(is(new Box("value"), new Box("value"))).toBe(true)
    expect(is(new Box("value"), new Box(null))).toBe(false)
    expect(is(new Box(null), new Box("value"))).toBe(false)

    expect(is(new Box(NaN), new Box(1))).toBe(false)
    expect(is(new Box(1), new Box(NaN))).toBe(false)
    expect(is(new Box(NaN), new Box(NaN))).toBe(true)
  })

  it("should work for Box(value) implements IEquals", () => {
    class Box<A> implements IEquals<Box<A>> {
      constructor(value: A) { this.value = value }
      equals(other: Box<A>) { return is(this.value, other.value) }
      hashCode() { return hashCode(this.value) }
    }

    expect(is(new Box(null), new Box(null))).toBe(true)
    expect(is(new Box("value"), new Box("value"))).toBe(true)
    expect(is(new Box("value"), new Box(null))).toBe(false)
    expect(is(new Box(null), new Box("value"))).toBe(false)

    expect(is(new Box(NaN), new Box(1))).toBe(false)
    expect(is(new Box(1), new Box(NaN))).toBe(false)
    expect(is(new Box(NaN), new Box(NaN))).toBe(true)
  })
})

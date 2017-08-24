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

import * as jv from "jsverify"
import * as inst from "./instances"
import * as assert from "assert"

import { IEquals, hashCode, is, equals, id, applyMixins } from "../../src/"

describe("std", () => {
  describe("id", () => {
    jv.property("id always return the same thing",
      inst.arbAny,
      a => is(id(a), a)
    )
  })

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
      assert.equal(hashCode(d), hashCode(d.valueOf()))
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
      assert.ok(!is(NaN, 1))
      assert.ok(!is(1, NaN))
      assert.ok(is(NaN, NaN))
    })

    it("should work for Dates", () => {
      const d1 = new Date()
      const d2 = new Date(d1.valueOf())

      assert.notEqual(d1, d2)
      assert.ok(is(d1, d2))
    })

    it("should work for Box(value) with valueOf", () => {
      class Box<A> {
        constructor(public value: A) {}
        valueOf() { return this.value }
      }

      assert.equal(new Box("value").valueOf(), "value")
      assert.ok(is(new Box(null as any), new Box(null as any)))
      assert.ok(is(new Box("value"), new Box("value")))
      assert.equal(is(new Box("value"), new Box(null as any)), false)
      assert.equal(is(new Box(null as any), new Box("value")), false)

      assert.equal(is(new Box(NaN), new Box(1)), false)
      assert.equal(is(new Box(1), new Box(NaN)), false)
      assert.ok(is(new Box(NaN), new Box(NaN)))
    })

    it("should work for Box(value) implements IEquals", () => {
      class Box<A> implements IEquals<Box<A>> {
        constructor(public value: A) {}
        equals(other: Box<A>) { return is(this.value, other.value) }
        hashCode() { return hashCode(this.value) }
      }

      assert.ok(is(new Box(null as any), new Box(null as any)))
      assert.ok(is(new Box("value"), new Box("value")))
      assert.equal(is(new Box("value"), new Box(null as any)), false)
      assert.equal(is(new Box(null as any), new Box("value")), false)

      assert.equal(is(new Box(NaN), new Box(1)), false)
      assert.equal(is(new Box(1), new Box(NaN)), false)
      assert.ok(is(new Box(NaN), new Box(NaN)))
    })
  })

  describe("applyMixins", () => {
    class Base {
      hello(): string { return "Hello!" }
    }

    class Child1 implements Base {
      hello: () => string
    }

    applyMixins(Child1, [Base])

    class Child2 implements Base {
      hello(): string { return "Override!" }
    }

    applyMixins(Child2, [Base])

    it("provide default implementation", () => {
      const ref = new Child1()
      assert.equal(ref.hello(), "Hello!")
    })

    it("don't override existing implementation", () => {
      const ref = new Child2()
      assert.equal(ref.hello(), "Override!")
    })
  })
})

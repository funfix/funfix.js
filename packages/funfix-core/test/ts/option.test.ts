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
import * as assert from "./asserts"

import { Option, Some, None, Left, Right } from "../../src/"
import { NoSuchElementError } from "../../src/"
import { is, hashCode } from "../../src/"

describe("Option", () => {
  describe("constructor", () => {
    it("of(value) <-> new Option(value, isEmpty=null)", () => {
      const F = Option as any
      assert.equal(new F("value"), Option.some("value"))
      assert.equal(new F(null), Option.none())
      assert.equal(new F(undefined), Option.none())
    })
  })

  describe("#get", () => {
    jv.property("Some(number).get() equals number",
      jv.either(jv.number, jv.constant(null)),
      (n: any) => is(Some(n.valueOf()).get(), n.valueOf())
    )

    jv.property("Some(option).get() equals option",
      inst.arbOpt,
      n => is(Some(n).get(), n)
    )

    it("should throw in case the option is empty", () => {
      const ref = Option.empty<number>()
      try {
        assert.fail(`unexpected ${ref.get()}`)
      } catch (e) {
        assert.ok(e instanceof NoSuchElementError)
      }
    })
  })

  describe("#getOrElse", () => {
    jv.property("equivalence with #get if nonempty",
      inst.arbOptNonempty,
      opt => is(opt.getOrElse(1000), opt.get())
    )

    it("should fallback in case the option is empty", () => {
      assert.equal(Option.empty<number>().getOrElse(100), 100)
      assert.equal(Option.empty<number>().getOrElseL(() => 100), 100)
    })

    it("should not evaluate getOrElseL if nonempty", () => {
      let effect = 10
      const r = Option.of("hello").getOrElseL(() => {
        effect += 20
        return "default"
      })

      assert.equal(effect, 10)
      assert.equal(r, "hello")
    })

    it("can fallback to unrelated type", () => {
      const opt = Option.empty<number>()
      const r1: number | string = opt.getOrElse("fallback")
      assert.equal(r1, "fallback")
      const r2: number | string = opt.getOrElseL(() => "fallback")
      assert.equal(r2, "fallback")
    })
  })

  describe("#orNull", () => {
    jv.property("equivalence with #get if nonempty",
      inst.arbOptNonempty,
      opt => is(opt.orNull(), opt.get())
    )

    it("should return null in case the option is empty", () => {
      assert.equal(Option.empty<number>().orNull(), null)
    })
  })

  describe("#orElse", () => {
    jv.property("mirrors the source if nonempty",
      inst.arbOptNonempty,
      opt => is(opt.orElse(None), opt)
    )

    it("works as a fallback if the source is empty", () => {
      const other = Option.of(1000)
      assert.equal(Option.empty<number>().orElse(other), other)
    })

    it("can fallback to unrelated type", () => {
      const opt = Option.empty<number>()
      const r: Option<number | string> = opt.orElse(Some("fallback"))
      assert.equal(r.get(), "fallback")
    })
  })

  describe("#orElseL", () => {
    jv.property("mirrors the source if nonempty",
      inst.arbOptNonempty,
      opt => is(opt.orElseL(() => None), opt)
    )

    jv.property("works as a fallback if the source is empty",
      inst.arbOpt,
      opt => is(Option.empty<number>().orElseL(() => opt), opt)
    )

    jv.property("doesn't evaluate if the source is non-empty",
      inst.arbOptNonempty,
      opt => {
        let effect = false
        const received = opt.orElseL(() => { effect = true; return None })
        return received === opt
      })

    it("can fallback to unrelated type", () => {
      const opt = Option.empty<number>()
      const r: Option<number | string> = opt.orElseL(() => Some("fallback"))
      assert.equal(r.get(), "fallback")
    })
  })

  describe("#isEmpty, #nonEmpty", () => {
    it("should signal isEmpty=true when empty", () => {
      assert.equal(None.isEmpty(), true)
      assert.equal(None.nonEmpty(), false)
      assert.equal(Option.empty().isEmpty(), true)
      assert.equal(Option.empty().nonEmpty(), false)
    })

    jv.property("should signal nonEmpty when non-empty",
      inst.arbOptNonempty,
      opt => opt.nonEmpty()
    )

    jv.property("should have consistent isEmpty and nonEmpty",
      inst.arbOpt,
      opt => opt.isEmpty() === !opt.nonEmpty()
    )
  })

  describe("#equals and #hashCode", () => {
    jv.property("should yield true for self.equals(self)",
      inst.arbOpt,
      opt => opt.equals(opt)
    )

    jv.property("should yield true for equals(self, self)",
      inst.arbOpt,
      opt => is(opt, opt)
    )

    jv.property("self.hashCode() === self.hashCode() === hashCode(self)",
      inst.arbOpt,
      opt => opt.hashCode() === opt.hashCode() && opt.hashCode() === hashCode(opt)
    )

    jv.property("of(v).hashCode() === of(v).hashCode()",
      jv.number,
      n => Option.of(n).hashCode() === Option.of(n).hashCode()
    )

    it("should do hashCode for none() and some(null)", () => {
      assert.equal(hashCode(Option.none()), 2433880)
      assert.equal(hashCode(Option.some(null)), 2433881 << 2)
    })

    it("should have structural equality", () => {
      const opt1 = Some("hello1")
      const opt2 = Some("hello1")
      const opt3 = Some("hello2")

      assert.ok(opt1 !== opt2)
      assert.equal(opt1, opt2)
      assert.equal(opt2, opt1)

      assert.ok(!opt1.equals(opt3))
      assert.notEqual(opt1, opt3)
      assert.notEqual(opt3, opt1)

      assert.equal(Some(opt1), Some(opt2))
      assert.notEqual(Some(opt1), Some(opt3))
      assert.notEqual(Some(opt1), Some(None))
    })

    jv.property("protects against other ref being null",
      inst.arbOpt,
      fa => fa.equals(null as any) === false
    )
  })

  describe("#map", () => {
    jv.property("pure(n).map(f) === pure(f(n))",
      jv.number, jv.fn(jv.number),
      (n, f) => is(Option.pure(n).map(f), Option.pure(f(n)))
    )

    jv.property("covariant identity",
      inst.arbOpt,
      opt => opt.map(x => x).equals(opt)
    )

    jv.property("covariant composition",
      inst.arbOpt, jv.fn(jv.number), jv.fn(jv.number),
      (opt, f, g) => opt.map(f).map(g).equals(opt.map(x => g(f(x))))
    )

    jv.property("Some(n).map(_ => null) == Some(null)",
      inst.arbOptNonempty,
      opt => is(opt.map(_ => null), Some(null))
    )
  })

  describe("#mapN", () => {
    jv.property("pure(n).mapN(f) === pure(f(n))",
      jv.number, jv.fn(jv.number),
      (n, f) => is(Option.pure(n).mapN(f), Option.pure(f(n)))
    )

    jv.property("covariant identity",
      inst.arbOpt,
      opt => opt.mapN(x => x).equals(opt)
    )

    jv.property("Some(n).mapN(_ => null) == None",
      inst.arbOptNonempty,
      opt => is(opt.mapN(_ => null), None)
    )
  })

  describe("#flatMap", () => {
    jv.property("pure(n).flatMap(f) === f(n)",
      jv.number, jv.fn(inst.arbOpt),
      (n, f) => Option.pure(n).flatMap(f).equals(f(n))
    )

    jv.property("expresses filter",
      jv.number, jv.fn(jv.bool),
      (n, p) => {
        const f = (n: number) => p(n) ? Some(n) : None
        return Option.of(n).flatMap(f).equals(f(n))
      }
    )

    jv.property("express map",
      inst.arbOpt, jv.fn(jv.number),
      (opt, f) => opt.flatMap(n => Some(f(n))).equals(opt.map(f))
    )

    jv.property("left identity",
      jv.number, jv.fn(inst.arbOpt),
      (n, f) => Option.pure(n).flatMap(f).equals(f(n))
    )

    jv.property("right identity",
      inst.arbOpt,
      opt => opt.flatMap(Option.some).equals(opt)
    )

    jv.property("chain is an alias of flatMap",
      inst.arbOpt, jv.fn(inst.arbOpt),
      (opt, f) => is(opt.flatMap(f), opt.chain(f))
    )
  })

  describe("#filter", () => {
    jv.property("opt.filter(x => true) === opt",
      inst.arbOpt,
      opt => opt.filter(x => true) === opt
    )

    jv.property("opt.filter(x => false) === none",
      inst.arbOpt,
      opt => opt.filter(x => false).equals(None)
    )
  })

  describe("#fold", () => {
    it("works for empty", () => {
      const x = Option.empty<number>().fold(() => 10, a => a)
      assert.equal(x, 10)
    })

    it("works for nonempty", () => {
      const x = Some(100).fold(() => 10, a => a)
      assert.equal(x, 100)
    })
  })

  describe("#contains", () => {
    it("works for empty", () => {
      const x = Option.empty<number>().contains(10)
      assert.equal(x, false)
    })

    it("works for primitive", () => {
      assert.ok(Some(10).contains(10))
      assert.ok(!Some(10).contains(20))
    })

    it("works for boxed value", () => {
      assert.ok(Some(Some(10)).contains(Some(10)))
      assert.ok(!Some(Some(10)).contains(Some(20)))
    })
  })

  describe("#exists", () => {
    it("works for empty", () => {
      const x = Option.empty<number>().exists(a => true)
      assert.equal(x, false)
    })

    it("works for nonempty", () => {
      const x1 = Some(10).exists(a => a % 2 === 0)
      assert.equal(x1, true)
      const x2 = Some(10).exists(a => a % 2 !== 0)
      assert.equal(x2, false)
    })
  })

  describe("#forAll", () => {
    it("works for empty", () => {
      const x = Option.empty<number>().forAll(a => true)
      assert.equal(x, true)
    })

    it("works for nonempty", () => {
      const x1 = Some(10).forAll(a => a % 2 === 0)
      assert.equal(x1, true)
      const x2 = Some(10).forAll(a => a % 2 !== 0)
      assert.equal(x2, false)
    })
  })

  describe("#forEach", () => {
    it("works for empty", () => {
      let sum = 0
      Option.empty<number>().forEach(x => sum += x)
      assert.equal(sum, 0)
    })

    it("works for nonempty", () => {
      let sum = 0
      Some(10).forEach(x => sum += x)
      Some(10).forEach(x => sum += x)
      assert.equal(sum, 20)
    })
  })

  describe("pure", () => {
    it("is an alias for some", () => {
      assert.equal(Some(10), Option.pure(10))
    })
  })

  describe("short-hands", () => {
    jv.property("Some(x) == Some(x)",
      jv.either(jv.number, jv.constant(null)),
      (n: any) => is(Some(n.valueOf()), Some(n.valueOf()))
    )

    it("None == None", () => {
      assert.equal(None, None)
    })
  })

  describe("map2, map3, map4, map5, map6", () => {
    jv.property("map2 equivalence with flatMap",
      inst.arbOpt, inst.arbOpt, jv.fn(jv.number),
      (o1, o2, fn) => {
        const f = (...args: any[]) => fn(args)
        return is(Option.map2(o1, o2, f), o1.flatMap(a1 => o2.map(a2 => f(a1, a2))))
      }
    )

    jv.property("map3 equivalence with flatMap",
      inst.arbOpt, inst.arbOpt, inst.arbOpt, jv.fn(jv.number),
      (o1, o2, o3, fn) => {
        const f = (...args: any[]) => fn(args)
        return is(
          Option.map3(o1, o2, o3, f),
          o1.flatMap(a1 => o2.flatMap(a2 => o3.map(a3 => f(a1, a2, a3))))
        )
      }
    )

    jv.property("map4 equivalence with flatMap",
      inst.arbOpt, inst.arbOpt, inst.arbOpt, inst.arbOpt, jv.fn(jv.number),
      (o1, o2, o3, o4, fn) => {
        const f = (...args: any[]) => fn(args)
        return is(
          Option.map4(o1, o2, o3, o4, f),
          o1.flatMap(a1 => o2.flatMap(a2 => o3.flatMap(a3 =>
            o4.map(a4 => f(a1, a2, a3, a4)))))
        )
      }
    )

    jv.property("map5 equivalence with flatMap",
      inst.arbOpt, inst.arbOpt, inst.arbOpt, inst.arbOpt, inst.arbOpt, jv.fn(jv.number),
      (o1, o2, o3, o4, o5, fn) => {
        const f = (...args: any[]) => fn(args)
        return is(
          Option.map5(o1, o2, o3, o4, o5, f),
          o1.flatMap(a1 => o2.flatMap(a2 => o3.flatMap(a3 =>
            o4.flatMap(a4 => o5.map(a5 => f(a1, a2, a3, a4, a5))))))
        )
      }
    )

    jv.property("map6 equivalence with flatMap",
      inst.arbOpt, inst.arbOpt, inst.arbOpt, inst.arbOpt, inst.arbOpt, inst.arbOpt, jv.fn(jv.number),
      (o1, o2, o3, o4, o5, o6, fn) => {
        const f = (...args: any[]) => fn(args)
        return is(
          Option.map6(o1, o2, o3, o4, o5, o6, f),
          o1.flatMap(a1 => o2.flatMap(a2 => o3.flatMap(a3 =>
            o4.flatMap(a4 => o5.flatMap(a5 => o6.map(a6 =>
              f(a1, a2, a3, a4, a5, a6)))))))
        )
      }
    )
  })

  describe("of", () => {
    it("works", () => {
      const str: string | null = "hello"
      const opt: Option<string> = Option.of(str)
      assert.equal(opt, Some("hello"))
    })

    it("type-checks for null", () => {
      const str: string | null = null
      const opt = Option.of(str)
      assert.equal(opt, None)
    })

    it("type-checks for undefined", () => {
      const str: string | undefined = undefined
      const opt = Option.of(str)
      assert.equal(opt, None)
    })
  })

  describe("tailRecM", () => {
    it("is stack safe", () => {
      const fa = Option.tailRecM(0, a => Some(a < 1000 ? Left(a + 1) : Right(a)))
      assert.equal(fa.get(), 1000)
    })

    it("None interrupts the loop", () => {
      const fa = Option.tailRecM(0, a => None)
      assert.equal(fa, None)
    })
  })
})

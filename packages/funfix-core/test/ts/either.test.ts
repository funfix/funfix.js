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
import * as assert from "./asserts"
import * as inst from "./instances"
import { hashCode, is, Left, Right, Either, Option } from "../../src/"

describe("Either", () => {
  describe("Either discrimination", () => {
    jv.property("isRight == !isLeft",
      inst.arbEither,
      e => e.isRight() === !e.isLeft()
    )

    jv.property("isRight => right() does not throw",
      inst.arbEither,
      e => e.isLeft() || e.right().isRight()
    )

    jv.property("isLeft => left() does not throw",
      inst.arbEither,
      e => e.isRight() || e.left().isLeft()
    )

    it("right.left() throws", () => {
      assert.throws(() => Either.right(1).left())
    })

    it("left.right() throws", () => {
      assert.throws(() => Either.left(1).right())
    })
  })

  describe("Either #get", () => {
    it("works for right", () => {
      assert.equal(Right(10).get(), 10)
    })

    it("works for left", () => {
      assert.throws(() => Left(10).get())
    })
  })

  describe("Either #contains", () => {
    jv.property("left.contains(elem) == false",
      inst.arbEither, jv.number,
      (e, b) => e.isRight() || !e.contains(b)
    )

    jv.property("right(e).contains(e) == true",
      inst.arbAny,
      b => Either.right(b).contains(b)
    )
  })

  describe("Either #exists", () => {
    jv.property("left.exists(any) == false",
      inst.arbEither, jv.fn(jv.bool),
      (e, p) => e.isRight() || !e.exists(p)
    )

    jv.property("right.exists(x => true) == true",
      inst.arbEither,
      (e) => e.isLeft() || e.exists(x => true)
    )

    jv.property("right.exists(x => false) == false",
      inst.arbEither,
      e => e.isLeft() || !e.exists(x => false)
    )
  })

  describe("Either #forAll", () => {
    jv.property("left.forAll(x => true) == true",
      inst.arbEither,
      e => e.isRight() || e.forAll(x => true)
    )

    jv.property("left.forAll(x => false) == true",
      inst.arbEither,
      e => e.isRight() || e.forAll(x => false)
    )

    jv.property("right.forAll(x => true) == true",
      inst.arbEither,
      e => e.isLeft() || e.forAll(x => true)
    )

    jv.property("right.forAll(x => false) == false",
      inst.arbEither,
      e => e.isLeft() || !e.forAll(x => false)
    )
  })

  describe("Either #filterOrElse", () => {
    jv.property("right.filterOrElse(x => true, ???) == right",
      inst.arbEither,
      e => e.isLeft() || e.filterOrElse(b => true, () => 0).equals(e)
    )

    jv.property("right.filterOrElse(x => false, zero) == left(zero)",
      inst.arbEither,
      e => e.isLeft() ||
        is(e.filterOrElse(b => false, () => 0), Either.left(0))
    )

    jv.property("left.filterOrElse(any) == left",
      inst.arbEither, jv.fn(jv.bool), jv.number,
      (e, p, z) => e.isRight() || e.filterOrElse(p, () => z).equals(e)
    )
  })

  describe("Either #flatMap", () => {
    jv.property("right(n).flatMap(f) == f(n)",
      jv.number, jv.fn(inst.arbEither),
      (n, f) => Either.right(n).flatMap(f).equals(f(n))
    )

    jv.property("left identity",
      jv.number, jv.fn(inst.arbEither),
      (n, f) => Either.right(n).flatMap(f).equals(f(n))
    )

    jv.property("right identity",
      inst.arbEither,
      opt => opt.flatMap(Either.right).equals(opt)
    )

    jv.property("left.flatMap(f) == left",
      inst.arbEither, jv.fn(inst.arbEither),
      (e, f) => e.isRight() || e.flatMap(f) === e
    )
  })

  describe("Either #map", () => {
    jv.property("right(n).map(f) == right(f(n))",
      jv.number, jv.fn(jv.number),
      (n, f) => is(Either.right(n).map(f), Either.right(f(n)))
    )

    jv.property("covariant identity",
      inst.arbEither,
      opt => opt.map(x => x).equals(opt)
    )

    jv.property("covariant composition",
      inst.arbEither, jv.fn(jv.number), jv.fn(jv.number),
      (opt, f, g) => opt.map(f).map(g).equals(opt.map(x => g(f(x))))
    )
  })

  describe("Either #fold", () => {
    jv.property("right(b).fold(???, f) == f(b)",
      inst.arbAny, jv.fn(inst.arbAny),
      (b, f) => is(Either.right(b).fold(x => x, f), f(b))
    )

    jv.property("left(a).fold(f, ???) == f(a)",
      inst.arbAny, jv.fn(inst.arbAny),
      (a, f) => is(Either.left(a).fold(f, x => x), f(a))
    )
  })

  describe("Either #getOrElse", () => {
    jv.property("right(b).getOrElse(???) == b",
      inst.arbAny,
      b => is(Either.right(b).getOrElse(null), b)
    )

    jv.property("left(a).getOrElse(b) == b",
      inst.arbAny, jv.string,
      (a, b) => is(Either.left(a).getOrElse(b), b)
    )
  })

  describe("Either #getOrElseL", () => {
    jv.property("right(b).getOrElseL(???) == b",
      inst.arbAny,
      b => is(Either.right(b).getOrElseL(() => null), b)
    )

    jv.property("left(a).getOrElseL(() => b) == b",
      inst.arbAny, jv.string,
      (a, b) => {
        const e = Either.left<any, string>(a)
        return is(e.getOrElseL(() => b), b)
      }
    )
  })

  describe("Either #swap", () => {
    jv.property("right(b).swap() == left(b)",
      inst.arbAny,
      b => is(Either.right(b).swap(), Either.left(b))
    )

    jv.property("left(b).swap() == right(b)",
      inst.arbAny,
      b => is(Either.left(b).swap(), Either.right(b))
    )
  })

  describe("Either #toOption", () => {
    jv.property("right(b).toOption == some(b)",
      inst.arbAny,
      b => is(Either.right(b).toOption(), Option.some(b))
    )

    jv.property("left(a).toOption == none()",
      inst.arbAny,
      a => is(Either.left(a).toOption(), Option.none())
    )
  })

  describe("Either #equals", () => {
    jv.property("should yield true for self.equals(self)",
      inst.arbEither,
      opt => opt.equals(opt)
    )

    jv.property("should yield true for equals(self, self)",
      inst.arbEither,
      opt => is(opt, opt)
    )

    jv.property("self.hashCode() === self.hashCode() === hashCode(self)",
      inst.arbEither,
      opt => opt.hashCode() === opt.hashCode() && opt.hashCode() === hashCode(opt)
    )

    jv.property("Either.right(v).hashCode() === Either.right(v).hashCode()",
      jv.number,
      n => Either.right(n).hashCode() === Either.right(n).hashCode()
    )

    jv.property("Either.left(v).hashCode() === Either.left(v).hashCode()",
      jv.number,
      n => Either.left(n).hashCode() === Either.left(n).hashCode()
    )

    it("should have structural equality", () => {
      const opt1 = Either.right("hello1")
      const opt2 = Either.right("hello1")
      const opt3 = Either.right("hello2")

      assert.equal(opt1, opt2)
      assert.equal(opt2, opt1)

      assert.notEqual(opt1, opt3)
      assert.notEqual(opt3, opt1)

      assert.equal(Either.right(opt1), Either.right(opt2))
      assert.notEqual(Either.right(opt1), Either.right(opt3))
      assert.notEqual(Either.right<any,any>(opt1), Either.left(1))
    })

    jv.property("protects against other ref being null",
      inst.arbEither,
      fa => fa.equals(null as any) === false
    )
  })

  describe("Either #forEach", () => {
    it("works for right", () => {
      let effect = 0
      Right(10).forEach(() => effect = 10)
      assert.equal(effect, 10)
    })

    it("does nothing for left", () => {
      let effect = 0
      Left(10).forEach(() => effect = 10)
      assert.equal(effect, 0)
    })
  })

  describe("Either map2, map3, map4, map5, map6", () => {
    jv.property("map2 equivalence with flatMap",
      inst.arbEither, inst.arbEither, jv.fn(jv.number),
      (o1, o2, fn) => {
        const f = (...args: any[]) => fn(args)
        return is(Either.map2(o1, o2, f), o1.flatMap(a1 => o2.map(a2 => f(a1, a2))))
      }
    )

    jv.property("map3 equivalence with flatMap",
      inst.arbEither, inst.arbEither, inst.arbEither, jv.fn(jv.number),
      (o1, o2, o3, fn) => {
        const f = (...args: any[]) => fn(args)
        return is(
          Either.map3(o1, o2, o3, f),
          o1.flatMap(a1 => o2.flatMap(a2 => o3.map(a3 => f(a1, a2, a3))))
        )
      }
    )

    jv.property("map4 equivalence with flatMap",
      inst.arbEither, inst.arbEither, inst.arbEither, inst.arbEither, jv.fn(jv.number),
      (o1, o2, o3, o4, fn) => {
        const f = (...args: any[]) => fn(args)
        return is(
          Either.map4(o1, o2, o3, o4, f),
          o1.flatMap(a1 => o2.flatMap(a2 => o3.flatMap(a3 =>
            o4.map(a4 => f(a1, a2, a3, a4)))))
        )
      }
    )

    jv.property("map5 equivalence with flatMap",
      inst.arbEither, inst.arbEither, inst.arbEither, inst.arbEither, inst.arbEither, jv.fn(jv.number),
      (o1, o2, o3, o4, o5, fn) => {
        const f = (...args: any[]) => fn(args)
        return is(
          Either.map5(o1, o2, o3, o4, o5, f),
          o1.flatMap(a1 => o2.flatMap(a2 => o3.flatMap(a3 =>
            o4.flatMap(a4 => o5.map(a5 => f(a1, a2, a3, a4, a5))))))
        )
      }
    )

    jv.property("map6 equivalence with flatMap",
      inst.arbEither, inst.arbEither, inst.arbEither, inst.arbEither, inst.arbEither, inst.arbEither, jv.fn(jv.number),
      (o1, o2, o3, o4, o5, o6, fn) => {
        const f = (...args: any[]) => fn(args)
        return is(
          Either.map6(o1, o2, o3, o4, o5, o6, f),
          o1.flatMap(a1 => o2.flatMap(a2 => o3.flatMap(a3 =>
            o4.flatMap(a4 => o5.flatMap(a5 => o6.map(a6 =>
              f(a1, a2, a3, a4, a5, a6)))))))
        )
      }
    )
  })

  describe("Either.tailRecM", () => {
    it("is stack safe", () => {
      const fa = Either.tailRecM(0, a => Right(a < 1000 ? Left(a + 1) : Right(a)))
      assert.equal(fa.get(), 1000)
    })

    it("Left interrupts the loop", () => {
      const fa = Either.tailRecM(0, a => Left("value"))
      assert.equal(fa.swap().get(), "value")
    })
  })
})

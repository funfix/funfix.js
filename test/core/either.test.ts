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

import { hashCode, equals } from "../../src/funfix"
import * as jv from "jsverify"
import * as inst from "./instances"
import { Either, Option } from "../../src/funfix"

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
    expect(() => Either.right(1).left())
      .toThrow()
  })

  it("left.right() throws", () => {
    expect(() => Either.left(1).right())
      .toThrow()
  })
})

describe("Either #contains", () => {
  jv.property("left.contains(elem) == false",
    inst.arbEither, jv.string,
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
    (e, p) => e.isLeft() || e.exists(x => true)
  )

  jv.property("right.exists(x => false) == false",
    inst.arbEither,
    (e, p) => e.isLeft() || !e.exists(x => false)
  )
})

describe("Either #forAll", () => {
  jv.property("left.forAll(x => true) == true",
    inst.arbEither,
    (e, p) => e.isRight() || e.forAll(x => true)
  )

  jv.property("left.forAll(x => false) == true",
    inst.arbEither,
    (e, p) => e.isRight() || e.forAll(x => false)
  )

  jv.property("right.forAll(x => true) == true",
    inst.arbEither,
    (e, p) => e.isLeft() || e.forAll(x => true)
  )

  jv.property("right.forAll(x => false) == false",
    inst.arbEither,
    (e, p) => e.isLeft() || !e.forAll(x => false)
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
      equals(e.filterOrElse(b => false, () => 0), Either.left(0))
  )

  jv.property("left.filterOrElse(any) == left",
    inst.arbEither, jv.fn(jv.bool), jv.number,
    (e, p, z) => e.filterOrElse(p, () => z).equals(e)
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
    (n, f) => equals(Either.right(n).map(f), Either.right(f(n)))
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
    (b, f) => equals(Either.right(b).fold(x => x, f), f(b))
  )

  jv.property("left(a).fold(f, ???) == f(a)",
    inst.arbAny, jv.fn(inst.arbAny),
    (a, f) => equals(Either.left(a).fold(f, x => x), f(a))
  )
})

describe("Either #getOrElse", () => {
  jv.property("right(b).getOrElse(???) == b",
    inst.arbAny,
    b => equals(Either.right(b).getOrElse(null), b)
  )

  jv.property("left(a).getOrElse(b) == b",
    inst.arbAny, jv.string,
    (a, b) => equals(Either.left(a).getOrElse(b), b)
  )
})

describe("Either #getOrElseL", () => {
  jv.property("right(b).getOrElseL(???) == b",
    inst.arbAny,
    b => equals(Either.right(b).getOrElse(null), b)
  )

  jv.property("left(a).getOrElseL(() => b) == b",
    inst.arbAny, jv.string,
    (a, b) => equals(Either.left(a).getOrElseL(() => b), b)
  )
})

describe("Either #swap", () => {
  jv.property("right(b).swap() == left(b)",
    inst.arbAny,
    b => equals(Either.right(b).swap(), Either.left(b))
  )

  jv.property("left(b).swap() == right(b)",
    inst.arbAny,
    b => equals(Either.left(b).swap(), Either.right(b))
  )
})

describe("Either #toOption", () => {
  jv.property("right(b).toOption == some(b)",
    inst.arbAny,
    b => equals(Either.right(b).toOption(), Option.some(b))
  )

  jv.property("left(a).toOption == none()",
    inst.arbAny,
    a => equals(Either.left(a).toOption(), Option.none())
  )
})

describe("Either.equals", () => {
  jv.property("should yield true for self.equals(self)",
    inst.arbEither,
    opt => opt.equals(opt)
  )

  jv.property("should yield true for equals(self, self)",
    inst.arbEither,
    opt => equals(opt, opt)
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

    expect(opt1 === opt2).toBe(false)
    expect(equals(opt1, opt2)).toBe(true)
    expect(equals(opt2, opt1)).toBe(true)

    expect(opt1.equals(opt3)).toBe(false)
    expect(equals(opt1, opt3)).toBe(false)
    expect(equals(opt3, opt1)).toBe(false)

    expect(equals(Either.right(opt1), Either.right(opt2))).toBe(true)
    expect(equals(Either.right(opt1), Either.right(opt3))).toBe(false)
    expect(equals(Either.right(opt1), Either.left(1))).toBe(false)
  })
})

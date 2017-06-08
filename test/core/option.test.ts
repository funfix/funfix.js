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

import { Option } from "../../src/funfix"
import { NoSuchElementError } from "../../src/funfix"
import { equals, hashCode } from "../../src/funfix"

import * as jv from "jsverify"
import * as inst from "./instances"

describe("Option#get", () => {
  jv.property("Option.some(number).get() equals number",
    jv.either(jv.number, jv.constant(null)),
    n => equals(Option.some(n.valueOf()).get(), n.valueOf())
  )

  jv.property("Option.some(option).get() equals option",
    inst.arbOpt,
    n => equals(Option.some(n).get(), n)
  )

  it("should throw in case the option is empty", () => {
    const ref = Option.empty<number>()
    try {
      fail(`unexpected ${ref.get()}`)
    } catch (e) {
      expect(e instanceof NoSuchElementError).toBe(true)
    }
  })
})

describe("Option#getOrElse", () => {
  jv.property("equivalence with #get if nonempty",
    inst.arbOptNonempty,
    opt => equals(opt.getOrElse(1000), opt.get())
  )

  it("should fallback in case the option is empty", () => {
    expect(Option.empty<number>().getOrElse(100)).toBe(100)
    expect(Option.empty<number>().getOrElseL(() => 100)).toBe(100)
  })

  it("should not evaluate getOrElseL if nonempty", () => {
    let effect = 10
    const r = Option.of("hello").getOrElseL(() => {
      effect += 20
      return "default"
    })

    expect(effect).toBe(10)
    expect(r).toBe("hello")
  })
})

describe("Option#orNull", () => {
  jv.property("equivalence with #get if nonempty",
    inst.arbOptNonempty,
    opt => equals(opt.orNull(), opt.get())
  )

  it("should return null in case the option is empty", () => {
    expect(Option.empty<number>().orNull()).toBeNull()
  })
})

describe("Option#orElse", () => {
  jv.property("mirrors the source if nonempty",
    inst.arbOptNonempty,
    opt => equals(opt.orElse(Option.none()), opt)
  )

  it("works as a fallback if the source is empty", () => {
    const other = Option.of(1000)
    expect(Option.empty<number>().orElse(other)).toBe(other)
  })
})

describe("Option#orElseL", () => {
  jv.property("mirrors the source if nonempty",
    inst.arbOptNonempty,
    opt => equals(opt.orElseL(() => Option.none()), opt)
  )

  jv.property("works as a fallback if the source is empty",
    inst.arbOpt,
    opt => equals(Option.empty<number>().orElseL(() => opt), opt)
  )

  jv.property("doesn't evaluate if the source is non-empty",
    inst.arbOptNonempty,
    opt => {
      let effect = false
      const received = opt.orElseL(() => { effect = true; return Option.none() })
      return received === opt
    })
})

describe("Option#isEmpty, Option#nonEmpty", () => {
  it("should signal isEmpty=true when empty", () => {
    expect(Option.none().isEmpty()).toBe(true)
    expect(Option.none().nonEmpty()).toBe(false)
    expect(Option.empty().isEmpty()).toBe(true)
    expect(Option.empty().nonEmpty()).toBe(false)
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

describe("Option.equals", () => {
  jv.property("should yield true for self.equals(self)",
    inst.arbOpt,
    opt => opt.equals(opt)
  )

  jv.property("should yield true for equals(self, self)",
    inst.arbOpt,
    opt => equals(opt, opt)
  )

  jv.property("self.hashCode() === self.hashCode() === hashCode(self)",
    inst.arbOpt,
    opt => opt.hashCode() === opt.hashCode() && opt.hashCode() === hashCode(opt)
  )

  jv.property("Option.of(v).hashCode() === Option.of(v).hashCode()",
    jv.number,
    n => Option.of(n).hashCode() === Option.of(n).hashCode()
  )

  it("should have structural equality", () => {
    const opt1 = Option.some("hello1")
    const opt2 = Option.some("hello1")
    const opt3 = Option.some("hello2")

    expect(opt1 === opt2).toBe(false)
    expect(equals(opt1, opt2)).toBe(true)
    expect(equals(opt2, opt1)).toBe(true)

    expect(opt1.equals(opt3)).toBe(false)
    expect(equals(opt1, opt3)).toBe(false)
    expect(equals(opt3, opt1)).toBe(false)

    expect(equals(Option.some(opt1), Option.some(opt2))).toBe(true)
    expect(equals(Option.some(opt1), Option.some(opt3))).toBe(false)
    expect(equals(Option.some(opt1), Option.some(Option.none()))).toBe(false)
  })
})

describe("Option.map", () => {
  jv.property("pure(n).map(f) === pure(f(n))",
    jv.number, jv.fn(jv.number),
    (n, f) => equals(Option.pure(n).map(f), Option.pure(f(n)))
  )

  jv.property("covariant identity",
    inst.arbOpt,
    opt => opt.map(x => x).equals(opt)
  )

  jv.property("covariant composition",
    inst.arbOpt, jv.fn(jv.number), jv.fn(jv.number),
    (opt, f, g) => opt.map(f).map(g).equals(opt.map(x => g(f(x))))
  )
})

describe("Option.flatMap", () => {
  jv.property("pure(n).flatMap(f) === f(n)",
    jv.number, jv.fn(inst.arbOpt),
    (n, f) => Option.pure(n).flatMap(f).equals(f(n))
  )

  jv.property("expresses filter",
    jv.number, jv.fn(jv.bool),
    (n, p) => {
      const f = (n: number) => p(n) ? Option.some(n) : Option.none()
      return Option.of(n).flatMap(f).equals(f(n))
    }
  )

  jv.property("express map",
    inst.arbOpt, jv.fn(jv.number),
    (opt, f) => opt.flatMap(n => Option.some(f(n))).equals(opt.map(f))
  )

  jv.property("left identity",
    jv.number, jv.fn(inst.arbOpt),
    (n, f) => Option.pure(n).flatMap(f).equals(f(n))
  )

  jv.property("right identity",
    inst.arbOpt,
    opt => opt.flatMap(Option.some).equals(opt)
  )
})

describe("Option.filter", () => {
  jv.property("opt.filter(x => true) === opt",
    inst.arbOpt,
    opt => opt.filter(x => true) === opt
  )

  jv.property("opt.filter(x => false) === none",
    inst.arbOpt,
    opt => opt.filter(x => false).equals(Option.none())
  )
})

describe("Option.fold", () => {
  it("works for empty", () => {
    const x = Option.empty<number>().fold(() => 10, a => a)
    expect(x).toBe(10)
  })

  it("works for nonempty", () => {
    const x = Option.some(100).fold(() => 10, a => a)
    expect(x).toBe(100)
  })
})

describe("Option.contains", () => {
  it("works for empty", () => {
    const x = Option.empty<number>().contains(10)
    expect(x).toBe(false)
  })

  it("works for primitive", () => {
    const x1 = Option.some(10).contains(10)
    expect(x1).toBe(true)
    const x2 = Option.some(10).contains(20)
    expect(x2).toBe(false)
  })

  it("works for boxed value", () => {
    const x1 = Option.some(Option.some(10)).contains(Option.some(10))
    expect(x1).toBe(true)
    const x2 = Option.some(Option.some(10)).contains(Option.some(20))
    expect(x2).toBe(false)
  })
})

describe("Option.exists", () => {
  it("works for empty", () => {
    const x = Option.empty<number>().exists(a => true)
    expect(x).toBe(false)
  })

  it("works for nonempty", () => {
    const x1 = Option.some(10).exists(a => a % 2 === 0)
    expect(x1).toBe(true)
    const x2 = Option.some(10).exists(a => a % 2 !== 0)
    expect(x2).toBe(false)
  })
})

describe("Option.forAll", () => {
  it("works for empty", () => {
    const x = Option.empty<number>().forAll(a => true)
    expect(x).toBe(true)
  })

  it("works for nonempty", () => {
    const x1 = Option.some(10).forAll(a => a % 2 === 0)
    expect(x1).toBe(true)
    const x2 = Option.some(10).forAll(a => a % 2 !== 0)
    expect(x2).toBe(false)
  })
})

describe("Option.forEach", () => {
  it("works for empty", () => {
    let sum = 0
    Option.empty<number>().forEach(x => sum += x)
    expect(sum).toBe(0)
  })

  it("works for nonempty", () => {
    let sum = 0
    Option.some(10).forEach(x => sum += x)
    Option.some(10).forEach(x => sum += x)
    expect(sum).toBe(20)
  })
})

describe("Option.pure", () => {
  it("is an alias for some", () => {
    expect(equals(Option.some(10), Option.pure(10))).toBe(true)
  })
})

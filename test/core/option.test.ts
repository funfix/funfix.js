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

import { Option, Some, None } from "../../src/funfix"
import { NoSuchElementError } from "../../src/funfix"
import { is, hashCode } from "../../src/funfix"
import { IllegalInheritanceError } from "../../src/funfix"

import * as jv from "jsverify"
import * as inst from "./instances"

describe("Option's constructor", () => {
  it("should not allow inheritance of Option", () => {
    class Test extends Option<number> {
      constructor() { super(null, false) }
    }

    let error: Error | null = null
    try { new Test() } catch (e) { error = e }

    expect(error).toBeTruthy()
    expect(error).toBeInstanceOf(IllegalInheritanceError)
  })
})

describe("Option#get", () => {
  jv.property("Some(number).get() equals number",
    jv.either(jv.number, jv.constant(null)),
    n => is(Some(n.valueOf()).get(), n.valueOf())
  )

  jv.property("Some(option).get() equals option",
    inst.arbOpt,
    n => is(Some(n).get(), n)
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
    opt => is(opt.getOrElse(1000), opt.get())
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
    opt => is(opt.orNull(), opt.get())
  )

  it("should return null in case the option is empty", () => {
    expect(Option.empty<number>().orNull()).toBeNull()
  })
})

describe("Option#orElse", () => {
  jv.property("mirrors the source if nonempty",
    inst.arbOptNonempty,
    opt => is(opt.orElse(None), opt)
  )

  it("works as a fallback if the source is empty", () => {
    const other = Option.of(1000)
    expect(Option.empty<number>().orElse(other)).toBe(other)
  })
})

describe("Option#orElseL", () => {
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
})

describe("Option#isEmpty, Option#nonEmpty", () => {
  it("should signal isEmpty=true when empty", () => {
    expect(None.isEmpty()).toBe(true)
    expect(None.nonEmpty()).toBe(false)
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

describe("Option #equals", () => {
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

  jv.property("Option.of(v).hashCode() === Option.of(v).hashCode()",
    jv.number,
    n => Option.of(n).hashCode() === Option.of(n).hashCode()
  )

  it("should have structural equality", () => {
    const opt1 = Some("hello1")
    const opt2 = Some("hello1")
    const opt3 = Some("hello2")

    expect(opt1 === opt2).toBe(false)
    expect(is(opt1, opt2)).toBe(true)
    expect(is(opt2, opt1)).toBe(true)

    expect(opt1.equals(opt3)).toBe(false)
    expect(is(opt1, opt3)).toBe(false)
    expect(is(opt3, opt1)).toBe(false)

    expect(is(Some(opt1), Some(opt2))).toBe(true)
    expect(is(Some(opt1), Some(opt3))).toBe(false)
    expect(is(Some(opt1), Some(None))).toBe(false)
  })

  jv.property("protects against other ref being null",
    inst.arbOpt,
    fa => fa.equals(null) === false
  )
})

describe("Option.map", () => {
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

describe("Option.mapN", () => {
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

describe("Option.flatMap", () => {
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

describe("Option.filter", () => {
  jv.property("opt.filter(x => true) === opt",
    inst.arbOpt,
    opt => opt.filter(x => true) === opt
  )

  jv.property("opt.filter(x => false) === none",
    inst.arbOpt,
    opt => opt.filter(x => false).equals(None)
  )
})

describe("Option.fold", () => {
  it("works for empty", () => {
    const x = Option.empty<number>().fold(() => 10, a => a)
    expect(x).toBe(10)
  })

  it("works for nonempty", () => {
    const x = Some(100).fold(() => 10, a => a)
    expect(x).toBe(100)
  })
})

describe("Option.contains", () => {
  it("works for empty", () => {
    const x = Option.empty<number>().contains(10)
    expect(x).toBe(false)
  })

  it("works for primitive", () => {
    const x1 = Some(10).contains(10)
    expect(x1).toBe(true)
    const x2 = Some(10).contains(20)
    expect(x2).toBe(false)
  })

  it("works for boxed value", () => {
    const x1 = Some(Some(10)).contains(Some(10))
    expect(x1).toBe(true)
    const x2 = Some(Some(10)).contains(Some(20))
    expect(x2).toBe(false)
  })
})

describe("Option.exists", () => {
  it("works for empty", () => {
    const x = Option.empty<number>().exists(a => true)
    expect(x).toBe(false)
  })

  it("works for nonempty", () => {
    const x1 = Some(10).exists(a => a % 2 === 0)
    expect(x1).toBe(true)
    const x2 = Some(10).exists(a => a % 2 !== 0)
    expect(x2).toBe(false)
  })
})

describe("Option.forAll", () => {
  it("works for empty", () => {
    const x = Option.empty<number>().forAll(a => true)
    expect(x).toBe(true)
  })

  it("works for nonempty", () => {
    const x1 = Some(10).forAll(a => a % 2 === 0)
    expect(x1).toBe(true)
    const x2 = Some(10).forAll(a => a % 2 !== 0)
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
    Some(10).forEach(x => sum += x)
    Some(10).forEach(x => sum += x)
    expect(sum).toBe(20)
  })
})

describe("Option.pure", () => {
  it("is an alias for some", () => {
    expect(is(Some(10), Option.pure(10))).toBe(true)
  })
})

describe("Option shorthands", () => {
  jv.property("Some(x) == Some(x)",
    jv.either(jv.number, jv.constant(null)),
    n => is(Some(n.value), Some(n.value))
  )

  it("None == None", () => {
    expect(None).toBe(None)
  })
})

describe("Option map2, map3, map4, map5, map6", () => {
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

/*
 * Copyright (c) 2017 by The Funcat Project Developers.
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

import { Option } from "../../src/funcat"
import { NoSuchElementException } from "../../src/funcat"
import { equals } from "../../src/funcat"

describe("Option#get", () => {
  it("returns the enclosed value if nonempty",
    forAllNonEmpty((opt, value) => {
      expect(opt.get()).toBe(value)
    }))

  it("should always return the same value", () => {
    const arr = [1, 2, 3]
    const ref = Option.of(arr)
    expect(ref.get()).toBe(arr)
    expect(ref.get()).toBe(arr)
  })

  it("should throw in case the option is empty", () => {
    const ref = Option.empty<number>()
    try {
      fail(`unexpected ${ref.get()}`)
    } catch (e) {
      expect(e instanceof NoSuchElementException).toBe(true)
    }
  })
})

describe("Option#getOrElse", () => {
  it("should be equivalent with Option#get if nonempty",
    forAllNonEmpty((opt, value) => {
      expect(opt.getOrElse(10000)).toBe(opt.get())
      expect(opt.getOrElseL(() => 10000)).toBe(opt.get())
    }))

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
  it("should behave like Option#get when nonempty",
    forAllNonEmpty((opt, value) => {
      expect(opt.orNull()).toBe(opt.get())
    }))

  it("should return null in case the option is empty", () => {
    expect(Option.empty<number>().orNull()).toBeNull()
  })
})

describe("Option#orElse", () => {
  it("mirrors the source if nonempty",
    forAllNonEmpty((opt, value) => {
      expect(opt.orElse(Option.none())).toBe(opt)
    }))

  it("works as a fallback if the source is empty",
    forAllNonEmpty((opt, value) => {
      expect(Option.empty<number>().orElse(opt)).toBe(opt)
    }))
})

describe("Option#orElseL", () => {
  it("mirrors the source if nonempty",
    forAllNonEmpty((opt, value) => {
      expect(opt.orElseL(() => Option.none())).toBe(opt)
    }))

  it("works as a fallback if the source is empty",
    forAllNonEmpty((opt, value) => {
      expect(Option.empty<number>().orElseL(() => opt)).toBe(opt)
    }))

  it("doesn't evaluate if the source is non-empty",
    forAllNonEmpty((opt, value) => {
      let effect = false
      const received = opt.orElseL(() => { effect = true; return Option.none() })
      expect(received).toBe(opt)
    }))
})

describe("Option#isEmpty, Option#nonEmpty", () => {
  it("should signal isEmpty=true when empty", () => {
    expect(Option.none().isEmpty()).toBe(true)
    expect(Option.none().nonEmpty()).toBe(false)
    expect(Option.empty().isEmpty()).toBe(true)
    expect(Option.empty().nonEmpty()).toBe(false)
  })

  it("should signal nonEmpty when non-empty",
    forAllNonEmpty((opt, v) => {
      expect(opt.nonEmpty()).toBe(true)
    }))

  it("should have consistent isEmpty and nonEmpty",
    forAll((opt, v) => {
      expect(opt.isEmpty()).toBe(!opt.nonEmpty())
    }))
})

describe("Option.equals", () => {
  it("should yield true for self.equals(self)",
    forAll((opt, v) => {
      expect(opt.equals(opt)).toBe(true)
    }))

  it("should yield true for equals(self, self)",
    forAll((opt, v) => {
      expect(equals(opt, opt)).toBe(true)
    }))

  it("should have equal hash codes if equal",
    forAll((opt1, v) => {
      forAll((opt2, v) => {
        expect(equals(opt1, opt2))
          .toBe(opt1.hashCode() === opt2.hashCode())
      })
    }))

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
  it("should work", forAllNonEmpty((opt, v) => {
    expect(opt.map(x => x + 1).get()).toBe(v + 1)
  }))

  it("covariant identity", forAll((opt, v) => {
    expect(opt.map(x => x).equals(opt)).toBe(true)
  }))

  it("covariant composition", forAll((opt, v) => {
    const f = (x: number) => x * 2
    const g = (x: number) => 10 - x
    expect(opt.map(f).map(g).equals(opt.map(x => g(f(x))))).toBe(true)
  }))
})

describe("Option.flatMap", () => {
  it("should work", forAllNonEmpty((opt, v) => {
    expect(opt.flatMap(x => Option.some(x + 1)).get()).toBe(v + 1)
  }))

  it("should filter", forAll((opt, v) => {
    expect(opt.flatMap(x => Option.none()).isEmpty()).toBe(true)
  }))

  it("should express map", forAll((opt, v) => {
    const f = (x: number) => 10 - x
    const o1 = opt.flatMap(x => Option.some(f(x)))
    const o2 = opt.map(f)
    expect(o1.equals(o2)).toBe(true)
  }))

  it("should express filter", forAll((opt, v) => {
    const p = (x: number) => (x % 2 === 0)
    const o1 = opt.flatMap(x => p(x) ? Option.some(x) : Option.none())
    const o2 = opt.filter(p)
    expect(o1.equals(o2)).toBe(true)
  }))

  it("left identity", forAllNonEmpty((opt, v) => {
    const f = (x: number) => (x % 2 === 0 ? Option.none() : Option.some(10 - x))
    expect(opt.flatMap(f).equals(f(v))).toBe(true)
  }))

  it("right identity", forAllNonEmpty((opt, v) => {
    expect(opt.flatMap(Option.some).equals(opt)).toBe(true)
  }))
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
    const x = Option.empty<number>().forEach(x => sum += x)
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

function forAllNonEmpty(f: (o: Option<number | null>, v: number | null) => void): (() => void) {
  return () => {
    f(Option.some(null), null)
    for (let i = -500; i < 500; i++) f(Option.some(i), i)
  }
}

function forAll(f: (o: Option<number | null>, v: number | null) => void): (() => void) {
  return () => {
    forAllNonEmpty(f)()
    f(Option.empty<number>(), null)
  }
}

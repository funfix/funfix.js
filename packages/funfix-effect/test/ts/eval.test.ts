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

import {
  is, id,
  Left,
  Right, DummyError
} from "funfix-core"

import * as jv from "jsverify"
import * as inst from "./instances"
import * as assert from "./asserts"
import { Eval } from "../../src/"

describe("Eval basic data constructors tests", () => {
  it("now(a) should yield value", () => {
    assert.equal(Eval.now("value").get(), "value")
  })

  it("now(a).flatMap(f) works", () => {
    const fa = Eval.now(1).flatMap(a => Eval.now(a + 1))
    assert.equal(fa.get(), 2)
  })

  it("String(now(a))", () => {
    assert.equal(String(Eval.now("value")), 'Eval.now("value")')
  })

  it("once() should do memoization", () => {
    let effect = 0
    const fn1 = Eval.once(() => { effect += 1; return effect })
    assert.equal(effect, 0)

    assert.equal(fn1.get(), 1)
    assert.equal(fn1.get(), 1)

    const fn2 = Eval.once(() => { effect += 1; return effect })

    assert.equal(fn2.get(), 2)
    assert.equal(fn2.get(), 2)
  })

  it("once() should memoize errors too", () => {
    let effect = 0
    const dummy = new DummyError()
    const fn1 = Eval.once(() => { effect += 1; throw effect })

    assert.throws(() => fn1.get())
    assert.equal(effect, 1)
    assert.throws(() => fn1.get())
    assert.equal(effect, 1)
  })

  it("once(a).flatMap(f) works", () => {
    const fa = Eval.once(() => 1).flatMap(a => Eval.once(() => a + 1))
    assert.equal(fa.get(), 2)
  })

  it("String(once(...))", () => {
    assert.equal(String(Eval.once(() => "value")), "Eval.once([thunk])")
  })

  it("always() should execute every time", () => {
    let effect = 0
    const fn = Eval.always(() => { effect += 1; return effect })
    assert.equal(effect, 0)

    assert.equal(fn.get(), 1)
    assert.equal(fn.get(), 2)
    assert.equal(fn.get(), 3)
    assert.equal(fn.get(), 4)
  })

  it("always(a).flatMap(f) works", () => {
    const fa = Eval.always(() => 1).flatMap(a => Eval.always(() => a + 1))
    assert.equal(fa.get(), 2)
  })

  it("String(always(...))", () => {
    assert.equal(String(Eval.always(() => "value")), "Eval.always([thunk])")
  })

  it("suspend() should suspend side effects", () => {
    let effect = 0
    const fn = Eval.suspend(() =>
      Eval.once(() => { effect += 1; return effect }))

    assert.equal(effect, 0)
    assert.equal(fn.get(), 1)
    assert.equal(fn.get(), 2)
    assert.equal(fn.get(), 3)
    assert.equal(fn.get(), 4)
  })

  it("suspend(fa).flatMap(f) works", () => {
    const fa = Eval.suspend(() => Eval.always(() => 1))
      .flatMap(a => Eval.always(() => a + 1))
    assert.equal(fa.get(), 2)
  })

  jv.property("defer is an alias for suspend",
    jv.number, jv.fn(inst.arbEval),
    (n, f) => {
      const thunk = () => f(n)
      return is(Eval.defer(thunk).get(), Eval.suspend(thunk).get())
    }
  )

  it("String(suspend(...))", () => {
    assert.equal(String(Eval.suspend(() => Eval.now("value"))), "Eval.suspend([thunk])")
  })

  it("String(flatMap(...))", () => {
    assert.equal(
      String(Eval.now("value").flatMap(x => Eval.now(x))),
      'Eval#FlatMap(Eval.now("value"), [function])')
  })

  it("Eval.of is alias for always for thunks", () => {
    let effect = 0
    const fa = Eval.of(() => { effect += 1; return effect })

    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 2)
    assert.equal(fa.get(), 3)
    assert.equal(fa.get(), 4)
  })
})

describe("Eval is a monad", () => {
  jv.property("success(n).flatMap(f) <-> f(n) (left identity)",
    jv.number, jv.fn(inst.arbEval),
    (n, f) => is(Eval.pure(n).flatMap(f).get(), f(n).get())
  )

  jv.property("right identity",
    inst.arbEval,
    fa => is(fa.flatMap(Eval.pure).get(), fa.get())
  )

  jv.property("chain is an alias of flatMap",
    inst.arbEval, jv.fn(inst.arbEval),
    (fa, f) => is(fa.flatMap(f).get(), fa.chain(f).get())
  )

  it("flatMap is tail safe", () => {
    function loop(n: number, ref: Eval<number>): Eval<number> {
      return n <= 0 ? ref :
        ref.flatMap(a => loop(n - 1, Eval.now(a + 1)))
    }

    const n = 50000
    assert.equal(loop(n, Eval.now(0)).get(), n)
  })

  jv.property("pure(n).map(f) === pure(f(n))",
    jv.number, jv.fn(jv.number),
    (n, f) => is(Eval.pure(n).map(f).get(), Eval.pure(f(n)).get())
  )

  jv.property("covariant identity",
    inst.arbEval,
    fa => is(fa.map(id).get(), fa.get())
  )

  jv.property("covariant composition",
    inst.arbEval, jv.fn(jv.number), jv.fn(jv.number),
    (fa, f, g) => is(fa.map(f).map(g).get(), fa.map(x => g(f(x))).get())
  )

  it("map is tail safe", () => {
    let n = 10000
    let fa = Eval.now(0)
    for (let i = 0; i < n; i++) fa = fa.map(_ => _ + 1)
    assert.equal(fa.get(), n)
  })

  it("unit", () => {
    const e1 = Eval.unit()
    const e2 = Eval.unit()

    assert.equal(e1, e2)
    assert.equal(e1.get(), undefined)
  })
})

describe("Eval memoization", () => {
  jv.property("memoize mirrors the source for pure functions",
    inst.arbEval,
    fa => is(fa.memoize().get(), fa.get())
  )

  it("now, raise and once returns the same reference on .memoize", () => {
    const fa1 = Eval.now(1)
    assert.equal(fa1.memoize(), fa1)
  })

  it("always().memoize caches successful results", () => {
    let effect = 0
    const source = Eval.always(() => { effect += 1; return effect })
    const fa = source.memoize()

    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 1)
  })

  it("any.flatMap.memoize caches successful results", () => {
    let effect = 0
    const source = Eval.now(1).map(x => { effect += x; return effect })
    const fa = source.memoize()

    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 1)
  })
})

describe("Eval.foreach and foreachL", () => {
  jv.property("forEach works for successful results",
    inst.arbEval,
    fa => {
      let effect = 0
      fa.forEach(a => { effect = a })
      return effect === fa.get()
    }
  )
})

describe("Eval.tailRecM", () => {
  it("is stack safe", () => {
    const fa = Eval.tailRecM(0, a => Eval.now(a < 1000 ? Left(a + 1) : Right(a)))
    assert.equal(fa.get(), 1000)
  })
})

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
  Try,
  Success,
  Failure,
  Left,
  Right,
  DummyError,
  IllegalStateError
} from "funfix-core"

import * as jv from "jsverify"
import * as inst from "./instances"
import * as assert from "./asserts"
import { Eval } from "../../src/"

describe("Eval basic data constructors tests", () => {
  it("sealed class",() => {
    class Another extends Eval<number> {}
    const err = Try.of(() => new Another().get()).failed().get()
    assert.ok(err instanceof IllegalStateError, "err instanceof IllegalStateError")
  })

  it("now(a) should yield value", () => {
    assert.equal(Eval.now("value").get(), "value")
    assert.ok(is(Eval.now("value").run(), Success("value")))
  })

  it("now(a).flatMap(f) works", () => {
    const fa = Eval.now(1).flatMap(a => Eval.now(a + 1))
    assert.equal(fa.get(), 2)
  })

  it("now(a).transform(f) works", () => {
    const fa = Eval.now(1).transform(_ => { throw _ }, a => a + 1)
    assert.equal(fa.get(), 2)
  })

  it("now(a).transformWith(f) works", () => {
    const fa = Eval.now(1).transformWith(
      err => Eval.raise(err),
      a => Eval.now(a + 1)
    )
    assert.equal(fa.get(), 2)
  })

  it("String(now(a))", () => {
    assert.equal(String(Eval.now("value")), 'Eval.now("value")')
  })

  it("raise(err) should trigger failure", () => {
    assert.throws(() => Eval.raise("error").get())
    assert.ok(is(Eval.raise("error").run(), Failure("error")))
  })

  it("raise(err).flatMap(f) works", () => {
    const fe: Eval<number> = Eval.raise("error")
    const fa = fe.flatMap(a => Eval.now(a + 1))
    assert.ok(is(fa.run(), Failure("error")))
  })

  it("raise(err).transform(f) works", () => {
    const fa = (Eval.raise("error") as Eval<number>).transform(
      _ => 100,
      a => a + 1
    )
    assert.equal(fa.get(), 100)
  })

  it("raise(err).transformWith(f) works", () => {
    const fa = (Eval.raise("error") as Eval<number>).transformWith(
      _ => Eval.always(() => 100),
      a => Eval.now(a + 1)
    )
    assert.equal(fa.get(), 100)
  })

  it("String(raise(error))", () => {
    assert.equal(String(Eval.raise("error")), 'Eval.raise("error")')
  })

  it("once() should do memoization", () => {
    let effect = 0
    const fn1 = Eval.once(() => { effect += 1; return effect })
    assert.equal(effect, 0)

    assert.equal(fn1.get(), 1)
    assert.equal(fn1.get(), 1)

    const fn2 = Eval.once(() => { effect += 1; return effect })

    assert.ok(is(fn2.run(), Success(2)))
    assert.ok(is(fn2.run(), Success(2)))
  })

  it("once(a).flatMap(f) works", () => {
    const fa = Eval.once(() => 1).flatMap(a => Eval.once(() => a + 1))
    assert.equal(fa.get(), 2)
  })

  it("once(a).transformWith(f,g) works", () => {
    const fa = Eval.once(() => 1).transformWith(
      err => Eval.raise(err),
      a => Eval.once(() => a + 1)
    )
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
    assert.ok(is(fn.run(), Success(3)))
    assert.ok(is(fn.run(), Success(4)))
  })

  it("always(a).flatMap(f) works", () => {
    const fa = Eval.always(() => 1).flatMap(a => Eval.always(() => a + 1))
    assert.equal(fa.get(), 2)
  })

  it("always(a).transformWith(f,g) works", () => {
    const fa = Eval.always(() => 1).transformWith(
      err => Eval.raise(err),
      a => Eval.always(() => a + 1)
    )
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
    assert.ok(is(fn.run(), Success(3)))
    assert.ok(is(fn.run(), Success(4)))
  })

  it("suspend(fa).flatMap(f) works", () => {
    const fa = Eval.suspend(() => Eval.always(() => 1))
      .flatMap(a => Eval.always(() => a + 1))
    assert.equal(fa.get(), 2)
  })

  it("suspend(fa).transformWith(f,g) works", () => {
    const fa = Eval.suspend(() => Eval.always(() => 1)).transformWith(
      Eval.raise,
      a => Eval.always(() => a + 1)
    )
    assert.equal(fa.get(), 2)
  })

  jv.property("defer is an alias for suspend",
    jv.number, jv.fn(inst.arbEval),
    (n, f) => {
      const thunk = () => f(n)
      return is(Eval.defer(thunk).run(), Eval.suspend(thunk).run())
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

describe("Eval error handling", () => {
  it("attempt for success", () => {
    assert.equal(Eval.pure(10).attempt().get(), Right(10))
  })

  it("attempt for failure", () => {
    const dummy = new DummyError("error")
    assert.equal(Eval.raise(dummy).attempt().get(), Left(dummy))
  })

  it("flatMap() protects against user error", () => {
    const dummy = new DummyError("dummy")
    const r = Eval.now(1).flatMap(a => { throw dummy }).run()
    assert.ok(is(r, Failure(dummy)))
  })

  it("flatMap() error can recover, test #1", () => {
    const dummy = new DummyError("dummy")
    const r = Eval.now(1)
      .flatMap<number>(a => { throw dummy })
      .recover(e => { if (e === dummy) return 100; else throw e })
      .flatMap(a => Eval.now(a + 1))
      .run()

    assert.equal(r.get(), 101)
  })

  it("flatMap() error can recover, test #2", () => {
    const dummy = new DummyError("dummy")
    const r = Eval.now(1)
      .flatMap<number>(a => { throw dummy })
      .flatMap(a => Eval.now(a + 1))
      .recover(e => { if (e === dummy) return 100; else throw e })
      .flatMap(a => Eval.now(a + 1))
      .run()

    assert.equal(r.get(), 101)
  })

  it("always() protects against user code", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.always<number>(() => { throw dummy })
    assert.ok(is(fa.run(), Failure(dummy)))
  })

  it("always() can recover", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.always<number>(() => { throw dummy }).recover(_ => 100)
    assert.ok(is(fa.run(), Success(100)))
  })

  it("once() protects against user code", () => {
    let effect = 0
    const dummy = new DummyError("dummy")
    const fa = Eval.once<number>(() => { effect += 1; throw dummy })

    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 1)
    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 1)
  })

  it("once() can recover", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.once<number>(() => { throw dummy }).recover(_ => 100)
    assert.ok(is(fa.run(), Success(100)))
  })

  it("suspend() protects against user code", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.suspend<number>(() => { throw dummy })
    assert.ok(is(fa.run(), Failure(dummy)))
  })

  it("suspend() can recover", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.suspend<number>(() => { throw dummy }).recover(_ => 100)
    assert.ok(is(fa.run(), Success(100)))
  })

  it("transform protects against user code on success", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.now(100).transform<number>(e => { throw e }, _ => { throw dummy })
    assert.ok(is(fa.run(), Failure(dummy)))
  })

  it("transform protects against user code on failure", () => {
    const dummy1 = new DummyError("dummy1")
    const dummy2 = new DummyError("dummy2")

    const fa = Eval.raise(dummy1).transformWith<number>(_ => { throw dummy2 }, id)
    assert.ok(is(fa.run(), Failure(dummy2)))
  })

  it("transformWith protects against user code on success", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.now(100).transformWith<number>(Eval.raise, _ => { throw dummy })
    assert.ok(is(fa.run(), Failure(dummy)))
  })

  it("transformWith protects against user code on failure", () => {
    const dummy1 = new DummyError("dummy1")
    const dummy2 = new DummyError("dummy2")

    const fa = Eval.raise(dummy1).transformWith<number>(_ => { throw dummy2 }, Eval.now)
    assert.ok(is(fa.run(), Failure(dummy2)))
  })

  jv.property("getOrElse() mirrors the source on success",
    inst.arbEval,
    fa => {
      const ref = fa.recover(_ => 0)
      return is(ref.getOrElse(10000), ref.get())
    })

  it("getOrElse() returns the fallback on failure", () => {
    const fa: Eval<number> = Eval.raise("error")
    assert.equal(fa.getOrElse(100), 100)
  })

  jv.property("getOrElseL() mirrors the source on success",
    inst.arbEval,
    fa => {
      const ref = fa.recover(_ => 0)
      return is(ref.getOrElseL(() => 10000), ref.get())
    })

  it("getOrElseL() returns the fallback on failure", () => {
    const fa: Eval<number> = Eval.raise("error")
    assert.equal(fa.getOrElseL(() => 100), 100)
  })
})

describe("Eval is a monad", () => {
  jv.property("success(n).flatMap(f) <-> f(n) (left identity)",
    jv.number, jv.fn(inst.arbEval),
    (n, f) => is(Eval.pure(n).flatMap(f).get(), f(n).get())
  )

  jv.property("right identity",
    inst.arbEval,
    fa => is(fa.flatMap(Eval.pure).run(), fa.run())
  )

  jv.property("failure.flatMap(f) == failure",
    jv.fn(inst.arbEval),
    f => is(Eval.raise("error").flatMap(f).run(), Failure("error"))
  )

  jv.property("chain is an alias of flatMap",
    inst.arbEval, jv.fn(inst.arbEval),
    (fa, f) => is(fa.flatMap(f).run(), fa.chain(f).run())
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
    (n, f) => is(Eval.pure(n).map(f).run(), Eval.pure(f(n)).run())
  )

  jv.property("covariant identity",
    inst.arbEval,
    fa => is(fa.map(id).run(), fa.run())
  )

  jv.property("covariant composition",
    inst.arbEval, jv.fn(jv.number), jv.fn(jv.number),
    (fa, f, g) => is(fa.map(f).map(g).run(), fa.map(x => g(f(x))).run())
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
    assert.equal(e1.run().get(), undefined)
  })
})

describe("Eval memoization", () => {
  jv.property("memoize mirrors the source for pure functions",
    inst.arbEval,
    fa => is(fa.memoize().run(), fa.run())
  )

  jv.property("memoizeOnSuccess mirrors the source for pure functions",
    inst.arbEval,
    fa => is(fa.memoizeOnSuccess().run(), fa.run())
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

  it("always().memoize caches failures", () => {
    const dummy = new DummyError("dummy")
    let effect = 0
    const source = Eval.always(() => { effect += 1; throw dummy })
    const fa = source.memoize()

    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 1)
    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 1)
  })

  it("any.flatMap.memoize caches successful results", () => {
    let effect = 0
    const source = Eval.now(1).map(x => { effect += x; return effect })
    const fa = source.memoize()

    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 1)
  })

  it("any.flatMap.memoize caches failures", () => {
    const dummy = new DummyError("dummy")
    let effect = 0
    const source = Eval.now(1).flatMap(x => { effect += x; throw dummy })
    const fa = source.memoize()

    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 1)
    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 1)
  })

  // ---
  it("now, raise and once returns the same reference on .memoizeOnSuccess", () => {
    const fa1 = Eval.now(1)
    assert.equal(fa1.memoizeOnSuccess(), fa1)
  })

  it("always().memoizeOnSuccess caches successful results", () => {
    let effect = 0
    const source = Eval.always(() => { effect += 1; return effect })
    const fa = source.memoizeOnSuccess()

    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 1)
  })

  it("always().memoizeOnSuccess does not cache failures", () => {
    const dummy = new DummyError("dummy")
    let effect = 0
    const source = Eval.always(() => { effect += 1; throw dummy })
    const fa = source.memoizeOnSuccess()

    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 1)
    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 2)
    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 3)
  })

  it("any.flatMap.memoizeOnSuccess caches successful results", () => {
    let effect = 0
    const source = Eval.now(1).map(x => { effect += x; return effect })
    const fa = source.memoizeOnSuccess()

    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 1)
    assert.equal(fa.get(), 1)
  })

  it("any.flatMap.memoizeOnSuccess caches failures", () => {
    const dummy = new DummyError("dummy")
    let effect = 0
    const source = Eval.now(1).flatMap(x => { effect += x; throw dummy })
    const fa = source.memoizeOnSuccess()

    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 1)
    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 2)
    assert.ok(is(fa.run(), Failure(dummy)))
    assert.equal(effect, 3)
  })
})

describe("Eval.foreach and foreachL", () => {
  jv.property("forEach works for successful results",
    inst.arbEval,
    arbEval => {
      let effect = 0
      const fa = arbEval.recover(_ => 0)
      fa.forEach(a => { effect = a })
      return effect === fa.get()
    }
  )

  it("forEach throws exception for failures", () => {
    const fa: Eval<number> = Eval.raise("dummy")
    assert.throws(() => fa.forEach(a => {}))
  })
})

describe("Eval.tailRecM", () => {
  it("is stack safe", () => {
    const fa = Eval.tailRecM(0, a => Eval.now(a < 1000 ? Left(a + 1) : Right(a)))
    assert.equal(fa.get(), 1000)
  })

  it("returns the failure unchanged", () => {
    const fa = Eval.tailRecM(0, a => Eval.raise("failure"))
    assert.equal(fa.run().failed().get(), "failure")
  })

  it("protects against user errors", () => {
    // tslint:disable:no-string-throw
    const fa = Eval.tailRecM(0, a => { throw "dummy" })
    assert.equal(fa.run().failed().get(), "dummy")
  })
})


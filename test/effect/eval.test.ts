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
  Eval,
  Success,
  Failure,
  DummyError
} from "../../src/funfix"

import * as jv from "jsverify"
import * as inst from "../instances"

describe("Eval basic data constructors tests", () => {
  test("now(a) should yield value", () => {
    expect(Eval.now("value").get()).toBe("value")
    expect(is(Eval.now("value").run(), Success("value"))).toBe(true)
  })

  test("now(a).flatMap(f) works", () => {
    const fa = Eval.now(1).flatMap(a => Eval.now(a + 1))
    expect(fa.get()).toBe(2)
  })

  test("now(a).transform(f) works", () => {
    const fa = Eval.now(1).transform(_ => { throw _ }, a => a + 1)
    expect(fa.get()).toBe(2)
  })

  test("now(a).transformWith(f) works", () => {
    const fa = Eval.now(1).transformWith(
      err => Eval.raise(err),
      a => Eval.now(a + 1)
    )
    expect(fa.get()).toBe(2)
  })

  test("String(now(a))", () => {
    expect(String(Eval.now("value"))).toBe('Eval.now("value")')
  })

  test("raise(err) should trigger failure", () => {
    expect(() => Eval.raise("error").get()).toThrowError("error")
    expect(is(Eval.raise("error").run(), Failure("error"))).toBe(true)
  })

  test("raise(err).flatMap(f) works", () => {
    const fe: Eval<number> = Eval.raise("error")
    const fa = fe.flatMap(a => Eval.now(a + 1))
    expect(is(fa.run(), Failure("error"))).toBe(true)
  })

  test("raise(err).transform(f) works", () => {
    const fa = (Eval.raise("error") as Eval<number>).transform(
      _ => 100,
      a => a + 1
    )
    expect(fa.get()).toBe(100)
  })

  test("raise(err).transformWith(f) works", () => {
    const fa = (Eval.raise("error") as Eval<number>).transformWith(
      _ => Eval.always(() => 100),
      a => Eval.now(a + 1)
    )
    expect(fa.get()).toBe(100)
  })

  test("String(raise(error))", () => {
    expect(String(Eval.raise("error"))).toBe('Eval.raise("error")')
  })

  test("once() should do memoization", () => {
    let effect = 0
    const fn1 = Eval.once(() => { effect += 1; return effect })
    expect(effect).toBe(0)

    expect(fn1.get()).toBe(1)
    expect(fn1.get()).toBe(1)

    const fn2 = Eval.once(() => { effect += 1; return effect })

    expect(is(fn2.run(), Success(2))).toBe(true)
    expect(is(fn2.run(), Success(2))).toBe(true)
  })

  test("once(a).flatMap(f) works", () => {
    const fa = Eval.once(() => 1).flatMap(a => Eval.once(() => a + 1))
    expect(fa.get()).toBe(2)
  })

  test("once(a).transformWith(f,g) works", () => {
    const fa = Eval.once(() => 1).transformWith(
      err => Eval.raise(err),
      a => Eval.once(() => a + 1)
    )
    expect(fa.get()).toBe(2)
  })

  test("String(once(...))", () => {
    expect(String(Eval.once(() => "value"))).toBe("Eval.once([thunk])")
  })

  test("always() should execute every time", () => {
    let effect = 0
    const fn = Eval.always(() => { effect += 1; return effect })
    expect(effect).toBe(0)

    expect(fn.get()).toBe(1)
    expect(fn.get()).toBe(2)
    expect(is(fn.run(), Success(3))).toBe(true)
    expect(is(fn.run(), Success(4))).toBe(true)
  })

  test("always(a).flatMap(f) works", () => {
    const fa = Eval.always(() => 1).flatMap(a => Eval.always(() => a + 1))
    expect(fa.get()).toBe(2)
  })

  test("always(a).transformWith(f,g) works", () => {
    const fa = Eval.always(() => 1).transformWith(
      err => Eval.raise(err),
      a => Eval.always(() => a + 1)
    )
    expect(fa.get()).toBe(2)
  })

  test("String(always(...))", () => {
    expect(String(Eval.always(() => "value"))).toBe("Eval.always([thunk])")
  })

  test("suspend() should suspend side effects", () => {
    let effect = 0
    const fn = Eval.suspend(() =>
      Eval.once(() => { effect += 1; return effect }))

    expect(effect).toBe(0)
    expect(fn.get()).toBe(1)
    expect(fn.get()).toBe(2)
    expect(is(fn.run(), Success(3))).toBe(true)
    expect(is(fn.run(), Success(4))).toBe(true)
  })

  test("suspend(fa).flatMap(f) works", () => {
    const fa = Eval.suspend(() => Eval.always(() => 1))
      .flatMap(a => Eval.always(() => a + 1))
    expect(fa.get()).toBe(2)
  })

  test("suspend(fa).transformWith(f,g) works", () => {
    const fa = Eval.suspend(() => Eval.always(() => 1)).transformWith(
      Eval.raise,
      a => Eval.always(() => a + 1)
    )
    expect(fa.get()).toBe(2)
  })

  jv.property("defer is an alias for suspend",
    jv.number, jv.fn(inst.arbEval),
    (n, f) => {
      const thunk = () => f(n)
      return is(Eval.defer(thunk).run(), Eval.suspend(thunk).run())
    }
  )

  test("String(suspend(...))", () => {
    expect(String(Eval.suspend(() => Eval.now("value")))).toBe("Eval.suspend([thunk])")
  })

  test("String(flatMap(...))", () => {
    expect(String(Eval.now("value").flatMap(id)))
      .toBe('Eval#FlatMap(Eval.now("value"), [function])')
  })

  test("Eval.of is alias for always", () => {
    let effect = 0
    const fa = Eval.of(() => { effect += 1; return effect })

    expect(fa.get()).toBe(1)
    expect(fa.get()).toBe(2)
    expect(fa.get()).toBe(3)
    expect(fa.get()).toBe(4)
  })
})

describe("Eval error handling", () => {
  test("flatMap() protects against user error", () => {
    const dummy = new DummyError("dummy")
    const r = Eval.now(1).flatMap(a => { throw dummy }).run()
    expect(is(r, Failure(dummy))).toBe(true)
  })

  test("flatMap() error can recover, test #1", () => {
    const dummy = new DummyError("dummy")
    const r = Eval.now(1)
      .flatMap<number>(a => { throw dummy })
      .recover(e => { if (e === dummy) return 100; else throw e })
      .flatMap(a => Eval.now(a + 1))
      .run()

    expect(r.get()).toBe(101)
  })

  test("flatMap() error can recover, test #2", () => {
    const dummy = new DummyError("dummy")
    const r = Eval.now(1)
      .flatMap<number>(a => { throw dummy })
      .flatMap(a => Eval.now(a + 1))
      .recover(e => { if (e === dummy) return 100; else throw e })
      .flatMap(a => Eval.now(a + 1))
      .run()

    expect(r.get()).toBe(101)
  })

  test("always() protects against user code", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.always<number>(() => { throw dummy })
    expect(is(fa.run(), Failure(dummy))).toBe(true)
  })

  test("always() can recover", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.always<number>(() => { throw dummy }).recover(_ => 100)
    expect(is(fa.run(), Success(100))).toBe(true)
  })

  test("once() protects against user code", () => {
    let effect = 0
    const dummy = new DummyError("dummy")
    const fa = Eval.once<number>(() => { effect += 1; throw dummy })

    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(1)
    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(1)
  })

  test("once() can recover", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.once<number>(() => { throw dummy }).recover(_ => 100)
    expect(is(fa.run(), Success(100))).toBe(true)
  })

  test("suspend() protects against user code", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.suspend<number>(() => { throw dummy })
    expect(is(fa.run(), Failure(dummy))).toBe(true)
  })

  test("suspend() can recover", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.suspend<number>(() => { throw dummy }).recover(_ => 100)
    expect(is(fa.run(), Success(100))).toBe(true)
  })

  test("transform protects against user code on success", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.now(100).transform<number>(e => { throw e }, _ => { throw dummy })
    expect(is(fa.run(), Failure(dummy))).toBe(true)
  })

  test("transform protects against user code on failure", () => {
    const dummy1 = new DummyError("dummy1")
    const dummy2 = new DummyError("dummy2")

    const fa = Eval.raise(dummy1).transformWith<number>(_ => { throw dummy2 }, id)
    expect(is(fa.run(), Failure(dummy2))).toBe(true)
  })

  test("transformWith protects against user code on success", () => {
    const dummy = new DummyError("dummy")
    const fa = Eval.now(100).transformWith<number>(Eval.raise, _ => { throw dummy })
    expect(is(fa.run(), Failure(dummy))).toBe(true)
  })

  test("transformWith protects against user code on failure", () => {
    const dummy1 = new DummyError("dummy1")
    const dummy2 = new DummyError("dummy2")

    const fa = Eval.raise(dummy1).transformWith<number>(_ => { throw dummy2 }, Eval.now)
    expect(is(fa.run(), Failure(dummy2))).toBe(true)
  })

  jv.property("getOrElse() mirrors the source on success",
    inst.arbEval,
    fa => {
      const ref = fa.recover(_ => 0)
      return is(ref.getOrElse(10000), ref.get())
    })

  test("getOrElse() returns the fallback on failure", () => {
    const fa: Eval<number> = Eval.raise("error")
    expect(fa.getOrElse(100)).toBe(100)
  })

  jv.property("getOrElseL() mirrors the source on success",
    inst.arbEval,
    fa => {
      const ref = fa.recover(_ => 0)
      return is(ref.getOrElseL(() => 10000), ref.get())
    })

  test("getOrElseL() returns the fallback on failure", () => {
    const fa: Eval<number> = Eval.raise("error")
    expect(fa.getOrElseL(() => 100)).toBe(100)
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

  test("flatMap is tail safe", () => {
    function loop(n: number, ref: Eval<number>): Eval<number> {
      return n <= 0 ? ref :
        ref.flatMap(a => loop(n - 1, Eval.now(a + 1)))
    }

    const n = 50000
    expect(loop(n, Eval.now(0)).get()).toBe(n)
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

  test("map is tail safe", () => {
    let n = 10000
    let fa = Eval.now(0)
    for (let i = 0; i < n; i++) fa = fa.map(_ => _ + 1)
    expect(fa.get()).toBe(n)
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

  test("now, raise and once returns the same reference on .memoize", () => {
    const fa1 = Eval.now(1)
    expect(fa1.memoize()).toBe(fa1)
  })

  test("always().memoize caches successful results", () => {
    let effect = 0
    const source = Eval.always(() => { effect += 1; return effect })
    const fa = source.memoize()

    expect(fa.get()).toBe(1)
    expect(fa.get()).toBe(1)
    expect(fa.get()).toBe(1)
  })

  test("always().memoize caches failures", () => {
    const dummy = new DummyError("dummy")
    let effect = 0
    const source = Eval.always(() => { effect += 1; throw dummy })
    const fa = source.memoize()

    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(1)
    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(1)
  })

  test("any.flatMap.memoize caches successful results", () => {
    let effect = 0
    const source = Eval.now(1).map(x => { effect += x; return effect })
    const fa = source.memoize()

    expect(fa.get()).toBe(1)
    expect(fa.get()).toBe(1)
    expect(fa.get()).toBe(1)
  })

  test("any.flatMap.memoize caches failures", () => {
    const dummy = new DummyError("dummy")
    let effect = 0
    const source = Eval.now(1).flatMap(x => { effect += x; throw dummy })
    const fa = source.memoize()

    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(1)
    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(1)
  })

  // ---
  test("now, raise and once returns the same reference on .memoizeOnSuccess", () => {
    const fa1 = Eval.now(1)
    expect(fa1.memoizeOnSuccess()).toBe(fa1)
  })

  test("always().memoizeOnSuccess caches successful results", () => {
    let effect = 0
    const source = Eval.always(() => { effect += 1; return effect })
    const fa = source.memoizeOnSuccess()

    expect(fa.get()).toBe(1)
    expect(fa.get()).toBe(1)
    expect(fa.get()).toBe(1)
  })

  test("always().memoizeOnSuccess does not cache failures", () => {
    const dummy = new DummyError("dummy")
    let effect = 0
    const source = Eval.always(() => { effect += 1; throw dummy })
    const fa = source.memoizeOnSuccess()

    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(1)
    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(2)
    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(3)
  })

  test("any.flatMap.memoizeOnSuccess caches successful results", () => {
    let effect = 0
    const source = Eval.now(1).map(x => { effect += x; return effect })
    const fa = source.memoizeOnSuccess()

    expect(fa.get()).toBe(1)
    expect(fa.get()).toBe(1)
    expect(fa.get()).toBe(1)
  })

  test("any.flatMap.memoizeOnSuccess caches failures", () => {
    const dummy = new DummyError("dummy")
    let effect = 0
    const source = Eval.now(1).flatMap(x => { effect += x; throw dummy })
    const fa = source.memoizeOnSuccess()

    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(1)
    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(2)
    expect(is(fa.run(), Failure(dummy))).toBe(true)
    expect(effect).toBe(3)
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

  test("forEach throws exception for failures", () => {
    const fa: Eval<number> = Eval.raise("dummy")
    expect(() => fa.forEach(a => {})).toThrowError("dummy")
  })
})

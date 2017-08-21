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

import { is, Try, Success, Failure, Some, None, DummyError, Left, Right, IllegalStateError, TimeoutError, IllegalArgumentError } from "../../../src/core"
import { Future, IPromiseLike, TestScheduler, Scheduler, BoolCancelable, Cancelable, Duration } from "../../../src/exec"
import { Eq } from "../../../src/types"

import * as jv from "jsverify"
import * as inst from "../instances"
import * as laws from "../laws"

describe("PureFuture", () => {
  test("pure", () => {
    const s = new TestScheduler()
    const f = Future.pure(10, s)

    expect(is(f.value(), Some(Success(10)))).toBe(true)

    let result = 0
    f.cancel() // no-op
    f.onComplete(a => { result = a.get() })
    expect(result).toBe(10)
  })

  test("pure.onComplete protects against user error", () => {
    let thrownErr: any = null
    const s = new TestScheduler(err => { thrownErr = err })

    const f = Future.pure(10, s)
    const dummy = new DummyError("dummy")
    f.onComplete(_ => { throw dummy })

    expect(thrownErr).toBe(dummy)
  })

  test("pure.map", () => {
    const s = new TestScheduler()
    const f = Future.pure(10, s).map(_ => _ * 2)

    expect(is(f.value(), Some(Success(20)))).toBe(true)

    let result = 0
    f.onComplete(a => { result = a.get() })
    expect(result).toBe(20)
  })

  test("pure.map protects against user errors", () => {
    const dummy = new DummyError("dummy")
    const f = Future.pure(1).map(_ => { throw dummy })

    expect(is(f.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("pure.flatMap", () => {
    const s = new TestScheduler()
    const f = Future.pure(10, s).flatMap(_ => Future.pure(_ * 2))

    expect(is(f.value(), Some(Success(20)))).toBe(true)

    let result = 0
    f.onComplete(a => { result = a.get() })
    expect(result).toBe(20)
  })

  test("pure.flatMap is stack safe in recursive loop", () => {
    const loop = (n: number) => {
      if (n <= 0) return Future.pure(n)
      return Future.pure(n).flatMap(x => loop(x - 1))
    }

    expect(is(loop(10000).value(), Some(Success(0)))).toBe(true)
  })

  test("pure.flatMap protects against user errors", () => {
    const dummy = new DummyError("dummy")
    const f = Future.pure(1).flatMap(_ => { throw dummy })

    expect(is(f.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("pure.attempt", () => {
    const f = Future.pure(1).attempt()
    expect(is(f.value(), Some(Success(Right(1))))).toBe(true)
  })

  test("raise(err).map <-> raise(err)", () => {
    const dummy = new DummyError("dummy")
    const f = (Future.raise(dummy) as Future<number>).map(_ => _ + 1)

    expect(is(f.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("raise(err).flatMap <-> raise(err)", () => {
    const dummy = new DummyError("dummy")
    const f = (Future.raise(dummy) as Future<number>).flatMap(_ => Future.pure(_ + 1))

    expect(is(f.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("raise.recover", () => {
    const dummy = new DummyError("dummy")
    const f: Future<string> = Future.raise(dummy).recover(ex => ex.message)

    expect(is(f.value(), Some(Success("dummy")))).toBe(true)
  })

  test("raise.recover protects against user error", () => {
    const dummy = new DummyError("dummy")
    const dummy2 = new DummyError("dummy2")
    const f: Future<string> = Future.raise(dummy).recover(ex => { throw dummy2 })

    expect(is(f.value(), Some(Failure(dummy2)))).toBe(true)
  })

  test("raise.recoverWith", () => {
    const dummy = new DummyError("dummy")
    const f: Future<string> = Future.raise(dummy).recoverWith(ex => Future.pure(ex.message))

    expect(is(f.value(), Some(Success("dummy")))).toBe(true)
  })

  test("raise.recoverWith protects against user error", () => {
    const dummy = new DummyError("dummy")
    const dummy2 = new DummyError("dummy2")
    const f: Future<string> = Future.raise(dummy).recoverWith(ex => { throw dummy2 })

    expect(is(f.value(), Some(Failure(dummy2)))).toBe(true)
  })

  test("raise.attempt", () => {
    const dummy = new DummyError("dummy")
    const f = Future.raise(dummy).attempt()
    expect(is(f.value(), Some(Success(Left(dummy))))).toBe(true)
  })

  test("pure(x).flatMap(f) yields cancelable future", () => {
    const c = BoolCancelable.empty()
    const never = Future.create(_ => c)
    const f = Future.pure(1).flatMap(x => never)

    expect(f.value().isEmpty()).toBe(true)
    expect(c.isCanceled()).toBe(false)

    f.cancel()
    expect(c.isCanceled()).toBe(true)
    expect(f.value().isEmpty()).toBe(true)
    f.cancel() // no-op
  })

  test("raise(x).recoverWith(f) yields cancelable future", () => {
    const c = BoolCancelable.empty()
    const never = Future.create(_ => c)
    const f = Future.raise(new DummyError()).recoverWith(_ => never)

    expect(f.value().isEmpty()).toBe(true)
    expect(c.isCanceled()).toBe(false)

    f.cancel()
    expect(c.isCanceled()).toBe(true)
    expect(f.value().isEmpty()).toBe(true)
    f.cancel() // no-op
  })

  test("pure.withScheduler", () => {
    const s1 = new TestScheduler()
    s1.trampoline = s1.executeAsync
    const s2 = new TestScheduler()
    s2.trampoline = s2.executeAsync

    const f = Future.pure(1, s1)
      .withScheduler(s2)
      .map(x => x + 1)

    expect(f.value()).toBe(None)
    s1.tick()
    expect(f.value()).toBe(None)
    s2.tick()

    expect(is(f.value(), Some(Success(2)))).toBe(true)
  })

  test("pure(?, ec).withScheduler(ec) yields the same reference", () => {
    const s1 = new TestScheduler()
    const s2 = new TestScheduler()
    const fa = Future.pure(1, s1)

    expect(fa.withScheduler(s1)).toBe(fa)
    expect(fa.withScheduler(s2) !== fa).toBeTruthy()
  })
})

describe("FutureBuilder", () => {
  test("Future.of(f)", () => {
    const s = new TestScheduler()
    const f = Future.of(() => 10, s)

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Success(10)))).toBe(true)

    let result = 0
    f.onComplete(a => { result = a.get() })
    expect(result).toBe(10)
  })

  test("Future.of(f).onComplete protects against user error", () => {
    let thrownErr: any = null
    const s = new TestScheduler(err => { thrownErr = err })

    const f = Future.of(() => 10, s)
    const dummy = new DummyError("dummy")
    f.onComplete(_ => { throw dummy })

    s.tick()
    expect(thrownErr).toBe(dummy)
  })

  test("Future.of(f) protects against user errors", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f = Future.of(() => { throw dummy }, s)

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("Future.of(f).map", () => {
    const s = new TestScheduler()
    const f = Future.of(() => 10, s).map(_ => _ * 2)

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Success(20)))).toBe(true)

    let result = 0
    f.onComplete(a => { result = a.get() })
    expect(result).toBe(20)
  })

  test("Future.of(f).map protects against user errors", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f = Future.of(() => 1, s).map(_ => { throw dummy })

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("Future.of(f).flatMap", () => {
    const s = new TestScheduler()
    const f = Future.of(() => 10, s).flatMap(_ => Future.pure(_ * 2))

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Success(20)))).toBe(true)

    let result = 0
    f.onComplete(a => { result = a.get() })
    expect(result).toBe(20)
  })

  test("Future.of(f).flatMap is stack safe in recursive loop", () => {
    const s = new TestScheduler()

    const loop = (n: number) => {
      if (n <= 0) return Future.pure(n, s)
      return Future.of(() => n, s).flatMap(x => loop(x - 1))
    }

    const f = loop(10000)
    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Success(0)))).toBe(true)
  })

  test("Future.of(f).flatMap protects against user errors", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f = Future.of(() => 1, s).flatMap(_ => { throw dummy })

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("Future.of(f).attempt", () => {
    const s = new TestScheduler()
    const f = Future.of(() => 1, s).attempt()

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Success(Right(1))))).toBe(true)
  })

  test("Future.of(throw err).map <-> raise(err)", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f = Future.of<number>(() => { throw dummy }, s).map(_ => _ + 1)

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("Future.of(throw err).flatMap <-> raise(err)", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f = Future.of<number>(() => { throw dummy }, s).flatMap(_ => Future.pure(_ + 1))

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("Future.of(throw err).recover", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f: Future<string> = Future.of(() => { throw dummy }, s).recover(ex => ex.message)

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Success("dummy")))).toBe(true)
  })

  test("Future.of(throw err).recover protects against user error", () => {
    const s = new TestScheduler()

    const dummy = new DummyError("dummy")
    const dummy2 = new DummyError("dummy2")
    const f: Future<string> = Future.of(() => { throw dummy }, s).recover(ex => { throw dummy2 })

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Failure(dummy2)))).toBe(true)
  })

  test("Future.of(throw err).recoverWith", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f: Future<string> = Future.of(() => { throw dummy }, s).recoverWith(ex => Future.pure(ex.message))

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Success("dummy")))).toBe(true)
  })

  test("Future.of(throw err).recoverWith protects against user error", () => {
    const s = new TestScheduler()

    const dummy = new DummyError("dummy")
    const dummy2 = new DummyError("dummy2")
    const f: Future<string> = Future.of(() => { throw dummy }, s).recoverWith(ex => { throw dummy2 })

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Failure(dummy2)))).toBe(true)
  })

  test("Future.of(throw err).attempt", () => {
    const s = new TestScheduler()

    const dummy = new DummyError("dummy")
    const f = Future.of(() => { throw dummy }, s).attempt()

    expect(f.value()).toBe(None); s.tick()
    expect(is(f.value(), Some(Success(Left(dummy))))).toBe(true)
  })

  test("Future.of(x).flatMap(f) yields cancelable future", () => {
    const s = new TestScheduler()

    Scheduler.global.bind(s, () => {
      const c = BoolCancelable.empty()
      const never = Future.create(_ => c)

      let effect = 0
      const f = Future.of(() => { effect += 1 })
        .flatMap(_ => Future.pure(_))
        .flatMap(_ => Future.pure(_))
        .flatMap(_ => never)

      expect(effect).toBe(0); s.tick()
      expect(effect).toBe(1)

      expect(f.value().isEmpty()).toBe(true)
      expect(c.isCanceled()).toBe(false)

      f.cancel()
      expect(c.isCanceled()).toBe(true)
      expect(f.value().isEmpty()).toBe(true)
      f.cancel() // no-op
    })
  })

  test("raise(x).recoverWith(f) yields cancelable future", () => {
    const s = new TestScheduler()

    Scheduler.global.bind(s, () => {
      const c = BoolCancelable.empty()
      const never = Future.create(_ => c)

      let effect = 0
      const f = Future.of(() => { effect += 1; throw new DummyError() }).recoverWith(_ => never)

      expect(effect).toBe(0); s.tick()
      expect(effect).toBe(1)

      expect(f.value().isEmpty()).toBe(true)
      expect(c.isCanceled()).toBe(false)

      f.cancel()
      expect(c.isCanceled()).toBe(true)
      expect(f.value().isEmpty()).toBe(true)
      f.cancel() // no-op
    })
  })

  test("Future.of(f).withScheduler", () => {
    const s1 = new TestScheduler()
    const s2 = new TestScheduler()
    s2.trampoline = s2.executeAsync

    const f = Future.of(() => 1, s1)
      .withScheduler(s2)
      .map(x => x + 1)

    expect(f.value()).toBe(None)
    s1.tick()
    expect(f.value()).toBe(None)
    s2.tick()

    expect(is(f.value(), Some(Success(2)))).toBe(true)
  })

  test("Future.of(?, ec).withScheduler(ec) yields the same reference", () => {
    const s1 = new TestScheduler()
    const s2 = new TestScheduler()
    const fa = Future.of(() => 1, s1)

    expect(fa.withScheduler(s1)).toBe(fa)
    expect(fa.withScheduler(s2) !== fa).toBeTruthy()
  })

  test("Future.create protects against contract violations", () => {
    let error: any = null

    const f = Future.create(cb => {
      cb(Success(1))
      try { cb(Success(1)) } catch (e) { error = e }
    })

    expect(is(f.value(), Some(Success(1)))).toBe(true)
    expect(error instanceof IllegalStateError).toBe(true)
  })
})

describe("Future is Promise-like", () => {
  test("fa.then() === fa", () => {
    const fa = Future.pure(10)
    const f = fa.then()
    expect(f).toBe(fa)
  })

  test("then(onSuccess) behaves like map", () => {
    const s = new TestScheduler()

    const f = Future.pure(10, s).then(x => x * 2)
    expect(is(f.value(), Some(Success(20)))).toBe(true)
  })

  test("fa.then(null) <-> fa", () => {
    const s = new TestScheduler()
    const f = Future.pure(10, s).then(null, () => {})
    expect(is(f.value(), Some(Success(10)))).toBe(true)
  })

  test("then(onSuccess) behaves like flatMap", () => {
    const s = new TestScheduler()

    const f = Future.pure(10, s).then(x => Future.pure(x * 2))
    expect(is(f.value(), Some(Success(20)))).toBe(true)
  })

  test("Future.fromPromise(fa) === fa", () => {
    const fa = Future.pure(10)
    expect(Future.fromPromise(fa)).toBe(fa)
  })

  test("Future.fromPromise works for successful promises", () => {
    const fa: Future<number> = Future.fromPromise(new PromiseBox(Success(100)))
    expect(is(fa.value(), Some(Success(100))))
  })

  test("Future.fromPromise works for failed promises", () => {
    const fa = Future.fromPromise(new PromiseBox(Failure("dummy")))
    expect(is(fa.value(), Some(Failure("dummy"))))
  })

  test("actual async functions await", () => {
    const f: Future<number> = Future.fromPromise(asyncSample(100))

    return f.then(num => {
      expect(num).toBe(50 * 99)
    })
  })

  test("actual async function await on triggered error", () => {
    const f: Future<number> = Future.fromPromise(asyncErrorSample(100))

    return f.then(num => {
      expect(num).toBe(110)
    })
  })

  test("converts to Promise if async", () => {
    const s = new TestScheduler()
    const p = Future.of(() => 1 + 1).toPromise()
    return p.then(num => expect(num).toBe(2))
  })

  test("converts to Promise if async error", () => {
    const s = new TestScheduler()
    const dummy = new DummyError()
    const p = Future.of(() => { throw dummy }).toPromise()
    return p.then(null, err => expect(err).toBe(dummy))
  })

  test("converts to Promise if pure", () => {
    const s = new TestScheduler()
    const p = Future.pure(2).toPromise()
    return p.then(num => expect(num).toBe(2))
  })

  test("converts to Promise if pure error", () => {
    const s = new TestScheduler()
    const dummy = new DummyError()
    const p = Future.raise(dummy).toPromise()
    return p.then(null, err => expect(err).toBe(dummy))
  })
})

describe("Future delayTick + delayResult", () => {
  test("delayResult works for successful values", () => {
    const s = new TestScheduler()

    const f = Future.pure(1, s).delayResult(1000)
    expect(f.value()).toBe(None)

    s.tick(1000)
    expect(is(f.value(), Some(Success(1)))).toBe(true)
  })

  test("delayResult works for failures", () => {
    const s = new TestScheduler()

    const dummy = new DummyError("dummy")
    const f = Future.raise(dummy, s).delayResult(1000)
    expect(f.value()).toBe(None)

    s.tick(1000)
    expect(is(f.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("delayResult with global scheduler", () => {
    const f = Future.pure(1).delayResult(10)

    return f.map(x => {
      expect(x).toBe(1)
    })
  })

  test("delayedTick with global scheduler", () => {
    const f = Future.delayedTick(10)

    return f.map(x => {
      expect(x).toBe(undefined)
    })
  })
})

describe("Future.sequence", () => {
  test("happy path", () => {
    const s = new TestScheduler()

    const f1 = Future.of(() => 1, s)
    const f2 = Future.of(() => 2, s)
    const f3 = Future.of(() => 3, s)

    const fl = Future.sequence([f1, f2, f3], s).map(_ => _.toString())
    expect(fl.value()).toBe(None)

    s.tick()
    expect(is(fl.value(), Some(Success("1,2,3")))).toBe(true)
  })

  test("happy path with delayed results", () => {
    const s = new TestScheduler()
    let effect = 0

    const f1 = Future.of(() => 1, s).delayResult(1000).map(x => { effect += 1; return x })
    const f2 = Future.of(() => 2, s).delayResult(3000).map(x => { effect += 1; return x })
    const f3 = Future.of(() => 3, s).delayResult(2000).map(x => { effect += 1; return x })

    const fl = Future.sequence([f1, f2, f3], s).map(_ => _.toString())
    expect(fl.value()).toBe(None)

    s.tick()
    expect(effect).toBe(0)
    expect(fl.value()).toBe(None)

    s.tick(1000)
    expect(effect).toBe(1)
    expect(fl.value()).toBe(None)

    s.tick(1000)
    expect(effect).toBe(2)
    expect(fl.value()).toBe(None)

    s.tick(1000)
    expect(effect).toBe(3)
    expect(is(fl.value(), Some(Success("1,2,3")))).toBe(true)
  })

  test("sequence of empty list", () => {
    const list: Future<number>[] = []
    const all = Future.sequence(list).map(_ => _.toString())
    expect(is(all.value(), Some(Success("")))).toBe(true)
  })

  test("sequence of null list", () => {
    const all = Future.sequence(null as any[]).map(_ => _.toString())
    expect(is(all.value(), Some(Success("")))).toBe(true)
  })

  test("on failure of a future, cancels all", () => {
    const s = new TestScheduler()
    let effect = 0
    const create = () => Future.create(_ => Cancelable.of(() => { effect += 1 }), s)

    const dummy = new DummyError("dummy")
    const fail = Future.raise(dummy, s).delayResult(2000)
    const all = Future.sequence([create(), create(), fail, create(), create()], s)

    s.tick()
    expect(all.value()).toBe(None)
    expect(effect).toBe(0)

    s.tick(2000)
    expect(is(all.value(), Some(Failure(dummy)))).toBe(true)
    expect(effect).toBe(4)
  })

  test("works with actual Iterable", () => {
    let effect = 0

    const iter = {
      [Symbol.iterator]: () => {
        let index = 0
        return {
          next: () => {
            if (index++ < 3) return { value: Future.pure(index), done: false }
            else return { done: true }
          }
        }
      }
    }

    const f = Future.sequence(iter as Iterable<Future<number>>).map(arr => {
      let sum = 0
      for (const e of arr) sum += e
      return sum
    })

    expect(is(f.value(), Some(Success(6)))).toBe(true)
  })

  test("protects against broken Iterable", () => {
    const ec = new TestScheduler()
    const dummy = new DummyError("dummy")
    let effect = 0

    const never = () => Future.create(_ => Cancelable.of(() => { effect += 1 }), ec)

    const iter = {
      [Symbol.iterator]: () => {
        let index = 0
        return {
          next: () => {
            if (index++ < 3) return { value: never(), done: false }
            else throw dummy
          }
        }
      }
    }

    const all = Future.sequence(iter as any, ec)
    ec.tick()
    expect(is(all.value(), Some(Failure(dummy)))).toBe(true)
    expect(effect).toBe(3)
  })

  test("map2", () => {
    const f = Future.map2(
      Future.pure(1), Future.pure(2),
      (a, b) => a + b
    )

    expect(is(f.value(), Some(Success(3)))).toBe(true)
  })

  test("map3", () => {
    const f = Future.map3(
      Future.pure(1), Future.pure(2), Future.pure(3),
      (a, b, c) => a + b + c
    )

    expect(is(f.value(), Some(Success(6)))).toBe(true)
  })

  test("map4", () => {
    const f = Future.map4(
      Future.pure(1), Future.pure(2), Future.pure(3), Future.pure(4),
      (a, b, c, d) => a + b + c + d
    )

    expect(is(f.value(), Some(Success(10)))).toBe(true)
  })

  test("map5", () => {
    const f = Future.map5(
      Future.pure(1), Future.pure(2), Future.pure(3), Future.pure(4), Future.pure(5),
      (a, b, c, d, e) => a + b + c + d + e
    )

    expect(is(f.value(), Some(Success(15)))).toBe(true)
  })

  test("map6", () => {
    const f = Future.map6(
      Future.pure(1), Future.pure(2), Future.pure(3), Future.pure(4), Future.pure(5), Future.pure(6),
      (a, b, c, d, e, f) => a + b + c + d + e + f
    )

    expect(is(f.value(), Some(Success(21)))).toBe(true)
  })

  test("protect against broken cancelable", () => {
    const ec = new TestScheduler()
    let effect = 0
    const never = () => Future.create(_ => Cancelable.of(() => { effect += 1 }), ec)

    const dummy = new DummyError("dummy")
    const fail = Future.create(_ => Cancelable.of(() => { throw dummy }), ec)

    const all = Future.sequence([never(), never(), fail, never(), never()], ec)
    all.cancel()

    expect(effect).toBe(4)
    const errs = ec.triggeredFailures()
    expect(errs.length).toBe(1)
    expect(errs[0]).toBe(dummy)
  })

  test("on failure signaling result is blocked", () => {
    const ec = new TestScheduler()
    const dummy1 = new DummyError("dummy1")
    const dummy2 = new DummyError("dummy1")

    const all = Future.sequence([
      Future.raise(dummy1, ec),
      Future.of(() => 1, ec),
      Future.of(() => null, ec).flatMap(_ => Future.raise(dummy2, ec))
    ], ec)

    ec.tick()
    expect(is(all.value(), Some(Failure(dummy1))))
    expect(ec.triggeredFailures().length).toBe(1)
  })
})

describe("Future.firstCompletedOf", () => {
  test("happy path", () => {
    const f = Future.firstCompletedOf([Future.pure(1), Future.pure(2)])
    expect(is(f.value(), Some(Success(1)))).toBe(true)
  })

  test("timeout", () => {
    const ec = new TestScheduler()
    let effect = 0
    const never = Future.create(_ => Cancelable.of(() => { effect += 1 }), ec)

    const fa = never.timeout(Duration.of(1000))
    ec.tick()
    expect(fa.value()).toBe(None)

    ec.tick(1000)
    const v = fa.value()

    expect(!v.isEmpty()).toBeTruthy()
    expect(v.get().isFailure()).toBeTruthy()
    expect(v.get().failed().get() instanceof TimeoutError).toBeTruthy()
    expect((v.get().failed().get() as TimeoutError).message).toBe("1000 milliseconds")
    expect(effect).toBe(1)
  })

  test("timeoutTo", () => {
    const ec = new TestScheduler()
    let effect = 0
    const never = Future.create(_ => Cancelable.of(() => { effect += 1 }), ec)

    const fa = never.timeoutTo(1000, () => Future.pure(1000))
    ec.tick()
    expect(fa.value()).toBe(None)

    ec.tick(1000)
    const v = fa.value()

    expect(is(fa.value(), Some(Success(1000))))
    expect(effect).toBe(1)
  })

  test("report success, cancel the losers", () => {
    const ec = new TestScheduler()
    let effect = 0

    const create = (delay: number, inc: number) => Future.create(
      cb => {
        const t = ec.scheduleOnce(delay, () => cb(Success(inc)))
        return Cancelable.of(() => { effect += inc; t.cancel() })
      }, ec)

    const first = Future.firstCompletedOf(
      [create(3000, 1), create(2000, 2), create(3000, 3)],
      ec)

    ec.tick(2000)
    expect(is(first.value(), Some(Success(2)))).toBe(true)
    expect(effect).toBe(1 + 3)
  })

  test("report failure, cancel the losers", () => {
    const ec = new TestScheduler()
    const dummy = new DummyError("dummy")
    let effect = 0

    const create = (delay: number, inc: number, fail: boolean) => Future.create(
      cb => {
        const t = ec.scheduleOnce(delay, () => {
          if (!fail) cb(Success(inc))
          else cb(Failure(dummy))
        })

        return Cancelable.of(() => { effect += inc; t.cancel() })
      }, ec)

    const first = Future.firstCompletedOf(
      [create(3000, 1, false), create(2000, 2, true), create(3000, 3, false)],
      ec)

    ec.tick(2000)
    expect(is(first.value(), Some(Failure(dummy)))).toBe(true)
    expect(effect).toBe(1 + 3)
  })

  test("works with actual Iterable", () => {
    const ec = new TestScheduler()
    let effect = 0

    const iter = {
      [Symbol.iterator]: () => {
        let index = 0
        return {
          next: () => {
            if (index++ < 3)
              return { value: Future.pure(index, ec).delayResult(4000 - index * 1000), done: false }
            else
              return { done: true }
          }
        }
      }
    }

    const f = Future.firstCompletedOf(iter as Iterable<Future<number>>, ec)
    expect(f.value()).toBe(None)

    ec.tick(1000)
    expect(is(f.value(), Some(Success(1))))
  })

  test("protects against broken Iterable", () => {
    const ec = new TestScheduler()
    const dummy = new DummyError("dummy")
    let effect = 0

    const never = () => Future.create(_ => Cancelable.of(() => { effect += 1 }), ec)

    const iter = {
      [Symbol.iterator]: () => {
        let index = 0
        return {
          next: () => {
            if (index++ < 3) return { value: never(), done: false }
            else throw dummy
          }
        }
      }
    }

    const all = Future.firstCompletedOf(iter as any, ec)
    ec.tick()
    expect(is(all.value(), Some(Failure(dummy)))).toBe(true)
    expect(effect).toBe(3)
  })

  test("signaling result is blocked after first", () => {
    const ec = new TestScheduler()
    const dummy1 = new DummyError("dummy1")
    const dummy2 = new DummyError("dummy1")

    const all = Future.firstCompletedOf([
      Future.raise(dummy1, ec),
      Future.of(() => 1, ec),
      Future.of(() => null, ec).flatMap(_ => Future.raise(dummy2, ec))
    ], ec)

    ec.tick()
    expect(is(all.value(), Some(Failure(dummy1))))
    expect(ec.triggeredFailures().length).toBe(1)
  })

  test("protect against broken cancelable", () => {
    const ec = new TestScheduler()
    let effect = 0
    const never = () => Future.create(_ => Cancelable.of(() => { effect += 1 }), ec)

    const dummy = new DummyError("dummy")
    const fail = Future.create(_ => Cancelable.of(() => { throw dummy }), ec)

    const all = Future.firstCompletedOf([never(), never(), fail, never(), never()], ec)
    all.cancel()

    expect(effect).toBe(4)
    const errs = ec.triggeredFailures()
    expect(errs.length).toBe(1)
    expect(errs[0]).toBe(dummy)
  })

  test("empty list is illegal", () => {
    const f = Future.firstCompletedOf([])
    expect(!f.value().isEmpty()).toBeTruthy()
    expect(f.value().get().isFailure()).toBeTruthy()
    expect(f.value().get().failed().get() instanceof IllegalArgumentError).toBeTruthy()
  })
})

describe("Future.traverse", () => {
  test("happy path for parallelism = 1, 2, 4, Infinity", () => {
    const ec = new TestScheduler()
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const parallelism = [1, 2, 4, Infinity]
    const f = (n: number) => Future.pure(n * 2, ec)

    for (const p of parallelism) {
      const all = Future.traverse(list, p, ec)(f).map(x => {
        let sum = 0
        for (let i = 0; i < x.length; i++) sum += x[i]
        return sum
      })

      ec.tick()
      expect(all.value().isEmpty()).toBeFalsy()
      expect(all.value().get().get()).toBe(110)
    }
  })

  test("parallelism <= 0 throws", () => {
    expect(() => Future.traverse([], -1)(Future.pure)).toThrow()
  })

  test("empty list is empty", () => {
    const ec = new TestScheduler()
    const f = Future.traverse([], Infinity, ec)(Future.pure).map(_ => _.toString())

    ec.tick()
    expect(is(f.value(), Some(Success("")))).toBeTruthy()
  })

  test("protect against user errors in generator", () => {
    const ec = new TestScheduler()
    const list = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const dummy = new DummyError("dummy")

    let effect = 0
    const never = (n: number) => Future.create(_ => Cancelable.of(() => { effect += n }), ec)

    const f = Future.traverse(list, Infinity, ec)(a => {
      if (a === 6) throw dummy
      return never(a)
    })

    ec.tick()
    expect(is(f.value(), Some(Failure(dummy)))).toBeTruthy()
    expect(effect).toBe(1 + 2 + 3 + 4 + 5)
  })

  test("handles null list", () => {
    const ec = new TestScheduler()
    const f = Future.traverse(null as any, Infinity, ec)(Future.pure).map(_ => _.toString())

    ec.tick()
    expect(is(f.value(), Some(Success("")))).toBeTruthy()
  })

  test("works with actual Iterable", () => {
    const ec = new TestScheduler()
    let effect = 0

    const iter = {
      [Symbol.iterator]: () => {
        let index = 0
        return {
          next: () => {
            index += 1
            if (index === 1) return { value: null, done: false }
            else if (index <= 4) return { value: index - 1, done: false }
            else return { done: true }
          }
        }
      }
    }

    const f = Future.traverse(iter as Iterable<number>, Infinity, ec)(Future.pure)
      .map(arr => {
        let sum = 0
        for (const e of arr) sum += e
        return sum
      })

    ec.tick()
    expect(is(f.value(), Some(Success(6)))).toBe(true)
  })

  test("protects against broken Iterable", () => {
    const ec = new TestScheduler()
    const dummy = new DummyError("dummy")
    let effect = 0

    const iter = {
      [Symbol.iterator]: () => {
        let index = 0
        return {
          next: () => {
            if (index++ < 3) return { value: index, done: false }
            else throw dummy
          }
        }
      }
    }

    const all = Future.traverse(iter as any, Infinity, ec)(Future.pure)
    ec.tick()
    expect(is(all.value(), Some(Failure(dummy)))).toBe(true)
  })

  test("actual execution", () => {
    const list = [1, 2, 3]
    const fa = Future.traverse(list)(Future.pure)
      .map(arr => {
        let sum = 0
        for (const e of arr) sum += e
        return sum
      })

    return fa.toPromise().then(x => {
      expect(x).toBe(6)
    })
  })
})

describe("Future obeys type class laws", () => {
  const s = new TestScheduler()
  const eq = new (
    class extends Eq<Future<any>> {
      eqv(lh: Future<any>, rh: Future<any>): boolean {
        s.tick(1000 * 60 * 60 * 24 * 10)
        return lh.value().equals(rh.value())
      }
    })()

  const arbF = inst.arbFuture(s)
  laws.testMonadError(Future, jv.number, arbF, jv.string, eq)
})

class PromiseBox<A> implements IPromiseLike<A> {
  constructor(public readonly value: Try<A>) {}

  then<TResult1, TResult2>(onSuccess?: (value: A) => (IPromiseLike<TResult1> | TResult1), onFailure?: (reason: any) => (IPromiseLike<TResult2> | TResult2)): IPromiseLike<TResult2 | TResult1> {
    return this.value.fold(
      err => {
        if (!onFailure) return this as any
        const fb = onFailure(err)
        if (fb && typeof (fb as any).then === "function") return fb
        return new PromiseBox(Success(fb))
      },
      value => {
        if (!onSuccess) return this as any
        const fb = onSuccess(value)
        if (fb && typeof (fb as any).then === "function") return fb
        return new PromiseBox(Success(fb))
      })
  }
}

async function asyncSample(n: number): Promise<number> {
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += await Future.of(() => i)
  }
  return sum
}

async function asyncErrorSample(n: number): Promise<number> {
  const dummy = new DummyError("dummy")
  let result = 0

  try {
    result = await Future.of<number>(() => { throw dummy })
  } catch (e) {
    if (e === dummy)
      result = n + 10
    else
      throw e
  }
  return result
}

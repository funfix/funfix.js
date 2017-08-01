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

import { is, Try, Success, Failure, Some, None, DummyError, Left, Right, IllegalStateError } from "../../src/core"
import { Future, IPromise, TestScheduler, Scheduler, BoolCancelable } from "../../src/exec"
import { Eq } from "../../src/types"

import * as jv from "jsverify"
import * as inst from "../instances"
import * as laws from "../laws"

describe("PureFuture", () => {
  test("pure", () => {
    const s = new TestScheduler()
    const f = Future.pure(10, s)

    expect(is(f.value(), Some(Success(10)))).toBe(true)

    let result = 0
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
      const f = Future.of(() => { effect += 1 }).flatMap(_ => never)

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

describe("Future is a Promise", () => {
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

  test("catch() behaves like recover", () => {
    const s = new TestScheduler()
    const dummy = new DummyError()

    const f = Future.raise(dummy, s).catch(_ => 100)
    expect(is(f.value(), Some(Success(100)))).toBe(true)
  })

  test("catch() behaves like recoverWith", () => {
    const s = new TestScheduler()
    const dummy = new DummyError()

    const f = Future.raise(dummy, s).catch(_ => Future.pure(100))
    expect(is(f.value(), Some(Success(100)))).toBe(true)
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

  test("actual async functions", () => {
    const f: Future<number> = Future.fromPromise(asyncSample(100))

    return f.then(num => {
      expect(num).toBe(50 * 99)
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

class PromiseBox<A> implements IPromise<A> {
  constructor(public readonly value: Try<A>) {}

  then<TResult1, TResult2>(onSuccess?: (value: A) => (IPromise<TResult1> | TResult1), onFailure?: (reason: any) => (IPromise<TResult2> | TResult2)): IPromise<TResult2 | TResult1> {
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

  catch<TResult>(onFailure?: (reason: any) => (IPromise<TResult> | TResult)): IPromise<TResult | A> {
    return this.then(undefined, onFailure) as any
  }
}

async function asyncSample(n: number): Promise<number> {
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += await Future.of(() => i)
  }
  return sum
}

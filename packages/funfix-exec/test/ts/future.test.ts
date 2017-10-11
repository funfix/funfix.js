/*!
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

import * as assert from "./asserts"
import { id, is, Try, Success, Failure, Option, Some, None, DummyError, Left, Right, IllegalStateError, TimeoutError, IllegalArgumentError } from "funfix-core"
import { Future, FutureMaker, IPromiseLike, TestScheduler, Scheduler, BoolCancelable, Cancelable, Duration, ExecutionModel } from "../../src/"

describe("PureFuture", () => {
  it("pure", () => {
    const s = new TestScheduler()
    const f = Future.pure(10, s)

    assert.equal(f.value(), Some(Success(10)))

    let result = 0
    f.cancel() // no-op
    f.onComplete(a => { result = a.get() })
    assert.equal(result, 10)
  })

  it("pure.onComplete protects against user error", () => {
    let thrownErr: any = null
    const s = new TestScheduler(err => { thrownErr = err })

    const f = Future.pure(10, s)
    const dummy = new DummyError("dummy")
    f.onComplete(_ => { throw dummy })

    assert.equal(thrownErr, dummy)
  })

  it("pure.map", () => {
    const f = Future.pure(10).map(_ => _ * 2)

    assert.equal(f.value(), Some(Success(20)))

    let result = 0
    f.onComplete(a => { result = a.get() })
    assert.equal(result, 20)
  })

  it("pure.map protects against user errors", () => {
    const dummy = new DummyError("dummy")
    const f = Future.pure(1).map(_ => { throw dummy })

    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("pure.flatMap", () => {
    const s = new TestScheduler()
    const f = Future.pure(10, s).flatMap(_ => Future.pure(_ * 2))

    assert.equal(f.value(), Some(Success(20)))

    let result = 0
    f.onComplete(a => { result = a.get() })
    assert.equal(result, 20)
  })

  it("pure.flatMap is stack safe in recursive loop", () => {
    const ec = new TestScheduler()

    function loop(n: number): Future<number> {
      if (n <= 0) return Future.pure(n, ec)
      return Future.pure(n, ec).flatMap(x => loop(x - 1))
    }

    assert.equal(loop(10000).value(), Some(Success(0)))
  })

  it("pure.flatMap protects against user errors", () => {
    const ec = new TestScheduler()

    const dummy = new DummyError("dummy")
    const f = Future.pure(1, ec).flatMap(_ => { throw dummy })

    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("pure.attempt", () => {
    const f = Future.pure(1).attempt()
    assert.equal(f.value(), Some(Success(Right(1))))
  })

  it("pure.recover <-> pure", () => {
    const f = Future.pure(1)
    assert.equal(f.value(), f.recover(_ => 0).value())
  })

  it("pure.recoverWith <-> pure", () => {
    const f = Future.pure(1)
    assert.equal(f.value(), f.recoverWith(Future.raise).value())
  })

  it("raise(err).map <-> raise(err)", () => {
    const dummy = new DummyError("dummy")
    const f = (Future.raise(dummy) as Future<number>).map(_ => _ + 1)

    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("raise(err).flatMap <-> raise(err)", () => {
    const dummy = new DummyError("dummy")
    const f = (Future.raise(dummy) as Future<number>).flatMap(_ => Future.pure(_ + 1))

    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("raise.recover", () => {
    const dummy = new DummyError("dummy")
    const f: Future<string> = Future.raise(dummy).recover(ex => (ex as any).message)
    assert.equal(f.value(), Some(Success("dummy")))
  })

  it("raise.recover protects against user error", () => {
    const dummy = new DummyError("dummy")
    const dummy2 = new DummyError("dummy2")
    const f: Future<string> = Future.raise(dummy).recover(ex => { throw dummy2 })

    assert.equal(f.value(), Some(Failure(dummy2)))
  })

  it("raise.recoverWith", () => {
    const dummy = new DummyError("dummy")
    const f: Future<string> = Future.raise(dummy).recoverWith(ex => Future.pure((ex as any).message))

    assert.equal(f.value(), Some(Success("dummy")))
  })

  it("raise.recoverWith protects against user error", () => {
    const dummy = new DummyError("dummy")
    const dummy2 = new DummyError("dummy2")
    const f = Future.raise(dummy).recoverWith(_ => { throw dummy2 })
    assert.equal(f.value(), Some(Failure(dummy2)))
  })

  it("raise.attempt", () => {
    const dummy = new DummyError("dummy")
    const f = Future.raise(dummy).attempt()
    assert.equal(f.value(), Some(Success(Left(dummy))))
  })

  it("pure(x).flatMap(f) yields cancelable future", () => {
    const c = BoolCancelable.empty()
    const never = Future.create(_ => c)
    const f = Future.pure(1).flatMap(x => never)

    assert.ok(f.value().isEmpty())
    assert.equal(c.isCanceled(), false)

    f.cancel()
    assert.ok(c.isCanceled())
    assert.ok(f.value().isEmpty())
    f.cancel() // no-op
  })

  it("raise(x).recoverWith(f) yields cancelable future", () => {
    const c = BoolCancelable.empty()
    const never = Future.create(_ => c)
    const f = Future.raise(new DummyError()).recoverWith(_ => never)

    assert.ok(f.value().isEmpty())
    assert.equal(c.isCanceled(), false)

    f.cancel()
    assert.ok(c.isCanceled())
    assert.ok(f.value().isEmpty())
    f.cancel() // no-op
  })

  it("pure.withScheduler", () => {
    const s1 = new TestScheduler(undefined, ExecutionModel.alwaysAsync())
    const s2 = new TestScheduler(undefined, ExecutionModel.alwaysAsync())

    const f = Future.of(() => 1, s1)
      .withScheduler(s2)
      .map(x => x + 1)

    assert.equal(f.value(), None)
    s1.tick()
    assert.equal(f.value(), None)
    s2.tick()

    assert.equal(f.value(), Some(Success(2)))
  })

  it("pure(?, ec).withScheduler(ec) yields the same reference", () => {
    const s1 = new TestScheduler()
    const s2 = new TestScheduler()
    const fa = Future.pure(1, s1)

    assert.equal(fa.withScheduler(s1), fa)
    assert.ok(fa.withScheduler(s2) !== fa)
  })

  it("unit() always yields the same reference", () => {
    assert.equal(Future.unit(), Future.unit())
  })

  it("unit() yields undefined", () => {
    assert.ok(is(Future.unit().value(), Some(Success(undefined))))
  })

  it("does processing in batches", () => {
    const em = ExecutionModel.batched()
    const ec = new TestScheduler().withExecutionModel(em)
    let effect = 0

    function loop(n: number, acc: number): Future<number> {
      return Future.pure(n, ec).flatMap(n => {
        if (n > 0) {
          effect += 1
          return loop(n - 1, acc + 1)
        }
        return Future.pure(acc, ec)
      })
    }

    const total = em.recommendedBatchSize * 8
    const f = loop(total, 0)

    assert.equal(f.value(), None)
    assert.ok(effect <= em.recommendedBatchSize)

    ec.tickOne()
    assert.equal(f.value(), None)
    assert.ok(effect > 0 && effect <= total, "effect > 0 && effect <= total")

    ec.tick()
    assert.equal(f.value(), Some(Success(total)))
    assert.equal(effect, total)
  })

  it("fromTry(Success)", () => {
    const f = Future.fromTry(Success(1))
    assert.equal(f.value(), Some(Success(1)))
  })

  it("fromTry(Failure)", () => {
    const f = Future.fromTry(Failure("err"))
    assert.equal(f.value(), Some(Failure("err")))
  })
})

describe("FutureBuilder", () => {
  it("Future.of(f)", () => {
    const s = new TestScheduler()
    const f = Future.of(() => 10, s)

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Success(10)))

    let result = 0
    f.onComplete(a => { result = a.get() })
    assert.equal(result, 10)
  })

  it("Future.of(f).onComplete protects against user error", () => {
    let thrownErr: any = null
    const s = new TestScheduler(err => { thrownErr = err })

    const f = Future.of(() => 10, s)
    const dummy = new DummyError("dummy")
    f.onComplete(_ => { throw dummy })

    s.tick()
    assert.equal(thrownErr, dummy)
  })

  it("Future.of(f) protects against user errors", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f = Future.of(() => { throw dummy }, s)

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("Future.of(f).map", () => {
    const s = new TestScheduler()
    const f = Future.of(() => 10, s).map(_ => _ * 2)

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Success(20)))

    let result = 0
    f.onComplete(a => { result = a.get() })
    assert.equal(result, 20)
  })

  it("Future.of(f).map protects against user errors", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f = Future.of(() => 1, s).map(_ => { throw dummy })

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("Future.of(f).flatMap", () => {
    const s = new TestScheduler()
    const f = Future.of(() => 10, s).flatMap(_ => Future.pure(_ * 2))

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Success(20)))

    let result = 0
    f.onComplete(a => { result = a.get() })
    assert.equal(result, 20)
  })

  it("Future.of(f).flatMap is stack safe in recursive loop", () => {
    const s = new TestScheduler()

    function loop(n: number): Future<number> {
      if (n <= 0) return Future.pure(n, s)
      return Future.of(() => n, s).flatMap(x => loop(x - 1))
    }

    const f = loop(10000)
    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("Future.of(f).flatMap protects against user errors", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f = Future.of(() => 1, s).flatMap(_ => { throw dummy })

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("Future.of(f).attempt", () => {
    const s = new TestScheduler()
    const f = Future.of(() => 1, s).attempt()

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Success(Right(1))))
  })

  it("Future.of(throw err).map <-> raise(err)", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f = Future.of<number>(() => { throw dummy }, s).map(_ => _ + 1)

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("Future.of(throw err).flatMap <-> raise(err)", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f = Future.of<number>(() => { throw dummy }, s).flatMap(_ => Future.pure(_ + 1))

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("Future.of(() => v).recover <-> Future.pure(v)", () => {
    const ec = new TestScheduler()
    const f = Future.of(() => 1, ec).recover(_ => 0)
    ec.tick()
    assert.equal(f.value(), Some(Success(1)))
  })

  it("Future.of(() => v).recoverWith <-> Future.pure(v)", () => {
    const ec = new TestScheduler()
    const f = Future.of(() => 1, ec).recoverWith(Future.raise)
    ec.tick()
    assert.equal(f.value(), Some(Success(1)))
  })

  it("Future.of(throw err).recover", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f: Future<string> = Future.of(() => { throw dummy }, s).recover(ex => (ex as any).message)

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Success("dummy")))
  })

  it("Future.of(throw err).recover protects against user error", () => {
    const s = new TestScheduler()

    const dummy = new DummyError("dummy")
    const dummy2 = new DummyError("dummy2")
    const f: Future<string> = Future.of(() => { throw dummy }, s).recover(ex => { throw dummy2 })

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Failure(dummy2)))
  })

  it("Future.of(throw err).recoverWith", () => {
    const s = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f: Future<string> = Future.of(() => { throw dummy }, s).recoverWith(ex => Future.pure((ex as any).message))

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Success("dummy")))
  })

  it("Future.of(throw err).recoverWith protects against user error", () => {
    const s = new TestScheduler()

    const dummy = new DummyError("dummy")
    const dummy2 = new DummyError("dummy2")
    const f: Future<string> = Future.of(() => { throw dummy }, s).recoverWith(ex => { throw dummy2 })

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Failure(dummy2)))
  })

  it("Future.of(throw err).attempt", () => {
    const s = new TestScheduler()

    const dummy = new DummyError("dummy")
    const f = Future.of(() => { throw dummy }, s).attempt()

    assert.equal(f.value(), None); s.tick()
    assert.equal(f.value(), Some(Success(Left(dummy))))
  })

  it("Future.of(x).flatMap(f) yields cancelable future", () => {
    const s = new TestScheduler()

    Scheduler.global.bind(s, () => {
      const c = BoolCancelable.empty()
      const never = Future.create(_ => c)

      let effect = 0
      const f = Future.of(() => { effect += 1 })
        .flatMap(_ => Future.pure(_))
        .flatMap(_ => Future.pure(_))
        .flatMap(_ => never)

      assert.equal(effect, 0); s.tick()
      assert.equal(effect, 1)

      assert.ok(f.value().isEmpty())
      assert.equal(c.isCanceled(), false)

      f.cancel()
      assert.ok(c.isCanceled())
      assert.ok(f.value().isEmpty())
      f.cancel() // no-op
    })
  })

  it("raise(x).recoverWith(f) yields cancelable future", () => {
    const s = new TestScheduler()

    Scheduler.global.bind(s, () => {
      const c = BoolCancelable.empty()
      const never = Future.create(_ => c)

      let effect = 0
      const f = Future.of(() => { effect += 1; throw new DummyError() }).recoverWith(_ => never)

      assert.equal(effect, 0); s.tick()
      assert.equal(effect, 1)

      assert.ok(f.value().isEmpty())
      assert.equal(c.isCanceled(), false)

      f.cancel()
      assert.ok(c.isCanceled())
      assert.ok(f.value().isEmpty())
      f.cancel() // no-op
    })
  })

  it("Future.of(f).withScheduler", () => {
    const s1 = new TestScheduler(undefined, ExecutionModel.alwaysAsync())
    const s2 = new TestScheduler(undefined, ExecutionModel.alwaysAsync())

    const f = Future.of(() => 1, s1)
      .withScheduler(s2)
      .map(x => x + 1)

    assert.equal(f.value(), None)
    s1.tick()
    assert.equal(f.value(), None)
    s2.tick()

    assert.equal(f.value(), Some(Success(2)))
  })

  it("Future.of(?, ec).withScheduler(ec) yields the same reference", () => {
    const s1 = new TestScheduler()
    const s2 = new TestScheduler()
    const fa = Future.of(() => 1, s1)

    assert.equal(fa.withScheduler(s1), fa)
    assert.ok(fa.withScheduler(s2) !== fa)
  })

  it("Future.create protects against contract violations", () => {
    let error: any = null

    const f = Future.create(cb => {
      cb(Success(1))
      try { cb(Success(1)) } catch (e) { error = e }
    })

    assert.equal(f.value(), Some(Success(1)))
    assert.ok(error instanceof IllegalStateError)
  })

  it("Future.create protects against thrown errors", () => {
    const dummy = new DummyError()
    const f = Future.create(_ => { throw dummy })
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("cancels chain", () => {
    const ec = new TestScheduler()
    const delay = (r: number) =>
      Future.create(cb => ec.scheduleOnce(1000, () => cb(Success(r))), ec)

    const gen = () => Future.of(() => 1, ec)
      .flatMap(x => Future.of(() => x + 1, ec)
        .flatMap(y => delay(x + y)))

    const f1 = gen()
    const f2 = gen()

    ec.tick()
    assert.equal(f1.value(), None)
    assert.equal(f2.value(), None)

    f2.cancel()
    ec.tick(1000)

    assert.equal(f1.value(), Some(Success(3)))
    assert.equal(f2.value(), None)
    assert.not(ec.hasTasksLeft())
  })

  it("can yield non-cancelable chain", () => {
    const ec = new TestScheduler()
    const delay = (r: number) =>
      Future.create(cb => {
        ec.scheduleOnce(1000, () => cb(Success(r)))
        return Cancelable.empty()
      }, ec)

    const f = Future.of(() => 1, ec)
      .flatMap(x => Future.of(() => x + 1, ec)
        .flatMap(y => delay(x + y)))

    ec.tick()
    assert.equal(f.value(), None)

    f.cancel()
    ec.tick(1000)
    assert.equal(f.value(), Some(Success(3)))
  })
})

describe("Future is Promise-like", () => {
  it("fa.then() === fa", () => {
    const fa = Future.pure(10)
    const f = fa.then()
    assert.equal(f, fa)
  })

  it("then(onSuccess) behaves like map", () => {
    const s = new TestScheduler()

    const f = Future.pure(10, s).then(x => x * 2)
    assert.equal(f.value(), Some(Success(20)))
  })

  it("fa.then(null) <-> fa", () => {
    const s = new TestScheduler()
    const f = Future.pure(10, s).then(null, () => {})
    assert.equal(f.value(), Some(Success(10)))
  })

  it("then(onSuccess) behaves like flatMap", () => {
    const s = new TestScheduler()

    const f = Future.pure(10, s).then(x => Future.pure(x * 2))
    assert.equal(f.value(), Some(Success(20)))
  })

  it("raise(ex).then(f, null) <-> raise(ex)", () => {
    const ec = new TestScheduler()
    const dummy = new DummyError("dummy")
    const f: Future<number> =
      Future.raise(dummy, ec).then<number,number>(id, null)

    ec.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("Future.fromPromise(fa) === fa", () => {
    const fa = Future.pure(10)
    assert.equal(Future.fromPromise(fa), fa)
  })

  it("Future.fromPromise works for successful promises", () => {
    const fa: Future<number> = Future.fromPromise(new PromiseBox(Success(100)))
    assert.equal(fa.value(), Some(Success(100)))
  })

  it("Future.fromPromise works for failed promises", () => {
    const fa = Future.fromPromise(new PromiseBox(Failure("dummy")))
    assert.equal(fa.value(), Some(Failure("dummy")))
  })

  it("actual async functions await", () => {
    const f: Future<number> = Future.fromPromise(asyncSample(100))

    return f.then(num => {
      assert.equal(num, 50 * 99)
    })
  })

  it("actual async function await on triggered error", () => {
    const f: Future<number> = Future.fromPromise(asyncErrorSample(100))

    return f.then(num => {
      assert.equal(num, 110)
    })
  })

  it("converts to Promise if async", () => {
    const s = new TestScheduler()
    const p = Future.of(() => 1 + 1).toPromise()
    return p.then(num => assert.equal(num, 2))
  })

  it("converts to Promise if async error", () => {
    const dummy = new DummyError()
    const p = Future.of(() => { throw dummy }).toPromise()
    return p.then(null, err => assert.equal(err, dummy))
  })

  it("converts to Promise if pure", () => {
    const s = new TestScheduler()
    const p = Future.pure(2).toPromise()
    return p.then(num => assert.equal(num, 2))
  })

  it("converts to Promise if pure error", () => {
    const s = new TestScheduler()
    const dummy = new DummyError()
    const p = Future.raise(dummy).toPromise()
    return p.then(null, err => assert.equal(err, dummy))
  })
})

describe("Future delayTick + delayResult", () => {
  it("delayResult works for successful values", () => {
    const s = new TestScheduler()

    const f = Future.pure(1, s).delayResult(1000)
    assert.equal(f.value(), None)

    s.tick(1000)
    assert.equal(f.value(), Some(Success(1)))
  })

  it("delayResult works for failures", () => {
    const s = new TestScheduler()

    const dummy = new DummyError("dummy")
    const f = Future.raise(dummy, s).delayResult(1000)
    assert.equal(f.value(), None)

    s.tick(1000)
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("delayResult with global scheduler", () => {
    const f = Future.pure(1).delayResult(10)

    return f.map(x => {
      assert.equal(x, 1)
    })
  })

  it("delayedTick with global scheduler", () => {
    const f = Future.delayedTick(10)

    return f.map(x => {
      assert.equal(x, undefined)
    })
  })
})

describe("Future.sequence", () => {
  it("happy path", () => {
    const s = new TestScheduler()

    const f1 = Future.of(() => 1, s)
    const f2 = Future.of(() => 2, s)
    const f3 = Future.of(() => 3, s)

    const fl = Future.sequence([f1, f2, f3], s).map(_ => _.toString())
    assert.equal(fl.value(), None)

    s.tick()
    assert.equal(fl.value(), Some(Success("1,2,3")))
  })

  it("happy path with delayed results", () => {
    const s = new TestScheduler()
    let effect = 0

    const f1 = Future.of(() => 1, s).delayResult(1000).map(x => { effect += 1; return x })
    const f2 = Future.of(() => 2, s).delayResult(3000).map(x => { effect += 1; return x })
    const f3 = Future.of(() => 3, s).delayResult(2000).map(x => { effect += 1; return x })

    const fl = Future.sequence([f1, f2, f3], s).map(_ => _.toString())
    assert.equal(fl.value(), None)

    s.tick()
    assert.equal(effect, 0)
    assert.equal(fl.value(), None)

    s.tick(1000)
    assert.equal(effect, 1)
    assert.equal(fl.value(), None)

    s.tick(1000)
    assert.equal(effect, 2)
    assert.equal(fl.value(), None)

    s.tick(1000)
    assert.equal(effect, 3)
    assert.equal(fl.value(), Some(Success("1,2,3")))
  })

  it("sequence of empty list", () => {
    const list: Future<number>[] = []
    const all = Future.sequence(list).map(_ => _.toString())
    assert.equal(all.value(), Some(Success("")))
  })

  it("sequence of null list", () => {
    const all = Future.sequence((null as any) as any[]).map(_ => _.toString())
    assert.equal(all.value(), Some(Success("")))
  })

  it("on failure of a future, cancels all", () => {
    const s = new TestScheduler()
    let effect = 0
    const create = () => Future.create(_ => Cancelable.of(() => { effect += 1 }), s)

    const dummy = new DummyError("dummy")
    const fail = Future.raise(dummy, s).delayResult(2000)
    const all = Future.sequence([create(), create(), fail, create(), create()], s)

    s.tick()
    assert.equal(all.value(), None)
    assert.equal(effect, 0)

    s.tick(2000)
    assert.equal(all.value(), Some(Failure(dummy)))
    assert.equal(effect, 4)
  })

  it("works with actual Iterable", () => {
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

    assert.equal(f.value(), Some(Success(6)))
  })

  it("protects against broken Iterable", () => {
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
    assert.equal(all.value(), Some(Failure(dummy)))
    assert.equal(effect, 3)
  })

  it("map2", () => {
    const f = Future.map2(
      Future.pure(1), Future.pure(2),
      (a, b) => a + b
    )

    assert.equal(f.value(), Some(Success(3)))
  })

  it("map3", () => {
    const f = Future.map3(
      Future.pure(1), Future.pure(2), Future.pure(3),
      (a, b, c) => a + b + c
    )

    assert.equal(f.value(), Some(Success(6)))
  })

  it("map4", () => {
    const f = Future.map4(
      Future.pure(1), Future.pure(2), Future.pure(3), Future.pure(4),
      (a, b, c, d) => a + b + c + d
    )

    assert.equal(f.value(), Some(Success(10)))
  })

  it("map5", () => {
    const f = Future.map5(
      Future.pure(1), Future.pure(2), Future.pure(3), Future.pure(4), Future.pure(5),
      (a, b, c, d, e) => a + b + c + d + e
    )

    assert.equal(f.value(), Some(Success(15)))
  })

  it("map6", () => {
    const f = Future.map6(
      Future.pure(1), Future.pure(2), Future.pure(3), Future.pure(4), Future.pure(5), Future.pure(6),
      (a, b, c, d, e, f) => a + b + c + d + e + f
    )

    assert.equal(f.value(), Some(Success(21)))
  })

  it("protect against broken cancelable", () => {
    const ec = new TestScheduler()
    let effect = 0
    const never = () => Future.create(_ => Cancelable.of(() => { effect += 1 }), ec)

    const dummy = new DummyError("dummy")
    const fail = Future.create(_ => Cancelable.of(() => { throw dummy }), ec)

    const all = Future.sequence([never(), never(), fail, never(), never()], ec)
    all.cancel()

    assert.equal(effect, 4)
    const errs = ec.triggeredFailures()
    assert.equal(errs.length, 1)
    assert.equal(errs[0], dummy)
  })

  it("on failure signaling result is blocked", () => {
    const ec = new TestScheduler()
    const dummy1 = new DummyError("dummy1")
    const dummy2 = new DummyError("dummy1")

    const all = Future.sequence([
      Future.raise(dummy1, ec),
      Future.of(() => 1, ec),
      Future.of(() => null, ec).flatMap(_ => Future.raise(dummy2, ec))
    ], ec)

    ec.tick()
    assert.equal(all.value(), Some(Failure(dummy1)))
    assert.equal(ec.triggeredFailures().length, 1)
  })
})

describe("Future.firstCompletedOf", () => {
  it("happy path", () => {
    const f = Future.firstCompletedOf([Future.pure(1), Future.pure(2)])
    assert.equal(f.value(), Some(Success(1)))
  })

  it("timeout", () => {
    const ec = new TestScheduler()
    let effect = 0
    const never = Future.create(_ => Cancelable.of(() => { effect += 1 }), ec)

    const fa = never.timeout(Duration.of(1000))
    ec.tick()
    assert.equal(fa.value(), None)

    ec.tick(1000)
    const v = fa.value()

    assert.ok(!v.isEmpty())
    assert.ok(v.get().isFailure())
    assert.ok(v.get().failed().get() instanceof TimeoutError)
    assert.equal((v.get().failed().get() as TimeoutError).message, "1000 milliseconds")
    assert.equal(effect, 1)
  })

  it("timeoutTo", () => {
    const ec = new TestScheduler()
    let effect = 0
    const never = Future.create(_ => Cancelable.of(() => { effect += 1 }), ec)

    const fa = never.timeoutTo(1000, () => Future.pure(1000))
    ec.tick()
    assert.equal(fa.value(), None)

    ec.tick(1000)
    const v = fa.value()

    assert.equal(fa.value(), Some(Success(1000)))
    assert.equal(effect, 1)
  })

  it("report success, cancel the losers", () => {
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
    assert.equal(first.value(), Some(Success(2)))
    assert.equal(effect, 1 + 3)
  })

  it("report failure, cancel the losers", () => {
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
    assert.equal(first.value(), Some(Failure(dummy)))
    assert.equal(effect, 1 + 3)
  })

  it("works with actual Iterable", () => {
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
    assert.equal(f.value(), None)

    ec.tick(1000)
    assert.equal(f.value(), Some(Success(3)))
  })

  it("protects against broken Iterable", () => {
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
    assert.equal(all.value(), Some(Failure(dummy)))
    assert.equal(effect, 3)
  })

  it("signaling result is blocked after first", () => {
    const ec = new TestScheduler()
    const dummy1 = new DummyError("dummy1")
    const dummy2 = new DummyError("dummy1")

    const all = Future.firstCompletedOf([
      Future.raise(dummy1, ec),
      Future.of(() => 1, ec),
      Future.of(() => null, ec).flatMap(_ => Future.raise(dummy2, ec))
    ], ec)

    ec.tick()
    assert.equal(all.value(), Some(Failure(dummy1)))
    assert.equal(ec.triggeredFailures().length, 1)
  })

  it("protect against broken cancelable", () => {
    const ec = new TestScheduler()
    let effect = 0
    const never = () => Future.create(_ => Cancelable.of(() => { effect += 1 }), ec)

    const dummy = new DummyError("dummy")
    const fail = Future.create(_ => Cancelable.of(() => { throw dummy }), ec)

    const all = Future.firstCompletedOf([never(), never(), fail, never(), never()], ec)
    all.cancel()

    assert.equal(effect, 4)
    const errs = ec.triggeredFailures()
    assert.equal(errs.length, 1)
    assert.equal(errs[0], dummy)
  })

  it("empty list is illegal", () => {
    const f = Future.firstCompletedOf([])
    assert.ok(!f.value().isEmpty())
    assert.ok(f.value().get().isFailure())
    assert.ok(f.value().get().failed().get() instanceof IllegalArgumentError)
  })
})

describe("Future.traverse", () => {
  it("happy path for parallelism = 1, 2, 4, Infinity", () => {
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
      assert.not(all.value().isEmpty())
      assert.equal(all.value().get().get(), 110)
    }
  })

  it("parallelism <= 0 throws", () => {
    assert.throws(() => Future.traverse([], -1)(Future.pure))
  })

  it("empty list is empty", () => {
    const ec = new TestScheduler()
    const f = Future.traverse([], Infinity, ec)(Future.pure).map(_ => _.toString())

    ec.tick()
    assert.ok(is(f.value(), Some(Success(""))))
  })

  it("protect against user errors in generator", () => {
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
    assert.ok(is(f.value(), Some(Failure(dummy))))
    assert.equal(effect, 1 + 2 + 3 + 4 + 5)
  })

  it("handles null list", () => {
    const ec = new TestScheduler()
    const f = Future.traverse(null as any, Infinity, ec)(Future.pure).map(_ => _.toString())

    ec.tick()
    assert.ok(is(f.value(), Some(Success(""))))
  })

  it("works with actual Iterable", () => {
    const ec = new TestScheduler()

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

    const f = Future.traverse(iter as Iterable<number>, Infinity, ec)(x => Future.pure(x, ec))
      .map(arr => {
        let sum = 0
        for (const e of arr) sum += e
        return sum
      })

    ec.tick()
    assert.equal(f.value(), Some(Success(6)))
  })

  it("protects against broken Iterable", () => {
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

    const all = Future.traverse(iter as any, Infinity, ec)(x => Future.pure(x, ec))
    ec.tick()
    assert.equal(all.value(), Some(Failure(dummy)))
  })

  it("actual execution", () => {
    const list = [1, 2, 3]
    const fa = Future.traverse(list)(Future.pure)
      .map(arr => {
        let sum = 0
        for (const e of arr) sum += e
        return sum
      })

    return fa.toPromise().then(x => {
      assert.equal(x, 6)
    })
  })
})

describe("Future.tailRecM", () => {
  it("is tail safe", () => {
    const ec = new TestScheduler()
    const f = Scheduler.global.bind(ec, () =>
      Future.tailRecM(0, a => {
        return a < 10000
          ? Future.pure(Left(a + 1))
          : Future.pure(Right(a))
      }))

    assert.ok(is(f.value(), Some(Success(10000))))
  })
})

describe("Deferred", () => {
  it("tryComplete(Success) before any listener", () => {
    const ref = FutureMaker.empty<number>()
    assert.ok(ref.tryComplete(Success(1)))
    assert.not(ref.tryComplete(Success(2)))
    assert.equal(ref.future().value(), Some(Success(1)))
  })

  it("tryComplete(Failure) before any listener", () => {
    const ref = FutureMaker.empty<number>()
    assert.ok(ref.tryComplete(Failure(1)))
    assert.not(ref.tryComplete(Failure(2)))
    assert.equal(ref.future().value(), Some(Failure(1)))
  })

  it("complete() before any listener", () => {
    const ref = FutureMaker.empty<number>()
    ref.complete(Success(1))

    assert.throws(() => ref.complete(Success(2)))
    assert.equal(ref.future().value(), Some(Success(1)))
  })

  const testAsyncTryComplete = (r: Try<number>) => () => {
    const ec = new TestScheduler()
    const ref = FutureMaker.empty<number>(ec)
    const f1 = ref.future()
    const f2 = ref.future()

    ec.executeAsync(() => assert.ok(ref.tryComplete(r)))

    let result1: Option<Try<number>> = None
    f1.onComplete(r => { result1 = Some(r) })
    let result2: Option<Try<number>> = None
    f2.onComplete(r => { result2 = Some(r) })

    assert.equal(result1, None)
    assert.equal(result2, None)

    ec.tick()
    assert.equal(result1, Some(r))
    assert.equal(result2, Some(r))
    assert.not(ref.tryComplete(Success(2)))

    let result3: Option<Try<number>> = None
    f1.onComplete(r => { result3 = Some(r) })
    assert.equal(result3, Some(r))
  }

  it("tryComplete(Success) after listeners subscribe",
    testAsyncTryComplete(Success(1)))
  it("tryComplete(Failure) after listeners subscribe",
    testAsyncTryComplete(Failure(new DummyError())))

  it("chainTo", () => {
    const ec = new TestScheduler()

    const d0 = FutureMaker.empty<number>(ec)
    const d1 = FutureMaker.empty<number>(ec)
    const d2 = FutureMaker.empty<number>(ec)

    d1.chainTo(d0)
    d2.chainTo(d1)

    assert.ok(d1.tryComplete(Success(1)))
    assert.equal(d0.future().value(), Some(Success(1)))
    assert.not(d2.tryComplete(Success(2)))
    assert.equal(d2.future().value(), Some(Success(1)))
  })

  it("chainTo, with reversed chain order", () => {
    const ec = new TestScheduler()

    const d0 = FutureMaker.empty<number>(ec)
    const d1 = FutureMaker.empty<number>(ec)
    const d2 = FutureMaker.empty<number>(ec)

    d2.chainTo(d1)
    d1.chainTo(d0)

    assert.ok(d1.tryComplete(Success(1)))
    assert.equal(d0.future().value(), Some(Success(1)))
    assert.not(d2.tryComplete(Success(2)))
    assert.equal(d2.future().value(), Some(Success(1)))
  })

  it("chainTo >> value", () => {
    const ec = new TestScheduler()

    const d0 = FutureMaker.empty<number>(ec)
    const d1 = FutureMaker.empty<number>(ec)
    const d2 = FutureMaker.empty<number>(ec)

    d1.chainTo(d0)
    d2.chainTo(d1)

    assert.equal(d2.future().value(), None)
    assert.equal(d1.future().value(), None)

    d0.complete(Success(1))
    assert.equal(d2.future().value(), Some(Success(1)))
    assert.equal(d1.future().value(), Some(Success(1)))
  })

  it("chainTo transfers listeners to target", () => {
    const ec = new TestScheduler()

    const d0 = FutureMaker.empty<number>(ec)
    const d1 = FutureMaker.empty<number>(ec)
    const f1 = d1.future()

    let result0: Option<Try<number>> = None
    f1.onComplete(r => { result0 = Some(r) })
    let result1: Option<Try<number>> = None
    f1.onComplete(r => { result1 = Some(r) })

    // After onComplete
    d1.chainTo(d0)

    assert.equal(result0, None)
    assert.equal(result1, None)

    d1.complete(Success(1))
    assert.equal(result0, Some(Success(1)))
    assert.equal(result1, Some(Success(1)))
    assert.equal(d0.future().value(), Some(Success(1)))
  })

  it("double chainTo", () => {
    const ec = new TestScheduler()

    const d0 = FutureMaker.empty<number>(ec)
    const d1 = FutureMaker.empty<number>(ec)
    const d2 = FutureMaker.empty<number>(ec)

    d2.chainTo(d1)
    d2.chainTo(d0)

    let r0 = Option.empty<Try<number>>()
    d0.future().onComplete(r => { r0 = Some(r) })
    let r1 = Option.empty<Try<number>>()
    d1.future().onComplete(r => { r1 = Some(r) })
    let r2 = Option.empty<Try<number>>()
    d2.future().onComplete(r => { r2 = Some(r) })

    d0.complete(Success(1))

    assert.equal(r2, Some(Success(1)))
    assert.equal(r1, Some(Success(1)))
    assert.equal(r0, Some(Success(1)))
  })

  it("Deferred.successful(x).chainTo(other)", () => {
    const ec = new TestScheduler()

    const d0 = FutureMaker.completed(Success(1), ec)
    const d1 = FutureMaker.empty<number>(ec)
    d1.chainTo(d0)

    assert.not(d1.tryComplete(Success(2)))
    assert.equal(d1.future().value(), Some(Success(1)))
  })

  it("Deferred.empty().chainTo(successful)", () => {
    const ec = new TestScheduler()

    const d0 = FutureMaker.empty<number>(ec)
    const d1 = FutureMaker.completed(Success(1), ec)
    d1.chainTo(d0)

    assert.not(d1.tryComplete(Success(2)))
    assert.equal(d1.future().value(), Some(Success(1)))
  })

  it("withScheduler", () => {
    const ec = new TestScheduler().withExecutionModel(ExecutionModel.alwaysAsync())
    const defRef = FutureMaker.empty<number>()
    const ref = defRef.withScheduler(ec)

    assert.notEqual(defRef, ref)
    assert.equal(ref.withScheduler(ec), ref)

    let result: Option<Try<number>> = None
    ref.future().onComplete(r => { result = Some(r) })
    ref.complete(Success(1))

    assert.equal(result, None)
    ec.tick()
    assert.equal(result, Some(Success(1)))
  })

  it("Deferred.empty() defaults to Scheduler.global", () => {
    const defRef = FutureMaker.empty()
    assert.equal(defRef.withScheduler(Scheduler.global.get()), defRef)
  })

  it("Deferred.fromTry() defaults to Scheduler.global", () => {
    const defRef = FutureMaker.completed(Success(1))
    assert.equal(defRef.withScheduler(Scheduler.global.get()), defRef)
  })

  it("trySuccess", () => {
    const m = FutureMaker.empty()

    assert.ok(m.trySuccess(1))
    assert.equal(m.future().value(), Some(Success(1)))

    assert.not(m.trySuccess(2))
    assert.equal(m.future().value(), Some(Success(1)))
  })

  it("success", () => {
    const m = FutureMaker.empty()

    m.success(1)
    assert.equal(m.future().value(), Some(Success(1)))

    assert.throws(() => m.success(2))
    assert.equal(m.future().value(), Some(Success(1)))
  })

  it("tryFailure", () => {
    const m = FutureMaker.empty()

    assert.ok(m.tryFailure(1))
    assert.equal(m.future().value(), Some(Failure(1)))

    assert.not(m.tryFailure(2))
    assert.equal(m.future().value(), Some(Failure(1)))
  })

  it("failure", () => {
    const m = FutureMaker.empty()

    m.failure("err")
    assert.equal(m.future().value(), Some(Failure("err")))

    assert.throws(() => m.failure("err2"))
    assert.equal(m.future().value(), Some(Failure("err")))
  })
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

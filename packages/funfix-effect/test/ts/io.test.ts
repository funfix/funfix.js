/*!
 * Copyright (c) 2017-2018 by The Funfix Project Developers.
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

import * as jv from "jsverify"
import * as inst from "./instances"
import * as assert from "./asserts"

import {
  is,
  Try,
  Success,
  Failure,
  Left,
  Right,
  DummyError,
  Some, None, Option
} from "funfix-core"

import { HK } from "funland"
import { Equiv } from "funland-laws"
import { monadCheck } from "../../../../test-common"
import { TestScheduler, Future, ExecutionModel, Duration } from "funfix-exec"
import { IO, IOModule } from "../../src/"

describe("IOPure", () => {
  it("evaluates IO.pure(v).run() to Future.pure(v)", () => {
    const io = IO.pure(1)
    assert.equal(io.run().value(), Some(Success(1)))
  })

  it("evaluates IO.raise(e).run() to Future.raise(e)", () => {
    const io = IO.raise("dummy")
    assert.equal(io.run().value(), Some(Failure("dummy")))
  })

  it("evaluates IO.pure(v).runOnComplete()", () => {
    let result: Option<Try<number>> = None
    IO.pure(1).runOnComplete(r => { result = Some(r as any) })
    assert.equal(result, Some(Success(1)))
  })

  it("evaluates IO.raise(e).runOnComplete()", () => {
    let result: Option<Try<number>> = None
    IO.raise("error").runOnComplete(r => { result = Some(r as any) })
    assert.equal(result, Some(Failure("error")))
  })

  it("is stack safe in flatMap shallow loop (run)", () => {
    const ec = scheduler()
    const io = flatShallowLoop(10000, x => IO.pure(x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in flatMap shallow loop (runOnComplete)", () => {
    const ec = scheduler()
    const io = flatShallowLoop(5000, x => IO.pure(x))
    let result: Option<Try<any>> = None
    io.runOnComplete(r => { result = Some(r) }, ec)

    assert.equal(result, None); ec.tick()
    assert.equal(result, Some(Success(0)))
  })

  it("is stack safe in flatMap eager loop (run)", () => {
    const ec = scheduler()
    const io = flatEagerLoop(2000, x => IO.pure(x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in flatMap eager loop (runOnComplete)", () => {
    const ec = scheduler()
    const io = flatEagerLoop(5000, x => IO.pure(x))
    let result: Option<Try<any>> = None
    io.runOnComplete(r => { result = Some(r) }, ec)

    assert.equal(result, None); ec.tick()
    assert.equal(result, Some(Success(0)))
  })

  it("is stack safe in suspend loop", () => {
    const ec = scheduler()
    const io = suspendLoop(10000, x => IO.pure(x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })
})

describe("IO.always", () => {
  it("is stack safe in flatMap shallow loop", () => {
    const ec = scheduler()
    const io = flatShallowLoop(10000, x => IO.always(() => x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in flatMap eager loop", () => {
    const ec = scheduler()
    const io = flatEagerLoop(2000, x => IO.always(() => x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in suspend loop", () => {
    const ec = scheduler()
    const io = suspendLoop(10000, x => IO.always(() => x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })
})

describe("IO.once", () => {
  let ec: TestScheduler

  before(() => {
    ec = scheduler()
  })

  it("is stack safe in flatMap shallow loop", () => {
    const io = flatShallowLoop(10000, x => IO.once(() => x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in flatMap eager loop", () => {
    const io = flatEagerLoop(2000, x => IO.once(() => x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in suspend loop", () => {
    const io = suspendLoop(10000, x => IO.once(() => x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })
})

describe("IO.async", () => {
  let ec: TestScheduler

  before(() => {
    ec = scheduler()
  })

  it("is stack safe in flatMap shallow loop", () => {
    const io = flatShallowLoop(10000, x => IO.async<number>((ec, cb) => cb(Success(x))))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in flatMap eager loop", () => {
    const io = flatEagerLoop(2000, x => IO.async<number>((ec, cb) => cb(Success(x))))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in suspend loop", () => {
    const io = suspendLoop(10000, x => IO.async<number>((ec, cb) => cb(Success(x))))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("protects against multiple callback calls", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")

    const io = IO.async((ec, cb) => {
      cb(Success(1))
      cb(Success(2))
      cb(Failure(dummy))
    })

    const f = io.run(ec); ec.tick()
    assert.equal(f.value(), Some(Success(1)))
    assert.ok(ec.triggeredFailures().length > 0)
    assert.equal(ec.triggeredFailures()[0], dummy)
  })

  it("protects against user error", () => {
    const ec = scheduler()
    const dummy = new DummyError("registration1")
    const io = IO.async(() => { throw dummy })

    const f = io.run(ec); ec.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("reports error in registration after callback was called", () => {
    const ec = scheduler()
    const dummy = new DummyError("registration2")
    const io = IO.async<number>((ec, cb) => { cb(Success(1)); throw dummy })

    const f = io.run(ec); ec.tick()
    assert.equal(f.value(), Some(Success(1)))
    assert.ok(ec.triggeredFailures().length > 0)
    assert.equal(ec.triggeredFailures()[0].message, dummy.message)
  })
})

describe("IO (error recovery)", () => {
  it("protects against errors in map", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.pure(1).map(() => { throw dummy })
    assert.equal(io.run(ec).value(), Some(Failure(dummy)))
  })

  it("recovers from failure with run()", () => {
    const ec = scheduler()
    const io = IO.raise<number>("error").recoverWith(e => {
      if (e === "error") return IO.pure(100)
      return IO.raise(e)
    })

    const f = io.run(ec)
    ec.tick()
    assert.equal(f.value(), Some(Success(100)))
  })

  it("recovers from failure with runOnComplete()", () => {
    const ec = scheduler()
    const io = IO.raise<number>("error").recoverWith(e => {
      if (e === "error") return IO.pure(100)
      return IO.raise(e)
    })

    let result: Option<Try<number>> = None
    io.runOnComplete((r: Try<number>) => { result = Some(r) })

    ec.tick()
    assert.equal(result, Some(Success(100)))
  })

  it("protects flatMap against user error (run)", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.pure(1).flatMap(() => { throw dummy })
    const f = io.run(ec)

    ec.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("protects flatMap against user error (runOnComplete)", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.pure(1).flatMap(() => { throw dummy })

    let result: Option<Try<any>> = None
    io.runOnComplete(r => { result = Some(r) }, ec)

    ec.tick()
    assert.equal(result, Some(Failure(dummy)))
  })

  it("recovers from user error in flatMap (run)", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.pure(1).flatMap(() => { throw dummy })
      .recoverWith(e => {
        if (e === dummy) return IO.pure(100)
        return IO.raise(e)
      })

    const f = io.run(ec)

    ec.tick()
    assert.equal(f.value(), Some(Success(100)))
  })

  it("recovers from user error in flatMap (runOnComplete)", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.pure(1).flatMap(() => { throw dummy })
      .recoverWith(e => {
        if (e === dummy) return IO.pure(100)
        return IO.raise(e)
      })

    let result: Option<Try<any>> = None
    io.runOnComplete(r => { result = Some(r) }, ec)

    ec.tick()
    assert.equal(result, Some(Success(100)))
  })

  it("protects against user errors in recoverWith (run)", () => {
    const ec = scheduler()
    const dummy1 = new DummyError("dummy1")
    const dummy2 = new DummyError("dummy2")

    const io = IO.raise<number>(dummy1)
      .recoverWith(() => { throw dummy2 })
      .recoverWith(() => {
        return IO.pure(100)
        // return IO.raise(e)
      })

    const f = io.run(ec)
    ec.tick()
    assert.equal(f.value(), Some(Success(100)))
  })

  it("protects against user errors in recoverWith (runOnComplete)", () => {
    const ec = scheduler()
    const dummy1 = new DummyError("dummy1")
    const dummy2 = new DummyError("dummy2")

    const io = IO.raise<number>(dummy1).recoverWith(() => { throw dummy2 })
      .recoverWith(e => {
        if (e === dummy2) return IO.pure(100)
        return IO.raise(e)
      })

    let result: Option<Try<any>> = None
    io.runOnComplete(r => { result = Some(r) }, ec)

    ec.tick()
    assert.equal(result, Some(Success(100)))
  })

  it("recovers with recover", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.raise<number>(dummy).recover(e => e === dummy ? 10 : 0)

    const f = io.run(ec); ec.tick()
    assert.equal(f.value(), Some(Success(10)))
  })

  it("recovers with transform", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.raise<number>(dummy).transform(
      e => e === dummy ? 10 : 0,
      v => v + 1
    )

    const f = io.run(ec); ec.tick()
    assert.equal(f.value(), Some(Success(10)))
  })

  it("recovers with transformWith", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.raise<number>(dummy).transformWith(
      e => e === dummy ? IO.pure(10) : IO.raise(e),
      v => IO.pure(v + 1)
    )

    const f = io.run(ec); ec.tick()
    assert.equal(f.value(), Some(Success(10)))
  })

  it("returns Left on IO.raise", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const f = IO.raise(dummy).attempt().run(ec)
    assert.equal(f.value(), Some(Success(Left(dummy))))
  })

  it("returns Right on success", () => {
    const ec = scheduler()
    const f = IO.pure(1).attempt().run(ec)
    assert.equal(f.value(), Some(Success(Right(1))))
  })

  it("reports errors during async boundaries", () => {
    const ec = scheduler()

    const io = IO.asyncUnsafe((ctx, cb) => {
      cb(Failure("dummy1"))
      cb(Failure("dummy2"))
      cb(Success(1))
      cb(Failure("dummy3"))
    })

    const f = io.run(ec); ec.tick()
    assert.equal(f.value(), Some(Failure("dummy1")))
    assert.equal(ec.triggeredFailures().length, 2)
    assert.equal(ec.triggeredFailures()[0], "dummy2")
    assert.equal(ec.triggeredFailures()[1], "dummy3")
  })
})

describe("IO.map", () => {
  it("works", () => {
    const ec = scheduler()
    const io = IO.pure(1).map(x => x + 1)
    assert.equal(io.run(ec).value(), Some(Success(2)))
  })

  it("protects against user error", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.pure(1).map(() => { throw dummy })
    assert.equal(io.run(ec).value(), Some(Failure(dummy)))
  })

  it("does forEach", () => {
    const ec = scheduler()
    let effect = 0

    const io = IO.pure(10).forEach(x => { effect += x })
    assert.equal(effect, 0)

    io.run(ec); ec.tick()
    assert.equal(effect, 10)
  })

  jv.property("map(f) <-> flatMap(x => pure(f(x)))",
    inst.arbIONum, jv.fun(jv.number),
    (fa, f) => {
      const ec = scheduler()
      const f1 = fa.map(f).run(ec)
      const f2 = fa.flatMap(x => IO.pure(f(x))).run(ec)
      ec.tick()
      return f1.value().equals(f2.value())
    })

  jv.property("map(f) <-> transform(_, f)",
    inst.arbIONum, jv.fun(jv.number),
    (fa, f) => {
      const ec = scheduler()
      const f1 = fa.map(f).run(ec)
      const f2 = fa.transform(e => { throw e }, f).run(ec)
      ec.tick()
      return f1.value().equals(f2.value())
    })
})

describe("IO.tailRecM", () => {
  it("is stack safe", () => {
    const ec = scheduler()
    const fa = IO.tailRecM(0, a => IO.now(a < 1000 ? Left(a + 1) : Right(a)))
    const fu = fa.run(ec)
    ec.tick()
    assert.equal(fu.value(), Some(Success(1000)))
  })

  it("returns the failure unchanged", () => {
    const ec = scheduler()
    const fa = IO.tailRecM(0, () => IO.raise("failure"))
    const fu = fa.run(ec)
    ec.tick()
    assert.equal(fu.value(), Some(Failure("failure")))
  })

  it("protects against user errors", () => {
    const ec = scheduler()
    // tslint:disable:no-string-throw
    const fa = IO.tailRecM(0, () => { throw "dummy" })
    const fu = fa.run(ec)
    assert.equal(fu.value(), Some(Failure("dummy")))
  })
})

describe("IO builders", () => {
  it("always repeats side effects", () => {
    const ec = scheduler()
    let effect = 0

    const io = IO.always(() => { effect += 1; return effect })

    const f1 = io.run(ec); ec.tick()
    assert.equal(f1.value(), Some(Success(1)))
    const f2 = io.run(ec); ec.tick()
    assert.equal(f2.value(), Some(Success(2)))
  })

  it("always protects against user error", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.always(() => { throw dummy })
    assert.equal(io.run(ec).value(), Some(Failure(dummy)))
  })

  it("once does memoization", () => {
    const ec = scheduler()
    let effect = 0

    const io = IO.once(() => { effect += 1; return effect })

    const f1 = io.run(ec); ec.tick()
    assert.equal(f1.value(), Some(Success(1)))
    const f2 = io.run(ec); ec.tick()
    assert.equal(f2.value(), Some(Success(1)))
  })

  it("once protects against user error", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.once(() => { throw dummy })
    assert.equal(io.run(ec).value(), Some(Failure(dummy)))
  })

  it("IO.fromTry(Success(1)) <-> IO.pure(1)", () => {
    const ec = scheduler()
    assert.equal(IO.fromTry(Success(1)).run(ec).value(), Some(Success(1)))
  })

  it("IO.fromTry(Failure(e)) <-> IO.raise(e)", () => {
    const ec = scheduler()
    assert.equal(IO.fromTry(Failure("error")).run(ec).value(), Some(Failure("error")))
  })

  it("converts fromFuture(Future.pure(v))", () => {
    const ec = scheduler()
    const f = IO.fromFuture(Future.pure(1)).run(ec)
    assert.equal(f.value(), Some(Success(1)))
  })

  it("converts fromFuture(Future.raise(v))", () => {
    const ec = scheduler()
    const f = IO.fromFuture(Future.raise("error")).run(ec)
    assert.equal(f.value(), Some(Failure("error")))
  })

  it("converts deferFuture(() => Future.of(f))", () => {
    const ec = scheduler()
    let effect = 0
    const f = IO.deferFuture(() => Future.of(() => { effect += 1; return 1 }, ec)).run(ec)

    ec.tick()
    assert.equal(f.value(), Some(Success(1)))
    assert.equal(effect, 1)
  })

  it("converts deferFuture(() => Future.of(throw))", () => {
    const ec = scheduler()
    const dummy = new DummyError()
    let effect = 0
    const f = IO.deferFuture(() => Future.of(() => { effect += 1; throw dummy }, ec)).run(ec)

    ec.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
    assert.equal(effect, 1)
  })

  it("converts deferFutureAction(() => Future.of(f))", () => {
    const ec = scheduler()

    let effect = 0
    const f = IO.deferFutureAction(ec => Future.of(() => { effect += 1; return 1 }, ec)).run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(1)))
    assert.equal(effect, 1)
  })

  it("converts deferFutureAction(() => Future.of(throw))", () => {
    const ec = scheduler()
    const dummy = new DummyError()

    let effect = 0
    const f = IO.deferFutureAction(ec => Future.of(() => { effect += 1; throw dummy }, ec)).run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
    assert.equal(effect, 1)
  })

  it("deferAction", () => {
    const ec = scheduler()
    ec.tick(1000)

    assert.equal(ec.currentTimeMillis(), 1000)
    const f = IO.deferAction(ec => IO.pure(ec.currentTimeMillis())).run(ec)
    assert.equal(f.value(), Some(Success(1000)))
  })

  it("deferAction protects against user error", () => {
    const ec = scheduler()
    const dummy = new DummyError()
    const f = IO.deferAction<number>(() => { throw dummy }).run(ec)
    assert.equal(f.value(), Some(Failure(dummy)))
  })
})

describe("IO aliases", () => {
  jv.property("chain(f) <-> flatMap(f)",
    inst.arbIONum, jv.fun(inst.arbIONum),
    (fa, f) => {
      const ec = scheduler()
      const f1 = fa.flatMap(f).run(ec)
      const f2 = fa.chain(f).run(ec)
      ec.tick()
      return f1.value().equals(f2.value())
    })

  jv.property("fa.followedBy(fb) <-> fa.flatMap(_ => fb)",
    inst.arbIONum, inst.arbIONum,
    (fa, fb) => {
      const ec = scheduler()
      const f1 = fa.followedBy(fb).run(ec)
      const f2 = fa.flatMap(() => fb).run(ec)
      ec.tick()
      return f1.value().equals(f2.value())
    })

  jv.property("fa.forEffect(fb) <-> fa.flatMap(a => fb.map(_ => a))",
    inst.arbIONum, inst.arbIONum,
    (fa, fb) => {
      const ec = scheduler()
      const f1 = fa.forEffect(fb).run(ec)
      const f2 = fa.flatMap(a => fb.map(() => a)).run(ec)
      ec.tick()
      return f1.value().equals(f2.value())
    })

  jv.property("of(f) <-> always(f)",
    jv.fun(jv.number),
    (f) => {
      const ec = scheduler()
      const f1 = IO.of(() => f(null)).run(ec)
      const f2 = IO.always(() => f(null)).run(ec)
      ec.tick()
      return f1.value().equals(f2.value())
    })

  jv.property("suspend(f) <-> unit.flatMap(_ => f())",
    inst.arbIONum,
    (fa) => {
      const ec = scheduler()
      const f1 = IO.suspend(() => fa).run(ec)
      const f2 = IO.unit().flatMap(() => fa).run(ec)
      ec.tick()
      return f1.value().equals(f2.value())
    })

  jv.property("defer(f) <-> unit.flatMap(_ => f())",
    inst.arbIONum,
    (fa) => {
      const ec = scheduler()
      const f1 = IO.defer(() => fa).run(ec)
      const f2 = IO.unit().flatMap(() => fa).run(ec)
      ec.tick()
      return f1.value().equals(f2.value())
    })
})

describe("IO run-loop", () => {
  it("does processing in batches (run)", () => {
    const ec = scheduler().withExecutionModel(ExecutionModel.batched())
    let effect = 0

    const io = flatShallowLoop(1000, x => IO.of(() => {
      effect += 1
      return x
    }))

    const f = io.run(ec)
    assert.equal(effect, 128)
    ec.tickOne()
    assert.equal(effect, 256)
    ec.tick()
    assert.equal(effect, 1001)
    assert.equal(f.value(), Some(Success(0)))
  })

  it("does processing in batches (runOnComplete)", () => {
    const ec = scheduler().withExecutionModel(ExecutionModel.batched())
    let effect = 0

    const io = flatShallowLoop(1000, x => IO.of(() => {
      effect += 1
      return x
    }))

    let result: Option<Try<any>> = None
    io.runOnComplete(r => { result = Some(r) }, ec)
    assert.equal(effect, 128)

    ec.tickOne()
    assert.equal(effect, 256)

    ec.tick()
    assert.equal(effect, 1001)
    assert.equal(result, Some(Success(0)))
  })

  it("can be auto-cancelable (run)", () => {
    const ec = scheduler().withExecutionModel(ExecutionModel.batched())
    let effect = 0

    const io = flatShallowLoop(1000, x => IO.of(() => {
      effect += 1
      return x
    }))

    const f = io
      .executeWithOptions({ autoCancelableRunLoops: true })
      .run(ec)

    assert.equal(effect, 128)
    f.cancel()

    ec.tick()
    assert.equal(effect, 256)
    assert.not(ec.hasTasksLeft())
    assert.equal(f.value(), None)
  })

  it("can be auto-cancelable (runOnComplete)", () => {
    const ec = scheduler().withExecutionModel(ExecutionModel.batched())
    let effect = 0

    const io = flatShallowLoop(1000, x => IO.of(() => {
      effect += 1
      return x
    }))

    let result: Option<Try<any>> = None
    const c = io
      .executeWithOptions({ autoCancelableRunLoops: true })
      .runOnComplete((r: any) => { result = r }, ec)

    assert.equal(effect, 128)
    c.cancel()

    ec.tick()
    assert.equal(effect, 256)
    assert.not(ec.hasTasksLeft())
    assert.equal(result, None)
  })

  it("can auto-cancel at any async boundary (run)", () => {
    const ec = scheduler()
    const io = IO.asyncUnsafe<number>((ctx, cb) => {
      ctx.scheduler.executeAsync(() => cb(Success(1)))
    })

    const f = io.flatMap(() => io).executeWithOptions({ autoCancelableRunLoops: true }).run(ec)
    f.cancel()

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), None)
    assert.not(ec.hasTasksLeft())
  })

  it("can auto-cancel at any async boundary (runOnComplete)", () => {
    const ec = scheduler()
    const io = IO.asyncUnsafe<number>((ctx, cb) => {
      ctx.scheduler.executeAsync(() => cb(Success(1)))
    })

    let result: Option<Try<any>> = None
    const c = io
      .executeWithOptions({ autoCancelableRunLoops: true })
      .runOnComplete(r => { result = Some(r) })

    c.cancel()
    ec.tick()
    assert.equal(result, None)
    assert.not(ec.hasTasksLeft())
  })

  it("process pure(n).map(f) in alwaysAsync mode (run)", () => {
    const ec = scheduler().withExecutionModel(ExecutionModel.alwaysAsync())
    const f = IO.pure(1).map(x => x + 1).run(ec)

    assert.equal(f.value(), None); ec.tickOne()
    assert.equal(f.value(), Some(Success(2)))
  })

  it("process pure(n).map(f) in alwaysAsync mode (runOnComplete)", () => {
    const ec = scheduler().withExecutionModel(ExecutionModel.alwaysAsync())
    let result: Option<Try<any>> = None
    IO.pure(1).map(x => x + 1).runOnComplete(r => { result = Some(r) }, ec)

    assert.equal(result, None); ec.tickOne()
    assert.equal(result, Some(Success(2)))
  })

  it("can process in alwaysAsync mode (run)", () => {
    const ec = scheduler().withExecutionModel(ExecutionModel.alwaysAsync())
    let effect = 0

    const io = flatShallowLoop(1000, x => IO.of(() => {
      effect += 1
      return x
    }))

    const f = io.run(ec)
    assert.equal(effect, 1)

    ec.tickOne()
    assert.equal(effect, 2)
    ec.tickOne()
    assert.equal(effect, 3)

    ec.tick()
    assert.equal(effect, 1001)
    assert.equal(f.value(), Some(Success(0)))
  })

  it("can process in alwaysAsync mode (runOnComplete)", () => {
    const ec = scheduler().withExecutionModel(ExecutionModel.alwaysAsync())
    let effect = 0

    const io = flatShallowLoop(1000, x => IO.of(() => {
      effect += 1
      return x
    }))

    let result: Option<Try<any>> = None
    io.runOnComplete(r => { result = Some(r) }, ec)
    assert.equal(effect, 1)

    ec.tickOne()
    assert.equal(effect, 2)
    ec.tickOne()
    assert.equal(effect, 3)

    ec.tick()
    assert.equal(effect, 1001)
    assert.equal(result, Some(Success(0)))
  })

  it("can mark async boundary (run)", () => {
    const asyncEC = scheduler()

    function signal(n: number): IO<number> {
      return IO.asyncUnsafe<number>((ctx, cb) => {
        asyncEC.executeAsync(() => {
          ctx.markAsyncBoundary()
          cb(Success(n))
        })
      })
    }

    const ec1 = scheduler().withExecutionModel(ExecutionModel.batched())
    const f1 = Future.unit(ec1).flatMap(Future.pure)
      .flatMap(() => IO.pure(1).flatMap(IO.pure).run(ec1))
      .map(() => ec1.batchIndex)

    ec1.tick()
    asyncEC.tick()
    assert.equal(f1.value(), Some(Success(4)))

    const ec2 = scheduler()
    const f2 = Future.unit(ec2).flatMap(Future.pure)
      .flatMap(() => IO.pure(1).flatMap(signal).run(ec2))
      .map(() => ec2.batchIndex)

    ec2.tick()
    asyncEC.tick()
    assert.equal(f2.value(), Some(Success(0)))
  })

  it("can override the execution model", () => {
    const ec = scheduler()
    const f = IO.pure(1).map(x => x + 1)
      .executeWithModel(ExecutionModel.alwaysAsync())
      .run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(2)))
  })
})

describe("IO.memoize", () => {
  it("works for subsequent subscribers after finish", () => {
    const ec = scheduler()

    let effect = 0
    const io = IO
      .suspend(() => { effect += 1; return IO.pure(effect) })
      .memoize()

    const f1 = io.run(ec)
    assert.equal(f1.value(), Some(Success(1)))
    const f2 = io.run(ec)
    assert.equal(f2.value(), Some(Success(1)))
    const f3 = io.run(ec)
    assert.equal(f3.value(), Some(Success(1)))
  })

  it("works for subsequent subscribers during processing", () => {
    const ec = scheduler()

    let effect = 0
    const io = IO
      .deferFuture(() => Future.of(() => { effect += 1; return effect }, ec))
      .map(_ => _ + 1)
      .memoize()
      .map(_ => _ + 1)

    const f1 = io.run(ec)
    const f2 = io.run(ec)
    const f3 = io.run(ec)

    assert.equal(f1.value(), None)
    assert.equal(f2.value(), None)
    assert.equal(f3.value(), None)

    ec.tick()
    assert.equal(f1.value(), Some(Success(3)))
    assert.equal(f2.value(), Some(Success(3)))
    assert.equal(f3.value(), Some(Success(3)))

    const f4 = io.run(ec)
    assert.equal(f4.value(), Some(Success(3)))
  })

  it("caches failures", () => {
    const ec = scheduler()
    let effect = 0
    const io = IO
      .defer(() => { effect += 1; return IO.raise(effect) })
      .memoize()

    const f1 = io.run(ec)
    assert.equal(f1.value(), Some(Failure(1)))
    const f2 = io.run(ec)
    assert.equal(f2.value(), Some(Failure(1)))
    const f3 = io.run(ec)
    assert.equal(f3.value(), Some(Failure(1)))
  })

  jv.property("returns same reference on double call",
    inst.arbIONum,
    fa => {
      const mem = fa.memoize()
      return mem === mem.memoize()
    })

  it("memoizes IO.always", () => {
    const ec = scheduler()
    let effect = 0
    const io = IO
      .always(() => { effect += 1; return effect })
      .memoize()

    assert.equal(io._tag, "once")
    assert.equal(io.run(ec).value(), Some(Success(1)))
    assert.equal(io.run(ec).value(), Some(Success(1)))
  })

  it("returns same reference on IO.once", () => {
    const io = IO.once(() => 1)
    assert.equal(io.memoize(), io)
  })

  it("memoizes errors for IO.always(f).memoizeOnSuccess().memoize()", () => {
    const ec = scheduler()
    const dummy = new DummyError()
    let effect = 0
    const io = IO
      .always(() => { effect += 1; throw dummy })
      .memoizeOnSuccess()

    const io2 = io.memoize()

    assert.notEqual(io, io2)
    assert.equal(io2._tag, "once")

    assert.equal(io2.run(ec).value(), Some(Failure(dummy)))
    assert.equal(effect, 1)
    assert.equal(io2.run(ec).value(), Some(Failure(dummy)))
    assert.equal(effect, 1)
  })

  it("memoizes errors for IO.async().memoizeOnSuccess().memoize()", () => {
    const ec = scheduler()
    const dummy = new DummyError()
    let effect = 0
    const io = IO
      .async((ec, cb) => { effect += 1; cb(Failure(dummy)) })
      .memoizeOnSuccess()

    const io2 = io.memoize()
    assert.equal(io._tag, "memoize")
    assert.equal(io2._tag, "memoize")
    assert.notEqual(io, io2)

    const f1 = io2.run(ec); ec.tick()
    assert.equal(f1.value(), Some(Failure(dummy)))
    assert.equal(effect, 1)

    const f2 = io2.run(ec); ec.tick()
    assert.equal(f2.value(), Some(Failure(dummy)))
    assert.equal(effect, 1)
  })
})

describe("IO.memoizeOnSuccess", () => {
  it("returns same reference for IO.pure", () => {
    const io = IO.pure(1)
    assert.equal(io.memoizeOnSuccess(), io)
  })

  it("returns same reference for IO.raise", () => {
    const io = IO.raise("error")
    assert.equal(io.memoizeOnSuccess(), io)
  })

  it("returns same reference for IO.once(f)", () => {
    const io = IO.once(() => 1)
    assert.equal(io.memoizeOnSuccess(), io)
  })

  it("repeats processing of IO.always on error", () => {
    let effect = 0
    const dummy = new DummyError()
    const io = IO
      .always(() => { effect += 1; throw dummy })
      .memoizeOnSuccess()

    const f1 = io.run()
    assert.equal(f1.value(), Some(Failure(dummy)))
    assert.equal(effect, 1)

    const f2 = io.run()
    assert.equal(f2.value(), Some(Failure(dummy)))
    assert.equal(effect, 2)

    const f3 = io.run()
    assert.equal(f3.value(), Some(Failure(dummy)))
    assert.equal(effect, 3)
  })

  it("memoizes IO.always", () => {
    const ec = scheduler()
    let effect = 0
    const io = IO
      .always(() => { effect += 1; return effect })
      .memoizeOnSuccess()

    assert.equal(io._tag, "once")
    assert.equal(io.run(ec).value(), Some(Success(1)))
    assert.equal(io.run(ec).value(), Some(Success(1)))
  })

  jv.property("returns same reference on double call",
    inst.arbIONum,
    fa => {
      const mem = fa.memoizeOnSuccess()
      return mem === mem.memoizeOnSuccess()
    })

  jv.property("returns same reference after memoize()",
    inst.arbIONum,
    fa => {
      const mem = fa.memoize()
      return mem === mem.memoizeOnSuccess()
    })

  it("works for subsequent subscribers after finish", () => {
    const ec = scheduler()

    let effect = 0
    const io = IO
      .suspend(() => { effect += 1; return IO.pure(effect) })
      .memoizeOnSuccess()

    const f1 = io.run(ec)
    assert.equal(f1.value(), Some(Success(1)))
    const f2 = io.run(ec)
    assert.equal(f2.value(), Some(Success(1)))
    const f3 = io.run(ec)
    assert.equal(f3.value(), Some(Success(1)))
  })

  it("works for subsequent subscribers during processing", () => {
    const ec = scheduler()

    let effect = 0
    const io = IO
      .deferFuture(() => Future.of(() => { effect += 1; return effect }, ec))
      .map(_ => _ + 1)
      .memoizeOnSuccess()
      .map(_ => _ + 1)

    const f1 = io.run(ec)
    const f2 = io.run(ec)
    const f3 = io.run(ec)

    assert.equal(f1.value(), None)
    assert.equal(f2.value(), None)
    assert.equal(f3.value(), None)

    ec.tick()
    assert.equal(f1.value(), Some(Success(3)))
    assert.equal(f2.value(), Some(Success(3)))
    assert.equal(f3.value(), Some(Success(3)))

    const f4 = io.run(ec)
    assert.equal(f4.value(), Some(Success(3)))
  })

  it("does not caches failures", () => {
    const ec = scheduler()
    let effect = 0
    const io = IO
      .defer(() => { effect += 1; return IO.raise(effect) })
      .memoizeOnSuccess()

    const f1 = io.run(ec); ec.tick()
    assert.equal(f1.value(), Some(Failure(1)))
    const f2 = io.run(ec); ec.tick()
    assert.equal(f2.value(), Some(Failure(2)))
    const f3 = io.run(ec); ec.tick()
    assert.equal(f3.value(), Some(Failure(3)))
  })

  it("does not cache failures for async IOs", () => {
    const ec = scheduler()
    let effect = 0
    const io = IO
      .async((ec, cb) => ec.executeAsync(() => {
        effect += 1
        if (effect < 3) cb(Failure(effect))
        else cb(Success(effect))
      }))
      .memoizeOnSuccess()

    const f1 = io.run(ec); ec.tick()
    assert.equal(f1.value(), Some(Failure(1)))
    const f2 = io.run(ec); ec.tick()
    assert.equal(f2.value(), Some(Failure(2)))
    const f3 = io.run(ec); ec.tick()
    assert.equal(f3.value(), Some(Success(3)))
    const f4 = io.run(ec); ec.tick()
    assert.equal(f4.value(), Some(Success(3)))
  })
})

describe("IO.shift", () => {
  it("can shift before evaluation", () => {
    const ec = scheduler()
    let effect = 0

    const io = IO.of(() => { effect += 1; return effect })
      .executeForked()

    const f = io.run(ec)
    assert.equal(effect, 0)
    assert.equal(f.value(), None)

    ec.tickOne()
    assert.equal(f.value(), Some(Success(1)))
  })

  it("fa.executeForked <-> IO.fork(fa)", () => {
    const ec = scheduler()
    let effect = 0

    const io = IO.fork(IO.of(() => { effect += 1; return effect }))

    const f = io.run(ec)
    assert.equal(effect, 0)
    assert.equal(f.value(), None)

    ec.tickOne()
    assert.equal(f.value(), Some(Success(1)))
  })

  it("can do fork for real", () => {
    let effect = 0

    const io = IO.of(() => { effect += 1; return effect })
      .executeForked()
      .run()

    return io.then(value => {
      assert.equal(value, 1)
    })
  })

  it("can shift after evaluation", () => {
    const ec = scheduler()
    let effect = 0

    const io = IO.of(() => { effect += 1; return effect })
      .asyncBoundary(ec)

    const f = io.run(ec)
    assert.equal(effect, 1)
    assert.equal(f.value(), None)

    ec.tickOne()
    assert.equal(f.value(), Some(Success(1)))
  })

  it("can do async boundary for real", () => {
    let effect = 0

    const io = IO.of(() => { effect += 1; return effect })
      .asyncBoundary()
      .run()

    return io.then(value => {
      assert.equal(value, 1)
    })
  })
})

describe("IO.sequence", () => {
  it("works", () => {
    const ec = scheduler()
    const all = [IO.pure(1), IO.pure(2), IO.pure(3)]

    const io = IO.sequence(all).map(lst => {
      let sum = 0
      for (let i = 0; i < lst.length; i++) sum += lst[i]
      return sum
    })

    assert.equal(io.run(ec).value(), Some(Success(6)))
  })

  it("map2", () => {
    const ec = scheduler()
    const f = IO.map2(
      IO.pure(1), IO.pure(2),
      (a, b) => a + b
    )

    assert.equal(f.run(ec).value(), Some(Success(3)))
  })

  it("map3", () => {
    const ec = scheduler()
    const f = IO.map3(
      IO.pure(1), IO.pure(2), IO.pure(3),
      (a, b, c) => a + b + c
    )

    assert.equal(f.run(ec).value(), Some(Success(6)))
  })

  it("map4", () => {
    const ec = scheduler()
    const f = IO.map4(
      IO.pure(1), IO.pure(2), IO.pure(3), IO.pure(4),
      (a, b, c, d) => a + b + c + d
    )

    assert.equal(f.run(ec).value(), Some(Success(10)))
  })

  it("map5", () => {
    const ec = scheduler()
    const f = IO.map5(
      IO.pure(1), IO.pure(2), IO.pure(3), IO.pure(4), IO.pure(5),
      (a, b, c, d, e) => a + b + c + d + e
    )

    assert.equal(f.run(ec).value(), Some(Success(15)))
  })

  it("map6", () => {
    const ec = scheduler()
    const f = IO.map6(
      IO.pure(1), IO.pure(2), IO.pure(3), IO.pure(4), IO.pure(5), IO.pure(6),
      (a, b, c, d, e, f) => a + b + c + d + e + f
    )

    assert.equal(f.run(ec).value(), Some(Success(21)))
  })

  it("works with null list", () => {
    const ec = scheduler()
    assert.equal(IO.sequence(null as any).map(x => x.toString()).run(ec).value(), Some(Success("")))
  })

  it("works with empty list", () => {
    const ec = scheduler()
    assert.equal(IO.sequence([]).map(x => x.toString()).run(ec).value(), Some(Success("")))
  })

  it("works with any iterable", () => {
    const ec = scheduler()
    const iter = {
      [Symbol.iterator]: () => {
        let done = false
        return {
          next: () => {
            if (!done) {
              done = true
              return { done: false, value: IO.pure(1) }
            } else {
              return { done: true }
            }
          }
        }
      }
    }

    const seq = IO.sequence(iter as any).map(_ => _[0]).run(ec)
    assert.equal(seq.value(), Some(Success(1)))
  })

  it("protects against broken iterables", () => {
    const ec = scheduler()
    const dummy = new DummyError()
    const iter = {
      [Symbol.iterator]: () => { throw dummy }
    }

    const seq = IO.sequence(iter as any).run(ec)
    assert.equal(seq.value(), Some(Failure(dummy)))
  })

  it("executes sequentially", () => {
    const ec = scheduler()

    const list = [
      IO.pure(1).delayExecution(3000),
      IO.pure(1).delayExecution(1000),
      IO.pure(1).delayExecution(2000)
    ]

    const all = IO.sequence(list).map(_ => _.toString()).run(ec)
    ec.tick(3000)
    assert.equal(all.value(), None)
    ec.tick(3000)
    assert.equal(all.value(), Some(Success("1,1,1")))
  })

  it("cancels everything on cancel", () => {
    const ec = scheduler()

    const list = [
      IO.pure(1).delayExecution(3000),
      IO.pure(1).delayExecution(1000),
      IO.pure(1).delayExecution(2000)
    ]

    const all = IO.sequence(list).map(_ => _.toString()).run(ec)
    assert.ok(ec.hasTasksLeft())

    all.cancel()
    assert.not(ec.hasTasksLeft())
  })

  it("cancels everything on failure", () => {
    const ec = scheduler()

    const list = [
      IO.pure(1).delayExecution(2000),
      IO.raise("error").delayExecution(1000),
      IO.pure(1).delayExecution(2000)
    ]

    const all = IO.sequence(list).map(_ => _.toString()).run(ec)
    assert.ok(ec.hasTasksLeft())

    ec.tick(3000)
    assert.equal(all.value(), Some(Failure("error")))
    assert.not(ec.hasTasksLeft())
  })
})

describe("IO.gather", () => {
  it("works", () => {
    const ec = scheduler()
    const all = [IO.pure(1), IO.pure(2), IO.pure(3)]

    const io = IO.gather(all).map(lst => {
      let sum = 0
      for (let i = 0; i < lst.length; i++) sum += lst[i]
      return sum
    })

    assert.equal(io.run(ec).value(), Some(Success(6)))
  })

  it("parMap2", () => {
    const ec = scheduler()
    const f = IO.parMap2(
      IO.pure(1), IO.pure(2),
      (a, b) => a + b
    )

    assert.equal(f.run(ec).value(), Some(Success(3)))
  })

  it("parMap3", () => {
    const ec = scheduler()
    const f = IO.parMap3(
      IO.pure(1), IO.pure(2), IO.pure(3),
      (a, b, c) => a + b + c
    )

    assert.equal(f.run(ec).value(), Some(Success(6)))
  })

  it("parMap4", () => {
    const ec = scheduler()
    const f = IO.parMap4(
      IO.pure(1), IO.pure(2), IO.pure(3), IO.pure(4),
      (a, b, c, d) => a + b + c + d
    )

    assert.equal(f.run(ec).value(), Some(Success(10)))
  })

  it("parMap5", () => {
    const ec = scheduler()
    const f = IO.parMap5(
      IO.pure(1), IO.pure(2), IO.pure(3), IO.pure(4), IO.pure(5),
      (a, b, c, d, e) => a + b + c + d + e
    )

    assert.equal(f.run(ec).value(), Some(Success(15)))
  })

  it("parMap6", () => {
    const ec = scheduler()
    const f = IO.parMap6(
      IO.pure(1), IO.pure(2), IO.pure(3), IO.pure(4), IO.pure(5), IO.pure(6),
      (a, b, c, d, e, f) => a + b + c + d + e + f
    )

    assert.equal(f.run(ec).value(), Some(Success(21)))
  })

  it("works with empty list", () => {
    const ec = scheduler()
    assert.equal(IO.gather([]).map(x => x.toString()).run(ec).value(), Some(Success("")))
  })

  it("works with null list", () => {
    const ec = scheduler()
    assert.equal(IO.gather(null as any).map(x => x.toString()).run(ec).value(), Some(Success("")))
  })

  it("works with any iterable", () => {
    const ec = scheduler()
    const iter = {
      [Symbol.iterator]: () => {
        let done = false
        return {
          next: () => {
            if (!done) {
              done = true
              return { done: false, value: IO.pure(1) }
            } else {
              return { done: true }
            }
          }
        }
      }
    }

    const seq = IO.gather(iter as any).map(_ => _[0]).run(ec)
    assert.equal(seq.value(), Some(Success(1)))
  })

  it("protects against broken iterables", () => {
    const ec = scheduler()
    const dummy = new DummyError()
    const iter = {
      [Symbol.iterator]: () => { throw dummy }
    }

    const seq = IO.gather(iter as any).run(ec)
    assert.equal(seq.value(), Some(Failure(dummy)))
  })

  it("executes in parallel", () => {
    const ec = scheduler()

    const list = [
      IO.pure(1).delayExecution(3000),
      IO.pure(1).delayExecution(1000),
      IO.pure(1).delayExecution(2000)
    ]

    const all = IO.gather(list).map(_ => _.toString()).run(ec)
    ec.tick(3000)
    assert.equal(all.value(), Some(Success("1,1,1")))
  })

  it("cancels everything on cancel", () => {
    const ec = scheduler()

    const list = [
      IO.pure(1).delayExecution(3000),
      IO.pure(1).delayExecution(1000),
      IO.pure(1).delayExecution(2000)
    ]

    const all = IO.gather(list).map(_ => _.toString()).run(ec)
    assert.ok(ec.hasTasksLeft())

    all.cancel()
    assert.not(ec.hasTasksLeft())
  })

  it("cancels everything on failure", () => {
    const ec = scheduler()

    const list = [
      IO.pure(1).delayExecution(2000),
      IO.raise("error").delayExecution(1000),
      IO.pure(1).delayExecution(4000)
    ]

    const all = IO.gather(list).map(_ => _.toString()).run(ec)
    assert.ok(ec.hasTasksLeft())

    ec.tick(1000)
    assert.equal(all.value(), Some(Failure("error")))
    assert.not(ec.hasTasksLeft())
  })
})

describe("IO delay", () => {
  it("delayResult works for successful values", () => {
    const s = new TestScheduler()
    let effect = 0

    const f = IO.of(() => { effect += 1; return effect }).delayResult(1000).run(s)
    assert.equal(effect, 1)
    assert.equal(f.value(), None)

    s.tick(1000)
    assert.equal(f.value(), Some(Success(1)))
  })

  it("delayResult works for failures", () => {
    const s = new TestScheduler()

    const dummy = new DummyError("dummy")
    const f = IO.raise(dummy).delayResult(1000).run(s)
    assert.equal(f.value(), None)

    s.tick(1000)
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("delayExecution works", () => {
    const s = new TestScheduler()
    let effect = 0

    const f = IO.of(() => { effect += 1; return effect }).delayExecution(1000).run(s)
    assert.equal(effect, 0)
    assert.equal(f.value(), None)

    s.tick(1000)
    assert.equal(f.value(), Some(Success(1)))
  })
})

describe("IO.doOnFinish", () => {
  it("works for success", () => {
    const ec = new TestScheduler()
    let effect = 0

    const io = IO.of(() => 1).doOnFinish(e => IO.of(() => {
      if (e.isEmpty()) effect += 1
    }))

    assert.equal(io.run(ec).value(), Some(Success(1)))
    assert.equal(effect, 1)
  })

  it("works for failure", () => {
    const ec = new TestScheduler()
    const dummy = new DummyError()
    let effect = 0

    const io = IO.raise<number>(dummy).doOnFinish(e => IO.of(() => {
      if (e.nonEmpty() && e.get() === dummy) effect += 1
    }))

    assert.equal(io.run(ec).value(), Some(Failure(dummy)))
    assert.equal(effect, 1)
  })
})

describe("IO.doOnCancel", () => {
  it("does not trigger anything on success", () => {
    const ec = new TestScheduler()
    let effect = 0

    const io = IO.of(() => 1).doOnCancel(IO.of(() => { effect += 1 }))
    assert.equal(io.run(ec).value(), Some(Success(1)))
    assert.equal(effect, 0)
  })

  it("does not trigger anything on failure", () => {
    const ec = new TestScheduler()
    const dummy = new DummyError()
    let effect = 0

    const io = IO.raise<number>(dummy).doOnCancel(IO.of(() => { effect += 1 }))
    assert.equal(io.run(ec).value(), Some(Failure(dummy)))
    assert.equal(effect, 0)
  })

  it("triggers effect on cancellation", () => {
    const ec = new TestScheduler()
    let effect = 0

    const io = IO.pure(1).delayExecution(1000)
      .doOnCancel(IO.of(() => { effect += 1 }))

    const f = io.run(ec)
    assert.equal(f.value(), None)

    f.cancel(); ec.tick()
    assert.equal(effect, 1)
    assert.not(ec.hasTasksLeft())
  })
})

describe("IO.firstCompletedOf", () => {
  it("picks the winner and cancels the rest", () => {
    const ec = new TestScheduler()
    let effect = 0

    const all = IO.firstCompletedOf([
      IO.pure(1).delayExecution(2000).doOnCancel(IO.of(() => { effect += 1 })),
      IO.pure(2).delayExecution(1000).doOnCancel(IO.of(() => { effect += 1 })),
      IO.pure(3).delayExecution(3000).doOnCancel(IO.of(() => { effect += 1 }))
    ])

    const f = all.run(ec)
    ec.tick(1000)

    assert.equal(f.value(), Some(Success(2)))
    assert.equal(effect, 2)
    assert.not(ec.hasTasksLeft())
  })

  it("throws error on empty list", () => {
    const ec = scheduler()
    const f = IO.firstCompletedOf([]).map(x => x.toString()).run(ec)
    assert.ok(f.value().nonEmpty() && f.value().get().isFailure())
  })

  it("throws error on null list", () => {
    const ec = scheduler()
    const f = IO.firstCompletedOf(null as any).map(x => x.toString()).run(ec)
    assert.ok(f.value().nonEmpty() && f.value().get().isFailure())
  })

  it("works with any iterable", () => {
    const ec = scheduler()
    const iter = {
      [Symbol.iterator]: () => {
        let done = false
        return {
          next: () => {
            if (!done) {
              done = true
              return { done: false, value: IO.pure(1) }
            } else {
              return { done: true }
            }
          }
        }
      }
    }

    const seq = IO.firstCompletedOf(iter as any).run(ec)
    assert.equal(seq.value(), Some(Success(1)))
  })

  it("protects against broken iterables", () => {
    const ec = scheduler()
    const dummy = new DummyError()
    const iter = {
      [Symbol.iterator]: () => { throw dummy }
    }

    const seq = IO.firstCompletedOf(iter as any).run(ec)
    assert.equal(seq.value(), Some(Failure(dummy)))
  })

  it("mirrors the source on .timeout", () => {
    const ec = scheduler()
    const io = IO.pure(1).timeout(1000)
    assert.equal(io.run(ec).value(), Some(Success(1)))
  })

  it("triggers error when timespan exceeded", () => {
    const ec = scheduler()
    const io = IO.pure(1).delayExecution(10000).timeout(1000)
    const f = io.run(ec)

    ec.tick(1000)
    assert.ok(!f.value().isEmpty() && f.value().get().isFailure())
  })

  it("cancels both on cancel", () => {
    const ec = scheduler()
    const io = IO.pure(1).delayExecution(10000).timeout(1000)
    const f = io.run(ec)

    assert.ok(ec.hasTasksLeft())
    f.cancel()
    assert.not(ec.hasTasksLeft())
  })
})

describe("IO type classes", () => {
  function check(ec: TestScheduler): <A>(eq: Equiv<HK<"funfix/io", A>>) => boolean {
    return eq => {
      const a = (eq.lh as IO<any>).run(ec)
      const b = (eq.rh as IO<any>).run(ec)
      ec.tick(Duration.days(99))
      return is(a.value(), b.value())
    }
  }

  describe("Monad<IO> (static-land)", () => {
    const sc = new TestScheduler()
    const arbFA = inst.arbIO(jv.int32)
    const arbFB = inst.arbIO(jv.string)
    const arbFC = inst.arbIO(jv.int16)
    const arbFAtoB = inst.arbIO(jv.fun(jv.string))
    const arbFBtoC = inst.arbIO(jv.fun(jv.int16))

    monadCheck(
      arbFA,
      arbFB,
      arbFC,
      jv.fun(jv.string),
      jv.fun(jv.int16),
      arbFAtoB,
      arbFBtoC,
      jv.int32,
      check(sc),
      IOModule)
  })

  describe("Functor<IO> (fantasy-land)", () => {
    const sc = new TestScheduler()
    const arbFA = inst.arbIO(jv.int32)
    const arbFB = inst.arbIO(jv.string)
    const arbFC = inst.arbIO(jv.int16)
    const arbFAtoB = inst.arbIO(jv.fun(jv.string))
    const arbFBtoC = inst.arbIO(jv.fun(jv.int16))

    monadCheck(
      arbFA,
      arbFB,
      arbFC,
      jv.fun(jv.string),
      jv.fun(jv.int16),
      arbFAtoB,
      arbFBtoC,
      jv.int32,
      check(sc),
      {
        map: (f, fa) => (fa as any)["fantasy-land/map"](f),
        ap: (ff, fa) => (fa as any)["fantasy-land/ap"](ff),
        chain: (f, fa) => (fa as any)["fantasy-land/chain"](f),
        chainRec: (f, a) => (IO as any)["fantasy-land/chainRec"](f, a),
        of: a => (IO as any)["fantasy-land/of"](a)
      })
  })
})

function scheduler(): TestScheduler {
  return new TestScheduler(undefined, ExecutionModel.global.get())
}

function flatShallowLoop(n: number, f: (x: number) => IO<number>): IO<number> {
  return f(n).flatMap(n => {
    if (n <= 0) return IO.pure(n)
    return flatShallowLoop(n - 1, f)
  })
}

function flatEagerLoop(n: number, f: (x: number) => IO<number>): IO<number> {
  let cursor = f(n)
  for (let i = n - 1; i >= 0; i--) cursor = cursor.flatMap(x => f(x - 1))
  return cursor
}

function suspendLoop(n: number, f: (x: number) => IO<number>): IO<number> {
  return IO.suspend(() => {
    if (n <= 0) return IO.pure(n)
    return suspendLoop(n - 1, f)
  })
}

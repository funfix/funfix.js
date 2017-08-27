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

import * as jv from "jsverify"
import * as inst from "./instances"
import * as assert from "./asserts"

import {
  Try,
  Success,
  Failure,
  Left,
  Right,
  DummyError,
  Some, None, Option
} from "funfix-core"

import { TestScheduler, Future, ExecutionModel } from "funfix-exec"
import { IO } from "../../src/"

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
    const io = IO.async((ec, cb) => { throw dummy })

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
    const io = IO.pure(1).map(x => { throw dummy })
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
    const io = IO.pure(1).flatMap(_ => { throw dummy })
    const f = io.run(ec)

    ec.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("protects flatMap against user error (runOnComplete)", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.pure(1).flatMap(_ => { throw dummy })

    let result: Option<Try<any>> = None
    io.runOnComplete(r => { result = Some(r) }, ec)

    ec.tick()
    assert.equal(result, Some(Failure(dummy)))
  })

  it("recovers from user error in flatMap (run)", () => {
    const ec = scheduler()
    const dummy = new DummyError("dummy")
    const io = IO.pure(1).flatMap(_ => { throw dummy })
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
    const io = IO.pure(1).flatMap(_ => { throw dummy })
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
      .recoverWith(_ => { throw dummy2 })
      .recoverWith(e => {
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

    const io = IO.raise<number>(dummy1).recoverWith(_ => { throw dummy2 })
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
    const io = IO.pure(1).map(_ => { throw dummy })
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
    inst.arbIO, jv.fun(jv.number),
    (fa, f) => {
      const ec = scheduler()
      const f1 = fa.map(f).run(ec)
      const f2 = fa.flatMap(x => IO.pure(f(x))).run(ec)
      ec.tick()
      return f1.value().equals(f2.value())
    })

  jv.property("map(f) <-> transform(_, f)",
    inst.arbIO, jv.fun(jv.number),
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
    const fa = IO.tailRecM(0, a => IO.raise("failure"))
    const fu = fa.run(ec)
    ec.tick()
    assert.equal(fu.value(), Some(Failure("failure")))
  })

  it("protects against user errors", () => {
    const ec = scheduler()
    // tslint:disable:no-string-throw
    const fa = IO.tailRecM(0, a => { throw "dummy" })
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
})

describe("IO aliases", () => {
  jv.property("chain(f) <-> flatMap(f)",
    inst.arbIO, jv.fun(inst.arbIO),
    (fa, f) => {
      const ec = scheduler()
      const f1 = fa.flatMap(f).run(ec)
      const f2 = fa.chain(f).run(ec)
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
    inst.arbIO,
    (fa) => {
      const ec = scheduler()
      const f1 = IO.suspend(() => fa).run(ec)
      const f2 = IO.unit().flatMap(_ => fa).run(ec)
      ec.tick()
      return f1.value().equals(f2.value())
    })

  jv.property("defer(f) <-> unit.flatMap(_ => f())",
    inst.arbIO,
    (fa) => {
      const ec = scheduler()
      const f1 = IO.defer(() => fa).run(ec)
      const f2 = IO.unit().flatMap(_ => fa).run(ec)
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

    const f = io.flatMap(_ => io).executeWithOptions({ autoCancelableRunLoops: true }).run(ec)
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
      .flatMap(_ => IO.pure(1).flatMap(IO.pure).run(ec1))
      .map(_ => ec1.batchIndex)

    ec1.tick()
    asyncEC.tick()
    assert.equal(f1.value(), Some(Success(4)))

    const ec2 = scheduler()
    const f2 = Future.unit(ec2).flatMap(Future.pure)
      .flatMap(_ => IO.pure(1).flatMap(signal).run(ec2))
      .map(_ => ec2.batchIndex)

    ec2.tick()
    asyncEC.tick()
    assert.equal(f2.value(), Some(Success(1)))
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

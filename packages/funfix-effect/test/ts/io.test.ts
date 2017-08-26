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
  is, id,
  Try,
  Success,
  Failure,
  Left,
  Right,
  DummyError,
  IllegalStateError,
  Some, None, Option
} from "funfix-core"

import { TestScheduler, Future, ExecutionModel } from "funfix-exec"
import { IO } from "../../src/"

describe("IOPure", () => {
  it("evaluates IO.pure(v).run() to Future.pure(v)", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const io = IO.pure(1)
    assert.equal(io.run().value(), Some(Success(1)))
  })

  it("evaluates IO.raise(e).run() to Future.raise(e)", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const io = IO.raise("dummy")
    assert.equal(io.run().value(), Some(Failure("dummy")))
  })

  it("evaluates IO.pure(v).runOnComplete()", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    let result: Option<Try<number>> = None
    IO.pure(1).runOnComplete(r => { result = Some(r as any) })
    assert.equal(result, Some(Success(1)))
  })

  it("evaluates IO.raise(e).runOnComplete()", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    let result: Option<Try<number>> = None
    IO.raise("error").runOnComplete(r => { result = Some(r as any) })
    assert.equal(result, Some(Failure("error")))
  })

  it("is stack safe in flatMap shallow loop", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const io = flatShallowLoop(10000, x => IO.pure(x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in flatMap eager loop", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const io = flatEagerLoop(2000, x => IO.pure(x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in suspend loop", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const io = suspendLoop(10000, x => IO.pure(x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })
})

describe("IO.always", () => {
  it("is stack safe in flatMap shallow loop", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const io = flatShallowLoop(10000, x => IO.always(() => x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in flatMap eager loop", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const io = flatEagerLoop(2000, x => IO.always(() => x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })

  it("is stack safe in suspend loop", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const io = suspendLoop(10000, x => IO.always(() => x))
    const f = io.run(ec)

    assert.equal(f.value(), None); ec.tick()
    assert.equal(f.value(), Some(Success(0)))
  })
})

describe("IO.once", () => {
  let ec: TestScheduler

  before(() => {
    ec = new TestScheduler(undefined, ExecutionModel.global.get())
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
    ec = new TestScheduler(undefined, ExecutionModel.global.get())
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
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
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
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const dummy = new DummyError("registration1")
    const io = IO.async((ec, cb) => { throw dummy })

    const f = io.run(ec); ec.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("reports error in registration after callback was called", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const dummy = new DummyError("registration2")
    const io = IO.async<number>((ec, cb) => { cb(Success(1)); throw dummy })

    const f = io.run(ec); ec.tick()
    assert.equal(f.value(), Some(Success(1)))
    assert.ok(ec.triggeredFailures().length > 0)
    assert.equal(ec.triggeredFailures()[0].message, dummy.message)
  })
})

describe("IO", () => {
  it("recovers from failure with run()", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const io = IO.raise<number>("error").recoverWith(e => {
      if (e === "error") return IO.pure(100)
      return IO.raise(e)
    })

    const f = io.run(ec)
    ec.tick()
    assert.equal(f.value(), Some(Success(100)))
  })

  it("recovers from failure with runOnComplete()", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
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
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const dummy = new DummyError("dummy")
    const io = IO.pure(1).flatMap(_ => { throw dummy })
    const f = io.run(ec)

    ec.tick()
    assert.equal(f.value(), Some(Failure(dummy)))
  })

  it("protects flatMap against user error (runOnComplete)", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
    const dummy = new DummyError("dummy")
    const io = IO.pure(1).flatMap(_ => { throw dummy })

    let result: Option<Try<any>> = None
    io.runOnComplete(r => { result = Some(r) }, ec)

    ec.tick()
    assert.equal(result, Some(Failure(dummy)))
  })

  it("recovers from user error in flatMap (run)", () => {
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
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
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
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
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
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
    const ec = new TestScheduler(undefined, ExecutionModel.global.get())
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
})

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

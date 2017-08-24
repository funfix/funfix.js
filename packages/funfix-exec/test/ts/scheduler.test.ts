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

import { DummyError, Throwable } from "funfix-core"
import * as assert from "./asserts"
import {
  Scheduler,
  GlobalScheduler,
  TestScheduler,
  Duration
} from "../../src/"

describe("GlobalScheduler", () => {
  it("Scheduler.global.get() instanceof GlobalScheduler", () => {
    assert.ok(Scheduler.global.get() instanceof GlobalScheduler)
  })

  it("executes stuff asynchronously with setImmediate", () => {
    const s = new GlobalScheduler(true)

    let wasExecuted = false
    const p = new Promise(resolve => {
      s.executeAsync(() => {
        wasExecuted = true
        resolve(1)
      })
      assert.not(wasExecuted)
    })

    assert.not(wasExecuted)
    return p.then(r => {
      assert.equal(r, 1)
      assert.ok(wasExecuted)
    })
  })

  it("executes stuff asynchronously with setTimeout", () => {
    const s = new GlobalScheduler()
    assert.not((s as any)._useSetImmediate)

    let wasExecuted = false
    const p = new Promise(resolve => {
      s.executeAsync(() => {
        wasExecuted = true
        resolve(1)
      })
      assert.not(wasExecuted)
    })

    assert.not(wasExecuted)
    return p.then(r => {
      assert.equal(r, 1)
      assert.ok(wasExecuted)
    })
  })

  it("executes stuff trampolined", () => {
    const s = new GlobalScheduler()
    let count = 0

    const loop = (n: number) => {
      if (n > 0) s.trampoline(() => loop(n - 1))
      count += 1
    }

    loop(5000)
    assert.equal(count, 5001)
  })

  it("currentTimeMillis", () => {
    const now = Date.now()
    const time = Scheduler.global.get().currentTimeMillis()
    assert.ok(time >= now)
  })

  it("report errors", () => {
    const oldFn = console.error
    const dummy = new DummyError("dummy")
    let reported: Throwable[] = []

    // Overriding console.error
    console.error = (...args: any[]) => {
      reported = args
    }

    const restore = (err?: any) => {
      console.error = oldFn
      if (err) throw err
    }

    const p = new Promise(resolve => {
      Scheduler.global.get().executeAsync(() => {
        resolve(1)
        throw dummy
      })
    })

    p.catch(restore).then(() => {
      restore()
      assert.equal(reported[0], dummy)
    })
  })

  it("schedule with delay", () => {
    const s = Scheduler.global.get()
    let finishedAt = 0

    const p = new Promise(resolve => {
      s.scheduleOnce(50, () => {
        finishedAt = s.currentTimeMillis()
        resolve(1)
      })
    })

    const now = s.currentTimeMillis()
    return p.then(r => {
      assert.equal(r, 1)
      assert.ok(finishedAt - now >= 10)
    })
  })

  it("schedule with delay should be cancelable", () => {
    const s = Scheduler.global.get()
    let finishedAt = 0

    const ref = s.scheduleOnce(0, () => {
      finishedAt = s.currentTimeMillis()
    })

    const p = new Promise(resolve => {
      s.scheduleOnce(10, () => resolve(1))
    })

    ref.cancel()

    return p.then(r => {
      assert.equal(r, 1)
      assert.equal(finishedAt, 0)
    })
  })

  it("scheduleWithFixedDelay(number, number)", () => {
    const s = Scheduler.global.get()
    let times = 0

    const ref = s.scheduleWithFixedDelay(0, 1, () => { times += 1 })
    const p = new Promise(resolve => {
      s.scheduleOnce(100, () => { ref.cancel(); resolve(1) })
    })

    return p.then(r => {
      assert.equal(r, 1)
      assert.ok(times >= 2)
    })
  })

  it("scheduleWithFixedDelay(Duration, Duration)", () => {
    const s = Scheduler.global.get()
    let times = 0

    const ref = s.scheduleWithFixedDelay(
      Duration.millis(0),
      Duration.millis(1),
      () => { times += 1 }
    )

    const p = new Promise(resolve => {
      s.scheduleOnce(100, () => { ref.cancel(); resolve(1) })
    })

    return p.then(r => {
      assert.equal(r, 1)
      assert.ok(times >= 2)
    })
  })

  it("scheduleAtFixedRate(number, number)", () => {
    const s = Scheduler.global.get()
    let times = 0

    const ref = s.scheduleAtFixedRate(0, 1, () => { times += 1 })
    const p = new Promise(resolve => {
      s.scheduleOnce(100, () => { ref.cancel(); resolve(1) })
    })

    return p.then(r => {
      assert.equal(r, 1)
      assert.ok(times >= 2)
    })
  })

  it("scheduleAtFixedRate(Duration, Duration)", () => {
    const s = Scheduler.global.get()
    let times = 0

    const ref = s.scheduleAtFixedRate(
      Duration.millis(0),
      Duration.millis(1),
      () => { times += 1 }
    )

    const p = new Promise(resolve => {
      s.scheduleOnce(100, () => { ref.cancel(); resolve(1) })
    })

    return p.then(r => {
      assert.equal(r, 1)
      assert.ok(times >= 2)
    })
  })
})

describe("TestScheduler", () => {
  it("executes random tasks in once batch", () => {
    const s = new TestScheduler()
    const count = 2000
    let effect = 0

    for (let i = 0; i < count; i++) {
      const delay = Math.floor(Math.random() * 10) * 1000
      if (delay === 0 && Math.floor(Math.random() * 10) % 2 === 0) {
        s.executeAsync(() => { effect += 1 })
      } else {
        s.scheduleOnce(delay, () => { effect += 1 })
      }
    }

    assert.equal(effect, 0)
    assert.equal(s.tick(Duration.seconds(10)), count)

    assert.equal(effect, count)
    assert.not(s.hasTasksLeft())
  })

  it("executes random tasks in separate batches", () => {
    const s = new TestScheduler()
    const count = 2000
    let effect = 0

    for (let i = 0; i < count; i++) {
      const delay = Math.floor(Math.random() * 10) * 1000
      if (delay === 0 && Math.floor(Math.random() * 10) % 2 === 0) {
        s.executeAsync(() => { effect += 1 })
      } else {
        s.scheduleOnce(delay, () => { effect += 1 })
      }
    }

    assert.equal(effect, 0)
    let executed = 0
    for (let i = 0; i < 10; i++) executed += s.tick(Duration.seconds(1))

    assert.equal(executed, count)
    assert.equal(effect, count)
    assert.not(s.hasTasksLeft())
  })

  it("nested execution", () => {
    const s = new TestScheduler()
    let effect = 0

    s.executeAsync(() => {
      effect += 1

      s.executeAsync(() => {
        s.executeAsync(() => { effect += 10 })
        effect = effect * 2
      })
    })

    assert.equal(effect, 0)
    assert.equal(s.tick(), 3)
    assert.equal(effect, 2 + 10)
  })

  it("nested scheduleOnce", () => {
    const s = new TestScheduler()
    let effect = 0

    s.scheduleOnce(Duration.seconds(4), () => {
      effect = effect * 2
    })

    s.scheduleOnce(1000, () => {
      effect += 1

      s.scheduleOnce(1000, () => {
        s.scheduleOnce(1000, () => { effect += 10 })
        effect = effect * 2
      })
    })

    assert.equal(effect, 0)
    assert.equal(s.tick(), 0)

    assert.equal(s.tick(Duration.seconds(1)), 1)
    assert.equal(effect, 1)
    assert.ok(s.hasTasksLeft())

    assert.equal(s.tick(Duration.seconds(1)), 1)
    assert.equal(effect, 2)
    assert.ok(s.hasTasksLeft())

    assert.equal(s.tick(Duration.seconds(1)), 1)
    assert.equal(effect, 2 + 10)
    assert.ok(s.hasTasksLeft())

    assert.equal(s.tick(Duration.seconds(1)), 1)
    assert.equal(effect, (2 + 10) * 2)
    assert.not(s.hasTasksLeft())
  })

  it("executes stuff trampolined", () => {
    const s = new TestScheduler()
    let count = 0

    const loop = (n: number) => {
      if (n > 0) s.trampoline(() => loop(n - 1))
      count += 1
    }

    loop(5000)
    assert.equal(count, 5001)
  })

  it("trampoline reports errors", () => {
    const s = new TestScheduler()
    let errorThrown = null
    let triggered = false

    s.trampoline(() => {
      s.trampoline(() => { triggered = true })
      // tslint:disable-next-line:no-string-throw
      throw "dummy"
    })

    assert.equal(s.triggeredFailures().pop(), "dummy")
    assert.ok(triggered)
  })

  it("schedule with delay should be cancelable", () => {
    const s = new TestScheduler()
    let effect = 0

    s.executeAsync(() => { effect += 1 })
    s.scheduleOnce(Duration.seconds(1), () => { effect += 1 })
    const ref = s.scheduleOnce(Duration.seconds(2), () => { effect += 1 })
    s.scheduleOnce(Duration.seconds(3), () => { effect += 1 })

    ref.cancel()

    assert.equal(s.tick(), 1)
    assert.equal(s.tick(1000), 1)
    assert.equal(s.tick(1000), 0)
    assert.equal(s.tick(1000), 1)

    assert.not(s.hasTasksLeft())
    assert.equal(effect, 3)
    assert.equal(s.currentTimeMillis(), 3000)
  })

  it("scheduleWithFixedDelay(number, number)", () => {
    const s = new TestScheduler()
    let times = 0

    const ref = s.scheduleWithFixedDelay(1000, 2000, () => { times += 1 })

    s.tick()
    assert.equal(times, 0)
    s.tick(1000)
    assert.equal(times, 1)
    s.tick(1000)
    assert.equal(times, 1)
    s.tick(1000)
    assert.equal(times, 2)
    s.tick(2000)
    assert.equal(times, 3)

    ref.cancel()
    assert.not(s.hasTasksLeft())
    s.tick(2000)
    assert.equal(times, 3)
    assert.equal(s.currentTimeMillis(), 7000)
  })

  it("scheduleWithFixedDelay(Duration, Duration)", () => {
    const s = new TestScheduler()
    let times = 0

    const ref = s.scheduleWithFixedDelay(Duration.seconds(1), Duration.seconds(2), () => { times += 1 })

    s.tick()
    assert.equal(times, 0)
    s.tick(1000)
    assert.equal(times, 1)
    s.tick(1000)
    assert.equal(times, 1)
    s.tick(1000)
    assert.equal(times, 2)
    s.tick(2000)
    assert.equal(times, 3)

    ref.cancel()
    assert.not(s.hasTasksLeft())
    s.tick(2000)
    assert.equal(times, 3)
    assert.equal(s.currentTimeMillis(), 7000)
  })

  it("scheduleAtFixedRate(number, number)", () => {
    const s = new TestScheduler()
    let times = 0

    const ref = s.scheduleAtFixedRate(1000, 2000, () => { times += 1 })

    s.tick()
    assert.equal(times, 0)
    s.tick(1000)
    assert.equal(times, 1)
    s.tick(1000)
    assert.equal(times, 1)
    s.tick(1000)
    assert.equal(times, 2)
    s.tick(2000)
    assert.equal(times, 3)

    ref.cancel()
    assert.not(s.hasTasksLeft())
    s.tick(2000)
    assert.equal(times, 3)
    assert.equal(s.currentTimeMillis(), 7000)
  })

  it("scheduleAtFixedRate(Duration, Duration)", () => {
    const s = new TestScheduler()
    let times = 0

    const ref = s.scheduleAtFixedRate(Duration.seconds(1), Duration.seconds(2), () => { times += 1 })

    s.tick()
    assert.equal(times, 0)
    s.tick(1000)
    assert.equal(times, 1)
    s.tick(1000)
    assert.equal(times, 1)
    s.tick(1000)
    assert.equal(times, 2)
    s.tick(2000)
    assert.equal(times, 3)

    ref.cancel()
    assert.not(s.hasTasksLeft())
    s.tick(2000)
    assert.equal(times, 3)
  })

  it("errors get captured", () => {
    let errors: Throwable[] = []
    const s = new TestScheduler(err => errors.push(err))

    const dummy = new DummyError("dummy")
    s.executeAsync(() => { throw dummy })
    s.executeAsync(() => { throw dummy })

    s.tick()
    assert.equal(errors.length, 2)
    assert.equal(errors[0], dummy)
    assert.equal(errors[1], dummy)

    assert.equal(s.triggeredFailures().length, 2)
    assert.equal(s.triggeredFailures()[0], dummy)
    assert.equal(s.triggeredFailures()[1], dummy)
  })
})

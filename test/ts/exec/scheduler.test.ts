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

import * as Promise from "bluebird"
import {
  Scheduler,
  GlobalScheduler,
  TestScheduler,
  DummyError,
  Duration
} from "../../../src/"

describe("GlobalScheduler", () => {
  test("Scheduler.global.get() instanceof GlobalScheduler", () => {
    expect(Scheduler.global.get() instanceof GlobalScheduler).toBe(true)
  })

  test("executes stuff asynchronously with setImmediate", () => {
    const s = new GlobalScheduler(true)

    let wasExecuted = false
    const p = new Promise(resolve => {
      s.executeAsync(() => {
        wasExecuted = true
        resolve(1)
      })
      expect(wasExecuted).toBe(false)
    })

    expect(wasExecuted).toBe(false)
    return p.then(r => {
      expect(r).toBe(1)
      expect(wasExecuted).toBe(true)
    })
  })

  test("executes stuff asynchronously with setTimeout", () => {
    const s = new GlobalScheduler()
    expect((s as any)._useSetImmediate).toBe(false)

    let wasExecuted = false
    const p = new Promise(resolve => {
      s.executeAsync(() => {
        wasExecuted = true
        resolve(1)
      })
      expect(wasExecuted).toBe(false)
    })

    expect(wasExecuted).toBe(false)
    return p.then(r => {
      expect(r).toBe(1)
      expect(wasExecuted).toBe(true)
    })
  })

  test("executes stuff trampolined", () => {
    const s = new GlobalScheduler()
    let count = 0

    const loop = (n: number) => {
      if (n > 0) s.trampoline(() => loop(n - 1))
      count += 1
    }

    loop(5000)
    expect(count).toBe(5001)
  })

  test("currentTimeMillis", () => {
    const now = Date.now()
    const time = Scheduler.global.get().currentTimeMillis()
    expect(time).toBeGreaterThanOrEqual(now)
  })

  test("report errors", () => {
    const oldFn = console.error
    const dummy = new DummyError("dummy")
    let reported = []

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
      expect(reported[0]).toBe(dummy)
    })
  })

  test("schedule with delay", () => {
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
      expect(r).toBe(1)
      expect(finishedAt - now).toBeGreaterThanOrEqual(10)
    })
  })

  test("schedule with delay should be cancelable", () => {
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
      expect(r).toBe(1)
      expect(finishedAt).toBe(0)
    })
  })

  test("scheduleWithFixedDelay(number, number)", () => {
    const s = Scheduler.global.get()
    let times = 0

    const ref = s.scheduleWithFixedDelay(0, 1, () => { times += 1 })
    const p = new Promise(resolve => {
      s.scheduleOnce(100, () => { ref.cancel(); resolve(1) })
    })

    return p.then(r => {
      expect(r).toBe(1)
      expect(times).toBeGreaterThanOrEqual(2)
    })
  })

  test("scheduleWithFixedDelay(Duration, Duration)", () => {
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
      expect(r).toBe(1)
      expect(times).toBeGreaterThanOrEqual(2)
    })
  })

  test("scheduleAtFixedRate(number, number)", () => {
    const s = Scheduler.global.get()
    let times = 0

    const ref = s.scheduleAtFixedRate(0, 1, () => { times += 1 })
    const p = new Promise(resolve => {
      s.scheduleOnce(100, () => { ref.cancel(); resolve(1) })
    })

    return p.then(r => {
      expect(r).toBe(1)
      expect(times).toBeGreaterThanOrEqual(2)
    })
  })

  test("scheduleAtFixedRate(Duration, Duration)", () => {
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
      expect(r).toBe(1)
      expect(times).toBeGreaterThanOrEqual(2)
    })
  })
})

describe("TestScheduler", () => {
  test("executes random tasks in once batch", () => {
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

    expect(effect).toBe(0)
    expect(s.tick(Duration.seconds(10))).toBe(count)

    expect(effect).toBe(count)
    expect(s.hasTasksLeft()).toBeFalsy()
  })

  test("executes random tasks in separate batches", () => {
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

    expect(effect).toBe(0)
    let executed = 0
    for (let i = 0; i < 10; i++) executed += s.tick(Duration.seconds(1))

    expect(executed).toBe(count)
    expect(effect).toBe(count)
    expect(s.hasTasksLeft()).toBeFalsy()
  })

  test("nested execution", () => {
    const s = new TestScheduler()
    let effect = 0

    s.executeAsync(() => {
      effect += 1

      s.executeAsync(() => {
        s.executeAsync(() => { effect += 10 })
        effect = effect * 2
      })
    })

    expect(effect).toBe(0)
    expect(s.tick()).toBe(3)
    expect(effect).toBe(2 + 10)
  })

  test("nested scheduleOnce", () => {
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

    expect(effect).toBe(0)
    expect(s.tick()).toBe(0)

    expect(s.tick(Duration.seconds(1))).toBe(1)
    expect(effect).toBe(1)
    expect(s.hasTasksLeft()).toBe(true)

    expect(s.tick(Duration.seconds(1))).toBe(1)
    expect(effect).toBe(2)
    expect(s.hasTasksLeft()).toBe(true)

    expect(s.tick(Duration.seconds(1))).toBe(1)
    expect(effect).toBe(2 + 10)
    expect(s.hasTasksLeft()).toBe(true)

    expect(s.tick(Duration.seconds(1))).toBe(1)
    expect(effect).toBe((2 + 10) * 2)
    expect(s.hasTasksLeft()).toBe(false)
  })

  test("executes stuff trampolined", () => {
    const s = new TestScheduler()
    let count = 0

    const loop = (n: number) => {
      if (n > 0) s.trampoline(() => loop(n - 1))
      count += 1
    }

    loop(5000)
    expect(count).toBe(5001)
  })

  test("trampoline reports errors", () => {
    const s = new TestScheduler()
    let errorThrown = null
    let triggered = false

    s.trampoline(() => {
      s.trampoline(() => { triggered = true })
      // tslint:disable-next-line:no-string-throw
      throw "dummy"
    })

    expect(s.triggeredFailures().pop()).toBe("dummy")
    expect(triggered).toBe(true)
  })

  test("schedule with delay should be cancelable", () => {
    const s = new TestScheduler()
    let effect = 0

    s.executeAsync(() => { effect += 1 })
    s.scheduleOnce(Duration.seconds(1), () => { effect += 1 })
    const ref = s.scheduleOnce(Duration.seconds(2), () => { effect += 1 })
    s.scheduleOnce(Duration.seconds(3), () => { effect += 1 })

    ref.cancel()

    expect(s.tick()).toBe(1)
    expect(s.tick(1000)).toBe(1)
    expect(s.tick(1000)).toBe(0)
    expect(s.tick(1000)).toBe(1)

    expect(s.hasTasksLeft()).toBe(false)
    expect(effect).toBe(3)
    expect(s.currentTimeMillis()).toBe(3000)
  })

  test("scheduleWithFixedDelay(number, number)", () => {
    const s = new TestScheduler()
    let times = 0

    const ref = s.scheduleWithFixedDelay(1000, 2000, () => { times += 1 })

    s.tick()
    expect(times).toBe(0)
    s.tick(1000)
    expect(times).toBe(1)
    s.tick(1000)
    expect(times).toBe(1)
    s.tick(1000)
    expect(times).toBe(2)
    s.tick(2000)
    expect(times).toBe(3)

    ref.cancel()
    expect(s.hasTasksLeft()).toBe(false)
    s.tick(2000)
    expect(times).toBe(3)
    expect(s.currentTimeMillis()).toBe(7000)
  })

  test("scheduleWithFixedDelay(Duration, Duration)", () => {
    const s = new TestScheduler()
    let times = 0

    const ref = s.scheduleWithFixedDelay(Duration.seconds(1), Duration.seconds(2), () => { times += 1 })

    s.tick()
    expect(times).toBe(0)
    s.tick(1000)
    expect(times).toBe(1)
    s.tick(1000)
    expect(times).toBe(1)
    s.tick(1000)
    expect(times).toBe(2)
    s.tick(2000)
    expect(times).toBe(3)

    ref.cancel()
    expect(s.hasTasksLeft()).toBe(false)
    s.tick(2000)
    expect(times).toBe(3)
    expect(s.currentTimeMillis()).toBe(7000)
  })

test("scheduleAtFixedRate(number, number)", () => {
    const s = new TestScheduler()
    let times = 0

    const ref = s.scheduleAtFixedRate(1000, 2000, () => { times += 1 })

    s.tick()
    expect(times).toBe(0)
    s.tick(1000)
    expect(times).toBe(1)
    s.tick(1000)
    expect(times).toBe(1)
    s.tick(1000)
    expect(times).toBe(2)
    s.tick(2000)
    expect(times).toBe(3)

    ref.cancel()
    expect(s.hasTasksLeft()).toBe(false)
    s.tick(2000)
    expect(times).toBe(3)
    expect(s.currentTimeMillis()).toBe(7000)
  })

  test("scheduleAtFixedRate(Duration, Duration)", () => {
    const s = new TestScheduler()
    let times = 0

    const ref = s.scheduleAtFixedRate(Duration.seconds(1), Duration.seconds(2), () => { times += 1 })

    s.tick()
    expect(times).toBe(0)
    s.tick(1000)
    expect(times).toBe(1)
    s.tick(1000)
    expect(times).toBe(1)
    s.tick(1000)
    expect(times).toBe(2)
    s.tick(2000)
    expect(times).toBe(3)

    ref.cancel()
    expect(s.hasTasksLeft()).toBe(false)
    s.tick(2000)
    expect(times).toBe(3)
  })

  test("errors get captured", () => {
    let errors = []
    const s = new TestScheduler(err => errors.push(err))

    const dummy = new DummyError("dummy")
    s.executeAsync(() => { throw dummy })
    s.executeAsync(() => { throw dummy })

    s.tick()
    expect(errors.length).toBe(2)
    expect(errors[0]).toBe(dummy)
    expect(errors[1]).toBe(dummy)

    expect(s.triggeredFailures().length).toBe(2)
    expect(s.triggeredFailures()[0]).toBe(dummy)
    expect(s.triggeredFailures()[1]).toBe(dummy)
  })
})

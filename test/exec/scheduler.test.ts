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
  DummyError,
  Duration
} from "../../src/funfix"

describe("GlobalScheduler", () => {
  test("Scheduler.global() instanceof GlobalScheduler", () => {
    expect(Scheduler.global() instanceof GlobalScheduler).toBe(true)
  })

  test("executes stuff asynchronously with setImmediate", () => {
    const s = new GlobalScheduler(true)

    let wasExecuted = false
    const p = new Promise(resolve => {
      s.execute(() => {
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
      s.execute(() => {
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


  test("currentTimeMillis", () => {
    const now = Date.now()
    const time = Scheduler.global().currentTimeMillis()
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
      Scheduler.global().execute(() => {
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
    const s = Scheduler.global()
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
      expect(finishedAt - now).toBeGreaterThanOrEqual(50)
    })
  })

  test("schedule with delay should be cancelable", () => {
    const s = Scheduler.global()
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
    const s = Scheduler.global()
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
    const s = Scheduler.global()
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
    const s = Scheduler.global()
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
    const s = Scheduler.global()
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

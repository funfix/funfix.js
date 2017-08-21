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
  Cancelable, BoolCancelable,
  DummyError, CompositeError,
  AssignCancelable,
  MultiAssignCancelable,
  SingleAssignCancelable,
  SerialCancelable,
  IllegalStateError
} from "../../../src/"

class TestCancelable extends BoolCancelable {
  private _isCanceled: boolean

  constructor() {
    super()
    this._isCanceled = false
  }

  public isCanceled(): boolean { return this._isCanceled }
  public cancel(): void {
    if (this._isCanceled) throw new IllegalStateError("TestCancelable#cancel")
    this._isCanceled = true
  }
}

describe("Cancelable.from", () => {
  it("converts any callback", () => {
    let effect = false
    const c = Cancelable.of(() => { effect = true })
    expect(effect).toBeFalsy()

    c.cancel()
    expect(effect).toBeTruthy()
  })

  it("is idempotent", () => {
    let effect = 0
    const c = Cancelable.of(() => { effect += 1 })

    c.cancel()
    expect(effect).toBe(1)
    c.cancel()
    expect(effect).toBe(1)
  })

  it("is idempotent even if it throws", () => {
    const dummy = new DummyError("dummy")
    const ref = Cancelable.of(() => { throw dummy })

    try {
      ref.cancel()
    } catch (e) {
      expect(e).toBe(dummy)
    }

    // Second time it shouldn't do anything
    ref.cancel()
  })
})

describe("Cancelable.empty", () => {
  it("always returns the same reference", () => {
    const c = Cancelable.empty()
    c.cancel() // no-op
    const c2 = Cancelable.empty()
    c2.cancel() // no-op
    expect(c2).toBe(c)
  })
})

describe("Cancelable.collection", () => {
  it("cancels multiple references", () => {
    const refs = [new TestCancelable(), new TestCancelable(), new TestCancelable()]
    const main = Cancelable.collection(...refs)

    for (const c of refs) expect(c.isCanceled()).toBeFalsy()
    main.cancel()
    for (const c of refs) expect(c.isCanceled()).toBeTruthy()
    main.cancel() // no-op
  })

  it("throws single error", () => {
    const dummy = new DummyError("dummy")
    const refs = [
      BoolCancelable.empty(),
      BoolCancelable.of(() => { throw dummy }),
      BoolCancelable.empty()]

    const main = Cancelable.collection(...refs)
    for (const c of refs) expect(c.isCanceled()).toBeFalsy()

    try {
      main.cancel()
    } catch (e) {
      expect(e).toBe(dummy)
      for (const ref of refs) expect(ref.isCanceled()).toBe(true)
    }
  })

  it("throws multiple errors as a composite", () => {
    const dummy = new DummyError("dummy")
    function ref() { return Cancelable.of(() => { throw dummy }) }
    const refs = [ref(), ref(), ref()]
    const main = Cancelable.collection(...refs)

    try {
      main.cancel()
    } catch (e) {
      expect(e instanceof CompositeError).toBe(true)
      const composite = e as CompositeError
      expect(composite.errors().length).toBe(3)
      for (const ref of composite.errors()) expect(ref).toBe(dummy)
    }
  })

  it("works with anything being thrown", () => {
    const dummy = "dummy"
    const refs = [
      Cancelable.of(() => { throw dummy }),
      Cancelable.of(() => { throw dummy }),
      Cancelable.of(() => { throw dummy })]

    const main = Cancelable.collection(...refs)
    try {
      main.cancel()
    } catch (e) {
      expect(e instanceof CompositeError).toBe(true)
      const composite = e as CompositeError

      const errs = composite.errors()
      expect(errs.length).toBe(3)
      for (e of errs) expect(e).toBe(dummy)
    }
  })

  it("can be a BoolCancelable", () => {
    const ref = BoolCancelable.collection(
      new TestCancelable(),
      new TestCancelable(),
      new TestCancelable()
    )

    expect(ref.isCanceled()).toBe(false)
    ref.cancel()
    expect(ref.isCanceled()).toBe(true)
    ref.cancel() // no-op
  })
})

describe("BoolCancelable.from", () => {
  it("converts any callback", () => {
    let effect = false
    const c = BoolCancelable.of(() => { effect = true })

    expect(effect).toBeFalsy()
    expect(c.isCanceled()).toBeFalsy()

    c.cancel()
    expect(effect).toBeTruthy()
    expect(c.isCanceled()).toBeTruthy()
  })

  it("is idempotent", () => {
    let effect = 0
    const c = BoolCancelable.of(() => { effect += 1 })
    expect(c.isCanceled()).toBeFalsy()

    c.cancel()
    expect(effect).toBe(1)
    expect(c.isCanceled()).toBeTruthy()

    c.cancel()
    expect(effect).toBe(1)
    expect(c.isCanceled()).toBeTruthy()
  })

  it("is idempotent even if it throws", () => {
    const dummy = new DummyError("dummy")
    const ref = BoolCancelable.of(() => { throw dummy })
    expect(ref.isCanceled()).toBe(false)

    try {
      ref.cancel()
    } catch (e) {
      expect(e).toBe(dummy)
      expect(ref.isCanceled()).toBe(true)
    }

    // Second time it shouldn't do anything
    ref.cancel()
  })
})

describe("BoolCancelable.empty", () => {
  it("returns a reference that can be canceled", () => {
    const ref = BoolCancelable.empty()
    expect(ref.isCanceled()).toBe(false)
    ref.cancel()
    expect(ref.isCanceled()).toBe(true)
  })
})

describe("BoolCancelable.alreadyCanceled", () => {
  it("is already canceled", () => {
    const ref = BoolCancelable.alreadyCanceled()
    expect(ref.isCanceled()).toBe(true)
    ref.cancel() // no-op
    expect(ref.isCanceled()).toBe(true)
  })

  it("always returns the same reference", () => {
    const c = BoolCancelable.alreadyCanceled()
    const c2 = BoolCancelable.alreadyCanceled()
    expect(c2).toBe(c)
  })
})

describe("AssignCancelable", () => {
  test("alreadyCanceled", () => {
    const ref = AssignCancelable.alreadyCanceled()
    expect(ref.isCanceled()).toBe(true)

    const c = BoolCancelable.empty()
    expect(c.isCanceled()).toBe(false)

    ref.update(c)
    expect(c.isCanceled()).toBe(true)

    // Should be a no-op
    ref.cancel()
  })

  test("empty", () => {
    const ref = AssignCancelable.empty()
    expect(ref instanceof MultiAssignCancelable).toBe(true)
  })

  test("from", () => {
    let effect = 0
    const ref = AssignCancelable.of(() => { effect += 1 })

    expect(ref instanceof MultiAssignCancelable).toBe(true)
    ref.cancel()

    expect(ref.isCanceled()).toBe(true)
    expect(effect).toBe(1)
  })
})

describe("MultiAssignmentCancelable", () => {
  test("initialized to given instance", () => {
    const c = new TestCancelable()
    const ref = new MultiAssignCancelable(c)
    ref.cancel()

    expect(ref.isCanceled()).toBe(true)
    expect(c.isCanceled()).toBe(true)
    ref.cancel() // no-op
  })

  test("update multiple times", () => {
    const ref: MultiAssignCancelable =
      MultiAssignCancelable.empty()

    const c1 = new TestCancelable()
    ref.update(c1)

    const c2 = new TestCancelable()
    ref.update(c2)
    ref.cancel()

    const c3 = new TestCancelable()
    ref.update(c3)

    expect(c1.isCanceled()).toBe(false)
    expect(c2.isCanceled()).toBe(true)
    expect(c3.isCanceled()).toBe(true)
    ref.cancel() // no-op
  })

  test("cancel while empty", () => {
    const ref: MultiAssignCancelable =
      MultiAssignCancelable.empty()

    ref.cancel()
    expect(ref.isCanceled()).toBe(true)

    const c = new TestCancelable()
    ref.update(c)
    expect(c.isCanceled()).toBe(true)
  })

  test("from callback", () => {
    const ref: MultiAssignCancelable =
      MultiAssignCancelable.of(() => { effect += 1 })

    let effect = 0
    ref.cancel()
    expect(effect).toBe(1)
    ref.cancel() // no-op
    expect(effect).toBe(1)
  })

  test("from callback, update", () => {
    let effect = 0
    const ref: MultiAssignCancelable =
      MultiAssignCancelable.of(() => { effect += 1 })

    const c = new TestCancelable()
    ref.update(c)
    ref.cancel()

    expect(c.isCanceled()).toBe(true)
    expect(effect).toBe(0)
    ref.cancel() // no-op
  })

  test("collapse on another MultiAssignCancelable", () => {
    const mc1 = new MultiAssignCancelable()
    const mc2 = new MultiAssignCancelable()

    let effect = 0
    const c1 = Cancelable.of(() => { effect += 1 })

    mc1.update(c1).collapse()
    mc2.update(mc1).collapse()
    expect(effect).toBe(0)

    mc2.cancel()
    expect(mc2.isCanceled()).toBe(true)
    expect(effect).toBe(1)
    expect(mc1.isCanceled()).toBe(false)

    mc1.update(mc2).collapse()
    expect(mc1.isCanceled()).toBe(true)
  })

  test("clear to undefined", () => {
    const mc = new MultiAssignCancelable()

    let effect = 0
    const c1 = Cancelable.of(() => { effect += 1 })

    mc.update(c1)
    mc.clear()

    mc.cancel()
    expect(effect).toBe(0)
    mc.clear() // no-op
  })
})

describe("SerialAssignmentCancelable", () => {
  test("initialized to given instance", () => {
    const c = new TestCancelable()
    const ref = new SerialCancelable(c)
    ref.cancel()

    expect(ref.isCanceled()).toBe(true)
    expect(c.isCanceled()).toBe(true)
    ref.cancel() // no-op
  })

  test("update multiple times", () => {
    const ref: SerialCancelable =
      SerialCancelable.empty()

    const c1 = new TestCancelable()
    ref.update(c1)

    const c2 = new TestCancelable()
    ref.update(c2)
    ref.cancel()

    const c3 = new TestCancelable()
    ref.update(c3)

    expect(c1.isCanceled()).toBe(true)
    expect(c2.isCanceled()).toBe(true)
    expect(c3.isCanceled()).toBe(true)

    ref.cancel()
    expect(ref.isCanceled()).toBe(true)
    ref.cancel() // no-op
  })

  test("cancel while empty", () => {
    const ref: SerialCancelable =
      SerialCancelable.empty()

    ref.cancel()
    expect(ref.isCanceled()).toBe(true)

    const c = new TestCancelable()
    ref.update(c)
    expect(c.isCanceled()).toBe(true)
  })

  test("from callback", () => {
    let effect = 0
    const ref: SerialCancelable =
      SerialCancelable.of(() => { effect += 1 })

    ref.cancel()
    expect(effect).toBe(1)
    ref.cancel() // no-op
  })

  test("from callback, update", () => {
    let effect = 0
    const ref = SerialCancelable.of(() => { effect += 1 })

    const c = new TestCancelable()
    ref.update(c)
    ref.cancel()

    expect(c.isCanceled()).toBe(true)
    expect(effect).toBe(1)
    ref.cancel() // no-op
  })
})

describe("SingleAssignmentCancelable", () => {
  test("update once before cancel", () => {
    const ref: SingleAssignCancelable =
      SingleAssignCancelable.empty()

    const c = new TestCancelable()
    ref.update(c)
    expect(c.isCanceled()).toBe(false)

    ref.cancel()
    expect(c.isCanceled()).toBe(true)
    expect(ref.isCanceled()).toBe(true)

    ref.cancel()
    expect(c.isCanceled()).toBe(true)
  })

  test("update after cancel", () => {
    const ref: SingleAssignCancelable =
      SingleAssignCancelable.empty()

    ref.cancel()
    expect(ref.isCanceled()).toBe(true)

    const c1 = new TestCancelable()
    ref.update(c1)
    expect(c1.isCanceled()).toBe(true)

    const c2 = new TestCancelable()
    expect(() => ref.update(c2)).toThrowError()
  })

  test("update multiple times", () => {
    const ref: SingleAssignCancelable =
      SingleAssignCancelable.empty()

    const c1 = new TestCancelable()
    ref.update(c1)

    const c2 = new TestCancelable()
    expect(() => ref.update(c2)).toThrowError()
    ref.cancel()

    const c3 = new TestCancelable()
    expect(() => ref.update(c3)).toThrowError()

    expect(c1.isCanceled()).toBe(true)
    expect(c2.isCanceled()).toBe(false)
    expect(c3.isCanceled()).toBe(false)
    ref.cancel() // no-op
  })

  test("from callback", () => {
    const ref: SingleAssignCancelable =
      SingleAssignCancelable.of(() => { effect += 1 })

    let effect = 0
    ref.cancel()
    expect(effect).toBe(1)
    ref.cancel() // no-op
    expect(effect).toBe(1)
  })

  test("from callback, update", () => {
    let effect = 0
    const ref: SingleAssignCancelable =
      SingleAssignCancelable.of(() => { effect += 1 })

    const c = BoolCancelable.empty()
    expect(() => ref.update(c)).toThrowError()
    ref.cancel()

    expect(c.isCanceled()).toBe(false)
    expect(effect).toBe(1)
  })
})

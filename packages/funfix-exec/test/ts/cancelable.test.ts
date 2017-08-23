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

import { IllegalStateError, DummyError, CompositeError } from "funfix-core"
import * as assert from "./asserts"

import {
  Cancelable, BoolCancelable,
  AssignCancelable,
  MultiAssignCancelable,
  SingleAssignCancelable,
  SerialCancelable
} from "../../src/"

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
    assert.not(effect)

    c.cancel()
    assert.ok(effect)
  })

  it("is idempotent", () => {
    let effect = 0
    const c = Cancelable.of(() => { effect += 1 })

    c.cancel()
    assert.equal(effect, 1)
    c.cancel()
    assert.equal(effect, 1)
  })

  it("is idempotent even if it throws", () => {
    const dummy = new DummyError("dummy")
    const ref = Cancelable.of(() => { throw dummy })

    try {
      ref.cancel()
    } catch (e) {
      assert.equal(e, dummy)
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
    assert.equal(c2, c)
  })
})

describe("Cancelable.collection", () => {
  it("cancels multiple references", () => {
    const refs = [new TestCancelable(), new TestCancelable(), new TestCancelable()]
    const main = Cancelable.collection(...refs)

    for (const c of refs) assert.not(c.isCanceled())
    main.cancel()
    for (const c of refs) assert.ok(c.isCanceled())
    main.cancel() // no-op
  })

  it("throws single error", () => {
    const dummy = new DummyError("dummy")
    const refs = [
      BoolCancelable.empty(),
      BoolCancelable.of(() => { throw dummy }),
      BoolCancelable.empty()]

    const main = Cancelable.collection(...refs)
    for (const c of refs) assert.not(c.isCanceled())

    try {
      main.cancel()
    } catch (e) {
      assert.equal(e, dummy)
      for (const ref of refs) assert.ok(ref.isCanceled())
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
      assert.ok(e instanceof CompositeError)
      const composite = e as CompositeError
      assert.equal(composite.errors().length, 3)
      for (const ref of composite.errors()) assert.equal(ref, dummy)
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
      assert.ok(e instanceof CompositeError)
      const composite = e as CompositeError

      const errs = composite.errors()
      assert.equal(errs.length, 3)
      for (e of errs) assert.equal(e, dummy)
    }
  })

  it("can be a BoolCancelable", () => {
    const ref = BoolCancelable.collection(
      new TestCancelable(),
      new TestCancelable(),
      new TestCancelable()
    )

    assert.ok(!ref.isCanceled())
    ref.cancel()
    assert.ok(ref.isCanceled())
    ref.cancel() // no-op
  })
})

describe("BoolCancelable.from", () => {
  it("converts any callback", () => {
    let effect = false
    const c = BoolCancelable.of(() => { effect = true })

    assert.not(effect)
    assert.not(c.isCanceled())

    c.cancel()
    assert.ok(effect)
    assert.ok(c.isCanceled())
  })

  it("is idempotent", () => {
    let effect = 0
    const c = BoolCancelable.of(() => { effect += 1 })
    assert.not(c.isCanceled())

    c.cancel()
    assert.equal(effect, 1)
    assert.ok(c.isCanceled())

    c.cancel()
    assert.equal(effect, 1)
    assert.ok(c.isCanceled())
  })

  it("is idempotent even if it throws", () => {
    const dummy = new DummyError("dummy")
    const ref = BoolCancelable.of(() => { throw dummy })
    assert.not(ref.isCanceled())

    try {
      ref.cancel()
    } catch (e) {
      assert.equal(e, dummy)
      assert.ok(ref.isCanceled())
    }

    // Second time it shouldn't do anything
    ref.cancel()
  })
})

describe("BoolCancelable.empty", () => {
  it("returns a reference that can be canceled", () => {
    const ref = BoolCancelable.empty()
    assert.ok(!ref.isCanceled())
    ref.cancel()
    assert.ok(ref.isCanceled())
  })
})

describe("BoolCancelable.alreadyCanceled", () => {
  it("is already canceled", () => {
    const ref = BoolCancelable.alreadyCanceled()
    assert.ok(ref.isCanceled())
    ref.cancel() // no-op
    assert.ok(ref.isCanceled())
  })

  it("always returns the same reference", () => {
    const c = BoolCancelable.alreadyCanceled()
    const c2 = BoolCancelable.alreadyCanceled()
    assert.equal(c2, c)
  })
})

describe("AssignCancelable", () => {
  it("alreadyCanceled", () => {
    const ref = AssignCancelable.alreadyCanceled()
    assert.ok(ref.isCanceled())

    const c = BoolCancelable.empty()
    assert.ok(!c.isCanceled())

    ref.update(c)
    assert.ok(c.isCanceled())

    // Should be a no-op
    ref.cancel()
  })

  it("empty", () => {
    const ref = AssignCancelable.empty()
    assert.ok(ref instanceof MultiAssignCancelable)
  })

  it("from", () => {
    let effect = 0
    const ref = AssignCancelable.of(() => { effect += 1 })

    assert.ok(ref instanceof MultiAssignCancelable)
    ref.cancel()

    assert.ok(ref.isCanceled())
    assert.equal(effect, 1)
  })
})

describe("MultiAssignmentCancelable", () => {
  it("initialized to given instance", () => {
    const c = new TestCancelable()
    const ref = new MultiAssignCancelable(c)
    ref.cancel()

    assert.ok(ref.isCanceled())
    assert.ok(c.isCanceled())
    ref.cancel() // no-op
  })

  it("update multiple times", () => {
    const ref: MultiAssignCancelable =
      MultiAssignCancelable.empty()

    const c1 = new TestCancelable()
    ref.update(c1)

    const c2 = new TestCancelable()
    ref.update(c2)
    ref.cancel()

    const c3 = new TestCancelable()
    ref.update(c3)

    assert.equal(c1.isCanceled(), false)
    assert.ok(c2.isCanceled())
    assert.ok(c3.isCanceled())
    ref.cancel() // no-op
  })

  it("cancel while empty", () => {
    const ref: MultiAssignCancelable =
      MultiAssignCancelable.empty()

    ref.cancel()
    assert.ok(ref.isCanceled())

    const c = new TestCancelable()
    ref.update(c)
    assert.ok(c.isCanceled())
  })

  it("from callback", () => {
    const ref: MultiAssignCancelable =
      MultiAssignCancelable.of(() => { effect += 1 })

    let effect = 0
    ref.cancel()
    assert.equal(effect, 1)
    ref.cancel() // no-op
    assert.equal(effect, 1)
  })

  it("from callback, update", () => {
    let effect = 0
    const ref: MultiAssignCancelable =
      MultiAssignCancelable.of(() => { effect += 1 })

    const c = new TestCancelable()
    ref.update(c)
    ref.cancel()

    assert.ok(c.isCanceled())
    assert.equal(effect, 0)
    ref.cancel() // no-op
  })

  it("collapse on another MultiAssignCancelable", () => {
    const mc1 = new MultiAssignCancelable()
    const mc2 = new MultiAssignCancelable()

    let effect = 0
    const c1 = Cancelable.of(() => { effect += 1 })

    mc1.update(c1).collapse()
    mc2.update(mc1).collapse()
    assert.equal(effect, 0)

    mc2.cancel()
    assert.ok(mc2.isCanceled())
    assert.equal(effect, 1)
    assert.ok(!mc1.isCanceled())

    mc1.update(mc2).collapse()
    assert.ok(mc1.isCanceled())
  })

  it("clear to undefined", () => {
    const mc = new MultiAssignCancelable()

    let effect = 0
    const c1 = Cancelable.of(() => { effect += 1 })

    mc.update(c1)
    mc.clear()

    mc.cancel()
    assert.equal(effect, 0)
    mc.clear() // no-op
  })
})

describe("SerialAssignmentCancelable", () => {
  it("initialized to given instance", () => {
    const c = new TestCancelable()
    const ref = new SerialCancelable(c)
    ref.cancel()

    assert.ok(ref.isCanceled())
    assert.ok(c.isCanceled())
    ref.cancel() // no-op
  })

  it("update multiple times", () => {
    const ref: SerialCancelable =
      SerialCancelable.empty()

    const c1 = new TestCancelable()
    ref.update(c1)

    const c2 = new TestCancelable()
    ref.update(c2)
    ref.cancel()

    const c3 = new TestCancelable()
    ref.update(c3)

    assert.ok(c1.isCanceled())
    assert.ok(c2.isCanceled())
    assert.ok(c3.isCanceled())

    ref.cancel()
    assert.ok(ref.isCanceled())
    ref.cancel() // no-op
  })

  it("cancel while empty", () => {
    const ref: SerialCancelable =
      SerialCancelable.empty()

    ref.cancel()
    assert.ok(ref.isCanceled())

    const c = new TestCancelable()
    ref.update(c)
    assert.ok(c.isCanceled())
  })

  it("from callback", () => {
    let effect = 0
    const ref: SerialCancelable =
      SerialCancelable.of(() => { effect += 1 })

    ref.cancel()
    assert.equal(effect, 1)
    ref.cancel() // no-op
  })

  it("from callback, update", () => {
    let effect = 0
    const ref = SerialCancelable.of(() => { effect += 1 })

    const c = new TestCancelable()
    ref.update(c)
    ref.cancel()

    assert.ok(c.isCanceled())
    assert.equal(effect, 1)
    ref.cancel() // no-op
  })
})

describe("SingleAssignmentCancelable", () => {
  it("update once before cancel", () => {
    const ref: SingleAssignCancelable =
      SingleAssignCancelable.empty()

    const c = new TestCancelable()
    ref.update(c)
    assert.ok(!c.isCanceled())

    ref.cancel()
    assert.ok(c.isCanceled())
    assert.ok(ref.isCanceled())

    ref.cancel()
    assert.ok(c.isCanceled())
  })

  it("update after cancel", () => {
    const ref: SingleAssignCancelable =
      SingleAssignCancelable.empty()

    ref.cancel()
    assert.ok(ref.isCanceled())

    const c1 = new TestCancelable()
    ref.update(c1)
    assert.ok(c1.isCanceled())

    const c2 = new TestCancelable()
    assert.throws(() => ref.update(c2))
  })

  it("update multiple times", () => {
    const ref: SingleAssignCancelable =
      SingleAssignCancelable.empty()

    const c1 = new TestCancelable()
    ref.update(c1)

    const c2 = new TestCancelable()
    assert.throws(() => ref.update(c2))
    ref.cancel()

    const c3 = new TestCancelable()
    assert.throws(() => ref.update(c3))

    assert.ok(c1.isCanceled())
    assert.ok(!c2.isCanceled())
    assert.ok(!c3.isCanceled())
    ref.cancel() // no-op
  })

  it("from callback", () => {
    const ref: SingleAssignCancelable =
      SingleAssignCancelable.of(() => { effect += 1 })

    let effect = 0
    ref.cancel()
    assert.equal(effect, 1)
    ref.cancel() // no-op
    assert.equal(effect, 1)
  })

  it("from callback, update", () => {
    let effect = 0
    const ref: SingleAssignCancelable =
      SingleAssignCancelable.of(() => { effect += 1 })

    const c = BoolCancelable.empty()
    assert.throws(() => ref.update(c))
    ref.cancel()

    assert.ok(!c.isCanceled())
    assert.equal(effect, 1)
  })
})

/*
 * Copyright (c) 2017 by The Funcat Project Developers.
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

import { Cancelable, BoolCancelable } from "../../src/funcat-exec/cancelable"
import { DummyError, CompositeError } from "../../src/funcat-core/errors"

describe("Cancelable.from", () => {
  it("converts any callback", () => {
    let effect = false
    const c = Cancelable.from(() => { effect = true })
    expect(effect).toBeFalsy()

    c.cancel()
    expect(effect).toBeTruthy()
  })

  it("is idempotent", () => {
    let effect = 0
    const c = Cancelable.from(() => { effect += 1 })

    c.cancel()
    expect(effect).toBe(1)
    c.cancel()
    expect(effect).toBe(1)
  })

  it("is idempotent even if it throws", () => {
    const dummy = new DummyError("dummy")
    const ref = Cancelable.from(() => { throw dummy })

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
    const refs = [BoolCancelable.empty(), BoolCancelable.empty(), BoolCancelable.empty()]
    const main = Cancelable.collection(...refs)

    for (const c of refs) expect(c.isCanceled()).toBeFalsy()
    main.cancel()
    for (const c of refs) expect(c.isCanceled()).toBeTruthy()
  })

  it("throws single error", () => {
    const dummy = new DummyError("dummy")
    const refs = [
      BoolCancelable.empty(),
      BoolCancelable.from(() => { throw dummy }),
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
    function ref() { return Cancelable.from(() => { throw dummy }) }
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
      Cancelable.from(() => { throw dummy }),
      Cancelable.from(() => { throw dummy }),
      Cancelable.from(() => { throw dummy })]

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
})

describe("BoolCancelable.from", () => {
  it("converts any callback", () => {
    let effect = false
    const c = BoolCancelable.from(() => { effect = true })

    expect(effect).toBeFalsy()
    expect(c.isCanceled()).toBeFalsy()

    c.cancel()
    expect(effect).toBeTruthy()
    expect(c.isCanceled()).toBeTruthy()
  })

  it("is idempotent", () => {
    let effect = 0
    const c = BoolCancelable.from(() => { effect += 1 })
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
    const ref = BoolCancelable.from(() => { throw dummy })
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

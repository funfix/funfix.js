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
  DummyError,
  CompositeError,
  IllegalInheritanceError,
  IllegalStateError,
  NoSuchElementError,
  IllegalArgumentError,
  NotImplementedError
} from "../../src/funfix"

describe("DummyError", () => {
  it("has custom message", () => {
    const ex = new DummyError("dummy")

    expect(ex.name).toBe("DummyError")
    expect(ex.message).toBe("dummy")
  })
})

describe("CompositeError", () => {
  it("has custom message for 3 errors", () => {
    const ex = () => new DummyError("dummy")
    const composite = new CompositeError([ex(), ex(), ex()])

    expect(composite.name).toBe("CompositeError")
    expect(composite.message).toBe("DummyError(dummy), DummyError(dummy), ...")

    expect(composite.errors().length).toBe(3)
    for (const e of composite.errors()) {
      expect(e instanceof DummyError).toBe(true)
    }
  })

  it("has custom message for 2 errors", () => {
    const ex = () => new DummyError("dummy")
    const composite = new CompositeError([ex(), ex()])

    expect(composite.name).toBe("CompositeError")
    expect(composite.message).toBe("DummyError(dummy), DummyError(dummy)")

    expect(composite.errors().length).toBe(2)
    for (const e of composite.errors()) {
      expect(e instanceof DummyError).toBe(true)
    }
  })

  it("has custom message for empty array", () => {
    const composite = new CompositeError([])

    expect(composite.name).toBe("CompositeError")
    expect(composite.message).toBe("")
    expect(composite.errors().length).toBe(0)
  })
})

describe("IllegalStateError", () => {
  it("has custom message", () => {
    const ex = new IllegalStateError("dummy")

    expect(ex.name).toBe("IllegalStateError")
    expect(ex.message).toBe("dummy")
  })
})

describe("IllegalInheritanceError", () => {
  it("has custom message", () => {
    const ex = new IllegalInheritanceError("dummy")

    expect(ex.name).toBe("IllegalInheritanceError")
    expect(ex.message).toBe("dummy")
  })
})

describe("NoSuchElementError", () => {
  it("has custom message", () => {
    const ex = new NoSuchElementError("dummy")

    expect(ex.name).toBe("NoSuchElementError")
    expect(ex.message).toBe("dummy")
  })
})

describe("IllegalArgumentError", () => {
  it("has custom message", () => {
    const ex = new IllegalArgumentError("dummy")

    expect(ex.name).toBe("IllegalArgumentError")
    expect(ex.message).toBe("dummy")
  })
})

describe("NotImplementedError", () => {
  it("has custom message", () => {
    const ex = new NotImplementedError("dummy")

    expect(ex.name).toBe("NotImplementedError")
    expect(ex.message).toBe("dummy")
  })
})

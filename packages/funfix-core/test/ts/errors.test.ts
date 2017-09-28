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

import * as assert from "./asserts"

import {
  DummyError,
  CompositeError,
  IllegalInheritanceError,
  IllegalStateError,
  NoSuchElementError,
  IllegalArgumentError,
  NotImplementedError,
  TimeoutError
} from "../../src/"

describe("DummyError", () => {
  it("has custom message", () => {
    const ex = new DummyError("dummy")

    assert.equal(ex.name, "DummyError")
    assert.equal(ex.message, "dummy")
  })
})

describe("CompositeError", () => {
  it("has custom message for 3 errors", () => {
    const ex = () => new DummyError("dummy")
    const composite = new CompositeError(["simple", ex(), ex(), ex()])

    assert.equal(composite.name, "CompositeError")
    assert.equal(composite.message, "simple, DummyError(dummy), ...")

    assert.equal(composite.errors().length, 4)
    for (const e of composite.errors()) {
      assert.ok(e instanceof DummyError || typeof e === "string")
    }
  })

  it("has custom message for 2 errors", () => {
    const ex = () => new DummyError("dummy")
    const composite = new CompositeError([ex(), ex()])

    assert.equal(composite.name, "CompositeError")
    assert.equal(composite.message, "DummyError(dummy), DummyError(dummy)")

    assert.equal(composite.errors().length, 2)
    for (const e of composite.errors()) {
      assert.ok(e instanceof DummyError)
    }
  })

  it("has custom message for empty array", () => {
    const composite = new CompositeError([])

    assert.equal(composite.name, "CompositeError")
    assert.equal(composite.message, "")
    assert.equal(composite.errors().length, 0)
  })
})

describe("IllegalStateError", () => {
  it("has custom message", () => {
    const ex = new IllegalStateError("dummy")

    assert.equal(ex.name, "IllegalStateError")
    assert.equal(ex.message, "dummy")
  })
})

describe("IllegalInheritanceError", () => {
  it("has custom message", () => {
    const ex = new IllegalInheritanceError("dummy")

    assert.equal(ex.name, "IllegalInheritanceError")
    assert.equal(ex.message, "dummy")
  })
})

describe("NoSuchElementError", () => {
  it("has custom message", () => {
    const ex = new NoSuchElementError("dummy")

    assert.equal(ex.name, "NoSuchElementError")
    assert.equal(ex.message, "dummy")
  })
})

describe("IllegalArgumentError", () => {
  it("has custom message", () => {
    const ex = new IllegalArgumentError("dummy")

    assert.equal(ex.name, "IllegalArgumentError")
    assert.equal(ex.message, "dummy")
  })
})

describe("NotImplementedError", () => {
  it("has custom message", () => {
    const ex = new NotImplementedError("dummy")

    assert.equal(ex.name, "NotImplementedError")
    assert.equal(ex.message, "dummy")
  })
})

describe("TimeoutError", () => {
  it("has custom message", () => {
    const ex = new TimeoutError("dummy")

    assert.equal(ex.name, "TimeoutError")
    assert.equal(ex.message, "dummy")
  })
})

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
import { DynamicRef } from "../../src/"

describe("DynamicRef", () => {
  it("should return the default value", () => {
    const ref = DynamicRef.of(() => "value")

    assert.equal(ref.get(), "value")
    assert.equal(ref.get(), "value")
  })

  it("should be lazy", () => {
    let x = 0
    const ref = DynamicRef.of(() => ++x)

    assert.equal(ref.get(), 1)
    assert.equal(ref.get(), 2)
    assert.equal(ref.get(), 3)
  })

  it("should bind", () => {
    const ref = DynamicRef.of(() => 10)

    assert.equal(ref.get(), 10)
    assert.equal(ref.bind(20, () => ref.get() * 2), 40)
    assert.equal(ref.get(), 10)
  })

  it("should bind lazily", () => {
    let x = 10
    const ref = DynamicRef.of(() => 10)

    assert.equal(ref.get(), 10)
    assert.equal(ref.bindL(() => ++x, () => ref.get() * ref.get()), 11 * 12)
    assert.equal(ref.get(), 10)
  })
})

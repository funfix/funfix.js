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

import { DynamicRef } from "../../../src/exec/ref"

describe("DynamicRef", () => {
  it("should return the default value", () => {
    const ref = DynamicRef.of(() => "value")

    expect(ref.get()).toBe("value")
    expect(ref.get()).toBe("value")
  })

  it("should be lazy", () => {
    let x = 0
    const ref = DynamicRef.of(() => ++x)

    expect(ref.get()).toBe(1)
    expect(ref.get()).toBe(2)
    expect(ref.get()).toBe(3)
  })

  it("should bind", () => {
    const ref = DynamicRef.of(() => 10)

    expect(ref.get()).toBe(10)
    expect(ref.bind(20, () => ref.get() * 2)).toBe(40)
    expect(ref.get()).toBe(10)
  })

  it("should bind lazily", () => {
    let x = 10
    const ref = DynamicRef.of(() => 10)

    expect(ref.get()).toBe(10)
    expect(ref.bindL(() => ++x, () => ref.get() * ref.get())).toBe(11 * 12)
    expect(ref.get()).toBe(10)
  })
})

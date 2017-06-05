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

import { hashCode, equals, Option } from "../../src/funfix"

describe("hashCode", () => {
  it("works for string", () => {
    expect(hashCode("hello")).toBe(99162322)
  })

  it("works for number", () => {
    expect(hashCode(1000)).toBe(1000)
    expect(hashCode(1000.10)).toBe(1000)
  })

  it("works works for complex type", () => {
    expect(hashCode(Option.some(1000))).toBe(1000)
  })
})

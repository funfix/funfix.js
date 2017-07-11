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

import * as jv from "jsverify"
import * as laws from "../laws"
import { Box } from "./box"
import { eqOf, HK } from "../../src/types"

const arbBox = jv.number.smap(n => new Box(n), b => b.value)

describe("Box is sane", () => {
  laws.testEq(Box, arbBox)

  test("can do higher kinds", () => {
    const box = new Box(1)
    const hk: HK<Box<any>, number> = box

    expect(() => box.__hkF()).toThrowError()
    expect(() => box.__hkA()).toThrowError()
  })
})

describe("Default Functor ops obeys laws", () => {
  laws.testFunctor(Box, arbBox, eqOf(Box))
})

describe("Default Applicative ops obeys laws", () => {
  laws.testApplicative(Box, arbBox, eqOf(Box))
})

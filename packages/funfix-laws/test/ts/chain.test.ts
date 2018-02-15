/*!
 * Copyright (c) 2017-2018 by The Funfix Project Developers.
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
import { HK } from "funfix-types"
import { Equiv } from "../../src"
import { chainCheck } from "../../test-common"
import { Box, BoxChain, BoxArbitrary } from "./box"

describe("Chain<Box>", () => {
  const genFAtoB =
    jv.fun(jv.string).smap(f => new Box(f), box => box.value) as
      jv.Arbitrary<HK<"box", (a: number) => string>>
  const genFBtoC =
    jv.fun(jv.int32).smap(f => new Box(f), box => box.value) as
      jv.Arbitrary<HK<"box", (a: string) => number>>

  chainCheck(
    BoxArbitrary(jv.number) as jv.Arbitrary<HK<"box", number>>,
    BoxArbitrary(jv.string) as jv.Arbitrary<HK<"box", string>>,
    BoxArbitrary(jv.int16) as jv.Arbitrary<HK<"box", number>>,
    jv.fun(jv.string),
    jv.fun(jv.int16),
    genFAtoB,
    genFBtoC,
    (eq: Equiv<HK<"box", any>>) => (eq.lh as Box<any>).value === (eq.rh as Box<any>).value,
    new BoxChain)
})
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
import * as assert from "./asserts"
import * as laws from "./laws"
import { Box, BoxApplicative } from "./box"
import { Success } from "funfix-core"
import {
  eqOf, Eq, Applicative, applicativeOf,
  getTypeClassInstance,
  registerTypeClassInstance
} from "../../src/"

const arbBox = jv.number.smap(n => new Box(Success(n)), b => b.value.get())

describe("Eq<Box> obeys laws", () => {
  laws.testEq(Box, arbBox)
})

describe("Functor<Box> obeys laws", () => {
  laws.testFunctor(Box, arbBox, eqOf(Box))
})

describe("Apply<Box> obeys laws", () => {
  laws.testApply(Box, arbBox, t => new Box(Success(t)), eqOf(Box))
})

describe("Applicative<Box> obeys laws", () => {
  laws.testApplicative(Box, arbBox, eqOf(Box))
})

describe("ApplicativeError<Box> obeys laws", () => {
  laws.testApplicativeError(Box, jv.number, arbBox, jv.string, eqOf(Box))
})

describe("FlatMap<Box> obeys laws", () => {
  laws.testFlatMap(Box, jv.number, arbBox, x => new Box(Success(x)), eqOf(Box))
})

describe("Monad<Box> obeys laws", () => {
  laws.testMonad(Box, jv.number, arbBox, eqOf(Box))
})

describe("MonadError<Box> obeys laws", () => {
  laws.testMonadError(Box, jv.number, arbBox, jv.string, eqOf(Box))
})

describe("Type class registration", () => {
  it("should not throw error if registering the same instance", () => {
    const ap = applicativeOf(Box)
    registerTypeClassInstance(Applicative)(Box, ap)
  })

  it("should throw error if registering type class multiple times", () => {
    try {
      registerTypeClassInstance(Applicative)(Box, new BoxApplicative())
    } catch (e) {
      assert.equal(e.name, "IllegalArgumentError")
    }
  })

  it("should throw error if type class isn't implemented", () => {
    try {
      getTypeClassInstance(Eq)(String)
    } catch (e) {
      assert.equal(e.name, "NotImplementedError")
    }
  })
})

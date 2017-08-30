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
  Either,
  Failure,
  Left,
  None,
  Right,
  Some,
  Success
} from "funfix-core"

import { Eq } from "../../src/"
import * as assert from "./asserts"

describe("Eq.testEq", () => {
  it("works for Option", () => {
    const opt1 = Some(1)
    const opt2 = Some(1)
    const opt3 = None

    assert.ok(Eq.testEq(opt1, opt1))
    assert.ok(Eq.testEq(opt1, opt2))
    assert.ok(Eq.testEq(opt2, opt1))
    assert.ok(Eq.testEq(opt3, opt3))

    assert.not(Eq.testEq(opt1, opt3))
    assert.not(Eq.testEq(opt3, opt1))
  })

  it("works for Try", () => {
    const opt1 = Success(1)
    const opt2 = Success(1)
    const opt3 = Failure("error")
    const opt4 = Failure("error")

    assert.ok(Eq.testEq(opt1, opt1))
    assert.ok(Eq.testEq(opt1, opt2))
    assert.ok(Eq.testEq(opt2, opt1))
    assert.ok(Eq.testEq(opt3, opt3))
    assert.ok(Eq.testEq(opt3, opt4))
    assert.ok(Eq.testEq(opt4, opt3))

    assert.not(Eq.testEq(opt1, opt3))
    assert.not(Eq.testEq(opt3, opt1))
  })

  it("works for Either", () => {
    const opt1: Either<string, number> = Right(1)
    const opt2: Either<string, number> = Right(1)
    const opt3: Either<string, number> = Left("error")
    const opt4: Either<string, number> = Left("error")

    assert.ok(Eq.testEq(opt1, opt1))
    assert.ok(Eq.testEq(opt1, opt2))
    assert.ok(Eq.testEq(opt2, opt1))
    assert.ok(Eq.testEq(opt3, opt3))
    assert.ok(Eq.testEq(opt3, opt4))
    assert.ok(Eq.testEq(opt4, opt3))

    assert.not(Eq.testEq(opt1, opt3))
    assert.not(Eq.testEq(opt3, opt1))
  })

  it("works for primitives", () => {
    assert.ok(Eq.testEq(1, 1))
    assert.ok(Eq.testEq("value", "value"))

    assert.not(Eq.testEq(0, 1))
    assert.not(Eq.testEq("yes", "no"))
  })

  it("works for null and undefined", () => {
    assert.ok(Eq.testEq(null, null))
    assert.not(Eq.testEq(null, undefined))
    assert.ok(Eq.testEq(undefined, undefined))
    assert.not(Eq.testEq(null, 1))
    assert.not(Eq.testEq(1, null))
  })
})

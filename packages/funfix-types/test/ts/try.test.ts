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

import { Try } from "funfix-core"
import * as jv from "jsverify"
import * as laws from "./laws"
import * as inst from "./instances"
import { eqOf } from "../../src"

describe("Try obeys type class laws", () => {
  laws.testEq(Try, inst.arbTry)
  laws.testMonadError(Try, jv.number, inst.arbTry, jv.string, eqOf(Try))
})

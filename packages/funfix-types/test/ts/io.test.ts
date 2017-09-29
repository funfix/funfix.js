/*!
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

import {  Scheduler, TestScheduler, ExecutionModel } from "funfix-exec"
import { IO } from "funfix-effect"
import * as jv from "jsverify"
import * as laws from "./laws"
import * as inst from "./instances"
import { Eq } from "../../src/"

describe("IO obeys type class laws", () => {
  const ec = new TestScheduler(ex => { throw ex }, ExecutionModel.synchronous())
  const eq = new (
    class extends Eq<IO<any>> {
      eqv(lh: IO<any>, rh: IO<any>): boolean {
        const f1 = lh.run(ec)
        const f2 = rh.run(ec)
        ec.tick(1000 * 60 * 60 * 24 * 10)
        return Eq.testEq(f1.value(), f2.value())
      }
    })()

  before(function() {
    Scheduler.global.set(ec)
    const f: any = IO
    f["_funTypes"]["eq"] = eq
  })

  after(function () {
    Scheduler.global.revert()
    const f: any = IO
    delete f["_funTypes"]["eq"]
  })

  laws.testMonadError(IO, jv.number, inst.arbIO, jv.string, eq)
  laws.testCoflatMap(IO, inst.arbIO, eq, undefined, false)
})

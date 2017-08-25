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

import { Future, Scheduler, TestScheduler, ExecutionModel } from "funfix-exec"
import * as jv from "jsverify"
import * as laws from "./laws"
import * as inst from "./instances"
import { Eq } from "../../src/"

//
import { applicativeOf } from "../../src/"
import * as assert from "./asserts"

describe("Future obeys type class laws", () => {
  const ec = new TestScheduler(ex => { throw ex }, ExecutionModel.synchronous())
  const eq = new (
    class extends Eq<Future<any>> {
      eqv(lh: Future<any>, rh: Future<any>): boolean {
        ec.tick(1000 * 60 * 60 * 24 * 10)
        return !lh.value().isEmpty() && lh.value().equals(rh.value())
      }
    })()

  before(function() {
    Scheduler.global.set(ec)
  })

  after(function () {
    Scheduler.global.revert()
  })

  const arbF = inst.arbFuture(ec)
  laws.testMonadError(Future, jv.number, arbF, jv.string, eq)
})

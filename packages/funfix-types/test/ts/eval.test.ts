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

import { is } from "funfix-core"
import { Eval } from "funfix-effect"
import * as jv from "jsverify"
import * as laws from "./laws"
import * as inst from "./instances"
import { Eq } from "../../src/"

describe("Eval obeys type class laws", () => {
  const eq =
    new (class extends Eq<Eval<any>> {
      eqv(lh: Eval<any>, rh: Eval<any>): boolean {
        let left: any = lh.get()
        let right: any = rh.get()

        while (true) {
          if (left instanceof Eval) {
            if (!(right instanceof Eval)) return false
            left = left.get()
            right = right.get()
          } else {
            return is(left, right)
          }
        }
      }
    })()

  laws.testMonad(Eval, jv.number, inst.arbEval, eq)
  laws.testComonad(Eval, inst.arbEval, eq)
})

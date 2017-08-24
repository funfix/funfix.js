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
import { Eval } from "../../src/"

export const arbEval: jv.Arbitrary<Eval<number>> =
  jv.pair(jv.number, jv.number).smap(
    v => {
      switch (v[0] % 6) {
        case 0:
          return Eval.now(v[1])
        case 1:
          return Eval.raise(v[1])
        case 2:
          return Eval.always(() => v[1])
        case 3:
          return Eval.once(() => v[1])
        case 4:
          return Eval.suspend(() => Eval.now(v[1]))
        default:
          return Eval.now(0).flatMap(_ => Eval.now(v[1]))
      }
    },
    u => [u.get(), u.get()]
  )

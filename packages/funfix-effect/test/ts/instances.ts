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
import { Eval, IO } from "../../src/"
import {Failure, Success} from "funfix-core";

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

export const arbIO: jv.Arbitrary<IO<number>> =
  jv.pair(jv.number, jv.number).smap(
    v => {
      switch (v[0] % 9) {
        case 0:
          return IO.now(v[1])
        case 1:
          return IO.raise(v[1])
        case 2:
          return IO.always(() => v[1])
        case 3:
          return IO.once(() => v[1])
        case 4:
          return IO.suspend(() => IO.now(v[1]))
        case 5:
          return IO.async<number>((ec, cb) => cb(Success(v[1])))
        case 6:
          return IO.async<number>((ec, cb) => cb(Failure(v[1])))
        case 7:
          return IO.async<number>((ec, cb) => cb(Success(v[1]))).flatMap(IO.now)
        default:
          return IO.now(0).flatMap(_ => IO.now(v[1]))
      }
    },
    u => [0, 0]
  )

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
import { Eval, IO } from "../../src/"
import { Failure, Success } from "funfix-core"

export function arbEval<A>(arbA: jv.Arbitrary<A>): jv.Arbitrary<Eval<A>> {
  return jv.pair(jv.number, arbA).smap(
    v => {
      switch (Math.abs(v[0] % 7)) {
        case 0:
          return Eval.now(v[1])
        case 1:
          return Eval.always(() => v[1])
        case 2:
          return Eval.once(() => v[1])
        case 3:
          return Eval.suspend(() => Eval.now(v[1]))
        case 4:
          return Eval.always(() => v[1]).map(x => x)
        case 5:
          return Eval.always(() => v[1]).flatMap(Eval.pure)
        default:
          return Eval.now(0).flatMap(() => Eval.now(v[1]))
      }
    },
    e => [0, e.get()]
  )
}

export const arbEvalNum: jv.Arbitrary<Eval<number>> =
  arbEval(jv.int32)

export function arbIO<A>(arbA: jv.Arbitrary<A>): jv.Arbitrary<IO<A>> {
  return jv.pair(jv.number, arbA).smap(
    v => {
      switch (Math.abs(v[0] % 11)) {
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
          return IO.async<A>((ec, cb) => cb(Success(v[1])))
        case 6:
          return IO.async<A>((ec, cb) => cb(Failure(v[1])))
        case 7:
          return IO.async<A>((ec, cb) => cb(Success(v[1]))).flatMap(IO.now)
        case 8:
          return IO.now(0).flatMap(() => IO.now(v[1]))
        case 9:
          return IO.always(() => v[1]).memoizeOnSuccess()
        default:
          return IO.suspend(() => IO.pure(v[1])).memoize()
      }
    },
    io => [0, arbA.generator(0)]
  )
}

export const arbIONum: jv.Arbitrary<IO<number>> =
  arbIO(jv.int32)

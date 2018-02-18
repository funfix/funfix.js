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
import { DummyError, Success } from "funfix-core"

import {
  Future,
  Scheduler,
  TimeUnit,
  Duration,
  NANOSECONDS,
  MICROSECONDS,
  MILLISECONDS,
  SECONDS,
  MINUTES,
  HOURS,
  DAYS
} from "../../src/"

export const arbAnyPrimitive: jv.Arbitrary<any> =
  jv.sum([jv.number, jv.string, jv.falsy])
    .smap(v => v.value, v => v)

export const arbTimeUnit: jv.Arbitrary<TimeUnit> =
  jv.int8.smap(
    n => {
      switch (Math.abs(n % 7)) {
        case 0: return NANOSECONDS
        case 1: return MICROSECONDS
        case 2: return MILLISECONDS
        case 3: return SECONDS
        case 4: return MINUTES
        case 5: return HOURS
        default: return DAYS
      }
    },
    unit => unit.ord
  )

export const arbDuration: jv.Arbitrary<Duration> =
  jv.pair(jv.number, arbTimeUnit).smap(
    v => new Duration(v[0], v[1]),
    d => [d.duration, d.unit]
  )

export function arbFuture(sc: Scheduler): jv.Arbitrary<Future<number>> {
  return arbFutureFrom(jv.int32, sc)
}

export function arbFutureFrom<A>(arbA: jv.Arbitrary<A>, sc: Scheduler): jv.Arbitrary<Future<A>> {
  return jv.pair(jv.int32, arbA).smap(
    arr => {
      const [i, a] = arr
      switch (Math.abs(i % 7)) {
        case 0:
          return Future.pure(a, sc)
        case 1:
          return Future.raise(new DummyError(`dummy${a}`), sc)
        case 2:
          return Future.of(() => a, sc)
        case 3:
          return Future.of(() => { throw new DummyError(`dummy${a}`) }, sc)
        case 4:
          return Future.of(() => a, sc).map(x => x)
        case 5:
          return Future.of(() => a, sc).flatMap(x => Future.pure(x, sc))
        default:
          return Future.create(cb => {
            sc.trampoline(() => cb(Success(a)))
          }, sc)
      }
    },
    () => undefined
  )
}

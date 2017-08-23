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

import { Eval } from "funfix-effect"

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
} from "funfix-exec"

import {
  Option, Some,
  Either, Left, Right,
  Try, Failure, Success,
  DummyError
} from "funfix-core"

export const arbAnyPrimitive: jv.Arbitrary<any> =
  jv.sum([jv.number, jv.string, jv.falsy])
    .smap(v => v.value, v => v)

export const arbOpt: jv.Arbitrary<Option<any>> =
  arbAnyPrimitive.smap(Option.of, opt => opt.orNull())

export const arbOptNonempty: jv.Arbitrary<Option<number>> =
  jv.number.smap(Some, opt => opt.getOrElse(0))

export const arbEither: jv.Arbitrary<Either<number, number>> =
  jv.number.smap(
    i => i % 4 < 3 ? Right(i) : Left(i),
    (fa: Either<number, number>) => fa.isRight() ? fa.get() : fa.left().get()
  )

export const arbSuccess: jv.Arbitrary<Try<number>> =
  jv.number.smap(Try.pure, t => t.get())

export const arbFailure: jv.Arbitrary<Try<number>> =
  jv.constant(Try.failure<number>(new DummyError("dummy")))

export const arbTry: jv.Arbitrary<Try<number>> =
  jv.number.smap(
    i => i % 4 < 3 ? Success(i) : Failure(i),
    fa => fa.isSuccess() ? fa.get() : fa.failed().get() as any
  )

export const arbAny: jv.Arbitrary<any> =
  jv.sum([jv.number, jv.string, jv.falsy, arbOpt, arbEither])
    .smap(v => v.valueOf(), v => v)

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

export const arbTimeUnit: jv.Arbitrary<TimeUnit> =
  jv.int8.smap(
    n => {
      switch (n % 7) {
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

export function arbFuture(s: Scheduler): jv.Arbitrary<Future<number>> {
  return jv.int32.smap(
    i => {
      switch (i % 5) {
        case 0:
          return Future.pure(i, s)
        case 1:
          return Future.raise(new DummyError(`dummy${i}`), s)
        case 2:
          return Future.of(() => i, s)
        case 3:
          return Future.of(() => { throw new DummyError(`dummy${i}`) })
        default:
          return Future.create(cb => {
            s.trampoline(() => cb(Success(i)))
          })
      }
    },
    fa => fa.value().getOrElse(Success(0)).getOrElse(0)
  )
}

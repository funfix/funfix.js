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

import {
  Option, Some,
  Either, Left, Right,
  Try, Failure, Success,
  DummyError, is
} from "../../src/"

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
    fa => fa.isSuccess() ? fa.get() : fa.failed().get()
  )

export const arbAny: jv.Arbitrary<any> =
  jv.sum([jv.number, jv.string, jv.falsy, arbOpt, arbEither])
    .smap(v => v.valueOf(), v => v)

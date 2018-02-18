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

import {
  Option, Some, None,
  Either, Left, Right,
  Try, Failure, Success,
  DummyError
} from "../../src/"

export const arbAnyPrimitive: jv.Arbitrary<any> =
  jv.sum([jv.number, jv.string, jv.falsy])
    .smap(v => v.value, v => v)

export function arbOpt<A>(arbA: jv.Arbitrary<A>): jv.Arbitrary<Option<A>> {
  return jv.pair(jv.int32, arbA).smap(
    tuple => {
      const [i, a] = tuple
      return i % 2 === 0 ? Some(a) : None
    },
    opt => {
      return opt.nonEmpty()
        ? [0, opt.value]
        : [1, undefined]
    }
  )
}

export const arbOptAny: jv.Arbitrary<Option<any>> =
  arbAnyPrimitive.smap(Option.of, opt => opt.orNull())

export const arbOptAnyNonEmpty: jv.Arbitrary<Option<number>> =
  jv.number.smap(Some, opt => opt.getOrElse(0))

export function arbEither<R>(arbR: jv.Arbitrary<R>): jv.Arbitrary<Either<number, R>> {
  return jv.pair(jv.int32, arbR).smap(
    tuple => {
      const [l, r] = tuple
      return l % 2 === 0 ? Either.right(r) : Either.left(l)
    },
    either => {
      return either.isLeft()
        ? [either.value, undefined as any]
        : [0, either.value]
    }
  )
}

export const arbEitherNum: jv.Arbitrary<Either<number, number>> =
  arbEither(jv.int32)

export const arbSuccess: jv.Arbitrary<Try<number>> =
  jv.number.smap(Try.pure, t => t.get())

export const arbFailure: jv.Arbitrary<Try<number>> =
  jv.constant(Try.failure<number>(new DummyError("dummy")))

export function arbTry<A>(arbA: jv.Arbitrary<A>): jv.Arbitrary<Try<A>> {
  return jv.pair(jv.int32, arbA).smap(
    tuple => {
      const [i, a] = tuple
      return i % 2 === 0 ? Success(a) : Failure(i)
    },
    opt => {
      return opt.isSuccess()
        ? [0, opt.value]
        : [opt.failed().get() as number, undefined]
    }
  )
}

export const arbTryNumber: jv.Arbitrary<Try<number>> =
  jv.number.smap(
    i => i % 4 < 3 ? Success(i) : Failure(i),
    fa => fa.isSuccess() ? fa.get() : fa.failed().get() as any
  )

export const arbAny: jv.Arbitrary<any> =
  jv.sum([jv.number, jv.string, jv.falsy, arbOptAny, arbEitherNum])
    .smap(v => v.valueOf(), v => v)

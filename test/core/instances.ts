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

import { Option } from "../../src/funfix"
import * as jv from "jsverify"
import {Either} from "../../src/core/either";

export const arbAnyPrimitive: jv.Arbitrary<any> =
  jv.sum([jv.number, jv.string, jv.falsy])
    .smap(v => v.value, v => v)

export const arbOpt: jv.Arbitrary<Option<any>> =
  arbAnyPrimitive.smap(Option.of, opt => opt.orNull())

export const arbOptNonempty: jv.Arbitrary<Option<number>> =
  jv.number.smap(Option.of, opt => opt.orNull())

export const arbEither: jv.Arbitrary<Either<number, string>> =
  jv.either(jv.number, jv.string).smap(
    (v: number | string) => (typeof v === "string")
      ? Either.right(v.valueOf())
      : Either.left(v.valueOf()),
    (e: Either<number, string>) => e.isRight()
      ? e.getOrElse("")
      : e.swap().getOrElse(0)
  )

export const arbAny: jv.Arbitrary<any> =
  jv.sum([jv.number, jv.string, jv.falsy, arbOpt, arbEither])
    .smap(v => v.valueOf(), v => v)

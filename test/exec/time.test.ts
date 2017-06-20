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

import { NANOSECONDS, MICROSECONDS } from "../../src/funfix"
import * as jv from "jsverify"

describe("NANOSECONDS", () => {
  jv.property("NANOSECONDS.toNanos(d) === d",
    jv.number,
    n => NANOSECONDS.toNanos(n) === n
  )

  jv.property("NANOSECONDS.toMicros(positiveInt) === Math.floor(positiveInt / 1000)",
    jv.uint32,
    n => NANOSECONDS.toMicros(n) === Math.floor(n / 1000)
  )

  jv.property("NANOSECONDS.toMicros(negativeInt) === Math.ceil(negativeInt / 1000)",
    jv.int32,
    n => n >= 0 || NANOSECONDS.toMicros(n) === Math.ceil(n / 1000)
  )

  jv.property("NANOSECONDS.toMillis(positiveInt) === Math.floor(positiveInt / 1000000)",
    jv.uint32,
    n => NANOSECONDS.toMillis(n) === Math.floor(n / 1000000)
  )

  jv.property("NANOSECONDS.toMillis(negativeInt) === Math.ceil(negativeInt / 1000000)",
    jv.int32,
    n => n >= 0 || NANOSECONDS.toMillis(n) === Math.ceil(n / 1000000)
  )

  jv.property("NANOSECONDS.toSeconds(positiveInt) === Math.floor(positiveInt / 1000000000)",
    jv.uint32,
    n => NANOSECONDS.toSeconds(n) === Math.floor(n / 1000000000)
  )

  jv.property("NANOSECONDS.toSeconds(negativeInt) === Math.ceil(negativeInt / 1000000000)",
    jv.int32,
    n => n >= 0 || NANOSECONDS.toSeconds(n) === Math.ceil(n / 1000000000)
  )

  jv.property("NANOSECONDS.toMinutes(positiveInt) === Math.floor(positiveInt / 60000000000)",
    jv.uint32,
    n => NANOSECONDS.toMinutes(n) === Math.floor(n / 60000000000)
  )

  jv.property("NANOSECONDS.toMinutes(negativeInt) === Math.ceil(negativeInt / 60000000000)",
    jv.int32,
    n => n >= 0 || NANOSECONDS.toMinutes(n) === Math.ceil(n / 60000000000)
  )

  jv.property("NANOSECONDS.toHours(positiveInt) === Math.floor(positiveInt / 3600000000000)",
    jv.uint32,
    n => NANOSECONDS.toHours(n) === Math.floor(n / 3600000000000)
  )

  jv.property("NANOSECONDS.toHours(negativeInt) === Math.ceil(negativeInt / 3600000000000)",
    jv.int32,
    n => n >= 0 || NANOSECONDS.toHours(n) === Math.ceil(n / 3600000000000)
  )

  jv.property("NANOSECONDS.toDays(positiveInt) === Math.floor(positiveInt / (24 * 3600000000000))",
    jv.uint32,
    n => NANOSECONDS.toDays(n) === Math.floor(n / (24 * 3600000000000))
  )

  jv.property("NANOSECONDS.toDays(negativeInt) === Math.ceil(negativeInt / (24 * 3600000000000))",
    jv.int32,
    n => n >= 0 || NANOSECONDS.toDays(n) === Math.ceil(n / (24 * 3600000000000))
  )
})

describe("MICROSECONDS", () => {
  jv.property("MICROSECONDS.toMicros(d) === d",
    jv.number,
    n => MICROSECONDS.toMicros(n) === n
  )

  jv.property("MICROSECONDS.toNanos(MAX) === MAX",
    jv.uint32,
    n => MICROSECONDS.toNanos(Number.MAX_SAFE_INTEGER + 1) === Number.MAX_SAFE_INTEGER + 1
  )

  jv.property("MICROSECONDS.toNanos(NANOSECONDS.toMicros(n)) === n",
    jv.uint32,
    n => MICROSECONDS.toNanos(NANOSECONDS.toMicros(n)) === Math.trunc(n / 1000) * 1000
  )

  jv.property("MICROSECONDS.toMillis(positiveInt) === Math.floor(positiveInt / 1000)",
    jv.uint32,
    n => MICROSECONDS.toMillis(n) === Math.floor(n / 1000)
  )

  jv.property("MICROSECONDS.toMillis(negativeInt) === Math.ceil(negativeInt / 1000)",
    jv.int32,
    n => n >= 0 || MICROSECONDS.toMillis(n) === Math.ceil(n / 1000)
  )

  jv.property("MICROSECONDS.toSeconds(positiveInt) === Math.floor(positiveInt / 1000000)",
    jv.uint32,
    n => MICROSECONDS.toSeconds(n) === Math.floor(n / 1000000)
  )

  jv.property("MICROSECONDS.toSeconds(negativeInt) === Math.ceil(negativeInt / 1000000)",
    jv.int32,
    n => n >= 0 || MICROSECONDS.toSeconds(n) === Math.ceil(n / 1000000)
  )

  jv.property("MICROSECONDS.toMinutes(positiveInt) === Math.floor(positiveInt / 60000000)",
    jv.uint32,
    n => MICROSECONDS.toMinutes(n) === Math.floor(n / 60000000)
  )

  jv.property("MICROSECONDS.toMinutes(negativeInt) === Math.ceil(negativeInt / 60000000)",
    jv.int32,
    n => n >= 0 || MICROSECONDS.toMinutes(n) === Math.ceil(n / 60000000)
  )

  jv.property("MICROSECONDS.toHours(positiveInt) === Math.floor(positiveInt / 3600000000)",
    jv.uint32,
    n => MICROSECONDS.toHours(n) === Math.floor(n / 3600000000)
  )

  jv.property("MICROSECONDS.toHours(negativeInt) === Math.ceil(negativeInt / 3600000000000)",
    jv.int32,
    n => n >= 0 || MICROSECONDS.toHours(n) === Math.ceil(n / 3600000000)
  )

  jv.property("MICROSECONDS.toDays(positiveInt) === Math.floor(positiveInt / (24 * 3600000000))",
    jv.uint32,
    n => MICROSECONDS.toDays(n) === Math.floor(n / (24 * 3600000000))
  )

  jv.property("MICROSECONDS.toDays(negativeInt) === Math.ceil(negativeInt / (24 * 3600000000))",
    jv.int32,
    n => n >= 0 || MICROSECONDS.toDays(n) === Math.ceil(n / (24 * 3600000000))
  )
})

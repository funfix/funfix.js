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
import * as inst from "../instances"
import {
  is,
  NANOSECONDS,
  MICROSECONDS,
  MILLISECONDS,
  SECONDS,
  MINUTES,
  HOURS,
  DAYS,
  Duration
} from "../../src/funfix"

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

  jv.property("NANOSECONDS.convert(d, MICROSECONDS) === MICROSECONDS.to",
    jv.integer,
    d => NANOSECONDS.convert(d, MICROSECONDS) === MICROSECONDS.toNanos(d)
  )
})

describe("MICROSECONDS", () => {
  jv.property("MICROSECONDS.toMicros(d) === d",
    jv.number,
    n => MICROSECONDS.toMicros(n) === n
  )

  test("MICROSECONDS.toNanos(MAX) === MAX", () => {
    expect(MICROSECONDS.toNanos(Number.MAX_SAFE_INTEGER + 1))
      .toBe(Number.MAX_SAFE_INTEGER + 1)
  })

  test("MICROSECONDS.toNanos(MIN) === MIN", () => {
    expect(MICROSECONDS.toNanos(Number.MIN_SAFE_INTEGER - 1))
      .toBe(Number.MIN_SAFE_INTEGER - 1)
  })

  test("MICROSECONDS.toNanos(1) === 1000", () => {
    expect(MICROSECONDS.toNanos(1)).toBe(1000)
    expect(NANOSECONDS.toMicros(1000)).toBe(1)
  })

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

  jv.property("MICROSECONDS.convert(d, NANOSECONDS) === NANOSECONDS.toMicros(d)",
    jv.integer,
    d => MICROSECONDS.convert(d, NANOSECONDS) === NANOSECONDS.toMicros(d)
  )
})

describe("MILLISECONDS", () => {
  jv.property("MILLISECONDS.toMillis(d) === d",
    jv.number,
    n => MILLISECONDS.toMillis(n) === n
  )

  test("MILLISECONDS.toNanos(MAX) === MAX", () => {
    expect(MILLISECONDS.toNanos(Number.MAX_SAFE_INTEGER + 1))
      .toBe(Number.MAX_SAFE_INTEGER + 1)
  })

  test("MILLISECONDS.toNanos(MIN) === MIN", () => {
    expect(MILLISECONDS.toNanos(Number.MIN_SAFE_INTEGER - 1))
      .toBe(Number.MIN_SAFE_INTEGER - 1)
  })

  test("MILLISECONDS.toNanos(1) === 1000000", () => {
    expect(MILLISECONDS.toNanos(1)).toBe(1000000)
    expect(NANOSECONDS.toMillis(1000000)).toBe(1)
  })

  jv.property("MILLISECONDS.toNanos(NANOSECONDS.toMillis(n)) === trunc(n / 1000000) * 1000000",
    jv.uint32,
    n => MILLISECONDS.toNanos(NANOSECONDS.toMillis(n)) === Math.trunc(n / 1000000) * 1000000
  )

  test("MILLISECONDS.toMicros(1) === 1000", () => {
    expect(MILLISECONDS.toMicros(1)).toBe(1000)
    expect(MICROSECONDS.toMillis(1000)).toBe(1)
  })

  jv.property("MILLISECONDS.toMicros(MICROSECONDS.toMillis(n)) === trunc(n / 1000) * 1000",
    jv.uint32,
    n => MILLISECONDS.toMicros(MICROSECONDS.toMillis(n)) === Math.trunc(n / 1000) * 1000
  )

  jv.property("MILLISECONDS.toSeconds(positiveInt) === Math.floor(positiveInt / 1000)",
    jv.uint32,
    n => MILLISECONDS.toSeconds(n) === Math.floor(n / 1000)
  )

  jv.property("MILLISECONDS.toSeconds(negativeInt) === Math.ceil(negativeInt / 1000)",
    jv.int32,
    n => n >= 0 || MILLISECONDS.toSeconds(n) === Math.ceil(n / 1000)
  )

  jv.property("MILLISECONDS.toMinutes(positiveInt) === Math.floor(positiveInt / 60000)",
    jv.uint32,
    n => MILLISECONDS.toMinutes(n) === Math.floor(n / 60000)
  )

  jv.property("MILLISECONDS.toMinutes(negativeInt) === Math.ceil(negativeInt / 60000)",
    jv.int32,
    n => n >= 0 || MILLISECONDS.toMinutes(n) === Math.ceil(n / 60000)
  )

  jv.property("MILLISECONDS.toHours(positiveInt) === Math.floor(positiveInt / 3600000)",
    jv.uint32,
    n => MILLISECONDS.toHours(n) === Math.floor(n / 3600000)
  )

  jv.property("MILLISECONDS.toHours(negativeInt) === Math.ceil(negativeInt / 3600000000)",
    jv.int32,
    n => n >= 0 || MILLISECONDS.toHours(n) === Math.ceil(n / 3600000)
  )

  jv.property("MILLISECONDS.toDays(positiveInt) === Math.floor(positiveInt / (24 * 3600000))",
    jv.uint32,
    n => MILLISECONDS.toDays(n) === Math.floor(n / (24 * 3600000))
  )

  jv.property("MILLISECONDS.toDays(negativeInt) === Math.ceil(negativeInt / (24 * 3600000))",
    jv.int32,
    n => n >= 0 || MILLISECONDS.toDays(n) === Math.ceil(n / (24 * 3600000))
  )

  jv.property("MILLISECONDS.convert(d, NANOSECONDS) === NANOSECONDS.toMillis(d)",
    jv.integer,
    d => MILLISECONDS.convert(d, NANOSECONDS) === NANOSECONDS.toMillis(d)
  )

  jv.property("MILLISECONDS.convert(d, MICROSECONDS) === MICROSECONDS.toMillis(d)",
    jv.integer,
    d => MILLISECONDS.convert(d, MICROSECONDS) === MICROSECONDS.toMillis(d)
  )
})

describe("SECONDS", () => {
  jv.property("SECONDS.toSeconds(d) === d",
    jv.number,
    n => SECONDS.toSeconds(n) === n
  )

  test("SECONDS.toNanos(MAX) === MAX", () => {
    expect(SECONDS.toNanos(Number.MAX_SAFE_INTEGER + 1))
      .toBe(Number.MAX_SAFE_INTEGER + 1)
  })

  test("SECONDS.toNanos(MIN) === MIN", () => {
    expect(SECONDS.toNanos(Number.MIN_SAFE_INTEGER - 1))
      .toBe(Number.MIN_SAFE_INTEGER - 1)
  })

  test("SECONDS.toNanos(1) === 1000000000", () => {
    expect(SECONDS.toNanos(1)).toBe(1000000000)
    expect(NANOSECONDS.toSeconds(1000000000)).toBe(1)
  })

  jv.property("SECONDS.toNanos(NANOSECONDS.toSeconds(n)) === trunc(n / 1000000000) * 1000000000",
    jv.uint32,
    n => SECONDS.toNanos(NANOSECONDS.toSeconds(n)) === Math.trunc(n / 1000000000) * 1000000000
  )

  test("SECONDS.toMicros(1) === 1000000", () => {
    expect(SECONDS.toMicros(1)).toBe(1000000)
    expect(MICROSECONDS.toSeconds(1000000)).toBe(1)
  })

  jv.property("SECONDS.toMicros(MICROSECONDS.toSeconds(n)) === trunc(n / 1000000) * 1000000",
    jv.uint32,
    n => SECONDS.toMicros(MICROSECONDS.toSeconds(n)) === Math.trunc(n / 1000000) * 1000000
  )

  test("SECONDS.toMillis(1) === 1000", () => {
    expect(SECONDS.toMillis(1)).toBe(1000)
    expect(MILLISECONDS.toSeconds(1000)).toBe(1)
  })

  jv.property("SECONDS.toMillis(MILLISECONDS.toSeconds(n)) === trunc(n / 1000) * 1000",
    jv.uint32,
    n => SECONDS.toMillis(MILLISECONDS.toSeconds(n)) === Math.trunc(n / 1000) * 1000
  )

  jv.property("SECONDS.toMinutes(positiveInt) === Math.floor(positiveInt / 60)",
    jv.uint32,
    n => SECONDS.toMinutes(n) === Math.floor(n / 60)
  )

  jv.property("SECONDS.toMinutes(negativeInt) === Math.ceil(negativeInt / 60)",
    jv.int32,
    n => n >= 0 || SECONDS.toMinutes(n) === Math.ceil(n / 60)
  )

  jv.property("SECONDS.toHours(positiveInt) === Math.floor(positiveInt / 3600)",
    jv.uint32,
    n => SECONDS.toHours(n) === Math.floor(n / 3600)
  )

  jv.property("SECONDS.toHours(negativeInt) === Math.ceil(negativeInt / 3600000)",
    jv.int32,
    n => n >= 0 || SECONDS.toHours(n) === Math.ceil(n / 3600)
  )

  jv.property("SECONDS.toDays(positiveInt) === Math.floor(positiveInt / (24 * 3600))",
    jv.uint32,
    n => SECONDS.toDays(n) === Math.floor(n / (24 * 3600))
  )

  jv.property("SECONDS.toDays(negativeInt) === Math.ceil(negativeInt / (24 * 3600))",
    jv.int32,
    n => n >= 0 || SECONDS.toDays(n) === Math.ceil(n / (24 * 3600))
  )

  jv.property("SECONDS.convert(d, NANOSECONDS) === NANOSECONDS.toMillis(d)",
    jv.integer,
    d => SECONDS.convert(d, NANOSECONDS) === NANOSECONDS.toMillis(d)
  )

  jv.property("SECONDS.convert(d, MICROSECONDS) === MICROSECONDS.toMillis(d)",
    jv.integer,
    d => SECONDS.convert(d, MICROSECONDS) === MICROSECONDS.toMillis(d)
  )

  jv.property("SECONDS.convert(d, MILLISECONDS) === MILLISECONDS.toSeconds(d)",
    jv.integer,
    d => SECONDS.convert(d, MILLISECONDS) === MILLISECONDS.toSeconds(d)
  )
})

describe("MINUTES", () => {
  jv.property("MINUTES.toMinutes(d) === d",
    jv.number,
    n => MINUTES.toMinutes(n) === n
  )

  test("MINUTES.toNanos(MAX) === MAX", () => {
    expect(MINUTES.toNanos(Number.MAX_SAFE_INTEGER + 1))
      .toBe(Number.MAX_SAFE_INTEGER + 1)
  })

  test("MINUTES.toNanos(MIN) === MIN", () => {
    expect(MINUTES.toNanos(Number.MIN_SAFE_INTEGER - 1))
      .toBe(Number.MIN_SAFE_INTEGER - 1)
  })

  test("MINUTES.toNanos(1) === 60000000000", () => {
    expect(MINUTES.toNanos(1)).toBe(60000000000)
    expect(NANOSECONDS.toMinutes(60000000000)).toBe(1)
  })

  jv.property("MINUTES.toNanos(NANOSECONDS.toSeconds(n)) === trunc(n / 60000000000) * 60000000000",
    jv.uint32,
    n => MINUTES.toNanos(NANOSECONDS.toMinutes(n)) === Math.trunc(n / 60000000000) * 60000000000
  )

  test("MINUTES.toMicros(1) === 60000000", () => {
    expect(MINUTES.toMicros(1)).toBe(60000000)
    expect(MICROSECONDS.toMinutes(60000000)).toBe(1)
  })

  jv.property("MINUTES.toMicros(MICROSECONDS.toSeconds(n)) === trunc(n / 60000000) * 60000000",
    jv.uint32,
    n => MINUTES.toMicros(MICROSECONDS.toMinutes(n)) === Math.trunc(n / 60000000) * 60000000
  )

  test("MINUTES.toMillis(1) === 60000", () => {
    expect(MINUTES.toMillis(1)).toBe(60000)
    expect(MILLISECONDS.toMinutes(60000)).toBe(1)
  })

  jv.property("MINUTES.toMillis(MILLISECONDS.toMinutes(n)) === trunc(n / 60000) * 60000",
    jv.uint32,
    n => MINUTES.toMillis(MILLISECONDS.toMinutes(n)) === Math.trunc(n / 60000) * 60000
  )

  test("MINUTES.toSeconds(1) === 60", () => {
    expect(MINUTES.toSeconds(1)).toBe(60)
    expect(SECONDS.toMinutes(60)).toBe(1)
  })

  jv.property("MINUTES.toSeconds(positiveInt) === Math.floor(positiveInt * 60)",
    jv.uint32,
    n => MINUTES.toSeconds(n) === Math.floor(n * 60)
  )

  jv.property("MINUTES.toHours(positiveInt) === Math.floor(positiveInt / 60)",
    jv.uint32,
    n => MINUTES.toHours(n) === Math.floor(n / 60)
  )

  jv.property("MINUTES.toHours(negativeInt) === Math.ceil(positiveInt / 60)",
    jv.int32,
    n => n >= 0 || MINUTES.toHours(n) === Math.ceil(n / 60)
  )

  jv.property("MINUTES.toDays(positiveInt) === Math.floor(positiveInt / (24 * 60))",
    jv.uint32,
    n => MINUTES.toDays(n) === Math.floor(n / (24 * 60))
  )

  jv.property("MINUTES.toDays(negativeInt) === Math.ceil(negativeInt / (24 * 60))",
    jv.int32,
    n => n >= 0 || MINUTES.toDays(n) === Math.ceil(n / (24 * 60))
  )

  jv.property("MINUTES.convert(d, NANOSECONDS) === NANOSECONDS.toMinutes(d)",
    jv.integer,
    d => MINUTES.convert(d, NANOSECONDS) === NANOSECONDS.toMinutes(d)
  )

  jv.property("MINUTES.convert(d, MICROSECONDS) === MICROSECONDS.toMinutes(d)",
    jv.integer,
    d => MINUTES.convert(d, MICROSECONDS) === MICROSECONDS.toMinutes(d)
  )

  jv.property("MINUTES.convert(d, MILLISECONDS) === MILLISECONDS.toMinutes(d)",
    jv.integer,
    d => MINUTES.convert(d, MILLISECONDS) === MILLISECONDS.toMinutes(d)
  )

  jv.property("MINUTES.convert(d, SECONDS) === SECONDS.toMinutes(d)",
    jv.integer,
    d => MINUTES.convert(d, SECONDS) === SECONDS.toMinutes(d)
  )
})

describe("HOURS", () => {
  jv.property("HOURS.toHours(d) === d",
    jv.number,
    n => HOURS.toHours(n) === n
  )

  test("HOURS.toNanos(MAX) === MAX", () => {
    expect(HOURS.toNanos(Number.MAX_SAFE_INTEGER + 1))
      .toBe(Number.MAX_SAFE_INTEGER + 1)
  })

  test("HOURS.toNanos(MIN) === MIN", () => {
    expect(HOURS.toNanos(Number.MIN_SAFE_INTEGER - 1))
      .toBe(Number.MIN_SAFE_INTEGER - 1)
  })

  test("HOURS.toNanos(1) === 3600000000000", () => {
    expect(HOURS.toNanos(1)).toBe(3600000000000)
    expect(NANOSECONDS.toHours(3600000000000)).toBe(1)
  })

  jv.property("HOURS.toNanos(NANOSECONDS.toHours(n)) === trunc(n / 3600000000000) * 3600000000000",
    jv.uint32,
    n => HOURS.toNanos(NANOSECONDS.toHours(n)) === Math.trunc(n / 3600000000000) * 3600000000000
  )

  test("HOURS.toMicros(1) === 3600000000", () => {
    expect(HOURS.toMicros(1)).toBe(3600000000)
    expect(MICROSECONDS.toHours(3600000000)).toBe(1)
  })

  jv.property("HOURS.toMicros(MICROSECONDS.toHours(n)) === trunc(n / 3600000000) * 3600000000",
    jv.uint32,
    n => HOURS.toMicros(MICROSECONDS.toHours(n)) === Math.trunc(n / 3600000000) * 3600000000
  )

  test("HOURS.toMillis(1) === 3600000", () => {
    expect(HOURS.toMillis(1)).toBe(3600000)
    expect(MILLISECONDS.toHours(3600000)).toBe(1)
  })

  jv.property("HOURS.toMillis(MILLISECONDS.toHours(n)) === trunc(n / 3600000) * 3600000",
    jv.uint32,
    n => HOURS.toMillis(MILLISECONDS.toHours(n)) === Math.trunc(n / 3600000) * 3600000
  )

  test("HOURS.toSeconds(1) === 3600", () => {
    expect(HOURS.toSeconds(1)).toBe(3600)
    expect(SECONDS.toHours(3600)).toBe(1)
  })

  jv.property("HOURS.toSeconds(positiveInt) === Math.floor(positiveInt * 3600)",
    jv.uint32,
    n => HOURS.toSeconds(n) === Math.floor(n * 3600)
  )

  test("HOURS.toMinutes(1) === 60", () => {
    expect(HOURS.toMinutes(1)).toBe(60)
    expect(MINUTES.toHours(60)).toBe(1)
  })

  jv.property("HOURS.toMinutes(positiveInt) === Math.floor(positiveInt * 60)",
    jv.uint32,
    n => HOURS.toSeconds(n) === Math.floor(n * 3600)
  )

  jv.property("HOURS.toDays(positiveInt) === Math.floor(positiveInt / 24)",
    jv.uint32,
    n => HOURS.toDays(n) === Math.floor(n / 24)
  )

  jv.property("HOURS.toDays(negativeInt) === Math.ceil(negativeInt / 24)",
    jv.int32,
    n => n >= 0 || HOURS.toDays(n) === Math.ceil(n / 24)
  )

  jv.property("HOURS.convert(d, NANOSECONDS) === NANOSECONDS.toHours(d)",
    jv.integer,
    d => HOURS.convert(d, NANOSECONDS) === NANOSECONDS.toHours(d)
  )

  jv.property("HOURS.convert(d, MICROSECONDS) === MICROSECONDS.toHours(d)",
    jv.integer,
    d => HOURS.convert(d, MICROSECONDS) === MICROSECONDS.toHours(d)
  )

  jv.property("HOURS.convert(d, MILLISECONDS) === MILLISECONDS.toHours(d)",
    jv.integer,
    d => HOURS.convert(d, MILLISECONDS) === MILLISECONDS.toHours(d)
  )

  jv.property("HOURS.convert(d, SECONDS) === SECONDS.toHours(d)",
    jv.integer,
    d => HOURS.convert(d, SECONDS) === SECONDS.toHours(d)
  )
})

describe("DAYS", () => {
  jv.property("DAYS.toDays(d) === d",
    jv.number,
    n => DAYS.toDays(n) === n
  )

  test("DAYS.toNanos(MAX) === MAX", () => {
    expect(DAYS.toNanos(Number.MAX_SAFE_INTEGER + 1))
      .toBe(Number.MAX_SAFE_INTEGER + 1)
  })

  test("DAYS.toNanos(MIN) === MIN", () => {
    expect(DAYS.toNanos(Number.MIN_SAFE_INTEGER - 1))
      .toBe(Number.MIN_SAFE_INTEGER - 1)
  })

  test("DAYS.toNanos(1) === 3600000000000 * 24", () => {
    expect(DAYS.toNanos(1)).toBe(3600000000000 * 24)
    expect(NANOSECONDS.toDays(3600000000000 * 24)).toBe(1)
  })

  jv.property("DAYS.toNanos(NANOSECONDS.toDays(n)) === trunc(n / (3600000000000 * 24)) * (3600000000000 * 24)",
    jv.uint32,
    n => DAYS.toNanos(NANOSECONDS.toDays(n)) === Math.trunc(n / (3600000000000 * 24)) * (3600000000000 * 24)
  )

  test("DAYS.toMicros(1) === 3600000000 * 24", () => {
    expect(DAYS.toMicros(1)).toBe(3600000000 * 24)
    expect(MICROSECONDS.toDays(3600000000 * 24)).toBe(1)
  })

  jv.property("DAYS.toMicros(MICROSECONDS.toDays(n)) === trunc(n / (3600000000 * 24)) * (3600000000 * 24)",
    jv.uint32,
    n => DAYS.toMicros(MICROSECONDS.toDays(n)) === Math.trunc(n / (3600000000 * 24)) * (3600000000 * 24)
  )

  test("DAYS.toMillis(1) === (3600000 * 24)", () => {
    expect(DAYS.toMillis(1)).toBe((3600000 * 24))
    expect(MILLISECONDS.toDays((3600000 * 24))).toBe(1)
  })

  jv.property("DAYS.toMillis(MILLISECONDS.toDays(n)) === trunc(n / (3600000 * 24)) * (3600000 * 24)",
    jv.uint32,
    n => DAYS.toMillis(MILLISECONDS.toDays(n)) === Math.trunc(n / (3600000 * 24)) * (3600000 * 24)
  )

  test("DAYS.toSeconds(1) === 3600 * 24", () => {
    expect(DAYS.toSeconds(1)).toBe(3600 * 24)
    expect(SECONDS.toDays(3600 * 24)).toBe(1)
  })

  jv.property("DAYS.toSeconds(positiveInt) === Math.floor(positiveInt * 3600 * 24)",
    jv.uint32,
    n => DAYS.toSeconds(n) === Math.floor(n * 3600 * 24)
  )

  test("DAYS.toMinutes(1) === 60 * 24", () => {
    expect(DAYS.toMinutes(1)).toBe(60 * 24)
    expect(MINUTES.toDays(60 * 24)).toBe(1)
  })

  jv.property("DAYS.toMinutes(positiveInt) === Math.floor(positiveInt * 60 * 24)",
    jv.uint32,
    n => DAYS.toMinutes(n) === Math.floor(n * 60 * 24)
  )

  test("DAYS.toHours(1) === 24", () => {
    expect(DAYS.toHours(1)).toBe(24)
    expect(HOURS.toDays(24)).toBe(1)
  })

  jv.property("DAYS.toHours(positiveInt) === Math.floor(positiveInt * 24)",
    jv.uint32,
    n => DAYS.toHours(n) === Math.floor(n * 24)
  )

  jv.property("DAYS.convert(d, NANOSECONDS) === NANOSECONDS.toDays(d)",
    jv.integer,
    d => DAYS.convert(d, NANOSECONDS) === NANOSECONDS.toDays(d)
  )

  jv.property("DAYS.convert(d, MICROSECONDS) === MICROSECONDS.toDays(d)",
    jv.integer,
    d => DAYS.convert(d, MICROSECONDS) === MICROSECONDS.toDays(d)
  )

  jv.property("DAYS.convert(d, MILLISECONDS) === MILLISECONDS.toDays(d)",
    jv.integer,
    d => DAYS.convert(d, MILLISECONDS) === MILLISECONDS.toDays(d)
  )

  jv.property("DAYS.convert(d, SECONDS) === SECONDS.toDays(d)",
    jv.integer,
    d => DAYS.convert(d, SECONDS) === SECONDS.toDays(d)
  )

  jv.property("DAYS.convert(d, MINUTES) === MINUTES.toDays(d)",
    jv.integer,
    d => DAYS.convert(d, MINUTES) === MINUTES.toDays(d)
  )

  jv.property("DAYS.convert(d, HOURS) === HOURS.toDays(d)",
    jv.integer,
    d => DAYS.convert(d, HOURS) === HOURS.toDays(d)
  )
})

describe("Duration (finite)", () => {
  test("it can convert from nanos()", () => {
    const ref = Duration.nanos(86400000000000)
    expect(ref.isFinite()).toBe(true)
    expect(ref.toNanos()).toBe(86400000000000)
    expect(ref.toMicros()).toBe(86400000000)
    expect(ref.toMillis()).toBe(86400000)
    expect(ref.toSeconds()).toBe(86400)
    expect(ref.toMinutes()).toBe(1440)
    expect(ref.toHours()).toBe(24)
    expect(ref.toDays()).toBe(1)
  })

  test("it can convert from micros()", () => {
    const ref = Duration.micros(86400000000)
    expect(ref.toDays()).toBe(1)
  })

  test("it can convert from millis()", () => {
    const ref = Duration.millis(86400000)
    expect(ref.toDays()).toBe(1)

    const ref2 = Duration.of(86400000)
    expect(is(ref, ref2)).toBe(true)

    const ref3 = Duration.of(ref)
    expect(is(ref, ref3)).toBe(true)
  })

  test("it can convert from seconds()", () => {
    const ref = Duration.seconds(86400)
    expect(ref.toDays()).toBe(1)
  })

  test("it can convert from minutes()", () => {
    const ref = Duration.minutes(1440)
    expect(ref.toDays()).toBe(1)
  })

  test("it can convert from hours()", () => {
    const ref = Duration.hours(24)
    expect(ref.toDays()).toBe(1)
  })

  test("it can convert from days()", () => {
    const ref = Duration.days(1)
    expect(ref.toNanos()).toBe(86400000000000)
  })

  test("#equals is structural", () => {
    const ref = Duration.nanos(1000)
    expect(is(ref, Duration.nanos(1000))).toBe(true)
  })

  test("#equals and #hashCode provide equivalence", () => {
    const ref1 = Duration.nanos(86400000000000)
    const ref2 = Duration.days(1)
    expect(is(ref1, ref2)).toBe(true)
    expect(is(ref2, ref1)).toBe(true)
    expect(ref1.hashCode()).toBe(ref2.hashCode())
  })

  test("zero()", () => {
    expect(is(Duration.zero(), Duration.seconds(0))).toBe(true)
  })
})

describe("Duration (infinite)", () => {
  test("#equals", () => {
    expect(is(Duration.inf(), Duration.inf())).toBe(true)
    expect(is(Duration.negInf(), Duration.negInf())).toBe(true)
    expect(is(Duration.inf(), Duration.negInf())).toBe(false)
    expect(is(Duration.inf(), Duration.seconds(1))).toBe(false)
  })

  test("#hashCode", () => {
    expect(Duration.inf().hashCode()).toBe(Duration.inf().hashCode())
    expect(Duration.negInf().hashCode()).toBe(Duration.negInf().hashCode())
    expect(Duration.inf().hashCode() !== Duration.negInf().hashCode()).toBe(true)
  })

  test("NaN", () => {
    expect(() => new Duration(NaN, DAYS)).toThrowError()
  })
})

describe("Duration#plus", () => {
  jv.property("should work for same unit",
    jv.int32, jv.int32, inst.arbTimeUnit,
    (a, b, unit) => {
      const d1 = new Duration(a, unit)
      const d2 = new Duration(b, unit)
      const sum = d1.plus(d2)
      return sum.duration === a + b && sum.unit === unit
    })

  jv.property("should work for different units",
    jv.int32, jv.int32, inst.arbTimeUnit, inst.arbTimeUnit,
    (a, b, unit1, unit2) => {
      const d1 = new Duration(a, unit1)
      const d2 = new Duration(b, unit2)
      const sum = d1.plus(d2)

      if (unit1.ord <= unit2.ord) {
        return sum.duration === a + unit1.convert(b, unit2) && sum.unit === unit1
      } else {
        return sum.duration === unit2.convert(a, unit1) + b && sum.unit === unit2
      }
    })

  jv.property("inf() + n == inf()",
    jv.int32, inst.arbTimeUnit,
    (n, unit) => {
      const d = new Duration(n, unit)
      const sum = Duration.inf().plus(d)
      return !sum.isFinite() && is(sum, Duration.inf())
    })

  jv.property("negInf() + n == negInf()",
    jv.int32, inst.arbTimeUnit,
    (n, unit) => {
      const d = new Duration(n, unit)
      const sum = Duration.negInf().plus(d)
      return !sum.isFinite() && is(sum, Duration.negInf())
    })

  jv.property("n + inf() == inf()",
    jv.int32, inst.arbTimeUnit,
    (n, unit) => {
      const d = new Duration(n, unit)
      const sum = d.plus(Duration.inf())
      return !sum.isFinite() && is(sum, Duration.inf())
    })

  jv.property("negInf() + n == negInf()",
    jv.int32, inst.arbTimeUnit,
    (n, unit) => {
      const d = new Duration(n, unit)
      const sum = d.plus(Duration.negInf())
      return !sum.isFinite() && is(sum, Duration.negInf())
    })

  test("inf() + negInf() throws error", () => {
    expect(() => Duration.inf().plus(Duration.negInf()))
      .toThrowError()
    expect(() => Duration.negInf().plus(Duration.inf()))
      .toThrowError()
  })

  jv.property("(a + b) + c == a + (b + c) (associativity)",
    inst.arbDuration, inst.arbDuration, inst.arbDuration,
    (a, b, c) => is(a.plus(b).plus(c), a.plus(b.plus(c))))

  jv.property("a + b == b + a (transitivity)",
    inst.arbDuration, inst.arbDuration,
    (a, b) => is(a.plus(b), b.plus(a)))

  jv.property("a + zero == a (identity)",
    inst.arbDuration,
    a => a.plus(Duration.zero()) === a && is(Duration.zero().plus(a), a)
  )
})

describe("Duration#minus", () => {
  jv.property("should work for same unit",
    jv.int32, jv.int32, inst.arbTimeUnit,
    (a, b, unit) => {
      const d1 = new Duration(a, unit)
      const d2 = new Duration(b, unit)
      const sum = d1.minus(d2)
      return sum.duration === a - b && sum.unit === unit
    })

  jv.property("should work for different units",
    jv.int32, jv.int32, inst.arbTimeUnit, inst.arbTimeUnit,
    (a, b, unit1, unit2) => {
      const d1 = new Duration(a, unit1)
      const d2 = new Duration(b, unit2)
      const sum = d1.minus(d2)

      if (unit1.ord <= unit2.ord) {
        return sum.duration === a - unit1.convert(b, unit2) && sum.unit === unit1
      } else {
        return sum.duration === unit2.convert(a, unit1) - b && sum.unit === unit2
      }
    })

  jv.property("inf() - n == inf()",
    jv.int32, inst.arbTimeUnit,
    (n, unit) => {
      const d = new Duration(n, unit)
      const sum = Duration.inf().minus(d)
      return !sum.isFinite() && is(sum, Duration.inf())
    })

  jv.property("negInf() - n == negInf()",
    jv.int32, inst.arbTimeUnit,
    (n, unit) => {
      const d = new Duration(n, unit)
      const sum = Duration.negInf().minus(d)
      return !sum.isFinite() && is(sum, Duration.negInf())
    })

  jv.property("n - inf() == negInf()",
    jv.int32, inst.arbTimeUnit,
    (n, unit) => {
      const d = new Duration(n, unit)
      const sum = d.minus(Duration.inf())
      return !sum.isFinite() && is(sum, Duration.negInf())
    })

  jv.property("n - negInf() == inf()",
    jv.int32, inst.arbTimeUnit,
    (n, unit) => {
      const d = new Duration(n, unit)
      const sum = d.minus(Duration.negInf())
      return !sum.isFinite() && is(sum, Duration.inf())
    })

  jv.property("negInf() - n == negInf()",
    jv.int32, inst.arbTimeUnit,
    (n, unit) => {
      const d = new Duration(n, unit)
      const sum = Duration.negInf().minus(d)
      return !sum.isFinite() && is(sum, Duration.negInf())
    })

  test("inf() - inf() throws error", () => {
    expect(() => Duration.inf().minus(Duration.inf()))
      .toThrowError()
    expect(() => Duration.negInf().minus(Duration.negInf()))
      .toThrowError()
  })

  jv.property("(a - b) - c == a - (b + c)",
    inst.arbDuration, inst.arbDuration, inst.arbDuration,
    (a, b, c) => is(a.minus(b).minus(c), a.minus(b.plus(c))))

  jv.property("a - zero == a && zero - a == -a",
    inst.arbDuration,
    a => a.minus(Duration.zero()) === a && is(Duration.zero().minus(a), a.negate())
  )

  jv.property("a - b == -b + a",
    inst.arbDuration, inst.arbDuration,
    (a, b) => is(a.minus(b), b.negate().plus(a)))
})

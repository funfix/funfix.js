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

export abstract class TimeUnit {
  /**
   * Converts the given time duration in the given unit to this unit.
   * Conversions from finer to coarser granularities truncate, so lose
   * precision. For example, converting `999` milliseconds to seconds
   * results in `0`. Conversions from coarser to finer granularities
   * with arguments that would numerically overflow saturate to
   * `Number.MAX_VALUE` if negative or `MAX_VALUE` if positive.
   *
   * For example, to convert 10 minutes to milliseconds, use:
   *
   * ```typescript
   * MILLISECONDS.convert(10, MINUTES)
   * // ... or ...
   * MINUTES.toMillis(10)
   * ```
   *
   * @param duration the time duration in the given `unit`
   * @param unit the unit of the `duration` argument
   *
   * @return the converted duration in this unit, or `Number.MIN_VALUE`
   * if conversion would negatively overflow, or `Number.MAX_VALUE`
   * if it would positively overflow
   */
  abstract convert(duration: number, unit: TimeUnit): number

  abstract toNanos(d: number): number
  abstract toMicros(d: number): number
  abstract toMillis(d: number): number
  abstract toSeconds(d: number): number
  abstract toMinutes(d: number): number
  abstract toHours(d: number): number
  abstract toDays(d: number): number
}

/** @hidden */ const C0 = 1
/** @hidden */ const C1 = C0 * 1000
/** @hidden */ const C2 = C1 * 1000
/** @hidden */ const C3 = C2 * 1000
/** @hidden */ const C4 = C3 * 60
/** @hidden */ const C5 = C4 * 60
/** @hidden */ const C6 = C5 * 24

/** @hidden */ const MIN = -9007199254740992
/** @hidden */ const MAX = 9007199254740992

/** @hidden */
const trunc: (x: number) => number = Math.trunc ||
  /* istanbul ignore next */
  function (x) {
    if (isNaN(x)) return NaN
    if (x > 0) return Math.floor(x)
    return Math.ceil(x)
  }

/** @hidden */
function x(d: number, m: number, over: number): number {
  if (d > over) return MAX
  if (d < -over) return MIN
  return d * m
}

 /**
  * Time unit for representing nanoseconds, where 1 nanosecond is
  * one thousandth of a microsecond.
  */
export const NANOSECONDS: TimeUnit =
  new (class Nanoseconds extends TimeUnit {
    convert(duration: number, unit: TimeUnit): number {
      return unit.toNanos(duration)
    }
    toNanos(d: number): number {
      return d
    }
    toMicros(d: number): number {
      return trunc(d / (C1 / C0))
    }
    toMillis(d: number): number {
      return trunc(d / (C2 / C0))
    }
    toSeconds(d: number): number {
      return trunc(d / (C3 / C0))
    }
    toMinutes(d: number): number {
      return trunc(d / (C4 / C0))
    }
    toHours(d: number): number {
      return trunc(d / (C5 / C0))
    }
    toDays(d: number): number {
      return trunc(d / (C6 / C0))
    }
  })()

 /**
  * Time unit for representing microseconds, where 1 microsecond is
  * one thousandth of a millisecond.
  */
export const MICROSECONDS: TimeUnit =
  new (class Microseconds extends TimeUnit {
    convert(duration: number, unit: TimeUnit): number {
      return unit.toMicros(duration)
    }
    toNanos(d: number): number {
      return x(d, C1 / C0, trunc(MAX / (C1 / C0)))
    }
    toMicros(d: number): number {
      return d
    }
    toMillis(d: number): number {
      return trunc(d / (C2 / C1))
    }
    toSeconds(d: number): number {
      return trunc(d / (C3 / C1))
    }
    toMinutes(d: number): number {
      return trunc(d / (C4 / C1))
    }
    toHours(d: number): number {
      return trunc(d / (C5 / C1))
    }
    toDays(d: number): number {
      return trunc(d / (C6 / C1))
    }
  })()

 /**
  * Time unit for representing milliseconds, where 1 millisecond is
  * one thousandth of a second.
  */
export const MILLISECONDS: TimeUnit =
  new (class Milliseconds extends TimeUnit {
    convert(duration: number, unit: TimeUnit): number {
      return unit.toMillis(duration)
    }
    toNanos(d: number): number {
      return x(d, C2 / C0, trunc(MAX / (C2 / C0)))
    }
    toMicros(d: number): number {
      return x(d, C2 / C1, trunc(MAX / (C2 / C1)))
    }
    toMillis(d: number): number {
      return d
    }
    toSeconds(d: number): number {
      return trunc(d / (C3 / C2))
    }
    toMinutes(d: number): number {
      return trunc(d / (C4 / C2))
    }
    toHours(d: number): number {
      return trunc(d / (C5 / C2))
    }
    toDays(d: number): number {
      return trunc(d / (C6 / C2))
    }
  })()

 /**
  * Time unit for representing seconds.
  */
export const SECONDS: TimeUnit =
  new (class Seconds extends TimeUnit {
    convert(duration: number, unit: TimeUnit): number {
      return unit.toSeconds(duration)
    }
    toNanos(d: number): number {
      return x(d, C3 / C0, trunc(MAX / (C3 / C0)))
    }
    toMicros(d: number): number {
      return x(d, C3 / C1, trunc(MAX / (C3 / C1)))
    }
    toMillis(d: number): number {
      return x(d, C3 / C2, trunc(MAX / (C3 / C2)))
    }
    toSeconds(d: number): number {
      return d
    }
    toMinutes(d: number): number {
      return trunc(d / (C4 / C3))
    }
    toHours(d: number): number {
      return trunc(d / (C5 / C3))
    }
    toDays(d: number): number {
      return trunc(d / (C6 / C3))
    }
  })()

 /**
  * Time unit for representing minutes.
  */
export const MINUTES: TimeUnit =
  new (class Minutes extends TimeUnit {
    convert(duration: number, unit: TimeUnit): number {
      return unit.toMinutes(duration)
    }
    toNanos(d: number): number {
      return x(d, C4 / C0, trunc(MAX / (C4 / C0)))
    }
    toMicros(d: number): number {
      return x(d, C4 / C1, trunc(MAX / (C4 / C1)))
    }
    toMillis(d: number): number {
      return x(d, C4 / C2, trunc(MAX / (C4 / C2)))
    }
    toSeconds(d: number): number {
      return x(d, C4 / C3, trunc(MAX / (C4 / C3)))
    }
    toMinutes(d: number): number {
      return d
    }
    toHours(d: number): number {
      return trunc(d / (C5 / C4))
    }
    toDays(d: number): number {
      return trunc(d / (C6 / C4))
    }
  })()

 /**
  * Time unit for representing hours.
  */
export const HOURS: TimeUnit =
  new (class Hours extends TimeUnit {
    convert(duration: number, unit: TimeUnit): number {
      return unit.toHours(duration)
    }
    toNanos(d: number): number {
      return x(d, C5 / C0, trunc(MAX / (C5 / C0)))
    }
    toMicros(d: number): number {
      return x(d, C5 / C1, trunc(MAX / (C5 / C1)))
    }
    toMillis(d: number): number {
      return x(d, C5 / C2, trunc(MAX / (C5 / C2)))
    }
    toSeconds(d: number): number {
      return x(d, C5 / C3, trunc(MAX / (C5 / C3)))
    }
    toMinutes(d: number): number {
      return x(d, C5 / C4, trunc(MAX / (C5 / C4)))
    }
    toHours(d: number): number {
      return d
    }
    toDays(d: number): number {
      return trunc(d / (C6 / C5))
    }
  })()

 /**
  * Time unit for representing days.
  */
export const DAYS: TimeUnit =
  new (class Days extends TimeUnit {
    convert(duration: number, unit: TimeUnit): number {
      return unit.toDays(duration)
    }
    toNanos(d: number): number {
      return x(d, C6 / C0, trunc(MAX / (C6 / C0)))
    }
    toMicros(d: number): number {
      return x(d, C6 / C1, trunc(MAX / (C6 / C1)))
    }
    toMillis(d: number): number {
      return x(d, C6 / C2, trunc(MAX / (C6 / C2)))
    }
    toSeconds(d: number): number {
      return x(d, C6 / C3, trunc(MAX / (C6 / C3)))
    }
    toMinutes(d: number): number {
      return x(d, C6 / C4, trunc(MAX / (C6 / C4)))
    }
    toHours(d: number): number {
      return x(d, C6 / C5, trunc(MAX / (C6 / C5)))
    }
    toDays(d: number): number {
      return d
    }
  })()

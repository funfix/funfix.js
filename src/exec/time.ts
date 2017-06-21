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

import { IEquals } from "../core/std"

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

  /**
   * Converts the given `d` value to nanoseconds.
   *
   * Equivalent with `NANOSECONDS.convert(duration, this)`.
   *
   * @param d is the converted duration
   * @return the converted duration, or `Number.MAX_SAFE_INTEGER + 1`
   * (or `2^53`) if it overflows, or `Number.MIN_SAFE_INTEGER - 1` if it
   * underflows (or `-2^53`).
   */
  abstract toNanos(d: number): number

  /**
   * Converts the given `d` value to microseconds.
   *
   * Equivalent with `MICROSECONDS.convert(duration, this)`.
   *
   * @param d is the converted duration
   * @return the converted duration, or `Number.MAX_SAFE_INTEGER + 1`
   * (or `2^53`) if it overflows, or `Number.MIN_SAFE_INTEGER - 1` if it
   * underflows (or `-2^53`).
   */
  abstract toMicros(d: number): number

  /**
   * Converts the given `d` value to milliseconds.
   *
   * Equivalent with `MILLISECONDS.convert(duration, this)`.
   *
   * @param d is the converted duration
   * @return the converted duration, or `Number.MAX_SAFE_INTEGER + 1`
   * (or `2^53`) if it overflows, or `Number.MIN_SAFE_INTEGER - 1` if it
   * underflows (or `-2^53`).
   */
  abstract toMillis(d: number): number

  /**
   * Converts the given `d` value to seconds.
   *
   * Equivalent with `SECONDS.convert(duration, this)`.
   *
   * @param d is the converted duration
   * @return the converted duration, or `Number.MAX_SAFE_INTEGER + 1`
   * (or `2^53`) if it overflows, or `Number.MIN_SAFE_INTEGER - 1` if it
   * underflows (or `-2^53`).
   */
  abstract toSeconds(d: number): number

  /**
   * Converts the given `d` value to minutes.
   *
   * Equivalent with `MINUTES.convert(duration, this)`.
   *
   * @param d is the converted duration
   * @return the converted duration, or `Number.MAX_SAFE_INTEGER + 1`
   * (or `2^53`) if it overflows, or `Number.MIN_SAFE_INTEGER - 1` if it
   * underflows (or `-2^53`).
   */
  abstract toMinutes(d: number): number

  /**
   * Converts the given `d` value to hours.
   *
   * Equivalent with `HOURS.convert(duration, this)`.
   *
   * @param d is the converted duration
   * @return the converted duration, or `Number.MAX_SAFE_INTEGER + 1`
   * (or `2^53`) if it overflows, or `Number.MIN_SAFE_INTEGER - 1` if it
   * underflows (or `-2^53`).
   */
  abstract toHours(d: number): number

  /**
   * Converts the given `d` value to days.
   *
   * Equivalent with `DAYS.convert(duration, this)`.
   *
   * @param d is the converted duration
   * @return the converted duration, or `Number.MAX_SAFE_INTEGER + 1`
   * (or `2^53`) if it overflows, or `Number.MIN_SAFE_INTEGER - 1` if it
   * underflows (or `-2^53`).
   */
  abstract toDays(d: number): number

  /**
   * A number representing the unit's ordering in the `TimeUnit`
   * enumeration, useful for doing comparisons to find out which unit
   * is more coarse grained.
   *
   * ```typescript
   * MINUTES.ord < DAYS.ord // true
   * SECONDS.ord > MICROSECONDS.org // true
   * ```
   */
  abstract ord: number
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
    ord: number = 0

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
    ord: number = 1

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
    ord: number = 2

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
    ord: number = 3

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
    ord: number = 4

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
    ord: number = 5

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
    ord: number = 6

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

/**
 * A simple representation for time durations, based on [[TimeUnit]].
 */
export class Duration implements IEquals<Duration> {
  constructor(public duration: number, public unit: TimeUnit) {}

  /**
   * This method returns `true` if this duration is finite,
   * or `false otherwise.
   */
  isFinite(): boolean { return isFinite(this.duration) }

  /**
   * Calculates the nanoseconds described by the source [[Duration]].
   */
  toNanos(): number {
    return NANOSECONDS.convert(this.duration, this.unit)
  }

  /**
   * Calculates the microseconds described by the source [[Duration]].
   */
  toMicros(): number {
    return MICROSECONDS.convert(this.duration, this.unit)
  }

  /**
   * Calculates the milliseconds described by the source [[Duration]].
   */
  toMillis(): number {
    return MILLISECONDS.convert(this.duration, this.unit)
  }

  /**
   * Calculates the seconds described by the source [[Duration]].
   */
  toSeconds(): number {
    return SECONDS.convert(this.duration, this.unit)
  }

  /**
   * Calculates the minutes described by the source [[Duration]].
   */
  toMinutes(): number {
    return MINUTES.convert(this.duration, this.unit)
  }

  /**
   * Calculates the hours described by the source [[Duration]].
   */
  toHours(): number {
    return HOURS.convert(this.duration, this.unit)
  }

  /**
   * Calculates the days described by the source [[Duration]].
   */
  toDays(): number {
    return DAYS.convert(this.duration, this.unit)
  }

  /** @inheritdoc */
  equals(other: Duration): boolean {
    function cmp(s: Duration, o: Duration) {
      const n = s.unit.convert(o.duration, o.unit)
      return n === s.duration
    }

    if (!isFinite(this.duration)) {
      return !isFinite(other.duration) &&
        this.duration === other.duration
    }
    return this.unit.ord <= other.unit.ord
      ? cmp(this, other) : cmp(other, this)
  }

  /** @inheritdoc */
  hashCode(): number {
    if (this.isFinite()) {
      return this.toNanos()
    } else if (this.duration === Infinity) {
      return 7540833725118015
    } else {
      return 422082410550358
    }
  }

  /** Returns a zero length duration. */
  static zero(): Duration {
    return new Duration(0, DAYS)
  }

  /** Returns a [[Duration]] representing positive infinite. */
  static inf(): Duration {
    return new Duration(Infinity, DAYS)
  }

  /** Returns a [[Duration]] representing negative infinite. */
  static negInf(): Duration {
    return new Duration(-Infinity, DAYS)
  }

  /**
   * Constructs a `Duration` instance out of a value representing
   * nanoseconds.
   */
  static nanos(d: number): Duration {
    return new Duration(d, NANOSECONDS)
  }

  /**
   * Constructs a `Duration` instance out of a value representing
   * microseconds.
   */
  static micros(d: number): Duration {
    return new Duration(d, MICROSECONDS)
  }

  /**
   * Constructs a `Duration` instance out of a value representing
   * milliseconds.
   */
  static millis(d: number): Duration {
    return new Duration(d, MILLISECONDS)
  }

  /**
   * Constructs a `Duration` instance out of a value representing
   * seconds.
   */
  static seconds(d: number): Duration {
    return new Duration(d, SECONDS)
  }

  /**
   * Constructs a `Duration` instance out of a value representing
   * minutes.
   */
  static minutes(d: number): Duration {
    return new Duration(d, MINUTES)
  }

  /**
   * Constructs a `Duration` instance out of a value representing
   * hours.
   */
  static hours(d: number): Duration {
    return new Duration(d, HOURS)
  }

  /**
   * Constructs a `Duration` instance out of a value representing
   * days.
   */
  static days(d: number): Duration {
    return new Duration(d, DAYS)
  }
}

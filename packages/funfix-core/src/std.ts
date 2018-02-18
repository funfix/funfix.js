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

import { Setoid } from "funland"

/**
 * Interface for testing the equality of value objects.
 */
export interface IEquals<A> {
  /**
   * Indicates whether some other object is "equal to" this one.
   *
   * Properties:
   *
   *  - reflexive: for any value, `x.equals(x) == true`
   *  - symmetric: for any values x and y, `x.equals(y) == y.equals(x)`
   *  - transitive: `x.equals(y) && y.equals(z) => x.equals(z)`
   *  - consistent: `x.equals(y)` always yields the same result
   *
   * Rule: equal objects MUST have equal hash codes!
   */
  equals(other: A): boolean

  /**
   * Returns a hash code value for this value.
   *
   * This method is supported for the benefit of hash tables.
   *
   * Properties:
   *
   *  - consistent: multiple invocations always yield the same result
   *  - if `x.equals(y) == true` then `x.hashCode() == y.hashCode()`
   *  - if `x.equals(y) == false` it is NOT required for their hash codes
   *    to be equal, i.e. this function is not injective
   */
  hashCode(): number
}

/**
 * Test if the given reference is a value object.
 *
 * Value objects are objects that implement the [[IEquals]]
 * interface.
 *
 * @param ref is the reference to test
 */
export function isValueObject(ref: any): boolean {
  return !!(ref &&
    typeof ref.equals === "function" &&
    typeof ref.hashCode === "function")
}

/**
 * Tests for universal equality.
 *
 * First attempting a reference check with `===`,
 * after which it tries to fallback on [[IEquals]], if the
 * left-hand side is implementing it.
 *
 * ```typescript
 * equals(10, 10) // true, because 10 === 10
 *
 * class Box implements IEquals<Box> {
 *   constructor(value: number) { this.value = value }
 *
 *   equals(other) { return this.value === other.value  }
 *   hashCode() { return this.value << 2 }
 * }
 *
 * // false, because they are not the same reference
 * new Box(10) === new Box(10)
 *
 * // true, because `Box#equals` gets called
 * equals(new Box(10), new Box(10))
 * ```
 */
export function is<A>(lh: A, rh: A): boolean {
  if (lh === rh || (lh !== lh && rh !== rh)) {
    return true
  }
  if (!lh || !rh) {
    return false
  }
  /* istanbul ignore else */
  /* tslint:disable-next-line:strict-type-predicates */
  if (typeof lh.valueOf === "function" && typeof rh.valueOf === "function") {
    const lh2 = lh.valueOf()
    const rh2 = rh.valueOf()
    if (lh2 === rh2 || (lh2 !== lh2 && rh2 !== rh2)) {
      return true
    }
    if (!lh2 || !rh2) {
      return false
    }
  }
  // noinspection PointlessBooleanExpressionJS
  return !!(
    isValueObject(lh) &&
    (lh as any).equals(rh)
  )
}

/** Alias for [[is]]. */
export function equals<A>(lh: A, rh: A): boolean {
  return is(lh, rh)
}

/**
 * Returns a `Setoid` type-class instance that depends
 * universal equality, as defined by {@link is}.
 */
export const universalSetoid: Setoid<any> = { equals }

/**
 * Universal hash-code function.
 *
 * Depending on the given value, it calculates the hash-code like so:
 *
 *  1. if it's a `number`, then it gets truncated
 *     to an integer and returned
 *  2. if it's a "value object" (see [[isValueObject]]), then
 *     its `hashCode` is used
 *  3. if a `valueOf()` function is provided, then the
 *     `hashCode` gets recursively invoked on its result
 *  4. if all else fails, the value gets coerced to a `String`
 *     and a hash code is calculated using [[hashCodeOfString]]
 *
 * @param ref is the value to use for calculating a hash code
 * @return an integer with the aforementioned properties
 */
export function hashCode(ref: any): number {
  if (typeof ref === "number") {
    return ref & ref
  }
  /* istanbul ignore else */
  if (typeof ref.valueOf === "function") {
    const v = ref.valueOf()
    if (v !== ref) return hashCode(v)
  }
  if (isValueObject(ref)) {
    return (ref as IEquals<any>).hashCode()
  }
  return hashCodeOfString(String(ref))
}

/**
 * Calculates a hash code out of any string.
 */
export function hashCodeOfString(str: string): number {
  let hash = 0
  /* tslint:disable-next-line:strict-type-predicates */
  if (str == null || str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    const character = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + character
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

/** The identity function. */
export function id<A>(a: A): A {
  return a
}

/**
 * Utility function for implementing mixins, based on the
 * [TypeScript Mixins]{@link https://www.typescriptlang.org/docs/handbook/mixins.html}
 * documentation.
 *
 * Sample:
 *
 * ```typescript
 * class Disposable { ... }
 * class Activatable { ... }
 * class SmartObject implements Disposable, Activatable { ... }
 *
 * applyMixins(SmartObject, [Disposable, Activatable]);
 * ```
 *
 * Using `implements` instead of `extends` for base classes
 * will make the type system treat them like interfaces instead of
 * classes. And by `applyMixins` we can also supply global
 * implementations for the non-abstract members.
 */
export function applyMixins(derivedCtor: {prototype: any}, baseCtors: {prototype: any}[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      if (!derivedCtor.prototype[name])
        derivedCtor.prototype[name] = baseCtor.prototype[name]
    })
  })
}

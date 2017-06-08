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
 *
 * @flow
 */

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

export function isValueObject(ref: any): boolean {
  return !!(ref &&
    typeof ref.equals === "function" &&
    typeof ref.hashCode === "function")
}

export function equals<A>(lh: A, rh: A): boolean {
  if (lh === rh || (lh !== lh && rh !== rh)) {
    return true
  }
  if (!lh || !rh) {
    return false
  }
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
  //noinspection PointlessBooleanExpressionJS
  return !!(
    isValueObject(lh) &&
    isValueObject(rh) &&
    (lh as any).equals(rh))
}

export function hashCode(ref: any): number {
  if (typeof ref === "number") {
    return ref & ref
  }
  if (typeof ref.valueOf === "function") {
    const v = ref.valueOf()
    if (v !== ref) return hashCode(v)
  }
  if (isValueObject(ref)) {
    return (ref as IEquals<any>).hashCode()
  }
  return hashCodeOfString(String(ref))
}

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

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

import * as fns from "assert"
import { is } from "funfix-core"

export function ok(cond: boolean, message?: string): void {
  return fns.ok(cond, message)
}

export function not(cond: boolean, message?: string): void {
  return fns.ok(!cond, message)
}

export function throws(thunk: () => any, message?: string): void {
  return fns.throws(thunk, message)
}

export function equal<A>(lh: A, rh: A): void {
  return fns.ok(is(lh, rh), `${lh} == ${rh}`)
}

export function notEqual<A>(lh: A, rh: A): void {
  return fns.ok(!is(lh, rh), `${lh} != ${rh}`)
}

export function fail(message: string): void {
  return fns.fail(message)
}

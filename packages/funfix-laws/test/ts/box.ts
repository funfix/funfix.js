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

import { HK, Setoid, Functor } from "funfix-types"
import * as jv from "jsverify"

export class Box<A> implements HK<"box", A> {
  readonly _URI: "box"
  readonly _A: A
  constructor(public readonly value: A) {}
}

export function BoxSetoid<A>(): Setoid<Box<A>> {
  return {
    equals: (x: Box<A>, y: Box<A>) => x.value === y.value
  }
}

export function BoxArbitrary(): jv.Arbitrary<Box<number>> {
  return jv.integer.smap(
    i => new Box(i),
    b => b.value
  )
}

export class BoxFunctor implements Functor<"box"> {
  map<A, B>(f: (a: A) => B, fa: HK<"box", A>) {
    return new Box(f((fa as Box<A>).value))
  }
}

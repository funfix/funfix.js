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
import { Setoid } from "funfix-types"
import { Equiv, SetoidLaws } from "../src"

export function setoidCheck<A>(
  genA: jv.Arbitrary<A>,
  F: Setoid<A>) {

  const laws = new SetoidLaws<A>(F)
  const eq = (p: Equiv<boolean>) => p.lh === p.rh

  jv.property("setoid.reflexivity", genA,
    x => eq(laws.reflexivity(x)))

  jv.property("setoid.symmetry", genA, genA,
    (x, y) => eq(laws.symmetry(x, y)))

  jv.property("setoid.transitivity", genA, genA, genA,
    (x, y, z) => eq(laws.transitivity(x, y, z)))
}

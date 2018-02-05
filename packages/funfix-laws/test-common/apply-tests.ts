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
import { HK, Apply } from "funfix-types"
import { Equiv, ApplyLaws } from "../src"
import { functorCheck } from "./functor-tests"

export function applyCheck<F, A, B, C>(
  genFA: jv.Arbitrary<HK<F, A>>,
  genAtoB: jv.Arbitrary<(a: A) => B>,
  genBtoC: jv.Arbitrary<(b: B) => C>,
  genFAtoB: jv.Arbitrary<HK<F, (a: A) => B>>,
  genFBtoC: jv.Arbitrary<HK<F, (b: B) => C>>,
  check: <T>(e: Equiv<HK<F, T>>) => boolean,
  F: Apply<F>) {

  const laws = new ApplyLaws<F>(F)
  functorCheck(genFA, genAtoB, genBtoC, check, F)

  jv.property("apply.composition", genFA, genFAtoB, genFBtoC,
    (fa, fab, fbc) => check(laws.applyComposition(fa, fab, fbc)))
}

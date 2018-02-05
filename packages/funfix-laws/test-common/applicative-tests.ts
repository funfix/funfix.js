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
 *
 */

import * as jv from "jsverify"
import { HK, Applicative } from "funfix-types"
import { Equiv, ApplicativeLaws } from "../src"
import { applyCheck } from "./apply-tests"

export function applicativeCheck<F, A, B, C>(
  genFA: jv.Arbitrary<HK<F, A>>,
  genAtoB: jv.Arbitrary<(a: A) => B>,
  genBtoC: jv.Arbitrary<(b: B) => C>,
  genFAtoB: jv.Arbitrary<HK<F, (a: A) => B>>,
  genFBtoC: jv.Arbitrary<HK<F, (b: B) => C>>,
  genA: jv.Arbitrary<A>,
  check: <T>(e: Equiv<HK<F, T>>) => boolean,
  F: Applicative<F>) {

  const laws = new ApplicativeLaws<F>(F)
  applyCheck(genFA, genAtoB, genBtoC, genFAtoB, genFBtoC, check, F)

  jv.property("applicative.identity", genFA,
    (fa) => check(laws.applicativeIdentity(fa)))

  jv.property("applicative.homomorphism", genA, genAtoB,
    (a, f) => check(laws.applicativeHomomorphism(a, f)))

  jv.property("applicative.interchange", genA, genFAtoB,
    (a, ff) => check(laws.applicativeInterchange(a, ff)))

  jv.property("applicative.map", genFA, genAtoB,
    (fa, f) => check(laws.applicativeMap(fa, f)))
}

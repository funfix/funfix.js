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
import { HK, Chain } from "funfix-types"
import { Equiv, ChainLaws } from "../src"
import { applyCheck } from "./apply-tests"

export function chainCheck<F, A, B, C>(
  genFA: jv.Arbitrary<HK<F, A>>,
  genFB: jv.Arbitrary<HK<F, B>>,
  genFC: jv.Arbitrary<HK<F, C>>,
  genAtoB: jv.Arbitrary<(a: A) => B>,
  genBtoC: jv.Arbitrary<(b: B) => C>,
  genFAtoB: jv.Arbitrary<HK<F, (a: A) => B>>,
  genFBtoC: jv.Arbitrary<HK<F, (b: B) => C>>,
  check: <T>(e: Equiv<HK<F, T>>) => boolean,
  F: Chain<F>) {

  const laws = new ChainLaws<F>(F)
  applyCheck(genFA, genAtoB, genBtoC, genFAtoB, genFBtoC, check, F)

  jv.property("chain.associativity", genFA, jv.fun(genFB), jv.fun(genFC),
    (fa, fab, fbc) => check(laws.chainAssociativity(fa, fab, fbc)))

  jv.property("chain.ap", genFA, genFAtoB,
    (fa, fab) => check(laws.chainConsistentApply(fa, fab)))
}

/*!
 * Copyright (c) 2018 by The Funland Project Developers.
 * Some rights reserved.
 *
 * Licensed under the MIT License.
 * See LICENSE file in the project root for full license information.
 */

import * as jv from "jsverify"
import { HK, Chain } from "funland"
import { Equiv, ChainLaws } from "funland-laws"
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
  F: Chain<F>,
  lawsRef?: ChainLaws<F>,
  includeSuperTypes: boolean = true) {

  const laws = lawsRef || new ChainLaws<F>(F)
  if (includeSuperTypes) {
    applyCheck(genFA, genAtoB, genBtoC, genFAtoB, genFBtoC, check, F, laws)
  }

  jv.property("chain.associativity", genFA, jv.fun(genFB), jv.fun(genFC),
    (fa, fab, fbc) => check(laws.chainAssociativity(fa, fab, fbc)))

  jv.property("chain.ap", genFA, genFAtoB,
    (fa, fab) => check(laws.chainConsistentApply(fab, fa)))
}

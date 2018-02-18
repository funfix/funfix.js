/*!
 * Copyright (c) 2018 by The Funland Project Developers.
 * Some rights reserved.
 *
 * Licensed under the MIT License.
 * See LICENSE file in the project root for full license information.
 */

import * as jv from "jsverify"
import { HK, ChainRec } from "funland"
import { Equiv, ChainRecLaws } from "funland-laws"
import { chainCheck } from "./chain-tests"

export function chainRecCheck<F, A, B, C>(
  genFA: jv.Arbitrary<HK<F, A>>,
  genFB: jv.Arbitrary<HK<F, B>>,
  genFC: jv.Arbitrary<HK<F, C>>,
  genAtoB: jv.Arbitrary<(a: A) => B>,
  genBtoC: jv.Arbitrary<(b: B) => C>,
  genFAtoB: jv.Arbitrary<HK<F, (a: A) => B>>,
  genFBtoC: jv.Arbitrary<HK<F, (b: B) => C>>,
  genA: jv.Arbitrary<A>,
  check: <T>(e: Equiv<HK<F, T>>) => boolean,
  F: ChainRec<F>,
  lawsRef?: ChainRecLaws<F>,
  includeSuperTypes: boolean = true) {

  const laws = lawsRef || new ChainRecLaws<F>(F)
  chainCheck(genFA, genFB, genFC, genAtoB, genBtoC, genFAtoB, genFBtoC, check, F, lawsRef, includeSuperTypes)

  jv.property("chainRec.consistency", genA, jv.fun(genFA),
    (a, f) => check(laws.chainRecConsistency(a, f)))
}

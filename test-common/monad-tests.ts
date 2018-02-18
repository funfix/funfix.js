/*!
 * Copyright (c) 2018 by The Funland Project Developers.
 * Some rights reserved.
 *
 * Licensed under the MIT License.
 * See LICENSE file in the project root for full license information.
 */

import * as jv from "jsverify"
import { HK, Monad } from "funland"
import { Equiv, MonadLaws } from "funland-laws"
import { applicativeCheck } from "./applicative-tests"
import { chainRecCheck } from "./chain-rec-tests"

export function monadCheck<F, A, B, C>(
  genFA: jv.Arbitrary<HK<F, A>>,
  genFB: jv.Arbitrary<HK<F, B>>,
  genFC: jv.Arbitrary<HK<F, C>>,
  genAtoB: jv.Arbitrary<(a: A) => B>,
  genBtoC: jv.Arbitrary<(b: B) => C>,
  genFAtoB: jv.Arbitrary<HK<F, (a: A) => B>>,
  genFBtoC: jv.Arbitrary<HK<F, (b: B) => C>>,
  genA: jv.Arbitrary<A>,
  check: <T>(e: Equiv<HK<F, T>>) => boolean,
  F: Monad<F>,
  lawsRef?: MonadLaws<F>,
  includeSuperTypes: boolean = true) {

  const laws = lawsRef || new MonadLaws<F>(F)
  if (includeSuperTypes) {
    applicativeCheck(genFA, genAtoB, genBtoC, genFAtoB, genFBtoC, genA, check, F, laws)
    chainRecCheck(genFA, genFB, genFC, genAtoB, genBtoC, genFAtoB, genFBtoC, genA, check, F, laws, false)
  }

  jv.property("monad.left_identity", genA, jv.fun(genFB),
    (a, f) => check(laws.monadLeftIdentity(a, f)))

  jv.property("monad.right_identity", genFA,
    fa => check(laws.monadRightIdentity(fa)))

  jv.property("monad.map", genFA, genAtoB,
    (fa, f) => check(laws.monadMap(fa, f)))

  jv.property("monad.chainRec_stack_safety",
    () => check(laws.monadChainRecStackSafety()))
}

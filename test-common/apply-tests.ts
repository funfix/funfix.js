/*!
 * Copyright (c) 2018 by The Funland Project Developers.
 * Some rights reserved.
 *
 * Licensed under the MIT License.
 * See LICENSE file in the project root for full license information.
 */

import * as jv from "jsverify"
import { HK, Apply } from "funland"
import { Equiv, ApplyLaws } from "funland-laws"
import { functorCheck } from "./functor-tests"

export function applyCheck<F, A, B, C>(
  genFA: jv.Arbitrary<HK<F, A>>,
  genAtoB: jv.Arbitrary<(a: A) => B>,
  genBtoC: jv.Arbitrary<(b: B) => C>,
  genFAtoB: jv.Arbitrary<HK<F, (a: A) => B>>,
  genFBtoC: jv.Arbitrary<HK<F, (b: B) => C>>,
  check: <T>(e: Equiv<HK<F, T>>) => boolean,
  F: Apply<F>,
  lawsRef?: ApplyLaws<F>,
  includeSuperTypes: boolean = true) {

  const laws = lawsRef || new ApplyLaws<F>(F)
  if (includeSuperTypes) {
    functorCheck(genFA, genAtoB, genBtoC, check, F, laws)
  }

  jv.property("apply.composition", genFA, genFAtoB, genFBtoC,
    (fa, fab, fbc) => check(laws.applyComposition(fa, fab, fbc)))
}

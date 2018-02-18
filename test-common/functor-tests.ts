/*!
 * Copyright (c) 2018 by The Funland Project Developers.
 * Some rights reserved.
 *
 * Licensed under the MIT License.
 * See LICENSE file in the project root for full license information.
 */

import * as jv from "jsverify"
import { HK, Functor } from "funland"
import { Equiv, FunctorLaws } from "funland-laws"

export function functorCheck<F, A, B, C>(
  genFA: jv.Arbitrary<HK<F, A>>,
  genAtoB: jv.Arbitrary<(a: A) => B>,
  genBtoC: jv.Arbitrary<(b: B) => C>,
  check: <T>(e: Equiv<HK<F, T>>) => boolean,
  F: Functor<F>,
  lawsRef?: FunctorLaws<F>) {

  const laws = lawsRef || new FunctorLaws<F>(F)

  jv.property("functor.identity", genFA,
    fa => check(laws.identity(fa)))

  jv.property("functor.composition", genFA, genAtoB, genBtoC,
    (fa, g, f) => check(laws.composition(fa, f, g)))
}

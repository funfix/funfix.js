/*
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
import { HK, Functor } from "funfix-types"
import { Equiv, FunctorLaws } from "../src"

export function functorCheck<F, A, B, C>(
  genFA: jv.Arbitrary<HK<F, A>>,
  genAtoB: jv.Arbitrary<(a: A) => B>,
  genBtoC: jv.Arbitrary<(b: B) => C>,
  check: <T>(e: Equiv<HK<F, T>>) => boolean,
  F: Functor<F>) {

  const laws = new FunctorLaws<F>(F)

  jv.property("functor.identity", genFA,
    fa => check(laws.identity(fa)))

  jv.property("functor.composition", genFA, genAtoB, genBtoC,
    (fa, g, f) => check(laws.composition(fa, f, g)))
}

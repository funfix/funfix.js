/*
 * Copyright (c) 2017 by The Funfix Project Developers.
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
import {
  HK, Equiv, Eq, Constructor, EqLaws, eqOf,
  FunctorLaws, functorOf,
  ApplyLaws, applyOf,
  ApplicativeLaws, applicativeOf
} from "../src/funfix"

export function testEq<A>(type: Constructor<A>, arbA: jv.Arbitrary<A>): void {
  const F = eqOf(type)
  const laws = new EqLaws(F)

  const tests = {
    reflexive: jv.forall(arbA,
      a => laws.reflexive(a)),
    symmetric: jv.forall(arbA, arbA,
      (x, y) => laws.symmetric(x, y)),
    transitive: jv.forall(arbA, arbA, arbA,
      (x, y, z) => laws.transitive(x, y, z))
  }

  for (const key of Object.keys(tests)) {
    test(`Eq<${(type as any).name}>.${key}`, () => {
      jv.assert(tests[key])
    })
  }
}

export function testFunctor<F, A>(
  type: Constructor<F>,
  arbFA: jv.Arbitrary<HK<F, A>>,
  eqF: Eq<HK<F, any>>): void {

  const F = functorOf(type)
  const laws = new FunctorLaws(F)

  const equivToBool = (ref: Equiv<HK<F, any>>) =>
    eqF.eqv(ref.lh, ref.rh)

  const tests = {
    covariantIdentity: jv.forall(arbFA,
      fa => equivToBool(laws.covariantIdentity(fa))
    ),
    covariantComposition: jv.forall(
      arbFA, jv.fun(jv.number), jv.fun(jv.string),
      (fa, f, g) => equivToBool(laws.covariantComposition(fa, f, g))
    )
  }

  for (const key of Object.keys(tests)) {
    test(`Functor<${(type as any).name}>.${key}`, () => {
      jv.assert(tests[key])
    })
  }
}

export function testApply<F, A, B>(
  type: Constructor<F>,
  arbFA: jv.Arbitrary<HK<F, A>>,
  lift: <T>(t: T) => HK<F, T>,
  eqF: Eq<HK<F, any>>,
  includeSupertypes: boolean = true): void {

  // Tests functor first
  if (includeSupertypes) testFunctor(type, arbFA, eqF)

  const F = applyOf(type)
  const laws = new ApplyLaws(F)

  const arbAtoB = jv.fun(jv.number)
  const arbBtoC = jv.fun(jv.string)
  const arbFAtoB = arbAtoB.smap(lift, _ => (_ => 0))
  const arbFBtoC = arbBtoC.smap(lift, _ => (_ => ""))

  const equivToBool = (ref: Equiv<HK<F, any>>) =>
    eqF.eqv(ref.lh, ref.rh)

  const tests = {
    applyComposition: jv.forall(
      arbFA, arbFAtoB, arbFBtoC,
      (fa, fab, fbc) => equivToBool(laws.applyComposition(fa, fab, fbc))
    ),
    applyProductConsistency: jv.forall(
      arbFA, arbFAtoB,
      (fa, fab) => equivToBool(laws.applyProductConsistency(fa, fab))
    ),
    applyMap2Consistency: jv.forall(
      arbFA, arbFAtoB,
      (fa, fab) => equivToBool(laws.applyMap2Consistency(fa, fab))
    )
  }

  for (const key of Object.keys(tests)) {
    test(`Apply<${(type as any).name}>.${key}`, () => {
      jv.assert(tests[key])
    })
  }
}

export function testApplicative<F, A, B>(
  type: Constructor<F>,
  arbFA: jv.Arbitrary<HK<F, A>>,
  eqF: Eq<HK<F, any>>,
  includeSupertypes: boolean = true): void {

  const F = applicativeOf(type)
  const laws = new ApplicativeLaws(F)

  // Tests Apply and Functor first
  if (includeSupertypes) testApply(type, arbFA, F.pure, eqF)

  const arbAtoB = jv.fun(jv.number)
  const arbBtoC = jv.fun(jv.string)
  const arbFAtoB = arbAtoB.smap(F.pure, _ => (_ => 0))
  const arbFBtoC = arbBtoC.smap(F.pure, _ => (_ => ""))

  const equivToBool = (ref: Equiv<HK<F, any>>) =>
    eqF.eqv(ref.lh, ref.rh)

  const tests = {
    applicativeIdentity: jv.forall(
      arbFA,
      fa => equivToBool(laws.applicativeIdentity(fa))
    ),
    applicativeHomomorphism: jv.forall(
      jv.number, arbBtoC,
      (a, f) => equivToBool(laws.applicativeHomomorphism(a, f))
    ),
    applicativeInterchange: jv.forall(
      jv.number, arbFBtoC,
      (a, fab) => equivToBool(laws.applicativeInterchange(a, fab))
    ),
    applicativeMap: jv.forall(
      arbFA, arbAtoB,
      (fa, f) => equivToBool(laws.applicativeMap(fa, f))
    ),
    applicativeComposition: jv.forall(
      arbFA, arbFAtoB, arbFBtoC,
      (fa, fab, fbc) => equivToBool(laws.applicativeComposition(fa, fab, fbc))
    ),
    applicativeUnit: jv.forall(
      jv.number,
      a => equivToBool(laws.applicativeUnit(a))
    )
  }

  for (const key of Object.keys(tests)) {
    test(`Applicative<${(type as any).name}>.${key}`, () => {
      jv.assert(tests[key])
    })
  }
}

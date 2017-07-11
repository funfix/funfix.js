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
  HK, Equiv, Eq, HasEq, EqLaws, eqOf,
  Functor, HasFunctor, FunctorLaws, functorOf,
  Applicative, HasApplicative, ApplicativeLaws, applicativeOf
} from "../src/funfix"

export function testEq<A>(type: HasEq<A> & Function, arbA: jv.Arbitrary<A>): void {
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
    test(`Eq<${type.name}>.${key}`, () => {
      jv.assert(tests[key])
    })
  }
}

export function testFunctor<F, A>(
  type: HasFunctor<F> & Function,
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
    test(`Functor<${type.name}>.${key}`, () => {
      jv.assert(tests[key])
    })
  }
}

export function testApplicative<F, A, B>(
  type: HasApplicative<F> & Function,
  arbFA: jv.Arbitrary<HK<F, A>>,
  eqF: Eq<HK<F, any>>): void {

  // Tests functor first
  testFunctor(type, arbFA, eqF)

  const F = applicativeOf(type)
  const laws = new ApplicativeLaws(F)

  const arbFB = jv.number.smap(F.pure, _ => 0)
  const arbAtoB = jv.fun(jv.number)
  const arbBtoC = jv.fun(jv.string)
  const arbFAtoB = arbAtoB.smap(F.pure, _ => (_ => 0))
  const arbFBtoC = arbBtoC.smap(F.pure, _ => (_ => ""))

  const equivToBool = (ref: Equiv<HK<F, any>>) =>
    eqF.eqv(ref.lh, ref.rh)

  const tests = {
    applyComposition: jv.forall(
      arbFA, arbFAtoB, arbFBtoC,
      (fa, fab, fbc) => equivToBool(laws.applyComposition(fa, fab, fbc))
    ),
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
    apProductConsistent: jv.forall(
      arbFA, arbFAtoB,
      (fa, fab) => equivToBool(laws.apProductConsistent(fa, fab))
    ),
    apMap2Consistent: jv.forall(
      arbFA, arbFAtoB,
      (fa, fab) => equivToBool(laws.apMap2Consistent(fa, fab))
    ),
    applicativeUnit: jv.forall(
      jv.number,
      a => equivToBool(laws.applicativeUnit(a))
    )
  }

  for (const key of Object.keys(tests)) {
    test(`Applicative<${type.name}>.${key}`, () => {
      jv.assert(tests[key])
    })
  }
}

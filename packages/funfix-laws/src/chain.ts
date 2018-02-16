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

import { HK, Chain } from "funfix-types"
import { Equiv } from "./equiv"
import { ApplyLaws } from "./apply"

/**
 * Type-class laws for `Chain`, as defined in the `funfix-types`
 * sub-project and in the `static-land` spec.
 *
 * `Chain` inherits the laws of `Apply` and in addition must obey:
 *
 * 1. Associativity:
 *   `F.chain(F.chain(fa, f), g) <-> F.chain(fa, a => F.chain(f(a), g))`
 * 2. Apply's `ap` can be derived:
 *    `F.ap = (fab, fa) => F.chain(fab, f => F.map(fa, f))`
 */
export class ChainLaws<F> extends ApplyLaws<F> {
  constructor(public readonly F: Chain<F>) {
    super(F)
  }

  chainAssociativity<A, B, C>(fa: HK<F, A>, f: (a: A) => HK<F, B>, g: (b: B) => HK<F, C>): Equiv<HK<F, C>> {
    const F = this.F
    return Equiv.of(
      F.chain(F.chain(fa, f), g),
      F.chain(fa, a => F.chain(f(a), g))
    )
  }

  chainConsistentApply<A, B>(fa: HK<F, A>, fab: HK<F, (a: A) => B>): Equiv<HK<F, B>> {
    const F = this.F
    return Equiv.of(
      F.ap(fab, fa),
      F.chain(fab, f => F.map(fa, f))
    )
  }
}

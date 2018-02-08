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

import { HK, Apply } from "funfix-types"
import { Equiv } from "./equiv"
import { FunctorLaws } from "./functor"

/**
 * Type-class laws for `Apply`, as defined in the `funfix-types`
 * sub-project and in the `static-land` spec.
 *
 * `Apply` inherits the laws of `Functor` and in addition must obey:
 *
 * 1. Composition:
 *   `F.ap(F.ap(F.map(fbc, f => g => x => f(g(x))), fab), fa) <-> F.ap(fbc, F.ap(fab, fa))`
 */
export class ApplyLaws<F> extends FunctorLaws<F> {
  constructor(public readonly F: Apply<F>) {
    super(F)
  }

  applyComposition<A, B, C>(fa: HK<F, A>, fab: HK<F, (a: A) => B>, fbc: HK<F, (b: B) => C>) {
    const F = this.F
    const compose = (f: (b: B) => C) => (
      (g: (a: A) => B) => (a: A) => f(g(a))
    )

    return Equiv.of(
      F.ap(fbc, F.ap(fab, fa)),
      F.ap(F.ap(F.map(fbc, compose), fab), fa)
    )
  }
}

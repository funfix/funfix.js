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

import { HK } from "./kinds"
import { Apply } from "./apply"

/**
 * The `Chain` type class is a lightweight {@link Monad}.
 *
 * It exposes [chain]{@link Chain.chain}, which allows to have a
 * value in a context (`F<A>`) and then feed that into a function that
 * takes a normal value and returns a value in a context
 * (`A => F<B>`).
 *
 * One motivation for separating this out from `Monad` is that there are
 * situations where we can implement `chain` but not `of`. For example,
 * we can implement `map` or `chain` that transforms the values of a
 * `Map<K, ?>` type, but we can't implement `of` (because we wouldn't
 * know what key to use when instantiating the new `Map`).
 *
 * In addition to `Apply`'s laws, `Chain` instances must obey these laws:
 *
 * 1. Associativity: `M.chain(M.chain(u, f), g) <-> M.chain(u, x => M.chain(f(x), g))`
 * 2. Apply's `ap` can be derived:
 *    `A.ap = (uf, ux) => A.chain(uf, f => A.map(f, ux))`
 *
 * Equivalent with the `Chain` type class in the
 * [Fantasy-Land](https://github.com/fantasyland/fantasy-land) specification.
 */
export interface Chain<F> extends Apply<F> {
  chain<A, B>(fa: HK<F, A>, f: (a: A) => HK<F, B>): HK<F, B>
}

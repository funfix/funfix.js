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

import { HK } from "./kinds"
import { Functor } from "./functor"

/**
 * Weaker version of {@link Applicative}.
 *
 * This type class is exposed in addition to `Applicative` because
 * there are data types for which we can't implement `of`, but
 * that could still benefit from an `ap` definition. For example
 * in case of a `Map<K, ?>` we couldn't define `pure` for it
 * because we don't have a `K` key.
 *
 * Must obey this law:
 *
 * 1. Composition: `A.ap(A.ap(A.map(f => g => x => f(g(x)), a), u), v) <-> A.ap(a, A.ap(u, v))`
 *
 * Equivalent with the `Apply` specification in the
 * [static-land]{@link https://github.com/rpominov/static-land/} spec.
 */
export interface Apply<F> extends Functor<F> {
  ap<A, B>(ff: HK<F, (a: A) => B>, fa: HK<F, A>): HK<F, B>
}

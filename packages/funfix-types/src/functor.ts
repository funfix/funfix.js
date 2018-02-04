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

/**
 * The `Functor` is a type class providing the `map` operation that
 * allows lifting an `f` function into the functor context and
 * applying it.
 *
 * Instances must obey these laws:
 *
 * 1. Identity: `F.map(x => x, a) <-> a`
 * 2. Composition: `F.map(x => f(g(x)), a) <-> F.map(f, F.map(g, a))`
 *
 * Equivalent with the `Functor` specification in the
 * [static-land]{@link https://github.com/rpominov/static-land/} spec.
 */
export interface Functor<F> {
  map<A, B>(f: (a: A) => B, fa: HK<F, A>): HK<F, B>
}

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
 * 1. Identity: `F.map(fa, x => x) <-> fa`
 * 2. Composition: `F.map(fa, x => f(g(x))) <-> F.map(F.map(fa, g), f)`
 *
 * Equivalent with the `Functor` type class in the
 * [Fantasy-Land](https://github.com/fantasyland/fantasy-land) specification.
 */
export interface Functor<F> {
  map<A, B>(fa: HK<F, A>, f: (a: A) => B): HK<F, B>
}

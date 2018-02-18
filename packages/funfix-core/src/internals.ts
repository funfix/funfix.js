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

import { Constructor } from "funland"

/**
 * Given a constructor, searches for all Fantasy-Land compatible
 * methods registered on its `prototype` and also registers them
 * using Fantasy-Land compatible symbols.
 *
 * For example:
 *
 * ```typescript
 * class Box<A> {
 *   constructor(public readonly value: A) {}
 *
 *   // Setoid
 *   equals(that: Box<A>) {
 *     return that && this.value === that.value
 *   }
 *   // Functor
 *   map<B>(f: (a: A) => B): Box<B> {
 *     return new Box(f(this.value))
 *   }
 * }
 *
 * // Registering Fantasy-Land compatible symbols
 * fantasyLandRegister(Box)
 * ```
 *
 * The above registration call would make `fantasy-land/equals` and
 * `fantasy-land/functor` available on `Box.prototype`.
 *
 * @private
 * @Hidden
 */
export function fantasyLandRegister<A>(cls: Constructor<A>): void {
  const c = cls as any
  const p = c.prototype

  const fl = "fantasy-land/"
  const equals = "equals"
  const flEquals = fl + equals
  const map = "map"
  const flMap = fl + map
  const ap = "ap"
  const flAp = fl + ap
  const flOf = fl + "of"
  const chain = "chain"
  const flChain = fl + chain
  const chainRec = "chainRec"
  const flChainRec = fl + chainRec

  // Setoid
  /* istanbul ignore else */
  if (p[equals]) {
    p[flEquals] = p[equals]
  }
  // Functor
  /* istanbul ignore else */
  if (p[map]) {
    p[flMap] = p[map]
  }
  // Apply
  /* istanbul ignore else */
  if (p[ap]) {
    p[flAp] = p[ap]
  }
  // Applicative
  /* istanbul ignore else */
  if (c["pure"]) {
    c[flOf] = c["pure"]
  }
  // Chain
  /* istanbul ignore else */
  if (p[chain]) {
    p[flChain] = p[chain]
  }
  // ChainRec
  /* istanbul ignore else */
  if (c[chainRec]) {
    c[flChainRec] = c[chainRec]
  }
}

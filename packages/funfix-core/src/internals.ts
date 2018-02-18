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

import { Constructor, Setoid, Monad } from "funland"

/**
 * Given a function, converts it into a method where `this` gets
 * passed around as the last argument.
 */
export function convertToMethod(f: Function): Function {
  return function (this: any) {
    const args = Array.prototype.slice.call(arguments)
    args.push(this)
    return f.apply(undefined, args)
  }
}

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
export function fantasyLandRegister<A>(
  cls: Constructor<A>,
  monad?: Monad<any>,
  setoid?: Setoid<any>): void {

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
  if (p[equals]) {
    p[flEquals] = p[equals]
  } else {
    /* istanbul ignore else */
    if (setoid) p[flEquals] = convertToMethod(setoid.equals)
  }
  // Functor
  if (p[map]) {
    p[flMap] = p[map]
  } else {
    /* istanbul ignore else */
    if (monad) p[flMap] = convertToMethod(monad.map)
  }
  // Apply
  if (p[ap]) {
    p[flAp] = p[ap]
  } else {
    /* istanbul ignore else */
    if (monad) p[flAp] = convertToMethod(monad.ap)
  }
  // Applicative
  if (c["pure"]) {
    c[flOf] = c["pure"]
  } else {
    /* istanbul ignore else */
    if (monad) c[flOf] = monad.of
  }
  // Chain
  if (p[chain]) {
    p[flChain] = p[chain]
  } else {
    /* istanbul ignore else */
    if (monad) p[flChain] = convertToMethod(monad.chain)
  }
  // ChainRec
  if (c[chainRec]) {
    c[flChainRec] = c[chainRec]
  } else {
    /* istanbul ignore else */
    if (monad) c[flChainRec] = monad.chainRec
  }
}

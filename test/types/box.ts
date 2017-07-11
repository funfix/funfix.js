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

import { Applicative, Eq, HK } from "../../src/types"

/**
 * Dummy class meant to test default type class operations.
 */
export class Box<A> {
  constructor(public value: A) {}

  // tslint:disable-next-line:variable-name
  __hkF: () => Box<any>
  // tslint:disable-next-line:variable-name
  __hkA: () => A

  // tslint:disable-next-line:variable-name
  static __types = {
    functor: () => new BoxInstances(),
    apply: () => new BoxInstances(),
    applicative: () => new BoxInstances(),
    eq: () => new BoxInstances()
  }
}

export class BoxInstances<A> extends Applicative<Box<any>> implements Eq<Box<any>> {
  pure<A>(a: A): HK<Box<any>, A> {
    return new Box(a)
  }

  ap<A, B>(fa: HK<Box<any>, A>, ff: HK<Box<any>, (a: A) => B>): HK<Box<any>, B> {
    const a = (fa as Box<A>).value
    const f = (ff as Box<(a: A) => B>).value
    return new Box(f(a))
  }

  eqv(lh: Box<any>, rh: Box<any>): boolean {
    return lh.value === rh.value
  }
}

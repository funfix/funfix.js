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

import { applyMixins, Either } from "../../src/core"
import {
  Functor,
  Apply,
  Applicative,
  FlatMap,
  Monad,
  Eq,
  HK,
  registerTypeClassInstance
} from "../../src/types"

/**
 * Dummy class meant to test global type class operations.
 */
export class Box<A> implements HK<Box<any>, A> {
  constructor(public value: A) {}

  // Implements HK<Box<any>, A>
  readonly _funKindF: Box<any>
  readonly _funKindA: A
}

export type BoxK<A> = HK<Box<any>, A>

export class BoxEq implements Eq<Box<any>> {
  eqv(lh: Box<any>, rh: Box<any>): boolean {
    return lh.value === rh.value
  }
}

export class BoxFunctor implements Functor<Box<any>> {
  map<A, B>(fa: BoxK<A>, f: (a: A) => B): Box<B> {
    return new Box(f((fa as Box<A>).value))
  }
}

export class BoxApply implements Apply<Box<any>> {
  map<A, B>(fa: BoxK<A>, f: (a: A) => B): Box<B> {
    const a = (fa as Box<A>).value
    return new Box(f(a))
  }

  ap<A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>): Box<B> {
    const a = (fa as Box<A>).value
    const f = (ff as Box<(a: A) => B>).value
    return new Box(f(a))
  }

  // Mixed-in, as these have default implementations
  map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
  product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
}

applyMixins(BoxApply, [Apply])

export class BoxApplicative implements Applicative<Box<any>> {
  pure<A>(a: A): Box<A> { return new Box(a) }

  ap<A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>): Box<B> {
    const a = (fa as Box<A>).value
    const f = (ff as Box<(a: A) => B>).value
    return new Box(f(a))
  }

  // Mixed-in, as these have default implementations
  map: <A, B>(fa: BoxK<A>, f: (a: A) => B) => Box<B>
  map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
  product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
  unit: () => Box<void>
}

applyMixins(BoxApplicative, [Applicative])

export class BoxFlatMap implements FlatMap<Box<any>> {
  map<A, B>(fa: BoxK<A>, f: (a: A) => B): Box<B> {
    return new Box(f((fa as Box<A>).value))
  }

  flatMap<A, B>(fa: BoxK<A>, f: (a: A) => BoxK<B>): Box<B> {
    return f((fa as Box<A>).value) as Box<B>
  }

  tailRecM<A, B>(a: A, f: (a: A) => BoxK<Either<A, B>>): Box<B> {
    let cursor = a
    while (true) {
      const box = f(cursor) as Box<Either<A, B>>
      const v = box.value

      if (v.isRight()) {
        return new Box(v.get())
      } else {
        cursor = v.swap().get()
      }
    }
  }

  // Mixed-in, as these have default implementations
  map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
  ap: <A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>) => Box<B>
  product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
  unit: () => Box<void>
  followedBy: <A, B>(fa: BoxK<A>, fb: BoxK<B>) => Box<B>
  followedByL: <A, B>(fa: BoxK<A>, fb: () => BoxK<B>) => Box<B>
  forEffect: <A, B>(fa: BoxK<A>, fb: BoxK<B>) => Box<A>
  forEffectL: <A, B>(fa: BoxK<A>, fb: () => BoxK<B>) => Box<A>
}

applyMixins(BoxFlatMap, [FlatMap])

export class BoxMonad<A> implements Monad<Box<any>> {
  pure<A>(a: A): Box<A> { return new Box(a) }

  flatMap<A, B>(fa: BoxK<A>, f: (a: A) => BoxK<B>): Box<B> {
    return f((fa as Box<A>).value) as Box<B>
  }

  tailRecM<A, B>(a: A, f: (a: A) => BoxK<Either<A, B>>): Box<B> {
    let cursor = a
    while (true) {
      const box = f(cursor) as Box<Either<A, B>>
      const v = box.value
      if (v.isRight()) return new Box(v.get())
      cursor = v.swap().get()
    }
  }

  // Mixed in
  map: <A, B>(fa: BoxK<A>, f: (a: A) => B) => Box<B>
  map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
  ap: <A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>) => Box<B>
  product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
  unit: () => Box<void>
  followedBy: <A, B>(fa: BoxK<A>, fb: BoxK<B>) => Box<B>
  followedByL: <A, B>(fa: BoxK<A>, fb: () => BoxK<B>) => Box<B>
  forEffect: <A, B>(fa: BoxK<A>, fb: BoxK<B>) => Box<A>
  forEffectL: <A, B>(fa: BoxK<A>, fb: () => BoxK<B>) => Box<A>
}

applyMixins(BoxMonad, [Monad])

// Global instance registration
registerTypeClassInstance(Eq)(Box, new BoxEq())
registerTypeClassInstance(Functor)(Box, new BoxFunctor())
registerTypeClassInstance(Apply)(Box, new BoxApply())
registerTypeClassInstance(Applicative)(Box, new BoxApplicative())
registerTypeClassInstance(FlatMap)(Box, new BoxFlatMap())
registerTypeClassInstance(Monad)(Box, new BoxMonad())

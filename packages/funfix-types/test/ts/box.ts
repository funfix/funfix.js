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

import { applyMixins, Either, is, Success, Try } from "funfix-core"
import {
  Functor,
  Apply,
  Applicative,
  ApplicativeError,
  FlatMap,
  Monad,
  MonadError,
  CoflatMap,
  Comonad,
  Eq,
  HK,
  registerTypeClassInstance
} from "../../src/"

/**
 * Dummy class meant to test global type class operations.
 */
export class Box<A> implements BoxK<A> {
  constructor(public value: Try<A>) {}

  // Implements BoxK<A>
  readonly _funKindF: Box<any>
  readonly _funKindA: A
}

export type BoxK<A> = HK<Box<any>, A>

export class BoxEq implements Eq<Box<any>> {
  eqv(lh: Box<any>, rh: Box<any>): boolean {
    let left: any = lh.value
    let right: any = rh.value

    while (true) {
      if (left instanceof Box) {
        left = left.value
        if (!(right instanceof Box)) return false
        right = right.value
      } else if (left instanceof Try) {
        if (!(right instanceof Try)) return false
        if (left.isSuccess()) {
          if (!right.isSuccess()) return false
          left = left.get()
          right = right.get()
        } else {
          if (right.isSuccess()) return false
          left = left.failed().get()
          right = right.failed().get()
        }
      } else {
        return is(left, right)
      }
    }
  }
}

export class BoxFunctor implements Functor<Box<any>> {
  map<A, B>(fa: BoxK<A>, f: (a: A) => B): Box<B> {
    return new Box((fa as Box<A>).value.map(f))
  }
}

export class BoxApply implements Apply<Box<any>> {
  map<A, B>(fa: BoxK<A>, f: (a: A) => B): Box<B> {
    return new Box((fa as Box<A>).value.map(f))
  }

  ap<A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>): Box<B> {
    const ta = (fa as Box<A>).value
    const tf = (ff as Box<(a: A) => B>).value
    return new Box(Try.map2(ta, tf, (a, f) => f(a)))
  }

  // Mixed-in, as these have default implementations
  map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
  product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
}

applyMixins(BoxApply, [Apply])

export class BoxApplicative implements Applicative<Box<any>> {
  pure<A>(a: A): Box<A> { return new Box(Try.success(a)) }

  ap<A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>): Box<B> {
    const ta = (fa as Box<A>).value
    const tf = (ff as Box<(a: A) => B>).value
    return new Box(Try.map2(ta, tf, (a, f) => f(a)))
  }

  // Mixed-in, as these have default implementations
  map: <A, B>(fa: BoxK<A>, f: (a: A) => B) => Box<B>
  map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
  product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
  unit: () => Box<void>
}

applyMixins(BoxApplicative, [Applicative])

export class BoxApplicativeError implements ApplicativeError<Box<any>, any> {
  pure<A>(a: A): Box<A> { return new Box(Try.success(a)) }

  ap<A, B>(fa: BoxK<A>, ff: BoxK<(a: A) => B>): Box<B> {
    const ta = (fa as Box<A>).value
    const tf = (ff as Box<(a: A) => B>).value
    return new Box(Try.map2(ta, tf, (a, f) => f(a)))
  }

  raise<A>(e: any): BoxK<A> {
    return new Box(Try.failure(e))
  }

  recoverWith<A>(fa: BoxK<A>, f: (e: any) => BoxK<A>): BoxK<A> {
    return new Box((fa as Box<A>).value.recoverWith(e => (f(e) as Box<A>).value))
  }

  // Mixed-in, as these have default implementations
  map: <A, B>(fa: BoxK<A>, f: (a: A) => B) => Box<B>
  map2: <A, B, Z>(fa: BoxK<A>, fb: BoxK<B>, f: (a: A, b: B) => Z) => Box<Z>
  product: <A, B> (fa: BoxK<A>, fb: BoxK<B>) => Box<[A, B]>
  unit: () => Box<void>
  recover: <A>(fa: BoxK<A>, f: (e: any) => A) => BoxK<A>
  attempt: <A>(fa: BoxK<A>) => BoxK<Either<any, A>>
}

applyMixins(BoxApplicativeError, [ApplicativeError])

export class BoxFlatMap implements FlatMap<Box<any>> {
  map<A, B>(fa: BoxK<A>, f: (a: A) => B): Box<B> {
    return new Box((fa as Box<A>).value.map(f))
  }

  flatMap<A, B>(fa: BoxK<A>, f: (a: A) => BoxK<B>): Box<B> {
    return (fa as Box<A>).value.fold(
      err => new Box(Try.failure(err)),
      value => f(value) as Box<B>
    )
  }

  tailRecM<A, B>(a: A, f: (a: A) => BoxK<Either<A, B>>): Box<B> {
    let cursor = a
    while (true) {
      const box = f(cursor) as Box<Either<A, B>>
      const tv = box.value
      if (tv.isFailure())
        return (box as any) as Box<B>

      const v = tv.get()
      if (v.isRight()) {
        return new Box(Try.success(v.get()))
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
  pure<A>(a: A): Box<A> { return new Box(Try.success(a)) }

  flatMap<A, B>(fa: BoxK<A>, f: (a: A) => BoxK<B>): Box<B> {
    return (fa as Box<A>).value.fold(
      err => new Box(Try.failure(err)),
      value => f(value) as Box<B>
    )
  }

  tailRecM<A, B>(a: A, f: (a: A) => BoxK<Either<A, B>>): Box<B> {
    let cursor = a
    while (true) {
      const box = f(cursor) as Box<Either<A, B>>
      const tv = box.value
      if (tv.isFailure())
        return (box as any) as Box<B>

      const v = tv.get()
      if (v.isRight()) {
        return new Box(Try.success(v.get()))
      } else {
        cursor = v.swap().get()
      }
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

export class BoxMonadError<A> implements MonadError<Box<any>, Error> {
  pure<A>(a: A): Box<A> { return new Box(Try.success(a)) }

  flatMap<A, B>(fa: BoxK<A>, f: (a: A) => BoxK<B>): Box<B> {
    return (fa as Box<A>).value.fold(
      err => new Box(Try.failure(err)),
      value => f(value) as Box<B>
    )
  }

  tailRecM<A, B>(a: A, f: (a: A) => BoxK<Either<A, B>>): Box<B> {
    let cursor = a
    while (true) {
      const box = f(cursor) as Box<Either<A, B>>
      const tv = box.value
      if (tv.isFailure())
        return (box as any) as Box<B>

      const v = tv.get()
      if (v.isRight()) {
        return new Box(Try.success(v.get()))
      } else {
        cursor = v.swap().get()
      }
    }
  }

  raise<A>(e: any): BoxK<A> {
    return new Box(Try.failure(e))
  }

  recoverWith<A>(fa: BoxK<A>, f: (e: any) => BoxK<A>): BoxK<A> {
    return new Box((fa as Box<A>).value.recoverWith(e => (f(e) as Box<A>).value))
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
  recover: <A>(fa: BoxK<A>, f: (e: any) => A) => BoxK<A>
  attempt: <A>(fa: BoxK<A>) => BoxK<Either<any, A>>
}

applyMixins(BoxMonadError, [MonadError])

export class BoxCoflatMap extends BoxFunctor implements CoflatMap<Box<any>> {
  coflatMap<A, B>(fa: BoxK<A>, ff: (a: BoxK<A>) => B): BoxK<B> {
    return new Box(Success(ff(fa)))
  }

  coflatten<A>(fa: BoxK<A>): BoxK<BoxK<A>> {
    return new Box(Success(fa))
  }
}

applyMixins(BoxCoflatMap, [CoflatMap])

export class BoxComonad extends BoxCoflatMap implements Comonad<Box<any>> {
  extract<A>(fa: BoxK<A>): A {
    return (fa as Box<A>).value.get()
  }
}

applyMixins(BoxComonad, [Comonad])

// Global instance registration
registerTypeClassInstance(Eq)(Box, new BoxEq())
registerTypeClassInstance(Functor)(Box, new BoxFunctor())
registerTypeClassInstance(Apply)(Box, new BoxApply())
registerTypeClassInstance(Applicative)(Box, new BoxApplicative())
registerTypeClassInstance(ApplicativeError)(Box, new BoxApplicativeError())
registerTypeClassInstance(FlatMap)(Box, new BoxFlatMap())
registerTypeClassInstance(Monad)(Box, new BoxMonad())
registerTypeClassInstance(MonadError)(Box, new BoxMonadError())
registerTypeClassInstance(CoflatMap)(Box, new BoxCoflatMap())
registerTypeClassInstance(Comonad)(Box, new BoxComonad())

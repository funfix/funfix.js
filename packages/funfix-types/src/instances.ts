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

import { Try, Success, Option, Some, Either, Right, applyMixins, Throwable } from "funfix-core"
import { Eval, IO } from "funfix-effect"
import { Future } from "funfix-exec"
import { HK, registerTypeClassInstance } from "./kinds"
import { Monad, MonadError } from "./monad"
import { Comonad, CoflatMap } from "./comonad"
import { Eq } from "./eq"

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type OptionK<A> = HK<Option<any>, A>

/**
 * Type class instances provided by default for `Option`.
 */
export class OptionInstances implements Monad<Option<any>>, Eq<Option<any>>, CoflatMap<Option<any>> {
  // tslint:disable-next-line:variable-name
  private __unit: Option<void> = Some(undefined)

  eqv(lh: Option<any>, rh: Option<any>): boolean {
    if (lh === rh) return true
    if (lh.isEmpty()) return rh.isEmpty()
    if (rh.isEmpty()) return false
    return Eq.testEq(lh.get(), rh.get())
  }

  pure<A>(a: A): Option<A> {
    return Some(a)
  }

  unit(): Option<void> {
    return this.__unit
  }

  ap<A, B>(fa: OptionK<A>, ff: OptionK<(a: A) => B>): Option<B> {
    return Option.map2(fa as Option<A>, ff as Option<(a: A) => B>, (a, f) => f(a))
  }

  map<A, B>(fa: OptionK<A>, f: (a: A) => B): Option<B> {
    return (fa as Option<A>).map(f)
  }

  map2<A, B, Z>(fa: OptionK<A>, fb: OptionK<B>, f: (a: A, b: B) => Z): Option<Z> {
    return Option.map2(fa as Option<A>, fb as Option<B>, f)
  }

  product<A, B>(fa: OptionK<A>, fb: OptionK<B>): Option<[A, B]> {
    return Option.map2(fa as Option<A>, fb as Option<B>, (a, b) => [a, b] as [A, B])
  }

  flatMap<A, B>(fa: OptionK<A>, f: (a: A) => OptionK<B>): Option<B> {
    return (fa as any).flatMap(f)
  }

  tailRecM<A, B>(a: A, f: (a: A) => OptionK<Either<A, B>>): Option<B> {
    return Option.tailRecM(a, f as any) as any
  }

  coflatMap<A, B>(fa: OptionK<A>, ff: (a: OptionK<A>) => B): Option<B> {
    return Some(ff(fa))
  }

  coflatten<A>(fa: OptionK<A>): Option<Option<A>> {
    return Some(fa as Option<A>)
  }

  // Mixed-in
  followedBy: <A, B>(fa: OptionK<A>, fb: OptionK<B>) => Option<B>
  followedByL: <A, B>(fa: OptionK<A>, fb: () => OptionK<B>) => Option<B>
  forEffect: <A, B>(fa: OptionK<A>, fb: OptionK<B>) => Option<A>
  forEffectL: <A, B>(fa: OptionK<A>, fb: () => OptionK<B>) => Option<A>

  static readonly global: OptionInstances =
    new OptionInstances()
}

// Mixins the default implementations
applyMixins(OptionInstances, [Monad])

// Registering `OptionInstances` as global instances for Option
registerTypeClassInstance(Eq)(Option, OptionInstances.global)
registerTypeClassInstance(Monad)(Option, OptionInstances.global)
registerTypeClassInstance(CoflatMap)(Option, OptionInstances.global)

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type TryK<A> = HK<Try<any>, A>

/**
 * Type class instances provided by default for `Option`.
 */
export class TryInstances
  implements MonadError<Try<any>, Throwable>, Eq<Try<any>>, CoflatMap<Try<any>> {

  eqv(lh: Try<any>, rh: Try<any>): boolean {
    if (lh === rh) return true
    if (lh.isSuccess()) {
      if (rh.isFailure()) return false
      return Eq.testEq(lh.get(), rh.get())
    } else {
      if (rh.isSuccess()) return false
      return Eq.testEq(lh.failed().get(), rh.failed().get())
    }
  }

  pure<A>(a: A): Try<A> {
    return Success(a)
  }

  unit(): Try<void> {
    return Try.unit()
  }

  ap<A, B>(fa: TryK<A>, ff: TryK<(a: A) => B>): Try<B> {
    return Try.map2(fa as Try<A>, ff as Try<(a: A) => B>, (a, f) => f(a))
  }

  map<A, B>(fa: TryK<A>, f: (a: A) => B): Try<B> {
    return (fa as Try<A>).map(f)
  }

  map2<A, B, Z>(fa: TryK<A>, fb: TryK<B>, f: (a: A, b: B) => Z): Try<Z> {
    return Try.map2(fa as Try<A>, fb as Try<B>, f)
  }

  product<A, B>(fa: TryK<A>, fb: TryK<B>): Try<[A, B]> {
    return Try.map2(fa as Try<A>, fb as Try<B>, (a, b) => [a, b] as [A, B])
  }

  flatMap<A, B>(fa: TryK<A>, f: (a: A) => TryK<B>): Try<B> {
    return (fa as any).flatMap(f)
  }

  tailRecM<A, B>(a: A, f: (a: A) => TryK<Either<A, B>>): Try<B> {
    return Try.tailRecM(a, f as any) as any
  }

  raise<A>(e: any): Try<A> {
    return Try.failure<A>(e)
  }

  attempt<A>(fa: TryK<A>): Try<Either<Throwable, A>> {
    return Try.success((fa as Try<A>).fold(
      e => Either.left<Throwable, A>(e),
      Either.right
    ))
  }

  recoverWith<A>(fa: TryK<A>, f: (e: Throwable) => TryK<A>): Try<A> {
    return (fa as Try<A>).recoverWith(f as ((e: Throwable) => Try<A>))
  }

  recover<A>(fa: TryK<A>, f: (e: Throwable) => A): Try<A> {
    return (fa as Try<A>).recover(f as ((e: Throwable) => A))
  }

  coflatMap<A, B>(fa: TryK<A>, ff: (a: TryK<A>) => B): Try<B> {
    return Success(ff(fa))
  }

  coflatten<A>(fa: TryK<A>): Try<Try<A>> {
    return Success(fa as Try<A>)
  }

  // Mixed-in
  followedBy: <A, B>(fa: TryK<A>, fb: TryK<B>) => Try<B>
  followedByL: <A, B>(fa: TryK<A>, fb: () => TryK<B>) => Try<B>
  forEffect: <A, B>(fa: TryK<A>, fb: TryK<B>) => Try<A>
  forEffectL: <A, B>(fa: TryK<A>, fb: () => TryK<B>) => Try<A>

  static global: TryInstances =
    new TryInstances()
}

// Mixins the default implementations
applyMixins(TryInstances, [MonadError])

// Registering `TryInstances` as global instances for Try
registerTypeClassInstance(Eq)(Try, TryInstances.global)
registerTypeClassInstance(MonadError)(Try, TryInstances.global)
registerTypeClassInstance(CoflatMap)(Try, TryInstances.global)

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type EitherK<L, R> = HK<Either<L, any>, R>

/**
 * Type class instances provided by default for `Either`.
 */
export class EitherInstances<L>
  implements Monad<Either<L, any>>, Eq<Either<L, any>>, CoflatMap<Either<L, any>> {
  // tslint:disable-next-line:variable-name
  private __unit: Either<L, void> = Right(undefined)

  eqv(lh: Either<L, any>, rh: Either<L, any>): boolean {
    if (lh === rh) return true
    if (lh.isRight()) {
      if (rh.isLeft()) return false
      return Eq.testEq(lh.get(), rh.get())
    } else {
      if (rh.isRight()) return false
      return Eq.testEq(lh.swap().get(), rh.swap().get())
    }
  }

  pure<A>(a: A): Either<L, A> {
    return Right(a)
  }

  unit(): Either<L, void> {
    return this.__unit
  }

  ap<A, B>(fa: EitherK<L, A>, ff: EitherK<L, (a: A) => B>): Either<L, B> {
    const faE = (fa as any) as Either<L, A>
    const ffE = (ff as any) as Either<L, (a: A) => B>
    return Either.map2(faE, ffE, (a, f) => f(a))
  }

  map<A, B>(fa: EitherK<L, A>, f: (a: A) => B): Either<L, B> {
    return ((fa as any) as Either<L, A>).map(f)
  }

  map2<A, B, Z>(fa: EitherK<L, A>, fb: EitherK<L, B>, f: (a: A, b: B) => Z): Either<L, Z> {
    return Either.map2((fa as any) as Either<L, A>, (fb as any) as Either<L, B>, f)
  }

  product<A, B>(fa: EitherK<L, A>, fb: EitherK<L, B>): Either<L, [A, B]> {
    return Either.map2(
      (fa as any) as Either<L, A>,
      (fb as any) as Either<L, B>,
      (a, b) => [a, b] as [A, B])
  }

  flatMap<A, B>(fa: HK<Either<L, any>, A>, f: (a: A) => HK<Either<L, any>, B>): HK<Either<L, any>, B> {
    return (fa as any).flatMap(f)
  }

  tailRecM<A, B>(a: A, f: (a: A) => HK<Either<L, any>, Either<A, B>>): HK<Either<L, any>, B> {
    return Either.tailRecM(a, f as any) as any
  }

  coflatMap<A, B>(fa: EitherK<L, A>, ff: (a: EitherK<L, A>) => B): Either<L, B> {
    return Right(ff(fa))
  }

  coflatten<A>(fa: EitherK<L, A>): Either<L, Either<L, A>> {
    return Right(fa as Either<L, A>)
  }

  // Mixed-in
  followedBy: <A, B>(fa: EitherK<L, A>, fb: EitherK<L, B>) => Either<L, B>
  followedByL: <A, B>(fa: EitherK<L, A>, fb: () => EitherK<L, B>) => Either<L, B>
  forEffect: <A, B>(fa: EitherK<L, A>, fb: EitherK<L, B>) => Either<L, A>
  forEffectL: <A, B>(fa: EitherK<L, A>, fb: () => EitherK<L, B>) => Either<L, A>

  static global: EitherInstances<any> =
    new EitherInstances()
}

// Mixins the default implementations
applyMixins(EitherInstances, [Monad])
// Registering `TryInstances` as global instances for Try
registerTypeClassInstance(Eq)(Either, EitherInstances.global)
registerTypeClassInstance(Monad)(Either, EitherInstances.global)
registerTypeClassInstance(CoflatMap)(Either, EitherInstances.global)

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type EvalK<A> = HK<Eval<any>, A>

/**
 * Type class instances provided by default for `Eval`.
 */
export class EvalInstances implements Monad<Eval<any>>, Comonad<Eval<any>> {
  pure<A>(a: A): Eval<A> {
    return Eval.now(a)
  }

  flatMap<A, B>(fa: EvalK<A>, f: (a: A) => EvalK<B>): Eval<B> {
    return (fa as any).flatMap(f)
  }

  tailRecM<A, B>(a: A, f: (a: A) => EvalK<Either<A, B>>): Eval<B> {
    return Eval.tailRecM(a, f as any) as any
  }

  ap<A, B>(fa: EvalK<A>, ff: EvalK<(a: A) => B>): Eval<B> {
    return (fa as Eval<A>).flatMap(a =>
      (ff as Eval<(a: A) => B>).map(f => f(a))
    )
  }

  map<A, B>(fa: EvalK<A>, f: (a: A) => B): Eval<B> {
    return (fa as Eval<A>).map(f)
  }

  unit(): Eval<void> {
    return Eval.unit()
  }

  coflatMap<A, B>(fa: EvalK<A>, ff: (a: EvalK<A>) => B): Eval<B> {
    return Eval.now(ff(fa))
  }

  coflatten<A>(fa: EvalK<A>): Eval<Eval<A>> {
    return Eval.now(fa as Eval<A>)
  }

  extract<A>(fa: EvalK<A>): A {
    return (fa as Eval<A>).get()
  }

  // Mixed-in
  map2: <A, B, Z>(fa: EvalK<A>, fb: EvalK<B>, f: (a: A, b: B) => Z) => Eval<Z>
  product: <A, B>(fa: EvalK<A>, fb: EvalK<B>) => EvalK<[A, B]>
  followedBy: <A, B>(fa: EvalK<A>, fb: EvalK<B>) => Eval<B>
  followedByL: <A, B>(fa: EvalK<A>, fb: () => EvalK<B>) => Eval<B>
  forEffect: <A, B>(fa: EvalK<A>, fb: EvalK<B>) => Eval<A>
  forEffectL: <A, B>(fa: EvalK<A>, fb: () => EvalK<B>) => Eval<A>

  static global: EvalInstances =
    new EvalInstances()
}

// Mixins the default implementations
applyMixins(EvalInstances, [Monad, Comonad])
// Registering `EvalInstances` as global instances for `Eval`
registerTypeClassInstance(Monad)(Eval, EvalInstances.global)
registerTypeClassInstance(Comonad)(Eval, EvalInstances.global)

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type FutureK<A> = HK<Future<any>, A>

/**
 * Type class instances provided by default for `Future`.
 */
export class FutureInstances implements MonadError<Future<any>, Throwable>, CoflatMap<Future<any>> {
  pure<A>(a: A): Future<A> {
    return Future.pure(a)
  }

  flatMap<A, B>(fa: FutureK<A>, f: (a: A) => FutureK<B>): Future<B> {
    return (fa as any).flatMap(f)
  }

  tailRecM<A, B>(a: A, f: (a: A) => FutureK<Either<A, B>>): Future<B> {
    return Future.tailRecM(a, f as any) as any
  }

  ap<A, B>(fa: FutureK<A>, ff: FutureK<(a: A) => B>): Future<B> {
    return (fa as Future<A>).flatMap(a =>
      (ff as Future<(a: A) => B>).map(f => f(a))
    )
  }

  map<A, B>(fa: FutureK<A>, f: (a: A) => B): Future<B> {
    return (fa as Future<A>).map(f)
  }

  unit(): Future<void> {
    return Future.unit()
  }

  raise<A>(e: Throwable): Future<A> {
    return Future.raise(e)
  }

  attempt<A>(fa: FutureK<A>): Future<Either<Throwable, A>> {
    return (fa as Future<A>).attempt() as any
  }

  recoverWith<A>(fa: FutureK<A>, f: (e: Throwable) => FutureK<A>): Future<A> {
    return (fa as Future<A>).recoverWith(f as ((e: any) => Future<A>))
  }

  recover<A>(fa: FutureK<A>, f: (e: Throwable) => A): Future<A> {
    return (fa as Future<A>).recover(f as ((e: any) => A))
  }

  map2<A, B, Z>(fa: FutureK<A>, fb: FutureK<B>, f: (a: A, b: B) => Z): Future<Z> {
    return Future.map2(fa as any, fb as any, f as any) as any
  }

  coflatMap<A, B>(fa: FutureK<A>, ff: (a: FutureK<A>) => B): Future<B> {
    return Future.pure(ff(fa))
  }

  coflatten<A>(fa: FutureK<A>): Future<Future<A>> {
    return Future.pure(fa as Future<A>)
  }

  // Mixed-in
  product: <A, B>(fa: FutureK<A>, fb: FutureK<B>) => FutureK<[A, B]>
  followedBy: <A, B>(fa: FutureK<A>, fb: FutureK<B>) => Future<B>
  followedByL: <A, B>(fa: FutureK<A>, fb: () => FutureK<B>) => Future<B>
  forEffect: <A, B>(fa: FutureK<A>, fb: FutureK<B>) => Future<A>
  forEffectL: <A, B>(fa: FutureK<A>, fb: () => FutureK<B>) => Future<A>

  static global: FutureInstances =
    new FutureInstances()
}

// Mixins the default implementations
applyMixins(FutureInstances, [MonadError, CoflatMap])
// Registering `FutureInstances` as global instances for `Future`
registerTypeClassInstance(MonadError)(Future, FutureInstances.global)
registerTypeClassInstance(CoflatMap)(Future, FutureInstances.global)

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type IOK<A> = HK<IO<any>, A>

/**
 * Type class instances provided by default for `IO`.
 */
export class IOInstances implements MonadError<IO<any>, Throwable>, CoflatMap<IO<any>> {
  pure<A>(a: A): IO<A> {
    return IO.pure(a)
  }

  flatMap<A, B>(fa: IOK<A>, f: (a: A) => IOK<B>): IO<B> {
    return (fa as any).flatMap(f)
  }

  tailRecM<A, B>(a: A, f: (a: A) => IOK<Either<A, B>>): IO<B> {
    return IO.tailRecM(a, f as any) as any
  }

  ap<A, B>(fa: IOK<A>, ff: IOK<(a: A) => B>): IO<B> {
    return (fa as IO<A>).flatMap(a =>
      (ff as IO<(a: A) => B>).map(f => f(a))
    )
  }

  map<A, B>(fa: IOK<A>, f: (a: A) => B): IO<B> {
    return (fa as IO<A>).map(f)
  }

  unit(): IO<void> {
    return IO.unit()
  }

  raise<A>(e: Throwable): IO<A> {
    return IO.raise(e)
  }

  attempt<A>(fa: IOK<A>): IO<Either<Throwable, A>> {
    return (fa as IO<A>).attempt() as any
  }

  recoverWith<A>(fa: IOK<A>, f: (e: Throwable) => IOK<A>): IO<A> {
    return (fa as IO<A>).recoverWith(f as ((e: any) => IO<A>))
  }

  recover<A>(fa: IOK<A>, f: (e: Throwable) => A): IO<A> {
    return (fa as IO<A>).recover(f as ((e: any) => A))
  }

  map2<A, B, Z>(fa: IOK<A>, fb: IOK<B>, f: (a: A, b: B) => Z): IO<Z> {
    return IO.map2(fa as any, fb as any, f as any) as any
  }

  followedBy<A, B>(fa: IOK<A>, fb: IOK<B>): IO<B> {
    return (fa as any).followedBy(fb)
  }

  followedByL<A, B>(fa: IOK<A>, fb: () => IOK<B>): IO<B> {
    return (fa as any).followedBy(IO.suspend(fb as any))
  }

  forEffect<A, B>(fa: IOK<A>, fb: IOK<B>): IO<A> {
    return (fa as any).forEffect(fb)
  }

  forEffectL<A, B>(fa: IOK<A>, fb: () => IOK<B>): IO<A> {
    return (fa as any).forEffect(IO.suspend(fb as any))
  }

  product<A, B>(fa: IOK<A>, fb: IOK<B>): IO<[A, B]> {
    return IO.map2(fa as any, fb as any, (a, b) => [a, b]) as any
  }

  coflatMap<A, B>(fa: IOK<A>, ff: (a: IOK<A>) => B): IO<B> {
    return IO.pure(ff(fa))
  }

  coflatten<A>(fa: IOK<A>): IO<IO<A>> {
    return IO.pure(fa as IO<A>)
  }

  static global: IOInstances =
    new IOInstances()
}

// Mixins the default implementations
applyMixins(IOInstances, [MonadError, CoflatMap])
// Registering `IOInstances` as global instances for `IO`
registerTypeClassInstance(MonadError)(IO, IOInstances.global)
registerTypeClassInstance(CoflatMap)(IO, IOInstances.global)

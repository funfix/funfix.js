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

/**
 * Defines standard instances for types in [core]{@link "core/index"}.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { OptionInstances } from "funfix/dist/types/instances"
 * // ... or ...
 * import { OptionInstances } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module types/instances
 */

/***/
import { applyMixins } from "../core/std"
import { Try, Success, Option, Some, Either, Right } from "../core/disjunctions"
import { Eval } from "../effect/eval"
import { Future } from "../exec/future"
import { HK, registerTypeClassInstance } from "./kinds"
import { Monad, MonadError } from "./monad"
import { Eq } from "./eq"

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type OptionK<A> = HK<Option<any>, A>

/**
 * Type class instances provided by default for [[Option]].
 */
export class OptionInstances implements Monad<Option<any>>, Eq<Option<any>> {
  // tslint:disable-next-line:variable-name
  private __unit: Option<void> = Some(undefined)

  eqv(lh: Option<any>, rh: Option<any>): boolean {
    return lh.equals(rh)
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

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type TryK<A> = HK<Try<any>, A>

/**
 * Type class instances provided by default for [[Option]].
 */
export class TryInstances implements MonadError<Try<any>, any>, Eq<Try<any>> {
  // tslint:disable-next-line:variable-name
  private __unit: Try<void> = Success(undefined)

  eqv(lh: Try<any>, rh: Try<any>): boolean {
    return lh.equals(rh)
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

  attempt<A>(fa: TryK<A>): Try<Either<any, A>> {
    return Try.success((fa as Try<A>).fold(
      e => Either.left<any, A>(e),
      Either.right
    ))
  }

  recoverWith<A>(fa: TryK<A>, f: (e: any) => TryK<A>): Try<A> {
    return (fa as Try<A>).recoverWith(f as ((e: any) => Try<A>))
  }

  recover<A>(fa: TryK<A>, f: (e: any) => A): Try<A> {
    return (fa as Try<A>).recover(f as ((e: any) => A))
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

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type EitherK<L, R> = HK<Either<L, any>, R>

/**
 * Type class instances provided by default for [[Either]].
 */
export class EitherInstances<L> implements Monad<Either<L, any>>, Eq<Either<L, any>> {
  // tslint:disable-next-line:variable-name
  private __unit: Either<L, void> = Right(undefined)

  eqv(lh: Either<L, any>, rh: Either<L, any>): boolean {
    return ((lh as any) as Either<L, any>).equals(rh as any)
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

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type EvalK<A> = HK<Eval<any>, A>

/**
 * Type class instances provided by default for [[Eval]].
 */
export class EvalInstances implements MonadError<Eval<any>, any> {
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

  raise<A>(e: any): Eval<A> {
    return Eval.raise(e)
  }

  attempt<A>(fa: EvalK<A>): Eval<Either<any, A>> {
    return (fa as Eval<A>).attempt()
  }

  recoverWith<A>(fa: EvalK<A>, f: (e: any) => EvalK<A>): Eval<A> {
    return (fa as Eval<A>).recoverWith(f as ((e: any) => Eval<A>))
  }

  recover<A>(fa: EvalK<A>, f: (e: any) => A): Eval<A> {
    return (fa as Eval<A>).recover(f as ((e: any) => A))
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
applyMixins(EvalInstances, [MonadError])
// Registering `EvalInstances` as global instances for `Eval`
registerTypeClassInstance(MonadError)(Eval, EvalInstances.global)

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type FutureK<A> = HK<Future<any>, A>

/**
 * Type class instances provided by default for {@link Future}.
 */
export class FutureInstances implements MonadError<Future<any>, any> {
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

  raise<A>(e: any): Future<A> {
    return Future.raise(e)
  }

  attempt<A>(fa: FutureK<A>): Future<Either<any, A>> {
    return (fa as Future<A>).attempt()
  }

  recoverWith<A>(fa: FutureK<A>, f: (e: any) => FutureK<A>): Future<A> {
    return (fa as Future<A>).recoverWith(f as ((e: any) => Future<A>))
  }

  recover<A>(fa: FutureK<A>, f: (e: any) => A): Future<A> {
    return (fa as Future<A>).recover(f as ((e: any) => A))
  }

  map2<A, B, Z>(fa: FutureK<A>, fb: FutureK<B>, f: (a: A, b: B) => Z): Future<Z> {
    return Future.map2(fa as any, fb as any, f as any)
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
applyMixins(FutureInstances, [MonadError])
// Registering `FutureInstances` as global instances for `Future`
registerTypeClassInstance(MonadError)(Future, FutureInstances.global)

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
import { Option, Some } from "../core/option"
import { Try, Success } from "../core/try"
import { Either, Right } from "../core/either"
import { HK, registerTypeClassInstance } from "./kinds"
import { Applicative } from "./applicative"
import { Eq } from "./eq"

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type OptionK<A> = HK<Option<any>, A>

/**
 * Type class instances provided by global for [[Option]].
 */
export class OptionInstances implements Applicative<Option<any>>, Eq<Option<any>> {
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

  static readonly global: OptionInstances =
    new OptionInstances()
}

// Registering `OptionInstances` as global instances for Option
registerTypeClassInstance(Eq)(Option, OptionInstances.global)
registerTypeClassInstance(Applicative)(Option, OptionInstances.global)

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type TryK<A> = HK<Try<any>, A>

/**
 * Type class instances provided by global for [[Option]].
 */
export class TryInstances implements Applicative<Try<any>>, Eq<Try<any>> {
  // tslint:disable-next-line:variable-name
  private __unit: Try<void> = Success(undefined)

  eqv(lh: Try<any>, rh: Try<any>): boolean {
    return lh.equals(rh)
  }

  pure<A>(a: A): Try<A> {
    return Success(a)
  }

  unit(): Try<void> {
    return this.__unit
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

  static global: TryInstances =
    new TryInstances()
}

// Registering `TryInstances` as global instances for Try
registerTypeClassInstance(Eq)(Try, TryInstances.global)
registerTypeClassInstance(Applicative)(Try, TryInstances.global)

/**
 * Alias used for encoding higher-kinded types when implementing
 * type class instances.
 */
export type EitherK<L, R> = HK<Either<L, any>, R>

/**
 * Type class instances provided by global for [[Either]].
 */
export class EitherInstances<L> implements Applicative<Either<L, any>>, Eq<Either<L, any>> {
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

  static global: EitherInstances<any> =
    new EitherInstances()
}

// Registering `TryInstances` as global instances for Try
registerTypeClassInstance(Eq)(Either, EitherInstances.global)
registerTypeClassInstance(Applicative)(Either, EitherInstances.global)

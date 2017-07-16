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
 * Utilities for working with type classes and higher kinded types.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { HK } from "funfix/dist/types/kinds"
 * // ... or ...
 * import { HK } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module types/kinds
 */

/***/
import { IllegalArgumentError, NotImplementedError } from "../core/errors"

/**
 * Given a type `T` representing instances of a class `C`, the type
 * `Constructor<T>` is the type of the class `C`.
 *
 * This type emulates
 * [Class<T> from Flow]{@link https://flow.org/en/docs/types/utilities/#classt-a-classtoc-idtoc-class-hreftoc-classa}.
 *
 * Note that in TypeScript constructors can also be `protected` or `private`
 * and unfortunately specifying `{ new(): T }` is thus insufficient.
 * Which is why, for classes without a public constructor, we have to
 * specify a `_funErasure` (static) member as a property, to help the compiler
 * infer type `T`.
 *
 * Example:
 *
 * ```typescript
 * class NumBox { constructor(public num: number) {} }
 * class GenBox<A> { constructor(public a: A) {} }
 *
 * function getDefault<F>(ref: Constructor<F>): Option<F> {
 *   if ((ref as any)._default) return Some(ref._default)
 *   return None
 * }
 *
 * (NumBox as any)._default = new NumBox(10)
 * (GenBox as any)._default = new GenBox("value")
 *
 * const r1: Option<NumBox> = getDefault(NumBox)
 * const r2: Option<GenBox<any>> = getDefault(GenBox)
 * ```
 *
 * And for classes with a private constructor:
 *
 * ```typescript
 * class PrivateBox<A> {
 *   private constructor(public a: A) {}
 *
 *   static _funErasure: PrivateBox<any> // leaving undefined
 * }
 *
 * const F = PrivateBox as any
 * F._default = new F("hello")
 *
 * const r: Option<PrivateBox<any>> = getDefault(NumBox)
 * ```
 */
export type Constructor<T> =
  { new(...args: any[]): T } | { readonly _funErasure: T }

/**
 * The `TypeClass` interface is to be implemented by type class
 * definitions, exposing IDs needed for discovery management.
 *
 * Only of interest to type class authors.
 */
export type TypeClass<F> = Constructor<F> & {
  readonly _funTypeId: string
  readonly _funSupertypeIds: string[]
}

/**
 * Lightweight encoding for higher kinded types.
 *
 * Inspired by the
 * [Lightweight higher-kinded polymorphism]{@link https://www.cl.cam.ac.uk/~jdy22/papers/lightweight-higher-kinded-polymorphism.pdf}
 * paper.
 *
 */
export interface HK<F, A> {
  /** Trick for achieving nominal typing. */
  readonly _funKindF: F

  /** Trick for achieving nominal typing. */
  readonly _funKindA: A
}

/**
 * Data type for expressing equivalence in type class laws.
 *
 * @final
 */
export class Equiv<A> {
  private constructor(
    public readonly lh: A,
    public readonly rh: A) {}

  static of<A>(lh: A, rh: A): Equiv<A> {
    return new Equiv(lh, rh)
  }
}

/**
 * Given a {@link TypeClass} definition in `tc`, register an `instance`
 * for the given {@link Constructor} specified by `c` that implements the
 * given type class.
 *
 * Example:
 *
 * ```typescript
 * registerTypeClassInstance(Functor)(Box, new BoxFunctorInstance())
 * ```
 *
 * Data types can have only one implementation for a given type class.
 * Multiple implementations are not allowed, therefore registration needs
 * to happen at most once. If registration happens multiple times for
 * instances of the same data type and type class, then an exception is
 * going to be raised:
 *
 * ```typescript
 * // Ok
 * registerTypeClassInstance(Functor)(Box, new FunctorInstance1())
 *
 * // IllegalArgumentError: Type class coherence issue,
 * // Functor<Box> is already defined!
 * registerTypeClassInstance(Functor)(Box, new FunctorInstance1())
 * ```
 *
 * Note that type classes can have super types. So for example registering
 * a `Monad` instance will also register a `Functor` instance, along with
 * `Applicative`. The registration of supertypes however does not trigger
 * coherence errors. In this example, if you try registering a `Monad`,
 * but a `Functor` was already registered, then that the given `Monad`
 * will simply not be registered as a `Functor` for that data type.
 *
 * This is legal:
 *
 * ```typescript
 * // Ok
 * registerTypeClassInstance(Functor)(Box, new FunctorInstance())
 *
 * // Ok, even though a Monad is also a Functor
 * registerTypeClassInstance(Functor)(Box, new MonadInstance())
 * ```
 *
 * @throws `IllegalArgumentError` in case such a type class instance
 * was already specified, thus leading to a coherence issue.
 */
export function registerTypeClassInstance<F>(tc: TypeClass<F>):
  <T>(c: Constructor<T>, instance: F) => void {

  return <T>(c: Constructor<T>, instance: F) => {
    const obj = c as any
    const types: {[id: string]: any} = (obj._funTypes || {})
    obj._funTypes = types

    const existing = types[tc._funTypeId]
    if (existing) {
      // If trying to register the same instance, then ignore
      if (existing === instance) return
      // Coherence issue
      const name = existing.constructor.name
      throw new IllegalArgumentError(
        "Type class coherence issue, " +
        `${name}<${(c as any).name}> is already defined!`
      )
    }

    types[tc._funTypeId] = instance
    for (const id of tc._funSupertypeIds) {
      if (!types[id]) types[id] = instance
    }
  }
}

/**
 * Given a {@link TypeClass} instance and a {@link Constructor} reference,
 * returns its associated type class implementation if it exists, or throws
 * a {@link NotImplementedError} in case there's no such association.
 *
 * ```typescript
 * import { Option, Functor, getTypeClass } from "funfix"
 *
 * const F: Functor<Option<any>> = getTypeClass(Functor, Option)
 * ```
 */
export function getTypeClassInstance<F>(tc: TypeClass<F>):
  <T>(c: Constructor<T>) => F {

  return <T>(c: Constructor<T>) => {
    const obj = c as any
    const types: {[id: string]: any} = obj._funTypes || {}
    const instance = types[tc._funTypeId]
    if (instance) return instance as any
    throw new NotImplementedError(`${(tc as any).name}<${obj.name}>`)
  }
}

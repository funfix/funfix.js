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
 * Exposes the {@link Cancelable} interface for dealing with the disposal
 * of resources, along with `Cancelable` implementations for composing
 * cancelable actions.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Cancelable } from "funfix/dist/exec/cancelable"
 * // ... or ...
 * import { Cancelable } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module exec/cancelable
 */

/***/

import { CompositeError, IllegalStateError } from "../core/errors"

/**
 * `ICancelable` represents a one-time idempotent action that can be
 * used to cancel async computations, or to release resources that
 * active data sources are holding.
 *
 * It is similar in spirit to `java.io.Closeable`, but without the I/O
 * focus, or to `IDisposable` in Microsoft .NET.
 *
 * ```typescript
 * // Scheduling execution with a 10 seconds delay
 * const ref = setTimeout(() => console.log("Hello1"), 10000)
 * const task = Cancelable.of(() => clearTimeout(ref))
 *
 * // If we change our mind
 * task.cancel()
 * ```
 *
 * In case some API requires the return of an `ICancelable` reference,
 * but there isn't anything that can be canceled, then
 * [[Cancelable.empty]] can be used to return a reusable reference
 * that doesn't do anything when canceled.
 *
 * ```typescript
 * const task = Cancelable.empty()
 *
 * // It's a no-op, doesn't do anything
 * task.cancel()
 * ```
 *
 * Implementation sample:
 *
 * ```typescript
 * class MyCancelable implements ICancelable {
 *   // Idempotency guard
 *   private _isCanceled: boolean = false
 *
 *   cancel() {
 *     // We need an idempotency guarantee, any side-effects
 *     // need to happen only once
 *     if (!this._isCanceled) {
 *       this._isCanceled = true
 *       console.log("Was canceled!")
 *     }
 *   }
 * }
 * ```
 */
export interface ICancelable {
  cancel(): void
}

/**
 * `Cancelable` is an {@link ICancelable} class providing useful
 * builders for simple cancelable references.
 */
export abstract class Cancelable implements ICancelable {
  abstract cancel(): void

  /**
   * Lifts any callback into a `Cancelable` reference.
   *
   * ```typescript
   * const task = Cancelable.of(() => {
   *   console.log("I was canceled!")
   * })
   *
   * task.cancel()
   * //=> I was canceled!
   * ```
   *
   * The returned reference has guaranteed idempotence, so
   * calling it multiple times will trigger the given
   * callback only once.
   */
  static of(cb: () => void): Cancelable {
    return new WrapFn(cb)
  }

  /**
   * Returns a reusable `Cancelable` reference that doesn't
   * do anything on `cancel`.
   */
  static empty(): Cancelable {
    return Empty
  }

  /**
   * Returns a [[Cancelable]] implementation that represents an
   * immutable list of [[Cancelable]] references which can be canceled
   * as a group.
   *
   * ```typescript
   * val list = Cancelable.collection(
   *   Cancelable.of(() => console.log("Cancelled #1")),
   *   Cancelable.of(() => console.log("Cancelled #2")),
   *   Cancelable.of(() => console.log("Cancelled #3"))
   * )
   *
   * list.cancel()
   * //=> Cancelled #1
   * //=> Cancelled #2
   * //=> Cancelled #3
   * ```
   *
   * @param refs is the array of references to cancel when
   *        cancellation is triggered
   */
  static collection(...refs: Array<ICancelable>): Cancelable {
    return new CollectionCancelable(refs)
  }
}

/**
 * Concrete [[Cancelable]] implementation that wraps a callback.
 *
 * Implementation is package private, use {@link Cancelable.of}
 * to instantiate it.
 *
 * @Private
 * @Hidden
 */
class WrapFn extends Cancelable {
  protected thunk: null | (() => void)

  constructor(cb: () => void) {
    super()
    this.thunk = cb
  }

  cancel() {
    if (this.thunk !== null) {
      const ref = this.thunk
      this.thunk = null
      ref()
    }
  }
}

/**
 * Reusable [[Cancelable]] reference that doesn't do anything on
 * cancel.
 *
 * Implementation is package private, to access it use
 * [[Cancelable.empty]].
 *
 * @Hidden
 */
const Empty: Cancelable =
  new (//noinspection JSUnusedLocalSymbols
    class Empty extends Cancelable {
      cancel() {}
    })()

/**
 * `IBoolCancelable` represents a {@link ICancelable} that can be queried
 * for the canceled status.
 */
export interface IBoolCancelable extends ICancelable {
  /**
   * Return `true` in case this cancelable hasn't been canceled,
   * or `false` otherwise.
   *
   * ```typescript
   * const ref = BoolCancelable.of()
   *
   * ref.isCanceled() // false
   * ref.cancel()
   * ref.isCanceled() // true
   * ```
   */
  isCanceled(): boolean
}

/**
 * `BoolCancelable` is an {@link IBoolCancelable} class providing useful
 * builders for cancelable references that can be queried for their
 * canceled status.
 */
export abstract class BoolCancelable implements IBoolCancelable {
  /** Inherited from {@link IBoolCancelable.isCanceled}. */
  abstract isCanceled(): boolean

  /** Inherited from {@link ICancelable.cancel}. */
  abstract cancel(): void

  /**
   * Lifts any callback into a `BoolCancelable` reference.
   *
   * ```typescript
   * const task = BoolCancelable.of(() => {
   *   console.log("I was canceled!")
   * })
   *
   * task.isCanceled()
   * //=> false
   *
   * task.cancel()
   * //=> I was canceled!
   *
   * task.isCanceled()
   * //=> true
   * ```
   *
   * The returned reference has guaranteed idempotence, so
   * calling it multiple times will trigger the given
   * callback only once.
   */
  public static of(cb: () => void): BoolCancelable {
    return new BoolWrapFn(cb)
  }

  /**
   * Returns a [[BoolCancelable]] implementation that doesn't do
   * anything on `cancel` except for changing the status of `isCanceled`
   * from `false` to `true`.
   *
   * ```typescript
   * const task = BoolCancelable.empty()
   *
   * task.isCanceled()
   * //=> false
   *
   * task.cancel()
   * task.isCanceled()
   * //=> true
   * ```
   */
  public static empty(): BoolCancelable {
    return new BoolEmpty()
  }

  /**
   * Returns a [[BoolCancelable]] reference that is already canceled.
   *
   * ```typescript
   * const ref = BoolCancelable.alreadyCanceled()
   *
   * ref.isCanceled()
   * //=> true
   *
   * // Doesn't do anything, it's a no-op
   * ref.cancel()
   * ```
   *
   * The implementation returns the same reusable reference.
   */
  public static alreadyCanceled(): BoolCancelable {
    return AlreadyCanceled
  }

  /**
   * Returns a [[BoolCancelable]] implementation that represents an
   * immutable list of [[Cancelable]] references which can be
   * canceled as a group.
   *
   * ```typescript
   * val list = BoolCancelable.collection(
   *   Cancelable.of(() => console.log("Cancelled #1")),
   *   Cancelable.of(() => console.log("Cancelled #2")),
   *   Cancelable.of(() => console.log("Cancelled #3"))
   * )
   *
   * list.cancel()
   * //=> Cancelled #1
   * //=> Cancelled #2
   * //=> Cancelled #3
   * ```
   *
   * @param refs is the array of references to cancel when
   *        cancellation is triggered
   */
  public static collection(...refs: Array<ICancelable>): BoolCancelable {
    return new CollectionCancelable(refs)
  }
}

/**
 * [[Cancelable]] implementation that represents an immutable list of
 * [[Cancelable]] references which can be canceled as a group.
 *
 * Implementation is package private, to access it use
 * [[Cancelable.collection]].
 *
 * @Hidden
 */
class CollectionCancelable extends BoolCancelable {
  private _refs: ICancelable[]
  private _isCanceled: boolean

  constructor(refs: ICancelable[]) {
    super()
    this._refs = refs
    this._isCanceled = false
  }

  public isCanceled(): boolean {
    return this._isCanceled
  }

  public cancel(): void {
    if (!this._isCanceled) {
      this._isCanceled = true
      const errors = []
      for (const c of this._refs) {
        try { c.cancel() } catch (e) { errors.push(e) }
      }

      this._refs = [] // GC purposes
      if (errors.length === 1) throw errors[0]
      else if (errors.length > 1) throw new CompositeError(errors)
    }
  }
}

/**
 * Concrete [[BoolCancelable]] implementation that wraps a callback.
 *
 * Implementation is package private, use [[BoolCancelable.of]]
 * to instantiate it.
 *
 * @Hidden
 */
class BoolWrapFn extends WrapFn implements BoolCancelable {
  isCanceled() { return this.thunk === null }
}

/**
 * Concrete [[BoolCancelable]] implementation that doesn't do
 * anything on `cancel` except for changing the status of `isCanceled`
 * from `false` to `true`.
 *
 * Implementation is package private, use [[BoolCancelable.empty]]
 * to instantiate it.
 *
 * @Hidden
 */
class BoolEmpty extends BoolCancelable {
  private canceled: boolean = false

  isCanceled(): boolean { return this.canceled }
  public cancel(): void { this.canceled = true }
}

/**
 * Reusable [[BoolCancelable]] reference that's already canceled.
 *
 * Implementation is package private, to access it use
 * [[BoolCancelable.alreadyCanceled]].
 *
 * @Hidden
 */
const AlreadyCanceled: BoolCancelable =
  new (//noinspection JSUnusedLocalSymbols
    class AlreadyCanceled extends BoolCancelable {
      isCanceled() { return true }
      cancel() {}
    })()

/**
 * Represents a type of [[ICancelable]] that can hold
 * an internal reference to another cancelable (and thus
 * has to support the `update` operation).
 *
 * On assignment, if this cancelable is already
 * canceled, then no assignment should happen and the update
 * reference should be canceled as well.
 */
export interface IAssignCancelable extends IBoolCancelable {
  /**
   * Updates the internal reference of this assignable cancelable
   * to the given value.
   *
   * If this cancelable is already canceled, then `value` is
   * going to be canceled on assignment as well.
   */
  update(value: ICancelable): this
}

/**
 * `AssignCancelable` is an {@link IAssignCancelable} class providing
 * useful builders for cancelable references that can be assigned.
 */
export abstract class AssignCancelable implements IAssignCancelable {
  /** Inherited from {@link IAssignCancelable.update}. */
  abstract update(value: ICancelable): this

  /** Inherited from {@link IBoolCancelable.isCanceled}. */
  abstract isCanceled(): boolean

  /** Inherited from {@link ICancelable.cancel}. */
  abstract cancel(): void

  /**
   * Returns an [[AssignCancelable]] reference that is already
   * canceled.
   *
   * ```typescript
   * const ref = AssignCancelable.alreadyCanceled()
   * ref.isCanceled() //=> true
   *
   * const c = BooleanCancelable.empty()
   * ref.update(c) // cancels c
   * c.isCanceled() // true
   * ```
   *
   * The implementation returns the same reusable reference.
   */
  public static alreadyCanceled(): AssignCancelable {
    return AlreadyCanceledAssignable
  }

  /**
   * Returns a new [[AssignCancelable]] that's empty.
   *
   * The returned reference is an instance of
   * [[MultiAssignCancelable]], but this is an implementation
   * detail that may change in the future.
   */
  public static empty(): AssignCancelable {
    return MultiAssignCancelable.empty()
  }

  /**
   * Initiates an [[AssignCancelable]] reference and assigns it
   * a reference that wraps the given `cb` callback.
   *
   * So this code:
   *
   * ```typescript
   * AssignCancelable.of(() => console.log("cancelled"))
   * ```
   *
   * Is equivalent to this:
   *
   * ```typescript
   * const ref = AssignCancelable.empty()
   * ref.update(Cancelable.of(() => console.log("cancelled")))
   * ```
   */
  public static of(cb: () => void): AssignCancelable {
    return MultiAssignCancelable.of(cb)
  }
}

/**
 * Internal reusable reference for [[AssignCancelable]].
 * @Hidden
 */
const AlreadyCanceledAssignable: AssignCancelable =
  new (//noinspection JSUnusedLocalSymbols
    class AlreadyCanceledAssignable extends AssignCancelable {
      isCanceled() { return true }
      cancel() {}
      update(value: ICancelable) { value.cancel(); return this }
    })()

/**
 * The `MultiAssignCancelable` is an {@link IAssignCancelable} whose
 * underlying cancelable reference can be swapped for another.
 *
 * Example:
 *
 * ```typescript
 * const ref = MultiAssignCancelable()
 * ref.update(c1) // sets the underlying cancelable to c1
 * ref.update(c2) // swaps the underlying cancelable to c2
 *
 * ref.cancel() // also cancels c2
 * ref := c3 // also cancels c3, because s is already canceled
 * ```
 *
 * Also see [[SerialCancelable]], which is similar, except that it
 * cancels the old cancelable upon assigning a new cancelable.
 */
export class MultiAssignCancelable implements IAssignCancelable {
  private _underlying?: ICancelable
  private _canceled: boolean

  constructor(initial?: ICancelable) {
    this._underlying = initial
    this._canceled = false
  }

  /** @inheritdoc */
  public update(value: ICancelable): this {
    if (this._canceled) value.cancel()
    else this._underlying = value
    return this
  }

  /** @inheritdoc */
  public isCanceled(): boolean { return this._canceled }

  /** @inheritdoc */
  public cancel(): void {
    if (!this._canceled) {
      this._canceled = true
      if (this._underlying) {
        this._underlying.cancel()
        delete this._underlying
      }
    }
  }

  /**
   * In case the underlying reference is also a `MultiAssignCancelable`, then
   * collapse its state into this one.
   *
   * ```typescript
   * const c = Cancelable.of(() => console.info("Cancelled!"))
   *
   * const mc1 = new MultiAssignCancelable()
   * mc1.update(c)
   *
   * const mc2 = new MultiAssignCancelable()
   * mc2.update(mc1)
   *
   * // After this the underlying reference of `mc2` becomes `c`
   * mc2.collapse()
   * ```
   */
  public collapse(): this {
    if (this._underlying && this._underlying instanceof MultiAssignCancelable) {
      const ref = this._underlying
      this._underlying = ref._underlying
      this._canceled = ref._canceled
    }
    return this
  }

  /**
   * Sets the underlying cancelable reference to `undefined`,
   * useful for garbage-collecting purposes.
   */
  public clear(): this {
    if (!this._canceled) this._underlying = undefined
    return this
  }

  /**
   * Returns a new [[MultiAssignCancelable]] that's empty.
   */
  public static empty(): MultiAssignCancelable {
    return new MultiAssignCancelable()
  }

  /**
   * Initiates an [[MultiAssignCancelable]] reference and assigns it
   * a reference that wraps the given `cb` callback.
   *
   * So this code:
   *
   * ```typescript
   * MultiAssignCancelable.of(() => console.log("cancelled"))
   * ```
   *
   * Is equivalent to this:
   *
   * ```typescript
   * const ref = MultiAssignCancelable.empty()
   * ref.update(Cancelable.of(() => console.log("cancelled")))
   * ```
   */
  public static of(cb: () => void): MultiAssignCancelable {
    return new MultiAssignCancelable(Cancelable.of(cb))
  }
}

/**
 * The `SerialCancelable` is an {@link IAssignCancelable} whose underlying
 * cancelable reference can be swapped for another and on each
 * swap the previous reference gets canceled.
 *
 * Example:
 *
 * ```typescript
 * const ref = SerialCancelable()
 * ref.update(c1) // sets the underlying cancelable to c1
 * ref.update(c2) // cancels c1, swaps the underlying cancelable to c2
 *
 * ref.cancel() // also cancels c2
 * ref := c3 // also cancels c3, because s is already canceled
 * ```
 *
 * Also see [[SerialCancelable]], which is similar, except that it
 * cancels the old cancelable upon assigning a new cancelable.
 */
export class SerialCancelable implements IAssignCancelable {
  private _underlying?: ICancelable
  private _canceled: boolean

  constructor(initial?: ICancelable) {
    this._underlying = initial
    this._canceled = false
  }

  public update(value: ICancelable): this {
    if (this._canceled) value.cancel(); else {
      if (this._underlying) this._underlying.cancel()
      this._underlying = value
    }
    return this
  }

  public isCanceled(): boolean { return this._canceled }

  public cancel(): void {
    if (!this._canceled) {
      this._canceled = true
      if (this._underlying) {
        this._underlying.cancel()
        delete this._underlying
      }
    }
  }

  /**
   * Returns a new [[SerialCancelable]] that's empty.
   */
  public static empty(): SerialCancelable {
    return new SerialCancelable()
  }

  /**
   * Initiates an [[SerialCancelable]] reference and assigns it
   * a reference that wraps the given `cb` callback.
   *
   * So this code:
   *
   * ```typescript
   * SerialCancelable.of(() => console.log("cancelled"))
   * ```
   *
   * Is equivalent to this:
   *
   * ```typescript
   * const ref = SerialCancelable.empty()
   * ref.update(Cancelable.of(() => console.log("cancelled")))
   * ```
   */
  public static of(cb: () => void): SerialCancelable {
    return new SerialCancelable(Cancelable.of(cb))
  }
}

/**
 * The `SingleAssignCancelable` is a [[Cancelable]] that can be
 * assigned only once to another cancelable reference.
 *
 * Example:
 *
 * ```typescript
 * const ref = SingleAssignCancelable()
 * ref.update(c1) // sets the underlying cancelable to c1
 *
 * ref.update(c2) // throws IllegalStateError
 * ```
 *
 * See [[MultiAssignCancelable]] for a similar type that can be
 * assigned multiple types.
 */
export class SingleAssignCancelable implements IAssignCancelable {
  private _wasAssigned: boolean
  private _canceled: boolean
  private _underlying?: ICancelable

  constructor() {
    this._canceled = false
    this._wasAssigned = false
  }

  /** @inheritdoc */
  public update(value: ICancelable): this {
    if (this._wasAssigned)
      throw new IllegalStateError("SingleAssignCancelable#update multiple times")

    this._wasAssigned = true
    if (this._canceled) value.cancel()
    else this._underlying = value
    return this
  }

  /** @inheritdoc */
  public isCanceled(): boolean { return this._canceled }

  /** @inheritdoc */
  public cancel(): void {
    if (!this._canceled) {
      this._canceled = true
      if (this._underlying) {
        this._underlying.cancel()
        delete this._underlying
      }
    }
  }

  /**
   * Returns a new [[SingleAssignCancelable]] that's empty.
   */
  public static empty(): SingleAssignCancelable {
    return new SingleAssignCancelable()
  }

  /**
   * Initiates an [[SingleAssignCancelable]] reference and assigns it
   * a reference that wraps the given `cb` callback.
   *
   * So this code:
   *
   * ```typescript
   * SingleAssignCancelable.of(() => console.log("cancelled"))
   * ```
   *
   * Is equivalent to this:
   *
   * ```typescript
   * const ref = SingleAssignCancelable.empty()
   * ref.update(Cancelable.of(() => console.log("cancelled")))
   * ```
   */
  public static of(cb: () => void): SingleAssignCancelable {
    const ref = new SingleAssignCancelable()
    ref.update(Cancelable.of(cb))
    return ref
  }
}

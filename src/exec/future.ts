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
 * Exposes {@link Future}, a lawful promise implementation.
 *
 * À la carte imports work, assuming an ECMAScript 2015 compatible environment,
 * including ES2015 modules and `import` syntax:
 *
 * ```typescript
 * import { Future } from "funfix/dist/exec/future"
 * // ... or ...
 * import { Future } from "funfix"
 * ```
 *
 * In absence of ES2015 compatibility, you can still rely on working with the
 * packaged (`pkg.main`) universal distribution that works within all browsers
 * and environments.
 *
 * @module exec/future
 */

/***/
import { Try, Success, Failure, Option, Some, None, Either, Left, Right } from "../core/disjunctions"
import { IllegalStateError } from "../core/errors"
import { Scheduler } from "./scheduler"
import { ICancelable, SingleAssignCancelable, MultiAssignCancelable } from "./cancelable"

/**
 * Represents the completion of an asynchronous operation, as defined by
 * the [Promises/A+](https://promisesaplus.com/) specification.
 */
export interface IPromise<T> {
  /**
   * Attaches callbacks for the resolution and/or rejection of the promise.
   *
   * See [MDN: Promise.then]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then}.
   *
   * @param onSuccess The callback to execute when the Promise is resolved.
   * @param onFailure The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of which ever callback is executed.
   */
  then<TResult1 = T, TResult2 = never>(
    onSuccess?: (value: T) => TResult1 | IPromise<TResult1>,
    onFailure?: (reason: any) => TResult2 | IPromise<TResult2>): IPromise<TResult1 | TResult2>

  /**
   * Attaches a callback for only the rejection of the Promise.
   *
   * See [MDN: Promise.catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch).
   *
   * @param onFailure The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch<TResult = never>(onFailure?: (reason: any) => TResult | IPromise<TResult>): IPromise<T | TResult>
}

export abstract class Future<A> implements ICancelable {
  abstract value(): Option<Try<A>>
  abstract onComplete(f: (a: Try<A>) => void): void
  abstract cancel(): void

  abstract withScheduler(ec: Scheduler): Future<A>
  abstract transformWith<B>(failure: (e: any) => Future<B>, success: (a: A) => Future<B>): Future<B>

  transform<B>(failure: (e: any) => B, success: (a: A) => B): Future<B> {
    return this.transformWith(
      e => Future.pure(failure(e)),
      a => Future.pure(success(a)))
  }

  attempt(): Future<Either<any, A>> {
    return this.transform<Either<any, A>>(Left, Right)
  }

  flatMap<B>(f: (a: A) => Future<B>): Future<B> {
    return this.transformWith(Future.raise, f)
  }

  map<B>(f: (a: A) => B): Future<B> {
    return this.transformWith(Future.raise, a => Future.pure(f(a)))
  }

  recoverWith<AA>(f: (e: any) => Future<AA>): Future<A | AA> {
    return this.transformWith<A | AA>(f, Future.pure)
  }

  recover<AA>(f: (e: any) => AA): Future<A | AA> {
    return this.transformWith<A | AA>(a => Future.pure(f(a)), Future.pure)
  }

  // Implements HK<F, A>
  readonly _funKindF: Future<any>
  readonly _funKindA: A

  // Implements Constructor<T>
  static readonly _funErasure: Future<any>

  static of<A>(thunk: () => A, ec: Scheduler = Scheduler.global.get()): Future<A> {
    return new FutureBuilder(
      cb => ec.executeAsync(() => cb(Try.of(() => thunk()))),
      ec)
  }

  static pure<A>(a: A, ec: Scheduler = Scheduler.global.get()): Future<A> {
    return new PureFuture(Success(a), ec)
  }

  static raise(e: any, ec: Scheduler = Scheduler.global.get()): Future<never> {
    return new PureFuture(Failure(e), ec)
  }

  static create<A>(register: (cb: (a: Try<A>) => void) => (ICancelable | void), ec: Scheduler = Scheduler.global.get()): Future<A> {
    return new FutureBuilder(register, ec)
  }

  static unit(): Future<void> {
    return futureUnit
  }

  static tailRecM<A, B>(a: A, f: (a: A) => Future<Either<A, B>>): Future<B> {
    // Recursive loop based on flatMap
    return f(a).flatMap(r => {
      if (r.isRight()) return Future.pure(r.get())
      return Future.tailRecM(r.swap().get(), f)
    })
  }
}

class PureFuture<A> extends Future<A> {
  constructor(private readonly _value: Try<A>, private readonly _ec: Scheduler) { super() }

  cancel(): void {}
  value(): Option<Try<A>> { return Some(this._value) }

  withScheduler(ec: Scheduler): Future<A> {
    return new PureFuture(this._value, ec)
  }

  onComplete(f: (a: Try<A>) => void): void {
    this._ec.trampoline(() => f(this._value))
  }

  transformWith<B>(failure: (e: any) => Future<B>, success: (a: A) => Future<B>): Future<B> {
    return new FutureBuilder(
      cb => {
        const cRef = SingleAssignCancelable.empty()
        this.onComplete(tryA => {
          let fb: Future<B>
          try {
            fb = tryA.fold(failure, success)
          } catch (e) {
            fb = Future.raise(e)
          }

          cRef.update((fb as any)._cancelable || fb)
          fb.onComplete(cb)
        })

        return cRef
      },
      this._ec)
  }
}

class FutureBuilder<A> extends Future<A> {
  private _result: Option<Try<A>>
  private _listeners: ((a: Try<A>) => void)[]
  private _cancelable: ICancelable
  private _ec: Scheduler

  constructor(register: (cb: (a: Try<A>) => void) => (ICancelable | void), ec: Scheduler) {
    super()
    this._result = None
    this._listeners = []
    this._ec = ec

    const complete = (result: Try<A>) => {
      if (this._result !== None) {
        throw new IllegalStateError("Attempt to completing a Future multiple times")
      } else {
        this._result = Some(result)
        const listeners = this._listeners
        delete this._listeners
        delete this._cancelable

        for (const f of listeners) {
          // Forced async boundary
          ec.trampoline(() => f(result))
        }
      }
    }

    const cb = register(complete)
    if (this._result === None && cb) this._cancelable = cb
  }

  onComplete(f: (a: Try<A>) => void): void {
    if (this._result !== None) {
      // Forced async boundary
      this._ec.trampoline(() => f(this._result.get()))
    } else {
      this._listeners.push(f)
    }
  }

  value(): Option<Try<A>> {
    return this._result
  }

  cancel(): void {
    const cb = this._cancelable
    if (cb) {
      cb.cancel()
      delete this._cancelable
    }
  }

  withScheduler(ec: Scheduler): Future<A> {
    return new FutureBuilder(
      cb => {
        this.onComplete(cb)
        return this._cancelable
      },
      ec)
  }

  transformWith<B>(failure: (e: any) => Future<B>, success: (a: A) => Future<B>): Future<B> {
    return new FutureBuilder(
      cb => {
        const cRef = new MultiAssignCancelable(this._cancelable)
        this.onComplete(tryA => {
          let fb: Future<B>
          try {
            fb = tryA.fold(failure, success)
          } catch (e) {
            fb = Future.raise(e)
          }

          cRef.update((fb as any)._cancelable || fb)
          fb.onComplete(cb)
        })

        return cRef
      },
      this._ec)
  }
}

/**
 * Reusable instance for `Future<void>`.
 *
 * @Hidden
 */
const futureUnit: Future<void> =
  new PureFuture(Success(undefined), Scheduler.global.get())

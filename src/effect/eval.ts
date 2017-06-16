/**
 * @license
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

"use strict"

import { checkSealedClass } from "../core/std"
import { Try } from "../core/try"
import { IllegalStateError } from "../core/errors"

export class Eval<A> {
  constructor() {
    checkSealedClass(this, Now, Failure, Once, Always, Suspend, FlatMap)
  }

  get(): A { return this.run().get() }
  run(): Try<A> { return evalRunLoop(this) }

  flatMap<B>(f: (a: A) => Eval<B>): Eval<B> {
    return new FlatMap(this, f)
  }

  transformWith<R>(failure: (e: any) => Eval<R>, success: (a: A) => Eval<R>): Eval<R> {
    const f: any = (a: A) => success(a)
    f.onFailure = failure
    return new FlatMap(this, f) as any
  }

  static now<A>(value: A): Eval<A> { return new Now(value) }
  static raise(e: any): Eval<never> { return new Failure(e) }

  static always<A>(thunk: () => A): Eval<A> {
    return new Always(thunk)
  }

  static once<A>(thunk: () => A): Eval<A> {
    return new Once(thunk)
  }

  static suspend<A>(thunk: () => Eval<A>): Eval<A> {
    return new Suspend(thunk)
  }
}

class Now<A> extends Eval<A> {
  constructor(public value: A) { super() }

  get(): A { return this.value }
  run(): Try<A> { return Try.success(this.value) }
}

class Failure extends Eval<never> {
  constructor(public e: any) { super() }

  get(): never { throw this.e }
  run(): Try<never> { return Try.failure<never>(this.e) }
}

class Once<A> extends Eval<A> {
  private _thunk?: () => A
  private _cache: Try<A>

  constructor(thunk: () => A) {
    super()
    this._thunk = thunk
  }

  run(): Try<A> {
    if (!this._cache) {
      if (!this._thunk) throw new IllegalStateError("this._thunk is undefined")
      this._cache = Try.of(this._thunk)
      delete this._thunk
    }
    return this._cache
  }
}

class Always<A> extends Eval<A> {
  constructor(public thunk: () => A) { super() }
  run(): Try<A> { return Try.of(this.thunk) }
}

class Suspend<A> extends Eval<A> {
  constructor(public thunk: () => Eval<A>) { super() }
}

class FlatMap<A, B> extends Eval<B> {
  constructor(
    public source: Eval<A>,
    public f: (a: A) => Eval<B>) { super() }
}

interface Handler<A, R> {
  (a: A): R
}

interface FailureHandler<A, R> extends Handler<A, R> {
  onFailure(e: any): R
}

type Bind = ((a: any) => Eval<any>)
type CallStack = Array<Bind>

function _popNextBind(bFirst: Bind | null, bRest: CallStack | null): Bind | null {
  if (bFirst) return bFirst
  if (bRest && bRest.length > 0) return bRest.pop() || null
  return null
}

function _findErrorHandler(bFirst: Bind | null, bRest: CallStack | null): FailureHandler<any, Eval<any>> | null {
  let cursor: any = bFirst

  while (true) {
    if (cursor && typeof cursor.error === "function") return cursor
    if (bRest && bRest.length > 0) cursor = bRest.pop()
    else return null
  }
}

function evalRunLoop<A>(start: Eval<A>): Try<A> {
  let current: any = start
  let bFirst: Bind | null = null
  let bRest: CallStack | null = null

  while (true) {
    if (current instanceof Now) {
      const bind = _popNextBind(bFirst, bRest)
      if (!bind) return Try.success(current.value)
      bFirst = null
      try {
        current = bind(current.value)
      } catch (e) {
        current = new Failure(e)
      }
    } else if (current instanceof Always) {
      try {
        current = new Now(current.thunk())
      } catch (e) {
        current = new Failure(e)
      }
    } else if (current instanceof Once) {
      try {
        current = new Now(current.get())
      } catch (e) {
        current = new Failure(e)
      }
    } else if (current instanceof Suspend) {
      try {
        current = current.thunk()
      } catch (e) {
        current = new Failure(e)
      }
    } else if (current instanceof FlatMap) {
      if (bFirst) {
        if (!bRest) bRest = []
        bRest.push(bFirst)
      }
      bFirst = (current as any).f
      current = current.source
    } else if (current instanceof Failure) {
      const bind = _findErrorHandler(bFirst, bRest)
      if (!bind) return Try.failure<never>(current.e)
      try {
        current = bind.onFailure(current.e)
      } catch (e) {
        current = new Failure(e)
      }
    } else {
      throw new IllegalStateError(
        "Types got screwed, Eval is a sealed trait, inheritance is forbidden")
    }
  }
}

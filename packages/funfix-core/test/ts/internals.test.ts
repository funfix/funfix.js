/*!
 * Copyright (c) 2017-2018 by The Funfix Project Developers.
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

import { HK, Setoid, Monad } from "funland"
import { Equiv } from "funland-laws"
import { monadCheck, setoidCheck } from "../../../../test-common"
import { Either, is, coreInternals } from "../../src"
import * as jv from "jsverify"

class Box1<A> implements HK<"box1", A> {
  constructor(public readonly value: A) {}
  readonly _URI!: "box1"
  readonly _A!: A
}

const Box1Module: Setoid<Box1<any>> & Monad<"box1"> = {
  equals: (x: Box1<any>, y: Box1<any>) =>
    is(x ? x.value : undefined, y ? y.value : undefined),
  map: <A, B>(f: (a: A) => B, fa: Box1<A>): Box1<B> =>
    new Box1(f(fa.value)),
  chain: <A, B>(f: (a: A) => Box1<B>, fa: Box1<A>): Box1<B> =>
    f(fa.value),
  ap: <A, B>(ff: Box1<(a: A) => B>, fa: Box1<A>): Box1<B> =>
    new Box1(ff.value(fa.value)),
  of: <A>(value: A) =>
    new Box1(value),
  chainRec<A, B>(f: <C>(next: (a: A) => C, done: (b: B) => C, a: A) => Box1<C>, a: A): Box1<B> {
    let cursor = Either.left<A, B>(a)
    while (!cursor.isRight()) {
      cursor = f(l => Either.left<A, B>(l), r => Either.right<A, B>(r), cursor.value as A).value
    }
    return new Box1(cursor.value)
  }
}

class Box2<A> implements HK<"box2", A> {
  constructor(public readonly value: A) {}
  readonly _URI!: "box2"
  readonly _A!: A

  equals(other: Box2<A>) { return other && is(this.value, other.value) }
  map<B>(f: (a: A) => B): Box2<B> { return new Box2(f(this.value)) }
  chain<B>(f: (a: A) => Box2<B>): Box2<B> { return f(this.value) }
  ap<B>(ff: Box2<(a: A) => B>): Box2<B> { return this.map(ff.value) }

  static pure<A>(value: A) {
    return new Box2(value)
  }

  static chainRec<A, B>(f: <C>(next: (a: A) => C, done: (b: B) => C, a: A) => Box2<C>, a: A): Box2<B> {
    let cursor = Either.left<A, B>(a)
    while (!cursor.isRight()) {
      cursor = f(l => Either.left<A, B>(l), r => Either.right<A, B>(r), cursor.value as A).value
    }
    return new Box2(cursor.value)
  }
}

coreInternals.fantasyLandRegister(Box1, Box1Module, Box1Module)
coreInternals.fantasyLandRegister(Box2)

function arbBox1<A>(arbA: jv.Arbitrary<A>): jv.Arbitrary<Box1<A>> {
  return arbA.smap(a => new Box1(a), box => box.value)
}

function arbBox2<A>(arbA: jv.Arbitrary<A>): jv.Arbitrary<Box2<A>> {
  return arbA.smap(a => new Box2(a), box => box.value)
}

describe("internals.fantasyLandRegister", () => {
  describe("static", () => {
    const check = (e: Equiv<HK<"box1", any>>) =>
      Box1Module.equals(e.lh as Box1<any>, e.rh as Box1<any>)

    const arbFA = arbBox1(jv.int32)
    const arbFB = arbBox1(jv.string)
    const arbFC = arbBox1(jv.int16)
    const arbFAtoB = arbBox1(jv.fun(jv.string))
    const arbFBtoC = arbBox1(jv.fun(jv.int16))

    setoidCheck(arbFA, Box1Module)
    monadCheck(
      arbFA,
      arbFB,
      arbFC,
      jv.fun(jv.string),
      jv.fun(jv.int16),
      arbFAtoB,
      arbFBtoC,
      jv.int32,
      check,
      {
        map: (f, fa) => (fa as any)["fantasy-land/map"](f),
        ap: (ff, fa) => (fa as any)["fantasy-land/ap"](ff),
        chain: (f, fa) => (fa as any)["fantasy-land/chain"](f),
        chainRec: (f, a) => (Box1 as any)["fantasy-land/chainRec"](f, a),
        of: a => (Box1 as any)["fantasy-land/of"](a)
      })
  })

  describe("methods", () => {
    const check = (e: Equiv<HK<"box2", any>>) =>
      (e.lh as Box2<any>).equals(e.rh as Box2<any>)

    const arbFA = arbBox2(jv.int32)
    const arbFB = arbBox2(jv.string)
    const arbFC = arbBox2(jv.int16)
    const arbFAtoB = arbBox2(jv.fun(jv.string))
    const arbFBtoC = arbBox2(jv.fun(jv.int16))

    setoidCheck(arbFA, {
      equals: (x, y) => (x as any)["fantasy-land/equals"](y)
    })

    monadCheck(
      arbFA,
      arbFB,
      arbFC,
      jv.fun(jv.string),
      jv.fun(jv.int16),
      arbFAtoB,
      arbFBtoC,
      jv.int32,
      check,
      {
        map: (f, fa) => (fa as any)["fantasy-land/map"](f),
        ap: (ff, fa) => (fa as any)["fantasy-land/ap"](ff),
        chain: (f, fa) => (fa as any)["fantasy-land/chain"](f),
        chainRec: (f, a) => (Box2 as any)["fantasy-land/chainRec"](f, a),
        of: a => (Box2 as any)["fantasy-land/of"](a)
      })
  })
})

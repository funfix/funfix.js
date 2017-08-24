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

import * as jv from "jsverify"
import * as inst from "./instances"
import * as assert from "./asserts"

import { Try, Success, Failure, DummyError, NoSuchElementError } from "../../src/"
import { None, Some, Left, Right } from "../../src/"
import { IllegalStateError } from "../../src/"
import { is, hashCode } from "../../src/"

describe("Try.of", () => {
  jv.property("should work for successful functions",
    jv.number,
    v => is(Try.of(() => v), Success(v))
  )

  it("should catch exceptions", () => {
    const error = new DummyError("dummy")
    assert.equal(Try.of(() => { throw error }), Failure(error))
  })
})

describe("Try #get", () => {
  jv.property("works for success",
    jv.number,
    n => is(Try.pure(n).get(), n)
  )

  it("works for failure", () => {
    const ref = Try.failure(new DummyError("dummy"))
    assert.throws(() => ref.get())
  })
})

describe("Try #equals", () => {
  jv.property("should yield true for self.equals(self)",
    inst.arbTry,
    fa => fa.equals(fa)
  )

  jv.property("should yield true for equals(self, self)",
    inst.arbTry,
    fa => is(fa, fa)
  )

  jv.property("self.hashCode() === self.hashCode() === hashCode(self)",
    inst.arbTry,
    fa => fa.hashCode() === fa.hashCode() && fa.hashCode() === hashCode(fa)
  )

  jv.property("Success(v).hashCode() === Success(v).hashCode()",
    jv.number,
    n => Success(n).hashCode() === Success(n).hashCode()
  )

  it("Success should have structural equality", () => {
    const fa1 = Success("hello1")
    const fa2 = Success("hello1")
    const fa3 = Success("hello2")

    assert.ok(!(fa1 === fa2))
    assert.equal(fa1, fa2)
    assert.equal(fa2, fa1)

    assert.ok(!(fa1.equals(fa3)))
    assert.notEqual(fa1, fa3)
    assert.notEqual(fa3, fa1)

    assert.equal(Success(fa1), Success(fa2))
    assert.notEqual(Success(fa1), Success(fa3))
    assert.notEqual(Success(fa1), Success(Success("100")))
  })

  it("Failure should have structural equality", () => {
    const fa1 = Failure("hello1")
    const fa2 = Failure("hello1")
    const fa3 = Failure("hello2")

    assert.ok(!(fa1 === fa2))
    assert.equal(fa1, fa2)
    assert.equal(fa2, fa1)

    assert.ok(!(fa1.equals(fa3)))
    assert.notEqual(fa1, fa3)
    assert.notEqual(fa3, fa1)

    assert.equal(Failure(fa1), Failure(fa2))
    assert.notEqual(Failure(fa1), Failure(fa3))
    assert.notEqual(Failure(fa1), Failure(Failure("100")))
  })

  jv.property("protects against other ref being null",
    inst.arbTry,
    fa => fa.equals(null as any) === false
  )
})

describe("Try #failed", () => {
  jv.property("Success #failed",
    inst.arbSuccess,
    fa => fa.failed().failed().get() instanceof NoSuchElementError
  )

  jv.property("Failure #failed",
    jv.constant(new DummyError("dummy")),
    ex => is(Failure(ex).failed(), Success(ex))
  )
})

describe("Try identity", () => {
  jv.property("isSuccess == !isFailure",
    inst.arbTry,
    fa => fa.isSuccess() === !fa.isFailure()
  )

  jv.property("Success.isSuccess == true",
    inst.arbSuccess,
    fa => fa.isSuccess() === true
  )

  jv.property("Failure.isFailure == true",
    inst.arbFailure,
    fa => fa.isFailure() === true
  )
})

describe("Try #filter", () => {
  jv.property("fa.filter(_ => true) == fa",
    inst.arbTry,
    fa => is(fa.filter(_ => true), fa)
  )

  jv.property("fa.filter(_ => false) throws",
    inst.arbSuccess,
    fa => fa.filter(_ => false).isFailure() === true
  )

  jv.property("protects against user code",
    inst.arbSuccess,
    fa => {
      const dummy = new DummyError("dummy")
      const p = (_: any) => { throw dummy }
      return is(fa.filter(p), Failure(dummy))
    }
  )
})

describe("Try #fold", () => {
  it("works for success", () => {
    const r = Success(1).fold(e => 0, a => a + 1)
    assert.equal(r, 2)
  })

  it("works for failure", () => {
    const r = Failure(1).fold(e => 0, a => a)
    assert.equal(r, 0)
  })
})

describe("Try #flatMap", () => {
  jv.property("success(n).flatMap(f) == f(n)",
    jv.number, jv.fn(inst.arbTry),
    (n, f) => Try.pure(n).flatMap(f).equals(f(n))
  )

  jv.property("left identity",
    jv.number, jv.fn(inst.arbTry),
    (n, f) => Try.pure(n).flatMap(f).equals(f(n))
  )

  jv.property("right identity",
    inst.arbTry,
    fa => fa.flatMap(Try.pure).equals(fa)
  )

  jv.property("failure.flatMap(f) == failure",
    inst.arbTry, jv.fn(inst.arbTry),
    (e, f) => e.isSuccess() || e.flatMap(f) === e
  )

  jv.property("protects against user code",
    inst.arbSuccess,
    fa => {
      const dummy = new DummyError("dummy")
      const f = (_: any) => { throw dummy }
      return is(fa.flatMap(f), Failure(dummy))
    }
  )

  jv.property("chain is an alias of flatMap",
    inst.arbTry, jv.fn(inst.arbTry),
    (fa, f) => is(fa.flatMap(f), fa.chain(f))
  )
})

describe("Try.map", () => {
  jv.property("pure(n).map(f) === pure(f(n))",
    jv.number, jv.fn(jv.number),
    (n, f) => is(Try.pure(n).map(f), Try.pure(f(n)))
  )

  jv.property("covariant identity",
    inst.arbTry,
    fa => fa.map(x => x).equals(fa)
  )

  jv.property("covariant composition",
    inst.arbTry, jv.fn(jv.number), jv.fn(jv.number),
    (fa, f, g) => fa.map(f).map(g).equals(fa.map(x => g(f(x))))
  )

  jv.property("failure.map(f) === failure",
    inst.arbFailure, jv.fn(jv.number),
    (fa, f) => fa.map(f) === fa
  )
})

describe("Try #forEach", () => {
  it("should work for success", () => {
    let effect = 0
    Success(10).forEach(a => { effect = a })
    assert.equal(effect, 10)
  })

  it("should do nothing for failure", () => {
    Failure("error").forEach(a => { throw new IllegalStateError() })
  })
})

describe("Try #getOrElse", () => {
  jv.property("success(b).getOrElse(???) == b",
    inst.arbAny,
    b => is(Try.success(b).getOrElse(null), b)
  )

  jv.property("failure(a).getOrElse(b) == b",
    inst.arbAny, jv.string,
    (a, b) => is(Try.failure(jv.string).getOrElse(b), b)
  )
})

describe("Try #getOrElseL", () => {
  jv.property("success(b).getOrElseL(???) == b",
    inst.arbAny,
    b => Try.success(b).getOrElseL(() => null) === b
  )

  jv.property("failure(a).getOrElseL(() => b) == b",
    inst.arbAny, jv.string,
    (a, b) => is(Try.failure(a).getOrElseL(() => b), b)
  )
})

describe("Try #orNull", () => {
  jv.property("success(b).orNull() == b",
    inst.arbAny,
    b => is(Try.success(b).orNull(), b)
  )

  jv.property("failure(a).orNull() == null",
    inst.arbAny, jv.string,
    (a, b) => is(Try.failure(a).orNull(), null)
  )
})

describe("Try #orElse", () => {
  jv.property("fa.orElse(fb) == fa for success",
    inst.arbSuccess, inst.arbTry,
    (fa, fb) => is(fa.orElse(fb), fa)
  )

  jv.property("fa.orElse(fb) == fb for failure",
    inst.arbFailure, inst.arbTry,
    (fa, fb) => is(fa.orElse(fb), fb)
  )
})

describe("Try #orElseL", () => {
  jv.property("fa.orElseL(() => fb) == fa for success",
    inst.arbSuccess, inst.arbTry,
    (fa, fb) => is(fa.orElseL(() => fb), fa)
  )

  jv.property("fa.orElseL(() => fb) == fb for failure",
    inst.arbFailure, inst.arbTry,
    (fa, fb) => is(fa.orElseL(() => fb), fb)
  )
})

describe("Try #recover", () => {
  jv.property("fa.recover(f) == fa for success",
    inst.arbSuccess, jv.number,
    (fa, b) => fa.recover(_ => b) === fa
  )

  jv.property("fa.recover(_ => b) == fb for failure",
    inst.arbFailure, jv.number,
    (fa, b) => is(fa.recover(_ => b), Success(b))
  )

  it("protects against user error", () => {
    const error1 = new DummyError("error1")
    const error2 = new DummyError("error2")

    const fa = Failure(error1).recover(_ => { throw error2 })
    assert.equal(fa.failed().get(), error2)
  })
})

describe("Try #recoverWith", () => {
  jv.property("fa.recoverWith(f) == fa for success",
    inst.arbSuccess, inst.arbTry,
    (fa, fb) => fa.recoverWith(_ => fb) === fa
  )

  jv.property("fa.recoverWith(_ => b) == fb for failure",
    inst.arbFailure, inst.arbTry,
    (fa, fb) => fa.recoverWith(_ => fb) === fb
  )

  it("protects against user error", () => {
    const error1 = new DummyError("error1")
    const error2 = new DummyError("error2")

    const fa = Failure(error1).recoverWith(_ => { throw error2 })
    assert.equal(fa.failed().get(), error2)
  })
})

describe("Try translations", () => {
  jv.property("success.toOption() == Some",
    inst.arbSuccess,
    fa => is(fa.toOption(), Some(fa.get()))
  )

  jv.property("failure.toOption() == None",
    inst.arbFailure,
    fa => is(fa.toOption(), None)
  )

  jv.property("success.toEither() translation",
    inst.arbSuccess,
    fa => is(fa.toEither(), Right(fa.get()))
  )

  jv.property("failure.toEither() translation",
    inst.arbFailure,
    fa => is(fa.toEither(), Left(fa.failed().get()))
  )
})

describe("Try map2, map3, map4, map5, map6", () => {
  jv.property("map2 equivalence with flatMap",
    inst.arbTry, inst.arbTry, jv.fn(jv.number),
    (o1, o2, fn) => {
      const f = (...args: any[]) => fn(args)
      return is(Try.map2(o1, o2, f), o1.flatMap(a1 => o2.map(a2 => f(a1, a2))))
    }
  )

  jv.property("map3 equivalence with flatMap",
    inst.arbTry, inst.arbTry, inst.arbTry, jv.fn(jv.number),
    (o1, o2, o3, fn) => {
      const f = (...args: any[]) => fn(args)
      return is(
        Try.map3(o1, o2, o3, f),
        o1.flatMap(a1 => o2.flatMap(a2 => o3.map(a3 => f(a1, a2, a3))))
      )
    }
  )

  jv.property("map4 equivalence with flatMap",
    inst.arbTry, inst.arbTry, inst.arbTry, inst.arbTry, jv.fn(jv.number),
    (o1, o2, o3, o4, fn) => {
      const f = (...args: any[]) => fn(args)
      return is(
        Try.map4(o1, o2, o3, o4, f),
        o1.flatMap(a1 => o2.flatMap(a2 => o3.flatMap(a3 =>
          o4.map(a4 => f(a1, a2, a3, a4)))))
      )
    }
  )

  jv.property("map5 equivalence with flatMap",
    inst.arbTry, inst.arbTry, inst.arbTry, inst.arbTry, inst.arbTry, jv.fn(jv.number),
    (o1, o2, o3, o4, o5, fn) => {
      const f = (...args: any[]) => fn(args)
      return is(
        Try.map5(o1, o2, o3, o4, o5, f),
        o1.flatMap(a1 => o2.flatMap(a2 => o3.flatMap(a3 =>
          o4.flatMap(a4 => o5.map(a5 => f(a1, a2, a3, a4, a5))))))
      )
    }
  )

  jv.property("map6 equivalence with flatMap",
    inst.arbTry, inst.arbTry, inst.arbTry, inst.arbTry, inst.arbTry, inst.arbTry, jv.fn(jv.number),
    (o1, o2, o3, o4, o5, o6, fn) => {
      const f = (...args: any[]) => fn(args)
      return is(
        Try.map6(o1, o2, o3, o4, o5, o6, f),
        o1.flatMap(a1 => o2.flatMap(a2 => o3.flatMap(a3 =>
          o4.flatMap(a4 => o5.flatMap(a5 => o6.map(a6 =>
            f(a1, a2, a3, a4, a5, a6)))))))
      )
    }
  )

  it("map2 protects against user error", () => {
    const dummy = new DummyError("dummy")
    const fa = Try.success(1)
    const received =
      Try.map2(fa, fa, _ => { throw dummy })

    assert.equal(received, Failure(dummy))
  })

  it("map3 protects against user error", () => {
    const dummy = new DummyError("dummy")
    const fa = Try.success(1)
    const received =
      Try.map3(fa, fa, fa, _ => { throw dummy })

    assert.equal(received, Failure(dummy))
  })

  it("map4 protects against user error", () => {
    const dummy = new DummyError("dummy")
    const fa = Try.success(1)
    const received =
      Try.map4(fa, fa, fa, fa, _ => { throw dummy })

    assert.equal(received, Failure(dummy))
  })

  it("map5 protects against user error", () => {
    const dummy = new DummyError("dummy")
    const fa = Try.success(1)
    const received =
      Try.map5(fa, fa, fa, fa, fa, _ => { throw dummy })

    assert.equal(received, Failure(dummy))
  })

  it("map6 protects against user error", () => {
    const dummy = new DummyError("dummy")
    const fa = Try.success(1)
    const received =
      Try.map6(fa, fa, fa, fa, fa, fa, _ => { throw dummy })

    assert.equal(received, Failure(dummy))
  })
})

describe("Try.unit", () => {
  it("returns the same reference and works", () => {
    const e1 = Try.unit()
    const e2 = Try.unit()

    assert.equal(e1, e2)
    assert.equal(e1.get(), undefined)
  })
})

describe("Try.tailRecM", () => {
  it("is stack safe", () => {
    const fa = Try.tailRecM(0, a => a < 1000 ? Success(Left(a + 1)) : Success(Right(a)))
    assert.equal(fa.get(), 1000)
  })

  it("returns the failure unchanged", () => {
    const fa = Try.tailRecM(0, a => Failure("failure"))
    assert.equal(fa.failed().get(), "failure")
  })

  it("protects against user errors", () => {
    // tslint:disable:no-string-throw
    const fa = Try.tailRecM(0, a => { throw "dummy" })
    assert.equal(fa.failed().get(), "dummy")
  })
})

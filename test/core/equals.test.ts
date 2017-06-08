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

import { hashCode, equals } from "../../src/funfix"
import * as jv from "jsverify"
import * as inst from "./instances"

describe("hashCode", () => {
  jv.property("hashCode(v) == hashCode(v)",
    inst.arbAny,
    v => hashCode(v) === hashCode(v)
  )

  jv.property("hashCode(v1) != hashCode(v2) => v1 != v2",
    jv.string, jv.string,
    (v1, v2) => hashCode(v1) === hashCode(v2) || v1 !== v2
  )
})

describe("equals", () => {
  jv.property("equals(v, v) == true",
    inst.arbAny,
    v => equals(v, v)
  )

  jv.property("equals(v1, v2) == false => v1 != v2",
    inst.arbAny, inst.arbAny,
    (v1, v2) => equals(v1, v2) || v1 !== v2
  )

  jv.property("equals(v1, v2) == equals(v2, v1)",
    inst.arbAny, inst.arbAny,
    (v1, v2) => equals(v1, v2) === equals(v2, v1)
  )

  jv.property("equals(v1, v2) && equals(v2, v3) => equals(v1, v3) (numbers)",
    jv.number, jv.number, jv.number,
    (v1, v2, v3) => equals(v1, v2) && equals(v2, v3) ? equals(v1, v3) : true
  )

  jv.property("equals(v1, v2) && equals(v2, v3) => equals(v1, v3) (strings)",
    jv.string, jv.string, jv.string,
    (v1, v2, v3) => equals(v1, v2) && equals(v2, v3) ? equals(v1, v3) : true
  )
})

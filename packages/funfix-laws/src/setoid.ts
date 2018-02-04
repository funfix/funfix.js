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

import { Setoid } from "funfix-types"
import { Equiv } from "./equiv"

/**
 * Type-class laws for `Setoid`, as defined in the `funfix-types`
 * sub-project and in the `static-land` spec.
 */
export class SetoidLaws<A> {
  constructor(public readonly F: Setoid<A>) {}

  reflexivity(a: A): Equiv<boolean> {
    return Equiv.of(this.F.equals(a, a), true)
  }

  symmetry(x: A, y: A): Equiv<boolean> {
    return Equiv.of(this.F.equals(x, y), this.F.equals(y, x))
  }

  transitivity(x: A, y: A, z: A): Equiv<boolean> {
    return Equiv.of(
      this.F.equals(x, y) && this.F.equals(y, z),
      this.F.equals(x, y) && this.F.equals(x, z))
  }
}

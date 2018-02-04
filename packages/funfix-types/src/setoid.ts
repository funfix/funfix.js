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

/**
 * The `Setoid` type defines equality.
 *
 * Instances must obey the following laws:
 *
 * 1. Reflexivity: `S.equals(a, a) === true`
 * 2. Symmetry: `S.equals(a, b) === S.equals(b, a)`
 * 3. Transitivity: if `S.equals(a, b)` and `S.equals(b, c)`, then `S.equals(a, c)`
 *
 * Equivalent with the `Setoid` specification in the
 * [static-land]{@link https://github.com/rpominov/static-land/} spec.
 */
export interface Setoid<A> {
  equals(x: A, y: A): boolean
}

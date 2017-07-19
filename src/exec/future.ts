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
 * Represents the completion of an asynchronous operation, as defined by
 * the [Promises/A+](https://promisesaplus.com/) specification.
 */
export interface PromiseLike<T> {
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
    onSuccess?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onFailure?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>

  /**
   * Attaches a callback for only the rejection of the Promise.
   *
   * See [MDN: Promise.catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch).
   *
   * @param onFailure The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch<TResult = never>(onFailure?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>
}

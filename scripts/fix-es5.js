#!/usr/bin/env node
/*!
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

const fs = require("fs")
const path = require("path")

const FILE_PATH = process.argv[2]
if (!FILE_PATH) {
  console.error("ERROR - Missing file argument!")
  process.exit(1)
} else if (path.extname(FILE_PATH) !== ".js") {
  console.error(`ERROR - Given path is not a .js file: ${FILE_PATH}`)
  process.exit(1)
} else if (!fs.existsSync(FILE_PATH)) {
  console.error(`ERROR - Invalid file path: ${FILE_PATH}`)
  process.exit(2)
}

const text = fs.readFileSync(FILE_PATH, "utf-8").replace(
  /(import[\s\S]*?from\s+)(['"])(funfix[^'"]*)\2/gmi, 
  "$1$2$3/dist/es5$2")

fs.writeFileSync(FILE_PATH, text, "utf-8")
console.log(`fix-es5.js: changed ${FILE_PATH}`)

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

const { cd, exec, echo } = require("shelljs")
const { readFileSync, existsSync } = require("fs")
const fs = require("fs")
const url = require("url")
const path = require("path")

console.info(`CI=${process.env["CI"]}`)
console.info(`TRAVIS_TAG=${process.env["TRAVIS_TAG"]}`)
console.info(`TRAVIS_PULL_REQUEST=${process.env["TRAVIS_PULL_REQUEST"]}`)

if (!process.env["CI"]) {
  console.info("Not running on top of Travis, cannot deploy docs")
  process.exit(1)
}

const branch = process.env["TRAVIS_TAG"]
const m = branch.match(/^v(\d+\.\d+\.\d+)$/)
let version = m && m[1]

if (!version) {
  console.info("Only publishing for version tags, exiting!")
  process.exit(0)
}

console.info(`Version detected: ${version}`)
process.chdir(path.join(path.dirname(process.argv[1]), ".."))

exec(`lerna publish --skip-git --yes --force-publish --repo-version ${version}`)

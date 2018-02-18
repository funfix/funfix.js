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
console.info(`TRAVIS_BRANCH=${process.env["TRAVIS_BRANCH"]}`)
console.info(`TRAVIS_TAG=${process.env["TRAVIS_TAG"]}`)
console.info(`TRAVIS_PULL_REQUEST=${process.env["TRAVIS_PULL_REQUEST"]}`)

if (!process.env["CI"]) {
  console.info("Not running on top of Travis, cannot deploy docs")
  process.exit(1)
}

const branch = process.env["TRAVIS_BRANCH"] || process.env["TRAVIS_TAG"]
const m = branch.match(/^v(\d+\.\d+\.\d+([-][a-z]+\.\d+)?)$/)
let version = m && m[1]

if (!version && process.env["TRAVIS_BRANCH"] === "master" && process.env["TRAVIS_PULL_REQUEST"] === 'false') {
  version = 'next'
}

if (!version) {
  console.info("Only deploying docs on the master branch and not for pull requests, exiting!")
  process.exit(0)
}

console.info(`Version detected: ${version}`)
const commonDir = path.join(path.dirname(process.argv[1]), "..", "common")
const rootDir = path.join(commonDir, "..", "packages")

const repository = "github.com/funfix/funfix.org.git"
const ghToken = process.env.GH_TOKEN

const destDir = path.join(process.env["TMPDIR"] || ".", `docs-${Math.floor(Math.random() * 100000)}`)
const sourceDir = path.resolve(".")

echo("Deploying docs!!!")
if (process.env.TMPDIR && existsSync(process.env.TMPDIR)) {
  cd(`${process.env.TMPDIR}`)
}

exec(`rm -rf "${destDir}"`)
exec(`git clone "https://${ghToken}@${repository}" "${destDir}" -b gh-pages`)

exec(`mkdir -p "${destDir}"/archive/`)
exec(`rm -rf "${destDir}"/archive/${version}`)
exec(`mkdir -p "${destDir}"/archive/${version}`)

for (const p of fs.readdirSync(rootDir)) {
  const dir = path.join(rootDir, p)
  if (!fs.lstatSync(dir).isDirectory()) continue

  const docsDir = path.join(dir, "dist", "docs")
  if (!fs.existsSync(docsDir) || !fs.lstatSync(docsDir).isDirectory()) continue

  const prefixLess = p.replace(/^funfix\-/, '')
  exec(`rm -rf "${destDir}"/archive/${version}/${prefixLess}`)
  exec(`cp -rp "${docsDir}" "${destDir}"/archive/${version}/${prefixLess}`)
}

if (version !== 'next') {
  exec(`rm -rf "${destDir}"/api`)
  exec(`ln -s ./archive/${version} "${destDir}"/api`)
}

cd(destDir)
exec("git add .")
exec('git config user.name "Alexandru Nedelcu"')
exec('git config user.email "noreply@alexn.org"')
exec(`git commit -m "docs(docs): update gh-pages for ${version}"`)
exec(`git push --force --quiet "https://${ghToken}@${repository}" gh-pages:gh-pages`)

cd("~")
exec(`rm -rf ${destDir}`)
echo("Docs deployed!!")

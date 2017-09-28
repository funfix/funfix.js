#!/usr/bin/env node
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

const process = require('process')
const path = require('path')
const fs = require('fs-extra')
const { symlinkSync } = require('fs')

const commonDir = path.join(path.dirname(process.argv[1]), "..", "common")
const rootDir = path.join(commonDir, "..", "packages")

const binariesToLink = [
  "tsc",
  "typedoc",
  "ts-node",
  "rollup",
  "flow",
  "tslint",
  "mocha",
  "nyc",
  "rimraf"
]

const filesToLink = [
  "tsconfig.json",
  ".babelrc",
  "rollup.config.js",
  "tslint.json",
  ".flowconfig",
  ".editorconfig",
  "mocha.opts",
  "index.js.flow"
]

for (const p of fs.readdirSync(rootDir)) {
  const dir = path.join(rootDir, p)
  if (!fs.lstatSync(dir).isDirectory()) continue

  for (const file of filesToLink) {
    const target = path.join(dir, file)

    if (!fs.existsSync(target)) {
      const oldDir = process.cwd()
      try {
        process.chdir(dir)
        const src = path.join("..", "..", "common", file)
        console.info(`Creating symlink ${p}/${file} to ${src}`)
        symlinkSync(src, target)
      } finally {
        process.chdir(oldDir)
      }
    }
  }

  for (const file of binariesToLink) {
    const binDir = path.join(dir, "node_modules", ".bin")
    const target = path.join(dir, "node_modules", ".bin", file)

    if (!fs.existsSync(target)) {
      const oldDir = process.cwd()
      try {
        fs.mkdirsSync(binDir)
        process.chdir(binDir)

        const src = path.join("..", "..", "..", "..", "node_modules", ".bin", file)
        console.info(`Creating symlink ${p}/${file} to ${src}`)
        symlinkSync(src, target)
      } finally {
        process.chdir(oldDir)
      }
    }
  }

  const dst = path.join(dir, "package.json")
  const srcJSON = JSON.parse(fs.readFileSync(path.join(commonDir, "package.json"), "utf-8"))
  const dstJSON = JSON.parse(fs.readFileSync(dst, "utf-8"))
  for (const key of Object.keys(srcJSON)) dstJSON[key] = srcJSON[key]
  
  // Changing dependencies, changing versions automatically!
  if (srcJSON['version'] && dstJSON['dependencies']) {
    for (const key of Object.keys(dstJSON['dependencies'])) {
      if (key.match(/^funfix/)) dstJSON['dependencies'][key] = srcJSON['version']
    }
  }  

  console.info(`Updating: ${dst}`)
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(dstJSON, null, 2),
    "utf-8"
  )
}

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

const { exec } = require("shelljs")
const fs = require("fs")
const path = require("path")

if (process.argv.length < 3) {
  console.error("Missing directory argument!")
  process.exit(1)
}

const currentDir = process.argv[2]
const packageJsonPath = path.join(currentDir, "package.json")

if (!fs.existsSync(packageJsonPath)) {
  console.error(`Directory does not appear to a valid npm project: ${packageJsonPath} missing!`)
  process.exit(1)
}

process.chdir(currentDir)
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))

if (!fs.existsSync(path.join(currentDir, "rootdoc.md"))) {
  console.info(`No docs to generate for sub-project ${pkg.name}`)
  process.exit(0)
}

exec(`./node_modules/.bin/typedoc --mode file --theme minimal --listInvalidSymbolLinks --excludeNotExported --excludePrivate --out dist/docs --target es6 --name ${pkg.name} --readme rootdoc.md src`)

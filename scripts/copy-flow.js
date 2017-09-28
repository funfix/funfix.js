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
const packageJson = path.join(currentDir, "package.json")

if (!fs.existsSync(packageJson)) {
  console.error(`Directory does not appear to a valid npm project: ${packageJson} missing!`)
  process.exit(1)
}

process.chdir(currentDir)

const srcDir = path.join(currentDir, "src")
const destDir = path.join(currentDir, "dist")

function listDir(dir) {
  return new Promise((resolve, reject) => {
    fs. readdir(dir, function (err, items) {
      if (err) reject(err); else {
        resolve(items)
      }
    })
  })
}

async function findFlowFiles() {
  const queue = [srcDir]
  const flowFiles = []

  while (queue.length > 0) {
    const current = queue.pop() || ""
    const files = await listDir(current)

    for (const f of files) {
      const fullPath = path.join(current, f)
      const info = fs.statSync(fullPath)
      if (info.isDirectory()) queue.push(fullPath)
      else if (f.match(/\.js\.flow$/)) flowFiles.push(fullPath)
    }
  }

  return flowFiles
}

async function main() {
  const files = await findFlowFiles()
  for (const file of files) {
    const dPath = path.join(destDir, file.slice(srcDir.length))
    const dDir = path.dirname(dPath)
    exec(`mkdir -p "${dDir}"`)
    exec(`cp -f "${file}" "${dPath}"`)
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(currentDir, "package.json")))
  exec(`cp -f "${destDir}/index.js.flow" "${currentDir}/${pkg.main}.flow"`)
}

main().then(
  _ => console.log("Done copying flow files!"),
  err => console.error(`ERROR: ${err}`)
)

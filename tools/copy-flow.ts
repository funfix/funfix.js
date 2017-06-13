#!/usr/bin/env ts-node

import { cd, exec, echo, touch } from "shelljs"
import * as fs from "fs"
import * as path from "path"

const currentDir = path.resolve(path.join(path.dirname(process.argv[1]), ".."))
const srcDir = path.join(currentDir, "src")
const destDir = path.join(currentDir, "dist")

function listDir(dir: string): Promise<string[]> {
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

  const pkg = JSON.parse(fs.readFileSync(path.join(currentDir, "package.json")) as any)
  exec(`cp -f "${destDir}/${pkg.name}.js.flow" "${currentDir}/${pkg.main}.flow"`)
  exec(`cp -f "${destDir}/${pkg.name}.js.flow" "${currentDir}/${pkg.module}.flow"`)
}

main().then(
  _ => console.log("Done copying flow files!"),
  err => console.error(`ERROR: ${err}`)
)

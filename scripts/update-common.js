#!/usr/bin/env node

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
  "mocha.opts"
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

  console.info(`Updating: ${dst}`)
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(dstJSON, null, 2),
    "utf-8"
  )
}
